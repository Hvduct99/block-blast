// core.js - ham dung chung phia may chu (port tu config.php). Luat thuan (exp, chi so, roi do...) dung chung voi client: shared/rules.js
import './shared/data.js';
import * as R from './shared/rules.js';
import { pool, q, one, col } from './db.js';
import { makePusher } from './pusher.js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

export { R };
export const { int, now, randInt } = R;
export const today = R.today;
export const clock = () => Date.now() / 1000; // giay (so thuc) - thay microtime(true)

// ---------- cau hinh (bien moi truong cua Edge Function) ----------
export const CFG = { pusher: { appId: '', key: '', secret: '', cluster: 'ap1', prefix: 'tt' }, secret: '' };
export function configure(env) {
  Object.assign(CFG.pusher, { appId: env.PUSHER_APP_ID || '', key: env.PUSHER_KEY || '', secret: env.PUSHER_SECRET || '', cluster: env.PUSHER_CLUSTER || 'ap1', prefix: env.PUSHER_PREFIX || 'tt' });
  CFG.secret = env.TT_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_DB_URL || '';
  P = undefined;
}

// Thu vien ngoai do diem vao (index.ts / test) truyen vao: { bcrypt }
export const DEPS = {};

// ---------- token dang nhap (thay cookie phien PHP: trang va API khac ten mien) ----------
const TOKEN_DAYS = 30;
const hmac = s => createHmac('sha256', CFG.secret).update(s).digest('base64url');
export function signToken(uid) { const body = uid + '.' + (now() + TOKEN_DAYS * 86400); return body + '.' + hmac(body); }
export function readToken(tok) {
  const m = String(tok || '').match(/^(\d+)\.(\d+)\.([\w-]+)$/); if (!m || !CFG.secret) return 0;
  const a = Buffer.from(hmac(m[1] + '.' + m[2])), b = Buffer.from(m[3]);
  return a.length === b.length && timingSafeEqual(a, b) && +m[2] > now() ? +m[1] : 0;
}

// ---------- tra loi / loi ----------
export class Out { constructor(data, status = 200) { this.data = data; this.status = status; } }
export const out = (data, status = 200) => { throw new Out(data, status); };
export const fail = (error, status = 400, extra) => out(Object.assign({ ok: false, error }, extra || {}), status);

// Trang thai phien (thay $_SESSION['run'], ['rt']...): nap tu tt_runtime dau moi yeu cau, luu lai cuoi yeu cau
const MEM = new Map();
const blank = () => ({ run: null, rt: null, last_pvp: 0, last_pk: 0, pm_last: null });
export const mem = uid => { let m = MEM.get(uid); if (!m) MEM.set(uid, m = blank()); return m; };
export async function loadMem(uid) {
  let d = blank();
  try { const s = await col(pool, 'SELECT data FROM tt_runtime WHERE user_id=?', [uid]); if (s) d = Object.assign(d, JSON.parse(s)); } catch (_) { }
  MEM.set(uid, d); return JSON.stringify(d);
}
export async function saveMem(uid, before) {
  const s = JSON.stringify(mem(uid)); if (s === before) return;
  await q(pool, 'INSERT INTO tt_runtime(user_id,data,updated_at) VALUES(?,?,NOW()) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()', [uid, s]);
}

export async function banNote(uid) {
  const r = await one(pool, 'SELECT banned, ban_note FROM tt_users WHERE id=?', [uid]).catch(() => null);
  return r && +r.banned ? (r.ban_note !== '' ? r.ban_note : 'vi phạm quy định') : '';
}

