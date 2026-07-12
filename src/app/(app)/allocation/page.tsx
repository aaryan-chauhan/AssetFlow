import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/auth";
import { AllocationClient } from "@/components/allocation/allocation-client";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: active }, { data: transfers }, { data: employees }, { data: assets }] = await Promise.all([
    supabase.from("allocations")
      .select("id, allocated_at, expected_return_date, asset:assets(id, tag, name), holder:profiles!allocations_holder_employee_id_fkey(full_name)")
      .eq("status", "active").order("expected_return_date", { nullsFirst: false }),
    supabase.from("transfer_requests")
      .select("id, reason, from_label, status, created_at, asset:assets(tag, name), to:profiles!transfer_requests_to_employee_id_fkey(full_name), requester:profiles!transfer_requests_requested_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("status", "active").order("full_name"),
    supabase.from("assets").select("id, tag, name, status").order("tag"),
  ]);

  const canManage = profile?.role === "asset_manager" || profile?.role === "admin";
  const canApprove = canManage || profile?.role === "department_head";

  return (
    <AllocationClient
      today={today}
      active={(active ?? []) as never}
      transfers={(transfers ?? []) as never}
      employees={(employees ?? []) as never}
      assets={(assets ?? []) as never}
      canManage={canManage}
      canApprove={canApprove}
    />
  );
}
