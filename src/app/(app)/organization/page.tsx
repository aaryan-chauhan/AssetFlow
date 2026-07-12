import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/auth";
import { OrgClient } from "@/components/organization/org-client";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: departments }, { data: categories }, { data: employees }] = await Promise.all([
    supabase.from("departments").select("*, head:profiles!departments_head_fk(full_name), parent:departments!departments_parent_id_fkey(name)").order("name"),
    supabase.from("asset_categories").select("*").order("name"),
    supabase.from("profiles").select("*, department:departments!profiles_department_id_fkey(name)").order("full_name"),
  ]);

  return (
    <OrgClient
      departments={(departments ?? []) as never}
      categories={(categories ?? []) as never}
      employees={(employees ?? []) as never}
    />
  );
}
