// backend.js - cau noi giua game va "may chu" (src/server/api.js, giu nguyen giao dien api/*.php cu). Du lieu luu trong trinh duyet.
(function () {
  'use strict';
  const EQ = window.TATON_EQUIP || { items: [], slots: [], enhance: { max: 15, pct: 8, gold: [], iron: [], rate: [], dropFrom: 7 }, holes: { max: {}, gold: [], tool: [] }, merge: { need: 3, goldPerTier: 200, maxTier: 6 }, unlayGoldPerTier: 500, exchange: 200, legacy: [] };
  const ITEM_BY = {}; EQ.items.forEach(i => { ITEM_BY[i.code] = i; });
  // Luat choi - PHAI GIONG config.php / api/*.php / install.php
  const RULES = {
    maxLevel: 100, maxStage: 30,
    perLevel: { hp: 25, mp: 8, atk: 4, def: 2 },
    // Diem tiem nang (PHAI GIONG ATTRS / combat_stats trong config.php): moi cap +5 diem
    ptsPerLv: 5, resetCost: 10,
    attrs: [
      { k: 'str', name: 'Sức mạnh', ico: '💪', des: '+2 Công / điểm' },
      { k: 'vit', name: 'Thể lực', ico: '❤️', des: '+14 Máu / điểm' },
      { k: 'ene', name: 'Năng lượng', ico: '💧', des: '+7 Nội lực / điểm' },
      { k: 'agi', name: 'Nhanh nhẹn', ico: '🌪️', des: '+1% Chí mạng / 4 điểm, +0.4% tốc chạy (tối đa 30%)' },
      { k: 'dfn', name: 'Phòng thủ', ico: '🛡️', des: '+1.5 Thủ / điểm' },
      { k: 'mag', name: 'Pháp thuật', ico: '✨', des: '+1% sát thương tuyệt học (Q W E R T Y) / điểm' },
    ],
    // Cap 1-10 nhanh; tu cap 11 EXP tang theo cap so cong (PHAI GIONG exp_need trong config.php)
    expNeed: lv => { lv = lv | 0; if (lv <= 10) return 60 + 40 * lv; const k = lv - 10; return 460 + 120 * k + 18 * k * k; },
    stoneTier: st => Math.max(1, Math.min(16, Math.round((+st || 1) * 16 / 30))), // cap Da Cuong Hoa roi o map (giong stone_tier)
    crops: { lua: { sec: 30, yield: 3 }, go: { sec: 60, yield: 2 }, sat: { sec: 120, yield: 2 } },
    items: EQ.items,
  };
  const STAGES = (window.TATON_DATA && window.TATON_DATA.stages) || [];
  const QDATA = window.TATON_QUESTS || { npcs: [], quests: [] };
  const QUESTS = QDATA.quests || [], NPCS = QDATA.npcs || [];
  const SECTS = (window.TATON_SECTS && window.TATON_SECTS.list) || [];
  const AVATARS = ['samurai', 'ninja', 'kunoichi'];
  const localDay = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // Trang thai nhiem vu: locked | available | active | ready | done  (PHAI GIONG q_status trong api/quest.php)
  function questStatus(q, u) {
    const qs = (u && u.quests) || {};
    let row = qs[q.id] || null;
    if (row && q.daily && row.state === 'done' && row.day !== (u.today || localDay())) row = null;
    if (row) {
      if (row.state === 'done') return 'done';
      return questProgress(q, u) >= q.n ? 'ready' : 'active';
    }
    const r = q.req || {};
    if (r.level && (u.level || 1) < r.level) return 'locked';
    if (r.stage && (u.stage_max || 1) < r.stage) return 'locked';
    if (r.prev) { const p = qs[r.prev]; if (!p || p.state !== 'done') return 'locked'; }
    return 'available';
  }
  function questProgress(q, u) { const row = ((u && u.quests) || {})[q.id]; return q.type === 'level' ? (u.level || 1) : (row ? (+row.progress || 0) : 0); }
  const stageOf = idx => STAGES.find(s => +s.idx === +idx);
  const itemOf = code => ITEM_BY[code] || null;

  // ---------- Trang bi (PHAI GIONG config.php: equip_stats / gear_total / combat_stats) ----------
  function parseStones(str) { return String(str || '').split(',').filter(Boolean).map(p => { const a = p.split(':'); return { t: a[0], lv: +a[1] || 0 }; }).filter(g => g.lv > 0); }
  function stoneVal(t, lv) { const it = ITEM_BY['st_' + t + '_' + lv]; return it ? (it.val | 0) : 0; }
  function equipStats(row) {
    const d = ITEM_BY[row.code], st = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 };
    if (!d) return st;
    const pct = EQ.enhance.pct || 8;
    for (const k in (d.st || {})) st[k] += Math.floor(d.st[k] * (100 + pct * (row.plus | 0)) / 100);
    parseStones(row.stones).forEach(g => { if (g.t in st) st[g.t] += stoneVal(g.t, g.lv); });
    return st;
  }
  function decorate(list) { return (list || []).filter(r => ITEM_BY[r.code]).map(r => Object.assign({}, r, { slot: ITEM_BY[r.code].slot, st: equipStats(r) })); }
  function gearTotal(equips) { const t = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 }; (equips || []).forEach(e => { if (e.equipped) for (const k in t) t[k] += e.st[k] || 0; }); return t; }
  const AVDEF = (window.TATON_SECTS && window.TATON_SECTS.avatars) || {};
  // PHAI GIONG combat_stats (config.php): goc + trang bi, nhan (% mon phai + % tao hinh)
  function combat(u) {
    const s = SECTS.find(x => x.id === (u && u.sect)), m = (s && s.mods) || {}, g = (u && u.gear) || { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 };
    const av = AVDEF[u && u.avatar] || {}, am = av.mods || {}, pc = k => 1 + ((m[k] || 0) + (am[k] || 0)) / 100;
    const f = (v, k) => Math.max(1, Math.round(v * pc(k))), a = k => (u && u['pt_' + k]) | 0;
    return { hp: f((u.hp_max | 0) + g.hp + 14 * a('vit'), 'hp'), mp: f((u.mp_max | 0) + g.mp + 7 * a('ene'), 'mp'), atk: f((u.atk | 0) + g.atk + 2 * a('str'), 'atk'),
      def: Math.max(0, Math.round(((u.def | 0) + g.def + Math.floor(1.5 * a('dfn'))) * pc('def'))), crit: Math.min(60, 12 + (g.crit | 0) + (av.crit | 0) + Math.floor(a('agi') / 4)),
      mag: a('mag'), spd: Math.min(30, a('agi') * 0.4) };
  }
  // He so khac che PK (giong sect_counter_mult)
  function counterMult(a, b) {
    const pct = (window.TATON_SECTS && window.TATON_SECTS.counterPct) || [20, 15], sa = SECTS.find(x => x.id === a), sb = SECTS.find(x => x.id === b);
    if (sa && (sa.counters || []).includes(b)) return 1 + pct[0] / 100;
    if (sb && (sb.counters || []).includes(a)) return 1 - pct[1] / 100;
    return 1;
  }

  // Ban tinh (GitHub Pages): "may chu" chay ngay trong trinh duyet - src/server/api.js (window.LocalServer)
  async function req(url, data) {
    try {
      const r = await window.LocalServer.handle(url, data);
      if (r.status === 401) { setTimeout(() => { location.href = 'index.html'; }, 1500); }
      return r.data;
    } catch (e) { console.error(e); return { ok: false, error: 'Lỗi xử lý dữ liệu' }; }
  }
  function normUser(u) {
    if (!u) return null;
    const out = Object.assign({}, u);
    ['id', 'level', 'exp', 'gold', 'ingot', 'hp_max', 'mp_max', 'atk', 'def', 'stage_max', 'is_admin', 'pk_mode', 'provoke', 'jail', 'guild_id', 'pts'].concat(RULES.attrs.map(x => 'pt_' + x.k)).forEach(k => { out[k] = +out[k] || 0; });
    out.friendly = u.friendly == null ? 100 : +u.friendly;
    out.inv = Object.assign({}, u.inv || {});
    out.stars = Object.assign({}, u.stars || {});
    out.equips = decorate(u.equips || []);
    out.gear = gearTotal(out.equips);
    out.avatar = AVATARS.includes(u.avatar) ? u.avatar : (u.sect ? 'samurai' : '');
    out.exp_need = RULES.expNeed(out.level);
    return out;
  }
  // Goi API va cap nhat nguoi choi neu may chu tra ve 'user'
  async function call(url, data) { const j = await req(url, data); if (j && j.ok && j.user) B._set(j.user); return j; }

  const B = {
    RULES, EQ, STAGES, stageOf, itemOf, equipStats, combat, counterMult, parseStones, AVATARS, AVDEF,
    online: true, user: null, _ls: [],
    onChange(cb) { this._ls.push(cb); },
    _set(u) {
      if (!u) return;
      this.user = normUser(u);
      this._ls.forEach(cb => { try { cb(this.user); } catch (e) { console.error(e); } });
    },
    // Bat buoc dang nhap: chua dang nhap -> ve trang dang nhap
    async init() {
      const j = await req('api/auth.php?action=me');
      if (j && j.ok && j.user) { this._set(j.user); return this.user; }
      location.href = 'index.html';
      return new Promise(() => { }); // dung luong khoi dong trong luc chuyen trang
    },
    async refresh() { return call('api/auth.php?action=me'); },
    startStage(idx) { return call('api/game.php', { action: 'start_stage', stage: idx }); },
    kill(idx, n, mode, e, px) { return call('api/game.php', { action: 'kill', stage: idx, n, e: e | 0, px: px | 0 }); },
    fieldBoss(idx, px) { return call('api/game.php', { action: 'fboss', stage: idx, px: px | 0 }); },
    mapBoss(idx, px) { return call('api/game.php', { action: 'mboss', stage: idx, px: px | 0 }); },
    lootPick(id) { return call('api/loot.php', { action: 'pick', id }); },
    lootList(stage) { return req('api/loot.php?action=list&stage=' + (stage | 0)); },
    SECTS,
    sectOf(id) { return SECTS.find(x => x.id === id) || null; },
    chooseSect(id, avatar) {
      if (!this.sectOf(id)) return Promise.resolve({ ok: false, error: 'Môn phái không tồn tại' });
      return call('api/game.php', { action: 'choose_sect', sect: id });
    },
    chooseAvatar(av) { return call('api/game.php', { action: 'choose_avatar', avatar: av }); },
    useItem(code) { return call('api/game.php', { action: 'use_item', code }); },
    shopBuy(code, qty, cur) { return call('api/game.php', { action: 'shop_buy', code, qty, cur: cur === 'ingot' ? 'ingot' : 'gold' }); },
    sell(code, qty) { const d = { action: 'sell', code }; if (qty) d.qty = qty; return call('api/game.php', d); },
    statAdd(attr, n) { return call('api/game.php', { action: 'stat_add', attr, n }); },
    statReset() { return call('api/game.php', { action: 'stat_reset' }); },
    pkMode(mode) { return call('api/social.php', { action: 'pk_mode', mode }); },
    pkCleanse() { return call('api/pk.php', { action: 'cleanse' }); },
    equipOp(action, params) { return call('api/equip.php', Object.assign({ action }, params || {})); },
    forgeList() { return req('api/forge.php?action=list'); },
    forge(code) { return call('api/forge.php', { action: 'forge', code }); },
    farmState() { return req('api/farm.php?action=state'); },
    plant(slot, crop) { return req('api/farm.php', { action: 'plant', slot, crop }); },
    harvest(slot) { return call('api/farm.php', { action: 'harvest', slot }); },
    QUESTS, NPCS, questStatus, questProgress,
    questAccept(id) { return call('api/quest.php', { action: 'accept', id }); },
    questClaim(id) { return call('api/quest.php', { action: 'claim', id }); },
    req,
  };
  window.Backend = B;
})();
