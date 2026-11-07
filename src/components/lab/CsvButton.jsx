import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCallsCsv } from "@/lib/csv";

export default function CsvButton({ calls, name }) {
  return (
    <Button variant="outline" size="sm" disabled={!calls.length} onClick={() => downloadCallsCsv(calls, name)}>
      <Download className="h-3.5 w-3.5" /> Export CSV
    </Button>
  );
}