export default function RunProgress({ done, total, running, error }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex justify-between font-mono text-xs">
        <span className="text-muted-foreground">{running ? "running" : error ? "stopped" : "done"}</span>
        <span>{done} / {total}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      {error && <p className="mt-2 font-mono text-xs text-destructive">{error}</p>}
    </div>
  );
}