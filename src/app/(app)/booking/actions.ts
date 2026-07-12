"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createBooking(input: {
  resource_id: string;
  purpose: string;
  starts_at: string;
  ends_at: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (new Date(input.ends_at) <= new Date(input.starts_at))
    return { error: "End time must be after start time." };

  const { error } = await supabase.from("bookings").insert({
    resource_id: input.resource_id,
    booked_by: user.id,
    purpose: input.purpose || null,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
  });
  if (error) {
    // 23P01 = exclusion_violation from the no-overlap GiST constraint
    if (error.code === "23P01") return { error: "That slot overlaps an existing booking. Pick a free time." };
    return { error: error.message };
  }
  await supabase.from("activity_log").insert({
    actor_id: user.id, action: "booked resource", entity: "booking", meta: {},
  });
  revalidatePath("/booking");
  return { ok: true };
}

export async function cancelBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/booking");
  return { ok: true };
}
