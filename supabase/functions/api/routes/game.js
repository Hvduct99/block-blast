// auth.php, game.php, loot.php, quest.php, farm.php, forge.php
import { pool, q, one, col, tx } from '../db.js';
import { STAGES } from '../shared/data.js';
import { R, DEPS, int, now, clock, fail, out, mem, signToken, userPayload, grantReward, giveItem, addItem, takeItem, newEquip, dropLoot, lootList, mapBossReward, questProgress, rtTrigger, rtMapChannel } from '../core.js';

const stage = idx => R.stageRow(idx);

// ---------- auth.php ----------
export const auth = {
  _public: true,
  async register({ P }) {
    const u = String(P.username || '').trim(), p = String(P.password || ''); let n = String(P.nickname || '').trim() || u;
    if (u.length < 3 || p.length < 4) fail('Tên đăng nhập ≥3 ký tự, mật khẩu ≥4 ký tự');
    if (!/^[A-Za-z0-9_.]{3,50}$/.test(u)) fail('Tên đăng nhập chỉ gồm chữ không dấu, số, _ .');
    n = [...n].slice(0, 30).join('');
    if (await one(pool, 'SELECT id FROM tt_users WHERE username=?', [u])) fail('Tên đăng nhập đã tồn tại');
    const hash = await DEPS.bcrypt.hash(p, 10);
    const uid = await tx(async c => {
      const id = (await q(c, 'INSERT INTO tt_users(username,password_hash,nickname) VALUES(?,?,?) RETURNING id', [u, hash, n])).insertId;
      await addItem(c, id, 'binh_hp', 3); await addItem(c, id, 'binh_mp', 2);
      const eid = await newEquip(c, id, 'dao_thuong'); if (eid) await q(c, 'UPDATE tt_equip SET equipped=1 WHERE id=?', [eid]);
      await q(c, 'UPDATE tt_users SET eq_v=1, ingot=5 WHERE id=?', [id]);
      for (let s = 0; s < 6; s++) await q(c, 'INSERT INTO tt_farm_plots(user_id,slot) VALUES(?,?) ON CONFLICT DO NOTHING', [id, s]);
      return id;
    });
    return { ok: true, uid, token: signToken(uid) };
  },
  async login({ P }) {
    const u = String(P.username || '').trim(), p = String(P.password || '');
    const user = await one(pool, 'SELECT * FROM tt_users WHERE username=?', [u]);
    // mat khau tao boi PHP password_hash ($2y$) dung chung chuan bcrypt
    if (!user || !await DEPS.bcrypt.compare(p, String(user.password_hash).replace(/^\$2y\$/, '$2b$'))) fail('Sai tài khoản/mật khẩu', 401);
    if (+user.banned) fail('Tài khoản đã bị khóa: ' + (user.ban_note || 'vi phạm quy định'), 403);
    return { ok: true, uid: +user.id, nickname: user.nickname, token: signToken(+user.id) };
  },
  logout() { return { ok: true }; }, // token nam o trinh duyet, client tu xoa
  async me({ requireLogin }) {
    const uid = await requireLogin();
    const u = await userPayload(pool, uid); if (!u) fail('Tài khoản không tồn tại', 401);
    return { ok: true, user: u };
  },
};

