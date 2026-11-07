import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listRuns } from "@/lib/lab-fns";
import CompareColumn from "@/components/lab/CompareColumn";

export const Route = createFileRoute("/_authed/compare")({
  loader: () => listRuns(),
  head: () => ({ meta: [{ title: "Compare · Straggler" }] }),
  component: ComparePage,
});

function ComparePage() {
  const runs = (Route.useLoaderData() ?? []).filter((r) => r.finished_at);
  const [a, setA] = useState(runs[0]?.id);
  const [b, setB] = useState(runs[1]?.id);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Compare runs</h1>
      {runs.length < 2 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Finish at least two runs to compare.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <CompareColumn runs={runs} value={a} onChange={setA} />
          <CompareColumn runs={runs} value={b} onChange={setB} />
        </div>
      )}
    </div>
  );
}