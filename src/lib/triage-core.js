// Pure triage logic shared by the server and the Self-check page.

export const SYSTEM_PROMPT =
  'You are triaging a GitHub issue. Use only the repository below. Reply with strict JSON: {"files": [up to 5 repo paths of the source files a fix would change, most likely first; no tests, docs or changelogs], "cause": "...", "repro_check": "...", "label": "bug|feature|docs|question"}';

export function parseJson(text) {
  const s = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(s);
}

export function validateTriage(text, fileSet) {
  let j;
  try { j = parseJson(text); } catch { return { ok: false, reason: "invalid JSON" }; }
  if (!Array.isArray(j?.files) || !j.files.length) return { ok: false, reason: "files missing or empty" };
  const bad = j.files.find((f) => !fileSet.has(f));
  if (bad !== undefined) return { ok: false, reason: `path not in snapshot: ${bad}` };
  return { ok: true, parsed: { ...j, files: j.files.slice(0, 5) } };
}

export const hitAtK = (predicted, gold, k) => predicted.slice(0, k).some((f) => gold.includes(f));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Paths from the snapshot that the reply names but the triage JSON does not.
export function mentionsOutside(reply, predicted, fileList) {
  let text = reply;
  for (const p of [...predicted].sort((a, b) => b.length - a.length)) text = text.split(p).join(" ");
  return fileList.filter((p) => !predicted.includes(p) && new RegExp(`(?<![\\w./-])${esc(p)}(?![\\w/-])`).test(text));
}

// startCopy(i, signal) must resolve (never reject). First copy whose result passes `validate` wins;
// the others are aborted and marked cancelled. If no copy passes, one more copy runs.
export async function hedge(startCopy, validate, mode) {
  const t0 = Date.now();
  const attempts = [];
  let winner = null;
  const batch = (idxs) => new Promise((resolve) => {
    let pending = idxs.length;
    const ctrls = Object.fromEntries(idxs.map((i) => [i, new AbortController()]));
    for (const i of idxs) {
      const start = Date.now();
      Promise.resolve(startCopy(i, ctrls[i].signal)).then((res) => {
        const a = { copy_index: i, start_offset_ms: start - t0, end_offset_ms: Date.now() - t0, res };
        if (winner) Object.assign(a, { cancelled: true, valid: false, invalid_reason: "cancelled" });
        else {
          const v = validate(res);
          Object.assign(a, { valid: v.ok, invalid_reason: v.ok ? null : v.reason });
          if (v.ok) {
            Object.assign(a, { winner: true, parsed: v.parsed });
            winner = a;
            idxs.forEach((j) => j !== i && ctrls[j].abort());
          }
        }
        attempts.push(a);
        if (--pending === 0) resolve();
      });
    }
  });
  await batch(mode === "hedged" ? [1, 2] : [1]);
  if (!winner) await batch([mode === "hedged" ? 3 : 2]);
  return { t0, attempts, winner, time_to_valid_ms: winner ? winner.end_offset_ms : null };
}