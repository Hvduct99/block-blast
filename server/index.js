// index.js - may chu Node (Express): phuc vu ban build (dist/) + API giu nguyen duong dan api/*.php cua ban PHP cu.
// Chay: npm run build && npm start   (Hostinger: Entry file = server/index.js)
import express from 'express';
import cookieSession from 'cookie-session';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { PORT, ROOT, SESSION_SECRET } from './config.js';
import { pool } from './db.js';
import { Out, banNote } from './core.js';
import { migrate } from './schema.js';
import { auth, game, loot, quest, farm, forge } from './api/game.js';
import { equip, pk, social, friend } from './api/social.js';
import { rt, pusherAuth } from './api/rt.js';

const API = { auth, game, loot, quest, farm, forge, equip, pk, social, friend, rt };
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieSession({ name: 'tt_sess', keys: [SESSION_SECRET], maxAge: 30 * 24 * 3600 * 1000, sameSite: 'lax', httpOnly: true }));

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, db: true }); } catch (e) { res.status(503).json({ ok: false, db: false, error: e.code || e.message }); }
});
app.post('/api/pusher_auth.php', pusherAuth);
app.all('/api/:name.php', async (req, res) => {
  const mod = API[req.params.name], P = Object.assign({}, req.query, req.body), fn = mod && mod[P.action];
  const ctx = { P, req, res, uid: 0 };
  ctx.requireLogin = async () => {
    const uid = +(req.session && req.session.uid) || 0;
    if (!uid) throw new Out({ ok: false, error: 'Chưa đăng nhập' }, 401);
    const note = await banNote(uid);
    if (note) { req.session = null; throw new Out({ ok: false, banned: true, error: 'Tài khoản đã bị khóa: ' + note }, 401); }
    return uid;
  };
  try {
    if (typeof fn !== 'function' || String(P.action).startsWith('_')) throw new Out({ ok: false, error: 'action?' }, 400);
    if (mod !== auth) { // auth.php tu kiem tra dang nhap (chi action=me can)
      ctx.uid = await ctx.requireLogin();
      if (mod === social) { const [r] = await pool.query('SELECT * FROM tt_users WHERE id=?', [ctx.uid]); ctx.me = r[0]; }
    }
    const data = await fn(ctx);
    res.set('Cache-Control', 'no-store').json(data);
    if (ctx.after) ctx.after().catch(e => console.error('after:', e.message)); // gui Pusher sau khi da tra ket qua (giam tre)
  } catch (e) {
    if (e instanceof Out) return res.status(e.status).json(e.data);
    console.error('Lỗi máy chủ:', req.params.name, P.action, e);
    res.status(500).json({ ok: false, error: 'Máy chủ đang bận, vui lòng thử lại.' });
  }
});

// duong dan cu cua ban PHP
app.get(['/index.php', '/logout.php'], (req, res) => res.redirect(req.path === '/logout.php' ? '/index.html?logout=1' : '/'));
app.get(['/play.php', '/game.html'], (req, res) => res.redirect('/play.html'));

const DIST = resolve(ROOT, 'dist');
if (!existsSync(DIST)) console.warn('[server] Chưa có dist/ - chạy "npm run build" trước');
app.use(express.static(DIST, { extensions: ['html'], maxAge: '1h', setHeaders: (r, p) => { if (p.endsWith('.html')) r.setHeader('Cache-Control', 'no-cache'); } }));

app.listen(PORT, () => console.log('Tạ Tốn Truyền Kỳ chạy tại http://localhost:' + PORT));
migrate().then(() => console.log('[schema] Dữ liệu sẵn sàng')).catch(e => console.error('[schema] Không cập nhật được DB:', e.message));
