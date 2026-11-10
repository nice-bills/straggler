/* global process, console, URL */
// Runs the real triage core outside Base44, with an in-memory stand-in for its entities.
// Usage: node --env-file=.env scripts/local.mjs check
//        node --env-file=.env scripts/local.mjs triage <issue_url> [hedged|single]
//        node --env-file=.env scripts/local.mjs cases <owner/name> <n>
//        node --env-file=.env scripts/local.mjs bench <dev|test> <hedged|single>
import { register } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
register("./hooks.mjs", import.meta.url);

const match = (row, q) => Object.entries(q).every(([k, v]) => (v && v.$in ? v.$in.includes(row[k]) : row[k] === v));
// Everything but snapshots (their text lives in memory) is kept in .local/db.json between runs.
const DB = new URL("../.local/db.json", import.meta.url);
const saved = existsSync(DB) ? JSON.parse(readFileSync(DB, "utf8")) : {};
const table = (rows = []) => {
  let n = Math.max(0, ...rows.map((r) => Number(r.id)));
  const create = async (d) => (rows.push({ id: String(++n), ...d }), rows.at(-1));
  return {
    create, bulkCreate: (ds) => Promise.all(ds.map(create)),
    get: async (id) => rows.find((r) => r.id === id),
    filter: async (q = {}) => ({ items: rows.filter((r) => match(r, q)), has_more: false }),
    count: async (q = {}) => rows.filter((r) => match(r, q)).length,
    update: async (id, p) => Object.assign(rows.find((r) => r.id === id), p),
    rows,
  };
};
const tables = Object.fromEntries(Object.entries(saved).map(([k, rows]) => [k, table(rows)]));
const save = () => {
  mkdirSync(new URL("./", DB), { recursive: true });
  writeFileSync(DB, JSON.stringify(Object.fromEntries(Object.entries(tables).filter(([k]) => k !== "Snapshot").map(([k, t]) => [k, t.rows]))));
};
const b = {
  entities: new Proxy({}, { get: (_, k) => (tables[k] ||= table()) }),
  integrations: { Core: { UploadPublicFile: async ({ file }) => ({ file_url: URL.createObjectURL(file) }) } },
};

const [cmd, url, mode = "hedged"] = process.argv.slice(2);
if (cmd === "check") {
  const { LOCAL_CHECKS } = await import("@/lib/selfchecks");
  const { ensureRepo, headSha } = await import("@/lib/triage.server");
  const { getOrBuildSnapshot } = await import("@/lib/snapshot.server");
  let fail = 0;
  for (const c of LOCAL_CHECKS) {
    const r = await c.run();
    fail += !r.pass;
    console.log(r.pass ? "PASS" : "FAIL", c.name, "·", r.detail);
  }
  const repo = await ensureRepo(b, "octocat", "Hello-World");
  const s = await getOrBuildSnapshot(b, repo, await headSha(repo));
  const ok = s.file_count >= 1 && !s.truncated;
  fail += !ok;
  console.log(ok ? "PASS" : "FAIL", "Snapshot octocat/Hello-World ·", `${s.file_count} files, ${s.char_count} chars, files ${s.file_list}`);
  process.exit(fail ? 1 : 0);
} else if (cmd === "triage") {
  const { runTriage } = await import("@/lib/triage.server");
  const r = await runTriage(b, { issue_url: url, mode });
  const { reply_markdown, ...run } = r.run;
  // eslint-disable-next-line no-unused-vars
  console.log(JSON.stringify({ snapshot: r.snapshot, run, attempts: r.attempts.map(({ raw_output, ...a }) => a) }, null, 2));
  console.log("\n--- SERV reply ---\n" + reply_markdown);
} else if (cmd === "cases") {
  const { ensureRepo } = await import("@/lib/triage.server");
  const { buildCases } = await import("@/lib/cases.server");
  const [owner, name] = url.split("/");
  console.log(await buildCases(b, await ensureRepo(b, owner, name), Number(mode)));
  save();
} else if (cmd === "bench") {
  const { runTriage } = await import("@/lib/triage.server");
  const { percentile } = await import("@/lib/stats");
  const cases = (await b.entities.Case.filter({ split: url })).items;
  const bench = await b.entities.BenchRun.create({ split: url, mode, n_cases: cases.length, started_at: new Date().toISOString() });
  const runs = [];
  for (const c of cases) {
    const { run } = await runTriage(b, { case_id: c.id, mode, bench_run_id: bench.id }).catch((e) => ({ run: { status: "failed", error: String(e.message) } }));
    runs.push(run);
    console.log(`#${c.issue_number} ${run.status} ${run.time_to_valid_ms ?? "-"}ms hit@1 ${run.hit_at_1} @3 ${run.hit_at_3} @5 ${run.hit_at_5} ${run.error || ""}`);
    save();
  }
  const ttv = runs.map((r) => r.time_to_valid_ms).filter((v) => v != null).sort((x, y) => x - y);
  const rate = (k) => runs.filter((r) => r[k]).length / (runs.length || 1);
  const sum = (k) => runs.reduce((s, r) => s + (r[k] || 0), 0);
  console.log(await b.entities.BenchRun.update(bench.id, {
    n_failed: runs.filter((r) => r.status !== "done").length, p50_ms: percentile(ttv, 50), p95_ms: percentile(ttv, 95),
    hit_at_1: rate("hit_at_1"), hit_at_3: rate("hit_at_3"), hit_at_5: rate("hit_at_5"),
    dolphin_cost_usd: sum("dolphin_cost_usd"), serv_cost_usd: sum("serv_cost_usd"), finished_at: new Date().toISOString(),
  }));
  save();
} else {
  console.error("usage: local.mjs check | triage <issue_url> [mode] | cases <owner/name> <n> | bench <dev|test> <mode>");
  process.exit(2);
}
