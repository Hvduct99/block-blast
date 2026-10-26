// rt.php + pusher_auth.php - Ban do chung realtime (Pusher). May chu quyet dinh:
//  - Quai/boss tung map luu trong tt_map_mobs (HP, chet, hoi sinh).
//  - Client CHI gui hanh dong "dung chieu X len cac muc tieu [mid...]". May chu kiem tra hoi chieu/cap/so muc tieu,
//    tu tinh sat thuong, tru HP trong transaction, tinh EXP/vang/roi do, roi phat su kien qua Pusher cho ca map.
import { pool, q, one, col, tx } from '../db.js';
import { R, CFG, int, now, clock, randInt, fail, mem, userPayload, grantReward, dropLoot, lootList, mapBossReward, questProgress, sendMail, pusher, rtTrigger, rtTriggerMany, rtMapChannel, rtUserChannel } from '../core.js';

const WORLD_W = 9000, MOB_N = 30, FBOSS_MID = 99, MBOSS_MID = 98, MOB_MID_MAX = 90;
// cap mo, hoi chieu toi thieu (s), he so sat thuong, so muc tieu toi da, ti le chi mang - PHAI GIONG NET_SK trong game.js
const SKILLS = {
  atk: { lv: 1, cd: 0.12, mult: 1.0, max: 4, crit: 0.12 },
  tt: { lv: 1, cd: 1.5, mult: 3.36, max: 6, crit: 0.12 },
  sth: { lv: 3, cd: 6.0, mult: 1.6, max: 14, crit: 0.12 },
  dl: { lv: 5, cd: 4.0, mult: 2.6, max: 10, crit: 0.12 },
  cd: { lv: 8, cd: 14, mult: 0, max: 0, crit: 0 },
  vx: { lv: 18, cd: 10, mult: 3.0, max: 12, crit: 0.12, sect: 1 },
  ult: { lv: 12, cd: 25, mult: 5.4, max: 30, crit: 0.20, sect: 1 },
};
const CAST_WINDOW = 2.6;
const bossX = x => Math.max(R.SAFE_W + 400, Math.min(WORLD_W - R.SAFE_R - 300, int(x)));
const sock = P => (/^\d+\.\d+$/.test(P.socket_id || '') ? P.socket_id : null);

