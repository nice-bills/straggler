import { getSources, getUpgrades } from "@/lib/chain.server";
import { callDolphin } from "@/lib/dolphin.server";
import { callServ } from "@/lib/serv.server";
import { checkCoverage } from "@/lib/coverage.server";
import { diffSources, buildUpgradeMessages, validateReview, verdictOf, functionsOf } from "@/lib/upgrade-core";
import { hedge } from "@/lib/triage-core";
import protocols from "../../data/protocols.json" with { type: "json" };

const asReview = (p) => ({ summary: p.summary, changes: p.changes.map(({ file, function: fn, touches_funds, risk, quote, struck }) => ({ file, function: fn, touches_funds, risk, quote, struck })) });

export async function reviewUpgrade({ chainId, proxy, prevImpl, nextImpl, mode = "hedged" }) {
  const started = Date.now();
  const upgrades = await getUpgrades(Number(chainId), proxy);
  const next = upgrades.find((u) => u.impl.toLowerCase() === nextImpl.toLowerCase());
  const unverified = { name: "", files: null };
  const [oldSrc, newSrc] = await Promise.all([prevImpl, nextImpl].map((a) => getSources(Number(chainId), a).catch(() => unverified)));
  const at = { chainId: Number(chainId), proxy, prevImpl, nextImpl, block: next?.block ?? null, tx: next?.tx ?? null, time: next?.time ?? null };
  if (!newSrc.files) {
    // Unreadable code is decided in code, no model call: attacker implementations are rarely verified.
    const verdict = "unverified implementation, critical";
    const serv = await callServ({ messages: [
      { role: "system", content: "Write a 3-sentence Markdown alert for depositors. Use only the facts given." },
      { role: "user", content: JSON.stringify({ ...at, verdict, fact: "The proxy now points to an implementation with no verified source on Sourcify, Routescan or Blockscout, so nobody can read what it does." }) },
    ], shadowHint: "State only that the new code is unverified and unreadable; do not guess what it does." });
    return { ...at, diff: { changed: [], added: [], removed: [], unchanged: 0 }, coverage: { covered: false, best: null, audits: [] }, review: { summary: "The new implementation has no verified source.", changes: [] }, verdict, alert_md: serv.content, attempts: [], cost_usd: serv.cost_usd, ms: Date.now() - started };
  }
  if (!oldSrc.files) oldSrc.files = {}; // old code unreadable: everything in the new code counts as added
  const diff = diffSources(oldSrc.files, newSrc.files);
  const messages = buildUpgradeMessages(diff, oldSrc.files, newSrc.files);
  const run = await hedge((i, signal) => callDolphin({ messages, max_tokens: 8000, timeoutMs: 180000, signal, extra: { reasoning_effort: "low" } }), (r) => r.status !== "ok" ? { ok: false, reason: r.error || r.status } : validateReview(r.content, diff, newSrc.files), mode);
  if (!run.winner) throw new Error("No Dolphin copy returned a valid source-backed review");
  const review = asReview(run.winner.parsed);
  const allowed = [...new Set(diff.changed.flatMap((c) => [...c.functions.changed, ...c.functions.added]).concat(diff.added))];
  const hint = `Allowed functions: ${allowed.join(", ") || "none"}. Every claim must quote an exact line from the changed source. Do not name other functions.`;
  const system = "Write a concise Markdown alert for depositors about this verified proxy implementation change. Use only the supplied validated review and verdict.";
  const msgs = [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ proxy, prevImpl, nextImpl, review, verdict: verdictOf(diff, review.changes) }) }];
  // functions that exist in the new code but are not part of this change: the alert must not name them
  const others = [...new Set(Object.values(newSrc.files).flatMap((src) => Object.keys(functionsOf(src))))].filter((f) => /^\w+$/.test(f) && f.length > 3 && !allowed.includes(f));
  const badFunction = (s) => others.filter((f) => new RegExp(`\\b${f}\\b`).test(s));
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
  return { ...at, diff, coverage, review, verdict: verdictOf(diff, review.changes), alert_md: invalid.length ? "Alert rejected: SERV named a function outside the diff." : serv.content, attempts, cost_usd, ms: Date.now() - started };
}
