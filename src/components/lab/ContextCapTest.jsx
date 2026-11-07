import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contextCapTest } from "@/lib/lab-fns";
import { fmtMs } from "@/lib/stats";

const SIZES = ["50k", "200k", "500k"];

export default function ContextCapTest() {
  const test = useServerFn(contextCapTest);
  const [rows, setRows] = useState({});
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setRows({});
    for (const size of SIZES) {
      setRows((r) => ({ ...r, [size]: { pending: true } }));
      const res = await test({ data: { size } }).catch((e) => ({ status: "error", error: e.message }));
      setRows((r) => ({ ...r, [size]: res }));
    }
    setRunning(false);
  };

  return (
    <TestCard title="Context cap test" desc="~50k → 200k → 500k tokens of filler, ending with “What is the last word above?” (PASS if reply contains pineapple, max_tokens 512)"
      action={<Button size="sm" onClick={run} disabled={running}>{running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Run test</Button>}>
      <div className="divide-y divide-border font-mono text-xs">
        {SIZES.map((s) => {
          const r = rows[s];
          return (
            <div key={s} className="grid grid-cols-[44px_64px_44px_1fr] gap-3 py-2">
              <span>{s}</span>
              {r && !r.pending ? (
                <span className={/pineapple/i.test(r.content || "") ? "text-emerald-400" : "text-red-400"}>
                  {/pineapple/i.test(r.content || "") ? "PASS" : "FAIL"}
                </span>
              ) : <span className="text-muted-foreground">—</span>}
              <span className={r?.status === "ok" ? "text-muted-foreground" : r?.pending || !r ? "text-muted-foreground" : "text-red-400"}>
                {r?.pending ? "sending…" : r ? `${r.status}${r.http_code ? ` ${r.http_code}` : ""}` : "—"}
              </span>
              <span className="whitespace-pre-wrap break-all text-muted-foreground">
                {r && !r.pending && (r.status === "ok" ? `“${r.content}” · ${fmtMs(r.latency_ms)} · ${r.in_tokens} in-tok` : r.error)}
              </span>
            </div>
          );
        })}
      </div>
    </TestCard>
  );
}

export function TestCard({ title, desc, action, children }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}