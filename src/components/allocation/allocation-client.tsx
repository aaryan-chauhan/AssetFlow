"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { allocateAsset, requestTransfer, resolveTransfer, returnAsset } from "@/app/(app)/allocation/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, PlusCircle, Loader2, AlertTriangle, Check, X, Undo2 } from "lucide-react";

type Emp = { id: string; full_name: string; email: string };
type AssetLite = { id: string; tag: string; name: string; status: string };
type Active = {
  id: string; allocated_at: string; expected_return_date: string | null;
  asset: { id: string; tag: string; name: string } | null; holder: { full_name: string } | null;
};
type Transfer = {
  id: string; reason: string; from_label: string; status: string; created_at: string;
  asset: { tag: string; name: string } | null; to: { full_name: string } | null; requester: { full_name: string } | null;
};

export function AllocationClient({
  today, active, transfers, employees, assets, canManage, canApprove,
}: {
  today: string; active: Active[]; transfers: Transfer[]; employees: Emp[]; assets: AssetLite[];
  canManage: boolean; canApprove: boolean;
}) {
  const router = useRouter();
  const [allocOpen, setAllocOpen] = useState(false);
  const [returning, setReturning] = useState<Active | null>(null);

  const holderByAsset = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of active) if (a.asset) m[a.asset.id] = a.holder?.full_name ?? "someone";
    return m;
  }, [active]);

  const pending = transfers.filter((t) => t.status === "requested");
  const resolved = transfers.filter((t) => t.status !== "requested");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Allocation & Transfer</h2>
          <p className="text-sm text-muted-foreground">{active.length} active allocations · {pending.length} transfer requests pending</p>
        </div>
        {canManage && <Button onClick={() => setAllocOpen(true)}><PlusCircle /> Allocate Asset</Button>}
      </div>

      {/* Active allocations */}
      <div className="rounded-lg border bg-card shadow-card">
        <div className="border-b p-4"><h3 className="font-semibold">Active Allocations</h3></div>
        <Table>
          <THead><TR><TH>Asset</TH><TH>Holder</TH><TH>Allocated</TH><TH>Expected Return</TH><TH className="pr-4 text-right">Action</TH></TR></THead>
          <TBody>
            {active.map((a) => {
              const overdue = a.expected_return_date && a.expected_return_date < today;
              return (
                <TR key={a.id}>
                  <TD className="font-medium"><span className="font-mono text-xs text-muted-foreground">{a.asset?.tag}</span> · {a.asset?.name}</TD>
                  <TD>{a.holder?.full_name ?? "—"}</TD>
                  <TD className="text-muted-foreground">{new Date(a.allocated_at).toLocaleDateString()}</TD>
                  <TD>
                    {a.expected_return_date ? (
                      <span className={overdue ? "font-medium text-destructive" : ""}>
                        {new Date(a.expected_return_date).toLocaleDateString()}
                        {overdue && <Badge className="ml-2 bg-red-100 text-red-700 ring-red-600/20">Overdue</Badge>}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TD>
                  <TD className="pr-4 text-right">
                    {canManage && <Button size="sm" variant="outline" onClick={() => setReturning(a)}><Undo2 /> Return</Button>}
                  </TD>
                </TR>
              );
            })}
            {active.length === 0 && <TR><TD colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No active allocations.</TD></TR>}
          </TBody>
        </Table>
      </div>

      {/* Transfer requests */}
      <div className="rounded-lg border bg-card shadow-card">
        <div className="border-b p-4"><h3 className="flex items-center gap-2 font-semibold"><ArrowLeftRight className="size-4" /> Transfer Requests</h3></div>
        <div className="divide-y">
          {pending.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium"><span className="font-mono text-xs text-muted-foreground">{t.asset?.tag}</span> · {t.asset?.name}</p>
                <p className="text-sm text-muted-foreground">
                  From <strong>{t.from_label}</strong> → <strong>{t.to?.full_name}</strong>
                  {t.reason && <span> · {t.reason}</span>}
                </p>
                <p className="text-xs text-muted-foreground">Requested by {t.requester?.full_name} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
              </div>
              {canApprove ? (
                <div className="flex gap-2">
                  <ResolveButton id={t.id} approve onDone={() => router.refresh()} />
                  <ResolveButton id={t.id} approve={false} onDone={() => router.refresh()} />
                </div>
              ) : <Badge className="bg-amber-100 text-amber-700 ring-amber-600/20">Pending approval</Badge>}
            </div>
          ))}
          {pending.length === 0 && <p className="p-4 text-sm text-muted-foreground">No pending transfer requests.</p>}
          {resolved.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-4 opacity-70">
              <p className="text-sm"><span className="font-mono text-xs text-muted-foreground">{t.asset?.tag}</span> · {t.asset?.name} → {t.to?.full_name}</p>
              <Badge className={t.status === "approved" ? "bg-emerald-100 text-emerald-700 ring-emerald-600/20" : "bg-slate-200 text-slate-600 ring-slate-500/20"}>{t.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {allocOpen && (
        <AllocateModal
          assets={assets} employees={employees} holderByAsset={holderByAsset}
          onClose={() => setAllocOpen(false)} onDone={() => { setAllocOpen(false); router.refresh(); }}
        />
      )}
      {returning && (
        <ReturnModal alloc={returning} onClose={() => setReturning(null)} onDone={() => { setReturning(null); router.refresh(); }} />
      )}
    </div>
  );
}

