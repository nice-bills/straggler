import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { callDolphin } from "@/lib/dolphin.server";


export const listRuns = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async ({ context }) => {
  const page = await context.getBase44().entities.LatencyRun.list({ sort: "-created_date", limit: 100 });
  return page.items;
});

export const getRun = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data, context }) => {
    const b = context.getBase44();
    const run = await b.entities.LatencyRun.get(data.id);
    const calls = [];
    let cursor;
    do {
      const page = await b.entities.LatencyCall.filter({ run_id: data.id }, { sort: "idx", limit: 500, cursor });
      calls.push(...page.items);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return { run, calls };
  });

export const createRun = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      label: z.string().max(200),
      n_calls: z.number().int().min(1).max(2000),
      concurrency: z.union([z.literal(1), z.literal(10)]),
      max_tokens: z.number().int().min(1).max(4096),
      prompt: z.string().min(1).max(4000),
    }),
  )
  .handler(({ data, context }) =>
    context.getBase44().entities.LatencyRun.create({ ...data, started_at: new Date().toISOString() }),
  );

export const runLatencyBatch = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      run_id: z.string().max(100),
      start_idx: z.number().int().min(0),
      count: z.number().int().min(1).max(20),
      concurrency: z.number().int().min(1).max(10),
    }),
  )
  .handler(async ({ data, context }) => {
    const b = context.getBase44();
    const run = await b.entities.LatencyRun.get(data.run_id);
    const messages = [{ role: "user", content: run.prompt }];
    const results = new Array(data.count);
    let next = 0;
    const worker = async () => {
      while (next < data.count) {
        const i = next++;
        const { content, ...rec } = await callDolphin({ messages, max_tokens: run.max_tokens, timeoutMs: run.max_tokens > 500 ? 120000 : 60000 });
        results[i] = { run_id: run.id, idx: data.start_idx + i, ...rec };
      }
    };
    await Promise.all(Array.from({ length: Math.min(data.concurrency, data.count) }, worker));
    await b.entities.LatencyCall.bulkCreate(results);
    return results;
  });

export const finalizeRun = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      id: z.string().max(100),
      p50_ms: z.number().nullable(),
      p95_ms: z.number().nullable(),
      p99_ms: z.number().nullable(),
      median_tps: z.number().nullable(),
      p10_tps: z.number().nullable(),
      p90_tps: z.number().nullable(),
      error_rate: z.number(),
      timeout_count: z.number().int(),
      fallback_suspect_count: z.number().int(),
      total_cost_usd: z.number(),
      verdict: z.enum(["FAT", "FLAT", "MIXED"]),
    }),
  )
  .handler(({ data: { id, ...rest }, context }) =>
    context.getBase44().entities.LatencyRun.update(id, { ...rest, finished_at: new Date().toISOString() }),
  );

const SIZES = { "50k": 50000, "200k": 200000, "500k": 500000 };
const WORDS = ["apple", "river", "stone", "cloud", "maple", "tiger", "lemon", "orbit"];

export const contextCapTest = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ size: z.enum(["50k", "200k", "500k"]) }))
  .handler(async ({ data }) => {
    const n = SIZES[data.size];
    const words = Array.from({ length: n }, (_, i) => WORDS[i % WORDS.length]);
    words.push("pineapple");
    const prompt = `${words.join(" ")}\n\nWhat is the last word above?`;
    const { headers_json, ...rec } = await callDolphin({ messages: [{ role: "user", content: prompt }], max_tokens: 16, timeoutMs: 180000 });
    return { size: data.size, approx_tokens: n, chars: prompt.length, expected: "pineapple", ...rec };
  });

export const visionTest = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ file_uri: z.string().max(500) }))
  .handler(async ({ data, context }) => {
    const { signed_url } = await context
      .getBase44()
      .integrations.Core.CreateFileSignedUrl({ file_uri: data.file_uri, expires_in: 600 });
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in one sentence." },
          { type: "image_url", image_url: { url: signed_url } },
        ],
      },
    ];
    const { headers_json, ...rec } = await callDolphin({ messages, max_tokens: 120 });
    return rec;
  });