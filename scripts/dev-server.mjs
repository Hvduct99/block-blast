// dev-server.mjs - chay thu toan bo game tren may rieng, khong can Supabase:
//   Postgres nhung (PGlite, du lieu o .pglite/) + Edge Function "api" (supabase/functions/api/app.js) + phuc vu dist/.
// Dung: VITE_API_URL=/functions/v1/api npm run build && npm start   -> http://localhost:3000
// Pusher (ban do chung): dien PUSHER_* vao .env (xem .env.example)
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import { setDriver, pgliteDriver } from '../supabase/functions/api/db.js';
import { configure, DEPS } from '../supabase/functions/api/core.js';
import { handle } from '../supabase/functions/api/app.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
const PORT = +(process.env.PORT || 3000), FN = '/functions/v1/api';

process.chdir(ROOT);
const db = new PGlite('./.pglite'); // PGlite loi voi duong dan tuyet doi kieu Windows
for (const f of readdirSync(resolve(ROOT, 'supabase/migrations')).sort()) await db.exec(readFileSync(resolve(ROOT, 'supabase/migrations', f), 'utf8'));
setDriver(pgliteDriver(db));
configure({ ...process.env, TT_SECRET: process.env.TT_SECRET || 'dev-secret' });
DEPS.bcrypt = bcrypt;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith(FN)) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handle(new Request(url, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks) }));
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let p = resolve(ROOT, 'dist', '.' + decodeURIComponent(url.pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = resolve(p, 'index.html');
  if (!p.startsWith(resolve(ROOT, 'dist')) || !existsSync(p)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(PORT, () => console.log('Tạ Tốn Truyền Kỳ (thử nghiệm) tại http://localhost:' + PORT));
