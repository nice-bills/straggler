import { Link } from "@tanstack/react-router";
import VerdictBadge from "@/components/lab/VerdictBadge";
import { fmtMs, fmtPct, fmtUsd } from "@/lib/stats";

export default function RunsList({ runs }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">Past runs</h2>
      {!runs.length ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No runs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full font-mono text-xs">
            <thead className="bg-card text-left text-muted-foreground">
              <tr>{["label", "n", "conc", "p50", "p95", "p99", "err", "cost", "verdict"].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-card/60">
                  <td className="px-3 py-2"><Link to="/runs/$runId" params={{ runId: r.id }} className="text-foreground hover:text-primary">{r.label}</Link></td>
                  <td className="px-3 py-2">{r.n_calls}</td>
                  <td className="px-3 py-2">{r.concurrency}</td>
                  <td className="px-3 py-2">{fmtMs(r.p50_ms)}</td>
                  <td className="px-3 py-2">{fmtMs(r.p95_ms)}</td>
                  <td className="px-3 py-2">{fmtMs(r.p99_ms)}</td>
                  <td className="px-3 py-2">{r.finished_at ? fmtPct(r.error_rate) : "—"}</td>
                  <td className="px-3 py-2">{r.finished_at ? fmtUsd(r.total_cost_usd) : "—"}</td>
                  <td className="px-3 py-2">{r.verdict ? <VerdictBadge verdict={r.verdict} /> : <span className="text-muted-foreground">unfinished</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}