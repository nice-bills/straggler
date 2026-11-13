import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { reviewUpgrade } from "@/lib/review.server";
import { getUpgrades } from "@/lib/chain.server";
import { requireUser } from "@/lib/auth-middleware";

const chain = z.enum(["1", "8453", "42161", "10"]).transform(Number);
const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const all = async (entity) => entity.filter({}, { sort: "-created_date", limit: 40 });
export const recentReviews = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const rows = await all(context.getBase44().entities.UpgradeReview);
  return rows.items || rows;
});
export const submitUpgradeReview = createServerFn({ method: "POST" }).middleware([requireUser]).inputValidator(z.object({ chainId: chain, proxy: address })).handler(async ({ data, context }) => {
  const upgrades = await getUpgrades(data.chainId, data.proxy);
  if (upgrades.length < 2) throw new Error(`Expected at least two upgrades for ${data.proxy}; found ${upgrades.length}`);
  const result = await reviewUpgrade({ ...data, prevImpl: upgrades.at(-2).impl, nextImpl: upgrades.at(-1).impl, mode: "single" });
  // rls blocks direct creates; signed-in callers write through the service role.
  const row = await context.getBase44().asServiceRole.entities.UpgradeReview.create({ result: JSON.stringify(result), chain_id: result.chainId, proxy: result.proxy, verdict: result.verdict, block: result.block, tx: result.tx, time: result.time });
  return { ...row, result };
});
