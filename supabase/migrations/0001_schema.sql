-- AssetFlow schema: enums, core tables, asset-tag auto-generation.
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type user_role       as enum ('employee','department_head','asset_manager','admin');
create type asset_status    as enum ('available','allocated','reserved','under_maintenance','lost','retired','disposed');
create type asset_condition as enum ('new','good','fair','poor');
create type alloc_status    as enum ('active','returned');
create type holder_type     as enum ('employee','department');
create type transfer_status as enum ('requested','approved','rejected','cancelled');
create type booking_status  as enum ('upcoming','ongoing','completed','cancelled');
create type maint_status    as enum ('pending','approved','rejected','tech_assigned','in_progress','resolved');
create type maint_priority  as enum ('low','medium','high','critical');
create type audit_status    as enum ('open','closed');
create type verification    as enum ('pending','verified','missing','damaged');

-- ---------- Master data ----------
-- departments.head_id -> profiles and profiles.department_id -> departments form a cycle;
-- create departments first without the head FK, add it after profiles exists.
create table departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  head_id    uuid,
  parent_id  uuid references departments(id) on delete set null,
  status     text not null default 'active',
  created_at timestamptz not null default now()
);

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  department_id uuid references departments(id) on delete set null,
  role          user_role not null default 'employee',
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);

alter table departments
  add constraint departments_head_fk foreign key (head_id) references profiles(id) on delete set null;

create table asset_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- optional category-specific field definitions, e.g. [{"key":"warranty_months","label":"Warranty (months)","type":"number"}]
  custom_fields jsonb not null default '[]',
  created_at    timestamptz not null default now()
);

-- ---------- Assets ----------
create sequence asset_tag_seq start 1;

create table assets (
  id               uuid primary key default gen_random_uuid(),
  tag              text unique,
  name             text not null,
  category_id      uuid references asset_categories(id) on delete set null,
  serial_number    text,
  acquisition_date date,
  acquisition_cost numeric(12,2),
  condition        asset_condition not null default 'good',
  location         text,
  photo_url        text,
  custom_data      jsonb not null default '{}',
  is_bookable      boolean not null default false,
  status           asset_status not null default 'available',
  department_id    uuid references departments(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- Auto asset tag AF-0001, AF-0002, ...
create or replace function set_asset_tag() returns trigger language plpgsql as $$
begin
  if new.tag is null then
    new.tag := 'AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger trg_asset_tag before insert on assets
  for each row execute function set_asset_tag();

-- ---------- Allocations ----------
create table allocations (
  id                   uuid primary key default gen_random_uuid(),
  asset_id             uuid not null references assets(id) on delete cascade,
  holder_type          holder_type not null,
  holder_employee_id   uuid references profiles(id) on delete set null,
  holder_department_id uuid references departments(id) on delete set null,
  allocated_by         uuid references profiles(id) on delete set null,
  allocated_at         timestamptz not null default now(),
  expected_return_date date,
  returned_at          timestamptz,
  checkin_condition    asset_condition,
  checkin_notes        text,
  status               alloc_status not null default 'active'
);
-- HARD INVARIANT: an asset can have at most one active allocation.
create unique index one_active_allocation on allocations(asset_id) where status = 'active';

create table transfer_requests (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references assets(id) on delete cascade,
  from_label   text,
  to_employee_id uuid references profiles(id) on delete set null,
  requested_by uuid references profiles(id) on delete set null,
  reason       text,
  status       transfer_status not null default 'requested',
  approver_id  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- ---------- Bookings ----------
create table bookings (
  id         uuid primary key default gen_random_uuid(),
  resource_id uuid not null references assets(id) on delete cascade,
  booked_by  uuid references profiles(id) on delete set null,
  purpose    text,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  -- half-open range: [start, end) so a 10:00 start does not overlap a 9:00-10:00 booking.
  time_range tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status     booking_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  constraint booking_time_valid check (ends_at > starts_at)
);
-- HARD INVARIANT: no two non-cancelled bookings of the same resource overlap.
alter table bookings add constraint no_overlap
  exclude using gist (resource_id with =, time_range with &&) where (status <> 'cancelled');

-- ---------- Maintenance ----------
create table maintenance_requests (
  id              uuid primary key default gen_random_uuid(),
  asset_id        uuid not null references assets(id) on delete cascade,
  raised_by       uuid references profiles(id) on delete set null,
  issue           text not null,
  priority        maint_priority not null default 'medium',
  photo_url       text,
  status          maint_status not null default 'pending',
  approver_id     uuid references profiles(id) on delete set null,
  technician_name text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

-- ---------- Audit ----------
create table audit_cycles (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  scope_department_id uuid references departments(id) on delete set null,
  scope_location      text,
  start_date          date,
  end_date            date,
  status              audit_status not null default 'open',
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  closed_at           timestamptz
);

create table audit_assignments (
  cycle_id   uuid not null references audit_cycles(id) on delete cascade,
  auditor_id uuid not null references profiles(id) on delete cascade,
  primary key (cycle_id, auditor_id)
);

create table audit_items (
  id               uuid primary key default gen_random_uuid(),
  cycle_id         uuid not null references audit_cycles(id) on delete cascade,
  asset_id         uuid not null references assets(id) on delete cascade,
  expected_location text,
  verification     verification not null default 'pending',
  verified_by      uuid references profiles(id) on delete set null,
  notes            text,
  verified_at      timestamptz
);

-- ---------- Notifications & activity ----------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  message    text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Helpful indexes for common filters.
create index idx_assets_status on assets(status);
create index idx_assets_category on assets(category_id);
create index idx_alloc_asset on allocations(asset_id);
create index idx_bookings_resource on bookings(resource_id);
create index idx_maint_status on maintenance_requests(status);
create index idx_notif_user on notifications(user_id, read);
