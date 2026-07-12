"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function allocateAsset(input: {
  asset_id: string;
  holder_employee_id: string;
  expected_return_date: string | null;
}) {
  const { supabase, user } = await me();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("allocations").insert({
    asset_id: input.asset_id,
    holder_type: "employee",
    holder_employee_id: input.holder_employee_id,
    allocated_by: user.id,
    expected_return_date: input.expected_return_date,
  });
  if (error) {
    if (error.code === "23505") return { error: "That asset is already allocated. Submit a transfer request instead." };
    return { error: error.message };
  }
  await supabase.from("activity_log").insert({
    actor_id: user.id, action: "allocated asset", entity: "allocation", meta: {},
  });
  revalidatePath("/allocation");
  return { ok: true };
}

export async function requestTransfer(input: {
  asset_id: string;
  to_employee_id: string;
  reason: string;
}) {
  const { supabase, user } = await me();
  if (!user) return { error: "Not authenticated" };

  // Capture who currently holds it, for the request label.
  const { data: current } = await supabase
    .from("allocations")
    .select("holder:profiles!allocations_holder_employee_id_fkey(full_name)")
    .eq("asset_id", input.asset_id).eq("status", "active").maybeSingle();
  const fromLabel = (current?.holder as unknown as { full_name: string } | null)?.full_name ?? "current holder";

  const { error } = await supabase.from("transfer_requests").insert({
    asset_id: input.asset_id,
    to_employee_id: input.to_employee_id,
    requested_by: user.id,
    from_label: fromLabel,
    reason: input.reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/allocation");
  return { ok: true };
}

export async function resolveTransfer(id: string, approve: boolean) {
  const { supabase, user } = await me();
  if (!user) return { error: "Not authenticated" };
  // Trigger re-allocates the asset + notifies on approval.
  const { error } = await supabase
    .from("transfer_requests")
    .update({ status: approve ? "approved" : "rejected", approver_id: user.id })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/allocation");
  return { ok: true };
}

export async function returnAsset(input: {
  allocation_id: string;
  condition: string;
  notes: string;
}) {
  const { supabase, user } = await me();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("allocations")
    .update({
      status: "returned",
      returned_at: new Date().toISOString(),
      checkin_condition: input.condition,
      checkin_notes: input.notes || null,
    })
    .eq("id", input.allocation_id);
  if (error) return { error: error.message };
  await supabase.from("activity_log").insert({
    actor_id: user.id, action: "processed asset return", entity: "allocation", entity_id: input.allocation_id, meta: {},
  });
  revalidatePath("/allocation");
  return { ok: true };
}
