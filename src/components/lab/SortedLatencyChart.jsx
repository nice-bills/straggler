import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMs } from "@/lib/stats";
import { ChartFrame, tooltipStyle } from "@/components/lab/LatencyHistogram";

export default function SortedLatencyChart({ sorted, color = "hsl(var(--chart-1))" }) {
  const data = sorted.map((ms, i) => ({ rank: Math.round(((i + 1) / sorted.length) * 1000) / 10, ms }));
  return (
    <ChartFrame title="Sorted latency (percentile → ms)">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <XAxis dataKey="rank" type="number" domain={[0, 100]} tickFormatter={(v) => `p${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
          <YAxis tickFormatter={fmtMs} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `p${v}`} formatter={(v) => [fmtMs(v), "latency"]} />
          <Line dataKey="ms" stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}