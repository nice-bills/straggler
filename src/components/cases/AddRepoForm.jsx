import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addRepo } from "@/lib/triage-fns";

export default function AddRepoForm() {
  const add = useServerFn(addRepo);
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const [owner, name] = value.trim().replace(/^https?:\/\/github\.com\//, "").split("/");
    if (!owner || !name) return setError("Use owner/name, e.g. sindresorhus/ky");
    setBusy(true); setError(null);
    try {
      await add({ data: { owner, name } });
      setValue("");
      await router.invalidate();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="owner/name" className="font-mono text-sm" disabled={busy} />
        <Button type="submit" disabled={busy || !value.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Add repo</Button>
      </div>
      {error && <p className="font-mono text-xs text-red-400">{error}</p>}
    </form>
  );
}