"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, cancelBooking } from "@/app/(app)/booking/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarPlus, Loader2, MapPin, Clock, X } from "lucide-react";

type Resource = { id: string; tag: string; name: string; location: string | null };
type Booking = {
  id: string; purpose: string | null; starts_at: string; ends_at: string; status: string;
  resource_id: string; booker: { full_name: string } | null;
};

const DAY_START = 7; // 07:00
const DAY_END = 20; // 20:00
const HOUR_PX = 48;
const sameDay = (iso: string, ymd: string) => iso.slice(0, 10) === ymd;
const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function statusOf(b: Booking): { label: string; className: string } {
  const now = Date.now();
  if (new Date(b.ends_at).getTime() < now) return { label: "Completed", className: "bg-slate-200 text-slate-600 ring-slate-500/20" };
  if (new Date(b.starts_at).getTime() <= now) return { label: "Ongoing", className: "bg-emerald-100 text-emerald-700 ring-emerald-600/20" };
  return { label: "Upcoming", className: "bg-blue-100 text-blue-700 ring-blue-600/20" };
}

export function BookingClient({ resources, bookings }: { resources: Resource[]; bookings: Booking[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(resources[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [booking, setBooking] = useState(false);
  const active = resources.find((r) => r.id === activeId);

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.resource_id === activeId && sameDay(b.starts_at, date)),
    [bookings, activeId, date],
  );

  if (resources.length === 0)
    return <p className="text-sm text-muted-foreground">No bookable resources yet. Mark an asset as shared/bookable to book it.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Resource list */}
      <div className="space-y-2">
        <h3 className="px-1 text-sm font-semibold text-muted-foreground">Resources</h3>
        {resources.map((r) => (
          <button key={r.id} onClick={() => setActiveId(r.id)}
            className={cn("w-full rounded-lg border p-3 text-left transition-colors",
              activeId === r.id ? "border-primary bg-accent" : "bg-card hover:bg-secondary")}>
            <p className="font-medium">{r.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{r.location ?? "—"}</p>
          </button>
        ))}
      </div>

      {/* Calendar + bookings */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{active?.name}</h2>
            <p className="text-sm text-muted-foreground">{dayBookings.length} booking(s) on {new Date(date).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            <Button onClick={() => setBooking(true)}><CalendarPlus /> Book a slot</Button>
          </div>
        </div>

        {/* Day timeline */}
        <div className="rounded-lg border bg-card p-4 shadow-card">
          <div className="relative" style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
            {Array.from({ length: DAY_END - DAY_START + 1 }).map((_, i) => (
              <div key={i} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: i * HOUR_PX }}>
                <span className="w-12 -translate-y-2 text-right text-xs text-muted-foreground">{String(DAY_START + i).padStart(2, "0")}:00</span>
                <div className="flex-1 border-t border-dashed border-border" />
              </div>
            ))}
            {dayBookings.map((b) => {
              const s = new Date(b.starts_at), e = new Date(b.ends_at);
              const top = (s.getHours() + s.getMinutes() / 60 - DAY_START) * HOUR_PX;
              const height = Math.max(24, ((e.getTime() - s.getTime()) / 3.6e6) * HOUR_PX);
              const st = statusOf(b);
              return (
                <div key={b.id} className="absolute left-16 right-2 overflow-hidden rounded-md border border-primary/30 bg-accent p-2 text-xs shadow-sm"
                  style={{ top, height }}>
                  <p className="font-semibold text-accent-foreground">{b.purpose || "Booking"}</p>
                  <p className="text-muted-foreground">{fmt(b.starts_at)}–{fmt(b.ends_at)} · {b.booker?.full_name}</p>
                  <span className={cn("absolute right-1 top-1 rounded px-1 text-[10px]", st.className)}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list with cancel */}
        <div className="rounded-lg border bg-card shadow-card">
          <div className="border-b p-4"><h3 className="flex items-center gap-2 font-semibold"><Clock className="size-4" /> All bookings for {active?.name}</h3></div>
          <div className="divide-y">
            {bookings.filter((b) => b.resource_id === activeId).map((b) => {
              const st = statusOf(b);
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{b.purpose || "Booking"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.starts_at).toLocaleDateString()} · {fmt(b.starts_at)}–{fmt(b.ends_at)} · {b.booker?.full_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={st.className}>{st.label}</Badge>
                    {st.label === "Upcoming" && (
                      <Button size="sm" variant="ghost" onClick={async () => { await cancelBooking(b.id); router.refresh(); }}>
                        <X /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {bookings.filter((b) => b.resource_id === activeId).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No bookings for this resource.</p>
            )}
          </div>
        </div>
      </div>

      {booking && active && (
        <BookModal resource={active} defaultDate={date} onClose={() => setBooking(false)} onDone={() => { setBooking(false); router.refresh(); }} />
      )}
    </div>
  );
}

function BookModal({ resource, defaultDate, onClose, onDone }: {
  resource: Resource; defaultDate: string; onClose: () => void; onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const d = String(fd.get("date")), s = String(fd.get("start")), en = String(fd.get("end"));
    const res = await createBooking({
      resource_id: resource.id,
      purpose: String(fd.get("purpose") || ""),
      starts_at: new Date(`${d}T${s}`).toISOString(),
      ends_at: new Date(`${d}T${en}`).toISOString(),
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else onDone();
  }
  return (
    <Modal open onClose={onClose} title={`Book ${resource.name}`} description="Overlapping slots are automatically rejected.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input name="date" type="date" defaultValue={defaultDate} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Start</Label><Input name="start" type="time" defaultValue="09:00" required /></div>
          <div className="space-y-1.5"><Label>End</Label><Input name="end" type="time" defaultValue="10:00" required /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Purpose</Label>
          <Input name="purpose" placeholder="Sprint review, client demo…" />
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Book slot</Button>
        </div>
      </form>
    </Modal>
  );
}
