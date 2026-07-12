import type { Role } from "@/lib/types";
import {
  LayoutDashboard, Boxes, ArrowLeftRight, CalendarClock, Wrench,
  ClipboardCheck, BarChart3, Building2, Bell, type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[]; // undefined = everyone
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/allocation", label: "Allocation & Transfer", icon: ArrowLeftRight },
  { href: "/booking", label: "Resource Booking", icon: CalendarClock },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/audit", label: "Audit", icon: ClipboardCheck },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["department_head", "asset_manager", "admin"] },
  { href: "/organization", label: "Organization Setup", icon: Building2, roles: ["admin"] },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function visibleNav(role: Role): NavItem[] {
  return NAV.filter((n) => !n.roles || n.roles.includes(role));
}