function mobMaxHp(s, kind) {
  if (kind === 'elite') return int(s.mob_hp) * 4;
  if (kind === 'fboss') return Math.round(int(s.boss_hp) * 0.6);
  if (kind === 'mboss') return Math.round(int(s.boss_hp) * 1.5);
  return int(s.mob_hp);
}
const mbLeft = async idx => Math.max(0, R.MB_KILLS - int(await col(pool, 'SELECT mb_kills FROM tt_map_state WHERE stage=?', [idx])));
// MOB_N vi tri quai co dinh trai deu map (lan dau co nguoi vao, hoac khi doi so luong / mau quai)
async function seedMap(s) {
  const r = await one(pool, "SELECT COUNT(*) n, MAX(CASE WHEN mid=1 THEN max_hp END) hp1, MAX(CASE WHEN kind='elite' THEN max_hp END) hpe, MIN(x) mx FROM tt_map_mobs WHERE stage=? AND mid<?", [s.idx, MOB_MID_MAX]);
  if (int(r.n) === MOB_N && int(r.hp1) === mobMaxHp(s, 'mob') && int(r.hpe) === mobMaxHp(s, 'elite') && int(r.mx) >= R.SAFE_W + 150) return;
  await q(pool, 'DELETE FROM tt_map_mobs WHERE stage=? AND mid<?', [s.idx, MOB_MID_MAX]);
  const x0 = R.SAFE_W + 220, step = (WORLD_W - R.SAFE_R - 200 - x0) / MOB_N, rows = [];
  for (let i = 0; i < MOB_N; i++) {
    const kind = i % 7 === 4 ? 'elite' : (i % 4 === 2 ? 'ranged' : 'mob'), hp = mobMaxHp(s, kind);
    rows.push([s.idx, i + 1, kind, Math.trunc(x0 + i * step), i % 3 === 1 ? 1 : 0, hp, hp, 0]);
  }
  await q(pool, 'INSERT INTO tt_map_mobs(stage,mid,kind,x,tier,hp,max_hp,respawn_at) VALUES ' + rows.map(() => '(?,?,?,?,?,?,?,?)').join(',') + ' ON CONFLICT DO NOTHING', rows.flat());
  await q(pool, 'INSERT INTO tt_map_state(stage) VALUES(?) ON CONFLICT DO NOTHING', [s.idx]);
}
async function mobList(stage, only) {
  const rows = await q(pool, 'SELECT mid,kind,x,tier,hp,max_hp,respawn_at FROM tt_map_mobs WHERE stage=?' + (only ? ' AND mid = ANY(?)' : ''), only ? [stage, only] : [stage]);
  const t = now();
  return rows.filter(r => !(+r.mid >= MOB_MID_MAX && +r.hp <= 0))
    .map(r => ({ mid: +r.mid, kind: r.kind, x: +r.x, tier: +r.tier, hp: +r.hp, max: +r.max_hp, respawn: +r.hp <= 0 && +r.respawn_at > 0 ? Math.max(0, r.respawn_at - t) : 0 }));
}
// Hoi sinh quai den gio (lazy). Tra ve danh sach vua hoi sinh
async function processRespawns(s) {
  const mids = (await q(pool, 'SELECT mid FROM tt_map_mobs WHERE stage=? AND hp<=0 AND respawn_at>0 AND respawn_at<=? AND mid<?', [s.idx, now(), MOB_MID_MAX])).map(r => +r.mid);
  const outM = [];
  for (const mid of mids) if ((await q(pool, 'UPDATE tt_map_mobs SET hp=max_hp, respawn_at=0, dmgs=NULL WHERE stage=? AND mid=? AND hp<=0', [s.idx, mid])).affectedRows > 0) outM.push(mid);
  return outM.length ? mobList(s.idx, outM) : [];
}
function needInMap(uid, idx) { const rt = mem(uid).rt; if (!rt || rt.stage !== idx) fail('Chưa vào bản đồ chung'); return rt; }

