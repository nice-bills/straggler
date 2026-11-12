/* global process, console */
// Reviews one upgrade of a proxy contract from public chain data.
// Usage: node --env-file=.env scripts/watch.mjs <chainId> <proxy> [stepsBack=0] [hedged|single]
//        node scripts/watch.mjs selfcheck
import { register } from "node:module";
import assert from "node:assert";
register("./hooks.mjs", import.meta.url);

const core = await import("../src/lib/upgrade-core.js");

if (process.argv[2] === "selfcheck") {
  const a = { "src/V.sol": "contract V { function withdraw(uint x) external { require(x > 0); pay(x); } function name() external {} }" };
  const b = { "lib/V.sol": "contract V { function withdraw(uint x) external { pay(x); } function name() external {} function sweep() external {} }" };
  const d = core.diffSources(a, b);
  assert.deepEqual(d.changed[0].functions, { changed: ["withdraw"], added: ["sweep"], removed: [] });
  const claim = (o) => JSON.stringify({ summary: "s", changes: [{ file: "lib/V.sol", function: "withdraw", touches_funds: true, risk: "high", quote: "pay(x);", ...o }] });
  assert.equal(core.validateReview(claim({}), d, b).parsed.changes[0].struck, null);
  assert.equal(core.validateReview(claim({ function: "name" }), d, b).ok, false);
  assert.equal(core.validateReview(claim({ quote: "require(x > 1)" }), d, b).ok, false);
  assert.equal(core.verdictOf(d, core.validateReview(claim({}), d, b).parsed.changes), "funds logic changed, high risk");
  console.log("selfcheck ok");
  process.exit(0);
}

const { getUpgrades, getSources } = await import("../src/lib/chain.server.js");
const { callDolphin } = await import("../src/lib/dolphin.server.js");
const { hedge } = await import("../src/lib/triage-core.js");

const [chainId, proxy, back = "0", mode = "hedged"] = process.argv.slice(2);
const ups = await getUpgrades(Number(chainId), proxy);
const i = ups.length - 1 - Number(back);
if (i < 1) throw new Error(`Need two implementations, found ${ups.length}`);
const [prev, next] = [ups[i - 1], ups[i]];
console.log(`${ups.length} upgrades. Reviewing ${prev.impl} -> ${next.impl} (${next.time}, tx ${next.tx})`);
const [oldSrc, newSrc] = await Promise.all([getSources(Number(chainId), prev.impl), getSources(Number(chainId), next.impl)]);
const diff = core.diffSources(oldSrc.files, newSrc.files);
console.log(`files: ${diff.changed.length} changed, ${diff.added.length} added, ${diff.removed.length} removed, ${diff.unchanged} unchanged`);
for (const c of diff.changed) console.log(`  ${c.path}: changed [${c.functions.changed}] added [${c.functions.added}] removed [${c.functions.removed}]`);

const messages = core.buildUpgradeMessages(diff, oldSrc.files, newSrc.files);
console.log(`prompt: ${messages[1].content.length} chars`);
const run = await hedge(
  (n, signal) => callDolphin({ messages, max_tokens: 8000, timeoutMs: 180000, signal, extra: { reasoning_effort: "low" } }),
  (r) => (r.status !== "ok" ? { ok: false, reason: r.error || r.status } : core.validateReview(r.content, diff, newSrc.files)),
  mode,
);
for (const a of run.attempts) console.log(`copy ${a.copy_index}: ${a.end_offset_ms}ms valid=${a.valid} ${a.invalid_reason || ""} in=${a.res?.in_tokens} out=${a.res?.out_tokens} $${a.res?.cost_usd}`);
if (!run.winner) process.exit(1);
console.log(JSON.stringify(run.winner.parsed, null, 2));
console.log("VERDICT:", core.verdictOf(diff, run.winner.parsed.changes));
