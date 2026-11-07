import { fmtPct, fmtTps, gapCheck } from "@/lib/stats";
import { ChartFrame } from "@/components/lab/LatencyHistogram";

export default function GapCheck({ tps }) {
  const g = gapCheck(tps);
  return (
    <ChartFrame title="Gap check">
      {!g ? (
        <p className="font-mono text-xs text-muted-foreground">Need at least 2 calls with tokens/sec.</p>
      ) : (
        <div className="space-y-3 font-mono text-xs">
          <span className={`inline-block rounded border px-2 py-0.5 font-medium ${g.bimodal ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
            {g.bimodal ? "BIMODAL" : "ONE GROUP"}
          </span>
          <table className="w-full">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1 font-normal">group</th><th className="font-normal">count</th><th className="font-normal">share</th><th className="font-normal">median tok/s</th></tr>
            </thead>
            <tbody>
              {[["fast", g.fast], ["slow", g.slow]].map(([k, v]) => (
                <tr key={k} className="border-t border-border">
                  <td className="py-1.5">{k}</td><td>{v.count}</td><td>{fmtPct(v.share)}</td><td>{fmtTps(v.median)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>fast / slow = <span className="text-sm text-foreground">{g.ratio.toFixed(2)}×</span></p>
        </div>
      )}
    </ChartFrame>
  );
}