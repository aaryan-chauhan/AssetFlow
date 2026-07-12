import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";

// Current signed-in profile (joined with department name), or null.
export async function getProfile(): Promise<
  (Profile & { department: { name: string } | null }) | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, department:departments!profiles_department_id_fkey(name)")
    .eq("id", user.id)
    .single();

  return (data as Profile & { department: { name: string } | null }) ?? null;
}
