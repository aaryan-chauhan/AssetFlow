// Seed a demo organization via the Supabase service-role REST API.
// Idempotent: wipes app data + demo auth users, then recreates everything.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import WebSocket from "ws";
globalThis.WebSocket ??= WebSocket; // Node 18 has no global WebSocket
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL / service role key in .env.local");
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "Password123!";
const log = (...a) => console.log(...a);
const iso = (d) => d.toISOString();
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const atToday = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };

// ---------- People ----------
const PEOPLE = [
  { email: "admin@assetflow.dev",        name: "Aarav Menon",  role: "admin",           dept: "IT" },
  { email: "rhea.manager@assetflow.dev", name: "Rhea Nair",    role: "asset_manager",   dept: "IT" },
  { email: "karan.manager@assetflow.dev",name: "Karan Patel",  role: "asset_manager",   dept: "Facilities" },
  { email: "aditi.head@assetflow.dev",   name: "Aditi Rao",    role: "department_head", dept: "Engineering" },
  { email: "rohan.head@assetflow.dev",   name: "Rohan Mehta",  role: "department_head", dept: "Facilities" },
  { email: "priya@assetflow.dev",        name: "Priya Shah",   role: "employee",        dept: "Engineering" },
  { email: "raj@assetflow.dev",          name: "Raj Verma",    role: "employee",        dept: "IT" },
  { email: "sana@assetflow.dev",         name: "Sana Iqbal",   role: "employee",        dept: "Field Ops" },
  { email: "arjun@assetflow.dev",        name: "Arjun Nair",   role: "employee",        dept: "Engineering" },
  { email: "neha@assetflow.dev",         name: "Neha Gupta",   role: "employee",        dept: "Operations" },
  { email: "vikram@assetflow.dev",       name: "Vikram Singh", role: "employee",        dept: "IT" },
];

const DEPARTMENTS = ["Engineering", "IT", "Facilities", "Field Ops", "Operations"];
const HEADS = { Engineering: "aditi.head@assetflow.dev", Facilities: "rohan.head@assetflow.dev" };

const CATEGORIES = [
  { name: "Electronics", custom_fields: [{ key: "warranty_months", label: "Warranty (months)", type: "number" }] },
  { name: "Furniture", custom_fields: [] },
  { name: "Vehicles", custom_fields: [{ key: "reg_number", label: "Registration No.", type: "text" }] },
  { name: "Equipment", custom_fields: [] },
  { name: "Spaces", custom_fields: [{ key: "capacity", label: "Capacity", type: "number" }] },
];

// name, category, location, condition, status, bookable, cost
const ASSETS = [
  ["Dell Latitude 7440", "Electronics", "Bengaluru HQ", "good", "available", false, 92000],
  ["MacBook Pro 14", "Electronics", "Bengaluru HQ", "new", "available", false, 185000],
  ["Dell Latitude 5540", "Electronics", "Bengaluru HQ", "good", "available", false, 78000],
  ["Lenovo ThinkPad X1", "Electronics", "Mumbai Office", "good", "available", false, 120000],
  ["HP EliteBook 840", "Electronics", "Bengaluru HQ", "fair", "available", false, 71000],
  ["Dell UltraSharp 27\"", "Electronics", "Bengaluru HQ", "good", "available", false, 32000],
  ["LG 4K Monitor 32\"", "Electronics", "Mumbai Office", "good", "available", false, 41000],
  ["iPad Air", "Electronics", "Bengaluru HQ", "good", "available", false, 59000],
  ["Epson Projector EB-2247U", "Electronics", "HQ Floor 2", "good", "available", true, 68000],
  ["BenQ Projector", "Electronics", "Mumbai Office", "fair", "available", true, 52000],
  ["Logitech Rally Camera", "Electronics", "HQ Floor 2", "good", "available", false, 88000],
  ["Canon DSLR EOS 90D", "Electronics", "Marketing Store", "good", "available", false, 95000],
  ["HP LaserJet Pro", "Electronics", "Bengaluru HQ", "fair", "available", false, 24000],
  ["Ergonomic Chair Herman", "Furniture", "HQ Floor 2", "good", "available", false, 28000],
  ["Ergonomic Chair Herman #2", "Furniture", "HQ Floor 2", "good", "available", false, 28000],
  ["Standing Desk Oakwood", "Furniture", "HQ Floor 3", "good", "available", false, 34000],
  ["Standing Desk Oakwood #2", "Furniture", "HQ Floor 3", "new", "available", false, 34000],
  ["Conference Table 8-seat", "Furniture", "HQ Floor 2", "good", "available", false, 55000],
  ["Filing Cabinet Steel", "Furniture", "Warehouse", "fair", "available", false, 12000],
  ["Reception Sofa", "Furniture", "Lobby", "good", "available", false, 46000],
  ["Toyota Innova", "Vehicles", "Bengaluru HQ", "good", "available", true, 2200000],
  ["Mahindra Bolero Pickup", "Vehicles", "Field Depot", "fair", "available", true, 980000],
  ["Company Car - Honda City", "Vehicles", "Bengaluru HQ", "good", "available", true, 1400000],
  ["Forklift Toyota 8FG", "Equipment", "Warehouse", "fair", "available", false, 850000],
  ["Generator 15kVA", "Equipment", "Warehouse", "good", "available", false, 320000],
  ["Power Drill Set", "Equipment", "Field Depot", "good", "available", false, 18000],
  ["Ladder Aluminium 12ft", "Equipment", "Warehouse", "good", "available", false, 9000],
  ["Conference Room B2", "Spaces", "HQ Floor 2", "good", "available", true, 0],
  ["Conference Room A1", "Spaces", "HQ Floor 1", "good", "available", true, 0],
  ["Training Room T3", "Spaces", "HQ Floor 3", "good", "available", true, 0],
];

