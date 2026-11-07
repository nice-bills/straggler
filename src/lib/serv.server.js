import { secrets } from "base44:runtime";

const URL = "https://inference-api.openserv.ai/v1/chat/completions";
// Assumed gpt-5.4-mini list price, $/M tokens. Adjust if SERV bills differently.
export const SERV_PRICE = { in: 0.75, out: 4.5 };

// prompt guard on every call; shadow agent (with `shadowHint`) on final-reply calls.
export async function callServ({ messages, shadowHint, max_completion_tokens = 1000 }) {
  const tools = [{ type: "function", function: { name: "serv_prompt_guard" } }];
  if (shadowHint) {
    tools.push({
      type: "function",
      function: { name: "serv_shadow_agent", parameters: { type: "object", properties: { hint: { type: "string", default: shadowHint } } } },
    });
  }
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secrets.get("SERV_API_KEY")}` },
    body: JSON.stringify({ model: "gpt-5.4-mini", messages, max_completion_tokens, tools }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`SERV ${res.status}: ${JSON.stringify(body?.error || body).slice(0, 300)}`);
  const u = body.usage || {};
  return {
    content: body.choices?.[0]?.message?.content || "",
    cost_usd: ((u.prompt_tokens || 0) * SERV_PRICE.in + (u.completion_tokens || 0) * SERV_PRICE.out) / 1e6,
  };
}