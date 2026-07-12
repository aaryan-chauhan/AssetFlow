import { Badge } from "@/components/ui/badge";
import { STATUS_META, type AssetStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: AssetStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}
