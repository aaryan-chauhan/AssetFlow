"use client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { markRead, markAllRead } from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCheck, Activity, Dot } from "lucide-react";

type Notif = { id: string; type: string; message: string; link: string | null; read: boolean; created_at: string };
type Act = { id: string; action: string; entity: string; meta: Record<string, unknown>; created_at: string; actor: { full_name: string } | null };

export function NotificationsClient({ notifications, activity }: { notifications: Notif[]; activity: Act[] }) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-primary" /> Notifications {unread > 0 && <span className="rounded-full bg-destructive px-2 text-xs text-white">{unread}</span>}</CardTitle>
          {unread > 0 && <Button size="sm" variant="outline" onClick={async () => { await markAllRead(); router.refresh(); }}><CheckCheck /> Mark all read</Button>}
        </CardHeader>
        <CardContent className="space-y-1">
          {notifications.map((n) => (
            <button key={n.id} onClick={async () => { if (!n.read) { await markRead(n.id); router.refresh(); } }}
              className={`flex w-full items-start gap-2 rounded-md p-2.5 text-left text-sm transition-colors hover:bg-secondary ${n.read ? "opacity-60" : ""}`}>
              <span className={`mt-1 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
              <div className="flex-1">
                <p className="font-medium leading-tight">{n.message}</p>
                <p className="text-xs text-muted-foreground">{n.type.replace(/_/g, " ")} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
            </button>
          ))}
          {notifications.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No notifications.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-primary" /> Activity Log</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-1 text-sm">
                <Dot className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p><span className="font-medium">{a.actor?.full_name ?? "Someone"}</span> {a.action}
                    {typeof a.meta?.tag === "string" && <span className="text-muted-foreground"> · {a.meta.tag}</span>}
                    {typeof a.meta?.name === "string" && <span className="text-muted-foreground"> · {a.meta.name}</span>}
                    {typeof a.meta?.resource === "string" && <span className="text-muted-foreground"> · {a.meta.resource}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                </div>
              </li>
            ))}
            {activity.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
