import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  const name = profile.full_name || profile.email || "User";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={profile.role} name={name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar name={name} role={profile.role} email={profile.email ?? ""} unread={count ?? 0} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
