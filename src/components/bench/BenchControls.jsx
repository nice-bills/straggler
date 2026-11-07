import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BenchControls({ split, setSplit, counts, hasDev, bench }) {
  const busy = !!bench.progress;
  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-9 grid-cols-2 rounded-md border border-input p-0.5">
          {["dev", "test"].map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => setSplit(s)}
              className={`rounded px-3 font-mono text-xs ${split === s ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
              {s} ({counts[s]})
            </button>
          ))}
        </div>
        {["single", "hedged"].map((m) => (
          <Button key={m} size="sm" variant={m === "hedged" ? "default" : "outline"} onClick={() => bench.run(split, m)}
            disabled={busy || !counts[split] || (split === "test" && !hasDev)}>
            Run {m}
          </Button>
        ))}
      </div>
      {split === "test" && (
        <p className="flex items-start gap-2 text-xs text-yellow-400">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {hasDev ? "Test results are final. Don't tune prompts or settings after looking at them." : "Finish a dev run first. Test stays locked until then."}
        </p>
      )}
      {bench.progress && (
        <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {bench.progress.split} · {bench.progress.mode}: case {bench.progress.done + 1} / {bench.progress.total}
        </p>
      )}
      {bench.error && <p className="font-mono text-xs text-red-400">{bench.error}</p>}
    </div>
  );
}