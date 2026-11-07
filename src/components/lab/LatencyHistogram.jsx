import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMs, histogram } from "@/lib/stats";

export default function LatencyHistogram({ sorted, color = "hsl(var(--chart-1))" }) {
  const data = histogram(sorted);
  return (
    <ChartFrame title="Latency histogram">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <XAxis dataKey="from" tickFormatter={fmtMs} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
          <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={tooltipStyle} labelFormatter={(v) => `≥ ${fmtMs(v)}`} />
          <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 4,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
};

export function ChartFrame({ title, children }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}