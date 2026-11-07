import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRun } from "@/lib/lab-fns";
import RunResults from "@/components/lab/RunResults";

export default function CompareColumn({ runs, value, onChange }) {
  const fetchRun = useServerFn(getRun);
  const { data, isLoading } = useQuery({
    queryKey: ["run", value],
    queryFn: () => fetchRun({ data: { id: value } }),
    enabled: !!value,
  });
  return (
    <div className="min-w-0 space-y-4">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="font-mono text-xs"><SelectValue placeholder="Pick a run" /></SelectTrigger>
        <SelectContent>
          {runs.map((r) => (
            <SelectItem key={r.id} value={r.id} className="font-mono text-xs">{r.label} · n{r.n_calls} · c{r.concurrency}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : data && <RunResults title={data.run.label} calls={data.calls} />}
    </div>
  );
}