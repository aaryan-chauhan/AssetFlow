"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { Role } from "@/lib/types";

export async function createDepartment(input: { name: string; head_id: string | null; parent_id: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert(input);
  if (error) return { error: error.message };
  revalidatePath("/organization");
  return { ok: true };
}

export async function createCategory(input: { name: string; warranty: boolean }) {
  const supabase = await createClient();
  const custom_fields = input.warranty
    ? [{ key: "warranty_months", label: "Warranty (months)", type: "number" }]
    : [];
  const { error } = await supabase.from("asset_categories").insert({ name: input.name, custom_fields });
  if (error) return { error: error.message };
  revalidatePath("/organization");
  return { ok: true };
}

// The only place roles are assigned. The DB guard trigger blocks any non-admin path.
export async function setEmployeeRole(userId: string, role: Role) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/organization");
  return { ok: true };
}

export async function setEmployeeStatus(userId: string, status: "active" | "inactive") {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/organization");
  return { ok: true };
}
