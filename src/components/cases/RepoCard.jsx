import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildCasesFn } from "@/lib/triage-fns";
import SnapshotNote from "@/components/triage/SnapshotNote";

export default function RepoCard({ repo, caseCount, snapshots }) {
  const build = useServerFn(buildCasesFn);
  const router = useRouter();
  const [max, setMax] = useState(20);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await build({ data: { repo_id: repo.id, max_cases: Number(max) } });
      setMsg(`Added ${r.created} cases (${r.dev} dev, ${r.test} test).`);
      await router.invalidate();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={`https://github.com/${repo.owner}/${repo.name}`} target="_blank" rel="noreferrer" className="font-mono text-sm hover:text-primary">{repo.owner}/{repo.name}</a>
        <span className="font-mono text-xs text-muted-foreground">{caseCount} cases · {repo.default_branch}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} max={50} value={max} onChange={(e) => setMax(e.target.value)} className="h-8 w-20 font-mono text-xs" disabled={busy} />
        <Button size="sm" onClick={run} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Build cases</Button>
      </div>
      {busy && <p className="font-mono text-xs text-muted-foreground">Scanning merged PRs for “fixes #N”…</p>}
      {msg && <p className="font-mono text-xs text-muted-foreground">{msg}</p>}
      {snapshots.map((s) => <SnapshotNote key={s.id} snapshot={s} />)}
    </div>
  );
}