import { fmtMs } from "@/lib/stats";
import { ChartFrame } from "@/components/lab/LatencyHistogram";

const color = (a) => (a.winner ? "bg-emerald-500" : a.cancelled ? "bg-muted-foreground/40" : "bg-red-500/70");

export default function Timeline({ attempts, startedAt }) {
  const t0 = Date.parse(startedAt);
  const rows = [...attempts].sort((a, b) => a.copy_index - b.copy_index).map((a) => ({
    ...a, from: Date.parse(a.started_at) - t0, to: Date.parse(a.finished_at) - t0,
  }));
  const max = Math.max(1, ...rows.map((r) => r.to));
  return (
    <ChartFrame title="Dolphin copies">
      <div className="space-y-2 font-mono text-xs">
        {rows.map((r) => (
          <div key={r.copy_index} className="grid grid-cols-[52px_1fr] items-center gap-3">
            <span className="text-muted-foreground">copy {r.copy_index}</span>
            <div>
              <div className="relative h-4 rounded bg-secondary">
                <div className={`absolute inset-y-0 rounded ${color(r)}`}
                  style={{ left: `${(r.from / max) * 100}%`, width: `${Math.max(1, ((r.to - r.from) / max) * 100)}%` }} />
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {fmtMs(r.latency_ms)} · {r.winner ? "winner" : r.cancelled ? "cancelled" : `invalid: ${r.invalid_reason}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}