// ---------- game.php ----------
export const game = {
  async stages({ uid }) {
    const progress = {}; (await q(pool, 'SELECT * FROM tt_user_progress WHERE user_id=?', [uid])).forEach(r => { progress[r.stage_idx] = r; });
    return { ok: true, stages: STAGES, progress };
  },
  async start_stage({ P, uid }) {
    const idx = int(P.stage || 1), s = stage(idx); if (!s) fail('Bản đồ không tồn tại');
    const me = await userPayload(pool, uid);
    if (idx > me.stage_max) fail('Chưa mở bản đồ này', 403);
    if (me.jail && me.jail !== idx) fail('Bạn đang bị TRUY NÃ (khiêu khích ' + me.provoke + ') - kẹt tại bản đồ ' + me.jail + '. Chờ giảm khiêu khích hoặc dùng Thanh Tâm Đan.', 403);
    mem(uid).run = { stage: idx, mode: 'train', t: now(), kills: 0, tokens: 6.0, last: clock(), fbk: 0, fbt: 0, mbk: 0, mbt: 0 };
    return { ok: true, user: me };
  },
  // Bao giet quai (gom lo n con). May chu tu tinh exp/vang/do roi
  async kill({ P, uid }) {
    const idx = int(P.stage); let n = Math.max(0, Math.min(8, int(P.n ?? 1))), el = Math.max(0, Math.min(4, int(P.e)));
    if (n + el < 1) fail('n?');
    const run = mem(uid).run; if (!run || run.stage !== idx) fail('Chưa vào bản đồ');
    const s = stage(idx); if (!s) fail('Bản đồ không tồn tại');
    const t = clock(), tokens = Math.min(12, run.tokens + (t - run.last) * 2.5);
    n = Math.min(n, Math.floor(tokens)); el = Math.min(el, Math.max(0, Math.floor(tokens) - n));
    if (n + el <= 0) { run.tokens = tokens; run.last = t; fail('Quá nhanh', 429); }
    run.tokens = tokens - n - el; run.last = t; run.kills += n + el; run.fbk += n + el; run.mbk += n + el;
    const w = n + 4 * el, mul = 0.7, exp = Math.round(int(s.mob_exp) * w * mul), gold = Math.round(int(s.mob_gold) * w * mul);
    const drops = R.rollDrops(n + 2 * el, idx);
    n += el;
    const ups = await grantReward(pool, uid, exp, gold, {});
    const loot = await dropLoot(pool, idx, drops, int(P.px), uid);
    await questProgress(pool, uid, 'kill', idx, n);
    await q(pool, 'UPDATE tt_users SET friendly=LEAST(100,friendly+1) WHERE id=? AND friendly<100', [uid]);
    return { ok: true, n, gained: { exp, gold, items: [] }, loot, ups, user: await userPayload(pool, uid) };
  },
  async fboss({ P, uid }) {
    const idx = int(P.stage), run = mem(uid).run;
    if (!run || run.stage !== idx) fail('Chưa vào bản đồ');
    if (run.fbk < 12) fail('Chưa đủ điều kiện');
    if (now() - run.fbt < 40) fail('Quá nhanh', 429);
    const s = stage(idx); if (!s) fail('Bản đồ không tồn tại');
    run.fbk = 0; run.fbt = now();
    const exp = Math.round(int(s.boss_exp) * 0.5), gold = Math.round(int(s.boss_gold) * 0.5), items = R.rollDrops(6, idx), up = 'cuong_' + R.stoneTier(idx);
    items.sat = (items.sat | 0) + 1; items.go = (items.go | 0) + 1; items[up] = (items[up] | 0) + 2;
    const ups = await grantReward(pool, uid, exp, gold, {}, 1);
    const loot = await dropLoot(pool, idx, items, int(P.px), uid, true);
    await questProgress(pool, uid, 'fboss', idx, 1);
    return { ok: true, gained: { exp, gold, items: [], ingot: 1 }, loot, ups, user: await userPayload(pool, uid) };
  },
  // Boss Ban Do khi danh mot minh (khong co ban do chung)
  async mboss({ P, uid }) {
    const idx = int(P.stage), run = mem(uid).run;
    if (!run || run.stage !== idx) fail('Chưa vào bản đồ');
    if (run.mbk < R.MB_KILLS - 10) fail('Chưa đủ điều kiện');
    if (now() - run.mbt < 90) fail('Quá nhanh', 429);
    const s = stage(idx); if (!s) fail('Bản đồ không tồn tại');
    run.mbk = 0; run.mbt = now();
    const r = await mapBossReward(pool, uid, s, int(P.px));
    return { ok: true, gained: r.gained, ups: r.ups, unlock: r.unlock, loot: r.loot, user: await userPayload(pool, uid) };
  },
  async choose_sect({ P, uid }) {
    const sid = String(P.sect || '');
    if (!(R.sectsData().list || []).some(x => x.id === sid)) fail('Môn phái không tồn tại');
    const me = await userPayload(pool, uid);
    if (me.level < R.SECT_LV) fail('Đạt cấp ' + R.SECT_LV + ' mới được bái nhập môn phái');
    const r = await q(pool, "UPDATE tt_users SET sect=?, avatar=CASE WHEN avatar IS NULL OR avatar='' THEN 'samurai' ELSE avatar END WHERE id=? AND (sect IS NULL OR sect='')", [sid, uid]);
    if (r.affectedRows < 1) fail('Bạn đã gia nhập môn phái rồi');
    return { ok: true, user: await userPayload(pool, uid) };
  },
  async choose_avatar({ P, uid }) {
    const av = String(P.avatar || '');
    if (!['samurai', 'kunoichi'].includes(av)) fail('Nhân vật không hợp lệ');
    const r = await q(pool, "UPDATE tt_users SET avatar=? WHERE id=? AND (avatar IS NULL OR avatar='')", [av, uid]);
    if (r.affectedRows < 1) fail('Bạn đã tạo nhân vật rồi');
    return { ok: true, user: await userPayload(pool, uid) };
  },
  async use_item({ P, uid }) {
    const code = String(P.code || '');
    if (!['binh_hp', 'binh_mp'].includes(code)) fail('Không dùng được');
    if (!await takeItem(pool, uid, code, 1)) fail('Hết thuốc');
    return { ok: true, user: await userPayload(pool, uid) };
  },
  async shop_buy({ P, uid }) {
    const code = String(P.code || ''), cur = P.cur === 'ingot' ? 'ingot' : 'gold', it = R.itemDef(code);
    if (!it) fail('Vật phẩm không tồn tại');
    const unit = cur === 'ingot' ? int(it.ingot) : int(it.price);
    if (unit <= 0) fail(cur === 'ingot' ? 'Không bán bằng Nguyên Bảo' : 'Không bán bằng ngân lượng');
    if (it.type === 'equip') { const me = await userPayload(pool, uid); if (me.level < int(it.lv || 1)) fail('Cần cấp ' + int(it.lv) + ' để mua món này'); }
    const qty = it.type === 'equip' ? 1 : Math.max(1, Math.min(99, int(P.qty || 1))), cost = unit * qty;
    await tx(async c => {
      const r = await q(c, `UPDATE tt_users SET ${cur}=${cur}-? WHERE id=? AND ${cur}>=?`, [cost, uid, cost]);
      if (r.affectedRows < 1) fail(cur === 'ingot' ? 'Không đủ Nguyên Bảo' : 'Không đủ ngân lượng');
      await giveItem(c, uid, code, qty);
    });
    return { ok: true, item: { code, name: it.name }, qty, user: await userPayload(pool, uid) };
  },
  async sell({ P, uid }) {
    const code = String(P.code || ''), it = R.itemDef(code);
    if (!it || it.type === 'equip' || int(it.sell) <= 0) fail('Không bán được');
    const have = int(await col(pool, 'SELECT qty FROM tt_inventory WHERE user_id=? AND item_code=?', [uid, code]));
    const n = 'qty' in P ? Math.max(1, Math.min(have, int(P.qty))) : have;
    if (have <= 0 || n <= 0) fail('Không có hàng để bán');
    const gold = n * int(it.sell);
    await tx(async c => {
      if (!await takeItem(c, uid, code, n)) fail('Không có hàng để bán');
      await q(c, 'UPDATE tt_users SET gold=gold+? WHERE id=?', [gold, uid]);
    });
    return { ok: true, gold, qty: n, user: await userPayload(pool, uid) };
  },
  async stat_add({ P, uid }) {
    const k = String(P.attr || ''); let n = Math.max(1, Math.min(500, int(P.n || 1)));
    if (!R.ATTRS.includes(k)) fail('Thuộc tính không hợp lệ');
    n = await tx(async c => {
      const r = await one(c, 'SELECT * FROM tt_users WHERE id=? FOR UPDATE', [uid]);
      const free = (int(r.level) - 1) * R.PTS_PER_LV - R.ATTRS.reduce((s, x) => s + int(r['pt_' + x]), 0);
      if (free <= 0) fail('Hết điểm tiềm năng - lên cấp để có thêm');
      const m = Math.min(n, free);
      await q(c, `UPDATE tt_users SET pt_${k}=pt_${k}+? WHERE id=?`, [m, uid]);
      return m;
    });
    return { ok: true, n, user: await userPayload(pool, uid) };
  },
  async stat_reset({ uid }) {
    const cost = 10, r = await q(pool, 'UPDATE tt_users SET ingot=ingot-?, pt_str=0, pt_vit=0, pt_ene=0, pt_agi=0, pt_dfn=0, pt_mag=0 WHERE id=? AND ingot>=?', [cost, uid, cost]);
    if (r.affectedRows < 1) fail('Cần ' + cost + ' Nguyên Bảo để tẩy điểm');
    return { ok: true, user: await userPayload(pool, uid) };
  },
  shop_list() { return { ok: true, items: R.equipDefs().items.filter(x => int(x.price) > 0 || int(x.ingot) > 0 || x.type === 'crop') }; },
};

