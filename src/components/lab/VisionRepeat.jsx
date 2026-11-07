import { fmtMs, percentile } from "@/lib/stats";

export default function VisionRepeat({ results, running }) {
  const sorted = results.filter((r) => r.status === "ok").map((r) => r.latency_ms).sort((a, b) => a - b);
  const failed = results.length - sorted.length;
  return (
    <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border font-mono text-xs">
      {[
        ["calls", `${results.length} / 10${running ? "…" : ""}`],
        ["p50", fmtMs(percentile(sorted, 50))],
        ["p95", fmtMs(percentile(sorted, 95))],
        ["failed", String(failed)],
      ].map(([k, v]) => (
        <div key={k} className="bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
          <div className={`mt-0.5 text-sm ${k === "failed" && failed ? "text-red-400" : ""}`}>{v}</div>
        </div>
      ))}
    </div>
  );
}