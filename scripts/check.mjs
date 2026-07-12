import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import WebSocket from "ws";
globalThis.WebSocket ??= WebSocket;
config({ path: ".env.local" });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// Sign in as a normal employee -> exercises RLS as that user
const { data: auth, error: e1 } = await anon.auth.signInWithPassword({ email: "priya@assetflow.dev", password: "Password123!" });
if (e1) { console.log("LOGIN FAIL", e1.message); process.exit(1); }
console.log("login OK as", auth.user.email);
const today = new Date().toISOString().slice(0,10);
const cnt = async (t, f) => { let q = anon.from(t).select("*",{count:"exact",head:true}); q = f(q); const {count}=await q; return count; };
console.log("assets available:", await cnt("assets", q=>q.eq("status","available")));
console.log("assets allocated:", await cnt("assets", q=>q.eq("status","allocated")));
console.log("open maintenance:", await cnt("maintenance_requests", q=>q.in("status",["pending","approved","tech_assigned","in_progress"])));
console.log("active bookings:", await cnt("bookings", q=>q.in("status",["upcoming","ongoing"])));
console.log("pending transfers:", await cnt("transfer_requests", q=>q.eq("status","requested")));
console.log("overdue allocations:", await cnt("allocations", q=>q.eq("status","active").lt("expected_return_date",today)));
// RLS check: priya should see ONLY her own notifications
const { data: notifs } = await anon.from("notifications").select("message");
console.log("priya notifications visible (RLS):", notifs?.length, notifs?.map(n=>n.message));
// RLS check: employee cannot register an asset (mgr_write policy)
const { error: e2 } = await anon.from("assets").insert({ name: "HACK asset" });
console.log("employee asset insert blocked by RLS:", e2 ? "YES ("+e2.code+")" : "NO — LEAK!");
