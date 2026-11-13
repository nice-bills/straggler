/* global process, console, setTimeout, fetch, AbortSignal */
// Watches Base for proxy upgrades and sends each one to /api/ingest for review.
// Usage: INGEST_URL=https://<app>/api/ingest INGEST_SECRET=... node scripts/watch-chain.mjs [blocksBack=300]
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
const { getUpgrades } = await import("../src/lib/chain.server.js");

const SCOUT = "https://base.blockscout.com/api";
const UPGRADED = "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b";
const { INGEST_URL, INGEST_SECRET } = process.env;
if (!INGEST_URL || !INGEST_SECRET) throw new Error("Set INGEST_URL and INGEST_SECRET");
const MAX_PER_POLL = 5; // bounds review spend per poll

const get = (q) => fetch(`${SCOUT}?${q}`, { signal: AbortSignal.timeout(45000) }).then((r) => r.json());
let from = parseInt((await get("module=block&action=eth_block_number")).result, 16) - Number(process.argv[2] || 300);
const seen = new Set();

while (true) {
  try {
    const head = parseInt((await get("module=block&action=eth_block_number")).result, 16);
    const logs = (await get(`module=logs&action=getLogs&fromBlock=${from}&toBlock=${head}&topic0=${UPGRADED}`)).result || [];
    let sent = 0;
    for (const l of Array.isArray(logs) ? logs : []) {
      const key = `${l.transactionHash}:${l.logIndex}`;
      if (seen.has(key) || sent >= MAX_PER_POLL) continue;
      seen.add(key);
      const proxy = l.address;
      const nextImpl = "0x" + l.topics[1].slice(-40);
      const ups = await getUpgrades(8453, proxy);
      const i = ups.findIndex((u) => u.tx === l.transactionHash && u.impl.toLowerCase() === nextImpl.toLowerCase());
      if (i < 1) { console.log(`skip ${proxy}: first implementation, nothing to diff`); continue; }
      sent++;
      const res = await fetch(INGEST_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ingest-secret": INGEST_SECRET },
        body: JSON.stringify({ chainId: 8453, proxy, prevImpl: ups[i - 1].impl, nextImpl, tx: l.transactionHash }),
      });
      console.log(`${proxy} ${l.transactionHash}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    if (sent < MAX_PER_POLL) from = head + 1; // only advance once the window is drained
  } catch (e) {
    console.error("poll failed:", e.message);
  }
  await new Promise((r) => setTimeout(r, 15000));
}
