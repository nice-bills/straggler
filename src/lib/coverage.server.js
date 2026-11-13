// Whether the verified source of a deployed implementation is the code an audit covered.
import { ghTarball, untar } from "@/lib/github.server";
import { matchFiles, squash } from "@/lib/upgrade-core";

const cache = new Map(); // "owner/name@commit" -> { path: content } for every .sol file

async function repoFiles(repo, commit) {
  const key = `${repo}@${commit}`;
  if (cache.has(key)) return cache.get(key);
  const [owner, name] = repo.split("/");
  const files = {};
  const dec = new TextDecoder();
  for (const { path, data } of untar(await ghTarball(owner, name, commit))) {
    const p = path.split("/").slice(1).join("/"); // drop "<owner>-<name>-<sha>/"
    if (p.endsWith(".sol")) files[p] = dec.decode(data);
  }
  cache.set(key, files);
  return files;
}

// Compares the deployed files with the repo at each audit commit.
export async function checkCoverage(protocol, deployedFiles) {
  const deployedPaths = Object.keys(deployedFiles);
  const audits = [];
  for (const audit of protocol.audits) {
    const files = await repoFiles(protocol.repo, audit.commit);
    const matches = matchFiles(deployedPaths, Object.keys(files));
    const different = [];
    const missing = [];
    for (const [deployed, repoFile] of Object.entries(matches)) {
      if (!repoFile) missing.push(deployed);
      else if (squash(deployedFiles[deployed]) !== squash(files[repoFile])) different.push(deployed);
    }
    different.sort();
    missing.sort();
    audits.push({
      firm: audit.firm,
      date: audit.date,
      commit: audit.commit,
      url: audit.url,
      identical: !different.length && !missing.length,
      different,
      missing,
    });
  }
  const score = (a) => a.different.length + a.missing.length;
  const best = audits.reduce((b, a) => (b === null || score(a) < score(b) ? a : b), null);
  return { covered: audits.some((a) => a.identical), best, audits };
}
