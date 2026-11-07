import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ModeToggle from "@/components/triage/ModeToggle";

export default function TriageForm({ caseData, busy, onRun }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("hedged");
  const submit = (e) => {
    e.preventDefault();
    onRun(caseData ? { case_id: caseData.id } : { issue_url: url.trim() }, mode);
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-border bg-card p-5">
      {caseData ? (
        <div className="text-sm">
          <span className="font-mono text-xs text-muted-foreground">case #{caseData.issue_number} · {caseData.split}</span>
          <p className="mt-1">{caseData.issue_title}</p>
        </div>
      ) : (
        <Input value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} className="font-mono text-sm"
          placeholder="https://github.com/owner/repo/issues/123" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <ModeToggle value={mode} onChange={setMode} disabled={busy} />
        <Button type="submit" disabled={busy || (!caseData && !url.trim())}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {caseData ? "Triage this case" : "Triage"}
        </Button>
      </div>
    </form>
  );
}