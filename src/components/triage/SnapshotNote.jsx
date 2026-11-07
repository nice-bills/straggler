export default function SnapshotNote({ snapshot: s }) {
  return (
    <div className="font-mono text-xs text-muted-foreground">
      snapshot {s.commit_sha.slice(0, 7)} · {s.file_count} files · ~{Math.round(s.est_tokens / 1000)}k tokens
      {s.truncated && (
        <p className="mt-1 text-yellow-400">
          Repo exceeds 400k tokens: packing stopped at the cap and {s.cut_count} files were cut.
        </p>
      )}
    </div>
  );
}