// ---------- nguoi choi ----------
export async function userEquips(c, uid) {
  const rows = await q(c, 'SELECT id,code,plus,holes,stones,equipped FROM tt_equip WHERE user_id=? ORDER BY equipped DESC, id', [uid]);
  return rows.map(r => {
    const def = R.itemDef(r.code); if (!def) return null;
    const o = { id: +r.id, code: r.code, plus: +r.plus, holes: +r.holes, stones: r.stones || '', equipped: +r.equipped, slot: def.slot };
    o.st = R.equipStats(o); return o;
  }).filter(Boolean);
}
export async function newEquip(c, uid, code) {
  const def = R.itemDef(code); if (!def || def.type !== 'equip') return 0;
  return (await q(c, "INSERT INTO tt_equip(user_id,code,plus,holes,stones,equipped) VALUES(?,?,0,0,'',0) RETURNING id", [uid, code])).insertId;
}
export async function addItem(c, uid, code, qty) {
  if (qty <= 0) return;
  await q(c, 'INSERT INTO tt_inventory(user_id,item_code,qty) VALUES(?,?,?) ON CONFLICT (user_id,item_code) DO UPDATE SET qty=tt_inventory.qty+EXCLUDED.qty', [uid, code, qty]);
}
// Tru vat pham neu du. true/false
export async function takeItem(c, uid, code, n) {
  return (await q(c, 'UPDATE tt_inventory SET qty=qty-? WHERE user_id=? AND item_code=? AND qty>=?', [n, uid, code, n])).affectedRows > 0;
}
export async function giveItem(c, uid, code, qty) {
  if (qty <= 0) return;
  const def = R.itemDef(code);
  if (def && def.type === 'equip') { for (let i = 0; i < Math.min(qty, 20); i++) await newEquip(c, uid, code); return; }
  await addItem(c, uid, code, qty);
}

// Thong tin nguoi choi tra ve client (an password_hash) - giong user_payload cu
export async function userPayload(c, uid) {
  const u = await one(c, 'SELECT u.*, g.name as guild_name, gm.guild_id FROM tt_users u LEFT JOIN tt_guild_members gm ON gm.user_id=u.id LEFT JOIN tt_guilds g ON g.id=gm.guild_id WHERE u.id=? LIMIT 1', [uid]);
  if (!u) return null;
  delete u.password_hash;
  ['id', 'level', 'exp', 'gold', 'hp_max', 'mp_max', 'atk', 'def', 'stage_max', 'is_admin', 'ingot', 'guild_id', 'pk_mode'].forEach(k => { u[k] = int(u[k]); });
  u.avatar = u.avatar || '';
  u.friendly = u.friendly == null ? 100 : int(u.friendly);
  R.ATTRS.forEach(k => { u['pt_' + k] = int(u['pt_' + k]); });
  u.pts = Math.max(0, (u.level - 1) * R.PTS_PER_LV - R.ATTRS.reduce((s, k) => s + u['pt_' + k], 0));
  u.provoke = R.pkEff(u);
  u.jail = u.provoke >= R.PK_JAIL ? int(u.jail_stage) : 0;
  delete u.provoke_at; delete u.jail_stage; delete u.pk_at;
  u.inv = {}; (await q(c, 'SELECT item_code, qty FROM tt_inventory WHERE user_id=? AND qty>0', [uid])).forEach(r => { u.inv[r.item_code] = +r.qty; });
  u.stars = {}; (await q(c, 'SELECT stage_idx, stars FROM tt_user_progress WHERE user_id=? AND cleared=1', [uid])).forEach(r => { u.stars[String(r.stage_idx)] = +r.stars; });
  u.exp_need = R.expNeed(u.level);
  u.quests = {}; u.today = today();
  (await q(c, 'SELECT quest_id, state, progress, day::text AS day FROM tt_quests WHERE user_id=?', [uid])).forEach(r => { u.quests[r.quest_id] = { state: r.state, progress: +r.progress, day: r.day }; });
  u.equips = await userEquips(c, uid);
  u.gear = R.gearTotal(u.equips);
  return u;
}

// Cong exp + vang, tu len cap. Tra ve so cap tang
export async function grantReward(c, uid, exp, gold, items = {}, ingot = 0) {
  const me = await one(c, 'SELECT level, exp FROM tt_users WHERE id=?', [uid]); if (!me) return 0;
  let lv = +me.level, e = +me.exp + Math.max(0, int(exp)), ups = 0;
  while (lv < R.MAX_LEVEL && e >= R.expNeed(lv)) { e -= R.expNeed(lv); lv++; ups++; }
  if (lv >= R.MAX_LEVEL) e = Math.min(e, R.expNeed(lv));
  await q(c, 'UPDATE tt_users SET level=?, exp=?, gold=gold+?, hp_max=hp_max+?, mp_max=mp_max+?, atk=atk+?, def=def+? WHERE id=?',
    [lv, e, Math.max(0, int(gold)), R.LV_HP * ups, R.LV_MP * ups, R.LV_ATK * ups, R.LV_DEF * ups, uid]);
  for (const code in items) await giveItem(c, uid, code, int(items[code]));
  if (ingot > 0) await q(c, 'UPDATE tt_users SET ingot=ingot+? WHERE id=?', [int(ingot), uid]);
  return ups;
}

