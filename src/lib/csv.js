const COLS = ["idx", "started_at", "ended_at", "latency_ms", "status", "http_code", "model_returned", "in_tokens", "out_tokens", "cost_usd", "fallback_suspect", "error", "headers_json"];

const esc = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCallsCsv(calls, name) {
  const rows = [COLS.join(","), ...calls.map((c) => COLS.map((k) => esc(c[k])).join(","))];
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}