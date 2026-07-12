"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { raiseMaintenance, setMaintenanceStatus } from "@/app/(app)/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { MaintStatus } from "@/lib/types";
import { PlusCircle, Loader2, Check, X } from "lucide-react";

type Req = {
  id: string; issue: string; priority: string; status: MaintStatus; technician_name: string | null;
  created_at: string; asset: { tag: string; name: string } | null; raiser: { full_name: string } | null;
};
type AssetLite = { id: string; tag: string; name: string };

const COLUMNS: { key: MaintStatus; label: string; accent: string }[] = [
  { key: "pending", label: "Pending", accent: "border-t-amber-400" },
  { key: "approved", label: "Approved", accent: "border-t-blue-400" },
  { key: "tech_assigned", label: "Technician Assigned", accent: "border-t-violet-400" },
  { key: "in_progress", label: "In Progress", accent: "border-t-indigo-400" },
  { key: "resolved", label: "Resolved", accent: "border-t-emerald-400" },
];

const PRIORITY: Record<string, string> = {
  low: "bg-slate-100 text-slate-600", medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700", critical: "bg-red-100 text-red-700",
};

export function MaintenanceClient({ requests, assets, canManage }: {
  requests: Req[]; assets: AssetLite[]; canManage: boolean;
}) {
  const router = useRouter();
  const [raising, setRaising] = useState(false);
  const [assigning, setAssigning] = useState<Req | null>(null);
  const rejected = requests.filter((r) => r.status === "rejected");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Maintenance Board</h2>
          <p className="text-sm text-muted-foreground">Approval-gated repair workflow. Approving moves the asset to Under Maintenance.</p>
        </div>
        <Button onClick={() => setRaising(true)}><PlusCircle /> Raise Request</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const items = requests.filter((r) => r.status === col.key);
          return (
            <div key={col.key} className={cn("rounded-lg border border-t-4 bg-secondary/40", col.accent)}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2 p-2 pt-0">
                {items.map((r) => (
                  <Card key={r.id} req={r} canManage={canManage}
                    onAssign={() => setAssigning(r)} onDone={() => router.refresh()} />
                ))}
                {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>

      {rejected.length > 0 && (
        <div className="rounded-lg border bg-card p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Rejected</h3>
          <div className="flex flex-wrap gap-2">
            {rejected.map((r) => (
              <span key={r.id} className="rounded-md bg-red-50 px-2.5 py-1 text-xs text-red-700">
                {r.asset?.tag} · {r.issue}
              </span>
            ))}
          </div>
        </div>
      )}

      {raising && <RaiseModal assets={assets} onClose={() => setRaising(false)} onDone={() => { setRaising(false); router.refresh(); }} />}
      {assigning && <AssignModal req={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); router.refresh(); }} />}
    </div>
  );
}

function Card({ req, canManage, onAssign, onDone }: {
  req: Req; canManage: boolean; onAssign: () => void; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const move = async (status: MaintStatus) => { setBusy(true); await setMaintenanceStatus(req.id, status); setBusy(false); onDone(); };

  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-medium text-muted-foreground">{req.asset?.tag}</span>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", PRIORITY[req.priority])}>{req.priority}</span>
      </div>
      <p className="mt-1 text-sm font-medium leading-tight">{req.asset?.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{req.issue}</p>
      {req.technician_name && <p className="mt-1 text-xs text-violet-600">Tech: {req.technician_name}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">by {req.raiser?.full_name ?? "—"}</p>

      {canManage && req.status !== "resolved" && req.status !== "rejected" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : (
            <>
              {req.status === "pending" && (
                <>
                  <Button size="sm" variant="success" onClick={() => move("approved")}><Check /> Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => move("rejected")}><X /> Reject</Button>
                </>
              )}
              {req.status === "approved" && <Button size="sm" onClick={onAssign}>Assign Technician</Button>}
              {req.status === "tech_assigned" && <Button size="sm" onClick={() => move("in_progress")}>Start Work</Button>}
              {req.status === "in_progress" && <Button size="sm" variant="success" onClick={() => move("resolved")}>Resolve</Button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RaiseModal({ assets, onClose, onDone }: { assets: AssetLite[]; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await raiseMaintenance({
      asset_id: String(fd.get("asset")),
      issue: String(fd.get("issue")),
      priority: String(fd.get("priority")),
      photo_url: (fd.get("photo") as string) || null,
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else onDone();
  }
  return (
    <Modal open onClose={onClose} title="Raise Maintenance Request" description="Describe the issue. It must be approved before repair work begins.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Asset</Label>
          <Select name="asset" required>
            <option value="">Select asset…</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} · {a.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Issue</Label>
          <Textarea name="issue" required placeholder="Describe the problem…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select name="priority" defaultValue="medium">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Photo URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input name="photo" placeholder="https://…" />
          </div>
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Submit Request</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignModal({ req, onClose, onDone }: { req: Req; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await setMaintenanceStatus(req.id, "tech_assigned", String(fd.get("tech")));
    setSaving(false); onDone();
  }
  return (
    <Modal open onClose={onClose} title="Assign Technician" description={`${req.asset?.tag} · ${req.asset?.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Technician name</Label>
          <Input name="tech" required placeholder="R. Varma" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Assign</Button>
        </div>
      </form>
    </Modal>
  );
}
