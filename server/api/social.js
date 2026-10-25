// equip.php, pk.php, social.php, friend.php
import { pool, q, one, col, tx } from '../db.js';
import { R, int, now, randInt, fail, mem, userPayload, addItem, takeItem, pkAdjust, questProgress, sendMail, takeMails, socialUpdates, rtTrigger, rtUserChannel } from '../core.js';

// ---------- equip.php: moi thao tac tru tien/nguyen lieu trong transaction ----------
async function lockEquip(c, uid, id) { const r = await one(c, 'SELECT * FROM tt_equip WHERE id=? AND user_id=? FOR UPDATE', [int(id), uid]); if (!r) fail('Không tìm thấy trang bị'); return r; }
async function pay(c, uid, gold, ingot = 0) {
  if (gold > 0 && (await q(c, 'UPDATE tt_users SET gold=gold-? WHERE id=? AND gold>=?', [gold, uid, gold])).affectedRows < 1) fail('Không đủ ngân lượng');
  if (ingot > 0 && (await q(c, 'UPDATE tt_users SET ingot=ingot-? WHERE id=? AND ingot>=?', [ingot, uid, ingot])).affectedRows < 1) fail('Không đủ Nguyên Bảo');
}
async function take(c, uid, code, n) { if (n > 0 && !await takeItem(c, uid, code, n)) { const d = R.itemDef(code); fail('Thiếu ' + (d ? d.name : code) + ' ×' + n); } }
const done = async (uid, extra) => Object.assign({ ok: true, user: await userPayload(pool, uid) }, extra || {});
const E = () => R.equipDefs();
export const equip = {
  async equip({ P, uid }) {
    await tx(async c => {
      const r = await lockEquip(c, uid, P.id), def = R.itemDef(r.code), me = await userPayload(c, uid);
      if (me.level < int(def.lv)) fail('Cần cấp ' + int(def.lv) + ' để trang bị');
      for (const o of await q(c, 'SELECT id, code FROM tt_equip WHERE user_id=? AND equipped=1 AND id<>?', [uid, r.id])) { const od = R.itemDef(o.code); if (od && od.slot === def.slot) await q(c, 'UPDATE tt_equip SET equipped=0 WHERE id=?', [o.id]); }
      await q(c, 'UPDATE tt_equip SET equipped=1 WHERE id=?', [r.id]);
      if (def.slot === 'weapon') await q(c, 'UPDATE tt_users SET weapon_code=? WHERE id=?', [r.code, uid]);
    });
    return done(uid);
  },
  async unequip({ P, uid }) { await tx(async c => { const r = await lockEquip(c, uid, P.id); await q(c, 'UPDATE tt_equip SET equipped=0 WHERE id=?', [r.id]); }); return done(uid); },
  async sell({ P, uid }) {
    const price = await tx(async c => {
      const r = await lockEquip(c, uid, P.id); if (+r.equipped) fail('Tháo trang bị trước khi bán');
      const p = int(R.itemDef(r.code).sell) + int(r.plus) * 100;
      await q(c, 'DELETE FROM tt_equip WHERE id=?', [r.id]);
      for (const g of R.parseStones(r.stones)) await addItem(c, uid, 'st_' + g.t + '_' + g.lv, 1);
      await q(c, 'UPDATE tt_users SET gold=gold+? WHERE id=?', [p, uid]);
      return p;
    });
    return done(uid, { gold: price });
  },
  async enhance({ P, uid }) {
    const res = await tx(async c => {
      const r = await lockEquip(c, uid, P.id), en = E().enhance, l = int(r.plus);
      if (l >= int(en.max)) fail('Đã cường hóa tối đa +' + en.max);
      const protect = !!int(P.protect) && l >= int(en.dropFrom);
      await pay(c, uid, int(en.gold[l])); await take(c, uid, en.stone + (l + 1), 1);
      if (protect) await take(c, uid, 'bua_ho', 1);
      const ok = randInt(1, 100) <= int(en.rate[l]);
      const nv = ok ? l + 1 : (l >= int(en.dropFrom) && !protect ? l - 1 : l);
      await q(c, 'UPDATE tt_equip SET plus=? WHERE id=?', [nv, r.id]);
      return { success: ok, plus: nv, from: l };
    });
    await questProgress(pool, uid, 'enhance', 0, 1);
    return done(uid, res);
  },
  async punch({ P, uid }) {
    const holes = await tx(async c => {
      const r = await lockEquip(c, uid, P.id), def = R.itemDef(r.code), h = int(r.holes), max = int(E().holes.max[def.slot] ?? 3);
      if (h >= max) fail('Trang bị này tối đa ' + max + ' lỗ sao');
      await pay(c, uid, int(E().holes.gold[h])); await take(c, uid, 'duc_sao', int(E().holes.tool[h]));
      await q(c, 'UPDATE tt_equip SET holes=holes+1 WHERE id=?', [r.id]);
      return h + 1;
    });
    return done(uid, { holes });
  },
  async inlay({ P, uid }) {
    const sd = R.itemDef(String(P.stone || '')); if (!sd || sd.type !== 'stone') fail('Đá không hợp lệ');
    await tx(async c => {
      const r = await lockEquip(c, uid, P.id), st = R.parseStones(r.stones);
      if (st.length >= int(r.holes)) fail('Hết lỗ trống - đục thêm lỗ sao trước');
      await take(c, uid, sd.code, 1);
      st.push({ t: sd.stone, lv: int(sd.tier) });
      await q(c, 'UPDATE tt_equip SET stones=? WHERE id=?', [R.joinStones(st), r.id]);
    });
    return done(uid);
  },
  async unlay({ P, uid }) {
    const k = int(P.slot ?? -1);
    await tx(async c => {
      const r = await lockEquip(c, uid, P.id), st = R.parseStones(r.stones);
      if (!st[k]) fail('Lỗ sao trống');
      await pay(c, uid, int(E().unlayGoldPerTier) * st[k].lv);
      await addItem(c, uid, 'st_' + st[k].t + '_' + st[k].lv, 1);
      st.splice(k, 1);
      await q(c, 'UPDATE tt_equip SET stones=? WHERE id=?', [R.joinStones(st), r.id]);
    });
    return done(uid);
  },
  async merge({ P, uid }) {
    const code = String(P.stone || ''), sd = R.itemDef(code);
    let got;
    if (sd && sd.type === 'up') { // Da Cuong Hoa: N vien cap t -> 1 vien cap t+1
      const U = E().upStone, t = int(sd.tier);
      if (t >= int(U.max)) fail('Đá đã ở cấp cao nhất');
      got = U.prefix + (t + 1);
      await tx(async c => { await take(c, uid, code, int(U.need)); await pay(c, uid, int(U.goldPerTier) * t); await addItem(c, uid, got, 1); });
    } else {
      if (!sd || sd.type !== 'stone') fail('Đá không hợp lệ');
      const t = int(sd.tier), mg = E().merge;
      if (t >= int(mg.maxTier)) fail('Đá đã ở bậc cao nhất');
      got = 'st_' + sd.stone + '_' + (t + 1);
      await tx(async c => { await take(c, uid, code, int(mg.need)); await pay(c, uid, int(mg.goldPerTier) * t); await addItem(c, uid, got, 1); });
    }
    await questProgress(pool, uid, 'merge', 0, 1);
    return done(uid, { got });
  },
  async exchange({ P, uid }) {
    const n = Math.max(1, Math.min(1000, int(P.n || 1))), g = n * int(E().exchange);
    await tx(async c => { await pay(c, uid, 0, n); await q(c, 'UPDATE tt_users SET gold=gold+? WHERE id=?', [g, uid]); });
    return done(uid, { gold: g });
  },
  async avatar({ P, uid }) {
    const av = String(P.avatar || ''); if (!['samurai', 'kunoichi'].includes(av)) fail('Tạo hình không hợp lệ');
    await tx(async c => {
      const old = String(await col(c, 'SELECT avatar FROM tt_users WHERE id=? FOR UPDATE', [uid]) || '');
      if (old === av) fail('Đang dùng tạo hình này');
      if (old !== '') await pay(c, uid, int(R.sectsData().avatarCost ?? 2000));
      await q(c, 'UPDATE tt_users SET avatar=? WHERE id=?', [av, uid]);
    });
    return done(uid);
  },
};

