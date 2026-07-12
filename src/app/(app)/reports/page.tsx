import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_META, type AssetStatus } from "@/lib/types";
import { TrendingUp, Wrench, Building2, Boxes } from "lucide-react";

export const dynamic = "force-dynamic";

function tally<T extends string>(rows: { k: T }[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of rows) m[r.k] = (m[r.k] ?? 0) + 1;
  return m;
}

function Bar({ label, value, max, color = "bg-primary" }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="truncate">{label}</span><span className="font-medium text-muted-foreground">{value}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const [{ data: assets }, { data: allocs }, { data: maint }, { data: deptAllocs }] = await Promise.all([
    supabase.from("assets").select("id, name, tag, status"),
    supabase.from("allocations").select("asset:assets(name, tag)"),
    supabase.from("maintenance_requests").select("asset:assets(category:asset_categories(name))"),
    supabase.from("allocations").select("holder:profiles!allocations_holder_employee_id_fkey(department:departments!profiles_department_id_fkey(name))").eq("status", "active"),
  ]);

  const all = assets ?? [];
  const statusDist = tally(all.map((a) => ({ k: a.status as AssetStatus })));
  const total = all.length;
  const allocatedNow = statusDist["allocated"] ?? 0;
  const utilization = total ? Math.round((allocatedNow / total) * 100) : 0;

  // most-used assets by allocation count
  const useCount: Record<string, number> = {};
  for (const r of allocs ?? []) {
    const a = r.asset as unknown as { name: string; tag: string } | null;
    if (a) useCount[`${a.tag} · ${a.name}`] = (useCount[`${a.tag} · ${a.name}`] ?? 0) + 1;
  }
  const mostUsed = Object.entries(useCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxUse = mostUsed[0]?.[1] ?? 1;

  // maintenance by category
  const maintCat: Record<string, number> = {};
  for (const r of maint ?? []) {
    const name = ((r.asset as unknown as { category: { name: string } | null } | null)?.category?.name) ?? "Uncategorized";
    maintCat[name] = (maintCat[name] ?? 0) + 1;
  }
  const maintRows = Object.entries(maintCat).sort((a, b) => b[1] - a[1]);
  const maxMaint = maintRows[0]?.[1] ?? 1;

  // department allocation
  const deptCount: Record<string, number> = {};
  for (const r of deptAllocs ?? []) {
    const name = ((r.holder as unknown as { department: { name: string } | null } | null)?.department?.name) ?? "Unassigned";
    deptCount[name] = (deptCount[name] ?? 0) + 1;
  }
  const deptRows = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);
  const maxDept = deptRows[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total Assets" value={total} />
        <Kpi label="Utilization" value={`${utilization}%`} />
        <Kpi label="Idle (Available)" value={statusDist["available"] ?? 0} />
        <Kpi label="Under Maintenance" value={statusDist["under_maintenance"] ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Boxes className="size-4 text-primary" /> Assets by Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(STATUS_META) as AssetStatus[]).filter((s) => statusDist[s]).map((s) => (
              <Bar key={s} label={STATUS_META[s].label} value={statusDist[s]} max={total} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4 text-primary" /> Most-Used Assets</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mostUsed.map(([label, v]) => <Bar key={label} label={label} value={v} max={maxUse} color="bg-blue-500" />)}
            {mostUsed.length === 0 && <p className="text-sm text-muted-foreground">No allocation data.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="size-4 text-primary" /> Maintenance by Category</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {maintRows.map(([label, v]) => <Bar key={label} label={label} value={v} max={maxMaint} color="bg-amber-500" />)}
            {maintRows.length === 0 && <p className="text-sm text-muted-foreground">No maintenance data.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-primary" /> Allocations by Department</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {deptRows.map(([label, v]) => <Bar key={label} label={label} value={v} max={maxDept} color="bg-violet-500" />)}
            {deptRows.length === 0 && <p className="text-sm text-muted-foreground">No allocation data.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
