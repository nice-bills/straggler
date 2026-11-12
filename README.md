# Straggler

Straggler is a triage bot for public GitHub repos, built on Dolphin. Dolphin reads the whole repo plus a new issue in one call and proposes the files a fix would change, the likely cause, a repro check and a label. Long Dolphin calls sometimes land on slow nodes, so long calls can be hedged: two copies race, the first valid result wins, and the other is cancelled. SERV Reasoning then writes the maintainer-facing reply. Entry for the OpenServ SERV Hackathon 02, Dolphin track.

## How it works

1. **Snapshot.** `src/lib/snapshot.server.js` downloads the repo tarball at a commit (the default-branch head for a new issue, the case's base commit for a benchmark case). It keeps text files and skips `node_modules`, `vendor`, `dist`, `build`, lockfiles, minified files, source maps, binaries and files over 200 KB. It packs them into one text file stored at a public URL.
2. **Hedged Dolphin call.** `src/lib/triage.server.js` sends the packed repo and the issue (body capped at 20,000 characters) to Dolphin with streaming, `max_tokens` 4000, `reasoning_effort: "low"` (so hidden reasoning does not spend the output budget) and a 180 s timeout. `hedge()` in `src/lib/triage-core.js` runs the call in mode `hedged` (two copies at once) or `single` (one copy). The first copy that passes validation wins and the others are aborted. If no copy passes, one more copy runs.
3. **Validation.** `validateTriage()` in `triage-core.js` requires JSON that parses (code fences are stripped), a non-empty `files` array, and every path present in the snapshot's file list. It keeps the first five files. A copy that returns empty output at the token limit is rejected.
4. **SERV reply.** `writeReply()` in `triage.server.js` calls SERV with the issue and the winning JSON. Every SERV call includes `serv_prompt_guard`. The reply call also includes `serv_shadow_agent`. The reply is checked for file names outside the JSON (see below).
5. **Record.** Each run is stored as a `TriageRun` with one `Attempt` per copy, including cost, tokens, timing, validity and whether the copy was cancelled.
6. **Scoring.** Only benchmark cases are scored: `hitAtK()` compares the predicted files with the gold files. Live triage runs are not scored.

## How SERV powers it

SERV Reasoning runs the reply step only. It is given the issue and the triage JSON (not the repo) and writes a short Markdown comment for maintainers. The model is `gpt-5.4-mini`, called through the SERV inference API in `src/lib/serv.server.js`.

- `serv_prompt_guard` is attached to every SERV call.
- `serv_shadow_agent` is attached to the reply call, with a hint listing the allowed files.
- The check: `mentionsOutside()` finds any snapshot file path that the reply names but the triage JSON does not. If it finds one, the reply is sent back once with a rewrite instruction. If the second reply still names an outside file, it is kept and marked `reply_ok = false`.

## Benchmark method

- **Cases.** `buildCases()` in `src/lib/cases.server.js` reads closed, merged pull requests whose title or body says "fixes #N" (or close/resolve). It keeps the issue if it was created before the PR. Each case stores the issue, the PR's base commit and the gold files.
- **Gold.** The non-test, non-doc, non-lockfile files changed by the fixing PR. Tests (any `test/`, `tests/`, `spec/`, `specs/`, `__tests__/` or `testing/` directory, or `*.test.*`, `*.spec.*`, `*_test.*`, `test_*` file), docs (any `doc/`, `docs/` or `documentation/` directory, or `*.md`, `*.mdx`, `*.rst` file), changelog files and lockfiles are excluded.
- **Metrics.** hit@1, hit@3 and hit@5: whether any of the top k predicted files is in the gold set. Time to valid runs from the start of the hedge to the winning copy's end.
- **Splits.** The first 20% of cases (rounded up) are the `dev` split, used for tuning. The rest are the `test` split, run once after tuning.
- **Not self-graded.** The gold files come from the fixing PRs, not from the model or the app.

Results (to be filled after the test-split run):

| Mode | Cases | Failed | p50 | p95 | hit@1 | hit@3 | hit@5 | Cost per issue |
|---|---|---|---|---|---|---|---|---|
| single | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| hedged | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Measured latency

Measured on Nov 7, 2026, with 200 calls per test at concurrency 10 on Dolphin.

- **Short calls** (64 max tokens): p50 1.12 s, p95 1.64 s, p99 1.81 s. Latency is flat here, so hedging would not help at this length.
- **Long calls** (1500 max tokens): p50 10.3 s, p95 16.9 s, p99 22.3 s. No errors and no timeouts.
- **Speed spread on the long run:** output speed p10 67, median 92, p90 169 tokens/s. Output length was similar (about 940 tokens), so the spread comes from the node, about 2.5x.
- **Simulated hedge** on the same long-call latencies: two copies give p50 7.7 s and p95 11.8 s (p95 about 30% lower). Three copies give 6.5 s and 10.8 s. The app hedges with two copies. This is a simulation over measured latencies, not a live hedged run.

## Run it

The app is a Base44 TanStack Start app.

```bash
npm ci
base44 login   # one-time per machine
base44 link    # one-time per clone
base44 dev     # local backend + app together
npm run build  # -> dist/client (assets) + dist/server (the Worker)
base44 deploy  # or publish from the Base44 builder
```

Secrets are read on the server by name, never from the frontend. Set these in the Base44 app:

- `DOLPHIN_API_KEY`
- `SERV_API_KEY`
- `GITHUB_TOKEN` (read-only; used for REST calls to GitHub)

The local runner, `scripts/local.mjs`, runs the same triage core outside Base44 with in-memory entities. It reads `.env` through `node --env-file`, and keeps its tables in `.local/db.json`.

- `node --env-file=.env scripts/local.mjs check`: runs the self-checks and builds a snapshot of `octocat/Hello-World` (uses GitHub only).
- `node --env-file=.env scripts/local.mjs triage <issue_url> [hedged|single]`: triages one issue and prints the attempts and the SERV reply.
- `node --env-file=.env scripts/local.mjs cases <owner/name> <n>`: builds up to `n` benchmark cases from a repo's fixing PRs.
- `node --env-file=.env scripts/local.mjs bench <dev|test> <hedged|single>`: runs a benchmark split and stores the summary.

## Costs

- Dolphin: $0.01 per million input tokens, $0.07 per million output tokens.
- SERV `gpt-5.4-mini`: $1.00 per million input tokens, $6.00 per million output tokens. Source: https://docs.openserv.ai/serv-reasoning/models
- Example: one whole-repo triage of `pallets/click` was about 345k input tokens, about $0.0035 on Dolphin.

Costs are computed from token counts in the API responses, so the numbers are per call and per issue, with no cache discounts applied.

## Limits

- Snapshots are capped at 1.6M characters (about 400k tokens). Larger repos are cut: the cut file paths are recorded and the snapshot is flagged `truncated`.
- Public GitHub repos only. Snapshots are stored at public URLs.
- Hedging is chosen per run (`hedged` or `single`). The code does not pick the mode automatically from call length.
- The cost shown for a cancelled hedge copy may undercount what Dolphin bills. A cancelled copy does not report its usage, so the app records zero for it.
- A SERV reply that still names an outside file after one retry is kept with `reply_ok = false`.
