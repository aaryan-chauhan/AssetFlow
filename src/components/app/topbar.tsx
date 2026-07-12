"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { NAV } from "@/lib/nav";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Bell, LogOut, ChevronDown } from "lucide-react";

function titleFor(pathname: string) {
  const match = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  return match?.label ?? "AssetFlow";
}

export function Topbar({
  name,
  role,
  email,
  unread,
}: {
  name: string;
  role: Role;
  email: string;
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 px-5 backdrop-blur">
      <h1 className="text-lg font-semibold tracking-tight">{titleFor(pathname)}</h1>

      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-secondary"
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-11 z-20 w-56 animate-fade-in rounded-lg border bg-card p-1.5 shadow-soft">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                  <p className="mt-1 inline-block rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                    {ROLE_LABEL[role]}
                  </p>
                </div>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