// ---------- loot.php ----------
export const loot = {
  async list({ P }) { return { ok: true, loot: await lootList(pool, int(P.stage)) }; },
  async pick({ P, uid }) {
    const id = int(P.id), t = now();
    const res = await tx(async c => {
      const l = await one(c, 'SELECT * FROM tt_map_loot WHERE id=? FOR UPDATE', [id]);
      if (!l || +l.taken || l.expire_at < t) out({ ok: false, gone: true, error: 'Vật phẩm đã bị nhặt hoặc biến mất' });
      if (+l.owner_id !== uid && l.own_until > t) out({ ok: false, wait: l.own_until - t, error: 'Vật phẩm của người khác (còn ' + (l.own_until - t) + ' giây)' });
      const pr = await one(c, 'SELECT map_stage, x FROM tt_presence_online WHERE user_id=? AND updated_at > NOW() - INTERVAL \'30 seconds\'', [uid]);
      if (!pr || +pr.map_stage !== +l.stage || Math.abs(pr.x - l.x) > 700) out({ ok: false, far: true, error: 'Lại gần hơn để nhặt' });
      await q(c, 'UPDATE tt_map_loot SET taken=1 WHERE id=?', [id]);
      await giveItem(c, uid, l.code, +l.qty);
      return l;
    });
    const me = await userPayload(pool, uid);
    rtTrigger(rtMapChannel(res.stage), 'loot-take', { id, by: uid, name: me.nickname });
    return { ok: true, id, code: res.code, qty: +res.qty, user: me };
  },
};

