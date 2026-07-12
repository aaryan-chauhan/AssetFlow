import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/auth";
import { AssetsClient } from "@/components/assets/assets-client";
import type { Asset, Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const supabase = await createClient();
  const profile = await getProfile();

  const [{ data: assets }, { data: categories }] = await Promise.all([
    supabase
      .from("assets")
      .select("*, category:asset_categories(id, name)")
      .order("tag"),
    supabase.from("asset_categories").select("*").order("name"),
  ]);

  const canManage = profile?.role === "asset_manager" || profile?.role === "admin";

  return (
    <AssetsClient
      assets={(assets ?? []) as (Asset & { category: { id: string; name: string } | null })[]}
      categories={(categories ?? []) as Category[]}
      canManage={canManage}
    />
  );
}
