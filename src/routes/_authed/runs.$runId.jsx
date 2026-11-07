import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getRun } from "@/lib/lab-fns";
import RunResults from "@/components/lab/RunResults";
import CsvButton from "@/components/lab/CsvButton";

export const Route = createFileRoute("/_authed/runs/$runId")({
  loader: ({ params }) => getRun({ data: { id: params.runId } }),
  head: () => ({ meta: [{ title: "Run · Straggler" }] }),
  component: RunPage,
});

function RunPage() {
  const data = Route.useLoaderData();
  if (!data) return null;
  const { run, calls } = data;
  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Latency Lab</Link>
      <p className="font-mono text-xs text-muted-foreground">
        conc {run.concurrency} · max_tokens {run.max_tokens} · {new Date(run.started_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC · “{run.prompt}”
      </p>
      <RunResults title={run.label} calls={calls} actions={<CsvButton calls={calls} name={run.label} />} />
    </div>
  );
}