// ---------- quest.php ----------
function qStatus(qd, u) {
  let row = (u.quests || {})[qd.id] || null;
  if (row && qd.daily && row.state === 'done' && row.day !== u.today) row = null;
  if (row) { if (row.state === 'done') return 'done'; return (qd.type === 'level' ? u.level : int(row.progress)) >= int(qd.n) ? 'ready' : 'active'; }
  const r = qd.req || {};
  if (r.level && u.level < int(r.level)) return 'locked';
  if (r.stage && u.stage_max < int(r.stage)) return 'locked';
  if (r.prev) { const p = (u.quests || {})[r.prev]; if (!p || p.state !== 'done') return 'locked'; }
  return 'available';
}
export const quest = {
  async accept({ P, uid }) {
    const qd = R.questDefs()[P.id]; if (!qd) fail('Nhiệm vụ không tồn tại');
    const u = await userPayload(pool, uid), st = qStatus(qd, u);
    if (st !== 'available') fail(st === 'locked' ? 'Chưa đủ điều kiện nhận' : 'Đã nhận nhiệm vụ này');
    await q(pool, "INSERT INTO tt_quests(user_id,quest_id,state,progress,day) VALUES(?,?,'active',0,?) ON CONFLICT (user_id,quest_id) DO UPDATE SET state='active',progress=0,day=EXCLUDED.day", [uid, qd.id, u.today]);
    return { ok: true, user: await userPayload(pool, uid) };
  },
  async claim({ P, uid }) {
    const qd = R.questDefs()[P.id]; if (!qd) fail('Nhiệm vụ không tồn tại');
    const u = await userPayload(pool, uid);
    if (qStatus(qd, u) !== 'ready') fail('Chưa hoàn thành nhiệm vụ');
    const up = await q(pool, "UPDATE tt_quests SET state='done',day=? WHERE user_id=? AND quest_id=? AND state='active'", [u.today, uid, qd.id]);
    if (up.affectedRows < 1) fail('Đã nhận thưởng rồi');
    const rw = qd.reward || {};
    const exp = int(rw.exp) + int(rw.exp_lv) * u.level, gold = int(rw.gold) + int(rw.gold_lv) * u.level, items = rw.items || {}, ingot = int(rw.ingot);
    const ups = await grantReward(pool, uid, exp, gold, items, ingot);
    return { ok: true, ups, gained: { exp, gold, items, ingot }, user: await userPayload(pool, uid) };
  },
};

