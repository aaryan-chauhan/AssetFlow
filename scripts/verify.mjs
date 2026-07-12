import { connect } from './db.mjs';
const c = await connect();
const q = async (label, sql) => { const r = await c.query(sql); console.log(label, JSON.stringify(r.rows)); };
await q('tables:', "select count(*) from information_schema.tables where table_schema='public'");
await q('overlap exclusion:', "select conname from pg_constraint where conname='no_overlap'");
await q('one-active-alloc index:', "select indexname from pg_indexes where indexname='one_active_allocation'");
await q('enums:', "select count(*) from pg_type where typtype='e'");
await q('rls tables:', "select count(*) from pg_tables where schemaname='public' and rowsecurity");
await c.end();
