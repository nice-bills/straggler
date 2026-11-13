/* global console, URL */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
const { getUpgrades } = await import("../src/lib/chain.server.js");
const { reviewUpgrade } = await import("../src/lib/review.server.js");
const incidentCases = JSON.parse(readFileSync(new URL("../data/backtest.json", import.meta.url))).cases.filter((c) => c.kind === "upgrade" && c.proxy_address);
const benignCases = existsSync(new URL("../data/benign.json", import.meta.url)) ? JSON.parse(readFileSync(new URL("../data/benign.json", import.meta.url))) : [];
const cases = [];
for (const c of incidentCases) {
  try {
    const ups = await getUpgrades(c.chain_id, c.proxy_address);
    const idx = ups.findIndex((u) => u.impl.toLowerCase() === c.vulnerable_address.toLowerCase());
    if (idx <= 0) throw new Error("vulnerable implementation Upgraded log or preceding implementation not found");
    cases.push({ name: c.name, kind: "incident", chainId: c.chain_id, proxy: c.proxy_address, prevImpl: ups[idx - 1].impl, nextImpl: ups[idx].impl, tx: ups[idx].tx });
  } catch (e) { cases.push({ name: c.name, kind: "incident", chainId: c.chain_id, proxy: c.proxy_address, nextImpl: c.vulnerable_address, tx: c.live_tx, setupError: e.message }); }
}
for (const c of benignCases) cases.push({ name: c.name, kind: "benign", chainId: c.chain_id, proxy: c.proxy, prevImpl: c.prev_impl, nextImpl: c.next_impl, tx: c.tx });
const outPath = new URL("../data/backtest-results.json", import.meta.url);
const results = existsSync(outPath) ? JSON.parse(readFileSync(outPath)) : [];
const verdictFlag = (verdict) => /funds|high risk/i.test(verdict || "");
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
