import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { createRun, runLatencyBatch, finalizeRun } from "@/lib/lab-fns";
import { computeStats } from "@/lib/stats";

const BATCH = 20;

export function useLatencyRunner() {
  const router = useRouter();
  const create = useServerFn(createRun);
  const batch = useServerFn(runLatencyBatch);
  const finalize = useServerFn(finalizeRun);
  const [state, setState] = useState({ running: false, run: null, calls: [], error: null });

  const start = async (form) => {
    setState({ running: true, run: null, calls: [], error: null });
    try {
      const run = await create({ data: form });
      setState((s) => ({ ...s, run }));
      let all = [];
      for (let i = 0; i < form.n_calls; i += BATCH) {
        const res = await batch({ data: { run_id: run.id, start_idx: i, count: Math.min(BATCH, form.n_calls - i), concurrency: form.concurrency } });
        all = [...all, ...res];
        setState((s) => ({ ...s, calls: all }));
      }
      const st = computeStats(all);
      await finalize({
        data: {
          id: run.id, p50_ms: st.p50, p95_ms: st.p95, p99_ms: st.p99, error_rate: st.error_rate,
          timeout_count: st.timeout_count, fallback_suspect_count: st.fallback_suspect_count, total_cost_usd: st.cost, verdict: st.verdict,
        },
      });
      router.invalidate();
    } catch (e) {
      setState((s) => ({ ...s, error: e.message || "Run failed" }));
    } finally {
      setState((s) => ({ ...s, running: false }));
    }
  };

  return { ...state, start };
}