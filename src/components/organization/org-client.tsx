"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDepartment, createCategory, setEmployeeRole, setEmployeeStatus } from "@/app/(app)/organization/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { PlusCircle, Loader2 } from "lucide-react";

type Dept = { id: string; name: string; status: string; head: { full_name: string } | null; parent: { name: string } | null };
type Cat = { id: string; name: string; custom_fields: { label: string }[] };
type Emp = { id: string; full_name: string | null; email: string | null; role: Role; status: string; department: { name: string } | null };

export function OrgClient({ departments, categories, employees }: { departments: Dept[]; categories: Cat[]; employees: Emp[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("departments");
  const [modal, setModal] = useState<"dept" | "cat" | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab} onChange={setTab}
          tabs={[{ value: "departments", label: "Departments" }, { value: "categories", label: "Categories" }, { value: "employees", label: "Employee Directory" }]}
        />
        {tab === "departments" && <Button onClick={() => setModal("dept")}><PlusCircle /> Add Department</Button>}
        {tab === "categories" && <Button onClick={() => setModal("cat")}><PlusCircle /> Add Category</Button>}
      </div>

      <div className="rounded-lg border bg-card shadow-card">
        {tab === "departments" && (
          <Table>
            <THead><TR><TH>Department</TH><TH>Head</TH><TH>Parent</TH><TH>Status</TH></TR></THead>
            <TBody>
              {departments.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium">{d.name}</TD>
                  <TD className="text-muted-foreground">{d.head?.full_name ?? "—"}</TD>
                  <TD className="text-muted-foreground">{d.parent?.name ?? "—"}</TD>
                  <TD><Badge className={d.status === "active" ? "bg-emerald-100 text-emerald-700 ring-emerald-600/20" : "bg-slate-200 text-slate-600 ring-slate-500/20"}>{d.status}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {tab === "categories" && (
          <Table>
            <THead><TR><TH>Category</TH><TH>Custom Fields</TH></TR></THead>
            <TBody>
              {categories.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="text-muted-foreground">{c.custom_fields?.map((f) => f.label).join(", ") || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {tab === "employees" && (
          <Table>
            <THead><TR><TH>Name</TH><TH>Email</TH><TH>Department</TH><TH>Role</TH><TH>Status</TH><TH className="pr-4 text-right">Actions</TH></TR></THead>
            <TBody>
              {employees.map((e) => <EmpRow key={e.id} emp={e} onDone={() => router.refresh()} />)}
            </TBody>
          </Table>
        )}
      </div>

      {modal === "dept" && <DeptModal departments={departments} employees={employees} onClose={() => setModal(null)} onDone={() => { setModal(null); router.refresh(); }} />}
      {modal === "cat" && <CatModal onClose={() => setModal(null)} onDone={() => { setModal(null); router.refresh(); }} />}
    </div>
  );
}

function EmpRow({ emp, onDone }: { emp: Emp; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const changeRole = async (role: Role) => { setBusy(true); await setEmployeeRole(emp.id, role); setBusy(false); onDone(); };
  const toggle = async () => { setBusy(true); await setEmployeeStatus(emp.id, emp.status === "active" ? "inactive" : "active"); setBusy(false); onDone(); };
  return (
    <TR>
      <TD className="font-medium">{emp.full_name ?? "—"}</TD>
      <TD className="text-muted-foreground">{emp.email}</TD>
      <TD className="text-muted-foreground">{emp.department?.name ?? "—"}</TD>
      <TD>
        <Select className="h-8 w-40 text-xs" value={emp.role} disabled={busy} onChange={(ev) => changeRole(ev.target.value as Role)}>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </TD>
      <TD><Badge className={emp.status === "active" ? "bg-emerald-100 text-emerald-700 ring-emerald-600/20" : "bg-slate-200 text-slate-600 ring-slate-500/20"}>{emp.status}</Badge></TD>
      <TD className="pr-4 text-right">
        <Button size="sm" variant="ghost" disabled={busy} onClick={toggle}>{emp.status === "active" ? "Deactivate" : "Activate"}</Button>
      </TD>
    </TR>
  );
}

function DeptModal({ departments, employees, onClose, onDone }: { departments: Dept[]; employees: Emp[]; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await createDepartment({ name: String(fd.get("name")), head_id: (fd.get("head") as string) || null, parent_id: (fd.get("parent") as string) || null });
    setSaving(false); if (res.error) setError(res.error); else onDone();
  }
  return (
    <Modal open onClose={onClose} title="Add Department">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Name</Label><Input name="name" required /></div>
        <div className="space-y-1.5"><Label>Head <span className="text-muted-foreground">(optional)</span></Label>
          <Select name="head"><option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Parent department <span className="text-muted-foreground">(optional)</span></Label>
          <Select name="parent"><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Create</Button></div>
      </form>
    </Modal>
  );
}

function CatModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await createCategory({ name: String(fd.get("name")), warranty: fd.get("warranty") === "on" });
    setSaving(false); if (res.error) setError(res.error); else onDone();
  }
  return (
    <Modal open onClose={onClose} title="Add Category">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Name</Label><Input name="name" required placeholder="Electronics" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="warranty" className="size-4" /> Add warranty-period field</label>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Create</Button></div>
      </form>
    </Modal>
  );
}
