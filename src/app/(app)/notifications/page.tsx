import { createClient } from "@/utils/supabase/server";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const [{ data: notifications }, { data: activity }] = await Promise.all([
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("activity_log")
      .select("id, action, entity, meta, created_at, actor:profiles!activity_log_actor_id_fkey(full_name)")
      .order("created_at", { ascending: false }).limit(30),
  ]);
  return (
    <NotificationsClient
      notifications={(notifications ?? []) as never}
      activity={(activity ?? []) as never}
    />
  );
}
