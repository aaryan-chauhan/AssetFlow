"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createAuditCycle(input: {
  name: string;
  scope_department_id: string | null;
  scope_location: string | null;
  start_date: string | null;
  end_date: string | null;
  auditor_ids: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: cycle, error } = await supabase.from("audit_cycles").insert({
    name: input.name,
    scope_department_id: input.scope_department_id,
    scope_location: input.scope_location,
    start_date: input.start_date,
    end_date: input.end_date,
    created_by: user.id,
  }).select("id").single();
  if (error) return { error: error.message };

  if (input.auditor_ids.length) {
    await supabase.from("audit_assignments").insert(
      input.auditor_ids.map((auditor_id) => ({ cycle_id: cycle.id, auditor_id })),
    );
  }

  // Populate the checklist from assets in scope.
  let q = supabase.from("assets").select("id, location").not("status", "in", "(retired,disposed)");
  if (input.scope_department_id) q = q.eq("department_id", input.scope_department_id);
  const { data: assets } = await q;
  if (assets?.length) {
    await supabase.from("audit_items").insert(
      assets.map((a) => ({ cycle_id: cycle.id, asset_id: a.id, expected_location: a.location })),
    );
  }

  revalidatePath("/audit");
  return { ok: true };
}

export async function markAuditItem(itemId: string, verification: "verified" | "missing" | "damaged") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("audit_items")
    .update({ verification, verified_by: user.id, verified_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath("/audit");
  return { ok: true };
}

export async function closeAuditCycle(cycleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data, error } = await supabase.rpc("close_audit_cycle", { p_cycle: cycleId });
  if (error) return { error: error.message };
  revalidatePath("/audit");
  return { ok: true, flagged: data as number };
}
