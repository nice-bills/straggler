import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCAL_CHECKS } from "@/lib/selfchecks";
import { selfCheckSnapshot } from "@/lib/triage-fns";

export const Route = createFileRoute("/_authed/self-check")({
  head: () => ({ meta: [{ title: "Self-check · Straggler" }] }),
  component: SelfCheckPage,
});

function SelfCheckPage() {
  const snap = useServerFn(selfCheckSnapshot);
  const checks = [
    ...LOCAL_CHECKS,
    {
      name: "buildSnapshot on octocat/Hello-World: file_count > 0, est_tokens < 400k",
      run: async () => {
        const s = await snap();
        return { pass: s.file_count > 0 && s.est_tokens < 400000, detail: `${s.file_count} files · ${s.est_tokens} est tokens` };
      },
    },
  ];
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const runAll = async () => {
    setRunning(true);
    setResults({});
    for (const c of checks) {
      setResults((r) => ({ ...r, [c.name]: { pending: true } }));
      const res = await c.run().catch((e) => ({ pass: false, detail: e.message }));
      setResults((r) => ({ ...r, [c.name]: res }));
    }
    setRunning(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Self-check</h1>
        <Button onClick={runAll} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <Play />} Run checks</Button>
      </div>
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {checks.map((c) => {
          const r = results[c.name];
          return (
            <div key={c.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[64px_1fr]">
              <span className={`font-mono text-xs ${r?.pending || !r ? "text-muted-foreground" : r.pass ? "text-emerald-400" : "text-red-400"}`}>
                {r?.pending ? "…" : r ? (r.pass ? "PASS" : "FAIL") : "—"}
              </span>
              <div>
                <p className="text-sm">{c.name}</p>
                {r?.detail && <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{r.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}