// ---------- pk.php ----------
const onlinePlayers = async uid => {
  await q(pool, 'DELETE FROM tt_presence_online WHERE updated_at < (NOW() - INTERVAL 2 MINUTE)');
  return (await q(pool, 'SELECT p.user_id,p.nickname,p.map_stage,p.hp,u.level,u.pk_mode,u.provoke,u.provoke_at,u.sect FROM tt_presence_online p LEFT JOIN tt_users u ON u.id=p.user_id WHERE p.user_id!=? AND p.updated_at > (NOW() - INTERVAL 30 SECOND) LIMIT 20', [uid]))
    .map(x => { x.provoke = R.pkEff(x); delete x.provoke_at; return x; });
};
export const pk = {
  async fight({ P, uid }) {
    const did = int(P.defender_id); if (did === uid) fail('Tự đánh mình?');
    const foe = await one(pool, 'SELECT * FROM tt_users WHERE id=?', [did]); if (!foe) fail('Đối thủ không tồn tại');
    const m = mem(uid); if (now() - m.last_pk < 5) fail('Nghỉ 5 giây giữa các trận PK', 429); m.last_pk = now();
    const A = await userPayload(pool, uid), T = await userPayload(pool, did);
    if (A.pk_mode <= 0) fail('Bật chế độ PK (PK Bang / Đồ sát) trước khi thách đấu');
    if (A.level < 10 || T.level < 10) fail('Tân thủ dưới cấp 10 được bảo vệ');
    if (A.pk_mode === 1 && A.guild_id && A.guild_id === T.guild_id) fail('PK Bang không đánh người cùng bang');
    const c1 = R.combatStats(A), c2 = R.combatStats(T);
    const a1 = Math.round(c1.atk * R.sectCounterMult(A.sect, T.sect)), d1 = Math.trunc(c1.def), a2 = Math.round(c2.atk * R.sectCounterMult(T.sect, A.sect)), d2 = Math.trunc(c2.def);
    if (T.pk_mode === 0 && T.provoke < 50) await pkAdjust(pool, uid, 15, -5, 0);
    let hp1 = Math.trunc(c1.hp), hp2 = Math.trunc(c2.hp), win = 0; const log = [];
    for (let t = 1; t <= 20; t++) {
      const x = Math.max(1, a1 - Math.trunc(d2 / 2) + randInt(-3, 5)); hp2 -= x; log.push(`Hiệp ${t}: bạn chém ${x} (đối thủ ${hp2})`);
      if (hp2 <= 0) { win = uid; break; }
      const y = Math.max(1, a2 - Math.trunc(d1 / 2) + randInt(-3, 5)); hp1 -= y; log.push(`Hiệp ${t}: đối thủ phản ${y} (bạn ${hp1})`);
      if (hp1 <= 0) { win = did; break; }
    }
    if (!win) win = hp1 >= hp2 ? uid : did;
    const gold = Math.min(100, int(foe.gold));
    if (win === uid) { await q(pool, 'UPDATE tt_users SET gold=gold+? WHERE id=?', [gold, uid]); await q(pool, 'UPDATE tt_users SET gold=GREATEST(0,gold-?) WHERE id=?', [gold, did]); }
    await q(pool, 'INSERT INTO tt_pk_logs(challenger_id,defender_id,winner_id,log) VALUES(?,?,?,?)', [uid, did, win, log.join('\n')]);
    return { ok: true, win, log, gold };
  },
  async cleanse({ uid }) {
    if (!await takeItem(pool, uid, 'thanh_tam', 1)) fail('Không có Thanh Tâm Đan (mua bằng Nguyên Bảo ở Tiệm)');
    await pkAdjust(pool, uid, -50, 0, 0);
    return { ok: true, user: await userPayload(pool, uid) };
  },
  async online_players({ uid }) { return { ok: true, players: await onlinePlayers(uid) }; },
  async history({ uid }) {
    return { ok: true, logs: await q(pool, 'SELECT l.id,l.challenger_id,l.defender_id,l.winner_id,l.created_at,a.nickname AS c_name,b.nickname AS d_name FROM tt_pk_logs l LEFT JOIN tt_users a ON a.id=l.challenger_id LEFT JOIN tt_users b ON b.id=l.defender_id WHERE l.challenger_id=? OR l.defender_id=? ORDER BY l.id DESC LIMIT 10', [uid, uid]) };
  },
};

