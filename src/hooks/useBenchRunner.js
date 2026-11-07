import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createBench, finalizeBench, prepareTriageFn, triageFn } from "@/lib/triage-fns";

// One server call per step so no single call runs long: snapshot, then triage, per case.
export function useBenchRunner() {
  const create = useServerFn(createBench);
  const prepare = useServerFn(prepareTriageFn);
  const triage = useServerFn(triageFn);
  const finalize = useServerFn(finalizeBench);
  const router = useRouter();
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const run = async (split, mode) => {
    setError(null);
    try {
      const { bench, case_ids } = await create({ data: { label: `${split} · ${mode}`, split, mode } });
      for (let i = 0; i < case_ids.length; i++) {
        setProgress({ split, mode, done: i, total: case_ids.length });
        const target = { case_id: case_ids[i] };
        await prepare({ data: target })
          .then(() => triage({ data: { ...target, mode, bench_run_id: bench.id } }))
          .catch((e) => setError(`case ${i + 1}: ${e.message}`));
      }
      await finalize({ data: { id: bench.id } });
      await router.invalidate();
    } catch (e) {
      setError(e.message);
    } finally {
      setProgress(null);
    }
  };
  return { run, progress, error };
}