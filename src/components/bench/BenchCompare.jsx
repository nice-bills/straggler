import { fmtMs, fmtPct, fmtUsd } from "@/lib/stats";

const ROWS = [
  ["cases", (r) => `${r.n_cases}${r.n_failed ? ` (${r.n_failed} failed)` : ""}`],
  ["p50 time-to-valid", (r) => fmtMs(r.p50_ms)],
  ["p95 time-to-valid", (r) => fmtMs(r.p95_ms)],
  ["hit@1", (r) => fmtPct(r.hit_at_1)],
  ["hit@3", (r) => fmtPct(r.hit_at_3)],
  ["hit@5", (r) => fmtPct(r.hit_at_5)],
  ["Dolphin cost", (r) => fmtUsd(r.dolphin_cost_usd)],
  ["SERV cost", (r) => fmtUsd(r.serv_cost_usd)],
  ["total cost", (r) => fmtUsd(r.total_cost_usd)],
  ["cost / case", (r) => fmtUsd(r.n_cases ? r.total_cost_usd / r.n_cases : 0)],
];

export default function BenchCompare({ single, hedged }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full font-mono text-xs">
        <thead className="bg-card text-left text-muted-foreground">
          <tr><th className="px-4 py-2 font-normal">metric</th><th className="px-4 py-2 font-normal">single</th><th className="px-4 py-2 font-normal">hedged</th></tr>
        </thead>
        <tbody>
          {ROWS.map(([k, f]) => (
            <tr key={k} className="border-t border-border">
              <td className="px-4 py-2 text-muted-foreground">{k}</td>
              <td className="px-4 py-2">{single ? f(single) : "—"}</td>
              <td className="px-4 py-2">{hedged ? f(hedged) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}