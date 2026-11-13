import { createFileRoute } from "@tanstack/react-router";
import RunForm from "@/components/lab/RunForm";
import RunResults from "@/components/lab/RunResults";
import RunProgress from "@/components/lab/RunProgress";
import RunsList from "@/components/lab/RunsList";
import CsvButton from "@/components/lab/CsvButton";
import ContextCapTest from "@/components/lab/ContextCapTest";
import VisionTest from "@/components/lab/VisionTest";
import { listRuns } from "@/lib/lab-fns";
import { useLatencyRunner } from "@/hooks/useLatencyRunner";

export const Route = createFileRoute("/_authed/lab")({
  loader: () => listRuns(),
  head: () => ({ meta: [{ title: "Latency Lab · Straggler" }] }),
  component: LatencyLab,
});

function LatencyLab() {
  const runs = Route.useLoaderData() ?? [];
  const r = useLatencyRunner();
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Latency Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">Is Dolphin's tail fat enough that hedged dispatch pays? Fire identical calls and measure.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <RunForm onRun={r.start} running={r.running} />
          {r.run && <RunProgress done={r.calls.length} total={r.run.n_calls} running={r.running} error={r.error} />}
        </div>
        {r.calls.length ? (
          <RunResults title={r.run?.label} calls={r.calls} actions={!r.running && <CsvButton calls={r.calls} name={r.run.label} />} />
        ) : (
          <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-border font-mono text-xs text-muted-foreground">
            {r.running ? "waiting for first batch…" : "start a run to see live results"}
          </div>
        )}
      </div>
      <RunsList runs={runs} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ContextCapTest />
        <VisionTest />
      </div>
    </div>
  );
}