import { cn } from "@/lib/utils";

const STYLES = {
  FAT: "border-red-500/40 bg-red-500/10 text-red-400",
  FLAT: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  MIXED: "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

const HINT = {
  FAT: "fat tail — hedging pays",
  FLAT: "flat — hedging won't help",
  MIXED: "mixed tail",
};

export default function VerdictBadge({ verdict, showHint = false, className }) {
  if (!verdict) return null;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded border px-2 py-0.5 font-mono text-xs font-semibold tracking-widest", STYLES[verdict], className)}>
      {verdict}
      {showHint && <span className="font-normal normal-case tracking-normal opacity-75">{HINT[verdict]}</span>}
    </span>
  );
}