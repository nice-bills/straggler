import { fmtMs, fmtPct, fmtUsd } from "@/lib/stats";

export default function StatGrid({ stats }) {
  const cells = [
    ["p50", fmtMs(stats.p50)],
    ["p95", fmtMs(stats.p95)],
    ["p99", fmtMs(stats.p99)],
    ["p99 / p50", stats.p50 ? `${(stats.p99 / stats.p50).toFixed(2)}×` : "—"],
    ["error rate", fmtPct(stats.error_rate)],
    ["timeouts", String(stats.timeout_count)],
    ["fallback suspects", String(stats.fallback_suspect_count)],
    ["total cost", fmtUsd(stats.cost)],
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
      {cells.map(([k, v]) => (
        <div key={k} className="bg-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
          <div className="mt-1 font-mono text-lg font-medium">{v}</div>
        </div>
      ))}
    </div>
  );
}