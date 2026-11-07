import { useState } from "react";
import { Input } from "@/components/ui/input";
import { fmtUsd } from "@/lib/stats";

export default function PriceBox({ single, hedged }) {
  const [pin, setPin] = useState("0.30");
  const [pout, setPout] = useState("1.20");
  const price = (r) => ((r.dolphin_in_tokens || 0) * Number(pin) + (r.dolphin_out_tokens || 0) * Number(pout)) / 1e6;
  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Same tokens at another price</div>
      <div className="flex gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">$/M in<Input value={pin} onChange={(e) => setPin(e.target.value)} className="h-8 w-24 font-mono" /></label>
        <label className="space-y-1 text-xs text-muted-foreground">$/M out<Input value={pout} onChange={(e) => setPout(e.target.value)} className="h-8 w-24 font-mono" /></label>
      </div>
      <div className="space-y-1 font-mono text-xs">
        {[["single", single], ["hedged", hedged]].map(([k, r]) => (
          <p key={k}>
            <span className="text-muted-foreground">{k}: </span>
            {r ? `${fmtUsd(price(r))} total · ${fmtUsd(r.n_cases ? price(r) / r.n_cases : 0)} / case (${r.dolphin_in_tokens} in, ${r.dolphin_out_tokens} out)` : "—"}
          </p>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Uses every Dolphin copy's tokens, so the hedge's extra copies count. SERV cost is left out.</p>
    </div>
  );
}