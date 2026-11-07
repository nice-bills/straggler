import { Loader2 } from "lucide-react";
import { fmtMs } from "@/lib/stats";
import SnapshotNote from "@/components/triage/SnapshotNote";

const LABEL = {
  snapshot: "Packing the repo snapshot (first time per commit can take a while)…",
  dolphin: "Dolphin copies running, then SERV writes the reply…",
};

export default function TriageStatus({ phase, elapsed, snapshot, error }) {
  return (
    <div className="space-y-2">
      {LABEL[phase] && (
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {LABEL[phase]} <span className="text-foreground">{fmtMs(elapsed)}</span>
        </div>
      )}
      {snapshot && <SnapshotNote snapshot={snapshot} />}
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}