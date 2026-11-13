import ReactMarkdown from "react-markdown";

export default function ReviewCard({ result }) {
  if (!result) return null;
  const tone = /high|critical|funds/i.test(result.verdict) ? "risk" : /medium|warning/i.test(result.verdict) ? "warn" : "safe";
  return <article className="review-card">
    <div className={`verdict ${tone}`}><span>VERDICT</span><strong>{result.verdict}</strong></div>
    <p>{result.review?.summary}</p>
    <h3>Changed functions</h3>
    {result.diff?.changed?.map((file) => <section key={file.path}><b>{file.path}</b>{file.functions?.changed?.map((fn) => <div className="function" key={fn}><strong>{fn}</strong>{result.review?.changes?.filter((c) => c.function === fn).map((claim, i) => <div className="claim" key={i}><span>{claim.risk} risk · {claim.touches_funds ? "touches funds" : "no funds impact"}</span><code>{claim.quote}</code>{claim.struck && <del>struck: {claim.struck}</del>}</div>)}</div>)}</section>)}
    <div className="alert"><ReactMarkdown>{result.alert_md || ""}</ReactMarkdown></div>
    <footer>${Number(result.cost_usd || 0).toFixed(4)} · {result.ms} ms · <a href={`https://${{ 1: "eth", 8453: "base", 42161: "arbitrum", 10: "optimism" }[result.chainId] || "eth"}.blockscout.com/tx/${result.tx}`} target="_blank" rel="noreferrer">Blockscout transaction ↗</a></footer>
  </article>;
}