// ---------- social.php ----------
const EMBLEMS = ['em_lion', 'em_dragon', 'em_flame', 'em_eagle', 'em_yinyang', 'em_lotus', 'em_tiger', 'em_snake', 'em_swords', 'em_sun', 'em_wolf', 'em_fox'];
const SAFE = x => R.inSafe(x);
const myGuild = uid => one(pool, 'SELECT guild_id, role FROM tt_guild_members WHERE user_id=?', [uid]);
export const social = {
  async guild_list() {
    return { ok: true, guilds: await q(pool, 'SELECT g.*,u.nickname as master_name,(SELECT COUNT(*) FROM tt_guild_members m WHERE m.guild_id=g.id) as total FROM tt_guilds g LEFT JOIN tt_users u ON u.id=g.master_id ORDER BY g.id DESC LIMIT 50') };
  },
  async guild_my({ uid }) {
    const g = await one(pool, 'SELECT g.*,gm.role FROM tt_guilds g JOIN tt_guild_members gm ON gm.guild_id=g.id WHERE gm.user_id=?', [uid]);
    const members = g ? await q(pool, 'SELECT u.id,u.nickname,u.level,gm.role FROM tt_guild_members gm JOIN tt_users u ON u.id=gm.user_id WHERE gm.guild_id=?', [g.id]) : [];
    return { ok: true, guild: g || null, members };
  },
  async guild_create({ P, uid }) {
    const name = String(P.name || '').trim(), len = [...name].length;
    if (len < 3 || len > 30) fail('Tên bang 3-30 ký tự');
    if (await one(pool, 'SELECT id FROM tt_guilds WHERE name=?', [name])) fail('Tên bang đã có');
    if (await myGuild(uid)) fail('Bạn đã có bang');
    const em = EMBLEMS.includes(P.emblem) ? P.emblem : 'em_lion', cost = 200;
    const gid = await tx(async c => {
      if ((await q(c, 'UPDATE tt_users SET gold=gold-? WHERE id=? AND gold>=?', [cost, uid, cost])).affectedRows < 1) fail('Lập bang cần ' + cost + ' ngân lượng');
      const id = (await q(c, 'INSERT INTO tt_guilds(name,master_id,emblem) VALUES(?,?,?)', [name, uid, em])).insertId;
      await q(c, "INSERT INTO tt_guild_members(guild_id,user_id,role) VALUES(?,?,'master')", [id, uid]);
      return id;
    });
    return { ok: true, guild_id: gid };
  },
  async guild_join({ P, uid }) {
    const gid = int(P.guild_id);
    if (await myGuild(uid)) fail('Rời bang cũ trước');
    if (!await one(pool, 'SELECT id FROM tt_guilds WHERE id=?', [gid])) fail('Bang không tồn tại');
    await q(pool, 'INSERT INTO tt_guild_members(guild_id,user_id) VALUES(?,?)', [gid, uid]);
    return { ok: true };
  },
  async guild_notice({ P, uid }) {
    const gm = await myGuild(uid); if (!gm || gm.role !== 'master') fail('Chỉ bang chủ được sửa thông báo', 403);
    await q(pool, 'UPDATE tt_guilds SET notice=? WHERE id=?', [[...String(P.notice || '').trim()].slice(0, 200).join(''), gm.guild_id]);
    return { ok: true };
  },
  async guild_kick({ P, uid }) {
    const tid = int(P.target_id), gm = await myGuild(uid);
    if (!gm || gm.role !== 'master' || tid === uid) fail('Không có quyền', 403);
    await q(pool, 'DELETE FROM tt_guild_members WHERE user_id=? AND guild_id=?', [tid, gm.guild_id]);
    return { ok: true };
  },
  async guild_leave({ uid }) {
    const gm = await myGuild(uid); if (!gm) return { ok: true };
    await q(pool, 'DELETE FROM tt_guild_members WHERE user_id=?', [uid]);
    if (gm.role === 'master') {
      const next = await one(pool, 'SELECT user_id FROM tt_guild_members WHERE guild_id=? ORDER BY joined_at LIMIT 1', [gm.guild_id]);
      if (next) { await q(pool, "UPDATE tt_guild_members SET role='master' WHERE user_id=?", [next.user_id]); await q(pool, 'UPDATE tt_guilds SET master_id=? WHERE id=?', [next.user_id, gm.guild_id]); }
      else await q(pool, 'DELETE FROM tt_guilds WHERE id=?', [gm.guild_id]);
    }
    return { ok: true };
  },
  async chat_send({ P, uid }) {
    const scope = ['world', 'guild', 'private'].includes(P.scope) ? P.scope : 'world', text = [...String(P.text || '')].slice(0, 300).join('').trim();
    if (!text) fail('Tin nhắn trống');
    let gid = null, to = null;
    if (scope === 'guild') { const gm = await myGuild(uid); if (!gm) fail('Chưa có bang'); gid = gm.guild_id; }
    if (scope === 'private') { to = int(P.to_id); if (!to || to === uid) fail('Thiếu người nhận'); if (!await one(pool, 'SELECT id FROM tt_users WHERE id=?', [to])) fail('Người nhận không tồn tại'); }
    const ago = await one(pool, 'SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS ago FROM tt_messages WHERE from_id=? ORDER BY id DESC LIMIT 1', [uid]);
    if (ago && int(ago.ago) < 2) fail('Chat chậm lại 2 giây', 429);
    await q(pool, 'INSERT INTO tt_messages(scope,guild_id,from_id,to_id,text) VALUES(?,?,?,?,?)', [scope, gid, uid, to, text]);
    return { ok: true };
  },
  async chat_load({ P, uid }) {
    const scope = ['world', 'guild', 'private'].includes(P.scope) ? P.scope : 'world', last = int(P.last_id);
    let msgs;
    if (scope === 'world') msgs = await q(pool, "SELECT m.*,u.nickname FROM tt_messages m JOIN tt_users u ON u.id=m.from_id WHERE m.scope='world' AND m.id>? ORDER BY m.id ASC LIMIT 30", [last]);
    else if (scope === 'guild') { const gm = await myGuild(uid); if (!gm) return { ok: true, msgs: [] }; msgs = await q(pool, "SELECT m.*,u.nickname FROM tt_messages m JOIN tt_users u ON u.id=m.from_id WHERE m.scope='guild' AND m.guild_id=? AND m.id>? ORDER BY m.id ASC LIMIT 30", [gm.guild_id, last]); }
    else { const o = int(P.to_id); msgs = await q(pool, "SELECT m.*,u.nickname FROM tt_messages m JOIN tt_users u ON u.id=m.from_id WHERE m.scope='private' AND ((m.from_id=? AND m.to_id=?) OR (m.from_id=? AND m.to_id=?)) AND m.id>? ORDER BY m.id ASC LIMIT 30", [uid, o, o, uid, last]); }
    return { ok: true, msgs };
  },
  async pk_mode({ P, uid, me }) {
    const m = Math.max(0, Math.min(2, int(P.mode)));
    if (m > 0 && int(me.level) < 10) fail('Cấp 10 mới được bật PK');
    if (now() - int(me.pk_at) < 5) fail('Đổi chế độ PK chậm lại (5 giây)', 429);
    await q(pool, 'UPDATE tt_users SET pk_mode=?, pk_at=? WHERE id=?', [m, now(), uid]);
    return { ok: true, mode: m, user: await userPayload(pool, uid) };
  },
  // PK tren ban do - may chu tu tinh sat thuong (client chi gui he so chieu)
  async pvp_hit({ P, uid }) {
    const tid = int(P.target_id), mult = Math.max(0.5, Math.min(6, parseFloat(P.mult) || 1));
    const m = mem(uid), tNow = performance.now() / 1000;
    if (m.last_pvp && tNow - m.last_pvp < 0.6) return { ok: false, error: 'Đánh chậm lại', cd: true }; m.last_pvp = tNow;
    if (tid === uid) fail('Tự đánh mình?');
    const A = await userPayload(pool, uid), T = await userPayload(pool, tid);
    if (!T) fail('Đối thủ không tồn tại');
    if (A.pk_mode <= 0) fail('Bạn đang ở chế độ Hòa bình');
    if (A.level < 10 || T.level < 10) fail('Tân thủ dưới cấp 10 được bảo vệ');
    if (A.pk_mode === 1 && A.guild_id && A.guild_id === T.guild_id) fail('PK Bang không đánh người cùng bang');
    const to = await one(pool, 'SELECT * FROM tt_presence_online WHERE user_id=? AND updated_at > (NOW() - INTERVAL 30 SECOND)', [tid]);
    if (!to) fail('Đối thủ ngoại tuyến');
    if (+to.hp <= 0) fail('Đối thủ đã trọng thương');
    const mp = await one(pool, 'SELECT map_stage,x FROM tt_presence_online WHERE user_id=?', [uid]);
    if (!mp || +mp.map_stage !== +to.map_stage) fail('Khác bản đồ không chém được');
    if (Math.abs(mp.x - to.x) > 1400) fail('Quá xa');
    if (SAFE(to.x) || SAFE(mp.x)) fail('Doanh trại an toàn: không thể PK', 400, { cd: true });
    const ca = R.combatStats(A), ct = R.combatStats(T), k = R.sectCounterMult(A.sect, T.sect);
    const crit = randInt(1, 1000) / 1000 < ca.crit;
    const real = Math.max(1, Math.round((ca.atk * mult * (randInt(90, 110) / 100) * (crit ? 1.6 : 1) * k - ct.def * 0.5) * 0.6));
    await q(pool, 'UPDATE tt_presence_online SET dmg_pending=dmg_pending+?, hp=GREATEST(0,hp-?) WHERE user_id=?', [real, real, tid]);
    const kill = +to.hp - real <= 0, innocent = T.pk_mode === 0 && T.provoke < 50, wanted = T.provoke >= R.PK_JAIL, st = +mp.map_stage;
    let gold = 0, note = '';
    if (innocent) { await pkAdjust(pool, uid, kill ? 30 : 4, kill ? -15 : -2, st); if (kill) note = 'Giết người lương thiện: khiêu khích +30, thiện -15'; }
    if (kill) {
      if (wanted) { gold = 100; await pkAdjust(pool, uid, -20, 10, st); note = 'Diệt kẻ truy nã: +100 ngân lượng, thiện +10'; }
      else if (!innocent) gold = 50;
      if (gold) await q(pool, 'UPDATE tt_users SET gold=gold+? WHERE id=?', [gold, uid]);
      await q(pool, "INSERT INTO tt_pk_logs(challenger_id,defender_id,winner_id,log,status) VALUES(?,?,?,?,'done')", [uid, tid, uid, 'PK trên bản đồ ' + new Date().toTimeString().slice(0, 8)]);
      await sendMail(pool, tid, 'Bạn bị ' + A.nickname + ' hạ gục khi PK trên bản đồ.');
    }
    return { ok: true, dmg: real, crit, kill, reward: gold, counter: k, note, user: await userPayload(pool, uid) };
  },
  async mail({ uid }) { return { ok: true, mails: await takeMails(pool, uid), social: await socialUpdates(pool, uid) }; },
  async online_ping({ P, uid, me }) {
    const stage = Math.max(1, Math.min(R.MAX_STAGE, int(P.stage || 1))), x = Math.max(0, Math.min(20000, int(P.x ?? 100))), y = Math.max(0, Math.min(3000, int(P.y ?? 300)));
    const hp = Math.max(0, Math.min(int(P.hp), int(me.hp_max)));
    await q(pool, 'INSERT INTO tt_presence_online(user_id,nickname,map_stage,x,y,hp) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nickname=VALUES(nickname),map_stage=VALUES(map_stage),x=VALUES(x),y=VALUES(y),hp=VALUES(hp),updated_at=NOW()', [uid, me.nickname, stage, x, y, hp]);
    let pending = 0;
    try {
      pending = int(await col(pool, 'SELECT dmg_pending FROM tt_presence_online WHERE user_id=?', [uid]));
      if (pending > 0) await q(pool, 'UPDATE tt_presence_online SET dmg_pending=GREATEST(0,dmg_pending-?) WHERE user_id=?', [pending, uid]);
    } catch (_) { pending = 0; }
    await q(pool, 'DELETE FROM tt_presence_online WHERE updated_at < (NOW() - INTERVAL 2 MINUTE)');
    const online = (await q(pool, 'SELECT p.user_id,p.nickname,p.map_stage,p.x,p.y,p.hp,u.level,u.pk_mode,u.provoke,u.provoke_at,u.sect,gm.guild_id FROM tt_presence_online p JOIN tt_users u ON u.id=p.user_id LEFT JOIN tt_guild_members gm ON gm.user_id=p.user_id WHERE p.user_id!=? AND p.map_stage=? AND p.updated_at > (NOW() - INTERVAL 20 SECOND) ORDER BY p.updated_at DESC LIMIT 30', [uid, stage]))
      .map(r => { r.provoke = R.pkEff(r); delete r.provoke_at; ['user_id', 'x', 'y', 'hp', 'level', 'pk_mode', 'guild_id', 'map_stage'].forEach(k => { r[k] = int(r[k]); }); return r; });
    return { ok: true, online, dmg: pending, mails: await takeMails(pool, uid), pk: { pk_mode: int(me.pk_mode), provoke: R.pkEff(me), friendly: int(me.friendly) }, social: await socialUpdates(pool, uid) };
  },
  async rank() { return { ok: true, rank: await q(pool, 'SELECT id,nickname,level,exp,gold,stage_max FROM tt_users ORDER BY level DESC, exp DESC LIMIT 20') }; },
};

