"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { registerAsset } from "@/app/(app)/assets/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/app/status-badge";
import { STATUS_META, type Asset, type Category, type AssetStatus } from "@/lib/types";
import { Search, PlusCircle, Loader2, QrCode, Boxes } from "lucide-react";

type AssetRow = Asset & { category: { id: string; name: string } | null };

export function AssetsClient({
  assets, categories, canManage,
}: {
  assets: AssetRow[];
  categories: Category[];
  canManage: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<AssetRow | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1" && canManage) setShowNew(true);
  }, [params, canManage]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (cat && a.category_id !== cat) return false;
      if (status && a.status !== status) return false;
      if (!needle) return true;
      return [a.tag, a.name, a.serial_number, a.location, a.category?.name]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(needle));
    });
  }, [assets, q, cat, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Asset Directory</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} of {assets.length} assets</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNew(true)}><PlusCircle /> Register Asset</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by tag, serial, name, location…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-44" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-card">
        <Table>
          <THead>
            <TR>
              <TH>Tag</TH><TH>Name</TH><TH>Category</TH><TH>Status</TH><TH>Location</TH><TH className="text-right pr-4">Details</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((a) => (
              <TR key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                <TD className="font-mono text-xs font-medium">{a.tag}</TD>
                <TD className="font-medium">{a.name}{a.is_bookable && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">Bookable</span>}</TD>
                <TD className="text-muted-foreground">{a.category?.name ?? "—"}</TD>
                <TD><StatusBadge status={a.status} /></TD>
                <TD className="text-muted-foreground">{a.location ?? "—"}</TD>
                <TD className="pr-4 text-right"><QrCode className="ml-auto size-4 text-muted-foreground" /></TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR><TD colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                <Boxes className="mx-auto mb-2 size-6 opacity-40" />No assets match your filters.
              </TD></TR>
            )}
          </TBody>
        </Table>
      </div>

      {detail && <AssetDetail asset={detail} onClose={() => setDetail(null)} />}
      {showNew && (
        <RegisterModal
          categories={categories}
          onClose={() => { setShowNew(false); if (params.get("new")) router.replace("/assets"); }}
          onDone={() => { setShowNew(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AssetDetail({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  const [history, setHistory] = useState<{ allocations: any[]; maintenance: any[] } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: allocations }, { data: maintenance }] = await Promise.all([
        supabase.from("allocations")
          .select("id, allocated_at, returned_at, expected_return_date, status, holder:profiles!allocations_holder_employee_id_fkey(full_name)")
          .eq("asset_id", asset.id).order("allocated_at", { ascending: false }),
        supabase.from("maintenance_requests")
          .select("id, issue, status, priority, created_at").eq("asset_id", asset.id).order("created_at", { ascending: false }),
      ]);
      setHistory({ allocations: allocations ?? [], maintenance: maintenance ?? [] });
    })();
  }, [asset.id]);

  return (
    <Modal open onClose={onClose} title={`${asset.tag} · ${asset.name}`} className="max-w-2xl">
      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg border bg-white p-3">
            <QRCodeSVG value={`assetflow:${asset.tag}`} size={128} />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{asset.tag}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Field label="Status"><StatusBadge status={asset.status} /></Field>
          <Field label="Category">{asset.category?.name ?? "—"}</Field>
          <Field label="Serial">{asset.serial_number ?? "—"}</Field>
          <Field label="Condition" className="capitalize">{asset.condition}</Field>
          <Field label="Location">{asset.location ?? "—"}</Field>
          <Field label="Cost">{asset.acquisition_cost ? `₹${Number(asset.acquisition_cost).toLocaleString("en-IN")}` : "—"}</Field>
        </dl>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <HistoryList title="Allocation history" empty="No allocations yet."
          items={history?.allocations.map((a) => ({
            key: a.id,
            main: a.holder?.full_name ?? "—",
            sub: `${a.status === "active" ? "Since" : "Returned"} ${new Date(a.returned_at ?? a.allocated_at).toLocaleDateString()}`,
          }))} loading={!history} />
        <HistoryList title="Maintenance history" empty="No maintenance yet."
          items={history?.maintenance.map((m) => ({
            key: m.id, main: m.issue,
            sub: `${m.status} · ${formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}`,
          }))} loading={!history} />
      </div>
    </Modal>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-medium ${className ?? ""}`}>{children}</dd>
    </div>
  );
}

function HistoryList({ title, items, empty, loading }: {
  title: string; items?: { key: string; main: string; sub: string }[]; empty: string; loading: boolean;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {loading ? (
        <p className="text-sm text-muted-foreground"><Loader2 className="inline size-3.5 animate-spin" /> Loading…</p>
      ) : items && items.length ? (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.key} className="border-l-2 border-primary/30 pl-3">
              <p className="text-sm font-medium leading-tight">{i.main}</p>
              <p className="text-xs capitalize text-muted-foreground">{i.sub}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function RegisterModal({ categories, onClose, onDone }: {
  categories: Category[]; onClose: () => void; onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const activeCat = categories.find((c) => c.id === categoryId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await registerAsset({
      name: String(fd.get("name")),
      category_id: categoryId || null,
      serial_number: (fd.get("serial") as string) || null,
      acquisition_date: (fd.get("acq_date") as string) || null,
      acquisition_cost: fd.get("cost") ? Number(fd.get("cost")) : null,
      condition: String(fd.get("condition") || "good"),
      location: (fd.get("location") as string) || null,
      is_bookable: fd.get("bookable") === "on",
      custom_data: custom,
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <Modal open onClose={onClose} title="Register Asset" description="Add a new asset. A tag (AF-####) is generated automatically.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name</Label>
            <Input name="name" required placeholder="Dell Latitude 7440" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setCustom({}); }}>
              <option value="">Select…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Serial number</Label>
            <Input name="serial" placeholder="SN-XXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Acquisition date</Label>
            <Input name="acq_date" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Acquisition cost (₹)</Label>
            <Input name="cost" type="number" min="0" step="1" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select name="condition" defaultValue="good">
              <option value="new">New</option><option value="good">Good</option>
              <option value="fair">Fair</option><option value="poor">Poor</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input name="location" placeholder="Bengaluru HQ" />
          </div>
          {activeCat?.custom_fields?.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                type={f.type === "number" ? "number" : "text"}
                value={custom[f.key] ?? ""}
                onChange={(e) => setCustom((c) => ({ ...c, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bookable" className="size-4 rounded border-input" />
          Shared / bookable resource
        </label>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Register</Button>
        </div>
      </form>
    </Modal>
  );
}
