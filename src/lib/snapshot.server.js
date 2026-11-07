import { gh, ghTarball, untar } from "@/lib/github.server";

export const MAX_CHARS = 1_600_000; // ~400k tokens
const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build)\//;
export const LOCK = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|Gemfile\.lock|composer\.lock|poetry\.lock|Pipfile\.lock|go\.sum)$|\.lock$/i;
const MINIFIED = /\.min\.(js|css)$|\.map$/i;
const BINARY = /\.(png|jpe?g|gif|bmp|ico|icns|webp|svg|tiff?|psd|mp[34]|mov|avi|webm|wav|ogg|flac|zip|gz|tgz|tar|bz2|xz|7z|rar|jar|war|class|exe|dll|so|dylib|o|a|lib|bin|dat|db|sqlite3?|pdf|woff2?|ttf|otf|eot|pyc|wasm|node|pkl|npy|onnx|pt|h5|parquet)$/i;

export const keepPath = (p, size) =>
  size <= 200 * 1024 && !SKIP_DIR.test(p) && !LOCK.test(p) && !MINIFIED.test(p) && !BINARY.test(p);

export const summarize = ({ file_list, cut_files, ...s }) => s;

export async function buildSnapshot(b, repo, sha) {
  const tree = await gh(`/repos/${repo.owner}/${repo.name}/git/trees/${sha}?recursive=1`);
  const wanted = tree.tree.filter((t) => t.type === "blob" && keepPath(t.path, t.size));
  const wantedSet = new Set(wanted.map((t) => t.path));
  const dec = new TextDecoder();
  const contents = new Map();
  for (const { path, data } of untar(await ghTarball(repo.owner, repo.name, sha))) {
    const rel = path.slice(path.indexOf("/") + 1); // drop the "owner-repo-sha/" root folder
    if (wantedSet.has(rel) && !data.includes(0)) contents.set(rel, dec.decode(data));
  }
  const parts = [];
  const files = [];
  const cut = [];
  let chars = 0;
  for (const t of wanted) {
    const text = contents.get(t.path);
    if (text == null) continue;
    const piece = `=== ${t.path} ===\n${text}\n`;
    if (cut.length || chars + piece.length > MAX_CHARS) { cut.push(t.path); continue; }
    parts.push(piece);
    files.push(t.path);
    chars += piece.length;
  }
  const file = new File([parts.join("")], `${repo.name}-${sha.slice(0, 7)}.txt`, { type: "text/plain" });
  const { file_url } = await b.integrations.Core.UploadPublicFile({ file });
  return b.entities.Snapshot.create({
    repo_id: repo.id, commit_sha: sha, file_count: files.length, char_count: chars, est_tokens: Math.round(chars / 4),
    file_list: JSON.stringify(files), packed_text_url: file_url,
    truncated: cut.length > 0 || !!tree.truncated, cut_count: cut.length, cut_files: JSON.stringify(cut),
  });
}

export async function getOrBuildSnapshot(b, repo, sha) {
  const found = await b.entities.Snapshot.filter({ repo_id: repo.id, commit_sha: sha }, { limit: 1 });
  return found.items[0] || buildSnapshot(b, repo, sha);
}