// ---------- friend.php ----------
const OFFER_TTL = 600, TRADE_KINDS = ['potion', 'mat', 'stone', 'up', 'crop'];
const fmtVN = n => (+n || 0).toLocaleString('vi-VN');
const targetId = (P, uid) => { const t = int(P.target_id); if (t <= 0 || t === uid) fail('Người chơi không hợp lệ'); return t; };
const nick = async id => String(await col(pool, 'SELECT nickname FROM tt_users WHERE id=?', [id]) || '');
const isOnline = async id => int(await col(pool, 'SELECT map_stage FROM tt_presence_online WHERE user_id=? AND updated_at > (NOW() - INTERVAL 40 SECOND)', [id]));
async function notify(id, text, ev = 'social') { await sendMail(pool, id, text); rtTrigger(rtUserChannel(id), ev, { text }); }
function tradeText(d) {
  const p = [];
  if (d.gold) p.push(fmtVN(d.gold) + ' ngân lượng');
  if (d.ingot) p.push(d.ingot + ' Nguyên Bảo');
  for (const c in (d.items || {})) { const it = R.itemDef(c); p.push(d.items[c] + ' ' + (it ? it.name : c)); }
  (d.eqn || []).forEach(n => p.push(n));
  return p.length ? p.join(', ') : 'không gì';
}
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch (_) { return {}; } };
export const friend = {
  async profile({ P, uid }) {
    const t = targetId(P, uid), u = await userPayload(pool, t); if (!u) fail('Không tìm thấy người chơi');
    let rel = 'none';
    for (const r of await q(pool, 'SELECT user_id, status FROM tt_friends WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)', [uid, t, t, uid])) {
      if (+r.status === 1) { rel = 'friend'; break; } rel = +r.user_id === uid ? 'sent' : 'incoming';
    }
    const me = await userPayload(pool, uid);
    return { ok: true, p: { id: t, nickname: u.nickname, level: u.level, sect: u.sect, avatar: u.avatar, guild: u.guild_name || '', pk_mode: u.pk_mode, provoke: u.provoke, online: await isOnline(t), rel, counter: R.sectCounterMult(me.sect, u.sect) } };
  },
  async friends({ uid }) {
    const rows = await q(pool, `SELECT u.id,u.nickname,u.level,u.sect,f.status,f.user_id AS req_by,
        (SELECT p.map_stage FROM tt_presence_online p WHERE p.user_id=u.id AND p.updated_at > (NOW() - INTERVAL 40 SECOND)) AS map_stage
      FROM tt_friends f JOIN tt_users u ON u.id = IF(f.user_id=?, f.friend_id, f.user_id)
      WHERE (f.user_id=? OR f.friend_id=?) ORDER BY f.status DESC, u.level DESC LIMIT 100`, [uid, uid, uid]);
    return { ok: true, friends: rows.map(r => ({ id: +r.id, nickname: r.nickname, level: +r.level, sect: r.sect, status: +r.status, mine: +r.req_by === uid, map: int(r.map_stage) })) };
  },
  async friend_add({ P, uid }) {
    const t = targetId(P, uid); if (!await nick(t)) fail('Không tìm thấy người chơi');
    if (int(await col(pool, 'SELECT COUNT(*) FROM tt_friends WHERE user_id=? OR friend_id=?', [uid, uid])) >= 100) fail('Danh sách bạn bè tối đa 100');
    if (await one(pool, 'SELECT status FROM tt_friends WHERE user_id=? AND friend_id=?', [t, uid])) { // ho da moi minh -> dong y luon
      await q(pool, 'UPDATE tt_friends SET status=1 WHERE user_id=? AND friend_id=?', [t, uid]);
      await notify(t, await nick(uid) + ' đã đồng ý kết bạn với bạn.');
      return { ok: true, status: 1 };
    }
    await q(pool, 'INSERT IGNORE INTO tt_friends(user_id,friend_id,status) VALUES(?,?,0)', [uid, t]);
    await notify(t, await nick(uid) + ' muốn kết bạn với bạn (bấm V để xem).');
    return { ok: true, status: 0 };
  },
  async friend_accept({ P, uid }) {
    const t = targetId(P, uid);
    if ((await q(pool, 'UPDATE tt_friends SET status=1 WHERE user_id=? AND friend_id=? AND status=0', [t, uid])).affectedRows < 1) fail('Không có lời mời kết bạn');
    await notify(t, await nick(uid) + ' đã đồng ý kết bạn với bạn.');
    return { ok: true };
  },
  async friend_remove({ P, uid }) {
    const t = targetId(P, uid);
    await q(pool, 'DELETE FROM tt_friends WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)', [uid, t, t, uid]);
    return { ok: true };
  },
  async offers({ uid }) {
    await q(pool, `UPDATE tt_offers SET status=4 WHERE status=0 AND created_at < (NOW() - INTERVAL ${OFFER_TTL} SECOND)`);
    const rows = await q(pool, `SELECT o.id,o.kind,o.from_id,o.to_id,o.data,a.nickname AS from_name,b.nickname AS to_name FROM tt_offers o
      JOIN tt_users a ON a.id=o.from_id JOIN tt_users b ON b.id=o.to_id WHERE o.status=0 AND (o.to_id=? OR o.from_id=?) ORDER BY o.id DESC LIMIT 40`, [uid, uid]);
    return { ok: true, offers: rows.map(r => { const d = parse(r.data); return { id: +r.id, kind: r.kind, incoming: +r.to_id === uid, from: +r.from_id, to: +r.to_id, from_name: r.from_name, to_name: r.to_name, give: tradeText(d.give || {}), ask: tradeText(d.ask || {}), stake: int(d.stake) }; }) };
  },
  async trade_offer({ P, uid }) {
    const t = targetId(P, uid); if (!await nick(t)) fail('Không tìm thấy người chơi');
    const me = await userPayload(pool, uid);
    const gold = Math.max(0, int(P.gold)), ingot = Math.max(0, int(P.ingot)), askG = Math.max(0, int(P.ask_gold)), askI = Math.max(0, int(P.ask_ingot));
    if (gold > me.gold) fail('Không đủ ngân lượng'); if (ingot > me.ingot) fail('Không đủ Nguyên Bảo');
    const raw = parse(P.items), items = {};
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
    if (int(await col(pool, 'SELECT COUNT(*) FROM tt_offers WHERE from_id=? AND status=0', [uid])) >= 10) fail('Bạn có quá nhiều lời mời đang chờ');
    const data = { give: { gold, ingot, items, equips: eqs, eqn }, ask: { gold: askG, ingot: askI } };
    await q(pool, "INSERT INTO tt_offers(kind,from_id,to_id,data) VALUES('trade',?,?,?)", [uid, t, JSON.stringify(data)]);
    await notify(t, me.nickname + ' mời giao dịch: đưa ' + tradeText(data.give) + ' · đổi lấy ' + tradeText(data.ask) + ' (bấm V để xem).');
    return { ok: true };
  },
  offer_decline: ctx => closeOffer(ctx, 'to_id', 2),
  offer_cancel: ctx => closeOffer(ctx, 'from_id', 3),
  async trade_accept({ P, uid }) {
    const id = int(P.id);
    const { from, g, k } = await tx(async c => {
      const o = await one(c, `SELECT * FROM tt_offers WHERE id=? AND to_id=? AND kind='trade' AND status=0 AND created_at > (NOW() - INTERVAL ${OFFER_TTL} SECOND) FOR UPDATE`, [id, uid]);
      if (!o) fail('Lời mời không còn hoặc đã hết hạn');
      const from = +o.from_id, d = parse(o.data), g = d.give || {}, k = d.ask || {};
      const bal = {}; (await q(c, 'SELECT id,gold,ingot FROM tt_users WHERE id IN (?,?) ORDER BY id FOR UPDATE', [uid, from])).forEach(r => { bal[r.id] = r; });
      if (!bal[uid] || !bal[from]) fail('Người chơi không tồn tại');
      if (+bal[from].gold < int(g.gold) || +bal[from].ingot < int(g.ingot)) fail('Người mời không còn đủ tiền');
      if (+bal[uid].gold < int(k.gold) || +bal[uid].ingot < int(k.ingot)) fail('Bạn không đủ tiền để đổi');
      const mv = 'UPDATE tt_users SET gold=gold+?, ingot=ingot+? WHERE id=?';
      await q(c, mv, [int(k.gold) - int(g.gold), int(k.ingot) - int(g.ingot), from]);
      await q(c, mv, [int(g.gold) - int(k.gold), int(g.ingot) - int(k.ingot), uid]);
      for (const code in (g.items || {})) { const n = int(g.items[code]); if (!await takeItem(c, from, code, n)) fail('Người mời không còn đủ vật phẩm'); await addItem(c, uid, code, n); }
      const eqs = (g.equips || []).map(int);
      if (eqs.length && (await q(c, 'UPDATE tt_equip SET user_id=?, equipped=0 WHERE user_id=? AND equipped=0 AND id IN (?)', [uid, from, eqs])).affectedRows !== eqs.length) fail('Trang bị của người mời đã thay đổi (đang mặc hoặc đã bán)');
      await q(c, 'UPDATE tt_offers SET status=1 WHERE id=?', [id]);
      return { from, g, k };
    });
    await notify(from, await nick(uid) + ' đã đồng ý giao dịch: bạn nhận ' + tradeText(k) + '.');
    return { ok: true, got: tradeText(g), user: await userPayload(pool, uid) };
  },
  async duel_invite({ P, uid }) {
    const t = targetId(P, uid), me = await userPayload(pool, uid); if (!await nick(t)) fail('Không tìm thấy người chơi');
    const stake = Math.max(0, Math.min(100000, int(P.stake)));
    if (stake > me.gold) fail('Không đủ ngân lượng đặt cược');
    if (int(await col(pool, "SELECT COUNT(*) FROM tt_offers WHERE from_id=? AND to_id=? AND kind='duel' AND status=0", [uid, t])) > 0) fail('Đã gửi lời thách đấu, chờ đối phương trả lời');
    await q(pool, "INSERT INTO tt_offers(kind,from_id,to_id,data) VALUES('duel',?,?,?)", [uid, t, JSON.stringify({ stake })]);
    await notify(t, me.nickname + ' thách đấu bạn' + (stake ? ' (cược ' + fmtVN(stake) + ' ngân lượng)' : '') + ' - bấm V để nhận.');
    return { ok: true };
  },
  async duel_accept({ P, uid }) {
    const id = int(P.id);
    const res = await tx(async c => {
      const o = await one(c, `SELECT * FROM tt_offers WHERE id=? AND to_id=? AND kind='duel' AND status=0 AND created_at > (NOW() - INTERVAL ${OFFER_TTL} SECOND) FOR UPDATE`, [id, uid]);
      if (!o) fail('Lời thách đấu không còn');
      const from = +o.from_id, stake = int(parse(o.data).stake);
      if (stake > 0) for (const r of await q(c, 'SELECT id,gold FROM tt_users WHERE id IN (?,?) ORDER BY id FOR UPDATE', [uid, from])) if (+r.gold < stake) fail((+r.id === uid ? 'Bạn' : 'Người thách đấu') + ' không đủ ngân lượng đặt cược');
      const A = await userPayload(c, from), B = await userPayload(c, uid), r = R.duelSim(A, B);
      const win = r.win === 'A' ? from : uid, lose = win === from ? uid : from;
      if (stake > 0) { await q(c, 'UPDATE tt_users SET gold=gold+? WHERE id=?', [stake, win]); await q(c, 'UPDATE tt_users SET gold=gold-? WHERE id=?', [stake, lose]); }
      await q(c, 'UPDATE tt_offers SET status=1 WHERE id=?', [id]);
      await q(c, "INSERT INTO tt_pk_logs(challenger_id,defender_id,winner_id,log,status) VALUES(?,?,?,?,'duel')", [from, uid, win, r.log.join('\n')]);
      return { from, stake, A, B, r, win };
    });
    const { from, stake, A, B, r, win } = res;
    await questProgress(pool, uid, 'duel', 0, 1); await questProgress(pool, from, 'duel', 0, 1);
    await notify(from, 'Thách đấu với ' + B.nickname + ': ' + (win === from ? 'BẠN THẮNG' : 'bạn thua') + (stake ? ' (' + (win === from ? '+' : '-') + fmtVN(stake) + ' ngân lượng)' : '') + '.');
    return { ok: true, win: win === uid, winner: win === from ? A.nickname : B.nickname, log: r.log, stake, user: await userPayload(pool, uid) };
  },
};
async function closeOffer({ P, uid }, colName, status) {
  const id = int(P.id), o = await one(pool, `SELECT from_id,to_id,kind FROM tt_offers WHERE id=? AND ${colName}=? AND status=0`, [id, uid]);
  if (!o) fail('Lời mời không còn');
  await q(pool, 'UPDATE tt_offers SET status=? WHERE id=?', [status, id]);
  if (status === 2) await notify(+o.from_id, await nick(uid) + ' đã từ chối lời mời ' + (o.kind === 'duel' ? 'thách đấu' : 'giao dịch') + ' của bạn.');
  return { ok: true };
}
