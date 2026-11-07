import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { benchPage } from "@/lib/triage-fns";
import { useBenchRunner } from "@/hooks/useBenchRunner";
import BenchControls from "@/components/bench/BenchControls";
import BenchCompare from "@/components/bench/BenchCompare";
import PriceBox from "@/components/bench/PriceBox";
import ExportButtons from "@/components/bench/ExportButtons";

export const Route = createFileRoute("/_authed/benchmark")({
  loader: () => benchPage(),
  head: () => ({ meta: [{ title: "Benchmark · Straggler" }] }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const { runs, counts } = Route.useLoaderData();
  const [split, setSplit] = useState("dev");
  const bench = useBenchRunner();
  const done = runs.filter((r) => r.finished_at);
  const latest = (mode) => done.find((r) => r.split === split && r.mode === mode);
  const hasDev = done.some((r) => r.split === "dev");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Benchmark</h1>
          <p className="mt-1 text-sm text-muted-foreground">Same cases, single vs hedged. Showing the latest finished run of each mode for this split.</p>
        </div>
        <ExportButtons />
      </div>
      <BenchControls split={split} setSplit={setSplit} counts={counts} hasDev={hasDev} bench={bench} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <BenchCompare single={latest("single")} hedged={latest("hedged")} />
        <PriceBox single={latest("single")} hedged={latest("hedged")} />
      </div>
    </div>
  );
}