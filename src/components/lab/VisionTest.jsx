import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { visionTest } from "@/lib/lab-fns";
import { fmtMs } from "@/lib/stats";
import { TestCard } from "@/components/lab/ContextCapTest";
import VisionRepeat from "@/components/lab/VisionRepeat";

export default function VisionTest() {
  const test = useServerFn(visionTest);
  const [preview, setPreview] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [repeat, setRepeat] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setRes(null);
    setRepeat(null);
    setFileUri(null);
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setFileUri(file_uri);
      setRes(await test({ data: { file_uri } }));
    } catch (err) {
      setRes({ status: "error", error: err.message });
    } finally {
      setBusy(false);
    }
  };

  const run10 = async () => {
    setBusy(true);
    const results = [];
    setRepeat({ results, running: true });
    for (let i = 0; i < 10; i++) {
      results.push(await test({ data: { file_uri: fileUri } }).catch((e) => ({ status: "error", error: e.message })));
      setRepeat({ results: [...results], running: i < 9 });
    }
    setBusy(false);
  };

  return (
    <TestCard title="Vision test" desc="Upload an image; it's sent as an image_url part with “Describe this image in one sentence.”"
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={run10} disabled={busy || !fileUri}>Run 10x</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload image
            <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        </div>
      }>
      <div className="flex gap-4">
        {preview && <img src={preview} alt="Uploaded test image" className="h-24 w-24 rounded object-cover" />}
        <div className="font-mono text-xs">
          {busy && !repeat && <span className="text-muted-foreground">sending…</span>}
          {res && (res.status === "ok"
            ? <p><span className="text-emerald-400">ok {res.http_code}</span> · {fmtMs(res.latency_ms)}<br /><span className="font-body text-sm">{res.content}</span></p>
            : <p className="break-all text-red-400">{res.status}{res.http_code ? ` ${res.http_code}` : ""}: {res.error}</p>)}
          {!busy && !res && <span className="text-muted-foreground">No image yet.</span>}
        </div>
      </div>
      {repeat && <VisionRepeat {...repeat} />}
    </TestCard>
  );
}