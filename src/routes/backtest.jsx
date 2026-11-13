import { createFileRoute, Link } from "@tanstack/react-router";

// Bundled at build time; the page shows an empty state until scripts/backtest.mjs has written results.
const files = import.meta.glob("../../data/backtest-results.json", { eager: true, import: "default" });
const rows = Object.values(files)[0] || [];

export const Route = createFileRoute("/backtest")({
  head: () => ({ meta: [{ title: "Backtest · Straggler" }] }),
  component: Backtest,
});

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "—");
const p = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null;
};
const secs = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)} s`);

function stats(mode) {
  const ok = rows.filter((r) => r.mode === mode && !r.error);
  const inc = ok.filter((r) => r.kind === "incident");
  const ben = ok.filter((r) => r.kind === "benign");
  const ms = ok.filter((r) => r.ms > 0).map((r) => r.ms);
  return {
    recall: `${inc.filter((r) => r.flagged).length}/${inc.length}`,
    falseFlag: pct(ben.filter((r) => r.flagged).length, ben.length),
    benign: `${ben.filter((r) => r.flagged).length}/${ben.length}`,
    p50: secs(p(ms, 0.5)),
    p95: secs(p(ms, 0.95)),
    cost: ok.length ? `$${(ok.reduce((n, r) => n + (r.cost_usd || 0), 0) / ok.length).toFixed(4)}` : "—",
  };
}

function Backtest() {
  const s = stats("single");
  const h = stats("hedged");
  return (
    <main className="shell">
      <header>
        <Link to="/" className="brand">STRAGGLER <span>· PROXY WATCH</span></Link>
        <Link to="/">← Review an upgrade</Link>
      </header>
      <section className="hero">
        <div className="eyebrow">BACKTEST · GRADED BY THE INCIDENT RECORD, NOT THE MODEL</div>
        <h1>Would it have stopped you before the drain?</h1>
        <p>Real upgrades that lost funds, and planned governance upgrades that did not. Each one reviewed once per mode.</p>
      </section>
      {!rows.length ? (
        <div className="empty">NO RESULTS YET <span>Run node --env-file=.env scripts/backtest.mjs</span></div>
      ) : (
        <>
          <div className="metrics">
            <div><small>INCIDENTS FLAGGED</small><b>{s.recall}</b></div>
            <div><small>BENIGN WRONGLY FLAGGED</small><b>{s.benign}</b></div>
            <div><small>MEDIAN TIME (SINGLE / RACED)</small><b>{s.p50} / {h.p50}</b></div>
            <div><small>COST PER REVIEW</small><b>{s.cost}</b></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Mode</th><th>Incidents flagged</th><th>False-flag rate</th><th>p50</th><th>p95</th><th>Cost / review</th></tr>
              </thead>
              <tbody>
                {[["single", s], ["hedged (2 copies)", h]].map(([m, x]) => (
                  <tr key={m}><td>{m}</td><td>{x.recall}</td><td>{x.falseFlag}</td><td>{x.p50}</td><td>{x.p95}</td><td>{x.cost}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 style={{ marginTop: 48 }}>Every case</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Case</th><th>Kind</th><th>Mode</th><th>Verdict</th><th>Time</th><th>Cost</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.name}-${r.mode}`}>
                    <td>{r.name}</td>
                    <td>{r.kind}</td>
                    <td>{r.mode}</td>
                    <td style={{ color: r.error ? "#93a39f" : r.flagged ? "#ff8980" : "#a9e4ca" }}>{r.error ? `could not run: ${r.error}` : r.verdict}</td>
                    <td>{secs(r.ms)}</td>
                    <td>{r.cost_usd ? `$${r.cost_usd.toFixed(4)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
