/* global URL */
// Lets plain Node load the app's server code: "@/x" -> src/x.js, "base44:runtime" -> secrets from env.
import { existsSync } from "node:fs";
const src = new URL("../src/", import.meta.url);
export function resolve(spec, ctx, next) {
  if (spec === "base44:runtime") return { url: "data:text/javascript,export const secrets={get:(n)=>process.env[n]}", shortCircuit: true };
  if (spec.startsWith("@/")) {
    const u = new URL(spec.slice(2), src);
    return next(existsSync(u) ? u.href : u.href + ".js", ctx);
  }
  return next(spec, ctx);
}
