// rules.js - luat game phia "may chu" (port tu config.php). PHAI GIONG RULES trong src/game/backend.js
import { db, nextId } from './db.js';

export const MAX_LEVEL = 100, MAX_STAGE = 30;
export const PK_JAIL = 100, PK_DECAY = 60;
export const LV_HP = 25, LV_MP = 8, LV_ATK = 4, LV_DEF = 2;
export const PTS_PER_LV = 5;
export const ATTRS = ['str', 'vit', 'ene', 'agi', 'dfn', 'mag'];
export const LOOT_OWN = 20, LOOT_TTL = 120;
export const MB_KILLS = 60;
export const SECT_LV = 25;
export const SAFE_W = 820, SAFE_R = 380, MAP_W = 9000;

export const now = () => Math.floor(Date.now() / 1000);
export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const int = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
export const inSafe = x => { x = int(x); return x < SAFE_W || x > MAP_W - SAFE_R; };

// ---------- du lieu dung chung voi client (src/data/*.js) ----------
let EQ = null;
export function equipDefs() {
  if (!EQ) { EQ = Object.assign({ items: [] }, window.TATON_EQUIP || {}); EQ.byCode = {}; EQ.items.forEach(x => { EQ.byCode[x.code] = x; }); }
  return EQ;
}
export const itemDef = code => equipDefs().byCode[code] || null;
export const sectsData = () => window.TATON_SECTS || {};
export const avatarDef = id => (sectsData().avatars || {})[id] || {};
export const sectMods = id => { const s = (sectsData().list || []).find(x => x.id === id); return (s && s.mods) || { hp: 0, mp: 0, atk: 0, def: 0 }; };
export const stageRow = idx => ((window.TATON_DATA && window.TATON_DATA.stages) || []).find(s => +s.idx === +idx) || null;
let QD = null;
export function questDefs() {
  if (!QD) { QD = {}; ((window.TATON_QUESTS || {}).quests || []).forEach(q => { QD[q.id] = q; }); }
  return QD;
}
// Cong thuc ren (truoc day nam trong bang tt_forge_recipes do install.php tao)
export const FORGE_RECIPES = [
  ['mu_sat', 'Thiết Khôi', 8, 4, 300, 0, 2],
  ['giay_sat', 'Thiết Ngoa', 8, 4, 300, 0, 2],
  ['giap_sat', 'Giáp Sắt', 12, 6, 400, 0, 2],
  ['kim_ty_giap', 'Kim Ty Nhuyễn Giáp', 35, 20, 1800, 0, 7],
  ['y_thien_kiem', 'Ỷ Thiên Kiếm', 35, 25, 2500, 0, 8],
  ['kiem_sat', 'Kiếm Sắt', 5, 3, 100, 15, 1],
  ['bua_da', 'Búa Đá Lớn', 10, 8, 300, 25, 2],
  ['dai_dao', 'Đại Đao Minh Giáo', 20, 15, 700, 45, 4],
  ['do_long', 'Đồ Long Đao', 40, 30, 2000, 90, 9],
].map(([weapon_code, weapon_name, need_iron, need_wood, need_gold, atk_bonus, req_stage], i) => ({ id: i + 1, weapon_code, weapon_name, need_iron, need_wood, need_gold, atk_bonus, req_stage }))
  .sort((a, b) => a.need_gold - b.need_gold);

