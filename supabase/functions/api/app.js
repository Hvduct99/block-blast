// app.js - bo dinh tuyen API (Web Request -> Response), giu nguyen duong dan api/*.php cua ban PHP cu:
//   POST/GET <function-url>/game.php?action=kill ...   Dang nhap: header "x-tt-token" (token tra ve khi dang ky / dang nhap)
import { pool, q } from './db.js';
import { Out, banNote, readToken, loadMem, saveMem, pendingWork, background, pusher } from './core.js';
import { auth, game, loot, quest, farm, forge } from './routes/game.js';
import { equip, pk, social, friend } from './routes/social.js';
import { rt, pusherAuth } from './routes/rt.js';

const API = { auth, game, loot, quest, farm, forge, equip, pk, social, friend, rt };
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-tt-token, authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function params(req, url) {
  const P = Object.fromEntries(url.searchParams);
  if (req.method === 'POST') {
    const text = await req.text();
    if ((req.headers.get('content-type') || '').includes('json')) Object.assign(P, JSON.parse(text || '{}'));
    else for (const [k, v] of new URLSearchParams(text)) P[k] = v;
  }
  return P;
}

// waitUntil: EdgeRuntime.waitUntil (Supabase) de gui Pusher sau khi da tra ket qua
export async function handle(req, { waitUntil } = {}) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url), name = (url.pathname.match(/([a-z_]+)(\.php)?\/?$/) || [])[1] || '';
  const tokUid = readToken(req.headers.get('x-tt-token'));
  const finish = res => { const w = pendingWork(); if (waitUntil) waitUntil(w); return waitUntil ? res : w.then(() => res); };

  if (name === 'health') {
    try { await pool.query('SELECT 1', []); return json({ ok: true, db: true, pusher: !!pusher() }); }
    catch (e) { return json({ ok: false, db: false, error: e.code || e.message }, 503); }
  }
  const P = await params(req, url);
  if (name === 'pusher_auth') {
    const [status, body] = await pusherAuth(tokUid, P);
    return typeof body === 'string' ? new Response(body, { status, headers: CORS }) : json(body, status);
  }

  const mod = API[name], fn = mod && mod[P.action];
  const ctx = { P, uid: 0 };
  let memUid = 0, memBefore = '';
  ctx.requireLogin = async () => {
    if (!tokUid) throw new Out({ ok: false, error: 'Chưa đăng nhập' }, 401);
    const note = await banNote(tokUid);
    if (note) throw new Out({ ok: false, banned: true, error: 'Tài khoản đã bị khóa: ' + note }, 401);
    if (!memUid) { memUid = tokUid; memBefore = await loadMem(tokUid); }
    return tokUid;
  };
  try {
    if (typeof fn !== 'function' || String(P.action).startsWith('_')) throw new Out({ ok: false, error: 'action?' }, 400);
    if (mod !== auth) { // auth.php tu kiem tra dang nhap (chi action=me can)
      ctx.uid = await ctx.requireLogin();
      if (mod === social) ctx.me = (await q(pool, 'SELECT * FROM tt_users WHERE id=?', [ctx.uid]))[0];
    }
    const data = await fn(ctx);
    if (ctx.after) background(ctx.after()); // gui Pusher (chay nen)
    return finish(json(data));
  } catch (e) {
    if (e instanceof Out) return finish(json(e.data, e.status));
    console.error('Lỗi máy chủ:', name, P.action, e);
    const dbErr = /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|28P01|3D000|42P01|57P01|CONNECTION_\w+)$/.test(e.code || '');
    return json({ ok: false, error: dbErr ? 'Máy chủ chưa kết nối được cơ sở dữ liệu (' + e.code + ')' : 'Máy chủ đang bận, vui lòng thử lại.' }, 500);
  } finally {
    if (memUid) await saveMem(memUid, memBefore).catch(e => console.error('saveMem:', e.message));
  }
}
