import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { prepareTriageFn, triageFn } from "@/lib/triage-fns";

// Two server calls: build/reuse the snapshot, then the hedged Dolphin + SERV triage.
export function useTriageRunner() {
  const prepare = useServerFn(prepareTriageFn);
  const triage = useServerFn(triageFn);
  const [phase, setPhase] = useState("idle");
  const [snapshot, setSnapshot] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== "snapshot" && phase !== "dolphin") return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => clearInterval(t);
  }, [phase, startedAt]);

  const run = async (target, mode) => {
    setResult(null); setError(null); setSnapshot(null);
    setStartedAt(Date.now()); setElapsed(0); setPhase("snapshot");
    try {
      const prep = await prepare({ data: target });
      setSnapshot(prep.snapshot);
      setStartedAt(Date.now()); setPhase("dolphin");
      setResult(await triage({ data: { ...target, commit_sha: prep.sha, mode } }));
      setPhase("done");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  };

  return { run, phase, snapshot, result, error, elapsed, busy: phase === "snapshot" || phase === "dolphin" };
}