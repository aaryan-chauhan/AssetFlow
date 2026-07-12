"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { MaintStatus } from "@/lib/types";

export async function raiseMaintenance(input: {
  asset_id: string;
  issue: string;
  priority: string;
  photo_url: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("maintenance_requests").insert({
    asset_id: input.asset_id,
    raised_by: user.id,
    issue: input.issue,
    priority: input.priority,
    photo_url: input.photo_url,
  });
  if (error) return { error: error.message };
  revalidatePath("/maintenance");
  return { ok: true };
}

// Manager-driven workflow transitions. The DB trigger flips the asset's status
// on approval (-> under_maintenance) and resolution (-> available).
export async function setMaintenanceStatus(
  id: string,
  status: MaintStatus,
  technician_name?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const patch: Record<string, unknown> = { status };
  if (status === "approved") patch.approver_id = user.id;
  if (technician_name) patch.technician_name = technician_name;
  const { error } = await supabase.from("maintenance_requests").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/maintenance");
  return { ok: true };
}
