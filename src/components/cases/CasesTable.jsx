import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export default function CasesTable({ cases, repos }) {
  const repoById = Object.fromEntries(repos.map((r) => [r.id, r]));
  if (!cases.length) {
    return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No cases yet. Add a repo and build cases.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-xs">
        <thead className="bg-card text-left text-muted-foreground">
          <tr>{["repo", "issue", "title", "split", "PR", "gold files", ""].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const repo = repoById[c.repo_id];
            return (
              <tr key={c.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-muted-foreground">{repo ? `${repo.owner}/${repo.name}` : "—"}</td>
                <td className="px-3 py-2 font-mono">#{c.issue_number}</td>
                <td className="max-w-[260px] px-3 py-2">{c.issue_title}</td>
                <td className={`px-3 py-2 font-mono ${c.split === "dev" ? "text-sky-400" : "text-purple-400"}`}>{c.split}</td>
                <td className="px-3 py-2 font-mono">#{c.fix_pr_number}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{JSON.parse(c.gold_files || "[]").map((f) => <div key={f} className="break-all">{f}</div>)}</td>
                <td className="px-3 py-2">
                  <Button asChild size="sm" variant="outline"><Link to="/triage" search={{ case: c.id }}>Triage this</Link></Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}