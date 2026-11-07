import { computeStats } from "@/lib/stats";
import StatGrid from "@/components/lab/StatGrid";
import VerdictBadge from "@/components/lab/VerdictBadge";
import LatencyHistogram from "@/components/lab/LatencyHistogram";
import SortedLatencyChart from "@/components/lab/SortedLatencyChart";
import TpsHistogram from "@/components/lab/TpsHistogram";
import GapCheck from "@/components/lab/GapCheck";
import CallsTable from "@/components/lab/CallsTable";

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
        <div className="min-w-0 space-y-4">
          <LatencyHistogram sorted={stats.sorted} />
          <TpsHistogram tps={stats.tps} />
        </div>
        <div className="min-w-0 space-y-4">
          <SortedLatencyChart sorted={stats.sorted} />
          <GapCheck tps={stats.tps} />
        </div>
      </div>
      <CallsTable calls={calls} />
    </section>
  );
}