export const rt = {
  async join({ P, uid }) {
    const idx = int(P.stage), me = await userPayload(pool, uid), s = R.stageRow(idx);
    if (!s) fail('Map không tồn tại');
    if (idx > me.stage_max) fail('Chưa mở bản đồ này', 403);
    if (me.jail && me.jail !== idx) fail('Đang bị TRUY NÃ - kẹt tại bản đồ ' + me.jail, 403);
    if (!pusher()) fail('Bản đồ chung tạm thời bận', 503);
    await seedMap(s);
    const spawned = await processRespawns(s);
    if (spawned.length) rtTrigger(rtMapChannel(idx), 'mob-spawn', { mobs: spawned });
    mem(uid).rt = { stage: idx, casts: {}, bk: {}, buff: 0, chat: 0, move: 0, mobs: 0 };
    const chat = (await q(pool, "SELECT m.id,m.from_id,m.text,u.nickname FROM tt_messages m JOIN tt_users u ON u.id=m.from_id WHERE m.scope='map' AND m.guild_id=? ORDER BY m.id DESC LIMIT 15", [idx])).reverse();
    return { ok: true, stage: idx, world_w: WORLD_W, mobs: await mobList(idx), chat, mb_left: await mbLeft(idx), loot: await lootList(pool, idx),
      pusher: { key: CFG.pusher.key, cluster: CFG.pusher.cluster, channel: rtMapChannel(idx), user_channel: rtUserChannel(uid) }, me: uid };
  },
  // dong bo lai (moi 10-15s) + hoi sinh
  async state({ P, uid }) {
    const idx = int(P.stage); needInMap(uid, idx);
    const s = R.stageRow(idx), spawned = await processRespawns(s);
    if (spawned.length) rtTrigger(rtMapChannel(idx), 'mob-spawn', { mobs: spawned }, sock(P));
    return { ok: true, mobs: await mobList(idx), mb_left: await mbLeft(idx), loot: await lootList(pool, idx) };
  },
  // danh quai: batch = "chieu:cast:mid,mid;chieu:cast:mid"
  async hit(ctx) {
    const { P, uid } = ctx, idx = int(P.stage), r = needInMap(uid, idx);
    const entries = P.batch != null
      ? String(P.batch).slice(0, 4000).split(';').slice(0, 16).map(x => x.split(':')).filter(p => p.length === 3).map(p => [p[0], int(p[1]), p[2]])
      : [[String(P.skill || ''), int(P.cast), String(P.targets || '')]];
    const me = await userPayload(pool, uid), t = clock();
    const pairs = []; let buffOut = 0, cdHit = false, lastSk = 'atk';
    for (const [sk, cast, tg] of entries) {
      const def = SKILLS[sk]; if (!def) continue;
      if (me.level < def.lv) continue;
      if (def.sect && !me.sect) continue;
      // moi chieu nho toi da 6 lan thi trien gan nhat; lan thi trien MOI tieu 1 "token" hoi theo cd
      const list = {}; for (const k in (r.casts[sk] || {})) if (t - r.casts[sk][k].t <= CAST_WINDOW) list[k] = r.casts[sk][k];
      if (!list[cast]) {
        const bk = r.bk[sk] || { v: 2, t }, v = Math.min(2, bk.v + (t - bk.t) / def.cd);
        if (v < 1) { r.bk[sk] = { v, t }; cdHit = true; continue; }
        r.bk[sk] = { v: v - 1, t };
        list[cast] = { t, hit: [] };
        const keys = Object.keys(list); if (keys.length > 6) keys.slice(0, keys.length - 6).forEach(k => delete list[k]);
      }
      r.casts[sk] = list;
      if (sk === 'cd') { r.buff = t + 10; buffOut = 10; continue; }
      const already = list[cast].hit;
      let ids = [...new Set(tg.split(',').map(int).filter(v => v > 0))].filter(v => !already.includes(v));
      ids = ids.slice(0, Math.max(0, def.max - already.length));
      if (!ids.length) continue;
      list[cast].hit = already.concat(ids);
      ids.forEach(mid => pairs.push([sk, mid]));
      lastSk = sk;
    }
    const buffOn = r.buff > t;
    if (!pairs.length) return { ok: true, res: [], buff: buffOut || null, cd: cdHit && !buffOut };

    const s = R.stageRow(idx), cs = R.combatStats(me), atk = cs.atk * (buffOn ? 1.3 : 1);
    const res = [], kills = [], fbReward = [], mbReward = []; let gExp = 0, gGold = 0; const gItems = {};
    let fbSpawn = null, mbSpawn = null;
    await tx(async c => {
      for (const [sk, mid] of pairs) {
        const def = SKILLS[sk], m = await one(c, 'SELECT * FROM tt_map_mobs WHERE stage=? AND mid=? FOR UPDATE', [idx, mid]);
        if (!m || +m.hp <= 0) continue;
        const kind = m.kind, mdef = kind === 'mboss' ? idx * 6 : kind === 'fboss' ? idx * 5 : kind === 'elite' ? idx * 4 : idx * 3, isBoss = kind === 'fboss' || kind === 'mboss';
        const crit = randInt(1, 1000) <= Math.min(0.6, def.crit + cs.crit - 0.12) * 1000;
        const d = Math.max(1, Math.round(Math.max(1, atk * def.mult * (sk === 'atk' ? 1 : 1 + cs.mag / 100) - mdef * 0.5) * (randInt(90, 110) / 100) * (crit ? 1.8 : 1)));
        const hp = Math.max(0, +m.hp - d), dmgs = m.dmgs ? JSON.parse(m.dmgs) : {};
        if (isBoss) dmgs[uid] = (dmgs[uid] || 0) + Math.min(d, +m.hp);
        const respawn = hp <= 0 && !isBoss ? now() + (kind === 'elite' ? 25 : 7) : 0;
        await q(c, 'UPDATE tt_map_mobs SET hp=?, respawn_at=?, dmgs=? WHERE stage=? AND mid=?', [hp, respawn, Object.keys(dmgs).length ? JSON.stringify(dmgs) : null, idx, mid]);
        res.push({ mid, dmg: d, crit, hp, dead: hp <= 0 });
        if (hp > 0) continue;
        kills.push(mid);
        if (isBoss) {
          const total = Object.values(dmgs).reduce((a, b) => a + b, 0) || 1;
          for (const cu in dmgs) if (dmgs[cu] / total >= (kind === 'mboss' ? 0.03 : 0.05)) (kind === 'mboss' ? mbReward : fbReward).push(+cu);
        } else {
          const w = kind === 'elite' ? 4 : 1;
          gExp += Math.round(int(s.mob_exp) * w * 0.7); gGold += Math.round(int(s.mob_gold) * w * 0.7);
          const dr = R.rollDrops(kind === 'elite' ? 2 : 1, idx); for (const k in dr) gItems[k] = (gItems[k] | 0) + dr[k];
        }
      }
      const normalKills = kills.filter(k => k < MOB_MID_MAX).length;
      ctx.normalKills = normalKills;
      if (!normalKills) return;
      await q(c, 'UPDATE tt_map_state SET kills=kills+?, fb_kills=fb_kills+?, mb_kills=mb_kills+? WHERE stage=?', [normalKills, normalKills, normalKills, idx]);
      // Boss Ban Do: moi MB_KILLS quai bi ha (ca map cong don)
      const mbk = int(await col(c, 'SELECT mb_kills FROM tt_map_state WHERE stage=? FOR UPDATE', [idx]));
      const mbRow = await one(c, 'SELECT hp FROM tt_map_mobs WHERE stage=? AND mid=?', [idx, MBOSS_MID]);
      if (mbk >= R.MB_KILLS && (!mbRow || +mbRow.hp <= 0)) {
        const hp = mobMaxHp(s, 'mboss'), px = bossX(int(P.px ?? 1800) + 600);
        await q(c, "INSERT INTO tt_map_mobs(stage,mid,kind,x,tier,hp,max_hp,respawn_at,dmgs) VALUES(?,?,'mboss',?,0,?,?,0,NULL) ON CONFLICT (stage,mid) DO UPDATE SET kind=EXCLUDED.kind,x=EXCLUDED.x,tier=0,hp=EXCLUDED.hp,max_hp=EXCLUDED.max_hp,respawn_at=0,dmgs=NULL", [idx, MBOSS_MID, px, hp, hp]);
        await q(c, 'UPDATE tt_map_state SET mb_kills=0 WHERE stage=?', [idx]);
        mbSpawn = { mid: MBOSS_MID, kind: 'mboss', x: px, tier: 0, hp, max: hp, respawn: 0 };
      }
      const fbk = int(await col(c, 'SELECT fb_kills FROM tt_map_state WHERE stage=? FOR UPDATE', [idx]));
      const fbRow = await one(c, 'SELECT hp FROM tt_map_mobs WHERE stage=? AND mid=?', [idx, FBOSS_MID]);
      if (fbk >= 40 && (!fbRow || +fbRow.hp <= 0)) {
        const hp = mobMaxHp(s, 'fboss'), px = bossX(int(P.px ?? 1800) + 400);
        await q(c, "INSERT INTO tt_map_mobs(stage,mid,kind,x,tier,hp,max_hp,respawn_at,dmgs) VALUES(?,?,'fboss',?,0,?,?,0,NULL) ON CONFLICT (stage,mid) DO UPDATE SET kind=EXCLUDED.kind,x=EXCLUDED.x,tier=0,hp=EXCLUDED.hp,max_hp=EXCLUDED.max_hp,respawn_at=0,dmgs=NULL", [idx, FBOSS_MID, px, hp, hp]);
        await q(c, 'UPDATE tt_map_state SET fb_kills=0 WHERE stage=?', [idx]);
        fbSpawn = { mid: FBOSS_MID, kind: 'fboss', x: px, tier: 0, hp, max: hp, respawn: 0 };
      }
    });
    const normalKills = ctx.normalKills | 0;

    // phan thuong ngoai transaction; su kien Pusher gom lai, gui SAU khi tra ket qua cho nguoi danh
    const later = [], so = sock(P), hx = Math.max(60, Math.min(WORLD_W - 60, int(P.px)));
    let ups = 0, loot = [];
    if (Object.keys(gItems).length) loot = await dropLoot(pool, idx, gItems, hx, uid);
    if (gExp || gGold || Object.keys(gItems).length) {
      ups = await grantReward(pool, uid, gExp, gGold, {}); await questProgress(pool, uid, 'kill', idx, normalKills);
      if (normalKills > 0) await q(pool, 'UPDATE tt_users SET friendly=LEAST(100,friendly+1) WHERE id=? AND friendly<100', [uid]);
    }
    let fbGain = null;
    if (fbReward.length) {
      const fe = Math.round(int(s.boss_exp) * 0.5), fg = Math.round(int(s.boss_gold) * 0.5);
      for (const cu of fbReward) {
        const it = R.rollDrops(6, idx), up = 'cuong_' + R.stoneTier(idx); it.sat = (it.sat | 0) + 1; it.go = (it.go | 0) + 1; it[up] = (it[up] | 0) + 2;
        const u2 = await grantReward(pool, cu, fe, fg, {}, 1); await questProgress(pool, cu, 'fboss', idx, 1);
        loot = loot.concat(await dropLoot(pool, idx, it, hx, cu, true));
        if (cu === uid) { ups += u2; fbGain = { exp: fe, gold: fg, items: [], ingot: 1 }; }
        else { await sendMail(pool, cu, '⚔️ Cùng hạ Thủ Lĩnh ở ' + s.name + ': +' + fe + ' kinh nghiệm, +' + fg + ' ngân lượng'); later.push([rtUserChannel(cu), 'reward', { text: 'Cùng hạ Thủ Lĩnh: +' + fe + ' kinh nghiệm, +' + fg + ' ngân lượng' }, null]); }
      }
    }
    let mbGain = null, unlock = 0;
    for (const cu of mbReward) {
      const rr = await mapBossReward(pool, cu, s, hx); if (!rr) continue; loot = loot.concat(rr.loot);
      const txt = '👑 Hạ Boss Bản Đồ ' + s.boss_name + ': +' + rr.gained.exp + ' kinh nghiệm, +' + rr.gained.gold + ' ngân lượng, +' + rr.gained.ingot + ' Nguyên Bảo' + (rr.unlock ? ' · Mở bản đồ ' + rr.unlock + '!' : '');
      if (cu === uid) { ups += rr.ups; mbGain = rr.gained; unlock = rr.unlock; }
      else { await sendMail(pool, cu, txt); later.push([rtUserChannel(cu), 'reward', { text: txt }, null]); }
    }
    const ch = rtMapChannel(idx);
    if (res.length) later.push([ch, 'mob-hit', { by: uid, name: me.nickname, sk: lastSk, res }, so]);
    if (fbSpawn) later.push([ch, 'mob-spawn', { mobs: [fbSpawn], boss: true }, null]);
    if (mbSpawn) later.push([ch, 'mob-spawn', { mobs: [mbSpawn], mboss: true }, null]);
    if (loot.length) later.push([ch, 'loot-drop', { loot }, so]);
    const gained = { exp: gExp, gold: gGold, items: {}, ingot: 0 };
    [fbGain, mbGain].forEach(gx => { if (gx) { gained.exp += gx.exp; gained.gold += gx.gold; gained.ingot += gx.ingot; } });
    ctx.after = () => rtTriggerMany(later);
    return { ok: true, res, gained, ups, fboss: fbSpawn, mboss: mbSpawn, loot, mb: mbGain ? 1 : 0, unlock, mb_left: normalKills ? await mbLeft(idx) : null,
      buff: buffOut || null, user: gExp || gGold || fbGain || mbGain ? await userPayload(pool, uid) : null };
  },
  async chat({ P, uid }) {
    const idx = int(P.stage), r = needInMap(uid, idx), text = [...String(P.text || '')].slice(0, 200).join('').trim();
    if (!text) fail('Tin nhắn trống');
    const t = clock(); if (t - r.chat < 1) fail('Chat chậm lại 1 giây', 429); r.chat = t;
    const me = await userPayload(pool, uid);
    const id = (await q(pool, "INSERT INTO tt_messages(scope,guild_id,from_id,text) VALUES('map',?,?,?) RETURNING id", [idx, uid, text])).insertId;
    const msg = { id, uid, name: me.nickname, text };
    rtTrigger(rtMapChannel(idx), 'chat', msg, sock(P));
    return { ok: true, msg };
  },
  // chuyen tiep vi tri khi Pusher app chua bat "client events"
  async move(ctx) { return relay(ctx, 'move'); },
  async mobs(ctx) { return relay(ctx, 'mobs'); },
  leave({ uid }) { mem(uid).rt = null; return { ok: true }; },
};
async function relay({ P, uid }, a) {
  const idx = int(P.stage), r = needInMap(uid, idx), t = clock();
  if (t - r[a] < (a === 'move' ? 0.4 : 0.8)) fail('Quá nhanh', 429); r[a] = t;
  if (a === 'move') {
    const d = { id: uid, x: Math.max(0, Math.min(WORLD_W, int(P.x))), y: Math.max(0, Math.min(2000, int(P.y))), f: int(P.f ?? 1) < 0 ? -1 : 1,
      a: String(P.a || 'idle').slice(0, 6).replace(/[^a-z0-9]/g, ''), hp: Math.max(0, int(P.hp)), mhp: Math.max(1, int(P.mhp || 1)),
      av: ['samurai', 'ninja', 'kunoichi'].includes(P.av) ? P.av : 'samurai' };
    rtTrigger(rtMapChannel(idx), 'move', d, sock(P));
  } else {
    let list = []; try { list = JSON.parse(P.list || '[]'); } catch (_) { }
    const clean = Array.isArray(list) ? list.slice(0, 40).filter(x => Array.isArray(x) && x.length >= 4).map(x => [int(x[0]), int(x[1]), int(x[2]), int(x[3]) < 0 ? -1 : 1]) : [];
    rtTrigger(rtMapChannel(idx), 'mobs', { id: uid, list: clean }, sock(P));
  }
  return { ok: true };
}

// pusher_auth.php: chi nguoi da dang nhap; chi vao map da mo; chi kenh rieng cua chinh minh. Tra ve [status, noi dung]
export async function pusherAuth(uid, P) {
  if (!uid) return [403, 'Chưa đăng nhập'];
  const p = pusher(); if (!p) return [503, 'Tạm thời bận'];
  const socket = String(P.socket_id || ''), channel = String(P.channel_name || '');
  if (!/^\d+\.\d+$/.test(socket)) return [400, 'socket_id?'];
  const pre = 'presence-' + CFG.pusher.prefix + '-map-', num = channel.startsWith(pre) ? channel.slice(pre.length) : '';
  if (/^\d+$/.test(num)) {
    const st = int(num), u = await userPayload(pool, uid);
    if (!u || st < 1 || st > R.MAX_STAGE || st > u.stage_max) return [403, 'Chưa mở bản đồ này'];
    return [200, p.authorizeChannel(socket, channel, { user_id: String(uid), user_info: { name: u.nickname, lv: u.level, sect: u.sect || '', av: u.avatar || 'samurai' } })];
  }
  if (channel === rtUserChannel(uid)) return [200, p.authorizeChannel(socket, channel)];
  return [403, 'Kênh không hợp lệ'];
}
