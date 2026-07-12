"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuditCycle, markAuditItem, closeAuditCycle } from "@/app/(app)/audit/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ClipboardCheck, PlusCircle, Loader2, Lock, AlertTriangle } from "lucide-react";

type Cycle = { id: string; name: string; status: string; start_date: string | null; end_date: string | null; scope_location: string | null; dept: { name: string } | null };
type Item = { id: string; cycle_id: string; verification: string; expected_location: string | null; asset: { tag: string; name: string } | null };
type Assignment = { cycle_id: string; auditor: { full_name: string } | null };
type Dept = { id: string; name: string };
type Emp = { id: string; full_name: string };

const V_META: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 ring-slate-500/20",
  verified: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  missing: "bg-red-100 text-red-700 ring-red-600/20",
  damaged: "bg-amber-100 text-amber-700 ring-amber-600/20",
};

export function AuditClient({ cycles, items, assignments, departments, employees, isAdmin }: {
  cycles: Cycle[]; items: Item[]; assignments: Assignment[]; departments: Dept[]; employees: Emp[]; isAdmin: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(cycles[0]?.id ?? null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Audit Cycles</h2>
          <p className="text-sm text-muted-foreground">Structured verification with auto-generated discrepancy reports.</p>
        </div>
        {isAdmin && <Button onClick={() => setCreating(true)}><PlusCircle /> New Audit Cycle</Button>}
      </div>

      <div className="space-y-4">
        {cycles.map((c) => {
          const cItems = items.filter((i) => i.cycle_id === c.id);
          const auditors = assignments.filter((a) => a.cycle_id === c.id).map((a) => a.auditor?.full_name).filter(Boolean);
          const done = cItems.filter((i) => i.verification !== "pending").length;
          const flagged = cItems.filter((i) => i.verification === "missing" || i.verification === "damaged");
          const open = openId === c.id;
          return (
            <div key={c.id} className="rounded-lg border bg-card shadow-card">
              <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-primary" />
                    <span className="font-semibold">{c.name}</span>
                    <Badge className={c.status === "open" ? "bg-blue-100 text-blue-700 ring-blue-600/20" : "bg-slate-200 text-slate-600 ring-slate-500/20"}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.dept?.name ?? c.scope_location ?? "All"} · {c.start_date} → {c.end_date} · Auditors: {auditors.join(", ") || "—"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{done}/{cItems.length} checked</p>
                  {flagged.length > 0 && <p className="text-xs text-destructive">{flagged.length} discrepancies</p>}
                </div>
              </button>

              {open && (
                <div className="border-t p-4">
                  {flagged.length > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      <AlertTriangle className="size-4" />
                      Discrepancy report: {flagged.length} item(s) flagged — {flagged.map((f) => `${f.asset?.tag} (${f.verification})`).join(", ")}
                    </div>
                  )}
                  <Table>
                    <THead><TR><TH>Asset</TH><TH>Expected Location</TH><TH>Verification</TH>{c.status === "open" && <TH className="text-right pr-4">Mark</TH>}</TR></THead>
                    <TBody>
                      {cItems.map((i) => (
                        <TR key={i.id}>
                          <TD className="font-medium"><span className="font-mono text-xs text-muted-foreground">{i.asset?.tag}</span> · {i.asset?.name}</TD>
                          <TD className="text-muted-foreground">{i.expected_location ?? "—"}</TD>
                          <TD><Badge className={V_META[i.verification]}>{i.verification}</Badge></TD>
                          {c.status === "open" && (
                            <TD className="pr-4 text-right">
                              <MarkButtons itemId={i.id} onDone={() => router.refresh()} />
                            </TD>
                          )}
                        </TR>
                      ))}
                      {cItems.length === 0 && <TR><TD colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No items in scope.</TD></TR>}
                    </TBody>
                  </Table>
                  {isAdmin && c.status === "open" && (
                    <div className="mt-3 flex justify-end">
                      <CloseButton cycleId={c.id} onDone={() => router.refresh()} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {cycles.length === 0 && <p className="text-sm text-muted-foreground">No audit cycles yet.</p>}
      </div>

      {creating && <CreateModal departments={departments} employees={employees} onClose={() => setCreating(false)} onDone={() => { setCreating(false); router.refresh(); }} />}
    </div>
  );
}

function MarkButtons({ itemId, onDone }: { itemId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const mark = async (v: "verified" | "missing" | "damaged") => { setBusy(true); await markAuditItem(itemId, v); setBusy(false); onDone(); };
  if (busy) return <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />;
  return (
    <div className="flex justify-end gap-1">
      <button onClick={() => mark("verified")} className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Verified</button>
      <button onClick={() => mark("missing")} className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Missing</button>
      <button onClick={() => mark("damaged")} className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50">Damaged</button>
    </div>
  );
}

function CloseButton({ cycleId, onDone }: { cycleId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await closeAuditCycle(cycleId); setBusy(false); onDone(); }}>
      {busy ? <Loader2 className="animate-spin" /> : <Lock />} Close Cycle (missing → Lost)
    </Button>
  );
}

function CreateModal({ departments, employees, onClose, onDone }: {
  departments: Dept[]; employees: Emp[]; onClose: () => void; onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditors, setAuditors] = useState<string[]>([]);
  const toggle = (id: string) => setAuditors((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await createAuditCycle({
      name: String(fd.get("name")),
      scope_department_id: (fd.get("dept") as string) || null,
      scope_location: null,
      start_date: (fd.get("start") as string) || null,
      end_date: (fd.get("end") as string) || null,
      auditor_ids: auditors,
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else onDone();
  }
  return (
    <Modal open onClose={onClose} title="New Audit Cycle" description="Assets in scope are auto-added to the checklist.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Name</Label><Input name="name" required placeholder="Q3 Audit — Engineering" /></div>
        <div className="space-y-1.5">
          <Label>Scope department</Label>
          <Select name="dept"><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Start</Label><Input name="start" type="date" /></div>
          <div className="space-y-1.5"><Label>End</Label><Input name="end" type="date" /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Auditors</Label>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
            {employees.map((e) => (
              <label key={e.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-secondary">
                <input type="checkbox" checked={auditors.includes(e.id)} onChange={() => toggle(e.id)} className="size-4" />
                {e.full_name}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Create Cycle</Button>
        </div>
      </form>
    </Modal>
  );
}
