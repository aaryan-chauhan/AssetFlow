// Apply all supabase/migrations/*.sql in order against SUPABASE_DB_URL.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connect } from './db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'supabase', 'migrations');
const client = await connect();

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  process.stdout.write(`applying ${f} ... `);
  try {
    await client.query(readFileSync(join(dir, f), 'utf8'));
    console.log('ok');
  } catch (e) {
    console.log('FAILED');
    console.error(e.message);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log('migrations complete');
