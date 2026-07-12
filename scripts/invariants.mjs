import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import WebSocket from "ws";
globalThis.WebSocket ??= WebSocket;
config({ path: ".env.local" });
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const at = (h,m=0)=>{const d=new Date();d.setHours(h,m,0,0);return d.toISOString();};

// ---- Booking overlap (as employee priya) ----
const priya = createClient(U, K);
const { data: pa } = await priya.auth.signInWithPassword({ email:"priya@assetflow.dev", password:"Password123!" });
const { data: b2 } = await priya.from("assets").select("id").eq("name","Conference Room B2").single();

const tryBook = async (s,e,label) => {
  const { error } = await priya.from("bookings").insert({ resource_id:b2.id, booked_by:pa.user.id, purpose:label, starts_at:s, ends_at:e });
  return error;
};
const e930 = await tryBook(at(9,30), at(10,30), "overlap test"); // overlaps existing 9-10
console.log("book 9:30-10:30 (overlaps 9-10):", e930 ? "REJECTED ✓ ("+e930.code+")" : "ACCEPTED ✗ LEAK");
const e10 = await tryBook(at(10,0), at(11,0), "boundary test"); // starts exactly at 10:00
console.log("book 10:00-11:00 (touches boundary):", e10 ? "REJECTED ✗ ("+e10.message+")" : "ACCEPTED ✓");
// cleanup the boundary booking we just made
if (!e10) await priya.from("bookings").delete().eq("resource_id", b2.id).eq("purpose","boundary test");

// ---- Double allocation (as asset_manager rhea) ----
const rhea = createClient(U, K);
await rhea.auth.signInWithPassword({ email:"rhea.manager@assetflow.dev", password:"Password123!" });
const { data: laptop } = await rhea.from("assets").select("id,tag,status").eq("name","Dell Latitude 7440").single();
const { data: raj } = await rhea.from("profiles").select("id").eq("email","raj@assetflow.dev").single();
const { error: ea } = await rhea.from("allocations").insert({ asset_id:laptop.id, holder_type:"employee", holder_employee_id:raj.id });
console.log(`allocate already-held ${laptop.tag} (status=${laptop.status}) to Raj:`, ea ? "BLOCKED ✓ ("+ea.code+")" : "ALLOCATED ✗ LEAK");
