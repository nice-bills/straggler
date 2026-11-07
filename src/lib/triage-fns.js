import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { ensureRepo, headSha, prepareTriage, runTriage } from "@/lib/triage.server";
import { buildCases } from "@/lib/cases.server";
import { getOrBuildSnapshot, summarize } from "@/lib/snapshot.server";
import { percentile } from "@/lib/stats";

const all = async (entity, query = {}, sort = "-created_date") => {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort, limit: 500, cursor });
    out.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
};

const id = z.string().max(100);
const target = z.object({ case_id: id.optional(), issue_url: z.string().max(500).optional(), commit_sha: z.string().max(64).optional() });

export const casesPage = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async ({ context }) => {
  const e = context.getBase44().entities;
  const [repos, cases, snaps] = await Promise.all([all(e.Repo), all(e.Case, {}, "-issue_number"), all(e.Snapshot)]);
  return { repos, cases, snapshots: snaps.map(summarize) };
});

export const getCase = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator(z.object({ id }))
  .handler(({ data, context }) => context.getBase44().entities.Case.get(data.id));

export const addRepo = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ owner: z.string().min(1).max(100), name: z.string().min(1).max(100) }))
  .handler(({ data, context }) => ensureRepo(context.getBase44(), data.owner, data.name));

export const buildCasesFn = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ repo_id: id, max_cases: z.number().int().min(1).max(50) }))
  .handler(async ({ data, context }) => {
    const b = context.getBase44();
    return buildCases(b, await b.entities.Repo.get(data.repo_id), data.max_cases);
  });

export const buildSnapshotFn = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ repo_id: id, commit_sha: z.string().max(64).optional() }))
  .handler(async ({ data, context }) => {
    const b = context.getBase44();
    const repo = await b.entities.Repo.get(data.repo_id);
    return summarize(await getOrBuildSnapshot(b, repo, data.commit_sha || (await headSha(repo))));
  });

export const selfCheckSnapshot = createServerFn({ method: "POST" }).middleware([requireUser]).handler(async ({ context }) => {
  const b = context.getBase44();
  const repo = await ensureRepo(b, "octocat", "Hello-World");
  return summarize(await getOrBuildSnapshot(b, repo, await headSha(repo)));
});

export const prepareTriageFn = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(target)
  .handler(({ data, context }) => prepareTriage(context.getBase44(), data));

export const triageFn = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(target.extend({ mode: z.enum(["single", "hedged"]), bench_run_id: id.optional() }))
  .handler(({ data, context }) => runTriage(context.getBase44(), data));

export const benchPage = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async ({ context }) => {
  const e = context.getBase44().entities;
  const [runs, dev, test] = await Promise.all([all(e.BenchRun), e.Case.count({ split: "dev" }), e.Case.count({ split: "test" })]);
  return { runs, counts: { dev, test } };
});

export const createBench = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ label: z.string().max(200), split: z.enum(["dev", "test"]), mode: z.enum(["single", "hedged"]) }))
  .handler(async ({ data, context }) => {
    const e = context.getBase44().entities;
    if (data.split === "test" && !(await all(e.BenchRun, { split: "dev" })).some((r) => r.finished_at)) {
      throw new Error("Finish a dev run before running the test split.");
    }
    const cases = await all(e.Case, { split: data.split }, "issue_number");
    const bench = await e.BenchRun.create({ ...data, n_cases: cases.length, started_at: new Date().toISOString() });
    return { bench, case_ids: cases.map((c) => c.id) };
  });

export const finalizeBench = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ id }))
  .handler(async ({ data, context }) => {
    const e = context.getBase44().entities;
    const runs = await all(e.TriageRun, { bench_run_id: data.id });
    const attempts = runs.length ? await all(e.Attempt, { run_id: { $in: runs.map((r) => r.id) } }) : [];
    const ttv = runs.map((r) => r.time_to_valid_ms).filter((v) => v != null).sort((a, b) => a - b);
    const n = runs.length;
    const rate = (k) => (n ? runs.filter((r) => r[k]).length / n : 0);
    const sum = (rows, k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
    const dolphin = sum(runs, "dolphin_cost_usd");
    const serv = sum(runs, "serv_cost_usd");
    return e.BenchRun.update(data.id, {
      n_cases: n, n_failed: runs.filter((r) => r.status !== "done").length, p50_ms: percentile(ttv, 50), p95_ms: percentile(ttv, 95),
      hit_at_1: rate("hit_at_1"), hit_at_3: rate("hit_at_3"), hit_at_5: rate("hit_at_5"),
      dolphin_cost_usd: dolphin, serv_cost_usd: serv, total_cost_usd: dolphin + serv,
      dolphin_in_tokens: sum(attempts, "in_tokens"), dolphin_out_tokens: sum(attempts, "out_tokens"), finished_at: new Date().toISOString(),
    });
  });

export const exportAll = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async ({ context }) => {
  const e = context.getBase44().entities;
  const [attempts, triage_runs] = await Promise.all([all(e.Attempt), all(e.TriageRun)]);
  return { attempts, triage_runs };
});