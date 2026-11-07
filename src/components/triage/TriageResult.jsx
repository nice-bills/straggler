import { fmtMs, fmtUsd } from "@/lib/stats";
import Timeline from "@/components/triage/Timeline";
import ReplyBox from "@/components/triage/ReplyBox";

export default function TriageResult({ result: { run, attempts, repo, sha } }) {
  const files = JSON.parse(run.predicted_files || "[]");
  const cost = (run.dolphin_cost_usd || 0) + (run.serv_cost_usd || 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
        {[["time to valid", fmtMs(run.time_to_valid_ms)], ["label", run.label || "—"], ["Dolphin + SERV", fmtUsd(cost)], ["mode", run.mode]].map(([k, v]) => (
          <div key={k} className="bg-card px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-lg">{v}</div>
          </div>
        ))}
      </div>
      <Timeline attempts={attempts || []} startedAt={run.started_at} />
      {run.status === "failed" ? (
        <p className="font-mono text-xs text-red-400">{run.error}</p>
      ) : (
        <>
          <div className="space-y-3 rounded-md border border-border bg-card p-4 text-sm">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Predicted files</div>
            <ol className="space-y-1 font-mono text-xs">
              {files.map((f, i) => (
                <li key={f}>
                  <span className="text-muted-foreground">{i + 1}. </span>
                  <a href={`https://github.com/${repo.owner}/${repo.name}/blob/${sha}/${f}`} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">{f}</a>
                </li>
              ))}
            </ol>
            <p><span className="text-muted-foreground">Cause: </span>{run.cause}</p>
            <p><span className="text-muted-foreground">Repro check: </span>{run.repro_check}</p>
          </div>
          <ReplyBox markdown={run.reply_markdown || ""} ok={run.reply_ok} />
        </>
      )}
    </div>
  );
}