async function wipe() {
  log("Wiping existing app data…");
  const tables = [
    "audit_items", "audit_assignments", "audit_cycles", "notifications", "activity_log",
    "maintenance_requests", "transfer_requests", "bookings", "allocations",
    "assets", "asset_categories",
  ];
  for (const t of tables) await sb.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  // departments have self-FK + head FK; clear head first
  await sb.from("departments").update({ head_id: null, parent_id: null }).neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("departments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  // delete demo auth users (also cascades their profiles)
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emails = new Set(PEOPLE.map((p) => p.email));
  for (const u of data?.users ?? []) if (emails.has(u.email)) await sb.auth.admin.deleteUser(u.id);
}

async function main() {
  await wipe();

  // Departments
  log("Creating departments…");
  const { data: deptRows, error: de } = await sb.from("departments")
    .insert(DEPARTMENTS.map((name) => ({ name }))).select();
  if (de) throw de;
  const deptId = Object.fromEntries(deptRows.map((d) => [d.name, d.id]));

  // Users -> profiles (trigger makes them employees) -> promote/assign dept
  log("Creating users…");
  const idByEmail = {};
  for (const p of PEOPLE) {
    const { data, error } = await sb.auth.admin.createUser({
      email: p.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: p.name },
    });
    if (error) throw new Error(`createUser ${p.email}: ${error.message}`);
    idByEmail[p.email] = data.user.id;
  }
  // small wait so handle_new_user trigger has inserted profiles
  await new Promise((r) => setTimeout(r, 1500));
  for (const p of PEOPLE) {
    const { error } = await sb.from("profiles")
      .update({ full_name: p.name, role: p.role, department_id: deptId[p.dept] })
      .eq("id", idByEmail[p.email]);
    if (error) throw new Error(`profile ${p.email}: ${error.message}`);
  }
  // Department heads
  for (const [dept, email] of Object.entries(HEADS))
    await sb.from("departments").update({ head_id: idByEmail[email] }).eq("id", deptId[dept]);

  // Categories
  log("Creating categories…");
  const { data: catRows, error: ce } = await sb.from("asset_categories").insert(CATEGORIES).select();
  if (ce) throw ce;
  const catId = Object.fromEntries(catRows.map((c) => [c.name, c.id]));

  // Assets
  log("Creating assets…");
  const assetPayload = ASSETS.map(([name, cat, location, condition, status, bookable, cost], i) => ({
    name, category_id: catId[cat], location, condition, status,
    is_bookable: bookable, acquisition_cost: cost,
    serial_number: `SN-${cat.slice(0, 3).toUpperCase()}-${1000 + i}`,
    acquisition_date: iso(daysFromNow(-Math.floor(Math.random() * 900) - 60)).slice(0, 10),
    department_id: deptId[["Engineering", "IT", "Facilities", "Field Ops", "Operations"][i % 5]],
  }));
  const { data: assetRows, error: ae } = await sb.from("assets").insert(assetPayload).select();
  if (ae) throw ae;
  const asset = Object.fromEntries(assetRows.map((a) => [a.name, a]));
  const A = (n) => asset[n];

  // Allocations (trigger flips asset -> allocated). A couple are overdue.
  log("Allocating assets…");
  const allocs = [
    { name: "Dell Latitude 7440", to: "priya@assetflow.dev", by: "rhea.manager@assetflow.dev", ret: 20 },
    { name: "MacBook Pro 14", to: "arjun@assetflow.dev", by: "rhea.manager@assetflow.dev", ret: -3 },   // overdue
    { name: "Lenovo ThinkPad X1", to: "raj@assetflow.dev", by: "rhea.manager@assetflow.dev", ret: 10 },
    { name: "iPad Air", to: "sana@assetflow.dev", by: "karan.manager@assetflow.dev", ret: -6 },          // overdue
    { name: "Canon DSLR EOS 90D", to: "neha@assetflow.dev", by: "rhea.manager@assetflow.dev", ret: 5 },
    { name: "Power Drill Set", to: "sana@assetflow.dev", by: "karan.manager@assetflow.dev", ret: 30 },
    { name: "Standing Desk Oakwood", to: "vikram@assetflow.dev", by: "rhea.manager@assetflow.dev", ret: null },
  ];
  for (const al of allocs) {
    await sb.from("allocations").insert({
      asset_id: A(al.name).id, holder_type: "employee",
      holder_employee_id: idByEmail[al.to], allocated_by: idByEmail[al.by],
      expected_return_date: al.ret == null ? null : iso(daysFromNow(al.ret)).slice(0, 10),
      allocated_at: iso(daysFromNow(-25)),
    });
  }

  // Some assets in special states
  log("Setting special asset states…");
  await sb.from("assets").update({ status: "under_maintenance" }).eq("id", A("Forklift Toyota 8FG").id);
  await sb.from("assets").update({ status: "reserved" }).eq("id", A("BenQ Projector").id);
  await sb.from("assets").update({ status: "lost" }).eq("id", A("HP LaserJet Pro").id);
  await sb.from("assets").update({ status: "retired", condition: "poor" }).eq("id", A("Filing Cabinet Steel").id);

  // Bookings (half-open ranges; the classic Room B2 9-10 case)
  log("Creating bookings…");
  const bookings = [
    { name: "Conference Room B2", by: "neha@assetflow.dev", purpose: "Procurement sync", s: atToday(9), e: atToday(10) },
    { name: "Conference Room B2", by: "priya@assetflow.dev", purpose: "Sprint review", s: atToday(14), e: atToday(15) },
    { name: "Conference Room A1", by: "aditi.head@assetflow.dev", purpose: "Design workshop", s: atToday(11), e: atToday(12, 30) },
    { name: "Toyota Innova", by: "sana@assetflow.dev", purpose: "Site visit — Whitefield", s: daysFromNow(1), e: daysFromNow(1) },
    { name: "Epson Projector EB-2247U", by: "arjun@assetflow.dev", purpose: "Client demo", s: atToday(16), e: atToday(17) },
  ];
  bookings[3].e = new Date(bookings[3].s.getTime() + 5 * 3600e3);
  for (const b of bookings) {
    await sb.from("bookings").insert({
      resource_id: A(b.name).id, booked_by: idByEmail[b.by], purpose: b.purpose,
      starts_at: iso(b.s), ends_at: iso(b.e), status: "upcoming",
    });
  }

  // Maintenance across the workflow
  log("Creating maintenance requests…");
  const maint = [
    { name: "HP EliteBook 840", by: "priya@assetflow.dev", issue: "Battery drains in 30 min", priority: "high", status: "pending" },
    { name: "Mahindra Bolero Pickup", by: "sana@assetflow.dev", issue: "Noisy compressor / AC not cooling", priority: "medium", status: "approved" },
    { name: "Forklift Toyota 8FG", by: "sana@assetflow.dev", issue: "Hydraulic leak", priority: "critical", status: "in_progress", tech: "R. Varma" },
    { name: "Generator 15kVA", by: "vikram@assetflow.dev", issue: "Won't start on first crank", priority: "medium", status: "tech_assigned", tech: "S. Kumar" },
    { name: "Reception Sofa", by: "neha@assetflow.dev", issue: "Torn armrest fabric", priority: "low", status: "resolved" },
  ];
  for (const m of maint) {
    await sb.from("maintenance_requests").insert({
      asset_id: A(m.name).id, raised_by: idByEmail[m.by], issue: m.issue,
      priority: m.priority, status: m.status, technician_name: m.tech ?? null,
      approver_id: m.status === "pending" ? null : idByEmail["rhea.manager@assetflow.dev"],
      resolved_at: m.status === "resolved" ? iso(daysFromNow(-2)) : null,
    });
  }
  // keep the "approved" asset actually under maintenance
  await sb.from("assets").update({ status: "under_maintenance" }).eq("id", A("Mahindra Bolero Pickup").id);

  // Pending transfer request (Raj wants Priya's laptop)
  log("Creating transfer request…");
  await sb.from("transfer_requests").insert({
    asset_id: A("Dell Latitude 7440").id, from_label: "Priya Shah (Engineering)",
    to_employee_id: idByEmail["raj@assetflow.dev"], requested_by: idByEmail["raj@assetflow.dev"],
    reason: "Priya rolling off project; needed for IT onboarding", status: "requested",
  });

  // Audit cycle (open) over Engineering
  log("Creating audit cycle…");
  const { data: cyc } = await sb.from("audit_cycles").insert({
    name: "Q3 Audit — Engineering Dept", scope_department_id: deptId["Engineering"],
    start_date: iso(daysFromNow(-2)).slice(0, 10), end_date: iso(daysFromNow(12)).slice(0, 10),
    status: "open", created_by: idByEmail["admin@assetflow.dev"],
  }).select().single();
  await sb.from("audit_assignments").insert([
    { cycle_id: cyc.id, auditor_id: idByEmail["aditi.head@assetflow.dev"] },
    { cycle_id: cyc.id, auditor_id: idByEmail["sana@assetflow.dev"] },
  ]);
  const engAssets = assetRows.filter((a) => a.department_id === deptId["Engineering"]).slice(0, 8);
  await sb.from("audit_items").insert(engAssets.map((a, i) => ({
    cycle_id: cyc.id, asset_id: a.id, expected_location: a.location,
    verification: i === 0 ? "verified" : i === 1 ? "damaged" : "pending",
  })));

  // A few notifications + activity
  log("Creating notifications & activity…");
  await sb.from("notifications").insert([
    { user_id: idByEmail["priya@assetflow.dev"], type: "asset_assigned", message: "You were allocated Dell Latitude 7440", link: "/allocation" },
    { user_id: idByEmail["raj@assetflow.dev"], type: "transfer_requested", message: "Your transfer request is pending approval", link: "/allocation" },
    { user_id: idByEmail["sana@assetflow.dev"], type: "overdue_return", message: "iPad Air return is overdue", link: "/allocation" },
    { user_id: idByEmail["rhea.manager@assetflow.dev"], type: "maintenance_pending", message: "New maintenance request awaiting approval", link: "/maintenance" },
  ]);
  await sb.from("activity_log").insert([
    { actor_id: idByEmail["rhea.manager@assetflow.dev"], action: "allocated asset", entity: "asset", meta: { tag: A("Dell Latitude 7440").tag, to: "Priya Shah" } },
    { actor_id: idByEmail["neha@assetflow.dev"], action: "booked resource", entity: "booking", meta: { resource: "Conference Room B2" } },
    { actor_id: idByEmail["admin@assetflow.dev"], action: "opened audit cycle", entity: "audit", meta: { name: cyc.name } },
  ]);

  log("\n✅ Seed complete.");
  log(`   ${PEOPLE.length} users · ${DEPARTMENTS.length} departments · ${assetRows.length} assets`);
  log("   Login: admin@assetflow.dev / Password123!  (also rhea.manager@, aditi.head@, priya@, raj@ …)");
}

main().catch((e) => { console.error("Seed failed:", e.message || e); process.exit(1); });
