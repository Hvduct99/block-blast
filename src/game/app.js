// app.js - giao dien quanh game: ban do the gioi, hoi thoai, ket qua, nhan vat, hanh trang, tiem, ren/cuong hoa/duc sao/kham, nong trai, bang, PK, chat
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
  const B = () => window.Backend;
  const U = () => (window.Backend && Backend.user) || {};
  const STAGES = (window.TATON_DATA && window.TATON_DATA.stages) || [];
  const ICONS = window.TATON_ICONS || { cols: 8, rows: 7, keys: [] };
  const EQ = () => B().EQ;
  const fmt = n => (+n || 0).toLocaleString('vi-VN');
  // Icon tu atlas (assets/img/icons.png) - dung % de dung ca khi CDN thu nho anh
  function icon(key, size, cls) {
    const i = ICONS.keys.indexOf(key); size = size || 24;
    if (i < 0) return '';
    const c = i % ICONS.cols, r = Math.floor(i / ICONS.cols);
    return '<i class="ico ' + (cls || '') + '" style="width:' + size + 'px;height:' + size + 'px;background-size:' + (ICONS.cols * 100) + '% ' + (ICONS.rows * 100) + '%;background-position:' + (c / (ICONS.cols - 1) * 100) + '% ' + (r / (ICONS.rows - 1) * 100) + '%"></i>';
  }
  const EMBLEMS = ['em_lion', 'em_dragon', 'em_flame', 'em_eagle', 'em_yinyang', 'em_lotus', 'em_tiger', 'em_snake', 'em_swords', 'em_sun', 'em_wolf', 'em_fox'];
  const QUESTS = () => B().QUESTS || [], NPCS = () => B().NPCS || [];
  const itemName = c => { const it = B().itemOf(c); return it ? it.name : c; };
  const itemIco = c => { const it = B().itemOf(c); return (it && it.icon) || c; };
  const iconOf = (c, size) => {
    const it = B().itemOf(c);
    if (it && it.wing != null) { size = size || 24; return '<i class="ico wing-ico" style="width:' + size + 'px;height:' + size + 'px;background-position:100% ' + (it.wing / 7 * 100) + '%"></i>'; }
    return icon(itemIco(c), size);
  };
  const GOLD = n => '<span class="cur gold">' + icon('gold', 16) + fmt(n) + '</span>';
  const INGOT = n => '<span class="cur ingot">' + icon('nguyen_bao', 16) + fmt(n) + '</span>';
  const STONE_COLOR = { atk: '#ff5a4a', hp: '#46d06a', mp: '#4aa8ff', def: '#f0c030', crit: '#c47cff' };
  const AV_NAME = { samurai: 'Kiếm khách (nam)', ninja: 'Thích khách (nam)', kunoichi: 'Nữ hiệp (nữ)' };
  const AV_ICON = { samurai: 'ui_char', ninja: 'ui_ninja', kunoichi: 'ui_female' };
  const SKILL_KEYS = 'AQWERTY';
  const AV_PICK = ['samurai', 'kunoichi'];      // 2 nhan vat: nam / nu
  const SECT_LV = () => Game.SECT_LV || 25;     // cap duoc bai nhap mon phai
  const NOSECT_COL = '#8a96aa';

  // ---------------- toast ----------------
  function toast(msg, kind) {
    const box = $('toasts'); if (!box) return;
    const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg;
    box.appendChild(d); setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3100);
  }
  function gainedText(g) {
    const parts = [];
    if (g.exp) parts.push(g.exp + ' kinh nghiệm'); if (g.gold) parts.push(fmt(g.gold) + ' ngân lượng'); if (g.ingot) parts.push(g.ingot + ' Nguyên Bảo');
    for (const k in (g.items || {})) parts.push(g.items[k] + ' ' + itemName(k));
    return parts.join(', ');
  }

  // ---------------- overlays ----------------
  const OVS = ['ovMap', 'ovDialog', 'ovResult', 'ovPause', 'ovNpc', 'ovWin', 'ovSect', 'ovTrade', 'ovHome'];
  function hideOverlays() { OVS.forEach(id => { const e = $(id); if (e) e.hidden = true; }); }
  function show(id) { hideOverlays(); $(id).hidden = false; kickAnim(); }

  let dlg = { lines: [], i: 0, cb: null, typing: null, full: '' };
  function dialog(lines, cb) {
    dlg = { lines: lines || [], i: 0, cb, typing: null, full: '' };
    show('ovDialog'); dialogShow();
  }
  function dialogShow() {
    const l = dlg.lines[dlg.i]; if (!l) return dialogEnd();
    $('dlgName').textContent = l[0]; dlg.full = l[1]; let n = 0;
    clearInterval(dlg.typing);
    $('dlgText').textContent = '';
    dlg.typing = setInterval(() => { n += 2; $('dlgText').textContent = dlg.full.slice(0, n); if (n >= dlg.full.length) { clearInterval(dlg.typing); dlg.typing = null; } }, 22);
  }
  function dialogNext() {
    if ($('ovDialog').hidden) return;
    if (dlg.typing) { clearInterval(dlg.typing); dlg.typing = null; $('dlgText').textContent = dlg.full; return; }
    dlg.i++; if (dlg.i >= dlg.lines.length) dialogEnd(); else dialogShow();
  }
  function dialogEnd() {
    clearInterval(dlg.typing); dlg.typing = null; $('ovDialog').hidden = true;
    const cb = dlg.cb; dlg.cb = null; if (cb) cb();
  }

  // ---------------- nhiem vu ----------------
  const ST_LABEL = { locked: '🔒 Chưa mở', available: 'Có thể nhận', active: 'Đang làm', ready: 'Hoàn thành!', done: 'Đã xong' };
  function rewardHtml(q) {
    const rw = q.reward || {}, u = U(); let h = '';
    const exp = (rw.exp || 0) + (rw.exp_lv || 0) * (u.level || 1);
    if (exp) h += '<span>' + icon('exp', 18) + exp + ' kinh nghiệm</span>';
    const gold = (rw.gold || 0) + (rw.gold_lv || 0) * (u.level || 1);
    if (gold) h += '<span>' + icon('gold', 18) + fmt(gold) + '</span>';
    if (rw.ingot) h += '<span>' + icon('nguyen_bao', 18) + rw.ingot + ' NB</span>';
    for (const k in (rw.items || {})) h += '<span>' + iconOf(k, 18) + rw.items[k] + ' ' + esc(itemName(k)) + '</span>';
    return '<div class="q-rw">' + h + '</div>';
  }
  function reqText(q) {
    const r = q.req || {}, t = [];
    if (r.stage) t.push('mở bản đồ ' + r.stage); if (r.level) t.push('cấp ' + r.level);
    if (r.prev) { const pq = QUESTS().find(x => x.id === r.prev); t.push('xong "' + (pq ? pq.name : r.prev) + '"'); }
    return t.length ? 'Yêu cầu: ' + t.join(', ') : '';
  }
  function questCard(q, withNpc) {
    const u = U(), st = B().questStatus(q, u), pr = Math.min(q.n, B().questProgress(q, u));
    const npc = NPCS().find(n => n.id === q.npc);
    let h = '<div class="quest q-' + st + '"><div class="q-head">' + icon('ui_quest', 22) + '<b>' + esc(q.name) + '</b><span class="q-st">' + ST_LABEL[st] + '</span></div>' +
      '<div class="q-desc">' + esc(q.desc) + (withNpc && npc ? ' <small>· người giao nhiệm vụ: ' + esc(npc.name) + ' (bản đồ ' + npc.stage + ')</small>' : '') + '</div>';
    if (st === 'active' || st === 'ready') h += '<div class="q-bar"><i style="width:' + Math.round(pr / q.n * 100) + '%"></i><span>' + pr + '/' + q.n + '</span></div>';
    if (st === 'locked') h += '<div class="sub">' + esc(reqText(q)) + '</div>';
    h += rewardHtml(q);
    if (st === 'available') h += '<button class="btn small green" type="button" data-qa="' + q.id + '">Nhận nhiệm vụ</button>';
    if (st === 'ready') h += '<button class="btn small" type="button" data-qc="' + q.id + '">🎁 Nhận thưởng</button>';
    return h + '</div>';
  }
  let npcCur = null;
  function npc(n) { npcCur = n; renderNpc(); show('ovNpc'); }
  function renderNpc() {
    const n = npcCur; if (!n) return;
    const qs = QUESTS().filter(q => q.npc === n.id);
    $('npcBox').innerHTML = '<div class="npc-head">' + icon('ui_talk', 44) + '<div><h2>' + esc(n.name) + '</h2><div class="sub">' + esc(n.title) + '</div></div><span class="grow"></span><button class="win-x" type="button" data-act="closenpc" title="Đóng">✕</button></div>' +
      '<p class="npc-greet">“' + esc(n.greet) + '”</p>' + (n.svc ? '<div class="row-btn"><button class="btn green big" type="button" data-npcsvc="' + n.svc + '">' + ({ map: '🗺️ Xem bản đồ - đi nơi khác', shop: '🛒 Mở tiệm mua bán', forge: '⚒️ Mở lò rèn · cường hóa' }[n.svc] || '') + '</button></div>' : '') + qs.map(q => questCard(q, false)).join('') +
      '<div class="row-btn"><button class="btn ghost" type="button" data-act="closenpc">Tạm biệt<span class="key-hint"> (F / Esc)</span></button></div>';
  }
  function closeNpc() { $('ovNpc').hidden = true; npcCur = null; Game.resume(); }
  async function questAct(kind, id) {
    const r = kind === 'accept' ? await B().questAccept(id) : await B().questClaim(id);
    const q = QUESTS().find(x => x.id === id);
    if (!r.ok) { toast(r.error, 'err'); return; }
    if (kind === 'accept') { toast('Đã nhận: ' + q.name, 'ok'); Game.log('Nhận nhiệm vụ: ' + q.name + ' - ' + q.desc); }
    else {
      const t = gainedText(r.gained || {});
      toast('🎁 ' + q.name + ': ' + t, 'ok'); Game.log('Hoàn thành ' + q.name + ', nhận ' + t);
      Game.rewardFx(r);
    }
    if (npcCur) renderNpc();
    if (activeTab === 'quest') renderQuests();
  }
  let qTab = 'main';
  const Q_TABS = [['main', '★ Chính tuyến'], ['daily', '◆ Hằng ngày'], ['side', 'NPC phụ tuyến']];
  function renderQuests() {
    const u = U(), all = QUESTS(), order = { ready: 0, active: 1, available: 2, locked: 3, done: 4 };
    const of = c => all.filter(q => (q.cat || (q.daily ? 'daily' : 'side')) === c);
    const cnt = c => of(c).filter(q => ['ready', 'available'].includes(B().questStatus(q, u))).length;
    let h = '<div class="subtabs">' + Q_TABS.map(([k, n]) => '<button type="button" class="subtab' + (k === qTab ? ' on' : '') + '" data-qtab="' + k + '">' + n + (cnt(k) ? ' <b class="qbadge">' + cnt(k) + '</b>' : '') + '</button>').join('') + '</div>';
    const list = of(qTab);
    if (qTab === 'main') {
      const cur = list.find(q => ['ready', 'active', 'available'].includes(B().questStatus(q, u)));
      const done = list.filter(q => B().questStatus(q, u) === 'done').length;
      h += '<div class="q-main-head"><b>Cốt truyện Ỷ Thiên Đồ Long Ký</b> · đã xong ' + done + '/' + list.length + ' chương<div class="xpbar"><i style="width:' + Math.round(done / Math.max(1, list.length) * 100) + '%"></i><span>' + done + ' / ' + list.length + '</span></div></div>';
      h += cur ? '<div class="q-cur">' + questCard(cur, true) + '</div>' : '<p class="ok">🎉 Đã hoàn thành toàn bộ chính tuyến!</p>';
      h += '<details class="q-all"><summary>Tất cả chương (' + list.length + ')</summary>' + list.map(q => questCard(q, true)).join('') + '</details>';
      h += '<p class="sub">Mỗi chương: vào bản đồ tương ứng, hạ quái cho Boss Bản Đồ xuất hiện rồi đánh bại nó, sau đó quay lại nhận thưởng. Chương 10 tặng cánh Bạch Hạc, chương 20 cánh Hồ Điệp, chương 30 cánh Hỏa Phượng.</p>';
    } else {
      const arr = list.slice().sort((a, b) => order[B().questStatus(a, u)] - order[B().questStatus(b, u)]);
      h += qTab === 'daily' ? '<p class="sub">Làm mới mỗi ngày · thưởng <b>ngân lượng + Nguyên Bảo</b> tăng theo cấp. Nhận trực tiếp ở đây, không cần gặp người giao nhiệm vụ.</p>' : '<p class="sub">Gặp người giao nhiệm vụ trong bản đồ (bấm <kbd>F</kbd> khi đứng gần) hoặc nhận trực tiếp ở đây.</p>';
      h += arr.map(q => questCard(q, true)).join('');
    }
    $('p-quest').innerHTML = h;
  }

  // ---------------- ban do the gioi ----------------
  function stars(n) { return '<span class="stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i></span>'; }
  let mapSel = 0, mapHover = 0, lastStage = 0;
  function mapCurrent() { const u = U(); return Game.inStage ? Game.stageIdx : (lastStage || u.stage_max || 1); }
  function showMap(sel) {
    const u = U(), max = u.stage_max || 1;
    $('mapSub').innerHTML = 'Cấp ' + (u.level || 1) + ' · Đã mở ' + max + '/' + STAGES.length + ' bản đồ · Chấm vàng: cốt truyện Tạ Tốn (1-10) · Chấm tím: giang hồ (11-30) · Hạ Boss Bản Đồ để mở bản đồ kế tiếp · Bấm vào địa danh để xem.';
    $('mapClose').hidden = false;
    $('mapGrid').innerHTML = STAGES.map(s => {
      const lock = s.idx > max, st = (u.stars || {})[String(s.idx)] || 0;
      return '<button type="button" class="stage-card' + (lock ? ' locked' : '') + (st ? ' done' : '') + '" data-stage="' + s.idx + '">' +
        '<span class="num">' + s.idx + '</span><b>' + esc(s.name) + '</b>' +
        '<small>' + (lock ? '🔒 Hạ Boss bản đồ ' + (s.idx - 1) + ' để mở' : 'Đề cử cấp ' + s.unlock_level) + '</small>' + (st ? stars(st) : '') + (s.idx > 10 ? '<span class="tag">Giang hồ</span>' : '') + '</button>';
    }).join('');
    mapSel = 0; $('mapDetail').hidden = true;
    show('ovMap'); Game.uiPause(true);
    mapSelect(sel || mapCurrent(), true);
  }
  function mapSelect(idx, quiet) {
    const s = STAGES.find(x => +x.idx === +idx); if (!s) return;
    const u = U();
    if (s.idx > (u.stage_max || 1)) { if (!quiet) { toast('Chưa mở bản đồ này - hạ Boss Bản Đồ ' + (s.idx - 1) + ' trước', 'err'); Game.Sfx.play('deny'); } return; }
    mapSel = s.idx; if (!quiet) Game.Sfx.play('click');
    const d = $('mapDetail'); d.hidden = false;
    const st = (u.stars || {})[String(s.idx)] || 0;
    d.innerHTML = '<h3>' + s.idx + '. ' + esc(s.name) + ' ' + (st ? stars(st) : '') + (s.idx === mapCurrent() ? ' <small class="here">📍 Bạn đang ở đây</small>' : '') + '</h3><p>' + esc(s.story) + '</p>' +
      '<p class="sub">Đề cử cấp <b>' + s.unlock_level + '</b> · Quái: <b>' + esc(s.mob_name) + '</b>, <b>' + esc(s.ranged_name || '') + '</b> · Tinh Anh: <b>' + esc(s.elite_name || '') + '</b> · Thủ Lĩnh: <b>' + esc((s.elite_name || s.boss_name)) + '</b> · Boss Bản Đồ: <b class="bossname">' + esc(s.boss_name) + '</b> (xuất hiện sau mỗi 60 quái bị hạ, thưởng ' + fmt(Math.round(s.boss_exp * 1.5)) + ' kinh nghiệm, ' + fmt(Math.round(s.boss_gold * 1.5)) + ' ngân lượng, Nguyên Bảo' + (s.idx < STAGES.length ? ', mở bản đồ ' + (s.idx + 1) : '') + ')</p>' +
      '<div class="row-btn"><button class="btn green big" type="button" data-go="map" data-stage="' + s.idx + '">⚔️ Vào bản đồ</button><button class="btn ghost" type="button" data-go="close">✕</button></div>';
  }
  function drawWorld(t) {
    const c = $('wmap'); if (!c || !window.WorldMap) return;
    const u = U();
    WorldMap.draw(c, { stages: STAGES, maxStage: u.stage_max || 1, current: mapCurrent(), stars: u.stars || {}, selected: mapSel, hover: mapHover, t });
  }

  // ---------------- vong lap ve UI (ban do + chan dung) - chi chay khi co overlay can ve ----------------
  let animOn = false;
  function needAnim() { return !$('ovMap').hidden || !$('ovSect').hidden || !$('ovHome').hidden || (!$('ovWin').hidden && activeTab === 'char'); }
  function kickAnim() { if (!animOn && needAnim()) { animOn = true; requestAnimationFrame(animLoop); } }
  let animLast = 0;
  function animLoop(ts) {
    if (!needAnim()) { animOn = false; return; }
    requestAnimationFrame(animLoop);
    if (ts - animLast < 33) return; animLast = ts; // ~30fps du muot cho UI
    const t = ts / 1000;
    if (!$('ovMap').hidden) drawWorld(t);
    document.querySelectorAll('canvas.portrait').forEach(cv => { if (cv.offsetParent) Game.drawPortrait(cv, cv.dataset.av, cv.dataset.col); });
  }

  function result(o) {
    const box = $('resultBox'); const s = o.stage;
    if (!o.win) {
      box.innerHTML = '<h2 class="lose">TRỌNG THƯƠNG</h2><p>Bạn ngã xuống... nhưng hào kiệt không bao giờ khuất phục!</p>' +
        '<div class="row-btn"><button class="btn green" type="button" data-r="revive">❤️ Hồi sinh tại chỗ</button><button class="btn red" type="button" data-r="map">🗺️ Về bản đồ</button></div>' +
        '<p class="sub">Hồi sinh ngay tại chỗ, không mất gì. Cường hóa trang bị (Lò rèn<span class="key-hint">, phím O</span>) và cộng điểm tiềm năng (Nhân vật<span class="key-hint">, phím C</span>) để mạnh hơn.</p>';
      show('ovResult');
    }
    renderAll();
  }
  function pause(on) { if (on) show('ovPause'); else $('ovPause').hidden = true; }

  // ---------------- cua so (phim tat) ----------------
  const WIN_KEYS = { KeyC: 'char', KeyB: 'bag', KeyN: 'quest', KeyH: 'shop', KeyO: 'forge', KeyU: 'farm', KeyG: 'guild', KeyK: 'pk', KeyI: 'rank', KeyV: 'social' };
  let activeTab = 'char';
  function setTab(t) {
    activeTab = t;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.t === t));
    document.querySelectorAll('.panel').forEach(x => x.classList.toggle('active', x.id === 'p-' + t));
    renderTab(t); kickAnim();
  }
  const blocked = () => !$('ovSect').hidden || ['ovDialog', 'ovResult', 'ovNpc', 'ovTrade'].some(id => !$(id).hidden);
  function openWin(t) {
    if (blocked()) return;
    $('ovMap').hidden = true; $('ovPause').hidden = true;
    $('ovWin').hidden = false; setTab(t); Game.uiPause(true); Game.Sfx.play('ui');
  }
  function closeWin() { if ($('ovWin').hidden) return; $('ovWin').hidden = true; Game.uiPause(false); }
  function toggleWin(t) { if (!$('ovWin').hidden && activeTab === t) closeWin(); else openWin(t); }
  function openMap() {
    if (blocked()) return;
    if (!$('ovMap').hidden) { closeMap(); return; }
    $('ovWin').hidden = true; $('ovPause').hidden = true; showMap(); Game.Sfx.play('ui');
  }
  function closeMap() { if (!Game.inStage) { showHome(); return; } $('ovMap').hidden = true; Game.uiPause(false); }

  // ---------------- tao nhan vat (nam/nu) · man hinh nhan vat · bai nhap mon phai (cap 25) ----------------
  let sectPick = null, avPick = 'samurai', sectFromGame = false;
  function portrait(av, color, w, h) { return '<canvas class="portrait" width="' + (w || 120) + '" height="' + (h || 150) + '" data-av="' + av + '" data-col="' + esc(color || '') + '"></canvas>'; }
  const AVD = () => B().AVDEF || {};
  const sectName = id => { const x = B().sectOf(id); return x ? x.name : id; };
  const counteredBy = id => B().SECTS.filter(x => (x.counters || []).includes(id)).map(x => x.id);
  const modTxt = (m, crit) => ['hp', 'mp', 'atk', 'def'].filter(k => m && m[k]).map(k => '<span class="' + (m[k] > 0 ? 'ok' : 'warn') + '">' + { hp: 'Máu', mp: 'Nội lực', atk: 'Công', def: 'Thủ' }[k] + ' ' + (m[k] > 0 ? '+' : '') + m[k] + '%</span>').concat(crit ? ['<span class="ok">Chí mạng +' + crit + '%</span>'] : []).join(' · ') || '<span class="sub">cân bằng</span>';
  const lv1 = (sect, av) => B().combat({ hp_max: 200, mp_max: 100, atk: 18, def: 6, sect, avatar: av, gear: { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 } });
  // Thanh chi so: so voi gia tri lon nhat trong nhom dang so sanh
  function statBars(c, M) {
    const L = [['hp', '❤️ Máu', '#e5484d'], ['mp', '💧 Nội lực', '#3a8aff'], ['atk', '⚔️ Công', '#ffb030'], ['def', '🛡️ Thủ', '#7ad07a'], ['crit', '💥 Chí mạng', '#c47cff']];
    return '<div class="sbars">' + L.map(([k, n, col]) => '<div class="sbar"><span>' + n + '</span><div><i style="width:' + Math.max(4, Math.round(c[k] / Math.max(1, M[k]) * 100)) + '%;background:' + col + '"></i></div><b>' + fmt(c[k]) + (k === 'crit' ? '%' : '') + '</b></div>').join('') + '</div>';
  }
  const maxOf = list => { const M = { hp: 1, mp: 1, atk: 1, def: 1, crit: 1 }; list.forEach(c => { for (const k in M) M[k] = Math.max(M[k], c[k]); }); return M; };
  function counterHtml(id) {
    const x = B().sectOf(id); if (!x) return '';
    const pct = (window.TATON_SECTS && window.TATON_SECTS.counterPct) || [20, 15];
    return '<div class="ctr"><div class="ctr-ok">⚔ <b>Khắc chế:</b> ' + (x.counters || []).map(c => '<span class="chip" style="--c:' + (B().sectOf(c) || {}).color + '">' + icon((B().sectOf(c) || {}).icon, 16) + esc(sectName(c)) + '</span>').join('') + ' <small>(+' + pct[0] + '% sát thương PK)</small></div>' +
      '<div class="ctr-bad">🛡 <b>Bị khắc bởi:</b> ' + counteredBy(id).map(c => '<span class="chip" style="--c:' + (B().sectOf(c) || {}).color + '">' + icon((B().sectOf(c) || {}).icon, 16) + esc(sectName(c)) + '</span>').join('') + ' <small>(-' + pct[1] + '% khi đánh phái này)</small></div></div>';
  }
  // 1) Nguoi moi: chon nhan vat nam / nu
  function showGender() {
    const c = AV_PICK.map(a => lv1('', a)), M = maxOf(c);
    $('homeBox').className = 'ov-box home-box gender-box';
    $('homeBox').innerHTML = '<h2>⚔️ Tạo Nhân Vật</h2><p class="sub">Chọn nhân vật của bạn. Đạt <b>cấp ' + SECT_LV() + '</b> sẽ được bái nhập 1 trong 16 đại môn phái và lĩnh ngộ tuyệt học môn phái.</p>' +
      '<div class="gender-grid">' + AV_PICK.map((a, i) => { const d = AVD()[a] || {}; return '<button type="button" class="g-card' + (a === avPick ? ' on' : '') + '" data-gpick="' + a + '">' +
        portrait(a, a === 'kunoichi' ? '#c0508a' : '#3a6ad0', 200, 244) + '<b>' + (d.sex === 'nữ' ? '♀ Nữ' : '♂ Nam') + ' · ' + esc(d.name || a) + '</b><small>' + esc(d.desc || '') + '</small><small>' + modTxt(d.mods, d.crit) + '</small>' + statBars(c[i], M) + '</button>'; }).join('') + '</div>' +
      '<button class="btn green big cc-ok" type="button" data-act="genderok">✔ Chọn ' + ((AVD()[avPick] || {}).sex === 'nữ' ? 'nhân vật Nữ' : 'nhân vật Nam') + ' và bắt đầu</button>' +
      '<p class="sub">Có thể đổi nhân vật sau ở bảng Nhân vật (tốn ' + fmt((window.TATON_SECTS || {}).avatarCost || 2000) + ' ngân lượng).</p>';
    show('ovHome');
  }
  // 2) Man hinh nhan vat (moi lan vao game): xem nhan vat + vao game
  function homeStage() {
    const u = U(), max = u.stage_max || 1;
    if (+u.jail) return +u.jail;
    let v = 0; try { v = +localStorage.getItem('tt_last_stage_' + u.id) || 0; } catch (_) { }
    return v >= 1 && v <= max ? v : max;
  }
  function saveStage(idx) { try { localStorage.setItem('tt_last_stage_' + U().id, String(idx)); } catch (_) { } }
  function showHome() {
    const u = U(); if (!u.avatar) { showGender(); return; }
    const sc = B().sectOf(u.sect), color = sc ? sc.color : NOSECT_COL, c = B().combat(u), lv = u.level || 1, st = STAGES.find(x => +x.idx === homeStage()) || STAGES[0];
    const L = SECT_LV();
    const sectBox = sc ? '<div class="home-sect" style="--c:' + sc.color + '">' + icon(sc.icon, 34) + '<div><b>' + esc(sc.name) + '</b><small>' + esc(sc.desc || '') + '</small></div></div>'
      : lv >= L ? '<div class="home-sect ready">⛩<div><b>Đã đủ cấp ' + L + '!</b><small>Bái nhập môn phái để mở tuyệt kỹ môn phái và nhận thêm chỉ số.</small></div><button class="btn" type="button" data-act="opensect">Bái nhập ngay</button></div>'
      : '<div class="home-sect"><span>🧭</span><div><b>Vô Môn Phái</b><small>Đạt cấp ' + L + ' để bái nhập môn phái (còn ' + (L - lv) + ' cấp)</small><div class="xpbar"><i style="width:' + Math.round(lv / L * 100) + '%"></i><span>Cấp ' + lv + ' / ' + L + '</span></div></div></div>';
    $('homeBox').className = 'ov-box home-box';
    $('homeBox').innerHTML = '<div class="home-wrap"><div class="home-left"><div class="cc-portrait" style="--c:' + color + '">' + portrait(u.avatar, color, 230, 280) +
      '<div class="cc-name"><b>' + esc(u.nickname) + '</b><small>Cấp ' + lv + ' · ' + ((AVD()[u.avatar] || {}).sex === 'nữ' ? '♀ Nữ' : '♂ Nam') + ' · ' + (sc ? icon(sc.icon, 16) + ' ' + esc(sc.name) : 'Vô Môn Phái') + '</small></div></div></div>' +
      '<div class="home-right"><h2>🐯 Tạ Tốn Truyền Kỳ</h2>' + '<div class="home-stats">' + [['❤️', 'Máu', c.hp], ['💧', 'Nội lực', c.mp], ['⚔️', 'Công', c.atk], ['🛡️', 'Thủ', c.def], ['💥', 'Chí mạng', c.crit + '%']].map(z => '<div><span>' + z[0] + '</span><small>' + z[1] + '</small><b>' + (typeof z[2] === 'number' ? fmt(z[2]) : z[2]) + '</b></div>').join('') + '</div>' + sectBox +
      '<div class="home-cur">' + GOLD(u.gold) + ' ' + INGOT(u.ingot) + ' <span>📍 ' + (st ? st.idx + '. ' + esc(st.name) : '') + '</span></div>' +
      '<button class="btn green big home-play" type="button" data-act="homeplay">⚔️ VÀO GAME</button>' +
      '<div class="row-btn"><button class="btn ghost" type="button" data-act="homemap">🗺️ Chọn bản đồ khác</button><a class="btn ghost" href="index.html?logout=1">🚪 Đăng xuất</a></div></div></div>';
    show('ovHome'); Game.uiPause(true);
  }
  // 3) Bai nhap mon phai (tu cap 25)
  function showSect() {
    const u = U(), list = B().SECTS; if (!sectPick || !B().sectOf(sectPick)) sectPick = list[0] && list[0].id;
    const x = B().sectOf(sectPick), av = u.avatar || 'samurai', L = SECT_LV(), ok = (u.level || 1) >= L && !u.sect;
    const me = id => B().combat(Object.assign({}, u, { sect: id })), c = me(sectPick), M = maxOf(list.map(z => me(z.id)));
    $('ccLeft').innerHTML = '<div class="cc-portrait" style="--c:' + x.color + '">' + portrait(av, x.color, 230, 280) + '<div class="cc-name"><b>' + esc(u.nickname) + '</b><small>' + icon(x.icon, 18) + ' ' + esc(x.name) + '</small></div></div>' +
      (ok ? '<button class="btn green big cc-ok" type="button" data-act="sectok">⛩ Bái nhập ' + esc(x.name) + '</button>' : '<p class="warn">' + (u.sect ? 'Bạn đã ở ' + esc(sectName(u.sect)) : 'Đạt cấp ' + L + ' để bái nhập (hiện cấp ' + (u.level || 1) + ')') + '</p>') +
      '<button class="btn ghost cc-later" type="button" data-act="sectlater">' + (ok ? 'Để sau' : 'Đóng') + '</button>';
    $('sectGrid').innerHTML = list.map(z => '<button type="button" class="sect-card' + (z.id === sectPick ? ' on' : '') + (x.counters.includes(z.id) ? ' beat' : '') + (counteredBy(x.id).includes(z.id) ? ' lose' : '') + '" data-sect="' + z.id + '" style="--c:' + z.color + '">' + icon(z.icon, 38) + '<b>' + esc(z.name) + '</b></button>').join('');
    $('sectDetail').innerHTML = '<h3>' + icon(x.icon, 34) + ' ' + esc(x.name) + '</h3><p class="sd-desc">' + esc(x.desc) + '</p>' +
      '<h4>Chỉ số của bạn sau khi bái nhập</h4>' + statBars(c, M) +
      '<p class="sub">Môn phái: ' + modTxt(x.mods) + '</p>' + counterHtml(x.id) +
      '<h4>Tuyệt học môn phái (mở tất cả khi bái nhập)</h4><div class="sect-sk">' + x.skills.map((k, i) => '<span>' + icon(k[2], 26) + '<b style="color:' + k[3] + '">' + (SKILL_KEYS[i] || '') + '</b> ' + esc(k[0]) + '</span>').join('') + '</div>' +
      '<small class="sub">Mỗi nhân vật chỉ bái nhập 1 môn phái.</small>';
    show('ovSect');
  }
  function openSect() {
    if (U().sect) { toast('Bạn đã ở ' + sectName(U().sect), 'ok'); return; }
    sectFromGame = Game.inStage; Game.uiPause(true); showSect();
  }
  function closeSect() {
    $('ovSect').hidden = true;
    if (sectFromGame && Game.inStage) Game.uiPause(false); else showHome();
    sectFromGame = false;
  }

  // ---------------- topbar ----------------
  function renderMe() {
    const u = U(), el = $('meInfo'); if (!el) return;
    const c = B().combat(u);
    el.innerHTML = '👤 <b>' + esc(u.nickname || 'Tạ Tốn') + '</b> Cấp ' + (u.level || 1) + ' · ' + GOLD(u.gold) + ' ' + INGOT(u.ingot) + ' · ⚔️' + c.atk + ' 🛡️' + c.def;
    $('btnAdmin').hidden = !u.is_admin;
  }
  function renderAudioBtns() {
    $('btnMusic').classList.toggle('off', !Game.Settings.music);
    $('btnSfx').classList.toggle('off', !Game.Settings.sfx);
  }

  // ---------------- trang bi: helper ----------------
  const ST_KEYS = ['atk', 'def', 'hp', 'mp', 'crit'];
  function stTxt(st) { const n = EQ().stats; return ST_KEYS.filter(k => st && st[k]).map(k => '+' + st[k] + ' ' + n[k]).join(' · ') || '-'; }
  const plusCls = p => p >= 15 ? 'pl5' : p >= 12 ? 'pl4' : p >= 9 ? 'pl3' : p >= 6 ? 'pl2' : p >= 3 ? 'pl1' : '';
  function eqName(e) { const d = B().itemOf(e.code); return '<b class="eqn ' + plusCls(e.plus | 0) + '">' + esc(d ? d.name : e.code) + (e.plus ? ' +' + e.plus : '') + '</b>'; }
  function sockets(e) {
    const st = B().parseStones(e.stones); let h = '';
    for (let i = 0; i < (e.holes | 0); i++) { const g = st[i]; h += g ? '<i class="sock on" style="--c:' + STONE_COLOR[g.t] + '" title="' + esc(itemName('st_' + g.t + '_' + g.lv)) + '">' + g.lv + '</i>' : '<i class="sock" title="Lỗ trống"></i>'; }
    return h ? '<span class="socks">' + h + '</span>' : '';
  }
  function eqCard(e, btns, extra) {
    const d = B().itemOf(e.code) || {}, u = U(), low = (u.level || 1) < (d.lv | 0);
    return '<div class="eq-card ' + tierCls(d.lv) + (e.equipped ? ' worn' : '') + '">' + '<span class="eq-ico">' + iconOf(e.code, 42) + (e.plus ? '<em>+' + e.plus + '</em>' : '') + '</span>' +
      '<div class="eq-info">' + eqName(e) + '<small>' + esc(EQ().slotName[d.slot] || '') + ' · <span class="' + (low ? 'warn' : '') + '">Cấp ' + (d.lv | 0) + '</span>' + (e.equipped ? ' · <span class="ok">Đang mặc</span>' : '') + '</small>' +
      '<small class="ok">' + stTxt(e.st) + '</small>' + sockets(e) + (extra ? '<small>' + extra + '</small>' : '') + '</div><div class="eq-btns">' + (btns || '') + '</div></div>';
  }
  const myEquips = () => (U().equips || []);
  const eqById = id => myEquips().find(e => +e.id === +id);

  // ---------------- C: Nhan vat ----------------
  function renderChar() {
    const u = U(), lv = u.level || 1, need = B().RULES.expNeed(lv), sc = B().sectOf(u.sect), md = (sc && sc.mods) || {};
    const g = u.gear || {}, c = B().combat(u), color = sc ? sc.color : '#c0392b', av = u.avatar || 'samurai';
    const base = { hp: u.hp_max | 0, mp: u.mp_max | 0, atk: u.atk | 0, def: u.def | 0, crit: 12 };
    const pa = k => u['pt_' + k] | 0, pot = { hp: 14 * pa('vit'), mp: 7 * pa('ene'), atk: 2 * pa('str'), def: Math.floor(1.5 * pa('dfn')), crit: Math.floor(pa('agi') / 4) };
    const pct = v => v ? '<span class="' + (v > 0 ? 'ok' : 'warn') + '">' + (v > 0 ? '+' : '') + v + '%</span>' : '-';
    const avd = AVD()[av] || {}, am = avd.mods || {};
    const row = (k, name) => '<tr><td>' + name + '</td><td>' + base[k] + '</td><td class="ok">' + (pot[k] ? '+' + pot[k] : '-') + '</td><td class="ok">' + (g[k] ? '+' + g[k] : '-') + '</td><td>' + (k === 'crit' ? '-' : pct(md[k] || 0)) + '</td><td>' + (k === 'crit' ? (avd.crit ? '<span class="ok">+' + avd.crit + '%</span>' : '-') : pct(am[k] || 0)) + '</td><td><b>' + c[k] + (k === 'crit' ? '%' : '') + '</b></td></tr>';
    const expPct = lv >= B().RULES.maxLevel ? 100 : Math.min(100, Math.round((u.exp || 0) / need * 100));
    let h = '<div class="char-v7"><div class="char-left">' +
      '<div class="char-portrait" style="--c:' + color + '">' + portrait(av, color, 170, 210) + '<div class="char-name"><b>' + esc(u.nickname) + '</b><small>' + (sc ? icon(sc.icon, 18) + ' ' + esc(sc.name) : 'Vô Môn Phái') + '</small></div></div>' +
      (sc ? '' : lv >= SECT_LV() ? '<button class="btn green" type="button" data-act="opensect" style="width:100%">⛩ Bái nhập môn phái</button>' : '<small class="sub av-note">Đạt cấp ' + SECT_LV() + ' để bái nhập môn phái (còn ' + (SECT_LV() - lv) + ' cấp)</small>') +
      '<div class="av-switch">' + AV_PICK.map(a => '<button type="button" class="btn small ' + (a === av ? '' : 'ghost') + '" data-avset="' + a + '" title="' + esc(((AVD()[a] || {}).desc || '')) + '">' + icon(AV_ICON[a], 18) + ' ' + AV_NAME[a].split(' (')[0] + '</button>').join('') + '</div>' +
      '<small class="sub av-note">' + modTxt(am, avd.crit) + '<br>Đổi tạo hình: ' + fmt((window.TATON_SECTS || {}).avatarCost || 2000) + ' ngân lượng</small>' +
      '<div class="lvbox"><b>Cấp ' + lv + '</b>' + (lv >= B().RULES.maxLevel ? ' <span class="ok">(tối đa)</span>' : '') + '<div class="xpbar"><i style="width:' + expPct + '%"></i><span>' + fmt(u.exp) + ' / ' + fmt(need) + ' kinh nghiệm</span></div></div>' +
      '<div class="curbox"><span>' + GOLD(u.gold) + ' ngân lượng</span><span>' + INGOT(u.ingot) + ' Nguyên Bảo</span></div></div>';
    h += '<div class="char-mid"><h4>' + icon('ui_stats', 20) + ' Chỉ số</h4><table class="tbl stat-tbl"><tr><th></th><th>Gốc</th><th>Tiềm năng</th><th>Trang bị</th><th>Môn phái</th><th>Tạo hình</th><th>Tổng</th></tr>' +
      row('hp', '❤️ Máu') + row('mp', '💧 Nội lực') + row('atk', '⚔️ Công') + row('def', '🛡️ Thủ') + row('crit', '💥 Chí mạng') + '</table>' +
      '<p class="sub">✨ Pháp thuật: +' + (c.mag | 0) + '% sát thương tuyệt học · 🌪️ Tốc chạy +' + (+c.spd || 0).toFixed(1) + '%</p>' +
      '<h4>' + icon('ui_stats', 20) + ' Điểm tiềm năng <span class="pts' + (u.pts ? ' has' : '') + '">' + (u.pts | 0) + ' điểm</span></h4><div class="attrs">' +
      B().RULES.attrs.map(a => '<div class="attr"><span class="a-ico">' + a.ico + '</span><div><b>' + a.name + ' <em>' + pa(a.k) + '</em></b><small>' + a.des + '</small></div>' +
        '<button class="btn small" type="button" data-stat="' + a.k + '" data-n="1"' + (u.pts ? '' : ' disabled') + '>+1</button><button class="btn small ghost" type="button" data-stat="' + a.k + '" data-n="5"' + (u.pts >= 5 ? '' : ' disabled') + '>+5</button><button class="btn small ghost" type="button" data-stat="' + a.k + '" data-n="' + (u.pts | 0) + '"' + (u.pts ? '' : ' disabled') + '>Hết</button></div>').join('') +
      '</div><p class="sub">Mỗi lần lên cấp nhận ' + B().RULES.ptsPerLv + ' điểm tiềm năng. <button class="btn small red" type="button" data-act="statreset">Tẩy điểm (' + B().RULES.resetCost + ' Nguyên Bảo)</button></p>' +
      '<p class="sub">Mỗi cấp: +' + B().RULES.perLevel.hp + ' máu, +' + B().RULES.perLevel.mp + ' nội lực, +' + B().RULES.perLevel.atk + ' công, +' + B().RULES.perLevel.def + ' thủ. Trang bị: cường hóa +' + EQ().enhance.pct + '% chỉ số gốc mỗi cấp, khảm đá sao cộng thêm.</p>' +
      (u.guild_name ? '<p>🏯 Bang: <b>' + esc(u.guild_name) + '</b></p>' : '') + (sc ? counterHtml(sc.id) : '') +
      '<p class="sub">PK: <b>' + ['Hòa bình', 'PK Bang', 'Đồ sát'][u.pk_mode | 0] + '</b> · Thân thiện <b>' + (u.friendly == null ? 100 : u.friendly) + '</b> · Khiêu khích <b class="' + ((u.provoke | 0) >= 100 ? 'warn' : '') + '">' + (u.provoke | 0) + '</b>' + (u.jail ? ' · <span class="warn">TRUY NÃ - kẹt bản đồ ' + u.jail + '</span>' : '') + '</p>' +
      '<h4>' + icon('sk_atk', 20) + ' Tuyệt học</h4><div class="skl">' + Game.SKILLS.map(s =>
        { const op = lv >= s.lv && !s.sectLock; return '<div class="' + (op ? '' : 'lock') + '">' + icon(s.icon, 26) + '<b>[' + s.key + '] ' + esc(s.name) + '</b> <small>' + (op ? (s.mp ? s.mp + ' nội lực · ' : '') + 'hồi ' + s.cd + 's' : s.sectLock ? '🔒 Cần môn phái (cấp ' + SECT_LV() + ')' : '🔒 Cấp ' + s.lv) + '</small><br><small>' + esc(s.des) + '</small></div>'; }).join('') + '</div></div>';
    const SG = [['weapon', '⚔️ Vũ khí'], ['cloth', '🥋 Quần áo'], ['acc', '💍 Trang sức hỗ trợ'], ['wing', '🕊️ Cánh']];
    h += '<div class="char-right"><h4>' + icon('ui_bag', 20) + ' Trang bị đang mặc</h4>' + SG.map(([g, title]) => '<h5 class="slot-h">' + title + '</h5><div class="slots">' + CAT_SLOTS[g].filter(sl => EQ().slots.includes(sl)).map(sl => {
      const e = myEquips().find(x => x.equipped && x.slot === sl);
      return '<div class="slot' + (e ? ' full' : '') + '"><span class="slot-name">' + esc(EQ().slotName[sl]) + '</span>' + (e ? '<span class="eq-ico">' + iconOf(e.code, 40) + (e.plus ? '<em>+' + e.plus + '</em>' : '') + '</span>' + eqName(e) + '<small class="ok">' + stTxt(e.st) + '</small>' + sockets(e) +
        '<div class="row-btn"><button class="btn small ghost" type="button" data-eq="unequip" data-id="' + e.id + '">Tháo</button><button class="btn small" type="button" data-forgeeq="' + e.id + '">Cường hóa</button></div>' : '<i class="empty">Trống</i><button class="btn small ghost" type="button" data-bagcat="' + g + '" data-gobag="1">Hành trang</button><button class="btn small" type="button" data-shopgo="' + g + '">🛒 Tiệm</button>') + '</div>';
    }).join('') + '</div>').join('') + '</div></div>';
    $('p-char').innerHTML = h;
  }

  // ---------------- B: Hanh trang ----------------
  // ---------------- Muc vat pham (dung chung Tiem / Hanh trang / Nhan vat) ----------------
  const CATS = [['weapon', '⚔️', 'Vũ khí'], ['cloth', '🥋', 'Quần áo'], ['acc', '💍', 'Trang sức hỗ trợ'], ['wing', '🕊️', 'Cánh'], ['potion', '🧪', 'Thuốc'], ['support', '✨', 'Bổ trợ'], ['mat', '🌾', 'Nguyên liệu']];
  const CAT_SLOTS = { weapon: ['weapon'], cloth: ['armor', 'helmet', 'boots'], acc: ['ring', 'amulet'], wing: ['wing'] };
  function catOf(it) {
    if (!it) return 'mat';
    if (it.type === 'equip') { for (const k in CAT_SLOTS) if (CAT_SLOTS[k].includes(it.slot)) return k; return 'acc'; }
    if (it.type === 'potion') return 'potion';
    if (it.type === 'up' || it.type === 'stone' || (it.type === 'mat' && it.code !== 'huyen_thiet')) return 'support';
    return 'mat';
  }
  const ST_NAME = { atk: 'Công', def: 'Thủ', hp: 'Máu', mp: 'Nội lực', crit: '% Chí mạng' };
  const stScore = st => ((st && st.atk) || 0) * 3 + ((st && st.def) || 0) * 2 + ((st && st.hp) || 0) * 0.25 + ((st && st.mp) || 0) * 0.15 + ((st && st.crit) || 0) * 12;
  const wornIn = slot => myEquips().find(e => e.equipped && e.slot === slot) || null;
  // so voi do dang mac cung o: "▲ +12 Công · +30 Máu" (xanh) hoac "▼ ..." (do)
  function cmpTxt(st, slot) {
    const w = wornIn(slot), ws = (w && w.st) || {};
    if (!w) return '<span class="cmp up">▲ Ô ' + esc(EQ().slotName[slot] || '') + ' đang trống</span>';
    const diff = ['atk', 'def', 'hp', 'mp', 'crit'].map(k => [k, ((st && st[k]) || 0) - (ws[k] || 0)]).filter(x => x[1]);
    if (!diff.length) return '<span class="cmp">= Bằng đồ đang mặc</span>';
    const up = stScore(st) >= stScore(ws);
    return '<span class="cmp ' + (up ? 'up' : 'down') + '">' + (up ? '▲ ' : '▼ ') + diff.map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + ST_NAME[k]).join(' · ') + ' <i>so với đồ đang mặc</i></span>';
  }
  const lvBadge = (lv, my) => '<span class="lvb' + (lv > my ? ' no' : '') + '">' + (lv > my ? '🔒 ' : '') + 'Cấp ' + lv + '</span>';
  const tierCls = lv => 't' + Math.min(6, Math.floor((lv || 1) / 17)); // mau vien theo bac cap

  // ---------------- B: Hanh trang ----------------
  let bagCat = 'all';
  function renderBag() {
    const u = U(), inv = u.inv || {}, X = EQ().exchange, my = u.level || 1;
    let h = '<div class="curbar">' + GOLD(u.gold) + '<span>Ngân lượng</span>' + INGOT(u.ingot) + '<span>Nguyên Bảo</span>' +
      '<span class="grow"></span><small>Đổi: 1 NB = ' + X + ' ngân</small><button class="btn small" type="button" data-eq="exchange" data-n="1">Đổi 1 NB</button><button class="btn small ghost" type="button" data-eq="exchange" data-n="10">Đổi 10 NB</button></div>';
    const eqs = myEquips().filter(e => !e.equipped).sort((a, b) => ((B().itemOf(b.code) || {}).lv - (B().itemOf(a.code) || {}).lv) || (b.plus - a.plus));
    const keys = Object.keys(inv).filter(k => inv[k] > 0 && B().itemOf(k));
    const order = { potion: 0, up: 1, stone: 2, mat: 3, crop: 4 };
    keys.sort((a, b) => (order[B().itemOf(a).type] - order[B().itemOf(b).type]) || ((B().itemOf(a).tier | 0) - (B().itemOf(b).tier | 0)) || a.localeCompare(b));
    const cnt = {}; eqs.forEach(e => { const c = catOf(B().itemOf(e.code)); cnt[c] = (cnt[c] || 0) + 1; }); keys.forEach(k => { const c = catOf(B().itemOf(k)); cnt[c] = (cnt[c] || 0) + 1; });
    h += '<div class="subtabs cat-tabs">' + [['all', '🎒', 'Tất cả']].concat(CATS).map(([k, ic, n]) => '<button class="subtab' + (k === bagCat ? ' on' : '') + '" type="button" data-bagcat="' + k + '">' + ic + ' ' + n + ' <small>' + (k === 'all' ? eqs.length + keys.length : (cnt[k] || 0)) + '</small></button>').join('') + '</div>';
    const eqCardB = e => {
      const d = B().itemOf(e.code) || {}, price = (d.sell | 0) + (e.plus | 0) * 100;
      return eqCard(e, '<button class="btn small green" type="button" data-eq="equip" data-id="' + e.id + '"' + ((d.lv | 0) > my ? ' disabled title="Chưa đủ cấp"' : '') + '>Trang bị</button><button class="btn small" type="button" data-forgeeq="' + e.id + '">Rèn</button>' +
        '<button class="btn small red" type="button" data-eq="sell" data-id="' + e.id + '" data-arm="1" title="Bán (đá sao được trả lại túi)">Bán ' + fmt(price) + '</button>', cmpTxt(e.st, d.slot));
    };
    const cell = k => {
      const it = B().itemOf(k), n = inv[k];
      let btn = '';
      if (it.type === 'up' && it.tier < EQ().upStone.max && n >= EQ().upStone.need) btn += '<button class="btn small" type="button" data-eq="merge" data-stone="' + k + '">Ghép 6→1</button>';
      if (it.type === 'stone' && it.tier < EQ().merge.maxTier && n >= EQ().merge.need) btn += '<button class="btn small" type="button" data-eq="merge" data-stone="' + k + '">Ghép</button>';
      if ((it.sell | 0) > 0) btn += '<button class="btn small ghost" type="button" data-sell="' + k + '" data-q="1">Bán 1</button>' + (n > 1 ? '<button class="btn small ghost" type="button" data-sell="' + k + '">Bán hết</button>' : '');
      return '<div class="inv-cell" title="' + esc(it.des || '') + '"><span class="eq-ico">' + iconOf(k, 38) + '<em>' + n + '</em>' + (it.type === 'up' ? '<u class="tier">' + it.tier + '</u>' : '') + '</span><b>' + esc(it.name) + '</b><small>' + esc(it.des || '') + (it.sell ? ' · bán ' + it.sell : '') + '</small><div class="row-btn">' + btn + '</div></div>';
    };
    const show = bagCat === 'all' ? CATS : CATS.filter(c => c[0] === bagCat);
    let any = false;
    show.forEach(([k, ic, n]) => {
      const es = eqs.filter(e => catOf(B().itemOf(e.code)) === k), ks = keys.filter(x => catOf(B().itemOf(x)) === k);
      if (!es.length && !ks.length) return; any = true;
      h += '<h4 class="cat-h">' + ic + ' ' + n + ' <small>(' + (es.length + ks.length) + ')</small></h4>';
      if (es.length) h += '<div class="eq-list">' + es.map(eqCardB).join('') + '</div>';
      if (ks.length) h += '<div class="inv-grid">' + ks.map(cell).join('') + '</div>';
    });
    if (!any) h += '<p class="sub"><i>Mục này đang trống. Mua ở Tiệm, rèn ở Lò rèn hoặc nhặt đồ quái rơi trên bản đồ.</i> <button class="btn small" type="button" data-shopgo="' + (bagCat === 'all' || bagCat === 'mat' ? 'weapon' : bagCat) + '">🛒 Tới Tiệm</button></p>';
    $('p-bag').innerHTML = h;
  }

  // ---------------- H: Tiem (theo muc + theo cap) ----------------
  let shopCat = 'weapon';
  const SUPPORT_GROUPS = [['up', 'Đá cường hóa (nâng cấp trang bị)'], ['stone', 'Đá sao (khảm vào lỗ trang bị)'], ['mat', 'Vật phẩm hỗ trợ']];
  function shopCard(i, my, inv, rec) {
    const stack = i.type !== 'equip', own = stack ? (inv[i.code] || 0) : myEquips().filter(e => e.code === i.code).length, lock = !stack && (i.lv | 0) > my;
    const buy = (cur, unit) => unit > 0 ? '<span class="buy-row">' + (cur === 'ingot' ? INGOT(unit) : GOLD(unit)) +
      '<button class="btn small" type="button" data-buy="' + i.code + '" data-q="1" data-cur="' + cur + '"' + (lock ? ' disabled' : '') + '>Mua</button>' +
      (stack ? '<button class="btn small ghost" type="button" data-buy="' + i.code + '" data-q="5" data-cur="' + cur + '">×5</button><button class="btn small ghost" type="button" data-buy="' + i.code + '" data-q="10" data-cur="' + cur + '">×10</button>' : '') + '</span>' : '';
    const info = i.type === 'equip'
      ? esc(EQ().slotName[i.slot]) + ' · ' + lvBadge(i.lv | 0, my) + (i.fly ? ' · bay ' + i.fly + 's' : '') + '<br><span class="ok">' + stTxt(i.st) + '</span><br>' + (lock ? '<span class="warn">Đạt cấp ' + i.lv + ' để mua và mặc</span>' : cmpTxt(i.st, i.slot))
      : esc(i.des || '');
    return '<div class="shop-item ' + (i.type === 'equip' ? tierCls(i.lv) : '') + (lock ? ' locked' : '') + (rec ? ' rec' : '') + '">' + (rec ? '<span class="rec-tag">★ Hợp cấp bạn</span>' : '') + iconOf(i.code, 44) +
      '<div><b>' + esc(i.name) + '</b>' + (own ? ' <small>(có ' + own + ')</small>' : '') + '<br><small>' + info + '</small><div>' + buy('gold', i.price | 0) + buy('ingot', i.ingot | 0) + '</div></div></div>';
  }
  function renderShop() {
    const u = U(), inv = u.inv || {}, my = u.level || 1, items = EQ().items.filter(i => i.type !== 'crop' && ((i.price | 0) > 0 || (i.ingot | 0) > 0));
    const cats = CATS.filter(c => c[0] !== 'mat'), count = k => items.filter(i => catOf(i) === k).length;
    if (!count(shopCat)) shopCat = 'weapon';
    let h = '<div class="curbar">' + GOLD(u.gold) + '<span>Ngân lượng</span>' + INGOT(u.ingot) + '<span>Nguyên Bảo</span><span class="grow"></span><small>Cấp của bạn: <b>' + my + '</b> · Nguyên Bảo kiếm từ boss, nhiệm vụ, qua màn lần đầu.</small></div>';
    h += '<div class="subtabs cat-tabs">' + cats.map(([k, ic, n]) => '<button class="subtab' + (k === shopCat ? ' on' : '') + '" type="button" data-shopcat="' + k + '">' + ic + ' ' + n + ' <small>' + count(k) + '</small></button>').join('') + '</div>';
    const list = items.filter(i => catOf(i) === shopCat).sort((a, b) => ((a.lv | 0) - (b.lv | 0)) || ((a.tier | 0) - (b.tier | 0)) || ((a.price | 0) - (b.price | 0)));
    if (CAT_SLOTS[shopCat]) {
      // de cu: bac cao nhat <= cap minh cua tung o
      const rec = {}; list.forEach(i => { if ((i.lv | 0) <= my && (!rec[i.slot] || (rec[i.slot].lv | 0) <= (i.lv | 0))) rec[i.slot] = i; });
      const br = lv => lv < 10 ? 0 : Math.floor(lv / 10) * 10, groups = {};
      list.forEach(i => { const b = br(i.lv | 0); (groups[b] = groups[b] || []).push(i); });
      const mine = br(my);
      Object.keys(groups).map(Number).sort((a, b) => a - b).forEach(b => {
        const g = groups[b], open = b === mine || b === mine + 10 || g.some(i => rec[i.slot] === i);
        h += '<details class="lv-group"' + (open ? ' open' : '') + '><summary>' + (b === 0 ? 'Cấp 1 – 9' : b >= 100 ? 'Cấp 100' : 'Cấp ' + b + ' – ' + (b + 9)) + ' <small>' + g.length + ' món' + (b === mine ? ' · <span class="ok">cấp của bạn</span>' : b > mine ? ' · 🔒 cấp cao hơn' : '') + '</small></summary><div class="shop-grid">' +
          g.map(i => shopCard(i, my, inv, rec[i.slot] === i)).join('') + '</div></details>';
      });
    } else if (shopCat === 'support') {
      SUPPORT_GROUPS.forEach(([t, title]) => { const g = list.filter(i => i.type === t); if (g.length) h += '<h4 class="cat-h">' + title + '</h4><div class="shop-grid">' + g.map(i => shopCard(i, my, inv, false)).join('') + '</div>'; });
    } else h += '<div class="shop-grid">' + list.map(i => shopCard(i, my, inv, false)).join('') + '</div>';
    h += '<p class="sub">Bán vật phẩm, nông sản ở Hành trang. Đồ cấp cao hơn bạn bị khóa, lên cấp để mở.</p>';
    $('p-shop').innerHTML = h;
  }

  // ---------------- O: Lo ren (ren / cuong hoa / duc sao / kham / ghep) ----------------
  let forgeSub = 'enh', forgeSel = 0, protect = false, recipes = null;
  const FORGE_TABS = [['enh', 'ui_enhance', 'Cường hóa'], ['hole', 'duc_sao', 'Đục sao'], ['inlay', 'st_atk', 'Khảm sao'], ['merge', 'st_crit', 'Ghép đá'], ['craft', 'ui_forge', 'Rèn đồ']];
  async function loadRecipes() {
    if (recipes) return recipes;
    const j = await B().forgeList(); if (j.ok) recipes = j.recipes;
    return recipes || [];
  }
  function renderForge() {
    const u = U(), inv = u.inv || {};
    let h = '<div class="subtabs">' + FORGE_TABS.map(t => '<button type="button" class="subtab' + (t[0] === forgeSub ? ' on' : '') + '" data-fsub="' + t[0] + '">' + icon(t[1], 20) + ' ' + t[2] + '</button>').join('') + '</div>';
    const ups = upStones(inv);
    h += '<div class="curbar small">' + GOLD(u.gold) + INGOT(u.ingot) + '<span>' + iconOf('cuong_1', 18) + (ups.length ? ups.map(k => 'C' + B().itemOf(k).tier + '×' + inv[k]).join(' ') : '0') + ' Đá cường hóa</span><span>' + iconOf('duc_sao', 18) + (inv.duc_sao | 0) + ' Đục Sao</span><span>' + iconOf('bua_ho', 18) + (inv.bua_ho | 0) + ' Bùa Hộ</span>' +
      '<span>' + iconOf('sat', 18) + (inv.sat | 0) + ' sắt</span><span>' + iconOf('go', 18) + (inv.go | 0) + ' gỗ</span></div>';
    if (forgeSub === 'merge') h += forgeMerge(inv);
    else if (forgeSub === 'craft') h += '<div id="craftBox"><i>Đang tải công thức...</i></div>';
    else {
      const so = EQ().slots, list = myEquips().slice().sort((a, b) => (b.equipped - a.equipped) || (so.indexOf(a.slot) - so.indexOf(b.slot)) || ((B().itemOf(b.code) || {}).lv - (B().itemOf(a.code) || {}).lv));
      if (!eqById(forgeSel)) forgeSel = list.length ? list[0].id : 0;
      h += '<div class="forge-split"><div class="forge-list">' + (list.length ? list.map(e => '<button type="button" class="fl-item' + (+e.id === +forgeSel ? ' on' : '') + '" data-fsel="' + e.id + '">' +
        '<span class="eq-ico">' + iconOf(e.code, 32) + (e.plus ? '<em>+' + e.plus + '</em>' : '') + '</span><span>' + eqName(e) + (e.equipped ? ' <small class="ok">●</small>' : '') + '<br>' + sockets(e) + '</span></button>').join('') : '<i>Chưa có trang bị</i>') + '</div>';
      const e = eqById(forgeSel);
      h += '<div class="forge-main" id="forgeMain">' + (e ? (forgeSub === 'enh' ? forgeEnh(e, u, inv) : forgeSub === 'hole' ? forgeHole(e, u, inv) : forgeInlay(e, u, inv)) : '<p class="sub">Chọn trang bị bên trái.</p>') + '</div></div>';
    }
    $('p-forge').innerHTML = h;
    if (forgeSub === 'craft') loadRecipes().then(renderCraft);
  }
  const need = (have, n, label) => '<span class="' + (have >= n ? 'ok' : 'warn') + '">' + label + ' ' + fmt(have) + '/' + fmt(n) + '</span>';
  const upStones = inv => Object.keys(inv).filter(k => inv[k] > 0 && (B().itemOf(k) || {}).type === 'up').sort((a, b) => B().itemOf(a).tier - B().itemOf(b).tier);
  function forgeEnh(e, u, inv) {
    const en = EQ().enhance, l = e.plus | 0, d = B().itemOf(e.code);
    let h = '<div class="fm-head">' + iconOf(e.code, 56) + '<div>' + eqName(e) + '<br><small class="ok">' + stTxt(e.st) + '</small></div></div>';
    if (l >= en.max) return h + '<p class="ok big">✨ Đã cường hóa tối đa +' + en.max + '!</p>';
    const next = B().equipStats(Object.assign({}, e, { plus: l + 1 }));
    const gold = en.gold[l], upc = en.stone + (l + 1), upi = B().itemOf(upc) || {}, rate = en.rate[l], risky = l >= en.dropFrom;
    h += '<div class="enh-arrow"><b class="eqn ' + plusCls(l) + '">+' + l + '</b> ➜ <b class="eqn ' + plusCls(l + 1) + '">+' + (l + 1) + '</b></div>' +
      '<p>Sau cường hóa: <span class="ok">' + stTxt(next) + '</span></p>' +
      '<div class="rate"><i style="width:' + rate + '%"></i><span>Tỉ lệ thành công ' + rate + '%</span></div>' +
      '<p>Chi phí: ' + need(u.gold | 0, gold, '💰') + ' · ' + iconOf(upc, 18) + need(inv[upc] | 0, 1, esc(upi.name || upc)) + '</p>' +
      ((inv[upc] | 0) < 1 ? '<p class="sub">' + esc(upi.des || '') + '</p>' : '') +
      (risky ? '<p class="warn">⚠ Từ +' + en.dropFrom + ': thất bại sẽ <b>tụt 1 cấp</b>. Dùng Bùa Hộ Mệnh để giữ cấp.</p>' : '<p class="sub">Dưới +' + en.dropFrom + ': thất bại không mất cấp.</p>') +
      (risky ? '<label class="chk"><input type="checkbox" id="chkProtect"' + (protect && (inv.bua_ho | 0) > 0 ? ' checked' : '') + ((inv.bua_ho | 0) < 1 ? ' disabled' : '') + '> Dùng ' + iconOf('bua_ho', 18) + ' Bùa Hộ Mệnh (có ' + (inv.bua_ho | 0) + ', mua bằng Nguyên Bảo ở Tiệm)</label>' : '') +
      '<div class="row-btn"><button class="btn green big" type="button" data-eq="enhance" data-id="' + e.id + '">' + icon('ui_enhance', 22) + ' CƯỜNG HÓA</button></div>' +
      '<p class="sub">' + esc(d ? d.name : '') + ': mỗi cấp +' + en.pct + '% chỉ số gốc. Đá Cường Hóa cấp N dùng để lên +N: quái mỗi bản đồ rơi 1 cấp đá (bản đồ càng xa đá càng cao), hoặc ghép 6 viên cấp dưới → 1 viên cấp trên ở tab Ghép đá.</p>';
    return h;
  }
  function forgeHole(e, u, inv) {
    const d = B().itemOf(e.code), hl = e.holes | 0, max = EQ().holes.max[d.slot] || 3;
    let h = '<div class="fm-head">' + iconOf(e.code, 56) + '<div>' + eqName(e) + '<br>' + (sockets(e) || '<small>Chưa có lỗ sao</small>') + '</div></div>' +
      '<p>Lỗ sao: <b>' + hl + ' / ' + max + '</b> (' + esc(EQ().slotName[d.slot]) + ' tối đa ' + max + ' lỗ)</p>';
    if (hl >= max) return h + '<p class="ok">Đã đục đủ lỗ sao. Sang tab Khảm sao để gắn đá.</p>';
    const gold = EQ().holes.gold[hl], tool = EQ().holes.tool[hl];
    return h + '<p>Đục lỗ thứ ' + (hl + 1) + ': ' + need(u.gold | 0, gold, '💰') + ' · ' + need(inv.duc_sao | 0, tool, 'Đục Sao Chùy') + '</p>' +
      '<div class="row-btn"><button class="btn green big" type="button" data-eq="punch" data-id="' + e.id + '">' + iconOf('duc_sao', 22) + ' ĐỤC LỖ SAO</button></div>' +
      '<p class="sub">Đục Sao Chùy mua ở Tiệm [H] (ngân lượng hoặc Nguyên Bảo). Đục lỗ luôn thành công.</p>';
  }
  function forgeInlay(e, u, inv) {
    const st = B().parseStones(e.stones), hl = e.holes | 0;
    let h = '<div class="fm-head">' + iconOf(e.code, 56) + '<div>' + eqName(e) + '<br><small class="ok">' + stTxt(e.st) + '</small></div></div>';
    if (!hl) return h + '<p class="warn">Trang bị chưa có lỗ sao. Sang tab <b>Đục sao</b> trước.</p>';
    h += '<div class="sock-row">';
    for (let i = 0; i < hl; i++) {
      const g = st[i];
      if (g) { const c = 'st_' + g.t + '_' + g.lv, it = B().itemOf(c); h += '<div class="sock-big on" style="--c:' + STONE_COLOR[g.t] + '">' + iconOf(c, 34) + '<small>' + esc(it ? it.name : c) + '</small><small class="ok">+' + (it ? it.val : 0) + ' ' + EQ().stats[g.t] + '</small><button class="btn small ghost" type="button" data-eq="unlay" data-id="' + e.id + '" data-slot="' + i + '">Tháo (' + fmt(EQ().unlayGoldPerTier * g.lv) + ')</button></div>'; }
      else h += '<div class="sock-big"><span class="hole"></span><small>Lỗ trống</small></div>';
    }
    h += '</div>';
    const stones = Object.keys(inv).filter(k => inv[k] > 0 && (B().itemOf(k) || {}).type === 'stone').sort();
    h += '<h4>Đá sao trong túi</h4>' + (stones.length ? '<div class="stone-list">' + stones.map(k => {
      const it = B().itemOf(k);
      return '<div class="stone-it" style="--c:' + STONE_COLOR[it.stone] + '">' + iconOf(k, 30) + '<span><b>' + esc(it.name) + '</b> ×' + inv[k] + '<br><small>+' + it.val + ' ' + EQ().stats[it.stone] + '</small></span><button class="btn small" type="button" data-eq="inlay" data-id="' + e.id + '" data-stone="' + k + '"' + (st.length >= hl ? ' disabled' : '') + '>Khảm</button></div>';
    }).join('') + '</div>' : '<p class="sub"><i>Chưa có đá sao. Đá 1★ rơi từ quái/Boss hoặc mua ở Tiệm.</i></p>');
    return h;
  }
  function forgeMerge(inv) {
    const M = EQ().merge, UP = EQ().upStone, stones = Object.keys(inv).filter(k => inv[k] > 0 && (B().itemOf(k) || {}).type === 'stone').sort(), ups = upStones(inv);
    let h = '<h4>' + iconOf('cuong_1', 20) + ' Đá Cường Hóa (cấp 1 - ' + UP.max + ')</h4><p class="sub">Ghép ' + UP.need + ' viên cùng cấp → 1 viên cấp cao hơn. Phí: ' + UP.goldPerTier + ' ngân × cấp.</p>';
    h += ups.length ? '<div class="stone-list">' + ups.map(k => {
      const it = B().itemOf(k), can = it.tier < UP.max && inv[k] >= UP.need;
      return '<div class="stone-it up" style="--c:#c8a050"><span class="eq-ico">' + iconOf(k, 30) + '<em>' + it.tier + '</em></span><span><b>' + esc(it.name) + '</b> ×' + inv[k] + '<br><small>' + (it.tier < UP.max ? 'Ghép → Cấp ' + (it.tier + 1) + ' (có thể ghép ' + Math.floor(inv[k] / UP.need) + ' lần)' : 'Cấp cao nhất') + '</small></span>' +
        (it.tier < UP.max ? '<button class="btn small' + (can ? ' green' : ' ghost') + '" type="button" data-eq="merge" data-stone="' + k + '">Ghép ' + UP.need + '→1 (' + fmt(UP.goldPerTier * it.tier) + ')</button>' : '') + '</div>';
    }).join('') + '</div>' : '<p><i>Chưa có Đá Cường Hóa - đánh quái để nhặt.</i></p>';
    h += '<h4>' + icon('st_crit', 20) + ' Đá sao (khảm)</h4><p class="sub">Ghép ' + M.need + ' viên đá cùng loại cùng bậc → 1 viên bậc cao hơn (tối đa ' + M.maxTier + '★). Phí: ' + M.goldPerTier + ' ngân × bậc.</p>';
    if (!stones.length) return h + '<p><i>Chưa có đá sao.</i></p>';
    return h + '<div class="stone-list">' + stones.map(k => {
      const it = B().itemOf(k), nx = B().itemOf('st_' + it.stone + '_' + (it.tier + 1)), can = it.tier < M.maxTier && inv[k] >= M.need;
      return '<div class="stone-it" style="--c:' + STONE_COLOR[it.stone] + '">' + iconOf(k, 30) + '<span><b>' + esc(it.name) + '</b> ×' + inv[k] + '<br><small>+' + it.val + ' ' + EQ().stats[it.stone] + (nx ? ' → ' + esc(nx.name) + ' (+' + nx.val + ')' : ' · bậc cao nhất') + '</small></span>' +
        (nx ? '<button class="btn small' + (can ? ' green' : ' ghost') + '" type="button" data-eq="merge" data-stone="' + k + '">Ghép ' + M.need + '→1 (' + fmt(M.goldPerTier * it.tier) + ')</button>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function renderCraft(list) {
    const box = $('craftBox'); if (!box || forgeSub !== 'craft') return;
    const u = U(), inv = u.inv || {};
    box.innerHTML = '<p class="sub">Sắt/gỗ rơi khi đánh quái, hạ Boss hoặc trồng ở Nông trại [U]. Đồ rèn ra là trang bị mới trong Hành trang.</p><div class="eq-list">' + (list || []).map(r => {
      const d = B().itemOf(r.weapon_code) || {}, can = (inv.sat || 0) >= +r.need_iron && (inv.go || 0) >= +r.need_wood && (u.gold | 0) >= +r.need_gold && (u.stage_max || 1) >= +r.req_stage;
      return '<div class="eq-card">' + '<span class="eq-ico">' + iconOf(r.weapon_code, 42) + '</span><div class="eq-info"><b>' + esc(d.name || r.weapon_name) + '</b><small>' + esc(EQ().slotName[d.slot] || '') + ' · Cấp ' + (d.lv | 0) + '</small><small class="ok">' + stTxt(d.st) + '</small>' +
        '<small>' + need(inv.sat | 0, +r.need_iron, 'Sắt') + ' · ' + need(inv.go | 0, +r.need_wood, 'Gỗ') + ' · ' + need(u.gold | 0, +r.need_gold, '💰') + (+r.req_stage > 1 ? ' · <span class="' + ((u.stage_max || 1) >= +r.req_stage ? 'ok' : 'warn') + '">mở màn ' + r.req_stage + '</span>' : '') + '</small></div>' +
        '<div class="eq-btns"><button class="btn small' + (can ? ' green' : ' ghost') + '" type="button" data-forge="' + esc(r.weapon_code) + '">🔥 Rèn</button></div></div>';
    }).join('') + '</div>';
  }

  // ---------------- U: Nong trai ----------------
  let farmData = null, farmAt = 0;
  async function loadFarm() {
    const j = await B().farmState();
    if (!j.ok) { $('p-farm').innerHTML = '<p class="warn">' + esc(j.error) + '</p>'; farmData = null; return; }
    farmData = j.plots; farmAt = Date.now(); drawFarm();
  }
  function drawFarm() {
    if (!farmData) return;
    const el = $('p-farm'); const passed = Math.floor((Date.now() - farmAt) / 1000);
    const C = B().RULES.crops;
    let h = '<p class="sub">Lúa 30s (3 bó) · Gỗ 60s (2 khúc) · Sắt 120s (2 quặng). Nông sản dùng để rèn hoặc bán ở Hành trang.</p><div class="farm">';
    farmData.forEach(p => {
      const remain = Math.max(0, (+p.remain || 0) - passed), ready = p.crop_code && (p.ready || remain <= 0);
      h += '<div class="plot' + (ready ? ' ready' : '') + '"><b>Ô ' + (p.slot + 1) + '</b>';
      if (!p.crop_code) h += '<span>🟫 Đất trống</span><div>' + Object.keys(C).map(c => '<button class="btn small ghost" type="button" data-plant="' + p.slot + '" data-crop="' + c + '" title="' + esc(itemName(c)) + '">' + iconOf(c, 20) + '</button>').join('') + '</div>';
      else if (ready) h += '<span>✅ ' + iconOf(p.crop_code, 20) + ' Chín rồi!</span><button class="btn small green" type="button" data-harvest="' + p.slot + '">Thu hoạch</button>';
      else h += '<span>🌱 ' + iconOf(p.crop_code, 20) + ' ' + esc(itemName(p.crop_code)) + '</span><span class="cd">⏳ ' + remain + 's</span>';
      h += '</div>';
    });
    el.innerHTML = h + '</div>';
  }
  // ---------------- G: Bang hoi ----------------
  async function renderGuild() {
    const el = $('p-guild');
    const m = await B().req('api/social.php?action=guild_my'); if (!m.ok) { el.innerHTML = '<p class="warn">' + esc(m.error) + '</p>'; return; }
    let h = '';
    if (!m.guild) {
      const l = await B().req('api/social.php?action=guild_list');
      h += '<h4>Lập bang mới (200 ngân lượng)</h4><div class="row-btn"><input id="gname" placeholder="Tên bang (3-30 ký tự)" maxlength="30"><button class="btn small green" type="button" data-act="mkguild">Lập bang</button></div>' +
        '<div class="emb-pick">' + EMBLEMS.map(e => '<button type="button" class="emb' + (e === pickEm ? ' on' : '') + '" data-em="' + e + '">' + icon(e, 40) + '</button>').join('') + '</div><h4>Các bang hội</h4>';
      (l.guilds || []).forEach(g => { h += '<div class="li guild-li">' + icon(g.emblem || 'em_lion', 36) + '<div><b>' + esc(g.name) + '</b><br><small>' + (g.total || 0) + ' thành viên · Bang chủ ' + esc(g.master_name || '?') + (g.notice ? ' · ' + esc(g.notice) : '') + '</small></div><button class="btn small blue" type="button" data-join="' + (+g.id) + '">Gia nhập</button></div>'; });
      if (!(l.guilds || []).length) h += '<i>Chưa có bang nào - hãy lập bang đầu tiên!</i>';
    } else {
      const master = m.guild.role === 'master';
      h += '<div class="guild-li">' + icon(m.guild.emblem || 'em_lion', 64) + '<div><h3>' + esc(m.guild.name) + '</h3><small>' + m.members.length + ' thành viên · chức vụ: ' + (master ? 'Bang chủ' : 'Bang chúng') + '</small></div></div>' +
        '<p class="notice">📢 ' + (m.guild.notice ? esc(m.guild.notice) : '<i>Chưa có thông báo</i>') + '</p>' +
        (master ? '<div class="row-btn"><input id="gnotice" maxlength="200" placeholder="Thông báo bang mới" value="' + esc(m.guild.notice || '') + '"><button class="btn small" type="button" data-act="gnotice">Lưu</button></div>' : '') +
        '<table class="tbl"><tr><th>Thành viên</th><th>Cấp</th><th></th></tr>' + m.members.map(x => '<tr><td>' + (x.role === 'master' ? icon('ui_crown', 18) + ' ' : '') + esc(x.nickname) + '</td><td>' + (+x.level) + '</td><td>' +
          (master && x.role !== 'master' ? '<button class="btn small red" type="button" data-kick="' + (+x.id) + '">Trục xuất</button>' : '') + '</td></tr>').join('') + '</table>' +
        '<p class="sub">Chat kênh <b>Bang</b> ở khung trò chuyện<span class="key-hint"> (phím Enter)</span>.</p><button class="btn small red" type="button" data-act="leaveguild">Rời bang</button>';
    }
    el.innerHTML = h;
  }
  // ---------------- K: PK ----------------
  const PK_NAMES = [['☮', 'Hòa bình', 'Không đánh người, không bị mất điểm.'], ['⚔', 'PK Bang', 'Đánh được người khác bang (không đánh người cùng bang).'], ['☠', 'Đồ sát', 'Đánh được tất cả mọi người.']];
  async function renderPK() {
    const el = $('p-pk');
    const u = U(), mode = u.pk_mode | 0, prov = u.provoke | 0;
    const j = await B().req('api/pk.php?action=online_players');
    let h = '<div class="pk-modes">' + PK_NAMES.map((m, i) => '<button type="button" class="pk-mode' + (i === mode ? ' on' : '') + ' m' + i + '" data-pkm="' + i + '"><b>' + m[0] + ' ' + m[1] + '</b><small>' + m[2] + '</small></button>').join('') + '</div>' +
      '<div class="pk-stat"><span>Thân thiện: <b class="' + ((u.friendly | 0) < 0 ? 'warn' : 'ok') + '">' + (u.friendly == null ? 100 : u.friendly) + '</b></span><span>Khiêu khích: <b class="' + (prov >= 100 ? 'warn' : '') + '">' + prov + '</b> / 100</span>' +
      '<div class="xpbar prov"><i style="width:' + Math.min(100, prov) + '%"></i><span>' + (prov >= 100 ? 'TRUY NÃ - kẹt tại bản đồ ' + u.jail : 'Giảm 1 điểm mỗi phút') + '</span></div>' +
      '<button class="btn small" type="button" data-act="cleanse"' + (prov <= 0 ? ' disabled' : '') + '>' + iconOf('thanh_tam', 18) + ' Thanh Tâm Đan (có ' + ((u.inv || {}).thanh_tam | 0) + ', -50)</button></div>' +
      '<p class="sub">Luật: đánh người <b>lương thiện</b> (Hòa bình, khiêu khích &lt; 50) → <span class="warn">thiện -2, khiêu khích +4 mỗi đòn; giết: thiện -15, khiêu khích +30</span>. Khiêu khích ≥ 100 → <b class="warn">TRUY NÃ</b>: tên đỏ, kẹt ở bản đồ hiện tại (không qua cổng, không vào bản đồ khác). ' +
      'Giết kẻ truy nã: +100 ngân lượng, thiện +10. Hai bên cùng bật PK: thắng +50 ngân lượng, không mất điểm. Diệt quái hồi điểm thân thiện. Tân thủ dưới Cấp 10 được bảo vệ. Môn phái khắc chế: +20% / -15% sát thương.</p>';
    const ps = (j && j.players) || [], my = u.sect;
    h += '<h4>Người chơi trực tuyến</h4>' + (ps.length ? ps.map(p => {
      const pv = +p.provoke || 0, col = pv >= 100 ? 'warn' : pv >= 50 ? 'orange' : +p.pk_mode ? 'purple' : '', k = B().counterMult(my, p.sect);
      return '<div class="li">' + (B().sectOf(p.sect) ? icon(B().sectOf(p.sect).icon, 18) : '🧍') + ' <b class="' + col + '">' + esc(p.nickname) + '</b> Cấp ' + (+p.level || 1) + ' · màn ' + (+p.map_stage) + (pv >= 100 ? ' <span class="warn">[TRUY NÃ]</span>' : +p.pk_mode ? ' <span class="purple">[PK]</span>' : '') +
        (k > 1 ? ' <span class="ok">(bạn khắc chế)</span>' : k < 1 ? ' <span class="warn">(khắc chế bạn)</span>' : '') +
        ' <button class="btn small red" type="button" data-pk="' + (+p.user_id) + '">Thách đấu</button> <button class="btn small ghost" type="button" data-pm="' + (+p.user_id) + '">Nhắn</button></div>';
    }).join('') : '<i>Chưa có ai trực tuyến.</i>');
    const his = await B().req('api/pk.php?action=history');
    if (his.ok && (his.logs || []).length) h += '<h4>Lịch sử</h4>' + his.logs.map(l => '<div class="li small-text">' + esc(l.c_name || l.challenger_id) + ' đấu với ' + esc(l.d_name || l.defender_id) + ' → ' + (+l.winner_id === +U().id ? '<span class="ok">Thắng</span>' : '<span class="warn">Thua</span>') + '</div>').join('');
    el.innerHTML = h;
  }
  // ---------------- I: BXH ----------------
  async function renderRank() {
    const el = $('p-rank');
    const j = await B().req('api/social.php?action=rank'); if (!j.ok) { el.innerHTML = '<p class="warn">' + esc(j.error) + '</p>'; return; }
    el.innerHTML = '<table class="tbl"><tr><th>#</th><th>Tên</th><th>Cấp</th><th>Bản đồ</th></tr>' + j.rank.map((u, i) => '<tr' + (+u.id === +U().id ? ' class="me"' : '') + '><td>' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</td><td>' + esc(u.nickname) + '</td><td>' + (+u.level) + '</td><td>' + (+u.stage_max) + '</td></tr>').join('') + '</table>';
  }
  // ---------------- V: Ban be · Giao dich · Thach dau ----------------
  const FR = (action, data) => data ? B().req('api/friend.php', Object.assign({ action }, data)) : B().req('api/friend.php?action=' + action);
  let duelResult = null;
  async function renderSocial() {
    const el = $('p-social');
    const [of, fr, on] = await Promise.all([FR('offers'), FR('friends'), B().req('api/pk.php?action=online_players')]);
    const nm = (id, n) => '<a class="plink" data-pmenu="' + (+id) + '" data-name="' + esc(n) + '">' + esc(n) + '</a>';
    let h = '';
    if (duelResult) {
      const r = duelResult;
      h += '<div class="duel-res ' + (r.win ? 'win' : 'lose') + '"><h3>' + (r.win ? '🏆 Bạn thắng thách đấu!' : '💀 Bạn thua thách đấu') + (r.stake ? ' (' + (r.win ? '+' : '-') + fmt(r.stake) + ' ngân lượng)' : '') + '</h3><div class="duel-log">' + r.log.map(esc).join('<br>') + '</div><button class="btn small ghost" type="button" data-act="duelclose">Đóng</button></div>';
    }
    const offers = (of && of.offers) || [];
    h += '<h4>🔔 Lời mời đang chờ (' + offers.length + ')</h4>' + (offers.length ? offers.map(o => {
      const who = o.incoming ? nm(o.from, o.from_name) : nm(o.to, o.to_name);
      const body = o.kind === 'duel' ? (o.incoming ? who + ' thách đấu bạn' : 'Bạn thách đấu ' + who) + (o.stake ? ' · cược <b>' + fmt(o.stake) + '</b> ngân lượng' : '')
        : (o.incoming ? who + ' đưa: <b class="ok">' + esc(o.give) + '</b> · đổi lấy của bạn: <b class="warn">' + esc(o.ask) + '</b>' : 'Bạn đưa ' + who + ': <b>' + esc(o.give) + '</b> · đổi lấy: <b>' + esc(o.ask) + '</b>');
      const btn = o.incoming ? '<button class="btn small green" type="button" data-offacc="' + o.id + '" data-kind="' + o.kind + '">' + (o.kind === 'duel' ? '⚔ Nhận đấu' : '✔ Đồng ý') + '</button><button class="btn small red" type="button" data-offdec="' + o.id + '">Từ chối</button>'
        : '<button class="btn small ghost" type="button" data-offcan="' + o.id + '">Hủy</button>';
      return '<div class="li offer ' + o.kind + '">' + (o.kind === 'duel' ? '⚔️ ' : '🤝 ') + body + '<span class="grow"></span>' + btn + '</div>';
    }).join('') : '<p class="sub"><i>Không có lời mời. Bấm vào nhân vật người chơi khác trên bản đồ (hoặc tên trong danh sách) để giao dịch, thách đấu, kết bạn, trò chuyện riêng.</i></p>');
    const fl = (fr && fr.friends) || [];
    const acc = fl.filter(f => f.status === 1), inc = fl.filter(f => f.status === 0 && !f.mine), sent = fl.filter(f => f.status === 0 && f.mine);
    h += '<h4>👥 Bạn bè (' + acc.length + ')</h4>';
    if (inc.length) h += inc.map(f => '<div class="li">➕ ' + nm(f.id, f.nickname) + ' Cấp ' + f.level + ' muốn kết bạn <span class="grow"></span><button class="btn small green" type="button" data-fracc="' + f.id + '">Đồng ý</button><button class="btn small ghost" type="button" data-frrm="' + f.id + '">Từ chối</button></div>').join('');
    h += acc.length ? acc.map(f => '<div class="li">' + (f.map ? '<span class="dot on"></span>' : '<span class="dot"></span>') + (B().sectOf(f.sect) ? icon(B().sectOf(f.sect).icon, 18) : '') + ' ' + nm(f.id, f.nickname) + ' Cấp ' + f.level + ' <small class="sub">' + (f.map ? 'online · bản đồ ' + f.map : 'offline') + '</small><span class="grow"></span>' +
      '<button class="btn small" type="button" data-pm="' + f.id + '" data-name="' + esc(f.nickname) + '">💬</button><button class="btn small" type="button" data-trade="' + f.id + '" data-name="' + esc(f.nickname) + '">🤝</button><button class="btn small" type="button" data-pmenu="' + f.id + '" data-name="' + esc(f.nickname) + '">⋯</button><button class="btn small ghost" type="button" data-frrm="' + f.id + '" title="Xóa bạn">✕</button></div>').join('') : '<p class="sub"><i>Chưa có bạn bè.</i></p>';
    if (sent.length) h += '<p class="sub">Đã gửi lời mời: ' + sent.map(f => esc(f.nickname) + ' <a class="plink" data-frrm="' + f.id + '">(hủy)</a>').join(', ') + '</p>';
    const ps = ((on && on.players) || []);
    h += '<h4>🌐 Người chơi đang trực tuyến (' + ps.length + ')</h4>' + (ps.length ? '<div class="on-grid">' + ps.map(p => '<button type="button" class="on-p" data-pmenu="' + (+p.user_id) + '" data-name="' + esc(p.nickname) + '">' + (B().sectOf(p.sect) ? icon(B().sectOf(p.sect).icon, 18) : '🧍') + ' <b>' + esc(p.nickname) + '</b> <small>Cấp ' + (+p.level || 1) + ' · bản đồ ' + (+p.map_stage) + '</small></button>').join('') + '</div>' : '<p class="sub"><i>Chưa có ai trực tuyến.</i></p>');
    el.innerHTML = h;
  }

  // menu khi bam vao 1 nguoi choi
  let menuId = 0, menuAt = 0;
  // Hien menu NGAY bang thong tin co san (ban do chung), ho so day du tu may chu cap nhat sau
  async function playerMenu(id, name, cx, cy) {
    id = +id; if (!id || id === +U().id) return;
    const m = $('pmenu'), wrap = $('stageWrap').getBoundingClientRect();
    menuId = id; menuAt = Date.now();
    const mi = (window.RT && RT.members && RT.members[id]) || {};
    const draw = p => {
      const sc = B().sectOf(p.sect), k = p.counter == null ? B().counterMult(U().sect, p.sect) : +p.counter;
      const fbtn = p.rel === 'friend' ? '<button type="button" data-pmact="unfriend">✕ Hủy kết bạn</button>' : p.rel === 'sent' ? '<button type="button" disabled>⏳ Đã gửi lời mời kết bạn</button>' : p.rel === 'incoming' ? '<button type="button" data-pmact="friend">✔ Đồng ý kết bạn</button>' : '<button type="button" data-pmact="friend">➕ Kết bạn</button>';
      const st = p.online == null ? '<span class="ok">● cùng bản đồ</span>' : p.online ? '<span class="ok">● trực tuyến · bản đồ ' + p.online + '</span>' : '<span class="sub">● ngoại tuyến</span>';
      m.innerHTML = '<div class="pm-head">' + (sc ? icon(sc.icon, 28) : '') + '<div><b>' + esc(p.nickname) + '</b><small>Cấp ' + (p.level || 1) + (sc ? ' · ' + esc(sc.name) : '') + (p.guild ? ' · 🏯 ' + esc(p.guild) : '') + '</small>' +
        '<small>' + st + (p.provoke >= 100 ? ' <span class="warn">[TRUY NÃ]</span>' : p.pk_mode ? ' <span class="purple">[PK]</span>' : '') + (k > 1 ? ' <span class="ok">· bạn khắc chế</span>' : k < 1 ? ' <span class="warn">· khắc chế bạn</span>' : '') + '</small></div><button type="button" class="pm-x" data-pmact="close">✕</button></div>' +
        '<button type="button" data-pmact="chat">💬 Trò chuyện riêng</button><button type="button" data-pmact="trade">🤝 Giao dịch tiền / đồ</button>' +
        '<div class="pm-duel"><button type="button" data-pmact="duel">⚔️ Thách đấu</button><input id="duelStake" type="number" min="0" max="100000" step="100" value="' + (($('duelStake') || {}).value || 0) + '" title="Cược ngân lượng (0 = đấu giao hữu)"><small>cược</small></div>' + fbtn;
      m.dataset.name = p.nickname;
    };
    draw({ nickname: name || mi.name || 'Người chơi', level: mi.lv, sect: mi.sect, rel: 'none' });
    m.hidden = false;
    const x = (cx == null ? wrap.left + wrap.width / 2 : cx) - wrap.left, y = (cy == null ? wrap.top + wrap.height / 3 : cy) - wrap.top;
    m.style.left = Math.max(6, Math.min(wrap.width - 236, x + 8)) + 'px'; m.style.top = Math.max(6, Math.min(wrap.height - 290, y - 20)) + 'px';
    const j = await FR('profile&target_id=' + id);
    if (menuId !== id || m.hidden) return;
    if (j.ok) draw(j.p);
  }
  function closeMenu(soft) { if (soft && Date.now() - menuAt < 400) return; const m = $('pmenu'); if (m) m.hidden = true; menuId = 0; }

  // ---- giao dich ----
  let tradeTo = null;
  function openTrade(id, name) {
    closeMenu(); tradeTo = { id: +id, name: name || ('#' + id) };
    const u = U(), inv = u.inv || {}, TK = { potion: 1, mat: 1, stone: 1, up: 1, crop: 1 };
    const items = Object.keys(inv).filter(k => inv[k] > 0 && B().itemOf(k) && TK[B().itemOf(k).type]);
    const eqs = myEquips().filter(e => !e.equipped);
    $('tradeBox').innerHTML = '<button class="win-x" type="button" data-act="tradeclose">✕</button><h2>🤝 Giao dịch với ' + esc(tradeTo.name) + '</h2>' +
      '<p class="sub">Chọn thứ bạn ĐƯA và thứ bạn muốn NHẬN lại. Đối phương đồng ý thì máy chủ chuyển cùng lúc cho cả hai (an toàn, không mất đồ). Lời mời hết hạn sau 10 phút.</p>' +
      '<div class="trade-grid"><div class="tr-col"><h4>Bạn đưa</h4><label>' + icon('gold', 18) + ' Ngân lượng <input id="trGold" type="number" min="0" max="' + (u.gold | 0) + '" value="0"></label><label>' + icon('nguyen_bao', 18) + ' Nguyên Bảo <input id="trIngot" type="number" min="0" max="' + (u.ingot | 0) + '" value="0"></label>' +
      '<div class="tr-list">' + (items.length ? items.map(k => '<label class="tr-it">' + iconOf(k, 26) + '<span>' + esc(itemName(k)) + ' <small>(có ' + inv[k] + ')</small></span><input type="number" min="0" max="' + inv[k] + '" value="0" data-tritem="' + k + '"></label>').join('') : '<i class="sub">Không có vật phẩm</i>') + '</div>' +
      '<div class="tr-list">' + (eqs.length ? eqs.map(e => '<label class="tr-it"><input type="checkbox" data-treq="' + e.id + '">' + iconOf(e.code, 26) + '<span>' + eqName(e) + ' <small>' + stTxt(e.st) + '</small></span></label>').join('') : '<i class="sub">Không có trang bị dư (trang bị đang mặc không giao dịch được)</i>') + '</div></div>' +
      '<div class="tr-col"><h4>Bạn nhận lại</h4><label>' + icon('gold', 18) + ' Ngân lượng <input id="trAskGold" type="number" min="0" value="0"></label><label>' + icon('nguyen_bao', 18) + ' Nguyên Bảo <input id="trAskIngot" type="number" min="0" value="0"></label>' +
      '<p class="sub">Để 0 nếu là tặng quà.</p><button class="btn green big" type="button" data-act="tradesend">📨 Gửi đề nghị giao dịch</button></div></div>';
    show('ovTrade'); Game.uiPause(true);
  }
  function closeTrade() { if ($('ovTrade').hidden) return; $('ovTrade').hidden = true; tradeTo = null; Game.uiPause(false); }
  async function sendTrade() {
    if (!tradeTo) return;
    const items = {}; document.querySelectorAll('[data-tritem]').forEach(i => { const n = Math.floor(+i.value || 0); if (n > 0) items[i.dataset.tritem] = Math.min(n, +i.max); });
    const equips = Array.from(document.querySelectorAll('[data-treq]:checked')).map(i => i.dataset.treq).join(',');
    const v = id => Math.max(0, Math.floor(+$(id).value || 0));
    const r = await FR('trade_offer', { target_id: tradeTo.id, gold: v('trGold'), ingot: v('trIngot'), ask_gold: v('trAskGold'), ask_ingot: v('trAskIngot'), items: JSON.stringify(items), equips });
    if (!r.ok) { toast(r.error, 'err'); Game.Sfx.play('deny'); return; }
    toast('Đã gửi đề nghị giao dịch tới ' + tradeTo.name, 'ok'); Game.Sfx.play('coin'); closeTrade();
  }

  // ---- tin nhan rieng noi bat o tren man hinh + huy hieu ----
  let pmUnread = 0, socialBadge = 0;
  function pmShow(pm) {
    const bar = $('pmBar'); if (!bar) return;
    const d = document.createElement('div'); d.className = 'pm-card';
    d.innerHTML = '<b>✉ ' + esc(pm.name) + '</b><span>' + esc(pm.text) + '</span><button type="button" class="btn small" data-pm="' + pm.from + '" data-name="' + esc(pm.name) + '">Trả lời</button><button type="button" class="pm-x" data-act="pmclose">✕</button>';
    bar.prepend(d); while (bar.children.length > 3) bar.lastChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 12000);
    Game.Sfx.play('ui');
    if (!(chatScope === 'private' && +$('chatTo').value === pm.from)) { pmUnread++; addChat('[Riêng] ' + pm.name, pm.text, false, true); }
    Game.showBubble(pm.from, '✉ ' + pm.text);
    updateBadges();
  }
  function updateBadges() {
    const c = document.querySelector('[data-c="private"]'); if (c) c.textContent = 'Riêng' + (pmUnread ? ' (' + pmUnread + ')' : '');
    if (c) c.classList.toggle('blink', pmUnread > 0);
    const hb = document.querySelector('#hotbar [data-win="social"]'); if (hb) { let b = hb.querySelector('.badge'); if (!b) { b = document.createElement('span'); b.className = 'badge'; hb.appendChild(b); } b.textContent = socialBadge; b.hidden = !socialBadge; }
  }
  // Loi moi giao dich / thach dau gui toi minh: bat the ngay tren man hinh (Dong y / Tu choi), khong can mo bang Ban be
  const offerSeen = {};
  let offerBusy = false;
  async function checkOffers() {
    if (offerBusy) return; offerBusy = true;
    try { const j = await FR('offers'); if (j && j.ok) (j.offers || []).filter(o => o.incoming && !offerSeen[o.id]).forEach(o => { offerSeen[o.id] = 1; offerShow(o); }); }
    finally { offerBusy = false; }
  }
  function offerShow(o) {
    const bar = $('pmBar'); if (!bar) return;
    const d = document.createElement('div'); d.className = 'pm-card offer-card';
    d.innerHTML = (o.kind === 'duel'
      ? '<b>⚔️ ' + esc(o.from_name) + ' thách đấu bạn</b><span>' + (o.stake ? 'Cược ' + fmt(o.stake) + ' ngân lượng' : 'Đấu giao hữu') + '</span>'
      : '<b>🤝 ' + esc(o.from_name) + ' mời giao dịch</b><span>Đưa bạn: <b class="ok">' + esc(o.give) + '</b><br>Đổi lấy: <b class="warn">' + esc(o.ask) + '</b></span>') +
      '<div class="row-btn"><button type="button" class="btn small green" data-offacc="' + o.id + '" data-kind="' + o.kind + '">' + (o.kind === 'duel' ? '⚔ Nhận đấu' : '✔ Đồng ý') + '</button><button type="button" class="btn small red" data-offdec="' + o.id + '">Từ chối</button></div>' +
      '<button type="button" class="pm-x" data-act="pmclose">✕</button>';
    bar.prepend(d); while (bar.children.length > 4) bar.lastChild.remove();
    setTimeout(() => { if (d.isConnected) { d.classList.add('out'); setTimeout(() => d.remove(), 400); } }, 90000);
    Game.Sfx.play('horn');
  }
  let lastSocial = 0, lastOffers = 0;
  function handleSocial(sc) {
    if (!sc) return;
    (sc.pms || []).forEach(pmShow);
    if ((+sc.offers || 0) > lastOffers) checkOffers();
    lastOffers = +sc.offers || 0;
    const n = (+sc.offers || 0) + (+sc.freq || 0);
    if (n > lastSocial) { toast('🔔 Bạn có ' + n + ' lời mời mới (giao dịch / thách đấu / kết bạn) - bấm V', 'ok'); if (!$('ovWin').hidden && activeTab === 'social') renderSocial(); }
    lastSocial = n; socialBadge = n; updateBadges();
  }

  const RENDER = { char: renderChar, bag: renderBag, quest: renderQuests, shop: renderShop, forge: renderForge, farm: loadFarm, guild: renderGuild, pk: renderPK, rank: renderRank, social: renderSocial };
  const LOCAL_TABS = { char: 1, bag: 1, quest: 1, shop: 1, forge: 1 }; // ve lai ngay khi du lieu nguoi choi doi
  function renderTab(t) { const f = RENDER[t]; if (f) Promise.resolve(f()).catch(e => console.error(e)); }
  function renderAll() { renderMe(); renderTab(activeTab); }

  // ---------------- thao tac trang bi ----------------
  let eqBusy = false;
  async function equipAct(b, d) {
    if (eqBusy) return;
    const a = d.eq, p = { id: d.id || 0 };
    if (d.arm && !b.dataset.armed) { // bam 2 lan de xac nhan (ban)
      b.dataset.armed = '1'; const old = b.textContent; b.textContent = 'Xác nhận?'; b.classList.add('pulse');
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = old; b.classList.remove('pulse'); } }, 2500); return;
    }
    if (a === 'enhance') { const e = eqById(p.id); p.protect = protect && e && (e.plus | 0) >= EQ().enhance.dropFrom && ((U().inv || {}).bua_ho | 0) > 0 ? 1 : 0; }
    if (a === 'inlay' || a === 'merge') p.stone = d.stone;
    if (a === 'unlay') p.slot = d.slot;
    if (a === 'exchange') p.n = d.n;
    eqBusy = true;
    let r;
    try { r = await B().equipOp(a, p); } finally { eqBusy = false; }
    if (!r || !r.ok) { toast((r && r.error) || 'Lỗi', 'err'); Game.Sfx.play('deny'); return; }
    const S = Game.Sfx;
    if (a === 'enhance') {
      if (r.success) { toast('✨ Cường hóa thành công! +' + r.plus, 'ok'); S.play('levelup'); flash('ok'); }
      else { toast('💥 Thất bại' + (r.plus < r.from ? ', tụt về +' + r.plus : ' (giữ +' + r.plus + ')'), 'err'); S.play('hurt'); flash('fail'); }
    } else if (a === 'punch') { toast('🔨 Đục thành công lỗ sao thứ ' + r.holes, 'ok'); S.play('blade'); flash('ok'); }
    else if (a === 'inlay') { toast('💎 Khảm đá thành công', 'ok'); S.play('heal'); flash('ok'); }
    else if (a === 'unlay') { toast('Đã tháo đá về túi', 'ok'); S.play('click'); }
    else if (a === 'merge') { toast('💎 Ghép được ' + itemName(r.got), 'ok'); S.play('heal'); }
    else if (a === 'exchange') { toast('Đổi được ' + fmt(r.gold) + ' ngân lượng', 'ok'); S.play('coin'); }
    else if (a === 'sell') { toast('Bán được ' + fmt(r.gold) + ' ngân lượng', 'ok'); S.play('coin'); }
    else if (a === 'equip') { toast('Đã trang bị', 'ok'); S.play('click'); }
    else if (a === 'unequip') { toast('Đã tháo', 'ok'); S.play('click'); }
    Game.refreshLook();
  }
  function flash(kind) { const m = $('forgeMain'); if (!m) return; m.classList.remove('fx-ok', 'fx-fail'); void m.offsetWidth; m.classList.add(kind === 'ok' ? 'fx-ok' : 'fx-fail'); }

  // ---------------- actions (event delegation) ----------------
  let pickEm = 'em_lion';
  async function onClick(ev) {
    const b = ev.target.closest('button,[data-stage],a.plink'); if (!b || b.disabled) { if (!ev.target.closest('#pmenu')) closeMenu(true); return; }
    const d = b.dataset;
    if (!b.closest('#pmenu') && d.pmenu == null) closeMenu(true);
    if (d.pmenu != null) { const r = b.getBoundingClientRect(); playerMenu(+d.pmenu, d.name, r.left + r.width / 2, r.bottom); return; }
    if (d.pmact) {
      const id = menuId, name = $('pmenu').dataset.name || '';
      if (d.pmact === 'close') { closeMenu(); return; }
      if (d.pmact === 'chat') { pmTo(id, name); return; }
      if (d.pmact === 'trade') { openTrade(id, name); return; }
      if (d.pmact === 'duel') { const r = await FR('duel_invite', { target_id: id, stake: Math.max(0, Math.floor(+($('duelStake') || {}).value || 0)) }); toast(r.ok ? '⚔️ Đã gửi lời thách đấu tới ' + name : r.error, r.ok ? 'ok' : 'err'); if (r.ok) closeMenu(); return; }
      if (d.pmact === 'friend') { const r = await FR('friend_add', { target_id: id }); toast(r.ok ? (r.status ? 'Đã kết bạn với ' + name : 'Đã gửi lời mời kết bạn tới ' + name) : r.error, r.ok ? 'ok' : 'err'); closeMenu(); return; }
      if (d.pmact === 'unfriend') { await FR('friend_remove', { target_id: id }); toast('Đã hủy kết bạn với ' + name); closeMenu(); return; }
    }
    if (d.trade) { openTrade(+d.trade, d.name); return; }
    if (d.act === 'tradeclose') { closeTrade(); return; }
    if (d.act === 'tradesend') { sendTrade(); return; }
    if (d.act === 'pmclose') { b.parentElement.remove(); return; }
    if (d.act === 'duelclose') { duelResult = null; renderSocial(); return; }
    if (d.offacc) {
      const card = b.closest('.offer-card'); if (card) card.remove();
      const duel = d.kind === 'duel', r = await FR(duel ? 'duel_accept' : 'trade_accept', { id: d.offacc });
      if (!r.ok) { toast(r.error, 'err'); renderSocial(); return; }
      if (r.user) B()._set(r.user);
      if (duel) { duelResult = r; toast(r.win ? '🏆 Thắng thách đấu!' : '💀 Thua thách đấu', r.win ? 'ok' : 'err'); Game.Sfx.play(r.win ? 'win' : 'die'); if (card) { openWin('social'); return; } }
      else { toast('🤝 Giao dịch thành công: nhận ' + r.got, 'ok'); Game.Sfx.play('coin'); }
      renderSocial(); return;
    }
    if (d.offdec || d.offcan) { const card = b.closest('.offer-card'); if (card) card.remove(); const r = await FR(d.offdec ? 'offer_decline' : 'offer_cancel', { id: d.offdec || d.offcan }); if (!r.ok) toast(r.error, 'err'); renderSocial(); return; }
    if (d.fracc) { const r = await FR('friend_accept', { target_id: d.fracc }); toast(r.ok ? 'Đã kết bạn' : r.error, r.ok ? 'ok' : 'err'); renderSocial(); return; }
    if (d.frrm) { await FR('friend_remove', { target_id: d.frrm }); renderSocial(); return; }
    if (d.sect) { sectPick = d.sect; showSect(); Game.Sfx.play('click'); return; }
    if (d.gpick) { avPick = d.gpick; showGender(); Game.Sfx.play('click'); return; }
    if (d.act === 'genderok') {
      b.disabled = true; const r = await B().chooseAvatar(avPick); b.disabled = false;
      if (!r.ok) { toast(r.error, 'err'); if (U().avatar) showHome(); return; }
      Game.refreshLook(); Game.Sfx.play('levelup'); toast('Chào mừng ' + U().nickname + ' bước vào giang hồ!', 'ok'); renderAll(); showHome(); return;
    }
    if (d.act === 'homeplay') { const idx = homeStage(); Game.Sfx.play('click'); saveStage(idx); lastStage = idx; Game.enterStage(idx); return; }
    if (d.act === 'homemap') { showMap(homeStage()); return; }
    if (d.act === 'opensect') { openSect(); return; }
    if (d.act === 'sectlater') { closeSect(); return; }
    if (d.act === 'sectok') {
      if (!sectPick) return;
      b.disabled = true; const r = await B().chooseSect(sectPick); b.disabled = false;
      if (!r.ok) { toast(r.error, 'err'); return; }
      const nm = B().sectOf(sectPick).name;
      Game.refreshLook(); toast('Đã bái nhập ' + nm + '! Lĩnh ngộ toàn bộ tuyệt học môn phái.', 'ok'); Game.Sfx.play('levelup');
      Game.banner('Bái nhập ' + nm + '!', '#ffd76a', 3); Game.log('Bái nhập ' + nm + ': mở khóa tuyệt kỹ [T] và [Y], nhận chỉ số môn phái.');
      renderAll(); closeSect(); return;
    }
    if (d.act === 'winclose') { closeWin(); return; }
    if (d.act === 'mapclose') { closeMap(); return; }
    if (d.win) { if (!$('ovWin').hidden && activeTab !== d.win) setTab(d.win); else toggleWin(d.win); return; }
    if (d.act === 'openmap') { openMap(); return; }
    if (d.act === 'chat') { $('chatIn').focus(); return; }
    if (d.go) {
      if (d.go === 'close') { $('mapDetail').hidden = true; mapSel = 0; return; }
      lastStage = +d.stage; saveStage(+d.stage); Game.enterStage(+d.stage); return;
    }
    if (d.stage && b.classList.contains('stage-card')) { mapSelect(+d.stage); return; }
    if (d.r) {
      const idx = +($('resultBox').dataset.stage || Game.stageIdx);
      if (d.r === 'revive') { $('ovResult').hidden = true; Game.revive(); }
      else if (d.r === 'map') Game.leaveStage();
      return;
    }
    if (d.eq) { equipAct(b, d); return; }
    if (d.avset) { if (d.avset === U().avatar) return; if (U().avatar && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Xác nhận (' + fmt((window.TATON_SECTS || {}).avatarCost || 2000) + ')?'; setTimeout(() => { if (b.isConnected) renderChar(); }, 2500); return; } const r = await B().equipOp('avatar', { avatar: d.avset }); if (!r.ok) toast(r.error, 'err'); else { Game.refreshLook(); toast('Đã đổi tạo hình: ' + AV_NAME[d.avset], 'ok'); } return; }
    if (d.qtab) { qTab = d.qtab; renderQuests(); Game.Sfx.play('click'); return; }
    if (d.shopcat) { shopCat = d.shopcat; renderShop(); Game.Sfx.play('click'); return; }
    if (d.shopgo) { shopCat = d.shopgo; if (activeTab === 'shop') renderShop(); else setTab('shop'); Game.Sfx.play('click'); return; }
    if (d.bagcat) { bagCat = d.bagcat; if (d.gobag && activeTab !== 'bag') setTab('bag'); else renderBag(); Game.Sfx.play('click'); return; }
    if (d.stat) { const r = await B().statAdd(d.stat, +d.n || 1); if (!r.ok) toast(r.error, 'err'); else { Game.Sfx.play('click'); Game.refreshLook(); } return; }
    if (d.act === 'statreset') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Bấm lần nữa để XÁC NHẬN tẩy điểm'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; renderChar(); } }, 3000); return; }
      const r = await B().statReset(); toast(r.ok ? 'Đã tẩy điểm - cộng lại tùy ý' : r.error, r.ok ? 'ok' : 'err'); if (r.ok) Game.refreshLook(); return;
    }
    if (d.forgeeq) { forgeSel = +d.forgeeq; forgeSub = 'enh'; setTab('forge'); return; }
    if (d.fsub) { forgeSub = d.fsub; renderForge(); Game.Sfx.play('click'); return; }
    if (d.fsel) { forgeSel = +d.fsel; renderForge(); return; }
    if (d.buy) {
      const r = await B().shopBuy(d.buy, +d.q || 1, d.cur || 'gold');
      toast(r.ok ? 'Đã mua ' + (r.qty > 1 ? r.qty + ' ' : '') + r.item.name : r.error, r.ok ? 'ok' : 'err'); Game.Sfx.play(r.ok ? 'coin' : 'deny'); return;
    }
    if (d.sell) { const r = await B().sell(d.sell, d.q ? +d.q : 0); toast(r.ok ? 'Bán ' + r.qty + ' được ' + fmt(r.gold) + ' ngân lượng' : r.error, r.ok ? 'ok' : 'err'); if (r.ok) Game.Sfx.play('coin'); return; }
    if (d.forge) { const r = await B().forge(d.forge); toast(r.ok ? '🔥 Rèn thành công ' + itemName(r.weapon || d.forge) + ' - xem ở Hành trang [B]' : r.error, r.ok ? 'ok' : 'err'); Game.Sfx.play(r.ok ? 'blade' : 'deny'); return; }
    if (d.plant != null && d.crop) { const r = await B().plant(+d.plant, d.crop); if (!r.ok) toast(r.error, 'err'); loadFarm(); return; }
    if (d.harvest != null) { const r = await B().harvest(+d.harvest); if (r.ok) { const k = Object.keys(r.got)[0]; toast('Thu hoạch ' + r.got[k] + ' ' + itemName(k), 'ok'); } else toast(r.error, 'err'); loadFarm(); return; }
    if (d.join) { const r = await B().req('api/social.php', { action: 'guild_join', guild_id: d.join }); toast(r.ok ? 'Đã gia nhập bang!' : r.error, r.ok ? 'ok' : 'err'); B().refresh(); renderGuild(); return; }
    if (d.pk) { doPK(+d.pk); return; }
    if (d.pm) { closeWin(); pmTo(+d.pm, d.name || ''); return; }
    if (d.c) { setChatScope(d.c); return; }
    if (d.em) { pickEm = d.em; document.querySelectorAll('.emb').forEach(x => x.classList.toggle('on', x.dataset.em === pickEm)); return; }
    if (d.qa) { questAct('accept', d.qa); return; }
    if (d.qc) { questAct('claim', d.qc); return; }
    if (d.act === 'closenpc') { closeNpc(); return; }
    if (d.npcsvc) { const v = d.npcsvc; closeNpc(); if (v === 'map') openMap(); else openWin(v); return; }
    if (d.kick) { const r = await B().req('api/social.php', { action: 'guild_kick', target_id: d.kick }); toast(r.ok ? 'Đã trục xuất' : r.error, r.ok ? 'ok' : 'err'); renderGuild(); return; }
    if (d.act === 'gnotice') { const r = await B().req('api/social.php', { action: 'guild_notice', notice: ($('gnotice') || {}).value || '' }); toast(r.ok ? 'Đã lưu thông báo' : r.error, r.ok ? 'ok' : 'err'); renderGuild(); return; }
    if (d.act === 'mkguild') { const r = await B().req('api/social.php', { action: 'guild_create', name: ($('gname') || {}).value || '', emblem: pickEm }); toast(r.ok ? 'Lập bang thành công!' : r.error, r.ok ? 'ok' : 'err'); B().refresh(); renderGuild(); return; }
    if (d.act === 'leaveguild') { await B().req('api/social.php', { action: 'guild_leave' }); toast('Đã rời bang'); B().refresh(); renderGuild(); return; }
    if (d.pkm != null) { const m = +d.pkm; if (m === (U().pk_mode | 0)) return; const r = await B().pkMode(m); if (!r.ok) { toast(r.error, 'err'); return; } toast(m ? 'Đã bật ' + PK_NAMES[m][1] + ' - cẩn thận!' : 'Đã về Hòa bình', m ? 'err' : 'ok'); Game.Sfx.play(m ? 'horn' : 'ui'); renderPK(); return; }
    if (d.act === 'cleanse') { const r = await B().pkCleanse(); toast(r.ok ? 'Tâm bình khí hòa: khiêu khích -50' : r.error, r.ok ? 'ok' : 'err'); if (r.ok) Game.Sfx.play('heal'); renderPK(); return; }
  }
  let pkBusy = false;
  async function doPK(id) {
    if (pkBusy) return; pkBusy = true;
    let j; try { j = await B().req('api/pk.php', { action: 'fight', defender_id: id }); } finally { pkBusy = false; }
    if (!j.ok) { toast(j.error, 'err'); return; }
    const win = +j.win === +U().id;
    toast(win ? '🏆 Thắng PK! +' + j.gold + ' ngân lượng' : '💀 Thua PK...', win ? 'ok' : 'err');
    (j.log || []).slice(-6).forEach(l => Game.log(l));
    B().refresh(); renderPK();
  }

  // ---------------- chat + online ----------------
  let chatScope = 'world', chatLast = 0, seen = {}, chatBusy = false;
  function addChat(nick, text, mine, pm) {
    const cb = $('chatBox'); if (!cb) return;
    const d = document.createElement('div'); d.className = 'msg' + (pm ? ' pm' : '');
    d.innerHTML = '<b class="' + (mine ? 'me' : '') + '">' + esc(nick) + ':</b> ' + esc(text);
    cb.appendChild(d); while (cb.children.length > 100) cb.removeChild(cb.firstChild); cb.scrollTop = cb.scrollHeight;
  }
  function mapChat(name, text, mine) { addChat('[Bản đồ] ' + name, text, mine); }
  function mapChatHistory(list) { (list || []).forEach(m => addChat('[Bản đồ] ' + (m.nickname || '#' + m.from_id), m.text, +m.from_id === +U().id)); }
  function setChatScope(s) {
    if (s === 'map' && !Game.shared) { toast('Kênh Bản đồ chỉ dùng khi đang ở Bản đồ chung (trực tuyến)', 'err'); s = 'world'; }
    chatScope = s; chatLast = 0; seen = {};
    document.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === s));
    $('chatTo').hidden = s !== 'private'; $('chatToName').hidden = s !== 'private';
    if (s === 'private') { pmUnread = 0; updateBadges(); }
    $('chatBox').innerHTML = '<div class="sys">-- Kênh ' + (s === 'world' ? 'Thế giới' : s === 'guild' ? 'Bang' : s === 'map' ? 'Map (thời gian thực)' : 'Riêng') + ' --</div>';
  }
  function pmTo(id, name) {
    closeMenu(); setChatScope('private'); $('chatTo').value = id; $('chatToName').textContent = '→ ' + (name || ('#' + id));
    $('chatBox').innerHTML = '<div class="sys">-- Trò chuyện riêng với ' + esc(name || ('#' + id)) + ' --</div>'; chatLast = 0; seen = {}; pollChat(); $('chatIn').focus();
  }
  async function sendChat() {
    const inp = $('chatIn'), txt = inp.value.trim(); if (!txt) return;
    inp.value = ''; inp.blur();
    if (chatScope === 'map') {
      if (!Game.shared) { addChat('Hệ thống', 'Bạn không ở Bản đồ chung.', false); return; }
      const r = await RT.chat(txt);
      if (!r.ok) addChat('Hệ thống', r.error, false); else { mapChat(U().nickname, txt, true); Game.myBubble(txt); }
      return;
    }
    if (chatScope === 'private' && !(+$('chatTo').value)) { addChat('Hệ thống', 'Chọn người nhận: bấm vào nhân vật / tên người chơi → Trò chuyện riêng.', false); return; }
    const j = await B().req('api/social.php', { action: 'chat_send', scope: chatScope, text: txt, to_id: $('chatTo').value || '' });
    if (!j.ok) addChat('Hệ thống', j.error, false); else { if (chatScope !== 'private') Game.myBubble(txt); pollChat(); }
  }
  async function pollChat() {
    if (chatBusy || chatScope === 'map') return; chatBusy = true;
    try {
      let url = 'api/social.php?action=chat_load&scope=' + chatScope + '&last_id=' + chatLast;
      if (chatScope === 'private') url += '&to_id=' + encodeURIComponent($('chatTo').value || 0);
      const fresh = chatLast > 0, scope = chatScope, j = await B().req(url);
      if (j.ok && scope === chatScope) (j.msgs || []).forEach(m => {
        if (seen[m.id]) return; seen[m.id] = 1; const mine = +m.from_id === +U().id;
        addChat(m.nickname || ('ID' + m.from_id), m.text, mine, scope === 'private'); chatLast = Math.max(chatLast, +m.id);
        if (fresh && !mine && scope !== 'private') Game.showBubble(+m.from_id, m.text); // nguoi cung bản đồ noi -> hien tren dau 10s
      });
    } finally { chatBusy = false; }
  }
  let pinging = false, lastIdlePing = 0;
  async function ping() {
    if (pinging) return;
    const info = Game.pingInfo();
    if (info && info.stage) saveStage(info.stage);
    if (!info) {
      Game.syncOthers([]); $('onlineBox').innerHTML = '<i>Vào bản đồ để thấy người chơi khác.</i>';
      if (Date.now() - lastIdlePing < 4000) return; lastIdlePing = Date.now();
      const j0 = await B().req('api/social.php?action=mail');
      if (j0.ok && (j0.mails || []).length) { j0.mails.forEach(m => { toast(m, 'ok'); Game.log(m); }); B().refresh(); }
      if (j0.ok) handleSocial(j0.social);
      return;
    }
    pinging = true;
    try {
      const j = await B().req('api/social.php', Object.assign({ action: 'online_ping' }, info));
      if (j.ok) {
        Game.syncOthers(j.online || []); Game.setPkInfo(j.online || []); handleSocial(j.social);
        if (j.pk && B().user) { const me = B().user, pv = +j.pk.provoke || 0; if (me.provoke !== pv || me.friendly !== +j.pk.friendly) { me.provoke = pv; me.friendly = +j.pk.friendly; if (pv < 100) me.jail = 0; renderMe(); } }
        if (j.dmg > 0) Game.applyPvpDamage(+j.dmg);
        if ((j.mails || []).length) { j.mails.forEach(m => { toast(m, 'ok'); Game.log(m); addChat('Hệ thống', m, false); }); B().refresh(); }
        if (Game.shared && window.RT) {
          const ms = Object.keys(RT.members).filter(id => +id !== RT.me).map(id => Object.assign({ id: +id }, RT.members[id]));
          $('onlineBox').innerHTML = '<p class="sub">🌐 Bản đồ chung (thời gian thực): ' + (ms.length + 1) + ' người</p>' + (ms.length ? ms.map(m => '<div class="li">🧍 <b>' + esc(m.name) + '</b> Cấp ' + (+m.lv || 1) + (B().sectOf(m.sect) ? ' · ' + esc(B().sectOf(m.sect).name) : '') + ' <button class="btn small ghost" type="button" data-pm="' + m.id + '">Nhắn</button></div>').join('') : '<i>Chỉ có bạn.</i>');
          return;
        }
        const list = j.online || [];
        $('onlineBox').innerHTML = list.length ? list.map(p => '<div class="li">🧍 <b>' + esc(p.nickname) + '</b> Máu ' + (+p.hp) + ' <button class="btn small ghost" type="button" data-pm="' + (+p.user_id) + '">Nhắn</button></div>').join('') : '<i>Chưa có ai cùng màn.</i>';
      }
    } finally { pinging = false; }
  }
  const pvpCd = {};
  function pvpHit(id, mult, nick) {
    const now = Date.now(); if (pvpCd[id] && now - pvpCd[id] < 700) return; pvpCd[id] = now;
    B().req('api/social.php', { action: 'pvp_hit', target_id: id, mult: (+mult || 1).toFixed(2) }).then(r => {
      if (!r || !r.ok) { if (r && !r.cd && r.error) toast(r.error, 'err'); return; }
      Game.pvpFeedback(r.dmg, nick, r.kill);
      if (r.note) { toast(r.note, r.reward ? 'ok' : 'err'); Game.log(r.note); }
      if (r.user) B()._set(r.user);
    });
  }

  // ---------------- touch ----------------
  // Dien thoai: can gat ben trai, cum nut chieu ben phai (co hoi chieu), menu/tro chuyen/tam dung o goc tren
  function setupTouch() {
    const t = $('touch'); if (!t) return;
    const M = !!(window.Game && Game.mobile);
    t.hidden = !M; if (!M) return;
    t.querySelectorAll('[data-tico]').forEach(el => { el.innerHTML = icon(el.dataset.tico, 30); });
    // nut giu (danh, nhay, luot, chieu, thuoc)
    t.querySelectorAll('button[data-a]').forEach(btn => {
      const a = btn.dataset.a; let pid = null;
      const down = e => { e.preventDefault(); if (pid != null) return; pid = e.pointerId; try { btn.setPointerCapture(pid); } catch (_) { } btn.classList.add('on'); if (navigator.vibrate && a !== 'atk') try { navigator.vibrate(8); } catch (_) { } if (a === 'talk') Game.talk(); else Game.press(a, true); };
      const up = e => { if (e.pointerId !== pid) return; pid = null; btn.classList.remove('on'); if (a !== 'talk') Game.press(a, false); };
      btn.addEventListener('pointerdown', down);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => btn.addEventListener(n, up));
      btn.addEventListener('contextmenu', e => e.preventDefault());
    });
    // can gat: cham o dau trong nua trai la can hien o do
    const joy = $('joy'), base = $('joyBase'), knob = $('joyKnob'), JR = 48, held = { left: false, right: false, down: false };
    let jid = null, jx = 0, jy = 0;
    const setDir = (k, v) => { if (held[k] !== v) { held[k] = v; Game.press(k, v); } };
    const jmove = (cx, cy) => {
      let dx = cx - jx, dy = cy - jy; const d = Math.hypot(dx, dy); if (d > JR) { dx *= JR / d; dy *= JR / d; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      setDir('left', dx < -12); setDir('right', dx > 12); setDir('down', dy > 30 && Math.abs(dx) < 30);
    };
    const jend = e => {
      if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; base.classList.remove('on'); base.style.left = base.style.top = '';
      setDir('left', false); setDir('right', false); setDir('down', false);
    };
    joy.addEventListener('pointerdown', e => {
      if (jid != null) return; e.preventDefault(); jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (_) { }
      const r = joy.getBoundingClientRect(); jx = Math.max(r.left + 70, Math.min(r.right - 70, e.clientX)); jy = Math.max(r.top + 70, Math.min(r.bottom - 70, e.clientY));
      base.style.left = (jx - r.left) + 'px'; base.style.top = (jy - r.top) + 'px'; base.classList.add('on'); jmove(e.clientX, e.clientY);
    });
    joy.addEventListener('pointermove', e => { if (e.pointerId === jid) { e.preventDefault(); jmove(e.clientX, e.clientY); } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => joy.addEventListener(n, jend));
    // nut goc tren
    const hb = $('hotbar'), dock = $('chatDock'), badge = $('tcChatBadge');
    let unread = 0, chatReady = false; setTimeout(() => { chatReady = true; }, 6000);
    const setUnread = n => { unread = n; badge.textContent = n > 9 ? '9+' : n; badge.hidden = !n; };
    const toggleChat = on => { on = on == null ? !dock.classList.contains('open') : on; dock.classList.toggle('open', on); if (on) { setUnread(0); const cb = $('chatBox'); cb.scrollTop = cb.scrollHeight; } else if (document.activeElement === $('chatIn')) $('chatIn').blur(); };
    dock.querySelector('.chat-row').insertAdjacentHTML('beforeend', '<button class="cbtn chat-x" type="button" id="chatClose">✕ Đóng</button>');
    $('chatClose').addEventListener('click', () => toggleChat(false));
    $('chatIn').placeholder = 'Nhập tin nhắn rồi bấm Gửi...';
    new MutationObserver(ms => { if (!chatReady || dock.classList.contains('open')) return; let n = 0; ms.forEach(m => m.addedNodes.forEach(x => { if (x.classList && x.classList.contains('msg')) n++; })); if (n) setUnread(unread + n); }).observe($('chatBox'), { childList: true });
    $('tcChat').addEventListener('click', () => { hb.classList.remove('open'); toggleChat(); });
    $('tcMenu').addEventListener('click', () => { toggleChat(false); hb.classList.toggle('open'); });
    $('tcQuest').addEventListener('click', () => { hb.classList.remove('open'); toggleChat(false); toggleWin('quest'); });
    $('tcPause').addEventListener('click', () => { hb.classList.remove('open'); if (Game.state === 'play') Game.togglePause(); });
    hb.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(() => hb.classList.remove('open'), 0); });
    document.addEventListener('pointerdown', e => { if (hb.classList.contains('open') && !e.target.closest('#hotbar,#tcMenu')) { hb.classList.remove('open'); e.preventDefault(); } }, true);
    document.querySelectorAll('[data-proxy]').forEach(b => b.addEventListener('click', () => { const x = $(b.dataset.proxy); if (x) x.click(); }));
    // lan cham dau: vao toan man hinh + khoa man hinh ngang (Android)
    const goFull = () => {
      const el = document.documentElement;
      try {
        if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); }).catch(() => { });
      } catch (_) { }
    };
    window.addEventListener('pointerup', goFull, { once: true });
    // cap nhat nut theo trang thai game (hoi chieu, khoa cap, het noi luc, so thuoc)
    const skBtns = Array.from(t.querySelectorAll('#tcSkills [data-a]')), talkB = t.querySelector('.tb-talk'), potB = Array.from(t.querySelectorAll('.tc-pot [data-a]'));
    let skSig = '';
    setInterval(() => {
      const st = Game.touchState(), dlgOn = !$('ovDialog').hidden;
      t.classList.toggle('idle', !st || dlgOn);
      $('pxAdmin').hidden = $('btnAdmin').hidden;
      if (!st) { if (jid != null || held.left || held.right) { jid = null; knob.style.transform = ''; base.classList.remove('on'); held.left = held.right = held.down = false; } return; }
      if (st.play) for (const k in held) if (held[k]) Game.hold(k, true); // giu huong sau khi dong cua so
      const sig = st.sk.map(k => k.id + k.icon + k.name).join('|');
      if (sig !== skSig) {
        skSig = sig;
        skBtns.forEach(b => { const k = st.sk.find(x => x.id === b.dataset.a); if (!k) return; b.innerHTML = '<span class="tc-ico">' + (icon(k.icon, 34) || '<b style="color:' + esc(k.col) + '">' + esc(k.glyph) + '</b>') + '</span><small>' + esc(k.name) + '</small><i class="cdm"></i><em class="cdt"></em>'; });
      }
      skBtns.forEach(b => {
        const k = st.sk.find(x => x.id === b.dataset.a); if (!k) return;
        b.classList.toggle('lock', k.lock); b.classList.toggle('nomp', !k.lock && k.nomp);
        b.style.setProperty('--cd', k.lock ? 0 : Math.max(0, Math.min(1, k.cd)).toFixed(3));
        const tx = k.lock ? (k.sectLock ? 'Môn phái' : 'Cấp ' + k.lv) : k.left > 0 ? k.left.toFixed(k.left < 10 ? 1 : 0) : '', em = b.querySelector('.cdt');
        if (em && em.textContent !== tx) em.textContent = tx;
      });
      talkB.hidden = !st.near;
      $('tcHp').textContent = st.hp; $('tcMp').textContent = st.mp;
      potB.forEach((b, i) => { b.classList.toggle('lock', !(i ? st.mp : st.hp)); b.style.setProperty('--cd', Math.max(0, Math.min(1, st.pot)).toFixed(3)); });
    }, 100);
  }
  function setupWorldMap() {
    const c = $('wmap'); if (!c || !window.WorldMap) return;
    c.width = WorldMap.W; c.height = WorldMap.H;
    c.addEventListener('mousemove', e => { const k = WorldMap.hit(c, e.clientX, e.clientY); if (k !== mapHover) { mapHover = k; c.style.cursor = k ? 'pointer' : 'default'; } });
    c.addEventListener('mouseleave', () => { mapHover = 0; });
    c.addEventListener('click', e => { const k = WorldMap.hit(c, e.clientX, e.clientY); if (k) mapSelect(k); });
  }

  // ---------------- boot ----------------
  // Tu dong nhan chuong chinh tuyen tiep theo (khong can bam)
  let autoBusy = false;
  async function autoMain() {
    if (autoBusy) return;
    const u = U(), q = QUESTS().find(x => x.cat === 'main' && B().questStatus(x, u) !== 'done');
    if (!q || B().questStatus(q, u) !== 'available') return;
    autoBusy = true;
    const r = await B().questAccept(q.id);
    autoBusy = false;
    if (r.ok) { toast('📜 Nhận chương mới: ' + q.name, 'ok'); Game.log('Chính tuyến: ' + q.name + ' - ' + q.desc); }
  }
  function ready() {
    renderAll(); renderAudioBtns();
    autoMain();
    let sectAsked = false;
    B().onChange(u => {
      if (!sectAsked && !u.sect && (u.level || 1) >= SECT_LV() && Game.state === 'play' && OVS.every(id => $(id).hidden)) { sectAsked = true; setTimeout(() => { if (Game.state === 'play' && !U().sect) openSect(); }, 1800); }
    });
    B().onChange(() => { autoMain(); renderMe(); if (!$('ovWin').hidden && LOCAL_TABS[activeTab]) renderTab(activeTab); if (npcCur) renderNpc(); });
    showHome();
    Game.Music.play('town');
    Game.log('Chào mừng ' + U().nickname + ' trở lại giang hồ!');
    setInterval(() => { if (activeTab === 'farm' && !$('ovWin').hidden) drawFarm(); }, 1000);
    setInterval(() => { if (activeTab === 'farm' && !$('ovWin').hidden) loadFarm(); }, 15000);
    setInterval(pollChat, 2500); setInterval(ping, 2000);
    setInterval(() => { if (!$('ovWin').hidden && (activeTab === 'pk' || activeTab === 'rank')) renderTab(activeTab); }, 20000);
    Game.onPvpHit = pvpHit;
    Game.onPlayerClick = (id, name, x, y) => playerMenu(id, name, x, y);
    if (window.RT) RT.on('social', d => { if (d && d.text) addChat('Hệ thống', d.text, false); checkOffers(); });
    checkOffers();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', onClick);
    document.addEventListener('change', e => { if (e.target && e.target.id === 'chkProtect') protect = e.target.checked; });
    $('tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) setTab(t.dataset.t); });
    $('btnMap').addEventListener('click', openMap);
    // Phim tat cua so: chay truoc game (capture) de Esc dong cua so thay vi tam dung
    window.addEventListener('keydown', e => {
      const t = e.target, typingNow = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if (typingNow) { if (e.code === 'Escape') { t.blur(); e.preventDefault(); e.stopImmediatePropagation(); } return; }
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (e.code === 'Escape') {
        if (!$('pmenu').hidden) { closeMenu(); return stop(); }
        if (!$('ovTrade').hidden) { closeTrade(); return stop(); }
        if (!$('ovWin').hidden) { closeWin(); return stop(); }
        if (!$('ovMap').hidden && Game.inStage) { closeMap(); return stop(); }
        return;
      }
      if (!$('ovTrade').hidden) return;
      if (e.code === 'KeyM') { openMap(); return stop(); }
      if (WIN_KEYS[e.code]) { toggleWin(WIN_KEYS[e.code]); return stop(); }
      if (e.code === 'Enter' && ['play', 'title'].includes(Game.state) && $('ovWin').hidden) { $('chatIn').focus(); return stop(); }
    }, true);
    $('btnMusic').addEventListener('click', () => { Game.Settings.music = !Game.Settings.music; Game.saveSettings(); Game.Music.refresh(); renderAudioBtns(); });
    $('btnSfx').addEventListener('click', () => { Game.Settings.sfx = !Game.Settings.sfx; Game.saveSettings(); renderAudioBtns(); });
    $('btnFull').addEventListener('click', () => {
      const el = Game.mobile ? document.documentElement : $('stageWrap');
      try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => { }); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); } catch (_) { }
    });
    $('btnResume').addEventListener('click', () => Game.resume());
    $('btnLeave').addEventListener('click', () => { $('ovPause').hidden = true; Game.leaveStage(); });
    $('dlgSkip').addEventListener('click', e => { e.stopPropagation(); dlg.i = dlg.lines.length; dialogEnd(); });
    $('ovDialog').addEventListener('pointerdown', e => { if (e.target.id !== 'dlgSkip') dialogNext(); });
    $('chatIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if ($('chatIn').value.trim()) sendChat(); else $('chatIn').blur(); } });
    $('chatSendBtn').addEventListener('click', sendChat);
    setChatScope('world');
    document.querySelectorAll('[data-ico]').forEach(el => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.ico, 20) + ' '); });
    document.querySelectorAll('#hotbar [data-name]').forEach(el => { el.insertAdjacentHTML('beforeend', '<span class="hb-name">' + esc(el.dataset.name) + '</span>'); });
    setupTouch(); setupWorldMap();
    Game.init();
  });

  window.UI = { showHome, openSect, playerMenu, toast, hideOverlays, dialog, dialogNext, result, pause, showMap, ready, renderAll, npc, closeNpc, openWin, closeWin, mapChat, mapChatHistory, setChatScope };
})();