function ResolveButton({ id, approve, onDone }: { id: string; approve: boolean; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button size="sm" variant={approve ? "success" : "outline"} disabled={loading}
      onClick={async () => { setLoading(true); await resolveTransfer(id, approve); setLoading(false); onDone(); }}>
      {loading ? <Loader2 className="animate-spin" /> : approve ? <Check /> : <X />}
      {approve ? "Approve" : "Reject"}
    </Button>
  );
}

function AllocateModal({ assets, employees, holderByAsset, onClose, onDone }: {
  assets: AssetLite[]; employees: Emp[]; holderByAsset: Record<string, string>;
  onClose: () => void; onDone: () => void;
}) {
  const [assetId, setAssetId] = useState("");
  const [mode, setMode] = useState<"allocate" | "transfer">("allocate");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const asset = assets.find((a) => a.id === assetId);
  const conflict = asset?.status === "allocated";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = mode === "transfer"
      ? await requestTransfer({ asset_id: assetId, to_employee_id: String(fd.get("to")), reason: String(fd.get("reason") || "") })
      : await allocateAsset({ asset_id: assetId, holder_employee_id: String(fd.get("to")), expected_return_date: (fd.get("ret") as string) || null });
    setSaving(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <Modal open onClose={onClose} title="Allocate Asset" description="Assign an asset to an employee. Already-held assets require a transfer request.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Asset</Label>
          <Select value={assetId} onChange={(e) => { setAssetId(e.target.value); setMode("allocate"); setError(null); }} required>
            <option value="">Select an asset…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.tag} · {a.name} ({a.status})</option>
            ))}
          </Select>
        </div>

        {conflict && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="size-4" /> Currently held by {holderByAsset[assetId] ?? "another employee"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Direct re-allocation is blocked. Submit a transfer request instead.</p>
            {mode === "allocate" && (
              <Button type="button" size="sm" className="mt-2" onClick={() => setMode("transfer")}>
                <ArrowLeftRight /> Request Transfer instead
              </Button>
            )}
          </div>
        )}

        {assetId && (!conflict || mode === "transfer") && (
          <>
            <div className="space-y-1.5">
              <Label>{mode === "transfer" ? "Transfer to" : "Allocate to"}</Label>
              <Select name="to" required>
                <option value="">Select employee…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </Select>
            </div>
            {mode === "transfer" ? (
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea name="reason" placeholder="Why is this transfer needed?" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Expected return date <span className="text-muted-foreground">(optional)</span></Label>
                <Input name="ret" type="date" />
              </div>
            )}
          </>
        )}

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {assetId && (!conflict || mode === "transfer") && (
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {mode === "transfer" ? "Submit Transfer Request" : "Allocate"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function ReturnModal({ alloc, onClose, onDone }: { alloc: Active; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await returnAsset({ allocation_id: alloc.id, condition: String(fd.get("condition")), notes: String(fd.get("notes") || "") });
    setSaving(false);
    if (res.error) setError(res.error);
    else onDone();
  }
  return (
    <Modal open onClose={onClose} title="Process Return" description={`${alloc.asset?.tag} · ${alloc.asset?.name} from ${alloc.holder?.full_name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Condition on check-in</Label>
          <Select name="condition" defaultValue="good">
            <option value="new">New</option><option value="good">Good</option>
            <option value="fair">Fair</option><option value="poor">Poor</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Check-in notes <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea name="notes" placeholder="Any damage or observations…" />
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Mark Returned</Button>
        </div>
      </form>
    </Modal>
  );
}
