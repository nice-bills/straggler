import { getSources, getUpgrades } from "@/lib/chain.server";
import { callDolphin } from "@/lib/dolphin.server";
import { callServ } from "@/lib/serv.server";
import { checkCoverage } from "@/lib/coverage.server";
import { diffSources, buildUpgradeMessages, validateReview, verdictOf } from "@/lib/upgrade-core";
import { hedge } from "@/lib/triage-core";
import protocols from "../../data/protocols.json";

const asReview = (p) => ({ summary: p.summary, changes: p.changes.map(({ file, function: fn, touches_funds, risk, quote, struck }) => ({ file, function: fn, touches_funds, risk, quote, struck })) });

export async function reviewUpgrade({ chainId, proxy, prevImpl, nextImpl, mode = "hedged" }) {
  const started = Date.now();
  const upgrades = await getUpgrades(Number(chainId), proxy);
  const next = upgrades.find((u) => u.impl.toLowerCase() === nextImpl.toLowerCase());
  const [oldSrc, newSrc] = await Promise.all([getSources(Number(chainId), prevImpl), getSources(Number(chainId), nextImpl)]);
  const diff = diffSources(oldSrc.files, newSrc.files);
  const messages = buildUpgradeMessages(diff, oldSrc.files, newSrc.files);
  const run = await hedge((i, signal) => callDolphin({ messages, max_tokens: 8000, timeoutMs: 180000, signal, extra: { reasoning_effort: "low" } }), (r) => r.status !== "ok" ? { ok: false, reason: r.error || r.status } : validateReview(r.content, diff, newSrc.files), mode);
  if (!run.winner) throw new Error("No Dolphin copy returned a valid source-backed review");
  const review = asReview(run.winner.parsed);
  const allowed = [...new Set(diff.changed.flatMap((c) => [...c.functions.changed, ...c.functions.added]).concat(diff.added))];
  const hint = `Allowed functions: ${allowed.join(", ") || "none"}. Every claim must quote an exact line from the changed source. Do not name other functions.`;
  const system = "Write a concise Markdown alert for depositors about this verified proxy implementation change. Use only the supplied validated review and verdict.";
  const msgs = [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ proxy, prevImpl, nextImpl, review, verdict: verdictOf(diff, review.changes) }) }];
  const badFunction = (s) => allowed.filter((f) => f && new RegExp(`\\b${f.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(s));
  let serv = await callServ({ messages: msgs, shadowHint: hint });
  let invalid = badFunction(serv.content);
  let servCost = serv.cost_usd;
  if (invalid.length) {
    msgs.push({ role: "assistant", content: serv.content }, { role: "user", content: `Rewrite without naming functions outside the allowed list: ${allowed.join(", ")}` });
    serv = await callServ({ messages: msgs, shadowHint: hint });
    servCost += serv.cost_usd;
    invalid = badFunction(serv.content);
  }
  const protocol = protocols.find((p) => p.proxies.some((x) => x.address.toLowerCase() === proxy.toLowerCase()));
  const coverage = protocol ? await checkCoverage(protocol, newSrc.files) : { covered: false, best: null, audits: [] };
  const attempts = run.attempts.map((a) => ({ copy_index: a.copy_index, end_offset_ms: a.end_offset_ms, valid: !!a.valid, invalid_reason: a.invalid_reason || null, in_tokens: a.res.in_tokens || 0, out_tokens: a.res.out_tokens || 0, cost_usd: a.res.cost_usd || 0 }));
  const cost_usd = attempts.reduce((n, a) => n + a.cost_usd, 0) + servCost;
  return { chainId: Number(chainId), proxy, prevImpl, nextImpl, block: next?.block ?? null, tx: next?.tx ?? null, time: next?.time ?? null, diff, coverage, review, verdict: verdictOf(diff, review.changes), alert_md: invalid.length ? "Alert rejected: SERV named a function outside the diff." : serv.content, attempts, cost_usd, ms: Date.now() - started };
}
