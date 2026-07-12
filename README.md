# AssetFlow — Enterprise Asset & Resource Management System

A centralized ERP for tracking, allocating, and maintaining physical assets and shared resources.
Departments, employees, assets, bookings, maintenance, and audits — with role-based workflows and
real-time visibility into who holds what, where it is, and its condition.

## Stack

- **Next.js 14** (App Router, TypeScript) + Tailwind CSS
- **Supabase** — Postgres, Auth, Row-Level Security, Realtime

## Why the data model is the point

Two invariants are enforced **in Postgres**, not in fragile application code:

- **No double-booking** — a GiST `EXCLUDE` constraint on the resource + time range makes two
  overlapping bookings physically impossible to insert. Half-open ranges `[start, end)` mean a
  10:00 start does not clash with a 09:00–10:00 booking.
- **No double-allocation** — a partial unique index guarantees an asset has at most one active
  allocation. A second allocation attempt is blocked and routed to a transfer request.

Role security is likewise enforced at the DB: signup always creates an **Employee**; only an **Admin**
can promote to Department Head / Asset Manager (guarded by a trigger, so no API path can self-elevate).

## Getting started

```bash
npm install
# .env.local holds NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
npm run db:migrate   # apply schema, triggers, RLS
npm run db:seed      # load the demo organization
npm run dev
```

## Roles

| Role | Can |
|------|-----|
| Employee | View own assets, book resources, raise maintenance, request transfers/returns |
| Department Head | Approve allocations/transfers within their department, book on its behalf |
| Asset Manager | Register/allocate assets, approve transfers/maintenance/returns |
| Admin | Org setup (departments, categories, roles), audit cycles, org-wide analytics |
