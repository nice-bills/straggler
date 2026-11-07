import { createFileRoute } from "@tanstack/react-router";
import { getCase } from "@/lib/triage-fns";
import { useTriageRunner } from "@/hooks/useTriageRunner";
import TriageForm from "@/components/triage/TriageForm";
import TriageStatus from "@/components/triage/TriageStatus";
import TriageResult from "@/components/triage/TriageResult";

export const Route = createFileRoute("/_authed/triage")({
  validateSearch: (s) => ({ case: typeof s.case === "string" ? s.case : undefined }),
  loaderDeps: ({ search }) => ({ caseId: search.case }),
  loader: ({ deps }) => (deps.caseId ? getCase({ data: { id: deps.caseId } }) : null),
  head: () => ({ meta: [{ title: "Triage · Straggler" }] }),
  component: TriagePage,
});

function TriagePage() {
  const caseData = Route.useLoaderData();
  const t = useTriageRunner();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Triage</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste a public GitHub issue. The whole repo plus the issue go to Dolphin in one call, hedged across two copies.</p>
      </div>
      <TriageForm key={caseData?.id || "url"} caseData={caseData} busy={t.busy} onRun={t.run} />
      <TriageStatus phase={t.phase} elapsed={t.elapsed} snapshot={t.snapshot} error={t.error} />
      {t.result && <TriageResult result={t.result} />}
    </div>
  );
}