import { gh, parseIssueUrl } from "@/lib/github.server";
import { getOrBuildSnapshot, summarize } from "@/lib/snapshot.server";
import { callDolphin } from "@/lib/dolphin.server";
import { callServ } from "@/lib/serv.server";
import { SYSTEM_PROMPT, validateTriage, hedge, hitAtK, mentionsOutside } from "@/lib/triage-core";

export async function ensureRepo(b, owner, name) {
  const found = await b.entities.Repo.filter({ owner, name }, { limit: 1 });
  if (found.items[0]) return found.items[0];
  const info = await gh(`/repos/${owner}/${name}`);
  return b.entities.Repo.create({ owner: info.owner.login, name: info.name, default_branch: info.default_branch });
}

export const headSha = async (repo) => (await gh(`/repos/${repo.owner}/${repo.name}/commits/${repo.default_branch}`)).sha;

async function resolve(b, { case_id, issue_url, commit_sha }) {
  if (case_id) {
    const c = await b.entities.Case.get(case_id);
    const repo = await b.entities.Repo.get(c.repo_id);
    return { c, repo, sha: c.base_sha, issue: { number: c.issue_number, title: c.issue_title, body: c.issue_body || "" } };
  }
  const u = parseIssueUrl(issue_url || "");
  if (!u) throw new Error("That isn't a GitHub issue URL (expected github.com/owner/repo/issues/N).");
  const repo = await ensureRepo(b, u.owner, u.name);
  const iss = await gh(`/repos/${repo.owner}/${repo.name}/issues/${u.number}`);
  if (iss.pull_request) throw new Error("That URL is a pull request, not an issue.");
  const sha = commit_sha || (await headSha(repo));
  return { c: null, repo, sha, issue: { number: iss.number, title: iss.title, body: (iss.body || "").slice(0, 20000) } };
}

export async function prepareTriage(b, input) {
  const { repo, sha } = await resolve(b, input);
  const snap = await getOrBuildSnapshot(b, repo, sha);
  return { sha, snapshot: summarize(snap) };
}

const SERV_SYSTEM = "You write short, maintainer-facing triage comments for GitHub issues, in Markdown. Base the comment only on the issue and the triage JSON. Mention only file paths listed in the JSON's files array; never name any other file.";

async function writeReply(issue, parsed, fileList) {
  const messages = [
    { role: "system", content: SERV_SYSTEM },
    { role: "user", content: `Issue #${issue.number}: ${issue.title}\n\n${issue.body}\n\nTriage JSON:\n${JSON.stringify(parsed)}` },
  ];
  const hint = `Only mention these files: ${parsed.files.join(", ")}`;
  let r = await callServ({ messages, shadowHint: hint });
  let cost = r.cost_usd;
  let outside = mentionsOutside(r.content, parsed.files, fileList);
  if (outside.length) {
    messages.push({ role: "assistant", content: r.content }, { role: "user", content: `You mentioned files not in the JSON (${outside.join(", ")}). Rewrite it mentioning only: ${parsed.files.join(", ")}.` });
    r = await callServ({ messages, shadowHint: hint });
    cost += r.cost_usd;
    outside = mentionsOutside(r.content, parsed.files, fileList);
  }
  return { reply: r.content, ok: !outside.length, cost };
}

export async function runTriage(b, input) {
  const { c, repo, sha, issue } = await resolve(b, input);
  const snap = await getOrBuildSnapshot(b, repo, sha);
  const packed = await (await fetch(snap.packed_text_url)).text();
  const fileList = JSON.parse(snap.file_list);
  const fileSet = new Set(fileList);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${packed}\n\n=== ISSUE #${issue.number} ===\nTitle: ${issue.title}\n\n${issue.body}` },
  ];
  const max_tokens = 1500;
  const timeoutMs = snap.est_tokens > 20000 || max_tokens > 500 ? 180000 : 60000;
  const run = await b.entities.TriageRun.create({
    case_id: c?.id || null, bench_run_id: input.bench_run_id, repo_id: repo.id, commit_sha: sha, mode: input.mode, status: "running",
    issue_url: input.issue_url || `https://github.com/${repo.owner}/${repo.name}/issues/${issue.number}`,
  });
  const h = await hedge(
    (i, signal) => callDolphin({ messages, max_tokens, timeoutMs, signal }),
    (r) => (r.status === "ok" ? validateTriage(r.content, fileSet) : { ok: false, reason: r.error || r.status }),
    input.mode,
  );
  const saved = await b.entities.Attempt.bulkCreate(h.attempts.map((a) => ({
    run_id: run.id, case_id: c?.id, copy_index: a.copy_index, started_at: a.res.started_at, finished_at: a.res.ended_at,
    latency_ms: a.res.latency_ms, ttft_ms: a.res.ttft_ms, in_tokens: a.res.in_tokens, out_tokens: a.res.out_tokens, tokens_per_sec: a.res.tokens_per_sec,
    cost_usd: a.res.cost_usd, raw_output: (a.res.content || a.res.error || "").slice(0, 20000),
    valid: !!a.valid, invalid_reason: a.invalid_reason || undefined, cancelled: !!a.cancelled, winner: !!a.winner,
  })));
  const patch = { started_at: new Date(h.t0).toISOString(), dolphin_cost_usd: h.attempts.reduce((s, a) => s + (a.res.cost_usd || 0), 0) };
  if (!h.winner) Object.assign(patch, { status: "failed", error: "No copy returned valid JSON with real paths." });
  else {
    const p = h.winner.parsed;
    const reply = await writeReply(issue, p, fileList);
    Object.assign(patch, {
      status: "done", time_to_valid_ms: h.time_to_valid_ms, winner_attempt_id: saved?.find?.((s) => s.winner)?.id,
      predicted_files: JSON.stringify(p.files), label: p.label, cause: p.cause, repro_check: p.repro_check,
      reply_markdown: reply.reply, reply_ok: reply.ok, serv_cost_usd: reply.cost,
    });
    if (c) {
      const gold = JSON.parse(c.gold_files || "[]");
      Object.assign(patch, { hit_at_1: hitAtK(p.files, gold, 1), hit_at_3: hitAtK(p.files, gold, 3), hit_at_5: hitAtK(p.files, gold, 5) });
    }
  }
  await b.entities.TriageRun.update(run.id, patch);
  return { run: { ...run, ...patch }, attempts: saved, repo: { owner: repo.owner, name: repo.name }, sha, snapshot: summarize(snap) };
}