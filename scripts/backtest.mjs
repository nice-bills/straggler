/* global console, URL */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
const { reviewUpgrade } = await import("../src/lib/review.server.js");
const load = (f) => (existsSync(new URL(`../data/${f}`, import.meta.url)) ? JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url))) : []);
// Ground truth: incidents.json (upgrades that lost funds) and benign.json (planned governance upgrades), both checked on-chain.
const cases = [
  ...load("incidents.json").map((c) => ({ name: c.name, kind: "incident", chainId: c.chain_id, proxy: c.proxy, prevImpl: c.prev_impl, nextImpl: c.next_impl, tx: c.tx })),
  ...load("benign.json").map((c) => ({ name: c.name, kind: "benign", chainId: c.chain_id, proxy: c.proxy, prevImpl: c.prev_impl, nextImpl: c.next_impl, tx: c.tx })),
];
const outPath = new URL("../data/backtest-results.json", import.meta.url);
const results = existsSync(outPath) ? JSON.parse(readFileSync(outPath)) : [];
// "flagged" = the verdict tells a depositor to stop: high risk or critical ("funds logic untouched" must not count).
const verdictFlag = (verdict) => /high risk|critical/i.test(verdict || "");
for (const c of cases) for (const mode of ["single", "hedged"]) {
  if (results.some((r) => r.name === c.name && r.mode === mode)) continue;
  const row = { name: c.name, kind: c.kind, mode, verdict: null, flagged: false, cost_usd: 0, ms: 0, error: null, chainId: c.chainId, proxy: c.proxy, prevImpl: c.prevImpl || null, nextImpl: c.nextImpl, tx: c.tx || null, changed_functions: [], claims: [] };
  try {
    if (c.setupError) throw new Error(c.setupError);
    const review = await reviewUpgrade({ chainId: c.chainId, proxy: c.proxy, prevImpl: c.prevImpl, nextImpl: c.nextImpl, mode });
    row.verdict = review.verdict; row.flagged = verdictFlag(review.verdict); row.cost_usd = review.cost_usd; row.ms = review.ms;
    row.changed_functions = review.diff.changed.map((x) => ({ file: x.path, ...x.functions })); row.claims = review.review.changes;
  } catch (e) { row.error = e.message; }
  results.push(row); writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
}
const stats = (xs) => xs.length ? xs.sort((a,b)=>a-b)[Math.floor((xs.length-1)*.5)] : null;
for (const kind of ["incident", "benign"]) for (const mode of ["single", "hedged"]) {
 const rs=results.filter(r=>r.kind===kind&&r.mode===mode), ok=rs.filter(r=>!r.error);
 console.log(kind,mode,`n=${ok.length}/${rs.length}`,`recall=${kind==="incident"?(ok.filter(r=>r.flagged).length+"/"+ok.length):"n/a"}`,`false-flag=${kind==="benign"?(ok.length?ok.filter(r=>r.flagged).length/ok.length:"n/a"):"n/a"}`,`p50=${stats(ok.map(r=>r.ms))}`,`cost=${ok.length?ok.reduce((n,r)=>n+r.cost_usd,0)/ok.length:"n/a"}`);
}