// ---------- cap do / trang bi ----------
export function expNeed(lv) { lv = int(lv); if (lv <= 10) return 60 + 40 * lv; const k = lv - 10; return 460 + 120 * k + 18 * k * k; }
export const stoneTier = st => Math.max(1, Math.min(16, Math.round(int(st) * 16 / 30)));
export function parseStones(str) {
  return String(str || '').split(',').filter(Boolean).map(p => p.split(':')).filter(a => a.length === 2).map(a => ({ t: a[0], lv: int(a[1]) }));
}
export const joinStones = st => st.map(g => g.t + ':' + g.lv).join(',');
export function stoneVal(t, tier) { const it = itemDef('st_' + t + '_' + int(tier)); return it ? int(it.val) : 0; }
export function equipStats(row) {
  const d = itemDef(row.code), st = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 };
  if (!d) return st;
  const pct = int((equipDefs().enhance || {}).pct || 8);
  for (const k in (d.st || {})) st[k] += Math.floor(d.st[k] * (100 + pct * int(row.plus)) / 100);
  parseStones(row.stones).forEach(g => { if (g.t in st) st[g.t] += stoneVal(g.t, g.lv); });
  return st;
}
export function userEquips(uid) {
  return Object.values(db().equip).filter(e => e.user_id === uid).sort((a, b) => (b.equipped - a.equipped) || (a.id - b.id)).map(r => {
    const def = itemDef(r.code); if (!def) return null;
    const o = { id: r.id, code: r.code, plus: r.plus | 0, holes: r.holes | 0, stones: r.stones || '', equipped: r.equipped | 0, slot: def.slot };
    o.st = equipStats(o); return o;
  }).filter(Boolean);
}
export function gearTotal(equips) {
  const t = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 };
  equips.forEach(e => { if (e.equipped) for (const k in e.st) t[k] += e.st[k]; });
  return t;
}
export function newEquip(uid, code) {
  const def = itemDef(code); if (!def || def.type !== 'equip') return 0;
  const id = nextId('equip');
  db().equip[id] = { id, user_id: uid, code, plus: 0, holes: 0, stones: '', equipped: 0, created_at: now() };
  return id;
}
export function addItem(uid, code, qty) {
  if (qty <= 0) return;
  const inv = db().inv[uid] || (db().inv[uid] = {});
  inv[code] = (inv[code] | 0) + qty;
}
// Tru vat pham neu du (giong UPDATE ... WHERE qty>=?). Tra ve true/false
export function takeItem(uid, code, n) {
  const inv = db().inv[uid] || {};
  if ((inv[code] | 0) < n) return false;
  inv[code] -= n; return true;
}
export function giveItem(uid, code, qty) {
  if (qty <= 0) return;
  const def = itemDef(code);
  if (def && def.type === 'equip') { for (let i = 0; i < Math.min(qty, 20); i++) newEquip(uid, code); return; }
  addItem(uid, code, qty);
}

// Cong exp + vang, tu len cap. Tra ve so cap tang
export function grantReward(uid, exp, gold, items = {}, ingot = 0) {
  const u = db().users[uid]; if (!u) return 0;
  let lv = u.level | 0, e = (u.exp | 0) + Math.max(0, int(exp)), ups = 0;
  while (lv < MAX_LEVEL && e >= expNeed(lv)) { e -= expNeed(lv); lv++; ups++; }
  if (lv >= MAX_LEVEL) e = Math.min(e, expNeed(lv));
  Object.assign(u, { level: lv, exp: e, gold: u.gold + Math.max(0, int(gold)), hp_max: u.hp_max + LV_HP * ups, mp_max: u.mp_max + LV_MP * ups, atk: u.atk + LV_ATK * ups, def: u.def + LV_DEF * ups });
  for (const code in items) giveItem(uid, code, int(items[code]));
  if (ingot > 0) u.ingot += int(ingot);
  return ups;
}

