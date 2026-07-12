-- State-transition automation + notification/activity helpers.

-- Generic notify helper.
create or replace function notify_user(p_user uuid, p_type text, p_message text, p_link text default null)
returns void language plpgsql security definer as $$
begin
  if p_user is not null then
    insert into notifications(user_id, type, message, link) values (p_user, p_type, p_message, p_link);
  end if;
end $$;

-- ---------- Allocation -> asset status ----------
create or replace function alloc_after_change() returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') and new.status = 'active' then
    update assets set status = 'allocated' where id = new.asset_id;
    perform notify_user(new.holder_employee_id, 'asset_assigned',
      'You were allocated asset ' || (select tag from assets where id = new.asset_id), '/allocation');
  elsif (tg_op = 'UPDATE') and new.status = 'returned' and old.status = 'active' then
    -- On return, asset becomes available again (unless it was flipped elsewhere, e.g. maintenance).
    update assets set status = 'available'
      where id = new.asset_id and status = 'allocated';
  end if;
  return new;
end $$;
create trigger trg_alloc_change after insert or update on allocations
  for each row execute function alloc_after_change();

-- ---------- Maintenance -> asset status ----------
create or replace function maint_after_change() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if new.status = 'approved' then
      update assets set status = 'under_maintenance' where id = new.asset_id;
      perform notify_user(new.raised_by, 'maintenance_approved',
        'Maintenance approved for ' || (select tag from assets where id = new.asset_id), '/maintenance');
    elsif new.status = 'rejected' then
      perform notify_user(new.raised_by, 'maintenance_rejected',
        'Maintenance rejected for ' || (select tag from assets where id = new.asset_id), '/maintenance');
    elsif new.status = 'resolved' then
      new.resolved_at := now();
      -- Back to available only if it is still under maintenance (not lost/retired meanwhile).
      update assets set status = 'available' where id = new.asset_id and status = 'under_maintenance';
      perform notify_user(new.raised_by, 'maintenance_resolved',
        'Maintenance resolved for ' || (select tag from assets where id = new.asset_id), '/maintenance');
    end if;
  end if;
  return new;
end $$;
create trigger trg_maint_change before update on maintenance_requests
  for each row execute function maint_after_change();

-- ---------- Transfer approval -> re-allocation ----------
-- Approving a transfer closes the current active allocation and opens a new one for the target.
create or replace function transfer_after_change() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'UPDATE' and new.status = 'approved' and old.status = 'requested' then
    new.resolved_at := now();
    update allocations set status = 'returned', returned_at = now()
      where asset_id = new.asset_id and status = 'active';
    insert into allocations(asset_id, holder_type, holder_employee_id, allocated_by, allocated_at)
      values (new.asset_id, 'employee', new.to_employee_id, new.approver_id, now());
    perform notify_user(new.to_employee_id, 'transfer_approved',
      'Transfer approved: asset ' || (select tag from assets where id = new.asset_id) || ' is now yours', '/allocation');
    perform notify_user(new.requested_by, 'transfer_approved',
      'Your transfer request for ' || (select tag from assets where id = new.asset_id) || ' was approved', '/allocation');
  elsif tg_op = 'UPDATE' and new.status = 'rejected' and old.status = 'requested' then
    new.resolved_at := now();
    perform notify_user(new.requested_by, 'transfer_rejected',
      'Your transfer request for ' || (select tag from assets where id = new.asset_id) || ' was rejected', '/allocation');
  end if;
  return new;
end $$;
create trigger trg_transfer_change before update on transfer_requests
  for each row execute function transfer_after_change();

-- ---------- Booking reminder/confirmation notification ----------
create or replace function booking_after_insert() returns trigger language plpgsql security definer as $$
begin
  perform notify_user(new.booked_by, 'booking_confirmed',
    'Booking confirmed for ' || (select tag from assets where id = new.resource_id), '/booking');
  return new;
end $$;
create trigger trg_booking_insert after insert on bookings
  for each row execute function booking_after_insert();

-- ---------- Close audit cycle: lock + reconcile asset statuses ----------
-- Missing -> Lost, Damaged -> condition poor. Returns count of flagged items.
create or replace function close_audit_cycle(p_cycle uuid) returns integer language plpgsql security definer as $$
declare flagged int;
begin
  update assets a set status = 'lost'
    from audit_items i
    where i.cycle_id = p_cycle and i.asset_id = a.id and i.verification = 'missing';

  update assets a set condition = 'poor'
    from audit_items i
    where i.cycle_id = p_cycle and i.asset_id = a.id and i.verification = 'damaged';

  select count(*) into flagged from audit_items
    where cycle_id = p_cycle and verification in ('missing','damaged');

  update audit_cycles set status = 'closed', closed_at = now() where id = p_cycle;

  -- Notify auditors that the discrepancy report is ready.
  insert into notifications(user_id, type, message, link)
    select auditor_id, 'audit_closed',
      'Audit "' || (select name from audit_cycles where id = p_cycle) || '" closed: ' || flagged || ' discrepancies',
      '/audit'
    from audit_assignments where cycle_id = p_cycle;

  return flagged;
end $$;
