// Supabase Edge Function "api" - may chu game Ta Ton Truyen Ky (thay api/*.php).
// URL: https://<project>.supabase.co/functions/v1/api/<ten>.php?action=...
// Bien moi truong co san: SUPABASE_DB_URL. Can them (Dashboard -> Edge Functions -> Secrets):
//   PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER (ap1), PUSHER_PREFIX (tt), TT_SECRET (chuoi ngau nhien ky token)
import postgres from 'npm:postgres@3.4.7';
import bcrypt from 'npm:bcryptjs@3.0.3';
import { setDriver, postgresDriver } from './db.js';
import { configure, DEPS } from './core.js';
import { handle } from './app.js';

// prepare: false -> chay duoc qua connection pooler (transaction mode)
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3, idle_timeout: 20 });
setDriver(postgresDriver(sql));
configure(Deno.env.toObject());
DEPS.bcrypt = bcrypt;

// deno-lint-ignore no-explicit-any
const waitUntil = (p: Promise<unknown>) => (globalThis as any).EdgeRuntime?.waitUntil?.(p);
Deno.serve(req => handle(req, { waitUntil }));