// ---------- farm.php ----------
const CROPS = { lua: { sec: 30, yield: 3 }, go: { sec: 60, yield: 2 }, sat: { sec: 120, yield: 2 } };
export const farm = {
  async state({ uid }) {
    const sel = () => q(pool, 'SELECT slot,crop_code,planted_at,grow_sec FROM tt_farm_plots WHERE user_id=? ORDER BY slot', [uid]);
    let plots = await sel();
    if (plots.length < 6) { for (let s = 0; s < 6; s++) await q(pool, 'INSERT INTO tt_farm_plots(user_id,slot) VALUES(?,?) ON CONFLICT DO NOTHING', [uid, s]); plots = await sel(); }
    const t = now();
    return { ok: true, now: t, plots: plots.map(p => ({ slot: +p.slot, crop_code: p.crop_code, planted_at: +p.planted_at, grow_sec: +p.grow_sec,
      ready: !!(p.crop_code && t - p.planted_at >= p.grow_sec), remain: p.crop_code ? Math.max(0, p.grow_sec - (t - p.planted_at)) : 0 })) };
  },
  async plant({ P, uid }) {
    const slot = int(P.slot), crop = String(P.crop || 'lua');
    if (!CROPS[crop]) fail('Không có giống cây này');
    if (slot < 0 || slot > 5) fail('Ô không hợp lệ');
    const cur = await one(pool, 'SELECT crop_code FROM tt_farm_plots WHERE user_id=? AND slot=?', [uid, slot]);
    if (cur && cur.crop_code) fail('Ô đang có cây, thu hoạch trước đã');
    await q(pool, 'INSERT INTO tt_farm_plots(user_id,slot,crop_code,planted_at,grow_sec) VALUES(?,?,?,?,?) ON CONFLICT (user_id,slot) DO UPDATE SET crop_code=EXCLUDED.crop_code,planted_at=EXCLUDED.planted_at,grow_sec=EXCLUDED.grow_sec', [uid, slot, crop, now(), CROPS[crop].sec]);
    return { ok: true };
  },
  async harvest({ P, uid }) {
    const slot = int(P.slot), pl = await one(pool, 'SELECT * FROM tt_farm_plots WHERE user_id=? AND slot=?', [uid, slot]);
    if (!pl || !pl.crop_code) fail('Ô trống');
    if (now() - pl.planted_at < pl.grow_sec) fail('Chưa chín');
    const code = pl.crop_code, y = (CROPS[code] || {}).yield || 1;
    const up = await q(pool, 'UPDATE tt_farm_plots SET crop_code=NULL,planted_at=0,grow_sec=0 WHERE user_id=? AND slot=? AND crop_code IS NOT NULL', [uid, slot]);
    if (up.affectedRows < 1) fail('Đã thu hoạch rồi');
    await addItem(pool, uid, code, y);
    await questProgress(pool, uid, 'harvest', 0, 1);
    return { ok: true, got: { [code]: y }, user: await userPayload(pool, uid) };
  },
};

// ---------- forge.php ----------
export const forge = {
  async list() { return { ok: true, recipes: await q(pool, 'SELECT * FROM tt_forge_recipes ORDER BY need_gold') }; },
  async forge({ P, uid }) {
    const re = await one(pool, 'SELECT * FROM tt_forge_recipes WHERE weapon_code=?', [String(P.code || '')]); if (!re) fail('Không có công thức');
    const me = await userPayload(pool, uid);
    if (me.stage_max < +re.req_stage) fail('Cần mở màn ' + re.req_stage + ' trước', 403);
    if (me.gold < +re.need_gold) fail('Thiếu ngân lượng');
    if ((me.inv.sat | 0) < +re.need_iron || (me.inv.go | 0) < +re.need_wood) fail('Thiếu sắt/gỗ - trồng trọt + đánh quái để kiếm');
    const eid = await tx(async c => {
      const r = await q(c, 'UPDATE tt_users SET gold=gold-? WHERE id=? AND gold>=?', [re.need_gold, uid, re.need_gold]);
      if (r.affectedRows < 1 || (+re.need_iron && !await takeItem(c, uid, 'sat', +re.need_iron)) || (+re.need_wood && !await takeItem(c, uid, 'go', +re.need_wood))) fail('Thiếu nguyên liệu');
      const id = await newEquip(c, uid, re.weapon_code); if (!id) fail('Trang bị không hợp lệ');
      return id;
    });
    await questProgress(pool, uid, 'forge', 0, 1);
    return { ok: true, weapon: re.weapon_code, equip_id: eid, user: await userPayload(pool, uid) };
  },
};
