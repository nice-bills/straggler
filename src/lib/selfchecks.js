import { hedge, hitAtK, validateTriage } from "@/lib/triage-core";

const VALID = '{"files":["a.js"],"cause":"c","repro_check":"r","label":"bug"}';
const sleep = (ms, signal) => new Promise((resolve) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener("abort", () => { clearTimeout(t); resolve(); });
});

export const LOCAL_CHECKS = [
  {
    name: "Path validation rejects a file not in file_list",
    run: async () => {
      const v = validateTriage('{"files":["src/missing.js"],"cause":"x","repro_check":"y","label":"bug"}', new Set(["src/a.js"]));
      return { pass: !v.ok, detail: v.ok ? "accepted" : `rejected: ${v.reason}` };
    },
  },
  {
    name: "Mock hedge: 100ms invalid vs 500ms valid → copy 2 wins, no third copy",
    run: async () => {
      const started = [];
      const h = await hedge(async (i, signal) => {
        started.push(i);
        await sleep(i === 1 ? 100 : 500, signal);
        return { content: i === 1 ? "{not json" : VALID };
      }, (r) => validateTriage(r.content, new Set(["a.js"])), "hedged");
      const c1 = h.attempts.find((a) => a.copy_index === 1);
      const pass = h.winner?.copy_index === 2 && c1 && !c1.valid && !started.includes(3);
      return { pass, detail: `winner copy ${h.winner?.copy_index ?? "none"} · copy 1 ${c1?.valid ? "valid" : `invalid (${c1?.invalid_reason})`} · copies started ${started.join(",")}` };
    },
  },
  {
    name: "hit@k: predicted [a,b,c] vs gold [c]",
    run: async () => {
      const h1 = hitAtK(["a", "b", "c"], ["c"], 1);
      const h3 = hitAtK(["a", "b", "c"], ["c"], 3);
      return { pass: !h1 && h3, detail: `hit@1 ${h1} · hit@3 ${h3}` };
    },
  },
];