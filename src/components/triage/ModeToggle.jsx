export default function ModeToggle({ value, onChange, disabled }) {
  return (
    <div className="grid h-9 grid-cols-2 rounded-md border border-input p-0.5">
      {["single", "hedged"].map((m) => (
        <button type="button" key={m} disabled={disabled} onClick={() => onChange(m)}
          className={`rounded px-3 font-mono text-xs transition-colors ${value === m ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
          {m}
        </button>
      ))}
    </div>
  );
}