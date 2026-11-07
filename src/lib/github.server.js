import { secrets } from "base44:runtime";

const headers = () => ({
  accept: "application/vnd.github+json",
  "user-agent": "straggler-triage",
  "x-github-api-version": "2022-11-28",
  authorization: `Bearer ${secrets.get("GITHUB_TOKEN")}`,
});

export async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// The whole repo at `sha` as one gunzipped tarball (one request instead of one per file).
export async function ghTarball(owner, name, sha) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/tarball/${sha}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub tarball ${res.status}`);
  const buf = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return new Uint8Array(buf);
}

// Minimal ustar reader: yields { path, data } for regular files, honouring pax long paths.
export function* untar(bytes) {
  const dec = new TextDecoder();
  const str = (o, l) => {
    let e = o;
    while (e < o + l && bytes[e]) e++;
    return dec.decode(bytes.subarray(o, e));
  };
  let off = 0;
  let longName = null;
  while (off + 512 <= bytes.length && bytes[off] !== 0) {
    const name = str(off, 100);
    const size = parseInt(str(off + 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(bytes[off + 156] || 48);
    const prefix = str(off + 345, 155);
    const data = bytes.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === "x") {
      longName = dec.decode(data).match(/\d+ path=([^\n]*)\n/)?.[1] || null;
      continue;
    }
    if (type === "g") continue;
    const path = longName || (prefix ? `${prefix}/${name}` : name);
    longName = null;
    if (type === "0") yield { path, data };
  }
}

export function parseIssueUrl(url) {
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s]+)\/issues\/(\d+)/);
  return m ? { owner: m[1], name: m[2], number: Number(m[3]) } : null;
}