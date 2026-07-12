import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/auth";
import { MaintenanceClient } from "@/components/maintenance/maintenance-client";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const [{ data: requests }, { data: assets }] = await Promise.all([
    supabase.from("maintenance_requests")
      .select("id, issue, priority, status, technician_name, created_at, asset:assets(tag, name), raiser:profiles!maintenance_requests_raised_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("assets").select("id, tag, name").not("status", "in", "(retired,disposed)").order("tag"),
  ]);

  const canManage = profile?.role === "asset_manager" || profile?.role === "admin";
  return (
    <MaintenanceClient
      requests={(requests ?? []) as never}
      assets={(assets ?? []) as never}
      canManage={canManage}
    />
  );
}
