/* global process, console */
import assert from "node:assert";
import { register } from "node:module";
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
  console.log("selfcheck ok"); process.exit(0);
}
const { reviewUpgrade } = await import("../src/lib/review.server.js");
const [chain, proxy, back = "0", mode = "hedged"] = process.argv.slice(2);
const { getUpgrades } = await import("../src/lib/chain.server.js");
const upgrades = await getUpgrades(Number(chain), proxy);
const i = upgrades.length - 1 - Number(back);
if (i < 1) throw new Error(`Need two implementations, found ${upgrades.length}`);
const prevImpl = upgrades[i - 1].impl, nextImpl = upgrades[i].impl;
console.log(`${upgrades.length} upgrades. Reviewing ${prevImpl} -> ${nextImpl} (${upgrades[i].time}, tx ${upgrades[i].tx})`);
const result = await reviewUpgrade({ chainId: Number(chain), proxy, prevImpl, nextImpl, mode });
console.log(`${result.diff.changed.length} changed files; ${result.diff.added.length} added; ${result.diff.removed.length} removed`);
console.log(JSON.stringify(result.review, null, 2));
console.log("VERDICT:", result.verdict);
console.log("SERV ALERT:", result.alert_md);
