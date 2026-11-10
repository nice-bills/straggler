import { secrets } from "base44:runtime";
import { REQUESTED_MODEL } from "@/lib/stats";

const URL = "https://lighthouse.dphn.ai/run/text-v/v1/chat/completions";

// One timed Dolphin call. Never throws: failures come back as status "error" | "timeout".
// `signal` (optional) lets a caller cancel the call, e.g. the losing copy of a hedge.
export async function callDolphin({ messages, max_tokens, timeoutMs = 60000, signal }) {
  const started = Date.now();
  const ctrl = new AbortController();
  signal?.addEventListener("abort", () => ctrl.abort());
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const rec = { started_at: new Date(started).toISOString(), in_tokens: 0, out_tokens: 0, cost_usd: 0, fallback_suspect: false };
  try {
    const res = await fetch(URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${secrets.get("DOLPHIN_API_KEY")}` },
      // Streamed: Dolphin sends keepalives, so long calls don't die at Cloudflare's ~125 s idle limit (HTTP 524).
      body: JSON.stringify({ model: REQUESTED_MODEL, messages, max_tokens, stream: true, stream_options: { include_usage: true } }),
    });
    let text = "";
    let body = null;
    if (res.ok && res.headers.get("content-type")?.includes("text/event-stream")) {
      body = { choices: [{ message: { content: "" } }] };
      let buf = "";
      for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
        buf += chunk;
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
          let ev;
          try { ev = JSON.parse(line.slice(5)); } catch { continue; }
          if (ev.error) throw new Error(ev.error.message || JSON.stringify(ev.error));
          const d = ev.choices?.[0]?.delta;
          if (rec.ttft_ms == null && (d?.content || d?.reasoning)) rec.ttft_ms = Date.now() - started;
          if (d?.content) body.choices[0].message.content += d.content;
          if (ev.model) body.model = ev.model;
          if (ev.usage) body.usage = ev.usage;
        }
      }
    } else {
      text = await res.text();
      try { body = JSON.parse(text); } catch {}
    }
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
    rec.status = e?.name === "AbortError" ? (signal?.aborted ? "cancelled" : "timeout") : "error";
    rec.error = rec.status === "timeout" ? `timeout after ${timeoutMs}ms` : rec.status === "cancelled" ? "cancelled" : String(e?.message || e).slice(0, 1000);
  } finally {
    clearTimeout(timer);
  }
  const ended = Date.now();
  rec.ended_at = new Date(ended).toISOString();
  rec.latency_ms = ended - started;
  if (rec.status === "ok" && rec.out_tokens > 0) rec.tokens_per_sec = rec.out_tokens / (rec.latency_ms / 1000);
  return rec;
}