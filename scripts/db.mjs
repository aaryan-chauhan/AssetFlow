// pg client for scripts. Uses the pooler host (IPv4) directly.
import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

export async function connect() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL missing in .env.local');
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}
