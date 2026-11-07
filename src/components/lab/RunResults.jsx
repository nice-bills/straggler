import { computeStats } from "@/lib/stats";
import StatGrid from "@/components/lab/StatGrid";
import VerdictBadge from "@/components/lab/VerdictBadge";
import LatencyHistogram from "@/components/lab/LatencyHistogram";
import SortedLatencyChart from "@/components/lab/SortedLatencyChart";

export default function RunResults({ title, calls, actions }) {
  const stats = computeStats(calls);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-sm">{title}</h2>
          <VerdictBadge verdict={stats.verdict} showHint />
          <span className="font-mono text-xs text-muted-foreground">{stats.n} calls</span>
        </div>
        {actions}
      </div>
      <StatGrid stats={stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <LatencyHistogram sorted={stats.sorted} />
        <SortedLatencyChart sorted={stats.sorted} />
      </div>
    </section>
  );
}