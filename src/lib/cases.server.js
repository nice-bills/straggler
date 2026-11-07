import { gh } from "@/lib/github.server";
import { LOCK } from "@/lib/snapshot.server";

const FIX_REF = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s*:?\s+#(\d+)\b/i;
const NOT_GOLD = /(^|\/)(tests?|__tests__|spec|specs|testing|docs?|documentation)\/|\.(test|spec)\.[^/]+$|_test\.[^/]+$|(^|\/)test_[^/]+$|\.(md|mdx|rst)$|(^|\/)(CHANGELOG|CHANGES|HISTORY)[^/]*$/i;

export async function buildCases(b, repo, maxCases) {
  const base = `/repos/${repo.owner}/${repo.name}`;
  const existing = new Set();
  let cursor;
  do {
    const page = await b.entities.Case.filter({ repo_id: repo.id }, { limit: 500, cursor });
    page.items.forEach((c) => existing.add(c.issue_number));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);

  const picked = [];
  outer: for (let p = 1; p <= 10; p++) {
    const prs = await gh(`${base}/pulls?state=closed&sort=created&direction=desc&per_page=50&page=${p}`);
    if (!prs.length) break;
    for (const pr of prs) {
      if (!pr.merged_at) continue;
      const n = Number(FIX_REF.exec(pr.body || "")?.[1]);
      if (!n || existing.has(n) || picked.some((c) => c.issue_number === n)) continue;
      const issue = await gh(`${base}/issues/${n}`).catch(() => null);
      if (!issue || issue.pull_request || new Date(issue.created_at) >= new Date(pr.created_at)) continue;
      const files = await gh(`${base}/pulls/${pr.number}/files?per_page=100`);
      const gold = files.map((f) => f.filename).filter((f) => !NOT_GOLD.test(f) && !LOCK.test(f));
      if (!gold.length) continue;
      picked.push({
        repo_id: repo.id, issue_number: n, issue_title: issue.title, issue_body: (issue.body || "").slice(0, 20000),
        fix_pr_number: pr.number, base_sha: pr.base.sha, gold_files: JSON.stringify(gold),
      });
      if (picked.length >= maxCases) break outer;
    }
  }
  const nDev = Math.ceil(picked.length * 0.2);
  if (picked.length) await b.entities.Case.bulkCreate(picked.map((c, i) => ({ ...c, split: i < nDev ? "dev" : "test" })));
  return { created: picked.length, dev: nDev, test: picked.length - nDev };
}