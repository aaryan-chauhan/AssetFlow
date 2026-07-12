"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function registerAsset(input: {
  name: string;
  category_id: string | null;
  serial_number: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  condition: string;
  location: string | null;
  is_bookable: boolean;
  custom_data: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("assets")
    .insert(input)
    .select("id, tag")
    .single();
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    action: "registered asset",
    entity: "asset",
    entity_id: data.id,
    meta: { tag: data.tag, name: input.name },
  });

  revalidatePath("/assets");
  return { ok: true, tag: data.tag };
}
