import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const DEFAULT_FORM = { label: "", n_calls: 200, concurrency: 10, max_tokens: 64, prompt: "Reply with exactly the word OK." };

const LONG_PRESET = { label: "Long", n_calls: 200, max_tokens: 1500, concurrency: 10, prompt: "Count from 1 to 400, one number per line. No other text." };

export default function RunForm({ onRun, running }) {
  const [f, setF] = useState(DEFAULT_FORM);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    onRun({ ...f, label: f.label.trim() || "untitled run", n_calls: Number(f.n_calls), max_tokens: Number(f.max_tokens), concurrency: Number(f.concurrency) });
  };
  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border border-border bg-card p-5">
      <Button type="button" variant="outline" size="sm" disabled={running} onClick={() => setF(LONG_PRESET)}>Long output test</Button>
      <Field label="Label"><Input value={f.label} onChange={set("label")} placeholder="e.g. sat-evening c10" disabled={running} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Calls"><Input type="number" min={1} max={2000} value={f.n_calls} onChange={set("n_calls")} className="font-mono" disabled={running} /></Field>
        <Field label="Max tokens"><Input type="number" min={1} max={4096} value={f.max_tokens} onChange={set("max_tokens")} className="font-mono" disabled={running} /></Field>
        <Field label="Concurrency">
          <div className="grid h-9 grid-cols-2 rounded-md border border-input p-0.5">
            {[1, 10].map((c) => (
              <button type="button" key={c} disabled={running} onClick={() => setF({ ...f, concurrency: c })}
                className={`rounded font-mono text-sm transition-colors ${Number(f.concurrency) === c ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Prompt"><Textarea rows={3} value={f.prompt} onChange={set("prompt")} className="font-mono text-sm" disabled={running} /></Field>
      <Button type="submit" disabled={running || !f.prompt.trim()} className="w-full">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? "Running…" : "Run"}
      </Button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}