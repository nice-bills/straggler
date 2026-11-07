import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAll } from "@/lib/triage-fns";
import { downloadBlob, toCsv } from "@/lib/download";

export default function ExportButtons() {
  const load = useServerFn(exportAll);
  const [busy, setBusy] = useState(null);
  const go = async (kind) => {
    setBusy(kind);
    try {
      const d = await load();
      if (kind === "json") downloadBlob(JSON.stringify(d, null, 2), "straggler-export.json", "application/json");
      else {
        downloadBlob(toCsv(d.attempts), "attempts.csv", "text/csv");
        downloadBlob(toCsv(d.triage_runs), "triage_runs.csv", "text/csv");
      }
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex gap-2">
      {["csv", "json"].map((k) => (
        <Button key={k} size="sm" variant="outline" onClick={() => go(k)} disabled={!!busy}>
          {busy === k ? <Loader2 className="animate-spin" /> : <Download />} Export {k.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}