import { fmtMs, fmtTps } from "@/lib/stats";

const STATUS = { ok: "text-emerald-400", error: "text-red-400", timeout: "text-yellow-400" };

export default function CallsTable({ calls }) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border border-border">
      <table className="w-full font-mono text-xs">
        <thead className="sticky top-0 bg-card text-left text-muted-foreground">
          <tr>{["#", "status", "latency", "out tok", "tok/s", "model"].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id || c.idx} className="border-t border-border">
              <td className="px-3 py-1.5">{c.idx}</td>
              <td className={`px-3 py-1.5 ${STATUS[c.status] || ""}`}>{c.status}{c.http_code ? ` ${c.http_code}` : ""}</td>
              <td className="px-3 py-1.5">{fmtMs(c.latency_ms)}</td>
              <td className="px-3 py-1.5">{c.out_tokens ?? "—"}</td>
              <td className="px-3 py-1.5">{fmtTps(c.tokens_per_sec)}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{c.model_returned || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}