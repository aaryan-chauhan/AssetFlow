-- Auth wiring + role security + Row Level Security.

-- Every new auth user becomes an ordinary Employee. Role is NEVER taken from
-- signup input -> no self-elevation to admin/manager.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.email, 'employee')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Caller's role, resolved without tripping RLS recursion.
create or replace function auth_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Roles can only be changed by an admin (or by a service/seed context with no
-- session). This is enforced at the DB, so no API path can bypass it.
create or replace function guard_role_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null
       and coalesce((select role from public.profiles where id = auth.uid()), 'employee') <> 'admin' then
      raise exception 'Only an admin can assign roles';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_role on profiles;
create trigger trg_guard_role before update on profiles
  for each row execute function guard_role_change();

-- ---------- Grants (RLS still governs actual row access) ----------
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ---------- Enable RLS ----------
alter table departments          enable row level security;
alter table profiles             enable row level security;
alter table asset_categories     enable row level security;
alter table assets               enable row level security;
alter table allocations          enable row level security;
alter table transfer_requests    enable row level security;
alter table bookings             enable row level security;
alter table maintenance_requests enable row level security;
alter table audit_cycles         enable row level security;
alter table audit_assignments    enable row level security;
alter table audit_items          enable row level security;
alter table notifications        enable row level security;
alter table activity_log         enable row level security;

-- ---------- Policies ----------
-- Directory + operational data is org-wide readable to any signed-in user.
create policy read_all on departments       for select to authenticated using (true);
create policy read_all on asset_categories  for select to authenticated using (true);
create policy read_all on assets            for select to authenticated using (true);
create policy read_all on allocations       for select to authenticated using (true);
create policy read_all on transfer_requests for select to authenticated using (true);
create policy read_all on bookings          for select to authenticated using (true);
create policy read_all on maintenance_requests for select to authenticated using (true);
create policy read_all on audit_cycles      for select to authenticated using (true);
create policy read_all on audit_assignments for select to authenticated using (true);
create policy read_all on audit_items       for select to authenticated using (true);
create policy read_all on profiles          for select to authenticated using (true);
create policy read_all on activity_log      for select to authenticated using (true);

-- profiles: self-service edit; admin edits anyone (role change also guarded by trigger).
create policy edit_profile on profiles for update to authenticated
  using (id = auth.uid() or auth_role() = 'admin')
  with check (id = auth.uid() or auth_role() = 'admin');

-- Master data: admin only.
create policy admin_write on departments      for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy admin_write on asset_categories for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy admin_write on audit_cycles     for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy admin_write on audit_assignments for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- Assets + allocations: asset managers / admin.
create policy mgr_write on assets for all to authenticated
  using (auth_role() in ('asset_manager','admin'))
  with check (auth_role() in ('asset_manager','admin'));
create policy mgr_write on allocations for all to authenticated
  using (auth_role() in ('asset_manager','admin'))
  with check (auth_role() in ('asset_manager','admin'));
create policy mgr_write on maintenance_requests for update to authenticated
  using (auth_role() in ('asset_manager','admin'))
  with check (auth_role() in ('asset_manager','admin'));

-- Anyone signed in raises a maintenance request (as themselves).
create policy self_raise on maintenance_requests for insert to authenticated
  with check (raised_by = auth.uid());

-- Transfers: employee initiates; managers/heads approve.
create policy self_request on transfer_requests for insert to authenticated
  with check (requested_by = auth.uid());
create policy mgr_approve on transfer_requests for update to authenticated
  using (auth_role() in ('department_head','asset_manager','admin'))
  with check (auth_role() in ('department_head','asset_manager','admin'));

-- Bookings: book as yourself; owner or managers can change/cancel.
create policy self_book on bookings for insert to authenticated
  with check (booked_by = auth.uid());
create policy edit_booking on bookings for update to authenticated
  using (booked_by = auth.uid() or auth_role() in ('department_head','asset_manager','admin'))
  with check (booked_by = auth.uid() or auth_role() in ('department_head','asset_manager','admin'));

-- Audit items: the assigned auditor (or admin) marks them.
create policy auditor_mark on audit_items for update to authenticated
  using (auth_role() = 'admin'
         or exists (select 1 from audit_assignments a
                    where a.cycle_id = audit_items.cycle_id and a.auditor_id = auth.uid()))
  with check (true);
create policy admin_items on audit_items for insert to authenticated
  with check (auth_role() = 'admin');

-- Notifications: users see/clear only their own.
create policy own_notifs on notifications for select to authenticated using (user_id = auth.uid());
create policy read_notifs on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Activity log: anyone signed in can append their own actions.
create policy self_log on activity_log for insert to authenticated
  with check (actor_id = auth.uid());
