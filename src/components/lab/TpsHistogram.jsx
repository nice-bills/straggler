import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtTps, linearHistogram } from "@/lib/stats";
import { ChartFrame, tooltipStyle } from "@/components/lab/LatencyHistogram";

export default function TpsHistogram({ tps }) {
  const data = linearHistogram(tps, 30);
  return (
    <ChartFrame title="Tokens/sec">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <XAxis dataKey="from" tickFormatter={fmtTps} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
          <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={tooltipStyle} labelFormatter={(v) => `≥ ${fmtTps(v)} tok/s`} />
          <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}