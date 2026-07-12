import { createClient } from "@/utils/supabase/server";
import { BookingClient } from "@/components/booking/booking-client";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const supabase = await createClient();
  const [{ data: resources }, { data: bookings }] = await Promise.all([
    supabase.from("assets").select("id, tag, name, location").eq("is_bookable", true).order("name"),
    supabase.from("bookings")
      .select("id, purpose, starts_at, ends_at, status, resource_id, booker:profiles!bookings_booked_by_fkey(full_name)")
      .neq("status", "cancelled").order("starts_at"),
  ]);

  return (
    <BookingClient
      resources={(resources ?? []) as never}
      bookings={(bookings ?? []) as never}
    />
  );
}
