export type Role = "employee" | "department_head" | "asset_manager" | "admin";
export type AssetStatus =
  | "available" | "allocated" | "reserved" | "under_maintenance" | "lost" | "retired" | "disposed";
export type AssetCondition = "new" | "good" | "fair" | "poor";
export type TransferStatus = "requested" | "approved" | "rejected" | "cancelled";
export type BookingStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type MaintStatus =
  | "pending" | "approved" | "rejected" | "tech_assigned" | "in_progress" | "resolved";
export type MaintPriority = "low" | "medium" | "high" | "critical";
export type AuditStatus = "open" | "closed";
export type Verification = "pending" | "verified" | "missing" | "damaged";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
  role: Role;
  status: string;
  created_at: string;
};

export type Department = {
  id: string;
  name: string;
  head_id: string | null;
  parent_id: string | null;
  status: string;
};

export type Category = {
  id: string;
  name: string;
  custom_fields: { key: string; label: string; type: string }[];
};

export type Asset = {
  id: string;
  tag: string;
  name: string;
  category_id: string | null;
  serial_number: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  condition: AssetCondition;
  location: string | null;
  photo_url: string | null;
  custom_data: Record<string, unknown>;
  is_bookable: boolean;
  status: AssetStatus;
  department_id: string | null;
  created_at: string;
};

export const ROLE_LABEL: Record<Role, string> = {
  employee: "Employee",
  department_head: "Department Head",
  asset_manager: "Asset Manager",
  admin: "Admin",
};

export const STATUS_META: Record<AssetStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-emerald-100 text-emerald-700 ring-emerald-600/20" },
  allocated: { label: "Allocated", className: "bg-blue-100 text-blue-700 ring-blue-600/20" },
  reserved: { label: "Reserved", className: "bg-violet-100 text-violet-700 ring-violet-600/20" },
  under_maintenance: { label: "Under Maintenance", className: "bg-amber-100 text-amber-700 ring-amber-600/20" },
  lost: { label: "Lost", className: "bg-red-100 text-red-700 ring-red-600/20" },
  retired: { label: "Retired", className: "bg-slate-200 text-slate-600 ring-slate-500/20" },
  disposed: { label: "Disposed", className: "bg-slate-200 text-slate-500 ring-slate-500/20" },
};