// ---------- PK ----------
export function pkEff(u) {
  const p = int(u.provoke), at = int(u.provoke_at);
  return p > 0 && at > 0 ? Math.max(0, p - Math.floor(Math.max(0, now() - at) / PK_DECAY)) : Math.max(0, p);
}
export function pkAdjust(uid, dProv, dFriend, stage, presence) {
  const r = db().users[uid]; if (!r) return;
  if (!stage) stage = (presence && presence.stage) || 1;
  const eff = pkEff(r), nv = Math.max(0, Math.min(999, eff + dProv)), fr = Math.max(-999, Math.min(999, int(r.friendly) + dFriend));
  const jail = nv >= PK_JAIL ? (int(r.jail_stage) > 0 && eff >= PK_JAIL ? int(r.jail_stage) : int(stage)) : 0;
  Object.assign(r, { provoke: nv, provoke_at: now(), friendly: fr, jail_stage: jail });
}
export function combatStats(u) {
  const m = sectMods(u.sect || ''), av = avatarDef(u.avatar || ''), am = av.mods || {};
  const g = u.gear || { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 };
  const p = k => 1 + ((m[k] || 0) + (am[k] || 0)) / 100, a = k => int(u['pt_' + k]);
  return {
    atk: (u.atk + g.atk + 2 * a('str')) * p('atk'), def: (u.def + g.def + Math.floor(1.5 * a('dfn'))) * p('def'),
    hp: (u.hp_max + g.hp + 14 * a('vit')) * p('hp'), mp: (u.mp_max + g.mp + 7 * a('ene')) * p('mp'),
    crit: Math.min(60, 12 + g.crit + int(av.crit) + Math.floor(a('agi') / 4)) / 100, mag: a('mag'),
  };
}
export function sectCounterMult(a, b) {
  const d = sectsData(), pct = d.counterPct || [20, 15], c = {};
  (d.list || []).forEach(x => { c[x.id] = x.counters || []; });
  if ((c[a] || []).includes(b)) return 1 + pct[0] / 100;
  if ((c[b] || []).includes(a)) return 1 - pct[1] / 100;
  return 1;
}

// ---------- nhiem vu / thu ----------
export function questProgress(uid, type, stage, n) {
  if (n <= 0) return;
  const qs = db().quests[uid] || {};
  Object.values(questDefs()).forEach(q => {
    if (q.type !== type || !(int(q.stage) === 0 || int(q.stage) === int(stage))) return;
    const row = qs[q.id]; if (row && row.state === 'active') row.progress = (row.progress | 0) + int(n);
  });
}
export function sendMail(uid, text) { db().mail.push({ id: nextId('mail'), user_id: uid, text: String(text).slice(0, 500), seen: 0 }); }

// Bang roi do moi con quai
export function rollDrops(n, stage = 1) {
  const table = { binh_hp: 10, binh_mp: 7, sat: 18, go: 18 }, types = ['atk', 'hp', 'mp', 'def', 'crit'];
  const up = 'cuong_' + stoneTier(stage), upPct = int((equipDefs().upStone || {}).dropPct ?? 22), got = {};
  for (let i = 0; i < n; i++) {
    for (const code in table) if (randInt(1, 100) <= table[code]) got[code] = (got[code] | 0) + 1;
    if (randInt(1, 100) <= upPct) got[up] = (got[up] | 0) + 1;
    if (randInt(1, 100) <= 3) { const c = 'st_' + types[randInt(0, 4)] + '_1'; got[c] = (got[c] | 0) + 1; }
  }
  return got;
}

// Thach dau tu dong: luot danh xen ke, tinh khac che mon phai. A = nguoi moi
export function duelSim(A, B) {
  const ca = combatStats(A), cb = combatStats(B), ka = sectCounterMult(A.sect, B.sect), kb = sectCounterMult(B.sect, A.sect);
  let ha = Math.floor(ca.hp), hb = Math.floor(cb.hp); const log = [];
  const hit = (c, k, d) => { const cr = randInt(1, 1000) / 1000 < c.crit; return [Math.max(1, Math.round(c.atk * (randInt(90, 110) / 100) * (cr ? 1.6 : 1) * k - d.def * 0.5)), cr]; };
  for (let t = 1; t <= 30; t++) {
    let [d, cr] = hit(ca, ka, cb); hb -= d; log.push(`Hiệp ${t}: ${A.nickname} ${cr ? 'CHÍ MẠNG ' : ''}-${d} → ${B.nickname} còn ${Math.max(0, hb)}`);
    if (hb <= 0) return { win: 'A', log };
    [d, cr] = hit(cb, kb, ca); ha -= d; log.push(`Hiệp ${t}: ${B.nickname} ${cr ? 'CHÍ MẠNG ' : ''}-${d} → ${A.nickname} còn ${Math.max(0, ha)}`);
    if (ha <= 0) return { win: 'B', log };
  }
  return { win: ha / ca.hp >= hb / cb.hp ? 'A' : 'B', log };
}