export async function pkAdjust(c, uid, dProv, dFriend, stage) {
  const r = await one(c, 'SELECT provoke, provoke_at, friendly, jail_stage FROM tt_users WHERE id=?', [uid]); if (!r) return;
  if (!stage) stage = int(await col(c, 'SELECT map_stage FROM tt_presence_online WHERE user_id=?', [uid])) || 1;
  const eff = R.pkEff(r), nv = Math.max(0, Math.min(999, eff + dProv)), fr = Math.max(-999, Math.min(999, int(r.friendly) + dFriend));
  const jail = nv >= R.PK_JAIL ? (int(r.jail_stage) > 0 && eff >= R.PK_JAIL ? int(r.jail_stage) : int(stage)) : 0;
  await q(c, 'UPDATE tt_users SET provoke=?, provoke_at=?, friendly=?, jail_stage=? WHERE id=?', [nv, now(), fr, jail, uid]);
}

// Cong tien do nhiem vu dang nhan. Khong bao gio lam hong luong chinh
export async function questProgress(c, uid, type, stage, n) {
  try {
    const ids = Object.values(R.questDefs()).filter(x => x.type === type && (int(x.stage) === 0 || int(x.stage) === int(stage))).map(x => x.id);
    if (!ids.length || n <= 0) return;
    await q(c, "UPDATE tt_quests SET progress=progress+? WHERE user_id=? AND state='active' AND quest_id = ANY(?)", [int(n), uid, ids]);
  } catch (_) { }
}
export async function sendMail(c, uid, text) { try { await q(c, 'INSERT INTO tt_mail(user_id,text) VALUES(?,?)', [uid, String(text).slice(0, 500)]); } catch (_) { } }

// ---------- do roi tren ban do ----------
export async function dropLoot(c, stage, items, x, owner, ownerOnly = false) {
  const res = [], t = now(), codes = Object.keys(items || {}), n = codes.length; let i = 0;
  for (const code of codes) {
    const qn = int(items[code]); if (qn <= 0 || !R.itemDef(code)) continue;
    const lx = Math.max(60, Math.min(8940, int(x) + Math.round((i - (n - 1) / 2) * 44) + randInt(-12, 12))); i++;
    const own = t + R.LOOT_OWN; // ca do Boss: nguoi khac cung nhat duoc sau LOOT_OWN giay
    const r = await q(c, 'INSERT INTO tt_map_loot(stage,x,code,qty,owner_id,own_until,expire_at) VALUES(?,?,?,?,?,?,?) RETURNING id', [int(stage), lx, code, qn, int(owner), own, t + R.LOOT_TTL]);
    res.push({ id: r.insertId, code, qty: qn, x: lx, owner: int(owner), own: own - t, ttl: R.LOOT_TTL });
  }
  return res;
}
export async function lootList(c, stage) {
  const t = now();
  await q(c, 'DELETE FROM tt_map_loot WHERE taken=1 OR expire_at<?', [t]);
  return (await q(c, 'SELECT id,code,qty,x,owner_id,own_until,expire_at FROM tt_map_loot WHERE stage=? ORDER BY id DESC LIMIT 100', [int(stage)]))
    .map(r => ({ id: +r.id, code: r.code, qty: +r.qty, x: +r.x, owner: +r.owner_id, own: Math.max(0, r.own_until - t), ttl: Math.max(1, r.expire_at - t) }));
}
// Ha Boss Ban Do: thuong lon + mo map ke tiep
export async function mapBossReward(c, uid, s, x = 0) {
  const idx = int(s.idx), u = await userPayload(c, uid); if (!u) return null;
  const first = !(String(idx) in u.stars);
  const exp = Math.round(int(s.boss_exp) * 1.5), gold = Math.round(int(s.boss_gold) * 1.5);
  const items = R.rollDrops(8, idx), up = 'cuong_' + R.stoneTier(idx);
  items[up] = (items[up] | 0) + 3; items.sat = (items.sat | 0) + 2; items.go = (items.go | 0) + 2;
  const ingot = 2 + Math.floor(idx / 5) + (first ? 3 + Math.floor(idx / 2) : 0);
  const ups = await grantReward(c, uid, exp, gold, {}, ingot);
  const loot = await dropLoot(c, idx, items, x, uid, true);
  await questProgress(c, uid, 'boss', idx, 1);
  await q(c, 'INSERT INTO tt_user_progress(user_id,stage_idx,cleared,stars) VALUES(?,?,1,3) ON CONFLICT (user_id,stage_idx) DO UPDATE SET cleared=1,stars=3', [uid, idx]);
  let unlock = 0;
  if (idx < R.MAX_STAGE && u.stage_max <= idx) { await q(c, 'UPDATE tt_users SET stage_max=GREATEST(stage_max,?) WHERE id=?', [idx + 1, uid]); unlock = idx + 1; }
  return { gained: { exp, gold, items: [], ingot }, ups, unlock, first, loot };
}

