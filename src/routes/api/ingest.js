import { secrets } from "base44:runtime";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { reviewUpgrade } from "@/lib/review.server";

const schema = z.object({
  chainId: z.union([z.literal(1), z.literal(8453), z.literal(42161), z.literal(10)]),
  proxy: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  prevImpl: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nextImpl: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tx: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const expected = secrets.get("INGEST_SECRET") || "";
        const supplied = request.headers.get("x-ingest-secret") || "";
        const a = Buffer.from(supplied);
        const b = Buffer.from(expected);
        if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        let input;
        try {
          input = schema.parse(await request.json());
        } catch (error) {
          return Response.json({ error: "Invalid payload", detail: error.message }, { status: 400 });
        }
        const result = await reviewUpgrade({ ...input, mode: "single" });
        const row = await context.getBase44().asServiceRole.entities.UpgradeReview.create({
          result: JSON.stringify(result), chain_id: result.chainId, proxy: result.proxy,
          verdict: result.verdict, block: result.block, tx: input.tx, time: result.time,
        });
        return Response.json({ id: row.id, verdict: result.verdict }, { status: 201 });
      },
    },
  },
});
