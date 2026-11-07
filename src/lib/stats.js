export const REQUESTED_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash";

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, i))];
}

// Percentiles use every call that got a timing (ok + timeout); hard errors are excluded.
export function computeStats(calls) {
  const n = calls.length;
  const timed = calls.filter((c) => c.status !== "error" && c.latency_ms != null);
  const sorted = timed.map((c) => c.latency_ms).sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const errors = calls.filter((c) => c.status !== "ok").length;
  const timeout_count = calls.filter((c) => c.status === "timeout").length;
  const fallback_suspect_count = calls.filter((c) => c.fallback_suspect).length;
  const cost = calls.reduce((s, c) => s + (c.cost_usd || 0), 0);
  const tps = calls.map((c) => c.tokens_per_sec).filter((v) => v > 0).sort((a, b) => a - b);
  return {
    n,
    tps,
    median_tps: percentile(tps, 50),
    p10_tps: percentile(tps, 10),
    p90_tps: percentile(tps, 90),
    p50,
    p95,
    p99,
    error_rate: n ? errors / n : 0,
    timeout_count,
    fallback_suspect_count,
    cost,
    verdict: verdictFor({ p50, p95, p99, n, timeout_count }),
    sorted,
  };
}

export function verdictFor({ p50, p95, p99, n, timeout_count }) {
  if (p50 == null) return "FAT";
  if (p99 >= 3 * p50 || (n && timeout_count / n >= 0.02)) return "FAT";
  if (p95 < 1.5 * p50) return "FLAT";
  return "MIXED";
}

export function histogram(sorted, bins = 24) {
  if (!sorted.length) return [];
  // Log-spaced bins so a long tail stays visible next to the bulk.
  const lo = Math.log(Math.max(1, sorted[0]));
  const hi = Math.log(Math.max(2, sorted[sorted.length - 1]));
  const width = Math.max(1e-6, (hi - lo) / bins);
  const out = Array.from({ length: bins }, (_, i) => ({ from: Math.round(Math.exp(lo + i * width)), count: 0 }));
  for (const v of sorted) out[Math.min(bins - 1, Math.floor((Math.log(Math.max(1, v)) - lo) / width))].count++;
  return out;
}

export function linearHistogram(sorted, bins = 30) {
  if (!sorted.length) return [];
  const min = sorted[0];
  const width = Math.max(1e-6, (sorted[sorted.length - 1] - min) / bins);
  const out = Array.from({ length: bins }, (_, i) => ({ from: Math.round((min + i * width) * 10) / 10, count: 0 }));
  for (const v of sorted) out[Math.min(bins - 1, Math.floor((v - min) / width))].count++;
  return out;
}

// Split sorted tokens/sec at the biggest gap between neighbours.
export function gapCheck(tps) {
  if (tps.length < 2) return null;
  let cut = 0;
  for (let i = 1; i < tps.length - 1; i++) if (tps[i + 1] - tps[i] > tps[cut + 1] - tps[cut]) cut = i;
  const slow = tps.slice(0, cut + 1);
  const fast = tps.slice(cut + 1);
  const group = (g) => ({ count: g.length, share: g.length / tps.length, median: percentile(g, 50) });
  const ratio = percentile(fast, 50) / percentile(slow, 50);
  const bimodal = ratio >= 2 && Math.min(slow.length, fast.length) / tps.length >= 0.2;
  return { fast: group(fast), slow: group(slow), ratio, bimodal };
}

export const fmtTps = (v) => (v == null ? "—" : v.toFixed(1));
export const fmtMs = (v) => (v == null ? "—" : v >= 10000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`);
export const fmtUsd = (v) => `$${(v || 0).toFixed(v < 0.01 ? 6 : 4)}`;
export const fmtPct = (v) => `${((v || 0) * 100).toFixed(1)}%`;