// Tin rieng moi + so loi moi dang cho (tra ve qua ping)
export async function socialUpdates(c, uid) {
  const o = { pms: [], offers: 0, freq: 0 }, m = mem(uid);
  try {
    if (m.pm_last == null) m.pm_last = int(await col(c, "SELECT COALESCE(MAX(id),0) FROM tt_messages WHERE scope='private' AND to_id=? AND created_at < NOW() - INTERVAL '10 minutes'", [uid]));
    const pms = await q(c, "SELECT m.id,m.from_id,m.text,u.nickname FROM tt_messages m JOIN tt_users u ON u.id=m.from_id WHERE m.scope='private' AND m.to_id=? AND m.id>? ORDER BY m.id LIMIT 20", [uid, m.pm_last]);
    if (pms.length) m.pm_last = +pms[pms.length - 1].id;
    o.pms = pms.map(r => ({ id: +r.id, from: +r.from_id, name: r.nickname, text: r.text }));
    o.offers = int(await col(c, "SELECT COUNT(*) FROM tt_offers WHERE to_id=? AND status=0 AND created_at > NOW() - INTERVAL '600 seconds'", [uid]));
    o.freq = int(await col(c, 'SELECT COUNT(*) FROM tt_friends WHERE friend_id=? AND status=0', [uid]));
  } catch (_) { }
  return o;
}
export async function takeMails(c, uid) {
  try {
    const mails = await q(c, 'SELECT id,text FROM tt_mail WHERE user_id=? AND seen=0 ORDER BY id LIMIT 10', [uid]);
    if (mails.length) await q(c, 'UPDATE tt_mail SET seen=1 WHERE user_id=? AND id<=?', [uid, mails[mails.length - 1].id]);
    return mails.map(m => m.text);
  } catch (_) { return []; }
}

// ---------- Pusher ----------
let P = undefined;
export function pusher() {
  if (P !== undefined) return P;
  const c = CFG.pusher;
  P = c.key && c.secret && c.appId ? makePusher(c) : null;
  return P;
}
export const rtMapChannel = stage => 'presence-' + CFG.pusher.prefix + '-map-' + int(stage);
export const rtUserChannel = uid => 'private-' + CFG.pusher.prefix + '-user-' + int(uid);
const goodSock = s => (s && /^\d+\.\d+$/.test(s) ? s : undefined);
// Viec chay nen (gui Pusher): router cho xong qua EdgeRuntime.waitUntil sau khi tra ket qua
const BG = new Set();
export function background(p) { BG.add(p); p.finally(() => BG.delete(p)); return p; }
export const pendingWork = () => Promise.allSettled([...BG]);
// Loi mang toi Pusher khong duoc lam hong luong game
export function rtTrigger(channel, event, data, socketId) {
  const p = pusher(); if (!p) return Promise.resolve(false);
  return background(p.trigger(channel, event, data, goodSock(socketId)).then(() => true, e => { console.error('Pusher trigger lỗi:', e.message); return false; }));
}
export async function rtTriggerMany(list) {
  const p = pusher(); if (!p || !list.length) return;
  for (let i = 0; i < list.length; i += 10) {
    const chunk = list.slice(i, i + 10);
    try { await p.triggerBatch(chunk.map(([channel, name, data, so]) => ({ channel, name, data, socket_id: goodSock(so) }))); }
    catch (e) { console.error('rtTriggerMany:', e.message); for (const [ch, ev, d, so] of chunk) await rtTrigger(ch, ev, d, so); }
  }
}
