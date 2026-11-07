import { secrets } from "base44:runtime";
import { REQUESTED_MODEL } from "@/lib/stats";

const URL = "https://lighthouse.dphn.ai/run/text-v/v1/chat/completions";

// One timed Dolphin call. Never throws: failures come back as status "error" | "timeout".
export async function callDolphin({ messages, max_tokens, timeoutMs = 60000 }) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const rec = { started_at: new Date(started).toISOString(), in_tokens: 0, out_tokens: 0, cost_usd: 0, fallback_suspect: false };
  try {
    const res = await fetch(URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${secrets.get("DOLPHIN_API_KEY")}` },
      body: JSON.stringify({ model: REQUESTED_MODEL, messages, max_tokens }),
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    rec.http_code = res.status;
    rec.headers_json = JSON.stringify(Object.fromEntries(res.headers.entries()));
    rec.model_returned = body?.model || "";
    rec.in_tokens = body?.usage?.prompt_tokens || 0;
    rec.out_tokens = body?.usage?.completion_tokens || 0;
    rec.cost_usd = (rec.in_tokens * 0.01) / 1e6 + (rec.out_tokens * 0.07) / 1e6;
    rec.content = body?.choices?.[0]?.message?.content ?? "";
    rec.status = res.ok && body?.choices ? "ok" : "error";
    if (rec.status === "error") rec.error = (body?.error?.message || text || `HTTP ${res.status}`).slice(0, 1000);
    rec.fallback_suspect =
      (!!rec.model_returned && rec.model_returned !== REQUESTED_MODEL) || rec.headers_json.toLowerCase().includes("openrouter");
  } catch (e) {
    rec.status = e?.name === "AbortError" ? "timeout" : "error";
    rec.error = rec.status === "timeout" ? `timeout after ${timeoutMs}ms` : String(e?.message || e).slice(0, 1000);
  } finally {
    clearTimeout(timer);
  }
  const ended = Date.now();
  rec.ended_at = new Date(ended).toISOString();
  rec.latency_ms = ended - started;
  if (rec.status === "ok" && rec.out_tokens > 0) rec.tokens_per_sec = rec.out_tokens / (rec.latency_ms / 1000);
  return rec;
}