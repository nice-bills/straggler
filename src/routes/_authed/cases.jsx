import { createFileRoute } from "@tanstack/react-router";
import { casesPage } from "@/lib/triage-fns";
import AddRepoForm from "@/components/cases/AddRepoForm";
import RepoCard from "@/components/cases/RepoCard";
import CasesTable from "@/components/cases/CasesTable";

export const Route = createFileRoute("/_authed/cases")({
  loader: () => casesPage(),
  head: () => ({ meta: [{ title: "Cases · Straggler" }] }),
  component: CasesPage,
});

function CasesPage() {
  const { repos, cases, snapshots } = Route.useLoaderData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">Merged PRs that say “fixes #N” become cases. The files they changed are the gold answer. First 20% of each build is dev, the rest is test.</p>
      </div>
      <AddRepoForm />
      <div className="grid gap-4 md:grid-cols-2">
        {repos.map((r) => (
          <RepoCard key={r.id} repo={r} caseCount={cases.filter((c) => c.repo_id === r.id).length} snapshots={snapshots.filter((s) => s.repo_id === r.id && s.truncated)} />
        ))}
      </div>
      <CasesTable cases={cases} repos={repos} />
    </div>
  );
}