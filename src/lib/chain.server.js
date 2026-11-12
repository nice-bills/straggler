// Public chain data with no API key: Blockscout for upgrade events, Sourcify for verified source.
const UPGRADED = "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b"; // Upgraded(address)
export const CHAINS = {
  1: { name: "Ethereum", scout: "https://eth.blockscout.com" },
  8453: { name: "Base", scout: "https://base.blockscout.com" },
  42161: { name: "Arbitrum", scout: "https://arbitrum.blockscout.com" },
  10: { name: "Optimism", scout: "https://optimism.blockscout.com" },
};

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
    }
  }
}

// Every implementation the proxy has pointed at, oldest first.
export async function getUpgrades(chainId, proxy) {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);
  const d = await getJson(`${chain.scout}/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=${proxy}&topic0=${UPGRADED}`);
  return (d.result || []).map((l) => ({
    impl: "0x" + l.topics[1].slice(-40),
    time: new Date(parseInt(l.timeStamp, 16) * 1000).toISOString(),
    block: parseInt(l.blockNumber, 16),
    tx: l.transactionHash,
  }));
}

// Verified source of one contract: { name, files: { path: content } }. Throws if unverified.
export async function getSources(chainId, address) {
  const d = await getJson(`https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=sources,compilation`);
  if (!d.sources) throw new Error(`No verified source for ${address}`);
  return {
    name: d.compilation?.name || "",
    files: Object.fromEntries(Object.entries(d.sources).map(([p, v]) => [p, v.content || ""])),
  };
}
