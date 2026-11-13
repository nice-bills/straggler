import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { recentReviews, submitUpgradeReview } from "@/lib/upgrade-fns";
import ReviewCard from "@/components/upgrade/ReviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/")({ loader: () => recentReviews(), head: () => ({ meta: [{ title: "Proxy Upgrade Review · Straggler" }] }), component: Home });
function Home() {
  const rows = Route.useLoaderData() || [];
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [chainId, setChain] = useState("8453"); const [proxy, setProxy] = useState(""); const [review, setReview] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function run(e) { e.preventDefault(); setBusy(true); setError(""); try { setReview(await submitUpgradeReview({ data: { chainId, proxy } })); } catch (err) { setError(err.message || "Review failed"); } finally { setBusy(false); } }
  return <main className="shell"><header><Link to="/" className="brand">STRAGGLER <span>· PROXY WATCH</span></Link><nav><Link to="/backtest">Backtest results ↗</Link></nav></header><section className="hero"><div className="eyebrow">ONCHAIN CHANGE REVIEW / SERV</div><h1>Every proxy upgrade, read and checked before you sign or deposit.</h1><p>Trace implementation changes. Surface funds logic. Get a clear pause or proceed signal.</p>
    <form className="review-form" onSubmit={run}><label>NETWORK<select value={chainId} onChange={(e) => setChain(e.target.value)}><option value="1">Ethereum</option><option value="8453">Base</option><option value="42161">Arbitrum</option><option value="10">Optimism</option></select></label><label className="address">PROXY CONTRACT ADDRESS<Input value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="0x…" required /></label>{isAuthenticated ? <Button disabled={busy}>{busy ? "Reviewing…" : "Review latest upgrade →"}</Button> : <Button type="button" onClick={() => navigateToLogin()}>Sign in to review →</Button>}</form>{error && <p role="alert">{error}</p>}</section>
    <section className="results">{review && <ReviewCard result={review.result || review} />}{!review && <div className="empty">AWAITING CONTRACT ADDRESS <span>Upgrade analysis will appear here.</span></div>}</section>
    <section className="feed"><h2>Recent reviews <span>LIVE FEED</span></h2>{rows.length ? rows.map((row) => <Link key={row.id} to="/r/$id" params={{ id: row.id }} className="feedrow"><b>{row.proxy}</b><span>{row.verdict}</span><small>{row.chain_id} · block {row.block || "—"}</small></Link>) : <p>No reviews recorded yet.</p>}</section><div className="demo-note">PUBLIC CONTRACT DATA · READ BEFORE YOU SIGN</div></main>;
}
