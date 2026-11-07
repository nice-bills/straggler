import { createFileRoute } from "@tanstack/react-router";
import RunForm from "@/components/lab/RunForm";
import RunResults from "@/components/lab/RunResults";

export const Route = createFileRoute("/_authed/")({
  head: () => ({ meta: [{ title: "Latency Lab · Straggler" }] }),
  component: LatencyLab,
});

// SAMPLE DATA — placeholder until runs are wired to the server.
function sampleCalls() {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 200 }, (_, i) => {
    const tail = rnd() < 0.06 ? 4000 + rnd() * 9000 : 0;
    return { idx: i, status: "ok", latency_ms: Math.round(700 + rnd() * 500 + tail), cost_usd: 0.0000006, fallback_suspect: false };
  });
}

function LatencyLab() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Latency Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">Is Dolphin's tail fat enough that hedged dispatch pays? Fire identical calls and measure.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <RunForm onRun={() => {}} running={false} />
        <RunResults title="sample run (placeholder)" calls={sampleCalls()} />
      </div>
    </div>
  );
}