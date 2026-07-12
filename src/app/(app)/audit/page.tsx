import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/auth";
import { AuditClient } from "@/components/audit/audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const [{ data: cycles }, { data: items }, { data: assignments }, { data: departments }, { data: employees }] =
    await Promise.all([
      supabase.from("audit_cycles").select("*, dept:departments(name)").order("created_at", { ascending: false }),
      supabase.from("audit_items").select("id, cycle_id, verification, expected_location, asset:assets(tag, name)"),
      supabase.from("audit_assignments").select("cycle_id, auditor:profiles(full_name)"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name"),
    ]);

  return (
    <AuditClient
      cycles={(cycles ?? []) as never}
      items={(items ?? []) as never}
      assignments={(assignments ?? []) as never}
      departments={(departments ?? []) as never}
      employees={(employees ?? []) as never}
      isAdmin={profile?.role === "admin"}
    />
  );
}
