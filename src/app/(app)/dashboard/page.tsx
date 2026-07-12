import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  CheckCircle2, PackageCheck, Wrench, CalendarClock, ArrowLeftRight, Clock,
  AlertTriangle, PlusCircle, CalendarPlus, WrenchIcon, Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const c = () => supabase.from("assets").select("*", { count: "exact", head: true });

  const [
    available, allocated, maintenance, bookings, transfers, upcoming, overdueRes, activity,
  ] = await Promise.all([
    count(c().eq("status", "available")),
    count(c().eq("status", "allocated")),
    count(
      supabase.from("maintenance_requests").select("*", { count: "exact", head: true })
        .in("status", ["pending", "approved", "tech_assigned", "in_progress"]),
    ),
    count(
      supabase.from("bookings").select("*", { count: "exact", head: true })
        .in("status", ["upcoming", "ongoing"]),
    ),
    count(
      supabase.from("transfer_requests").select("*", { count: "exact", head: true })
        .eq("status", "requested"),
    ),
    count(
      supabase.from("allocations").select("*", { count: "exact", head: true })
        .eq("status", "active").gte("expected_return_date", today),
    ),
    supabase.from("allocations")
      .select("id, expected_return_date, asset:assets(tag,name), holder:profiles!allocations_holder_employee_id_fkey(full_name)")
      .eq("status", "active").lt("expected_return_date", today).order("expected_return_date"),
    supabase.from("activity_log")
      .select("id, action, entity, meta, created_at, actor:profiles!activity_log_actor_id_fkey(full_name)")
      .order("created_at", { ascending: false }).limit(8),
  ]);

  const overdue = (overdueRes.data ?? []) as unknown as {
    id: string; expected_return_date: string;
    asset: { tag: string; name: string } | null; holder: { full_name: string } | null;
  }[];
  const feed = (activity.data ?? []) as unknown as {
    id: string; action: string; entity: string; meta: Record<string, unknown>;
    created_at: string; actor: { full_name: string } | null;
  }[];

  const actions = [
    { href: "/assets?new=1", label: "Register Asset", icon: PlusCircle },
    { href: "/booking?new=1", label: "Book Resource", icon: CalendarPlus },
    { href: "/maintenance?new=1", label: "Raise Maintenance", icon: WrenchIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Today&apos;s Overview</h2>
        <p className="text-sm text-muted-foreground">Real-time snapshot of your organization&apos;s assets and activity.</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Available" value={available} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Allocated" value={allocated} icon={PackageCheck} tone="blue" />
        <StatCard label="Maintenance" value={maintenance} icon={Wrench} tone="amber" />
        <StatCard label="Active Bookings" value={bookings} icon={CalendarClock} tone="violet" />
        <StatCard label="Pending Transfers" value={transfers} icon={ArrowLeftRight} tone="default" />
        <StatCard label="Upcoming Returns" value={upcoming} icon={Clock} tone="default" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={buttonVariants({ variant: "outline" })}>
            <a.icon /> {a.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Overdue */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" /> Overdue Returns
            </CardTitle>
            <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              {overdue.length} flagged
            </span>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No overdue returns. </p>
            ) : (
              <ul className="divide-y">
                {overdue.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {o.asset?.tag} · {o.asset?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Held by {o.holder?.full_name ?? "—"}</p>
                    </div>
                    <span className="text-xs font-medium text-destructive">
                      Due {new Date(o.expected_return_date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feed.map((f) => (
                <li key={f.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>
                      <span className="font-medium">{f.actor?.full_name ?? "Someone"}</span>{" "}
                      {f.action}
                      {typeof f.meta?.tag === "string" && <span className="text-muted-foreground"> · {f.meta.tag}</span>}
                      {typeof f.meta?.resource === "string" && <span className="text-muted-foreground"> · {f.meta.resource}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
