import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReplyBox({ markdown, ok }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">SERV reply</span>
        <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />} Copy</Button>
      </div>
      {!ok && <p className="mb-2 font-mono text-xs text-yellow-400">Still mentions a file outside the JSON after one retry.</p>}
      <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed [&_code]:font-mono [&_code]:text-primary [&_li]:ml-4 [&_ul]:list-disc">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}