// api.js - "may chu" chay ngay trong trinh duyet, thay the toan bo api/*.php (PHP + MySQL + Pusher).
// Giu nguyen URL + tham so + dinh dang JSON tra ve cua ban PHP de game.js / app.js khong phai doi.
// Moi yeu cau = 1 transaction: neu handler nem loi -> rollback ve ban luu gan nhat.
import { db, commit, rollback, nextId, session } from './db.js';
import * as R from './rules.js';
const { int, now, randInt } = R;

class Out { constructor(data, status = 200) { this.data = data; this.status = status; } }
const out = (data, status) => { throw new Out(data, status); };
const fail = (error, status = 400, extra) => out(Object.assign({ ok: false, error }, extra || {}), status);

// Trang thai "phien" (thay $_SESSION): chi ton tai trong tab dang choi
const S = { run: null, last_pvp: 0, last_pk: 0, pm_last: null, lastChat: 0, presence: null };
// Do roi tren ban do: chi can trong luc choi (het han sau 2 phut) -> giu trong bo nho
let LOOT = [], lootSeq = 0;

// ---------- tai khoan ----------
async function hashPw(username, pw) {
  const text = 'tt2:' + username.toLowerCase() + ':' + pw;
  if (globalThis.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 'sha256:' + Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0; // du phong khi khong co WebCrypto (file://)
  return 'djb2:' + (h >>> 0).toString(16);
}
function requireLogin() {
  const uid = session.uid;
  if (!uid || !db().users[uid]) { session.uid = 0; fail('Chưa đăng nhập', 401); }
  return uid;
}
function guildOf(uid) { const gm = db().gmembers[uid]; return gm && db().guilds[gm.guild_id] ? gm : null; }

// Thong tin nguoi choi tra ve client (giong user_payload trong config.php)
function userPayload(uid) {
  const d = db(), r = d.users[uid]; if (!r) return null;
  const u = Object.assign({}, r); delete u.password_hash;
  const gm = guildOf(uid); u.guild_id = gm ? gm.guild_id : 0; u.guild_name = gm ? d.guilds[gm.guild_id].name : null;
  R.ATTRS.forEach(k => { u['pt_' + k] = int(u['pt_' + k]); });
  u.pts = Math.max(0, (u.level - 1) * R.PTS_PER_LV - R.ATTRS.reduce((s, k) => s + u['pt_' + k], 0));
  u.provoke = R.pkEff(r);
  u.jail = u.provoke >= R.PK_JAIL ? int(r.jail_stage) : 0;
  delete u.provoke_at; delete u.jail_stage; delete u.pk_at;
  const inv = d.inv[uid] || {}; u.inv = {}; for (const k in inv) if (inv[k] > 0) u.inv[k] = inv[k];
  u.stars = Object.assign({}, d.progress[uid] || {});
  u.exp_need = R.expNeed(u.level);
  u.quests = Object.assign({}, d.quests[uid] || {}); u.today = R.today();
  u.equips = R.userEquips(uid);
  u.gear = R.gearTotal(u.equips);
  return u;
}
function pay(uid, gold, ingot = 0) {
  const u = db().users[uid];
  if (gold > 0) { if (u.gold < gold) fail('Không đủ ngân lượng'); u.gold -= gold; }
  if (ingot > 0) { if (u.ingot < ingot) fail('Không đủ Nguyên Bảo'); u.ingot -= ingot; }
}
function take(uid, code, n) {
  if (n <= 0) return;
  if (!R.takeItem(uid, code, n)) { const d = R.itemDef(code); fail('Thiếu ' + (d ? d.name : code) + ' ×' + n); }
}
function nick(id) { const u = db().users[id]; return u ? u.nickname : ''; }
// Chi co nguoi choi tren trinh duyet nay -> "truc tuyen" = chinh minh dang o ban do
function isOnline(id) { return S.presence && S.presence.uid === id && now() - S.presence.t < 40 ? S.presence.stage : 0; }
function notify(id, text) { R.sendMail(id, text); }

// ---------- do roi ----------
function dropLoot(stage, items, x, owner, ownerOnly = false) {
  const res = [], t = now(), codes = Object.keys(items || {}), n = codes.length; let i = 0;
  codes.forEach(code => {
    const q = int(items[code]); if (q <= 0 || !R.itemDef(code)) return;
    const lx = Math.max(60, Math.min(8940, int(x) + Math.round((i - (n - 1) / 2) * 44) + randInt(-12, 12))); i++;
    const own = t + (ownerOnly ? R.LOOT_TTL : R.LOOT_OWN);
    const row = { id: ++lootSeq, stage: int(stage), x: lx, code, qty: q, owner_id: owner, own_until: own, expire_at: t + R.LOOT_TTL, taken: 0 };
    LOOT.push(row);
    res.push({ id: row.id, code, qty: q, x: lx, owner, own: own - t, ttl: R.LOOT_TTL });
  });
  return res;
}
function lootList(stage) {
  const t = now(); LOOT = LOOT.filter(l => !l.taken && l.expire_at >= t);
  return LOOT.filter(l => l.stage === int(stage)).slice(-100).reverse().map(r => ({ id: r.id, code: r.code, qty: r.qty, x: r.x, owner: r.owner_id, own: Math.max(0, r.own_until - t), ttl: Math.max(1, r.expire_at - t) }));
}
function mapBossReward(uid, s, x = 0) {
  const idx = int(s.idx), u = userPayload(uid); if (!u) return null;
  const first = !(String(idx) in u.stars);
  const exp = Math.round(int(s.boss_exp) * 1.5), gold = Math.round(int(s.boss_gold) * 1.5);
  const items = R.rollDrops(8, idx), up = 'cuong_' + R.stoneTier(idx);
  items[up] = (items[up] | 0) + 3; items.sat = (items.sat | 0) + 2; items.go = (items.go | 0) + 2;
  const ingot = 2 + Math.floor(idx / 5) + (first ? 3 + Math.floor(idx / 2) : 0);
  const ups = R.grantReward(uid, exp, gold, {}, ingot);
  const loot = dropLoot(idx, items, x, uid, true);
  R.questProgress(uid, 'boss', idx, 1);
  (db().progress[uid] || (db().progress[uid] = {}))[idx] = 3;
  let unlock = 0;
  if (idx < R.MAX_STAGE && u.stage_max <= idx) { const me = db().users[uid]; me.stage_max = Math.max(me.stage_max, idx + 1); unlock = idx + 1; }
  return { gained: { exp, gold, items: [], ingot }, ups, unlock, first, loot };
}
function socialUpdates(uid) {
  const d = db(), t = now(), o = { pms: [], offers: 0, freq: 0 };
  if (S.pm_last == null) S.pm_last = d.messages.filter(m => m.scope === 'private' && m.to_id === uid && m.created_at < t - 600).reduce((a, m) => Math.max(a, m.id), 0);
  const pms = d.messages.filter(m => m.scope === 'private' && m.to_id === uid && m.id > S.pm_last).slice(0, 20);
  if (pms.length) S.pm_last = pms[pms.length - 1].id;
  o.pms = pms.map(m => ({ id: m.id, from: m.from_id, name: nick(m.from_id), text: m.text }));
  o.offers = d.offers.filter(x => x.to_id === uid && x.status === 0 && x.created_at > t - 600).length;
  o.freq = d.friends.filter(f => f.friend_id === uid && f.status === 0).length;
  return o;
}
function takeMails(uid) {
  const list = db().mail.filter(m => m.user_id === uid && !m.seen).slice(0, 10);
  list.forEach(m => { m.seen = 1; });
  db().mail = db().mail.filter(m => !m.seen || m.id > (db().seq.mail | 0) - 200); // giu gon
  return list.map(m => m.text);
}

// =====================================================================
const API = {};

// ---------- auth.php ----------
API.auth = {
  async register(P) {
    const u = String(P.username || '').trim(), p = String(P.password || ''); let n = String(P.nickname || '').trim() || u;
    if (u.length < 3 || p.length < 4) fail('Tên đăng nhập ≥3 ký tự, mật khẩu ≥4 ký tự');
    if (!/^[A-Za-z0-9_.]{3,50}$/.test(u)) fail('Tên đăng nhập chỉ gồm chữ không dấu, số, _ .');
    n = n.slice(0, 30);
    const d = db();
    if (Object.values(d.users).some(x => x.username.toLowerCase() === u.toLowerCase())) fail('Tên đăng nhập đã tồn tại');
    const hash = await hashPw(u, p);
    const uid = nextId('user');
    d.users[uid] = {
      id: uid, username: u, password_hash: hash, nickname: n, level: 1, exp: 0, gold: 500, hp_max: 200, mp_max: 100, atk: 18, def: 6,
      stage_max: 1, weapon_code: 'dao_thuong', sect: '', ingot: 5, avatar: '', eq_v: 1, pk_mode: 0, friendly: 100, provoke: 0, provoke_at: 0,
      jail_stage: 0, pk_at: 0, pt_str: 0, pt_vit: 0, pt_ene: 0, pt_agi: 0, pt_dfn: 0, pt_mag: 0, is_admin: 0, banned: 0, ban_note: '', created_at: now(),
    };
    R.addItem(uid, 'binh_hp', 3); R.addItem(uid, 'binh_mp', 2);
    const eid = R.newEquip(uid, 'dao_thuong'); if (eid) d.equip[eid].equipped = 1;
    d.farm[uid] = Array.from({ length: 6 }, (_, slot) => ({ slot, crop_code: null, planted_at: 0, grow_sec: 0 }));
    session.uid = uid;
    return { ok: true, uid };
  },
  async login(P) {
    const u = String(P.username || '').trim(), p = String(P.password || '');
    const user = Object.values(db().users).find(x => x.username.toLowerCase() === u.toLowerCase());
    if (!user || user.password_hash !== await hashPw(user.username, p)) fail('Sai tài khoản/mật khẩu', 401);
    session.uid = user.id;
    return { ok: true, uid: user.id, nickname: user.nickname };
  },
  logout() { session.uid = 0; return { ok: true }; },
  me() { const uid = requireLogin(); return { ok: true, user: userPayload(uid) }; },
  accounts() { return { ok: true, list: Object.values(db().users).map(u => ({ username: u.username, nickname: u.nickname, level: u.level })) }; },
};

// ---------- game.php ----------
API.game = {
  _login: true,
  stages(P, uid) { return { ok: true, stages: (window.TATON_DATA || {}).stages || [], progress: db().progress[uid] || {} }; },
  start_stage(P, uid) {
    const idx = int(P.stage || 1), s = R.stageRow(idx); if (!s) fail('Bản đồ không tồn tại');
    const me = userPayload(uid);
    if (idx > me.stage_max) fail('Chưa mở bản đồ này', 403);
    if (me.jail && me.jail !== idx) fail('Bạn đang bị TRUY NÃ (khiêu khích ' + me.provoke + ') - kẹt tại bản đồ ' + me.jail + '. Chờ giảm khiêu khích hoặc dùng Thanh Tâm Đan.', 403);
    S.run = { stage: idx, mode: 'train', t: now(), kills: 0, tokens: 6.0, last: performance.now() / 1000, fbk: 0, fbt: 0, mbk: 0, mbt: 0 };
    return { ok: true, user: me };
  },
  // Bao giet quai (gom lo n con). "May chu" tu tinh exp/vang/do roi
  kill(P, uid) {
    const idx = int(P.stage); let n = Math.max(0, Math.min(8, int(P.n ?? 1))), el = Math.max(0, Math.min(4, int(P.e)));
    if (n + el < 1) fail('n?');
    const run = S.run; if (!run || run.stage !== idx) fail('Chưa vào bản đồ');
    const s = R.stageRow(idx); if (!s) fail('Bản đồ không tồn tại');
    const t = performance.now() / 1000, tokens = Math.min(12, run.tokens + (t - run.last) * 2.5);
    n = Math.min(n, Math.floor(tokens)); el = Math.min(el, Math.max(0, Math.floor(tokens) - n));
    if (n + el <= 0) { run.tokens = tokens; run.last = t; fail('Quá nhanh', 429); }
    run.tokens = tokens - n - el; run.last = t; run.kills += n + el; run.fbk += n + el; run.mbk += n + el;
    const w = n + 4 * el, mul = 0.7;
    const exp = Math.round(int(s.mob_exp) * w * mul), gold = Math.round(int(s.mob_gold) * w * mul);
    const drops = R.rollDrops(n + 2 * el, idx);
    n += el;
    const ups = R.grantReward(uid, exp, gold, {});
    const loot = dropLoot(idx, drops, int(P.px), uid);
    R.questProgress(uid, 'kill', idx, n);
    const me = db().users[uid]; if (me.friendly < 100) me.friendly = Math.min(100, me.friendly + 1);
    return { ok: true, n, gained: { exp, gold, items: [] }, loot, ups, user: userPayload(uid) };
  },
  fboss(P, uid) {
    const idx = int(P.stage), run = S.run;
    if (!run || run.stage !== idx) fail('Chưa vào bản đồ');
    if (run.fbk < 12) fail('Chưa đủ điều kiện');
    if (now() - run.fbt < 40) fail('Quá nhanh', 429);
    const s = R.stageRow(idx); if (!s) fail('Bản đồ không tồn tại');
    run.fbk = 0; run.fbt = now();
    const exp = Math.round(int(s.boss_exp) * 0.5), gold = Math.round(int(s.boss_gold) * 0.5);
    const items = R.rollDrops(6, idx), up = 'cuong_' + R.stoneTier(idx);
    items.sat = (items.sat | 0) + 1; items.go = (items.go | 0) + 1; items[up] = (items[up] | 0) + 2;
    const ups = R.grantReward(uid, exp, gold, {}, 1);
    const loot = dropLoot(idx, items, int(P.px), uid, true);
    R.questProgress(uid, 'fboss', idx, 1);
    return { ok: true, gained: { exp, gold, items: [], ingot: 1 }, loot, ups, user: userPayload(uid) };
  },
  mboss(P, uid) {
    const idx = int(P.stage), run = S.run;
    if (!run || run.stage !== idx) fail('Chưa vào bản đồ');
    if (run.mbk < R.MB_KILLS - 10) fail('Chưa đủ điều kiện');
    if (now() - run.mbt < 90) fail('Quá nhanh', 429);
    const s = R.stageRow(idx); if (!s) fail('Bản đồ không tồn tại');
    run.mbk = 0; run.mbt = now();
    const r = mapBossReward(uid, s, int(P.px));
    return { ok: true, gained: r.gained, ups: r.ups, unlock: r.unlock, loot: r.loot, user: userPayload(uid) };
  },
  choose_sect(P, uid) {
    const sid = String(P.sect || '');
    if (!(R.sectsData().list || []).some(x => x.id === sid)) fail('Môn phái không tồn tại');
    const me = db().users[uid];
    if (me.level < R.SECT_LV) fail('Đạt cấp ' + R.SECT_LV + ' mới được bái nhập môn phái');
    if (me.sect) fail('Bạn đã gia nhập môn phái rồi');
    me.sect = sid; if (!me.avatar) me.avatar = 'samurai';
    return { ok: true, user: userPayload(uid) };
  },
  choose_avatar(P, uid) {
    const av = String(P.avatar || '');
    if (!['samurai', 'kunoichi'].includes(av)) fail('Nhân vật không hợp lệ');
    const me = db().users[uid]; if (me.avatar) fail('Bạn đã tạo nhân vật rồi');
    me.avatar = av;
    return { ok: true, user: userPayload(uid) };
  },
  use_item(P, uid) {
    const code = String(P.code || '');
    if (!['binh_hp', 'binh_mp'].includes(code)) fail('Không dùng được');
    if (!R.takeItem(uid, code, 1)) fail('Hết thuốc');
    return { ok: true, user: userPayload(uid) };
  },
  shop_buy(P, uid) {
    const code = String(P.code || ''), cur = P.cur === 'ingot' ? 'ingot' : 'gold', it = R.itemDef(code);
    if (!it) fail('Vật phẩm không tồn tại');
    const unit = cur === 'ingot' ? int(it.ingot) : int(it.price);
    if (unit <= 0) fail(cur === 'ingot' ? 'Không bán bằng Nguyên Bảo' : 'Không bán bằng ngân lượng');
    const me = db().users[uid];
    if (it.type === 'equip' && me.level < int(it.lv || 1)) fail('Cần cấp ' + int(it.lv) + ' để mua món này');
    const qty = it.type === 'equip' ? 1 : Math.max(1, Math.min(99, int(P.qty || 1))), cost = unit * qty;
    if (me[cur] < cost) fail(cur === 'ingot' ? 'Không đủ Nguyên Bảo' : 'Không đủ ngân lượng');
    me[cur] -= cost;
    R.giveItem(uid, code, qty);
    return { ok: true, item: { code, name: it.name }, qty, user: userPayload(uid) };
  },
  sell(P, uid) {
    const code = String(P.code || ''), it = R.itemDef(code);
    if (!it || it.type === 'equip' || int(it.sell) <= 0) fail('Không bán được');
    const have = (db().inv[uid] || {})[code] | 0;
    const n = 'qty' in P ? Math.max(1, Math.min(have, int(P.qty))) : have;
    if (have <= 0 || n <= 0 || !R.takeItem(uid, code, n)) fail('Không có hàng để bán');
    const gold = n * int(it.sell);
    db().users[uid].gold += gold;
    return { ok: true, gold, qty: n, user: userPayload(uid) };
  },
  stat_add(P, uid) {
    const k = String(P.attr || ''); let n = Math.max(1, Math.min(500, int(P.n || 1)));
    if (!R.ATTRS.includes(k)) fail('Thuộc tính không hợp lệ');
    const r = db().users[uid], used = R.ATTRS.reduce((s, x) => s + int(r['pt_' + x]), 0), free = (r.level - 1) * R.PTS_PER_LV - used;
    if (free <= 0) fail('Hết điểm tiềm năng - lên cấp để có thêm');
    n = Math.min(n, free); r['pt_' + k] = int(r['pt_' + k]) + n;
    return { ok: true, n, user: userPayload(uid) };
  },
  stat_reset(P, uid) {
    const cost = 10, r = db().users[uid];
    if (r.ingot < cost) fail('Cần ' + cost + ' Nguyên Bảo để tẩy điểm');
    r.ingot -= cost; R.ATTRS.forEach(k => { r['pt_' + k] = 0; });
    return { ok: true, user: userPayload(uid) };
  },
  shop_list() { return { ok: true, items: R.equipDefs().items.filter(x => int(x.price) > 0 || int(x.ingot) > 0 || x.type === 'crop') }; },
};

// ---------- loot.php ----------
API.loot = {
  _login: true,
  list(P) { return { ok: true, loot: lootList(int(P.stage)) }; },
  pick(P, uid) {
    const id = int(P.id), t = now(), l = LOOT.find(x => x.id === id);
    if (!l || l.taken || l.expire_at < t) return { ok: false, gone: true, error: 'Vật phẩm đã bị nhặt hoặc biến mất' };
    if (l.owner_id !== uid && l.own_until > t) return { ok: false, wait: l.own_until - t, error: 'Vật phẩm của người khác (còn ' + (l.own_until - t) + ' giây)' };
    const pr = S.presence;
    if (pr && t - pr.t < 30 && (pr.stage !== l.stage || Math.abs(pr.x - l.x) > 1400)) return { ok: false, far: true, error: 'Lại gần hơn để nhặt' };
    l.taken = 1;
    R.giveItem(uid, l.code, l.qty);
    return { ok: true, id, code: l.code, qty: l.qty, user: userPayload(uid) };
  },
};

// ---------- quest.php ----------
function qStatus(q, u) {
  let row = (u.quests || {})[q.id] || null;
  if (row && q.daily && row.state === 'done' && row.day !== u.today) row = null;
  if (row) {
    if (row.state === 'done') return 'done';
    const prog = q.type === 'level' ? u.level : int(row.progress);
    return prog >= int(q.n) ? 'ready' : 'active';
  }
  const r = q.req || {};
  if (r.level && u.level < int(r.level)) return 'locked';
  if (r.stage && u.stage_max < int(r.stage)) return 'locked';
  if (r.prev) { const p = (u.quests || {})[r.prev]; if (!p || p.state !== 'done') return 'locked'; }
  return 'available';
}
API.quest = {
  _login: true,
  accept(P, uid) {
    const q = R.questDefs()[P.id]; if (!q) fail('Nhiệm vụ không tồn tại');
    const u = userPayload(uid), st = qStatus(q, u);
    if (st !== 'available') fail(st === 'locked' ? 'Chưa đủ điều kiện nhận' : 'Đã nhận nhiệm vụ này');
    (db().quests[uid] || (db().quests[uid] = {}))[q.id] = { state: 'active', progress: 0, day: u.today };
    return { ok: true, user: userPayload(uid) };
  },
  claim(P, uid) {
    const q = R.questDefs()[P.id]; if (!q) fail('Nhiệm vụ không tồn tại');
    const u = userPayload(uid);
    if (qStatus(q, u) !== 'ready') fail('Chưa hoàn thành nhiệm vụ');
    const row = (db().quests[uid] || {})[q.id];
    if (!row || row.state !== 'active') fail('Đã nhận thưởng rồi');
    row.state = 'done'; row.day = u.today;
    const rw = q.reward || {};
    const exp = int(rw.exp) + int(rw.exp_lv) * u.level, gold = int(rw.gold) + int(rw.gold_lv) * u.level, items = rw.items || {}, ingot = int(rw.ingot);
    const ups = R.grantReward(uid, exp, gold, items, ingot);
    return { ok: true, ups, gained: { exp, gold, items, ingot }, user: userPayload(uid) };
  },
};

// ---------- farm.php ----------
const CROPS = { lua: { sec: 30, yield: 3 }, go: { sec: 60, yield: 2 }, sat: { sec: 120, yield: 2 } };
function plots(uid) {
  const f = db().farm[uid] || (db().farm[uid] = []);
  for (let s = 0; s < 6; s++) if (!f.find(p => p.slot === s)) f.push({ slot: s, crop_code: null, planted_at: 0, grow_sec: 0 });
  return f.sort((a, b) => a.slot - b.slot);
}
API.farm = {
  _login: true,
  state(P, uid) {
    const t = now();
    return { ok: true, now: t, plots: plots(uid).map(p => Object.assign({}, p, { ready: !!(p.crop_code && t - p.planted_at >= p.grow_sec), remain: p.crop_code ? Math.max(0, p.grow_sec - (t - p.planted_at)) : 0 })) };
  },
  plant(P, uid) {
    const slot = int(P.slot), crop = String(P.crop || 'lua');
    if (!CROPS[crop]) fail('Không có giống cây này');
    if (slot < 0 || slot > 5) fail('Ô không hợp lệ');
    const p = plots(uid).find(x => x.slot === slot);
    if (p.crop_code) fail('Ô đang có cây, thu hoạch trước đã');
    Object.assign(p, { crop_code: crop, planted_at: now(), grow_sec: CROPS[crop].sec });
    return { ok: true };
  },
  harvest(P, uid) {
    const slot = int(P.slot), p = plots(uid).find(x => x.slot === slot);
    if (!p || !p.crop_code) fail('Ô trống');
    if (now() - p.planted_at < p.grow_sec) fail('Chưa chín');
    const code = p.crop_code, y = (CROPS[code] || {}).yield || 1;
    Object.assign(p, { crop_code: null, planted_at: 0, grow_sec: 0 });
    R.addItem(uid, code, y);
    R.questProgress(uid, 'harvest', 0, 1);
    return { ok: true, got: { [code]: y }, user: userPayload(uid) };
  },
};

// ---------- forge.php ----------
API.forge = {
  _login: true,
  list() { return { ok: true, recipes: R.FORGE_RECIPES }; },
  forge(P, uid) {
    const re = R.FORGE_RECIPES.find(r => r.weapon_code === P.code); if (!re) fail('Không có công thức');
    const me = userPayload(uid);
    if (me.stage_max < re.req_stage) fail('Cần mở màn ' + re.req_stage + ' trước', 403);
    if (me.gold < re.need_gold) fail('Thiếu ngân lượng');
    if ((me.inv.sat | 0) < re.need_iron || (me.inv.go | 0) < re.need_wood) fail('Thiếu sắt/gỗ - trồng trọt + đánh quái để kiếm');
    pay(uid, re.need_gold); take(uid, 'sat', re.need_iron); take(uid, 'go', re.need_wood);
    const eid = R.newEquip(uid, re.weapon_code); if (!eid) fail('Trang bị không hợp lệ');
    R.questProgress(uid, 'forge', 0, 1);
    return { ok: true, weapon: re.weapon_code, equip_id: eid, user: userPayload(uid) };
  },
};

// ---------- equip.php ----------
function myEquip(uid, id) { const r = db().equip[int(id)]; if (!r || r.user_id !== uid) fail('Không tìm thấy trang bị'); return r; }
const done = (uid, extra) => Object.assign({ ok: true, user: userPayload(uid) }, extra || {});
API.equip = {
  _login: true,
  equip(P, uid) {
    const r = myEquip(uid, P.id), def = R.itemDef(r.code), me = db().users[uid];
    if (me.level < int(def.lv)) fail('Cần cấp ' + int(def.lv) + ' để trang bị');
    Object.values(db().equip).forEach(o => { if (o.user_id === uid && o.equipped && o.id !== r.id) { const od = R.itemDef(o.code); if (od && od.slot === def.slot) o.equipped = 0; } });
    r.equipped = 1;
    if (def.slot === 'weapon') me.weapon_code = r.code;
    return done(uid);
  },
  unequip(P, uid) { myEquip(uid, P.id).equipped = 0; return done(uid); },
  sell(P, uid) {
    const r = myEquip(uid, P.id);
    if (r.equipped) fail('Tháo trang bị trước khi bán');
    const price = int(R.itemDef(r.code).sell) + r.plus * 100;
    delete db().equip[r.id];
    R.parseStones(r.stones).forEach(g => R.addItem(uid, 'st_' + g.t + '_' + g.lv, 1));
    db().users[uid].gold += price;
    return done(uid, { gold: price });
  },
  enhance(P, uid) {
    const r = myEquip(uid, P.id), en = R.equipDefs().enhance, l = r.plus | 0;
    if (l >= int(en.max)) fail('Đã cường hóa tối đa +' + en.max);
    const protect = !!int(P.protect) && l >= int(en.dropFrom);
    pay(uid, int(en.gold[l])); take(uid, en.stone + (l + 1), 1);
    if (protect) take(uid, 'bua_ho', 1);
    const ok = randInt(1, 100) <= int(en.rate[l]);
    r.plus = ok ? l + 1 : (l >= int(en.dropFrom) && !protect ? l - 1 : l);
    R.questProgress(uid, 'enhance', 0, 1);
    return done(uid, { success: ok, plus: r.plus, from: l });
  },
  punch(P, uid) {
    const r = myEquip(uid, P.id), E = R.equipDefs(), def = R.itemDef(r.code), h = r.holes | 0, max = int(E.holes.max[def.slot] ?? 3);
    if (h >= max) fail('Trang bị này tối đa ' + max + ' lỗ sao');
    pay(uid, int(E.holes.gold[h])); take(uid, 'duc_sao', int(E.holes.tool[h]));
    r.holes = h + 1;
    return done(uid, { holes: h + 1 });
  },
  inlay(P, uid) {
    const sd = R.itemDef(String(P.stone || '')); if (!sd || sd.type !== 'stone') fail('Đá không hợp lệ');
    const r = myEquip(uid, P.id), st = R.parseStones(r.stones);
    if (st.length >= r.holes) fail('Hết lỗ trống - đục thêm lỗ sao trước');
    take(uid, sd.code, 1);
    st.push({ t: sd.stone, lv: int(sd.tier) }); r.stones = R.joinStones(st);
    return done(uid);
  },
  unlay(P, uid) {
    const k = int(P.slot ?? -1), r = myEquip(uid, P.id), st = R.parseStones(r.stones);
    if (!st[k]) fail('Lỗ sao trống');
    pay(uid, int(R.equipDefs().unlayGoldPerTier) * st[k].lv);
    R.addItem(uid, 'st_' + st[k].t + '_' + st[k].lv, 1);
    st.splice(k, 1); r.stones = R.joinStones(st);
    return done(uid);
  },
  merge(P, uid) {
    const code = String(P.stone || ''), sd = R.itemDef(code), E = R.equipDefs();
    if (sd && sd.type === 'up') { // Da Cuong Hoa: N vien cap t -> 1 vien cap t+1
      const U = E.upStone, t = int(sd.tier);
      if (t >= int(U.max)) fail('Đá đã ở cấp cao nhất');
      take(uid, code, int(U.need)); pay(uid, int(U.goldPerTier) * t);
      R.addItem(uid, U.prefix + (t + 1), 1); R.questProgress(uid, 'merge', 0, 1);
      return done(uid, { got: U.prefix + (t + 1) });
    }
    if (!sd || sd.type !== 'stone') fail('Đá không hợp lệ');
    const t = int(sd.tier), mg = E.merge;
    if (t >= int(mg.maxTier)) fail('Đá đã ở bậc cao nhất');
    take(uid, code, int(mg.need)); pay(uid, int(mg.goldPerTier) * t);
    const got = 'st_' + sd.stone + '_' + (t + 1);
    R.addItem(uid, got, 1); R.questProgress(uid, 'merge', 0, 1);
    return done(uid, { got });
  },
  exchange(P, uid) {
    const n = Math.max(1, Math.min(1000, int(P.n || 1))), g = n * int(R.equipDefs().exchange);
    pay(uid, 0, n); db().users[uid].gold += g;
    return done(uid, { gold: g });
  },
  avatar(P, uid) {
    const av = String(P.avatar || ''); if (!['samurai', 'kunoichi'].includes(av)) fail('Tạo hình không hợp lệ');
    const me = db().users[uid], old = me.avatar || '';
    if (old === av) fail('Đang dùng tạo hình này');
    if (old !== '') pay(uid, int(R.sectsData().avatarCost ?? 2000));
    me.avatar = av;
    return done(uid);
  },
};

// ---------- pk.php ----------
API.pk = {
  _login: true,
  fight(P, uid) {
    const did = int(P.defender_id); if (did === uid) fail('Tự đánh mình?');
    const foe = db().users[did]; if (!foe) fail('Đối thủ không tồn tại');
    if (now() - S.last_pk < 5) fail('Nghỉ 5 giây giữa các trận PK', 429); S.last_pk = now();
    const A = userPayload(uid), T = userPayload(did);
    if (A.pk_mode <= 0) fail('Bật chế độ PK (PK Bang / Đồ sát) trước khi thách đấu');
    if (A.level < 10 || T.level < 10) fail('Tân thủ dưới cấp 10 được bảo vệ');
    if (A.pk_mode === 1 && A.guild_id && A.guild_id === T.guild_id) fail('PK Bang không đánh người cùng bang');
    const c1 = R.combatStats(A), c2 = R.combatStats(T);
    const a1 = Math.round(c1.atk * R.sectCounterMult(A.sect, T.sect)), d1 = Math.floor(c1.def), a2 = Math.round(c2.atk * R.sectCounterMult(T.sect, A.sect)), d2 = Math.floor(c2.def);
    if (T.pk_mode === 0 && T.provoke < 50) R.pkAdjust(uid, 15, -5, 0, S.presence);
    let hp1 = Math.floor(c1.hp), hp2 = Math.floor(c2.hp), win = 0; const log = [];
    for (let t = 1; t <= 20 && !win; t++) {
      const x = Math.max(1, a1 - Math.floor(d2 / 2) + randInt(-3, 5)); hp2 -= x; log.push(`Hiệp ${t}: bạn chém ${x} (đối thủ ${hp2})`);
      if (hp2 <= 0) { win = uid; break; }
      const y = Math.max(1, a2 - Math.floor(d1 / 2) + randInt(-3, 5)); hp1 -= y; log.push(`Hiệp ${t}: đối thủ phản ${y} (bạn ${hp1})`);
      if (hp1 <= 0) win = did;
    }
    if (!win) win = hp1 >= hp2 ? uid : did;
    const gold = Math.min(100, foe.gold);
    if (win === uid) { db().users[uid].gold += gold; foe.gold = Math.max(0, foe.gold - gold); }
    db().pk_logs.push({ id: nextId('pklog'), challenger_id: uid, defender_id: did, winner_id: win, log: log.join('\n'), status: 'done', created_at: now() });
    return { ok: true, win, log, gold };
  },
  cleanse(P, uid) {
    if (!R.takeItem(uid, 'thanh_tam', 1)) fail('Không có Thanh Tâm Đan (mua bằng Nguyên Bảo ở Tiệm)');
    R.pkAdjust(uid, -50, 0, 0, S.presence);
    return { ok: true, user: userPayload(uid) };
  },
  online_players() { return { ok: true, players: [] }; },
  history(P, uid) {
    const logs = db().pk_logs.filter(l => l.challenger_id === uid || l.defender_id === uid).slice(-10).reverse()
      .map(l => ({ id: l.id, challenger_id: l.challenger_id, defender_id: l.defender_id, winner_id: l.winner_id, created_at: l.created_at, c_name: nick(l.challenger_id), d_name: nick(l.defender_id) }));
    return { ok: true, logs };
  },
};

// ---------- social.php ----------
const EMBLEMS = ['em_lion', 'em_dragon', 'em_flame', 'em_eagle', 'em_yinyang', 'em_lotus', 'em_tiger', 'em_snake', 'em_swords', 'em_sun', 'em_wolf', 'em_fox'];
const membersOf = gid => Object.entries(db().gmembers).filter(([, m]) => m.guild_id === gid);
API.social = {
  _login: true,
  guild_list() {
    const guilds = Object.values(db().guilds).sort((a, b) => b.id - a.id).slice(0, 50)
      .map(g => Object.assign({}, g, { master_name: nick(g.master_id), total: membersOf(g.id).length }));
    return { ok: true, guilds };
  },
  guild_my(P, uid) {
    const gm = guildOf(uid); if (!gm) return { ok: true, guild: null, members: [] };
    const g = Object.assign({}, db().guilds[gm.guild_id], { role: gm.role });
    const members = membersOf(gm.guild_id).map(([id, m]) => { const u = db().users[id] || {}; return { id: +id, nickname: u.nickname, level: u.level, role: m.role }; });
    return { ok: true, guild: g, members };
  },
  guild_create(P, uid) {
    const name = String(P.name || '').trim();
    if (name.length < 3 || name.length > 30) fail('Tên bang 3-30 ký tự');
    if (Object.values(db().guilds).some(g => g.name === name)) fail('Tên bang đã có');
    if (guildOf(uid)) fail('Bạn đã có bang');
    const em = EMBLEMS.includes(P.emblem) ? P.emblem : 'em_lion', cost = 200, me = db().users[uid];
    if (me.gold < cost) fail('Lập bang cần ' + cost + ' ngân lượng');
    me.gold -= cost;
    const gid = nextId('guild');
    db().guilds[gid] = { id: gid, name, master_id: uid, level: 1, notice: '', emblem: em, created_at: now() };
    db().gmembers[uid] = { guild_id: gid, role: 'master', joined_at: now() };
    return { ok: true, guild_id: gid };
  },
  guild_join(P, uid) {
    const gid = int(P.guild_id);
    if (guildOf(uid)) fail('Rời bang cũ trước');
    if (!db().guilds[gid]) fail('Bang không tồn tại');
    db().gmembers[uid] = { guild_id: gid, role: 'member', joined_at: now() };
    return { ok: true };
  },
  guild_notice(P, uid) {
    const gm = guildOf(uid); if (!gm || gm.role !== 'master') fail('Chỉ bang chủ được sửa thông báo', 403);
    db().guilds[gm.guild_id].notice = String(P.notice || '').trim().slice(0, 200);
    return { ok: true };
  },
  guild_kick(P, uid) {
    const tid = int(P.target_id), gm = guildOf(uid);
    if (!gm || gm.role !== 'master' || tid === uid) fail('Không có quyền', 403);
    const t = db().gmembers[tid]; if (t && t.guild_id === gm.guild_id) delete db().gmembers[tid];
    return { ok: true };
  },
  guild_leave(P, uid) {
    const gm = guildOf(uid); if (!gm) return { ok: true };
    delete db().gmembers[uid];
    if (gm.role === 'master') {
      const next = membersOf(gm.guild_id).sort((a, b) => a[1].joined_at - b[1].joined_at)[0];
      if (next) { next[1].role = 'master'; db().guilds[gm.guild_id].master_id = +next[0]; } else delete db().guilds[gm.guild_id];
    }
    return { ok: true };
  },
  chat_send(P, uid) {
    const scope = ['world', 'guild', 'private'].includes(P.scope) ? P.scope : 'world', text = String(P.text || '').slice(0, 300).trim();
    if (!text) fail('Tin nhắn trống');
    let gid = null, to = null;
    if (scope === 'guild') { const gm = guildOf(uid); if (!gm) fail('Chưa có bang'); gid = gm.guild_id; }
    if (scope === 'private') { to = int(P.to_id); if (!to || to === uid) fail('Thiếu người nhận'); if (!db().users[to]) fail('Người nhận không tồn tại'); }
    if (now() - S.lastChat < 2) fail('Chat chậm lại 2 giây', 429); S.lastChat = now();
    const d = db(); d.messages.push({ id: nextId('msg'), scope, guild_id: gid, from_id: uid, to_id: to, text, created_at: now() });
    if (d.messages.length > 600) d.messages = d.messages.slice(-500);
    return { ok: true };
  },
  chat_load(P, uid) {
    const scope = ['world', 'guild', 'private'].includes(P.scope) ? P.scope : 'world', last = int(P.last_id);
    let list;
    if (scope === 'world') list = db().messages.filter(m => m.scope === 'world' && m.id > last);
    else if (scope === 'guild') { const gm = guildOf(uid); if (!gm) return { ok: true, msgs: [] }; list = db().messages.filter(m => m.scope === 'guild' && m.guild_id === gm.guild_id && m.id > last); }
    else { const o = int(P.to_id); list = db().messages.filter(m => m.scope === 'private' && ((m.from_id === uid && m.to_id === o) || (m.from_id === o && m.to_id === uid)) && m.id > last); }
    return { ok: true, msgs: list.slice(0, 30).map(m => Object.assign({}, m, { nickname: nick(m.from_id) })) };
  },
  pk_mode(P, uid) {
    const m = Math.max(0, Math.min(2, int(P.mode))), me = db().users[uid];
    if (m > 0 && me.level < 10) fail('Cấp 10 mới được bật PK');
    if (now() - int(me.pk_at) < 5) fail('Đổi chế độ PK chậm lại (5 giây)', 429);
    me.pk_mode = m; me.pk_at = now();
    return { ok: true, mode: m, user: userPayload(uid) };
  },
  pvp_hit() { return { ok: false, error: 'Đối thủ ngoại tuyến' }; },
  mail(P, uid) { return { ok: true, mails: takeMails(uid), social: socialUpdates(uid) }; },
  online_ping(P, uid) {
    const stage = Math.max(1, Math.min(R.MAX_STAGE, int(P.stage || 1))), x = Math.max(0, Math.min(20000, int(P.x ?? 100)));
    S.presence = { uid, stage, x, t: now() };
    const me = db().users[uid];
    return { ok: true, online: [], dmg: 0, mails: takeMails(uid), pk: { pk_mode: me.pk_mode, provoke: R.pkEff(me), friendly: me.friendly }, social: socialUpdates(uid) };
  },
  rank() {
    const rank = Object.values(db().users).sort((a, b) => (b.level - a.level) || (b.exp - a.exp)).slice(0, 20)
      .map(u => ({ id: u.id, nickname: u.nickname, level: u.level, exp: u.exp, gold: u.gold, stage_max: u.stage_max }));
    return { ok: true, rank };
  },
};

// ---------- friend.php (cac tai khoan khac tren cung trinh duyet: dang xuat / dang nhap tai khoan kia de tra loi) ----------
const OFFER_TTL = 600, TRADE_KINDS = ['potion', 'mat', 'stone', 'up', 'crop'];
const fmtVN = n => (+n || 0).toLocaleString('vi-VN');
function targetId(P, uid) { const t = int(P.target_id); if (t <= 0 || t === uid) fail('Người chơi không hợp lệ'); return t; }
function tradeText(d) {
  const p = [];
  if (d.gold) p.push(fmtVN(d.gold) + ' ngân lượng');
  if (d.ingot) p.push(d.ingot + ' Nguyên Bảo');
  for (const c in (d.items || {})) { const it = R.itemDef(c); p.push(d.items[c] + ' ' + (it ? it.name : c)); }
  (d.eqn || []).forEach(n => p.push(n));
  return p.length ? p.join(', ') : 'không gì';
}
const liveOffer = (o, t) => o.status === 0 && o.created_at > t - OFFER_TTL;
API.friend = {
  _login: true,
  profile(P, uid) {
    const t = targetId(P, uid), u = userPayload(t); if (!u) fail('Không tìm thấy người chơi');
    let rel = 'none';
    for (const f of db().friends) {
      if (!((f.user_id === uid && f.friend_id === t) || (f.user_id === t && f.friend_id === uid))) continue;
      if (f.status === 1) { rel = 'friend'; break; } rel = f.user_id === uid ? 'sent' : 'incoming';
    }
    const me = userPayload(uid);
    return { ok: true, p: { id: t, nickname: u.nickname, level: u.level, sect: u.sect, avatar: u.avatar, guild: u.guild_name || '', pk_mode: u.pk_mode, provoke: u.provoke, online: isOnline(t), rel, counter: R.sectCounterMult(me.sect, u.sect) } };
  },
  friends(P, uid) {
    const list = db().friends.filter(f => f.user_id === uid || f.friend_id === uid).map(f => {
      const id = f.user_id === uid ? f.friend_id : f.user_id, u = db().users[id]; if (!u) return null;
      return { id, nickname: u.nickname, level: u.level, sect: u.sect, status: f.status, mine: f.user_id === uid, map: isOnline(id) };
    }).filter(Boolean).sort((a, b) => (b.status - a.status) || (b.level - a.level));
    return { ok: true, friends: list };
  },
  friend_add(P, uid) {
    const t = targetId(P, uid); if (!nick(t)) fail('Không tìm thấy người chơi');
    const F = db().friends;
    if (F.filter(f => f.user_id === uid || f.friend_id === uid).length >= 100) fail('Danh sách bạn bè tối đa 100');
    const rev = F.find(f => f.user_id === t && f.friend_id === uid);
    if (rev) { rev.status = 1; notify(t, nick(uid) + ' đã đồng ý kết bạn với bạn.'); return { ok: true, status: 1 }; }
    if (!F.find(f => f.user_id === uid && f.friend_id === t)) F.push({ user_id: uid, friend_id: t, status: 0 });
    notify(t, nick(uid) + ' muốn kết bạn với bạn (bấm V để xem).');
    return { ok: true, status: 0 };
  },
  friend_accept(P, uid) {
    const t = targetId(P, uid), f = db().friends.find(x => x.user_id === t && x.friend_id === uid && x.status === 0);
    if (!f) fail('Không có lời mời kết bạn');
    f.status = 1; notify(t, nick(uid) + ' đã đồng ý kết bạn với bạn.');
    return { ok: true };
  },
  friend_remove(P, uid) {
    const t = targetId(P, uid);
    db().friends = db().friends.filter(f => !((f.user_id === uid && f.friend_id === t) || (f.user_id === t && f.friend_id === uid)));
    return { ok: true };
  },
  offers(P, uid) {
    const t = now(); db().offers.forEach(o => { if (o.status === 0 && o.created_at < t - OFFER_TTL) o.status = 4; });
    const list = db().offers.filter(o => o.status === 0 && (o.to_id === uid || o.from_id === uid)).slice(-40).reverse().map(o => {
      const d = o.data || {};
      return { id: o.id, kind: o.kind, incoming: o.to_id === uid, from: o.from_id, to: o.to_id, from_name: nick(o.from_id), to_name: nick(o.to_id), give: tradeText(d.give || {}), ask: tradeText(d.ask || {}), stake: int(d.stake) };
    });
    return { ok: true, offers: list };
  },
  trade_offer(P, uid) {
    const t = targetId(P, uid); if (!nick(t)) fail('Không tìm thấy người chơi');
    const me = userPayload(uid);
    const gold = Math.max(0, int(P.gold)), ingot = Math.max(0, int(P.ingot)), askG = Math.max(0, int(P.ask_gold)), askI = Math.max(0, int(P.ask_ingot));
    if (gold > me.gold) fail('Không đủ ngân lượng'); if (ingot > me.ingot) fail('Không đủ Nguyên Bảo');
    let raw = {}; try { raw = JSON.parse(String(P.items || '{}')) || {}; } catch (_) { raw = {}; }
    const items = {};
    for (const c in raw) {
      const n = int(raw[c]); if (n <= 0) continue; const it = R.itemDef(c);
      if (!it || !TRADE_KINDS.includes(it.type)) fail('Vật phẩm không giao dịch được');
      if (n > (me.inv[c] | 0)) fail('Không đủ ' + it.name); items[c] = n;
    }
    if (Object.keys(items).length > 12) fail('Tối đa 12 loại vật phẩm / lần');
    const eqs = [...new Set(String(P.equips || '').split(',').map(int).filter(Boolean))];
    if (eqs.length > 6) fail('Tối đa 6 trang bị / lần');
    const eqn = eqs.map(id => {
      const e = me.equips.find(x => x.id === id); if (!e) fail('Trang bị không thuộc về bạn'); if (e.equipped) fail('Tháo trang bị trước khi giao dịch');
      return ((R.itemDef(e.code) || {}).name || e.code) + (e.plus ? ' +' + e.plus : '');
    });
    if (!gold && !ingot && !Object.keys(items).length && !eqs.length && !askG && !askI) fail('Giao dịch trống');
    if (db().offers.filter(o => o.from_id === uid && o.status === 0).length >= 10) fail('Bạn có quá nhiều lời mời đang chờ');
    const data = { give: { gold, ingot, items, equips: eqs, eqn }, ask: { gold: askG, ingot: askI } };
    db().offers.push({ id: nextId('offer'), kind: 'trade', from_id: uid, to_id: t, data, status: 0, created_at: now() });
    notify(t, me.nickname + ' mời giao dịch: đưa ' + tradeText(data.give) + ' · đổi lấy ' + tradeText(data.ask) + ' (bấm V để xem).');
    return { ok: true };
  },
  offer_decline(P, uid) { return closeOffer(P, uid, 'to_id', 2); },
  offer_cancel(P, uid) { return closeOffer(P, uid, 'from_id', 3); },
  trade_accept(P, uid) {
    const t = now(), o = db().offers.find(x => x.id === int(P.id) && x.to_id === uid && x.kind === 'trade' && liveOffer(x, t));
    if (!o) fail('Lời mời không còn hoặc đã hết hạn');
    const from = o.from_id, g = o.data.give || {}, k = o.data.ask || {}, A = db().users[from], B = db().users[uid];
    if (!A || !B) fail('Người chơi không tồn tại');
    if (A.gold < int(g.gold) || A.ingot < int(g.ingot)) fail('Người mời không còn đủ tiền');
    if (B.gold < int(k.gold) || B.ingot < int(k.ingot)) fail('Bạn không đủ tiền để đổi');
    A.gold += int(k.gold) - int(g.gold); A.ingot += int(k.ingot) - int(g.ingot);
    B.gold += int(g.gold) - int(k.gold); B.ingot += int(g.ingot) - int(k.ingot);
    for (const c in (g.items || {})) { const n = int(g.items[c]); if (!R.takeItem(from, c, n)) fail('Người mời không còn đủ vật phẩm'); R.addItem(uid, c, n); }
    (g.equips || []).forEach(id => { const e = db().equip[id]; if (!e || e.user_id !== from || e.equipped) fail('Trang bị của người mời đã thay đổi (đang mặc hoặc đã bán)'); e.user_id = uid; e.equipped = 0; });
    o.status = 1;
    notify(from, nick(uid) + ' đã đồng ý giao dịch: bạn nhận ' + tradeText(k) + '.');
    return { ok: true, got: tradeText(g), user: userPayload(uid) };
  },
  duel_invite(P, uid) {
    const t = targetId(P, uid), me = userPayload(uid); if (!nick(t)) fail('Không tìm thấy người chơi');
    const stake = Math.max(0, Math.min(100000, int(P.stake)));
    if (stake > me.gold) fail('Không đủ ngân lượng đặt cược');
    if (db().offers.some(o => o.from_id === uid && o.to_id === t && o.kind === 'duel' && o.status === 0)) fail('Đã gửi lời thách đấu, chờ đối phương trả lời');
    db().offers.push({ id: nextId('offer'), kind: 'duel', from_id: uid, to_id: t, data: { stake }, status: 0, created_at: now() });
    notify(t, me.nickname + ' thách đấu bạn' + (stake ? ' (cược ' + fmtVN(stake) + ' ngân lượng)' : '') + ' - bấm V để nhận.');
    return { ok: true };
  },
  duel_accept(P, uid) {
    const t = now(), o = db().offers.find(x => x.id === int(P.id) && x.to_id === uid && x.kind === 'duel' && liveOffer(x, t));
    if (!o) fail('Lời thách đấu không còn');
    const from = o.from_id, stake = int((o.data || {}).stake);
    if (stake > 0) [uid, from].forEach(id => { if ((db().users[id] || {}).gold < stake) fail((id === uid ? 'Bạn' : 'Người thách đấu') + ' không đủ ngân lượng đặt cược'); });
    const A = userPayload(from), B = userPayload(uid), r = R.duelSim(A, B);
    const win = r.win === 'A' ? from : uid, lose = win === from ? uid : from;
    if (stake > 0) { db().users[win].gold += stake; db().users[lose].gold -= stake; }
    o.status = 1;
    db().pk_logs.push({ id: nextId('pklog'), challenger_id: from, defender_id: uid, winner_id: win, log: r.log.join('\n'), status: 'duel', created_at: now() });
    R.questProgress(uid, 'duel', 0, 1); R.questProgress(from, 'duel', 0, 1);
    notify(from, 'Thách đấu với ' + B.nickname + ': ' + (win === from ? 'BẠN THẮNG' : 'bạn thua') + (stake ? ' (' + (win === from ? '+' : '-') + fmtVN(stake) + ' ngân lượng)' : '') + '.');
    return { ok: true, win: win === uid, winner: win === from ? A.nickname : B.nickname, log: r.log, stake, user: userPayload(uid) };
  },
};
function closeOffer(P, uid, col, status) {
  const o = db().offers.find(x => x.id === int(P.id) && x[col] === uid && x.status === 0);
  if (!o) fail('Lời mời không còn');
  o.status = status;
  if (status === 2) notify(o.from_id, nick(uid) + ' đã từ chối lời mời ' + (o.kind === 'duel' ? 'thách đấu' : 'giao dịch') + ' của bạn.');
  return { ok: true };
}

// rt.php (ban do chung thoi gian thuc) can may chu that -> khong co o ban tinh
API.rt = { _login: true, join() { return { ok: false, error: 'offline' }; }, leave() { return { ok: true }; } };

// =====================================================================
// Diem vao duy nhat: handle('api/game.php?action=kill', {stage:1,...}) -> { status, data }
export async function handle(url, data) {
  const u = new URL(url, 'http://local/');
  const name = (u.pathname.match(/([a-z_]+)\.php$/) || [])[1];
  const P = Object.fromEntries(u.searchParams.entries());
  if (data) for (const k in data) P[k] = data[k] == null ? '' : String(data[k]);
  const mod = API[name], fn = mod && mod[P.action];
  try {
    if (typeof fn !== 'function' || P.action[0] === '_') fail('action?');
    const uid = mod._login ? requireLogin() : 0;
    const res = await fn(P, uid);
    commit();
    return { status: 200, data: res };
  } catch (e) {
    rollback();
    if (e instanceof Out) return { status: e.status, data: e.data };
    console.error('[local-server]', name, P.action, e);
    return { status: 500, data: { ok: false, error: 'Máy chủ đang bận, vui lòng thử lại.' } };
  }
}
export const resetRuntime = () => { S.run = null; S.presence = null; S.pm_last = null; LOOT = []; };
