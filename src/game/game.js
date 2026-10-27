// game.js - Ta Ton Truyen Ky: engine 2D canvas (map nhieu tang, camera 2 chieu, sprite, AI, 16 mon phai, skill FX, am thanh)
// Phu thuoc: assets/data/{stages,sects,quests,icons}.js, assets/js/backend.js (window.Backend)
(function () {
  'use strict';
  // ---- man hinh & the gioi ----
  const MOBILE = !!window.TT_MOBILE; // che do dien thoai: dieu khien cam ung, chu/HUD to hon, canvas lap day man hinh
  const W = 1280;                   // be ngang canvas co dinh
  let H = 720;                      // chieu cao canvas (dien thoai: theo ti le man hinh)
  const Z = MOBILE ? 1.32 : 1.2;    // zoom the gioi (dien thoai phong to hon de de nhin)
  const VW = W / Z;                 // khung nhin tinh theo don vi the gioi
  let VH = H / Z;
  const HS = MOBILE ? 1.22 : 1;     // phong to cac khung HUD tren dien thoai
  const kh = (k, label) => MOBILE ? 'nút ' + label : 'phím ' + k; // goi y phim / nut
  const WORLD_H = 1100, GROUND = 1020, TIER = 120; // chieu cao bản đồ, mat dat, khoang cach cac tang be
  const GRAV = 2500, JUMP_V = 900, JUMP2_V = 820, COYOTE = 0.11, JBUF = 0.14, FLIP_T = 0.46; // nhay: thoi gian 'bo ho' + dem phim
  const WORLD_TRAIN = 9000;
  const MOB_DMG = 1.6;           // he so sat thuong quai danh nguoi choi
  const MB_KILLS = 60;
  // Doanh trai an toan dau ban do (NPC) + tram nghi cuoi ban do: quai khong vao, khong bi danh. PHAI GIONG SAFE_W/SAFE_R trong api/rt.php
  const SAFE_W = 820, SAFE_R = 380;
  // Ban do chung: he so / so muc tieu toi da moi lan thi trien (PHAI GIONG SKILLS trong api/rt.php) -> du doan sat thuong hien ngay
  const NET_SK = { atk: [1.0, 4, 0.12], tt: [3.36, 6, 0.12], sth: [1.6, 14, 0.12], dl: [2.6, 10, 0.12], vx: [3.0, 12, 0.12], ult: [5.4, 30, 0.20] };
  const CLIMB_V = 340;           // Boss Ban Do xuat hien sau 60 quai bi ha (PHAI GIONG MB_KILLS config.php)
  // Canh (assets/img/wings.png - "Angel Wings Effect" CC0, OpenGameArt): 8 mau x 5 khung dang canh
  const WING_COL = ['#fff0ff', '#ffde7b', '#7eff8b', '#7bd5fe', '#7c87ff', '#ff7b87', '#fe7bea', '#c67bff'];
  const WING_FILL = 3; // giay de nap day nang luong bay khi dung tren dat       // be rong bản đồ luyen cong / bản đồ chung (PHAI GIONG WORLD_W trong api/rt.php)
  // Bo nen theo map (theme.set): lop xa -> gan. CC0: ansimuz (nui hoang hon, rung, thanh dem), pwl (hang dong)
  const BG_SETS = {
    mtn: { bg: 'bg_bg', far: 'bg_far', mtn: 'bg_mtn', trees: 'bg_trees', fg: 'bg_fg' },
    forest: { bg: 'bg_fback', mtn: 'bg_fmid', trees: 'bg_flights', fg: 'bg_ffront' },
    town: { bg: 'bg_tbg', mtn: 'bg_tmid', fg: 'bg_fg' },
    cave: { bg: 'bg_cave', fg: 'bg_fg' },
  };
  const ASSET_V = '?v=16';
  // 3 tao hinh. native: huong mat goc cua sprite (-1 trai, 1 phai). sw/sh = kich thuoc khung THAT (CDN co the thu nho anh)
  const PZ = (fw, fh, footY, cx, img) => ({ img, robe: img + '_robe', fw, fh, cols: 8, rows: 9, footY, cx, native: 1, anims: {
    idle: { s: 0, n: 10, fps: 14, loop: true }, run: { s: 10, n: 10, fps: 18, loop: true }, atk1: { s: 20, n: 10 }, atk2: { s: 30, n: 10 },
    jump: { s: 40, n: 5, fps: 14 }, fall: { s: 45, n: 5, fps: 14 }, hurt: { s: 50, n: 2, fps: 12 }, dead: { s: 50, n: 10, fps: 14 }, throw: { s: 60, n: 10 } } });
  const MODELS = {
    samurai: { img: 'hero', robe: 'hero_robe', fw: 230, fh: 158, cols: 8, rows: 7, footY: 138.8, cx: 107, native: -1, anims: {
      idle: { s: 0, n: 10, fps: 12, loop: true }, run: { s: 10, n: 8, fps: 15, loop: true }, atk1: { s: 18, n: 8 }, atk2: { s: 26, n: 8 },
      jump: { s: 34, n: 1 }, fall: { s: 35, n: 1 }, hurt: { s: 36, n: 6, fps: 22 }, dead: { s: 42, n: 8, fps: 12 }, throw: { s: 26, n: 8 } } },
    ninja: PZ(209, 166, 160.2, 99.9, 'ninja'),
    kunoichi: PZ(185, 161, 155.7, 91.2, 'kunoichi'),
  };
  for (const k in MODELS) { MODELS[k].key = k; MODELS[k].sw = MODELS[k].fw; MODELS[k].sh = MODELS[k].fh; }
  const FEMALE_NPC = { an_to_to: 1, tieu_chieu: 1, trieu_man: 1, duong_bat_hoi: 1, cnpc_shop: 1 };
  // NPC dich vu co mat o doanh trai moi ban do (svc: map | shop | forge)
  const CAMP_NPC = [
    { id: 'cnpc_map', name: 'Dịch Trạm', title: 'Đi bản đồ khác', color: '#3a8a9a', x: 225, svc: 'map', greet: 'Ngựa đã thắng yên cương. Thiếu hiệp muốn tới phương nào?' },
    { id: 'cnpc_shop', name: 'Thương Nhân', title: 'Tạp hóa · thuốc men', color: '#c8901a', x: 615, svc: 'shop', greet: 'Hàng tốt giá phải chăng! Mua thuốc trước khi ra khỏi doanh trại nhé.' },
    { id: 'cnpc_forge', name: 'Thợ Rèn Lưu Động', title: 'Rèn · cường hóa', color: '#8a5a2a', x: 725, svc: 'forge', greet: 'Binh khí cùn thì đưa đây, lão rèn lại cho sắc bén!' },
  ];
  const SVC_MARK = { map: '🗺', shop: '🛒', forge: '⚒' };
  // Quai vat pixel CC0 (assets/data/mobs.js + assets/img/mobs.png): tron voi quai nguoi, moi nhom ban do 1 bo rieng
  const MOBS = window.TATON_MOBS || { defs: {}, pools: [] };
  function pickMon(kind, seed) {
    const idx = +(G.stage && G.stage.idx) || 1, pl = MOBS.pools.find(p => idx <= p.to) || MOBS.pools[MOBS.pools.length - 1];
    if (!pl) return '';
    const list = kind === 'mob' ? pl.melee.concat(['', '']) : kind === 'ranged' ? pl.ranged.concat(['']) : kind === 'elite' ? pl.elite.concat(['']) : kind === 'fboss' ? pl.fboss : [];
    return list.length ? list[(seed >>> 0) % list.length] : '';
  }
  function applyMon(e, id) {
    const d = MOBS.defs[id]; if (!d || !d.anims || !d.anims.walk) return;
    const a = d.anims.walk, msc = d.sc * (e.elite && d.role !== 'elite' ? 1.3 : 1) * (e.fboss ? 1.15 : 1), H = a.h * msc;
    e.mon = d; e.monId = id; e.msc = msc;
    e.name = e.fboss ? d.name + ' [Thủ Lĩnh]' : e.elite ? '[Tinh Anh] ' + d.name : d.name;
    e.scale = (d.fly + H / 2) / 55;           // tam trung don (e.y - 55*scale) = giua than
    e.mtop = d.fly + H + 4;                    // dinh hinh -> ten + thanh mau
    e.hw = Math.max(14, a.w * msc * 0.3); e.hh = Math.min(120, H);
    if (d.proj) { e.projKind = 'orb'; e.projCol = d.proj; }
  }
  const FEMALE_STAGE = { 4: 1, 11: 1 }, FEMALE_BOSS = { 4: 1, 11: 1, 20: 1 };
  const SC_P = 0.62, SC_OTHER = 0.6;
  const ICONS = window.TATON_ICONS || { cols: 10, rows: 9, keys: [] };
  const ANIM = MODELS.samurai.anims; // ten dong tac hop le
  // Co che 6 chieu (giong moi phai); ten/mau/icon lay theo mon phai
  const SKILL_BASE = [
    { id: 'atk', key: 'R', lv: 1, mp: 0, cd: 0.30, des: 'Đòn đánh thường, hồi nội lực' },
    { id: 'tt', key: '1', lv: 1, mp: 12, cd: 2.2, des: 'Liên hoàn ám kình xuyên thấu phía trước' },
    { id: 'sth', key: '2', lv: 3, mp: 28, cd: 7, des: 'Chấn động diện rộng, choáng quái xung quanh' },
    { id: 'dl', key: '3', lv: 5, mp: 35, cd: 5, des: 'Lướt tới + kình khí khổng lồ xuyên địch' },
    { id: 'cd', key: '4', lv: 8, mp: 30, cd: 16, des: 'Hồi 30% máu, khiên 25% máu, +30% công 10s' },
    { id: 'ult', key: '5', lv: 12, mp: 70, cd: 28, des: 'Tuyệt kỹ trấn phái - đánh toàn màn hình' },
    { id: 'vx', key: '6', lv: 18, mp: 40, cd: 12, des: 'Phong bạo xoáy quanh thân - hút và đánh liên tục quái xung quanh' },
  ];
  const DEFAULT_SECT = { id: 'minh_giao', name: 'Minh Giáo', color: '#b8202a', mods: { hp: 0, mp: 0, atk: 0, def: 0 }, proj: 'orb', ult: 'dragon',
    skills: [['Đồ Long Đao Pháp', '斬', 'sk_atk', '#ffd24a'], ['Thất Thương Quyền', '拳', 'sk_tt', '#ff9a3a'], ['Sư Tử Hống', '吼', 'sk_sth', '#7cf0ff'], ['Hiệu Lệnh Thiên Hạ', '刀', 'sk_dl', '#ffd24a'], ['Cửu Dương Hộ Thể', '陽', 'sk_cd', '#ffb020'], ['Long Đằng Cửu Thiên', '龍', 'sk_ult', '#ffe066'], ['Thánh Hỏa Phong Bạo', '焰', 'sk_tornado', '#ff6a3a']] };
  // Chua bai nhap mon phai (duoi cap 25): bo chieu giang ho co ban, khoa 2 tuyet ky mon phai (T, Y)
  const SECT_LV = 25; // PHAI GIONG SECT_LV config.php
  const NO_SECT = { id: '', name: 'Vô Môn Phái', color: '#8a96aa', icon: 'ui_char', mods: { hp: 0, mp: 0, atk: 0, def: 0 }, proj: 'orb', ult: 'dragon', none: true,
    skills: [['Chém Thường', '斬', 'sk_atk', '#e8ecf8'], ['Phi Tiêu', '鏢', 'sk_tt', '#c8d8ff'], ['Chấn Địa Quyền', '震', 'sk_sth', '#b8e0ff'], ['Lướt Trảm', '閃', 'sk_dl', '#e8f0ff'], ['Vận Khí Điều Tức', '氣', 'sk_cd', '#9dff6a'], ['Tuyệt Kỹ Môn Phái', '絕', 'sk_ult', '#9aa0b0'], ['Phong Bạo Môn Phái', '旋', 'sk_tornado', '#9aa0b0']] };
  const SECT_ONLY = { ult: 1, vx: 1 };
  const WEAPON_COL = { dao_thuong: '#dfe6ff', kiem_sat: '#bfe3ff', bua_da: '#d8c8a8', dai_dao: '#ff7a5a', do_long: '#ffd700' };
  const GROUND_STYLE = {
    grass: { top: '#5a9a3a', top2: '#7ac04a', body: '#5a4630', body2: '#2a1e12', rock: '#7a7a6a' },
    snow: { top: '#f0f8ff', top2: '#ffffff', body: '#6a7a8a', body2: '#2a3440', rock: '#9aaabb' },
    sand: { top: '#e0c080', top2: '#f0d8a0', body: '#a07a40', body2: '#4a3418', rock: '#c0a070' },
    stone: { top: '#8a8a7a', top2: '#a8a898', body: '#4a4640', body2: '#1e1c1a', rock: '#6a6a66' },
    temple: { top: '#b8302a', top2: '#e8b040', body: '#5a2a1a', body2: '#200c08', rock: '#8a7a6a' },
  };
  const STAGES = () => (window.TATON_DATA && window.TATON_DATA.stages) || [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sign = v => v < 0 ? -1 : 1;
  function seeded(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }

  // ================= AUDIO =================
  const Settings = (() => { const s = { music: true, sfx: true }; try { Object.assign(s, JSON.parse(localStorage.getItem('taton_settings') || '{}')); } catch (_) { } return s; })();
  function saveSettings() { try { localStorage.setItem('taton_settings', JSON.stringify(Settings)); } catch (_) { } }
  const Sfx = {
    ctx: null, out: null, nb: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = 0.45; this.out.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2; this.nb = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = this.nb.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (_) { this.ctx = null; }
    },
    ok() { return Settings.sfx && this.ctx && this.ctx.state === 'running'; },
    tone(f, dur, type, vol, f2, delay) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
    },
    noise(dur, vol, freq, ftype, delay, f2) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
      const fl = c.createBiquadFilter(); fl.type = ftype || 'bandpass'; fl.frequency.setValueAtTime(freq || 1000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    },
    lt: {}, gap: { hit: 0.05, crit: 0.06, slash: 0.045, coin: 0.06, step: 0.08, hurt: 0.1, needle: 0.035, fist: 0.04, dart: 0.05, swing: 0.06, swordfly: 0.05, petal: 0.05, deny: 0.2, land: 0.1 },
    play(n) {
      if (!this.ok()) return;
      const now = this.ctx.currentTime, g = this.gap[n] || 0.03;
      if (now - (this.lt[n] || -9) < g) return; this.lt[n] = now;
      try {
        switch (n) {
          case 'slash': this.noise(0.13, 0.35, 2600, 'highpass'); this.tone(900, 0.09, 'sawtooth', 0.04, 300); break;
          case 'hit': this.noise(0.09, 0.5, 900, 'lowpass'); this.tone(160, 0.12, 'sine', 0.35, 60); break;
          case 'crit': this.noise(0.12, 0.6, 1400, 'lowpass'); this.tone(1400, 0.08, 'square', 0.06, 700); this.tone(120, 0.15, 'sine', 0.4, 50); break;
          case 'fist': this.tone(320, 0.08, 'square', 0.08, 110); this.noise(0.06, 0.25, 700); break;
          case 'needle': this.tone(2400, 0.05, 'triangle', 0.05, 1200); this.noise(0.04, 0.15, 5000, 'highpass'); break;
          case 'swordfly': this.noise(0.18, 0.25, 1800, 'bandpass', 0, 4000); this.tone(1200, 0.12, 'sine', 0.04, 600); break;
          case 'petal': this.tone(1800, 0.1, 'sine', 0.04, 2400); this.noise(0.08, 0.1, 3000, 'highpass'); break;
          case 'roar': this.tone(120, 0.9, 'sawtooth', 0.28, 60); this.tone(62, 1.0, 'sine', 0.4, 45); this.noise(0.9, 0.35, 380, 'bandpass', 0, 160); break;
          case 'blade': this.noise(0.45, 0.4, 600, 'bandpass', 0, 3500); this.tone(220, 0.4, 'sawtooth', 0.1, 880); break;
          case 'heal': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.12, 0, i * 0.07)); break;
          case 'dragon': this.noise(1.6, 0.4, 250, 'bandpass', 0, 1800); this.tone(70, 1.5, 'sawtooth', 0.22, 150); this.tone(140, 1.2, 'square', 0.05, 90, 0.3); break;
          case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.16, 0, i * 0.09)); break;
          case 'coin': this.tone(1318, 0.06, 'square', 0.05); this.tone(1760, 0.12, 'square', 0.05, 0, 0.06); break;
          case 'hurt': this.tone(240, 0.16, 'sawtooth', 0.15, 110); this.noise(0.1, 0.3, 500, 'lowpass'); break;
          case 'jump': this.tone(300, 0.12, 'sine', 0.1, 650); break;
          case 'land': this.noise(0.08, 0.25, 220, 'lowpass'); break;
          case 'step': this.noise(0.035, 0.07, 500 + Math.random() * 300, 'lowpass'); break;
          case 'dash': this.noise(0.18, 0.3, 800, 'bandpass', 0, 3000); break;
          case 'gong': [110, 163, 231, 298, 440].forEach((f, i) => this.tone(f, 2.6 - i * 0.3, 'sine', 0.22 / (i + 1))); this.noise(0.3, 0.2, 300, 'lowpass'); break;
          case 'horn': this.tone(220, 0.6, 'sawtooth', 0.12, 330); this.tone(110, 0.7, 'sawtooth', 0.08, 165); break;
          case 'die': this.tone(400, 0.7, 'sawtooth', 0.15, 70); break;
          case 'dart': this.tone(1600, 0.06, 'triangle', 0.06, 800); break;
          case 'swing': this.noise(0.12, 0.18, 1500, 'bandpass', 0, 600); break;
          case 'slam': this.noise(0.45, 0.7, 260, 'lowpass'); this.tone(70, 0.45, 'sine', 0.5, 30); break;
          case 'potion': this.tone(600, 0.1, 'sine', 0.1, 1200); this.tone(900, 0.15, 'sine', 0.08, 1500, 0.08); break;
          case 'click': this.tone(900, 0.04, 'square', 0.04); break;
          case 'ui': this.tone(660, 0.06, 'triangle', 0.06); this.tone(990, 0.08, 'triangle', 0.05, 0, 0.05); break;
          case 'win': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.14, 0, i * 0.12)); break;
          case 'deny': this.tone(180, 0.12, 'square', 0.06, 140); break;
        }
      } catch (_) { }
    },
  };
  // Am thanh moi truong theo map (song bien, gio tuyet, lua, chim, de + chuong chua)
  const Amb = {
    nodes: [], timer: null, kind: null,
    start(kind) {
      this.stop(); this.kind = kind;
      if (!Sfx.ok() || !kind) return;
      const c = Sfx.ctx;
      try {
        const bed = (freq, type, vol, lfoHz, q) => {
          const s = c.createBufferSource(); s.buffer = Sfx.nb; s.loop = true;
          const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
          const g = c.createGain(); g.gain.value = vol;
          const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = lfoHz; lg.gain.value = vol * 0.8;
          lfo.connect(lg); lg.connect(g.gain); s.connect(f); f.connect(g); g.connect(Sfx.out); s.start(); lfo.start();
          this.nodes.push(s, lfo);
        };
        const every = (ms, fn) => { this.timer = setInterval(() => { if (Sfx.ok() && Math.random() < 0.6) { try { fn(); } catch (_) { } } }, ms); };
        if (kind === 'sea') { bed(450, 'lowpass', 0.07, 0.12); every(3500, () => Sfx.noise(1.8, 0.05, 900, 'bandpass', 0, 300)); }
        else if (kind === 'snow') { bed(700, 'bandpass', 0.05, 0.2, 0.8); every(4000, () => Sfx.noise(2.2, 0.04, 1400, 'bandpass', 0, 500)); }
        else if (kind === 'embers') { bed(260, 'lowpass', 0.06, 0.3); every(180, () => Sfx.noise(0.03, 0.08, 2000 + Math.random() * 2000, 'bandpass')); }
        else if (kind === 'lanterns') { bed(5000, 'highpass', 0.008, 6); every(5000, () => [660, 990, 1320].forEach((f, i) => Sfx.tone(f, 2.2 - i * 0.5, 'sine', 0.03 / (i + 1)))); }
        else { bed(900, 'bandpass', 0.025, 0.15, 0.6); every(1600, () => { const f = 2200 + Math.random() * 1600; Sfx.tone(f, 0.08, 'sine', 0.025, f * 1.3); Sfx.tone(f * 1.1, 0.07, 'sine', 0.02, f * 1.4, 0.1); }); }
      } catch (_) { this.stop(); }
    },
    stop() {
      clearInterval(this.timer); this.timer = null;
      this.nodes.forEach(n => { try { n.stop(); } catch (_) { } try { n.disconnect(); } catch (_) { } });
      this.nodes = [];
    },
    refresh() { const k = this.kind; if (Settings.sfx && k) this.start(k); else this.stop(); this.kind = k; },
  };
  const Music = {
    els: {}, cur: null,
    play(name) {
      if (this.cur && this.cur !== name && this.els[this.cur]) { try { this.els[this.cur].pause(); } catch (_) { } }
      this.cur = name;
      if (!Settings.music || !name) return;
      let a = this.els[name];
      if (!a) { a = new Audio('assets/audio/bgm_' + name + '.mp3'); a.loop = true; a.preload = 'auto'; this.els[name] = a; }
      a.volume = name === 'boss' ? 0.45 : 0.33;
      const p = a.play(); if (p && p.catch) p.catch(() => { });
    },
    stopAll() { for (const k in this.els) try { this.els[k].pause(); } catch (_) { } },
    refresh() { if (Settings.music) this.play(this.cur); else this.stopAll(); },
  };

  // ================= ASSETS =================
  const IMG = {};
  function loadImg(key, src) {
    return new Promise(res => { const i = new Image(); i.onload = () => { IMG[key] = i; res(true); }; i.onerror = () => res(false); i.src = src; });
  }
  function drawIcon(key, x, y, size, alpha) {
    const im = IMG.icons, i = ICONS.keys.indexOf(key);
    if (!im || i < 0) return false;
    const cw = im.width / ICONS.cols, ch = im.height / ICONS.rows;
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(im, (i % ICONS.cols) * cw, Math.floor(i / ICONS.cols) * ch, cw, ch, x, y, size, size);
    ctx.globalAlpha = 1;
    return true;
  }
  const SKIN_CACHE = {};
  function skin(m, color) {
    m = m || MODELS.samurai;
    const k = m.key + '|' + (color || 'base');
    if (SKIN_CACHE[k]) return SKIN_CACHE[k];
    const base = IMG[m.img], robe = IMG[m.robe];
    if (!base) return null;
    const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const x = c.getContext('2d'); x.drawImage(base, 0, 0);
    if (color && robe) {
      const mm = document.createElement('canvas'); mm.width = c.width; mm.height = c.height; const mx = mm.getContext('2d');
      mx.drawImage(robe, 0, 0, mm.width, mm.height);
      mx.globalCompositeOperation = 'multiply'; mx.fillStyle = color; mx.fillRect(0, 0, mm.width, mm.height);
      mx.globalCompositeOperation = 'destination-in'; mx.drawImage(robe, 0, 0, mm.width, mm.height);
      x.drawImage(mm, 0, 0);
    }
    SKIN_CACHE[k] = c; return c;
  }
  // texture phat sang (cache) - ve hieu ung mem va nhanh hon tao gradient moi frame
  const GLOW = {};
  function glowTex(col) {
    if (GLOW[col]) return GLOW[col];
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); GLOW[col] = c; return c;
  }
  function glow(x, y, r, col, a) { ctx.globalAlpha = a == null ? 1 : a; ctx.drawImage(glowTex(col), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
  const BG_CACHE = {};
  function bgLayers(stage) {
    const key = stage ? stage.idx : 0;
    if (BG_CACHE[key]) return BG_CACHE[key];
    const th = (stage && stage.theme) || { tint: 'rgba(0,0,0,0)', sky: '#6a4a7a' };
    const out = {};
    const set = BG_SETS[th.set] || BG_SETS.mtn;
    ['bg', 'far', 'mtn', 'trees', 'fg'].forEach(n => {
      const im = set[n] && IMG[set[n]]; if (!im) return;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
      x.drawImage(im, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      if (n === 'bg') { x.globalAlpha = set === BG_SETS.mtn ? 0.55 : 0.25; x.fillStyle = th.sky; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1; }
      x.fillStyle = th.tint; x.fillRect(0, 0, c.width, c.height);
      out[n] = c;
    });
    BG_CACHE[key] = out; return out;
  }

  // ================= STATE =================
  const G = {
    state: 'loading', t: 0, stage: null, mode: 'world', worldW: 4000, camX: 0, camY: WORLD_H - VH, shake: 0, hitstop: 0, slow: 1, slowT: 0,
    p: null, enemies: [], projs: [], parts: [], fx: [], texts: [], others: new Map(), plats: [], rocks: [], deco: [],
    kills: 0, boss: null, killQ: { n: 0, e: 0 }, flushT: 0, flushing: false, deaths: 0, startT: 0,
    combo: 0, comboT: 0, ending: false, endT: 0, input: {}, pressed: {}, uiRects: [], pk: false, onPvpHit: null, busy: false, loadPct: 0,
    weather: [], potCd: 0, trainSpawnT: 0, msgs: [], vignette: 0, npcs: [], questReady: null,
    fbKills: 0, fbLastT: -999, eliteKills: 0, stepT: 0,
    punch: 0, introSeen: {}, loot: new Map(), lootSyncT: 0, mbKills: 0, mbLeft: 60, portals: [], portalCd: 0, pkInfo: {}, shared: false, netQ: {}, rtMobsT: 0, rtStateT: 0, rtBeatT: 0, lastSent: null, bubbles: {}, netErrT: 0,
  };
  const hasRT = () => !!(window.RT && G.shared && RT.ch);
  let cv, ctx, nextId = 1;

  function user() { return (window.Backend && Backend.user) || { nickname: 'Tạ Tốn', level: 1, hp_max: 200, mp_max: 100, atk: 18, def: 6, inv: {}, weapon_code: 'dao_thuong', stage_max: 1 }; }
  function sect() { const u = user(); if (!u.sect) return NO_SECT; return (window.Backend && Backend.sectOf && Backend.sectOf(u.sect)) || DEFAULT_SECT; }
  function skills() {
    const s = sect();
    return SKILL_BASE.map((b, i) => {
      const k = s.skills[i] || DEFAULT_SECT.skills[i], o = Object.assign({}, b, { name: k[0], glyph: k[1], icon: k[2], col: k[3] });
      if (s.none && SECT_ONLY[b.id]) { o.lv = Math.max(b.lv, SECT_LV); o.sectLock = true; o.des = 'Bái nhập môn phái (cấp ' + SECT_LV + ') để lĩnh ngộ tuyệt kỹ này'; }
      return o;
    });
  }
  const inSafe = x => x < SAFE_W || x > G.worldW - SAFE_R;
  const outSafe = (x, m) => clamp(x, SAFE_W + (m || 60), G.worldW - SAFE_R - (m || 60));
  const skLocked = (sk, lv) => lv < sk.lv || !!sk.sectLock;
  function playerColor() { return sect().color || '#b8202a'; }
  function log(msg) {
    const b = document.getElementById('battleLog'); if (!b) return;
    const d = document.createElement('div'); d.textContent = msg; b.appendChild(d);
    while (b.children.length > 60) b.removeChild(b.firstChild); b.scrollTop = b.scrollHeight;
  }
  function toast(msg, kind) { if (window.UI && UI.toast) UI.toast(msg, kind); else log(msg); }
  function banner(text, col, dur) { const old = G.msgs.find(m => m.text === text); if (old) { old.t = 0; return; } G.msgs.push({ text, col: col || '#ffd76a', t: 0, dur: dur || 2.2 }); if (G.msgs.length > 4) G.msgs.shift(); }

  // ================= MAP (be nhay, da, tang cao) =================
  // Ban do: nhieu kieu dia hinh nhieu tang, de leo (bac thang, day leo/thang tre, thap zic-zac, cau may).
  // Day leo: dung o chan, giu Nhay de leo len, giu Xuong de tut xuong. Doanh trai an toan [0, SAFE_W], tram nghi cuoi map.
  function genMap(s, mode) {
    const r = seeded(s.idx * 7919 + (mode === 'train' ? 13 : 0));
    const plats = [], rocks = [], deco = [], vines = [];
    const end = G.worldW - SAFE_R - 160;
    const vine = (x, top, bot) => vines.push({ x, top, bot: bot == null ? GROUND : bot });
    const plat = (x, y, w) => { const p = { x, y, w }; plats.push(p); return p; };
    let x = SAFE_W + 220;
    while (x < end - 120) {
      const t = r();
      if (t < 0.14 || end - x < 520) { // tang da chan duong
        const w = 60 + r() * 70, h = 40 + r() * 55; rocks.push({ x, y: GROUND - h, w, h, seed: r() }); x += w + 110 + r() * 150;
      } else if (t < 0.32) { // bac thang len cao
        const steps = 2 + Math.floor(r() * 3); let px = x;
        for (let i = 0; i < steps; i++) { const w = 160 + r() * 120; plat(px, GROUND - TIER * (i + 1), w); px += w * 0.55 + 70 + r() * 50; }
        if (r() < 0.6) { const w = 200 + r() * 120; plat(px, GROUND - TIER * steps, w); px += w; }
        x = px + 120 + r() * 140;
      } else if (t < 0.44) { // thap da + be tren dinh + day leo ben canh
        const w = 90 + r() * 40, h = 95 + r() * 30; rocks.push({ x, y: GROUND - h, w, h, seed: r() });
        const top = plat(x - 70, GROUND - h - TIER, w + 140); vine(x - 40, top.y);
        x += w + 190 + r() * 120;
      } else if (t < 0.6) { // thap zic-zac nhieu tang, day leo thang len dinh
        const lv = 3 + Math.floor(r() * 3);
        for (let i = 1; i <= lv; i++) plat(x + (i % 2 ? 0 : 150), GROUND - TIER * i, 210);
        vine(x + 180, GROUND - TIER * lv);
        deco.push({ kind: 'chest', x: x + (lv % 2 ? 100 : 250), y: GROUND - TIER * lv });
        if (r() < 0.6) deco.push({ kind: 'lamp', x: x + (lv % 2 ? 30 : 330), y: GROUND - TIER * lv });
        x += 360 + 170 + r() * 120;
      } else if (t < 0.74) { // cau treo cao + thang len giua cau
        plat(x, GROUND - TIER, 150); plat(x + 170, GROUND - TIER * 2, 170);
        plat(x + 360, GROUND - TIER * 3, 420); plat(x + 800, GROUND - TIER * 2, 170); plat(x + 990, GROUND - TIER, 150);
        vine(x + 560, GROUND - TIER * 3);
        deco.push({ kind: 'chest', x: x + 640, y: GROUND - TIER * 3 });
        x += 1180 + r() * 100;
      } else if (t < 0.88) { // vach da bac thang: 2 tang da + be tren cao, thang leo phia truoc
        const h1 = 70 + r() * 20, h2 = h1 + 70;
        rocks.push({ x: x + 60, y: GROUND - h1, w: 120, h: h1, seed: r() }); rocks.push({ x: x + 180, y: GROUND - h2, w: 150, h: h2, seed: r() });
        plat(x + 140, GROUND - h2 - TIER, 280); vine(x + 30, GROUND - TIER - 10, GROUND);
        plat(x, GROUND - TIER - 10, 120);
        if (r() < 0.5) plat(x + 300, GROUND - h2 - TIER * 2, 200);
        x += 330 + 180 + r() * 120;
      } else { // duong may: chuoi be nho lo lung, len xuong nhe nhang
        const n = 4 + Math.floor(r() * 3); let px = x, tier = 1;
        vine(x + 40, GROUND - TIER);
        for (let i = 0; i < n; i++) { const w = 120 + r() * 60; plat(px, GROUND - TIER * tier, w); px += w + 70 + r() * 50; tier = clamp(tier + (r() < 0.55 ? 1 : -1), 1, 4); }
        x = px + 120 + r() * 120;
      }
      if (r() < 0.35) deco.push({ kind: r() < 0.5 ? 'flag' : 'lamp', x: x - 120, y: GROUND });
    }
    // doanh trai an toan dau map + tram nghi cuoi map
    deco.push({ kind: 'tent', x: 285, y: GROUND, w: 150 }, { kind: 'fire', x: 400, y: GROUND }, { kind: 'tent', x: 545, y: GROUND, w: 120 },
      { kind: 'lamp', x: 130, y: GROUND }, { kind: 'lamp', x: 790, y: GROUND }, { kind: 'gate', x: SAFE_W, y: GROUND, label: 'Doanh Trại An Toàn' },
      { kind: 'gate', x: G.worldW - SAFE_R, y: GROUND, label: 'Trạm Nghỉ' }, { kind: 'fire', x: G.worldW - 230, y: GROUND });
    return { plats, rocks, deco, vines };
  }
  function vineAt(p) { for (const v of G.vines) if (Math.abs(v.x - p.x) < 24 && p.y <= v.bot + 2 && p.y >= v.top - 2) return v; return null; }
  // tim mat dung ben duoi (de dat quai len be)
  function surfaceAt(x) {
    const list = [{ y: GROUND }];
    G.plats.forEach(p => { if (x >= p.x && x <= p.x + p.w) list.push({ y: p.y, p }); });
    G.rocks.forEach(k => { if (x >= k.x && x <= k.x + k.w) list.push({ y: k.y, k }); });
    return list;
  }
  // Vat ly chung cho moi thuc the: da chan ngang, dung tren be/da/mat dat, be 1 chieu (nhay xuyen len, nhan xuong de roi)
  function physMove(e, vx, dt) {
    const hw = e.hw || 14, hh = e.hh || 70;
    let nx = e.x + vx * dt; e.blocked = false;
    for (const k of G.rocks) {
      if (e.y > k.y + 3 && e.y - hh < k.y + k.h && nx + hw > k.x && nx - hw < k.x + k.w) {
        if (e.x <= k.x + k.w / 2) nx = k.x - hw; else nx = k.x + k.w + hw;
        e.blocked = true;
      }
    }
    e.x = clamp(nx, 30, G.worldW - 30);
    const prevY = e.y;
    e.vy += GRAV * dt * (e.noGrav ? 0 : (e.gmul || 1));
    e.y += e.vy * dt;
    const wasG = e.onG; e.onG = false; e.surf = null;
    if (e.vy >= 0) {
      let best = null;
      const consider = (top, ref, x0, x1, oneWay) => {
        if (oneWay && e.dropT > 0) return;
        if (e.x + hw * 0.4 < x0 || e.x - hw * 0.4 > x1) return;
        if (prevY <= top + 2 && e.y >= top && (!best || top < best.top)) best = { top, ref };
      };
      consider(GROUND, null, -1e9, 1e9, false);
      for (const p of G.plats) consider(p.y, p, p.x, p.x + p.w, true);
      for (const k of G.rocks) consider(k.y, k, k.x, k.x + k.w, false);
      if (best) { e.landV = e.vy; e.y = best.top; e.vy = 0; e.onG = true; e.surf = best.ref; }
    }
    if (e.y > GROUND) { e.y = GROUND; e.vy = 0; e.onG = true; }
    if (e.y < 40) { e.y = 40; e.vy = Math.max(0, e.vy); }
    e.justLanded = e.onG && !wasG;
    if (e.dropT > 0) e.dropT -= dt;
  }

  // ================= PLAYER =================
  function effStats() { return Backend.combat(user()); } // goc + trang bi + da sao, nhan % mon phai (giong combat_stats PHP)
  function mkPlayer() {
    const u = user(), s = effStats();
    return {
      x: 160, y: GROUND, vx: 0, vy: 0, face: 1, onG: true, jumps: 0, hw: 14, hh: 70, coyote: 0, jbuf: 0, flipT: 0, flipDir: 1, squash: 0, gmul: 1, wing: -1, flyMax: 0, flyE: 0, flying: false, mag: 0, spd: 0,
      hp: s.hp, mp: s.mp, maxhp: s.hp, maxmp: s.mp, atk: s.atk, def: s.def, crit: s.crit, level: u.level,
      anim: 'idle', at: 0, atkAnim: 'atk1', atkT: 0, atkDur: 0, atkHit: false, comboFlip: false,
      invT: 0, hurtT: 0, dashT: 0, dashCd: 0, dropT: 0, cds: {}, buffT: 0, shield: 0, shieldT: 0, lastHurt: 0, dead: false, deadT: 0,
      trail: [], weapon: u.weapon_code || 'dao_thuong',
    };
  }
  function syncStats(full) {
    const p = G.p; if (!p) return; const u = user(), s = effStats();
    const hpR = p.maxhp ? p.hp / p.maxhp : 1, mpR = p.maxmp ? p.mp / p.maxmp : 1;
    p.maxhp = s.hp; p.maxmp = s.mp; p.atk = s.atk; p.def = s.def; p.crit = s.crit; p.level = u.level; p.mag = s.mag || 0; p.spd = s.spd || 0;
    const wg = (u.equips || []).find(e => e.equipped && e.slot === 'wing'), wd = wg && Backend.itemOf(wg.code);
    p.wing = wd ? wd.wing | 0 : -1; p.flyMax = wd ? +wd.fly || 1.5 : 0; if (full || p.flyE == null || p.flyE > p.flyMax) p.flyE = p.flyMax;
    const we = (u.equips || []).find(e => e.equipped && e.slot === 'weapon'); p.weapon = we ? we.code : (u.weapon_code || 'dao_thuong'); p.wplus = we ? we.plus : 0;
    if (full) { p.hp = p.maxhp; p.mp = p.maxmp; } else if (!p.dead) { p.hp = clamp(Math.round(hpR * p.maxhp), 1, p.maxhp); p.mp = clamp(mpR * p.maxmp, 0, p.maxmp); }
  }

  // ================= ENEMIES =================
  function mkEnemy(kind, x, y, opt) {
    const s = G.stage, i = s.idx, mboss = kind === 'mboss', boss = kind === 'boss' || kind === 'fboss' || mboss, elite = kind === 'elite';
    const ranged = kind === 'ranged';
    const hpMul = kind === 'boss' ? 1 : mboss ? 1.5 : kind === 'fboss' ? 0.6 : elite ? 4 : 1; // PHAI GIONG mob_max_hp (rt.php)
    const baseHp = boss ? s.boss_hp : s.mob_hp, baseAtk = boss ? s.boss_atk : s.mob_atk;
    const e = {
      id: nextId++, kind, boss, elite, ranged, mboss, fboss: kind === 'fboss', x, y: y == null ? GROUND : y, vx: 0, vy: 0, kvx: 0, face: -1, home: x,
      hp: Math.round(baseHp * hpMul), max: Math.round(baseHp * hpMul), atk: Math.round(baseAtk * (elite ? 1.6 : mboss ? 1.25 : kind === 'fboss' ? 1.1 : 1)),
      def: mboss ? i * 6 : boss ? i * 5 : elite ? i * 4 : i * 3,
      name: kind === 'boss' ? s.boss_name : mboss ? s.boss_name + ' [Boss Bản Đồ]' : kind === 'fboss' ? (s.elite_name || s.boss_name) + ' [Thủ Lĩnh]' : elite ? '[Tinh Anh] ' + (s.elite_name || s.mob_name) : ranged ? (s.ranged_name || s.mob_name) : s.mob_name,
      color: kind === 'boss' || mboss ? s.boss_color : kind === 'fboss' ? (s.ranged_color || s.boss_color) : elite ? '#c89a20' : ranged ? (s.ranged_color || s.mob_color) : s.mob_color,
      scale: kind === 'boss' || mboss ? 1.0 : kind === 'fboss' ? 0.85 : elite ? 0.72 : rnd(0.55, 0.6),
      speed: boss ? 170 : elite ? 135 : rnd(105, 150), reach: boss ? 90 : elite ? 68 : 56,
      state: 'idle', st: 0, at: Math.random() * 3, aggro: !!(opt && opt.aggro), atkCd: rnd(0.5, 1.5), hitDone: false,
      stunT: 0, flash: 0, dead: false, deadT: 0, dispHp: 0, summon: !!(opt && opt.summon), walk: 0, jumpCd: rnd(0.5, 1.5), dropT: 0,
      move: null, mt: 0, mcd: 1.6, enr: false, sum60: false, sum30: false, patrolDir: Math.random() < 0.5 ? -1 : 1, patrolT: rnd(1, 3), onG: true, hw: 14, hh: 70,
    };
    e.hw = 14 * e.scale / 0.58; e.hh = 120 * e.scale;
    e.model = boss ? ((kind === 'boss' || mboss) && FEMALE_BOSS[i] ? MODELS.kunoichi : kind === 'fboss' ? MODELS.ninja : MODELS.samurai)
      : ranged ? MODELS.ninja : elite ? (i % 2 ? MODELS.ninja : MODELS.samurai) : FEMALE_STAGE[i] ? MODELS.kunoichi : (Math.random() < 0.2 ? MODELS.kunoichi : MODELS.samurai);
    e.dispHp = e.hp;
    if (!e.boss || e.fboss) { const id = opt && opt.mon != null ? opt.mon : pickMon(kind, opt && opt.seed != null ? opt.seed : Math.floor(Math.random() * 1e6)); if (id && IMG.mobs) applyMon(e, id); }
    return e;
  }
  function shade(hex, amt) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    const n = parseInt(m[1], 16); const f = v => clamp(v + amt, 0, 255);
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function spawnPoint(x, preferHigh) {
    const list = surfaceAt(x);
    if (preferHigh && list.length > 1) { const s = list[1 + Math.floor(Math.random() * (list.length - 1))]; return s.y; }
    return GROUND;
  }

  // ================= STAGE FLOW =================
  function setupStage(s, mode, net, from) {
    G.stage = s; G.mode = mode; G.shared = mode === 'world';
    G.worldW = (net && net.world_w) || WORLD_TRAIN;
    const m = genMap(s, 'train'); G.plats = m.plats; G.rocks = m.rocks; G.deco = m.deco; G.vines = m.vines;
    G.netQ = {}; G.others.clear(); G.rtMobsT = 0; G.rtStateT = 6; G.rtBeatT = 0; G.lastSent = null;
    G.p = mkPlayer(); syncStats(true); G.enemies = []; G.projs = []; G.parts = []; G.fx = []; G.texts = []; G.msgs = [];
    G.kills = 0; G.boss = null; G.killQ = { n: 0, e: 0 }; G.flushT = 0; G.deaths = 0; G.startT = G.t;
    G.combo = 0; G.camX = 0; G.camY = WORLD_H - VH; G.trainSpawnT = 0; G.input = {}; G.pressed = {};
    G.weather = []; G.slow = 1; G.slowT = 0; G.hitstop = 0; G.potCd = 0; G.fbKills = 0; G.fbLastT = G.t; G.eliteKills = 0;
    G.npcs = (Backend.NPCS || []).filter(n => +n.stage === +s.idx).concat(CAMP_NPC).map(n => Object.assign({ face: 1, model: FEMALE_NPC[n.id] ? MODELS.kunoichi : MODELS.samurai }, n));
    if (mode === 'world') (net.mobs || []).forEach(mm => { if (mm.hp > 0) spawnNet(mm); });
    else for (let x = SAFE_W + 220; x < G.worldW - SAFE_R - 120; x += rnd(280, 380)) G.enemies.push(mkEnemy(Math.random() < 0.3 ? 'ranged' : 'mob', x, spawnPoint(x, Math.random() < 0.4)));
    // Cong noi map (luyen cong / map chung): dau map -> map truoc, cuoi map -> map sau
    G.portals = []; G.portalCd = 1.2;
    if (s.idx > 1) G.portals.push({ side: -1, x: 70, to: s.idx - 1 });
    if (s.idx < STAGES().length) G.portals.push({ side: 1, x: G.worldW - 70, to: s.idx + 1 });
    G.mbKills = 0; G.mbLeft = net && net.mb_left != null ? +net.mb_left : MB_KILLS;
    G.loot.clear(); G.lootSyncT = 8; if (net && net.loot) addLoot(net.loot);
    if (from === 'right') { G.p.x = G.worldW - 260; G.p.face = -1; G.camX = Math.max(0, G.worldW - VW); }
    for (const k in SKIN_CACHE) if (!k.endsWith('|' + playerColor())) delete SKIN_CACHE[k];
    bgLayers(s);
    Music.play((s.theme && s.theme.bgm) || 'field');
    Amb.start(s.theme && s.theme.fx);
    log('== ' + s.name + (mode === 'world' ? ' (bản đồ chung - nhiều người)' : ' (tạm đánh một mình)') + ' ==');
    log(s.story);
  }

  async function enterStage(idx, mode, from) {
    if (G.busy) return;
    const s = STAGES().find(x => +x.idx === +idx);
    if (!s) { toast('Màn không tồn tại', 'err'); return; }
    if (idx > (user().stage_max || 1)) { toast('Chưa mở bản đồ ' + idx + ' - hãy hạ Boss Bản Đồ ' + (idx - 1) + ' trước', 'err'); Sfx.play('deny'); return; }
    G.busy = true;
    let r, net = null;
    if (window.RT && RT.leave) RT.leave();
    const jail = +(user().jail || 0);
    if (jail && jail !== +idx) { G.busy = false; toast('Bạn đang bị TRUY NÃ (khiêu khích ' + (user().provoke || 0) + ') - kẹt tại bản đồ ' + jail + '. Chờ giảm khiêu khích hoặc dùng Thanh Tâm Đan.', 'err'); Sfx.play('deny'); return; }
    mode = 'train';
    try { r = await Backend.startStage(idx); } catch (e) { r = { ok: false, error: e.message }; }
    if (r && r.ok && window.RT && RT.available()) {
      try { net = await RT.join(idx); } catch (e) { net = { ok: false, error: e.message }; }
      if (net && net.ok) mode = 'world'; else { toast('Bản đồ chung chưa kết nối được (' + ((net && net.error) || 'lỗi') + ') - tạm đánh một mình', 'err'); net = null; }
    }
    G.busy = false;
    if (!r || !r.ok) { toast((r && r.error) || 'Không vào được bản đồ', 'err'); return; }
    if (window.UI) UI.hideOverlays();
    setupStage(s, mode, net, from);
    if (net && window.UI && UI.mapChatHistory) UI.mapChatHistory(net.chat || []);
    // Lan dau vao ban do chua ha Boss: ke cot truyen
    const fresh = !(String(s.idx) in (user().stars || {})) && !G.introSeen[s.idx];
    if (fresh && s.intro && s.intro.length) { G.introSeen[s.idx] = 1; G.state = 'dialog'; UI.dialog(s.intro, () => { G.state = 'play'; banner(s.name, '#ffd76a', 2.5); }); }
    else { G.state = 'play'; banner(s.name, '#7cf0ff', 2.5); }
  }
  // Boss Ban Do (khi danh mot minh): xuat hien sau MB_KILLS quai
  function spawnMapBoss() {
    const s = G.stage, p = G.p, x = outSafe(p.x + (p.face || 1) * 650, 320);
    const b = mkEnemy('mboss', x, GROUND, { aggro: true }); G.enemies.push(b); G.boss = b; G.mbKills = 0;
    mapBossFx(b);
  }
  function mapBossFx(b) {
    const s = G.stage; G.boss = b;
    Music.play((s.theme && s.theme.boss_bgm) || 'boss'); Sfx.play('gong'); Sfx.play('roar'); G.shake = 0.6;
    for (let i = 0; i < 40; i++) part(b.x + rnd(-40, 40), GROUND - rnd(0, 120), rnd(-200, 200), rnd(-300, -50), rnd(0.5, 1), '#ff5030', rnd(3, 7), true);
    banner('BOSS BẢN ĐỒ XUẤT HIỆN: ' + s.boss_name, '#ff5a3a', 3);
    if (s.boss_line) log(s.boss_line);
  }
  function mapBossDown(e, mine, byName) {
    G.shake = 0.9; Sfx.play('slam'); Sfx.play('win'); G.fx.push({ type: 'flash', t: 0, dur: 0.5, col: '#fff' });
    for (let i = 0; i < 80; i++) part(e.x, e.y - 70, rnd(-500, 500), rnd(-600, 100), rnd(0.6, 1.4), i % 3 ? '#ffd24a' : '#ff5030', rnd(3, 7), true);
    banner((mine ? 'Bạn' : byName || 'Cao thủ') + ' đã hạ Boss Bản Đồ ' + G.stage.boss_name + '!', '#ffe066', 3);
    if (G.stage.outro) log(G.stage.outro);
    if (G.boss === e) G.boss = null;
    Music.play((G.stage.theme && G.stage.theme.bgm) || 'field');
  }
  function onUnlock(r) {
    if (r && r.unlock) { const st = STAGES().find(x => +x.idx === +r.unlock); banner('🔓 Mở bản đồ ' + r.unlock + (st ? ': ' + st.name : ''), '#9dff6a', 3.5); toast('Đã mở bản đồ mới: ' + (st ? st.name : r.unlock) + ' - đi qua cổng cuối bản đồ', 'ok'); }
  }
  async function mapBossReward(e) {
    for (let i = 0; i < 40 && G.flushing; i++) await new Promise(r => setTimeout(r, 100));
    await flushKills(true);
    let r;
    try { r = await Backend.mapBoss(G.stage.idx, e.x); } catch (err) { r = { ok: false, error: err.message }; }
    if (r && r.ok) { const g = r.gained || {}; log('Hạ ' + e.name + ': +' + g.exp + ' kinh nghiệm, +' + g.gold + ' ngân lượng, +' + g.ingot + ' Nguyên Bảo'); onReward(r, false); onUnlock(r); }
    else log('Hạ ' + e.name + ' (không nhận thưởng: ' + ((r && r.error) || 'lỗi') + ')');
  }
  function spawnFieldBoss() {
    const p = G.p, side = p.face || 1;
    let x = outSafe(p.x + side * 520, 240);
    const b = mkEnemy('fboss', x, GROUND, { aggro: true });
    G.enemies.push(b); G.fbKills = 0;
    Sfx.play('horn'); Sfx.play('roar'); G.shake = 0.4;
    banner('THỦ LĨNH XUẤT HIỆN: ' + b.name, '#ff7a3a', 2.6);
    for (let i = 0; i < 30; i++) part(x + rnd(-40, 40), GROUND - rnd(0, 100), rnd(-200, 200), rnd(-300, -50), rnd(0.5, 1), '#ff9a3a', rnd(3, 6), true);
  }
  function spawnElite() {
    const p = G.p; const x = outSafe(p.x + (Math.random() < 0.5 ? -1 : 1) * rnd(450, 650), 120);
    const e = mkEnemy('elite', x, spawnPoint(x, false), { aggro: true }); G.enemies.push(e);
    Sfx.play('horn'); banner('Tinh anh xuất hiện!', '#ffd24a', 1.8);
  }
  function queueKill(e) {
    if (e.boss) return;
    if (e.elite) { G.killQ.e++; G.eliteKills++; } else G.killQ.n++;
    if (!e.summon) G.kills++;
    G.lastKillX = Math.round(e.x + sign(e.x - G.p.x || 1) * 40);
    G.fbKills++;
    const s = G.stage, mul = G.mode === 'train' ? 0.7 : 1, w = e.elite ? 4 : 1;
    floatText(e.x, e.y - 125 * e.scale, '+' + Math.round(s.mob_exp * mul * w) + ' kinh nghiệm', '#9dff6a', e.elite ? 18 : 15);
    for (let i = 0; i < (e.elite ? 16 : 8); i++) part(e.x, e.y - 40, rnd(-160, 160), rnd(-420, -200), rnd(0.6, 1.0), '#ffd24a', 4, true, 'coin');
    Sfx.play('coin');
    if (G.kills > 0 && G.kills % 20 === 0) spawnElite();
    const hasFb = G.enemies.some(x => x.fboss && !x.dead);
    if (!hasFb && G.fbKills >= 30 && G.t - G.fbLastT > 45) spawnFieldBoss();
    if (!e.summon) { G.mbKills++; G.mbLeft = Math.max(0, MB_KILLS - G.mbKills); }
    if (G.mbKills >= MB_KILLS && !G.enemies.some(x => x.mboss && !x.dead)) spawnMapBoss();
  }
  async function flushKills(force) {
    if (G.flushing || (G.killQ.n + G.killQ.e) <= 0 || !G.stage) return;
    G.flushing = true;
    const n = Math.min(8, G.killQ.n), e = Math.min(4, G.killQ.e); G.killQ.n -= n; G.killQ.e -= e;
    const idx = G.stage.idx, mode = G.mode;
    let r;
    try { r = await Backend.kill(idx, n, mode, e, G.lastKillX || (G.p ? G.p.x : 0)); } catch (err) { r = { ok: false, error: err.message }; }
    G.flushing = false;
    if (!r || !r.ok) { if (r && /nhanh/i.test(r.error || '')) { G.killQ.n += n; G.killQ.e += e; } return; }
    onReward(r, false);
    if (force && (G.killQ.n + G.killQ.e) > 0) return flushKills(true);
  }
  async function fieldBossReward(e) {
    G.fbLastT = G.t;
    for (let i = 0; i < 40 && G.flushing; i++) await new Promise(r => setTimeout(r, 100));
    await flushKills(true);
    let r;
    try { r = await Backend.fieldBoss(G.stage.idx, e.x); } catch (err) { r = { ok: false, error: err.message }; }
    if (r && r.ok) {
      const g = r.gained || {}; banner('Hạ thủ lĩnh! +' + g.exp + ' kinh nghiệm', '#ffe066', 2.4);
      log('Hạ ' + e.name + ': +' + g.exp + ' kinh nghiệm, +' + g.gold + ' ngân lượng');
      onReward(r, false);
    } else log('Hạ ' + e.name + ' (không nhận thưởng: ' + ((r && r.error) || 'lỗi') + ')');
  }
  function onReward(r, big) {
    if (r && r.loot) addLoot(r.loot);
    const g = r.gained || {};
    if (g.items && G.p) for (const k in g.items) {
      const it = Backend.itemOf(k); const nm = it ? it.name : k;
      if (!big) floatText(G.p.x, G.p.y - 150, '+' + g.items[k] + ' ' + nm, '#7cf0ff', 14);
    }
    if (g.gold && !big && G.p) floatText(G.p.x + 30, G.p.y - 130, '+' + g.gold + ' ngân lượng', '#ffd24a', 13);
    if (r.ups > 0) levelUp(r.ups);
    else syncStats(false);
  }
  function levelUp(n) {
    syncStats(true);
    const p = G.p; if (!p) return; Sfx.play('levelup'); G.shake = 0.3;
    banner('THĂNG CẤP! Cấp ' + p.level, '#ffe066', 2.6);
    G.fx.push({ type: 'pillar', x: p.x, y: p.y, t: 0, dur: 1.2 });
    for (let i = 0; i < 60; i++) part(p.x + rnd(-30, 30), p.y - rnd(0, 20), rnd(-60, 60), rnd(-600, -200), rnd(0.6, 1.3), i % 2 ? '#ffe066' : '#fff6c0', rnd(3, 6), true);
    log('Thăng cấp Cấp ' + p.level + '! Máu ' + p.maxhp + ' | Nội lực ' + p.maxmp + ' | Công ' + p.atk + ' | Thủ ' + p.def);
    if (!user().sect && p.level >= SECT_LV && p.level - n < SECT_LV) { banner('Đạt cấp ' + SECT_LV + ': hãy bái nhập môn phái!', '#ffb030', 4); log('Đã đủ cấp ' + SECT_LV + ' - bái nhập môn phái để mở tuyệt kỹ môn phái.'); }
    skills().forEach(sk => { if (!sk.sectLock && sk.lv > p.level - n && sk.lv <= p.level) { banner('Lĩnh ngộ: ' + sk.name + ' [' + sk.key + ']', '#7cf0ff', 3.2); log('Mở khóa ' + sk.name + ' (phím ' + sk.key + ')'); } });
  }
  function leaveStage() {
    flushKills(true);
    if (window.RT && RT.leave) RT.leave();
    G.shared = false; G.others.clear();
    G.state = 'title'; G.enemies = []; G.projs = []; G.fx = []; G.boss = null; G.input = {}; G.pressed = {};
    Music.play('town'); Amb.stop();
    if (window.UI) UI.showHome();
  }

  // ================= MAP CHUNG (realtime) =================
  function tierY(x, tier) {
    const ys = surfaceAt(x).map(s => s.y).sort((a, b) => b - a);
    return ys[Math.min(tier | 0, ys.length - 1)] || GROUND;
  }
  function findMob(mid) { return G.enemies.find(e => e.shared && e.mid === mid && !e.dead) || null; }
  const e_margin = k => k === 'mboss' || k === 'fboss' ? 240 : 80;
  function spawnNet(m) {
    G.enemies = G.enemies.filter(e => !(e.shared && e.mid === m.mid && !e.dead));
    const mx = outSafe(+m.x, e_margin(m.kind)), e = mkEnemy(m.kind, mx, tierY(mx, m.tier), { seed: +m.mid * 7 + (+G.stage.idx || 0) }); // giong nhau tren moi may
    e.mid = m.mid; e.shared = true; e.hp = m.hp; e.max = m.max; e.dispHp = m.hp; e.home = mx;
    G.enemies.push(e);
    if (e.mboss) G.boss = e;
    return e;
  }
  // Moi quai chi tinh 1 lan / 1 lan thi trien (giong may chu), toi da NET_SK[sk][1] muc tieu. Tra ve true neu la lan trung moi.
  function queueNetHit(e, sk, cast) {
    const k = sk + ':' + cast;
    const q = G.netQ[k] || (G.netQ[k] = { sk, cast, ids: new Set(), sent: new Set(), t: G.t });
    if (q.sent.has(e.mid) || q.ids.has(e.mid) || q.ids.size + q.sent.size >= (NET_SK[sk] || NET_SK.atk)[1]) return false;
    q.ids.add(e.mid); return true;
  }
  // Gom tat ca lan trung trong ~0.1s vao 1 yeu cau, chi 1 yeu cau dang cho tai 1 thoi diem -> khong xep hang, phan hoi nhanh
  function flushNetHits() {
    if (!hasRT() || G.netBusy || G.t - (G.netSentT || 0) < 0.09) return;
    const parts = [], xs = [];
    for (const k in G.netQ) {
      const q = G.netQ[k];
      if (q.ids.size) { const ids = Array.from(q.ids); q.ids.clear(); ids.forEach(i => { q.sent.add(i); const e = findMob(i); if (e) xs.push(e.x); }); parts.push(q.sk + ':' + q.cast + ':' + ids.join(',')); }
      else if (G.t - q.t > 4) delete G.netQ[k];
    }
    if (!parts.length) return;
    const mx = xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : G.p.x;
    G.netBusy = true; G.netSentT = G.t;
    RT.hitBatch(parts.join(';'), Math.round(mx + sign(mx - G.p.x || 1) * 40)).then(onNetHit, () => { }).then(() => { G.netBusy = false; });
  }
  function hitFx(e, d, crit, col, mine) {
    e.flash = 0.12; e.aggro = true;
    floatText(e.x + rnd(-15, 15), e.y - 118 * e.scale, (crit ? '暴 ' : '') + d, mine ? (crit ? '#ff4040' : (col || '#fff')) : '#b8c0d8', mine ? (crit ? 26 : 19) : 14, crit && mine);
    const hx = e.x, hy = e.y - 55 * e.scale;
    if (G.hitN++ < (MOBILE ? 4 : 8)) for (let i = 0; i < (crit ? 10 : 5); i++) part(hx, hy, rnd(-300, 300), rnd(-300, 100), rnd(0.2, 0.45), crit ? '#ff6a3a' : (col || '#fff3b0'), rnd(2, 4), true);
    if (mine) { G.fx.push({ type: 'hit', x: hx, y: hy, t: 0, dur: 0.15, col: col || '#fff' }); Sfx.play(crit ? 'crit' : 'hit'); G.combo++; G.comboT = 2.2; }
  }
  function netKill(e, byName, mine) {
    e.hp = 0; e.dead = true; e.state = 'dead'; e.st = 0; e.deadT = 0; e.walk = 0;
    for (let i = 0; i < (e.elite || e.fboss ? 16 : 8); i++) part(e.x, e.y - 40, rnd(-160, 160), rnd(-420, -200), rnd(0.6, 1.0), '#ffd24a', 4, true, mine ? 'coin' : '');
    if (mine) Sfx.play('coin');
    if (e.mboss) mapBossDown(e, mine, byName);
    else if (e.fboss) { G.shake = 0.5; Sfx.play('slam'); banner((mine ? 'Bạn' : byName) + ' hạ ' + e.name + '!', '#ffe066', 2.4); }
    else if (!mine && e.elite) log(byName + ' hạ ' + e.name);
  }
  function onNetHit(r) {
    if (!r || !r.ok) { if (r && !r.cd && G.t - G.netErrT > 5) { G.netErrT = G.t; log(r.error || 'Đường truyền chậm, thử lại'); } return; }
    if (!G.shared) return;
    (r.res || []).forEach(x => { const e = findMob(x.mid); if (!e) return; e.hp = x.hp; if (x.dead) netKill(e, 'Bạn', true); }); // so da hien luc trung (du doan)
    if (r.fboss) { spawnNet(r.fboss); Sfx.play('horn'); banner('THỦ LĨNH XUẤT HIỆN!', '#ff7a3a', 2.6); }
    if (r.mboss) mapBossFx(spawnNet(r.mboss));
    if (r.mb_left != null) G.mbLeft = +r.mb_left;
    if (r.user) Backend._set(r.user);
    const g = r.gained || {};
    if (g.exp) floatText(G.p.x, G.p.y - 140, '+' + g.exp + ' kinh nghiệm', '#9dff6a', 16);
    if (r.mb) toast('👑 Hạ Boss Bản Đồ: +' + g.exp + ' kinh nghiệm, +' + g.gold + ' ngân lượng, +' + g.ingot + ' Nguyên Bảo', 'ok');
    onReward(r, false); onUnlock(r);
  }
  function bindRT() {
    if (!window.RT) return;
    RT.on('move', (id, d) => {
      if (!G.shared) return;
      const info = RT.members[id] || {}, o = G.others.get(id);
      const ny = clamp(+d.y || GROUND, 40, GROUND), nx = +d.x || 0;
      const v = { tx: nx, ty: ny, face: +d.f < 0 ? -1 : 1, anim: ANIM[d.a] ? d.a : 'idle', hp: +d.hp || 0, maxhp: Math.max(1, +d.mhp || 1), name: info.name || ('#' + id), lv: info.lv || 1, sect: info.sect || '', av: MODELS[d.av] ? d.av : (info.av || 'samurai'), wing: d.w == null ? -1 : (+d.w | 0), seen: G.t };
      // uoc tinh van toc tu 2 goi tin lien tiep -> du doan vi tri giua cac goi (do khung giat)
      if (o) { const gap = G.t - (o.seen || 0); v.vx = gap > 0.03 && gap < 1 ? clamp((nx - o.tx) / gap, -1500, 1500) : 0; v.vy = gap > 0.03 && gap < 1 ? clamp((ny - o.ty) / gap, -2500, 2500) : 0; if (Math.abs(nx - o.x) > 700) { o.x = nx; o.y = ny; } Object.assign(o, v); }
      else G.others.set(id, Object.assign({ x: nx, y: ny, vx: 0, vy: 0 }, v));
    });
    RT.on('member_removed', id => { G.others.delete(+id); delete G.bubbles[id]; });
    RT.on('members', () => { G.lastSent = null; });
    RT.on('member_added', (id, info) => { G.lastSent = null; if (G.shared) log((info.name || 'Người chơi') + ' vào bản đồ'); });
    RT.on('mobs', list => {
      if (!G.shared) return;
      list.forEach(r => { const e = findMob(r[0]); if (e) { e.netX = r[1]; e.netY = r[2]; e.netF = r[3]; e.netT = G.t; } });
    });
    RT.on('mob_hit', d => {
      if (!G.shared) return;
      (d.res || []).forEach(x => { const e = findMob(x.mid); if (!e) return; hitFx(e, x.dmg, x.crit, null, false); e.hp = x.hp; if (x.dead) netKill(e, d.name || 'Người chơi', false); });
    });
    RT.on('mob_spawn', d => {
      if (!G.shared) return;
      (d.mobs || []).forEach(m => { if (m.hp > 0 && !findMob(m.mid)) { const e = spawnNet(m); if (e.mboss) mapBossFx(e); } });
      if (d.boss) { Sfx.play('horn'); Sfx.play('roar'); banner('THỦ LĨNH XUẤT HIỆN!', '#ff7a3a', 2.6); }
    });
    RT.on('loot_drop', d => { if (G.shared) addLoot(d.loot || []); });
    RT.on('loot_take', d => {
      const l = G.loot.get(+d.id); if (!l) return;
      G.loot.delete(+d.id);
      if (+d.by !== +user().id) floatText(l.x, GROUND - 60, (d.name || 'Người chơi') + ' nhặt ' + lootName(l), '#c8d8ff', 13);
    });
    RT.on('chat', d => { G.bubbles[d.uid] = { text: d.text, t: G.t }; if (window.UI && UI.mapChat) UI.mapChat(d.name, d.text, false); });
    RT.on('reward', d => { toast(d.text, 'ok'); log(d.text); Backend.refresh(); });
    RT.on('error', m => toast(m, 'err'));
  }
  function updateNet(dt) {
    if (!hasRT()) return;
    flushNetHits();
    const p = G.p;
    // vi tri cua minh (chi gui khi thay doi / dinh ky)
    G.rtBeatT -= dt;
    const st = { x: Math.round(p.x), y: Math.round(p.y), f: p.face, a: p.dead ? 'dead' : (p.anim === 'throw' ? 'atk2' : p.anim), hp: Math.max(0, Math.round(p.hp)), mhp: p.maxhp, av: pModel().key, w: p.wing };
    const ls = G.lastSent;
    if (!ls || Math.abs(ls.x - st.x) > 3 || Math.abs(ls.y - st.y) > 3 || ls.a !== st.a || ls.f !== st.f || G.rtBeatT <= 0) {
      if (RT.othersCount()) { RT.sendMove(st); G.lastSent = st; G.rtBeatT = 2.5; }
    }
    // host dong bo vi tri quai
    G.rtMobsT -= dt;
    if (G.rtMobsT <= 0) {
      G.rtMobsT = 0.5;
      if (RT.isHost()) RT.sendMobs(G.enemies.filter(e => e.shared && !e.dead).map(e => [e.mid, Math.round(e.x), Math.round(e.y), e.face]));
    }
    // dong bo lai trang thai + kich hoat hoi sinh
    G.rtStateT -= dt;
    if (G.rtStateT <= 0) {
      G.rtStateT = 6;
      RT.state().then(r => {
        if (!r || !r.ok || !G.shared) return;
        if (r.mb_left != null) G.mbLeft = +r.mb_left;
        if (r.loot) syncLoot(r.loot);
        const alive = new Set();
        r.mobs.forEach(m => {
          const e = findMob(m.mid);
          if (m.hp > 0) { alive.add(m.mid); if (!e) spawnNet(m); else { e.hp = m.hp; e.max = m.max; } }
          else if (e) netKill(e, '', false);
        });
        G.enemies.forEach(e => { if (e.shared && !e.dead && !alive.has(e.mid)) { e.dead = true; e.state = 'dead'; e.deadT = 1.2; } });
      });
    }
    // xoa nguoi choi khong con cap nhat
    G.others.forEach((o, id) => { if (G.t - (o.seen || 0) > 12 && !RT.members[id]) G.others.delete(id); });
  }

  // ================= COMBAT =================
  function playerAtk() { const p = G.p; return p.atk * (p.buffT > 0 ? 1.3 : 1); }
  // Ban do chung: may chu tinh sat thuong that; client hien NGAY so du doan (cung cong thuc rt.php) cho muot, mau that cap nhat khi may chu tra ve
  function netPredict(e, sk) {
    const k = NET_SK[sk] || NET_SK.atk, idx = +G.stage.idx || 1, p = G.p;
    const mdef = e.mboss ? idx * 6 : e.fboss ? idx * 5 : e.elite ? idx * 4 : idx * 3;
    const crit = Math.random() < Math.min(0.6, k[2] + Math.max(0, ((p.crit || 12) - 12) / 100));
    const d = Math.max(1, Math.round(Math.max(1, playerAtk() * k[0] * (sk === 'atk' ? 1 : 1 + (p.mag || 0) / 100) - mdef * 0.5) * rnd(0.9, 1.1) * (crit ? 1.8 : 1)));
    return { d, crit };
  }
  function hitSpark(e, col, crit, n) {
    const hx = e.x, hy = e.y - 55 * e.scale, rich = G.hitN++ < (MOBILE ? 4 : 8);
    e.flash = 0.12;
    if (!rich) return;
    for (let i = 0; i < (n || (crit ? 12 : 7)); i++) { const a = Math.random() * 6.28, v = rnd(250, 600); part(hx, hy, Math.cos(a) * v, Math.sin(a) * v - 120, rnd(0.16, 0.36), crit ? '#ff8a3a' : (col || '#fff3b0'), rnd(1.5, 3), true, 'streak'); }
    G.fx.push({ type: 'hit', x: hx, y: hy, t: 0, dur: crit ? 0.26 : 0.18, col: col || '#fff', big: crit });
  }
  function hitEnemy(e, mult, o) {
    if (e.dead) return 0;
    o = o || {};
    if (G.shared && e.shared) {
      const dir = o.dir || sign(e.x - G.p.x);
      if (o.stun && !e.fboss) e.stunT = Math.max(e.stunT, e.boss ? o.stun * 0.3 : e.elite ? o.stun * 0.6 : o.stun);
      if (o.knock && !e.boss) e.kvx = dir * o.knock * (e.elite ? 0.5 : 1);
      if (!o.sk || !queueNetHit(e, o.sk, o.cast || 0)) { hitSpark(e, o.col, false, 3); return 0; } // da tinh trong lan thi trien nay
      const pr = netPredict(e, o.sk); e.aggro = true;
      floatText(e.x + rnd(-15, 15), e.y - 118 * e.scale, (pr.crit ? '暴 ' : '') + pr.d, pr.crit ? '#ff4040' : (o.col || '#ffffff'), pr.crit ? 26 : 19, pr.crit);
      hitSpark(e, o.col, pr.crit); Sfx.play(pr.crit ? 'crit' : 'hit');
      e.hp = Math.max(1, e.hp - pr.d); // tam thoi (khong giet), may chu se gui mau that
      if (!e.boss && !e.elite && e.state !== 'dead') { e.state = 'hurt'; e.st = 0; }
      G.combo++; G.comboT = 2.2;
      return pr.d;
    }
    const magK = o.sk && o.sk !== 'atk' ? 1 + (G.p.mag || 0) / 100 : 1;
    let d = Math.max(1, playerAtk() * mult * magK - e.def * 0.5) * rnd(0.9, 1.1);
    const crit = Math.random() < (o.crit || 0.12) + Math.max(0, ((G.p.crit || 12) - 12) / 100); if (crit) d *= 1.8;
    d = Math.round(d); e.hp -= d; e.flash = 0.12; e.aggro = true;
    floatText(e.x + rnd(-15, 15), e.y - 118 * e.scale, (crit ? '暴 ' : '') + d, crit ? '#ff4040' : (o.col || '#ffffff'), crit ? 26 : 19, crit);
    hitSpark(e, o.col, crit);
    Sfx.play(crit ? 'crit' : 'hit');
    const dir = o.dir || sign(e.x - G.p.x);
    if (!e.boss) {
      if (o.knock) { e.kvx = dir * o.knock * (e.elite ? 0.5 : 1); }
      if (e.state !== 'dead' && !e.elite) { e.state = 'hurt'; e.st = 0; }
      if (o.up && !e.elite) e.vy = -o.up;
    }
    if (o.stun) e.stunT = Math.max(e.stunT, e.boss ? o.stun * 0.3 : e.elite ? o.stun * 0.6 : o.stun);
    G.combo++; G.comboT = 2.2;
    // dung hinh ngan chi cho don don/chi mang, toi da 1 lan / 0.18s (tranh khung giat khi danh trung nhieu quai)
    if ((o.sk === 'atk' || o.sk === 'dl' || crit) && G.t - (G.hsT || 0) > 0.18) { G.hitstop = crit ? 0.045 : 0.025; G.hsT = G.t; }
    if (e.hp <= 0) killEnemy(e);
    return d;
  }
  function killEnemy(e) {
    if (G.shared && e.shared) return;
    e.hp = 0; e.dead = true; e.state = 'dead'; e.st = 0; e.deadT = 0; e.kvx = sign(e.x - G.p.x) * 120; e.walk = 0;
    if (e.mboss) { mapBossDown(e, true); mapBossReward(e); }
    else if (e.fboss) {
      G.shake = 0.5; Sfx.play('slam');
      for (let i = 0; i < 50; i++) part(e.x, e.y - 60, rnd(-400, 400), rnd(-500, 100), rnd(0.6, 1.2), i % 2 ? '#ffd24a' : '#ff7a3a', rnd(3, 6), true);
      fieldBossReward(e);
    } else queueKill(e);
  }
  // PK: 0 hoa binh, 1 PK bang (khong danh nguoi cung bang), 2 do sat. Server tinh sat thuong + diem thien/khieu khich
  function pkMode() { return +(user().pk_mode || 0); }
  function canPk(id) {
    const u = user(), info = G.pkInfo[id] || {};
    if (pkMode() <= 0 || (u.level || 1) < 10 || (+info.lv || 0) < 10) return false;
    if (pkMode() === 1 && u.guild_id && +info.g === +u.guild_id) return false;
    return true;
  }
  function tryPvp(mult, o) {
    if (!pkMode() || !G.onPvpHit || !o || !o.box) return;
    G.others.forEach((ot, id) => {
      if (ot.x > o.box[0] && ot.x < o.box[1] && Math.abs(ot.y - G.p.y) < 120 && !inSafe(ot.x) && !inSafe(G.p.x) && canPk(id)) { ot.fightT = G.t; G.onPvpHit(id, mult, ot.name); }
    });
  }
  function nameCol(id, def) { const i = G.pkInfo[id]; if (!i) return def; return +i.prov >= 100 ? '#ff4040' : +i.prov >= 50 ? '#ff9a3a' : +i.pk > 0 ? '#d08aff' : def; }
  function hurtPlayer(raw, src, mult) {
    const p = G.p;
    if (!p || p.dead || p.invT > 0 || p.dashT > 0 || G.state !== 'play' || inSafe(p.x)) return;
    // Thu giam % sat thuong (khong bao gio ve 0): 150/(150+thu). Quai danh dau that.
    let d = Math.max(1, Math.round(raw * (mult || 1) * MOB_DMG * (150 / (150 + Math.max(0, p.def))) * rnd(0.9, 1.1)));
    if (p.shield > 0) { const a = Math.min(p.shield, d); p.shield -= a; d -= a; floatText(p.x, p.y - 120, 'Khiên -' + a, '#ffd24a', 14); }
    p.invT = 0.4; p.lastHurt = G.t;
    if (d <= 0) return;
    p.hp -= d; p.hurtT = 0.22;
    if (src) p.vx = sign(p.x - src.x) * 260;
    G.shake = Math.max(G.shake, 0.18); G.vignette = 0.5; Sfx.play('hurt');
    floatText(p.x, p.y - 110, '-' + d, '#ff5050', 20);
    for (let i = 0; i < 8; i++) part(p.x, p.y - 50, rnd(-200, 200), rnd(-250, 50), rnd(0.2, 0.5), '#ff4040', 3, false);
    if (p.hp <= 0) playerDie();
  }
  function playerDie() {
    const p = G.p; p.hp = 0; p.dead = true; p.deadT = 0; p.atkT = 0; p.dashT = 0; p.shield = 0; G.deaths++; Sfx.play('die'); log('Trọng thương!');
  }
  function revive() {
    const p = G.p; if (!p) return;
    p.dead = false; p.hp = p.maxhp; p.mp = p.maxmp; p.invT = 2.5;
    G.state = 'play'; G.input = {}; G.pressed = {}; banner('Hồi sinh!', '#9dff6a', 1.5);
    G.enemies.forEach(e => { if (!e.dead && Math.abs(e.x - p.x) < 260 && Math.abs(e.y - p.y) < 150) { e.kvx = sign(e.x - p.x) * 500; } });
    G.fx.push({ type: 'ring', x: p.x, y: p.y - 40, t: 0, dur: 0.6, r: 260, col: '#9dff6a' });
  }

  // ---------- skills ----------
  function useSkill(id) {
    const p = G.p, sk = skills().find(s => s.id === id);
    if (!p || !sk || G.state !== 'play' || p.dead) return;
    if (skLocked(sk, p.level)) { if (id !== 'atk') { floatText(p.x, p.y - 130, sk.sectLock ? 'Cần bái nhập môn phái (cấp ' + SECT_LV + ')' : 'Cần Cấp ' + sk.lv, '#aaa', 14); Sfx.play('deny'); } return; }
    if ((p.cds[id] || 0) > 0) return;
    if (p.mp < sk.mp) { floatText(p.x, p.y - 130, 'Thiếu nội lực!', '#5ab0ff', 14); Sfx.play('deny'); return; }
    if (p.atkT > 0 && id === 'atk') return;
    p.mp -= sk.mp; p.cds[id] = sk.cd; G.punch = Math.max(G.punch, id === 'atk' ? 0.15 : id === 'ult' ? 1 : 0.5);
    const S = sect(), col = sk.col, wcol = WEAPON_COL[p.weapon] || '#fff';
    const cast = G.shared && window.RT ? RT.newCast() : 0;
    if (id === 'atk') p.castAtk = cast;
    if (id === 'cd' && hasRT()) RT.hit('cd', cast, [], p.x);
    switch (id) {
      case 'atk': {
        p.comboFlip = !p.comboFlip; p.atkAnim = p.comboFlip ? 'atk1' : 'atk2'; p.atkT = 0.3; p.atkDur = 0.3; p.atkHit = false;
        Sfx.play('slash');
        G.fx.push({ type: 'slash', x: p.x, y: p.y, face: p.face, t: 0, dur: 0.2, col: p.weapon === 'dao_thuong' ? col : wcol, flip: p.comboFlip });
        break;
      }
      case 'tt': {
        p.atkAnim = pModel().native > 0 ? 'throw' : 'atk2'; p.atkT = 0.35; p.atkDur = 0.35; p.atkHit = true;
        const kind = S.proj || 'orb';
        const cols = kind === 'orb' && S.id === 'minh_giao' ? ['#ff4a3a', '#ff9a3a', '#ffe03a', '#6aff5a', '#3ad8ff', '#5a7aff', '#d05aff'] : [col, shade(col, 30), col, shade(col, -30), col, shade(col, 30), col];
        const cnt = kind === 'needle' ? 9 : 7;
        for (let k = 0; k < cnt; k++) setTimeout(() => {
          if (!G.p || G.state !== 'play' || G.p.dead) return;
          const q = G.p;
          const sp = kind === 'needle' ? 1100 : kind === 'sword' ? 900 : kind === 'petal' ? 700 : 820;
          G.projs.push({ owner: 'p', kind: 'p_' + kind, x: q.x + q.face * 34, y: q.y - 46 + Math.sin(k * 1.7) * (kind === 'petal' ? 22 : 10), vx: q.face * sp, vy: kind === 'petal' ? Math.sin(k) * 60 : 0,
            r: kind === 'needle' ? 10 : 16, life: kind === 'needle' ? 0.5 : 0.62, mult: kind === 'needle' ? 0.38 : 0.48, hit: new Set(), col: cols[k % cols.length], trail: [], knock: 60, rot: 0, face: q.face, sk: 'tt', cast });
          Sfx.play(kind === 'needle' ? 'needle' : kind === 'sword' ? 'swordfly' : kind === 'petal' ? 'petal' : 'fist');
        }, k * (kind === 'needle' ? 40 : 55));
        break;
      }
      case 'sth': {
        p.atkAnim = 'atk2'; p.atkT = 0.5; p.atkDur = 0.5; p.atkHit = true;
        Sfx.play('roar'); G.shake = 0.7;
        for (let k = 0; k < 3; k++) G.fx.push({ type: 'ring', x: p.x, y: p.y - 50, t: -k * 0.13, dur: 0.7, r: 430, col });
        G.fx.push({ type: 'glyph', ch: sk.glyph, x: p.x, y: p.y - 140, t: 0, dur: 0.9, col });
        G.enemies.forEach(e => { if (!e.dead && Math.abs(e.x - p.x) < 430 && Math.abs(e.y - p.y) < 300) hitEnemy(e, 1.6, { stun: 1.8, knock: 380, col, dir: sign(e.x - p.x), sk: 'sth', cast }); });
        tryPvp(1.6, { box: [p.x - 430, p.x + 430] });
        G.projs = G.projs.filter(b => !(b.owner === 'e' && Math.abs(b.x - p.x) < 430 && Math.abs(b.y - p.y) < 300));
        break;
      }
      case 'dl': {
        p.atkAnim = 'atk1'; p.atkT = 0.4; p.atkDur = 0.4; p.atkHit = true;
        p.dashT = 0.16; p.vx = p.face * 1300; p.invT = Math.max(p.invT, 0.35);
        Sfx.play('blade'); G.shake = 0.35;
        G.fx.push({ type: 'flash', t: 0, dur: 0.18, col: '#ffe9a0' });
        G.projs.push({ owner: 'p', kind: 'crescent', x: p.x + p.face * 55, y: p.y - 48, vx: p.face * 950, vy: 0, r: 95, life: 0.75, mult: 2.6, hit: new Set(), col, face: p.face, knock: 420, up: 380, sk: 'dl', cast });
        break;
      }
      case 'cd': {
        const heal = Math.round(p.maxhp * 0.3);
        p.hp = Math.min(p.maxhp, p.hp + heal); p.shield = Math.round(p.maxhp * 0.25); p.shieldT = 10; p.buffT = 10;
        Sfx.play('heal'); floatText(p.x, p.y - 130, '+' + heal, '#9dff6a', 22);
        G.fx.push({ type: 'sun', x: p.x, y: p.y - 50, t: 0, dur: 1.0, col, ch: sk.glyph });
        for (let i = 0; i < 40; i++) part(p.x + rnd(-50, 50), p.y - rnd(0, 90), rnd(-30, 30), rnd(-300, -80), rnd(0.6, 1.2), col, rnd(3, 6), true);
        break;
      }
      case 'ult': {
        p.atkAnim = 'atk2'; p.atkT = 0.6; p.atkDur = 0.6; p.atkHit = true; p.invT = Math.max(p.invT, 1.8);
        const u = S.ult || 'dragon';
        Sfx.play(u === 'dragon' ? 'dragon' : u === 'swords' ? 'blade' : u === 'palm' ? 'gong' : 'roar'); Sfx.play('roar'); G.shake = 1.2;
        const f = { type: 'ult_' + u, t: 0, dur: 1.9, dir: p.face, ticks: 0, col, items: [], cast };
        if (u === 'swords') for (let i = 0; i < 36; i++) f.items.push({ x: rnd(40, W - 40), d: rnd(0, 1.3), len: rnd(70, 120) });
        G.fx.push(f); G.fx.push({ type: 'dark', t: 0, dur: 1.9 });
        banner(sk.name + '!', col, 1.6);
        break;
      }
      case 'vx': {
        p.atkAnim = 'atk2'; p.atkT = 0.4; p.atkDur = 0.4; p.atkHit = true;
        Sfx.play('blade'); Sfx.play('dash'); G.shake = 0.4;
        G.fx.push({ type: 'vortex', t: 0, dur: 2.2, col, ticks: 0, cast, ch: sk.glyph });
        break;
      }
    }
  }
  function usePotion(code) {
    const p = G.p; if (!p || p.dead || G.state !== 'play' || G.potCd > 0) return;
    const have = (user().inv || {})[code] || 0;
    const nm = code === 'binh_hp' ? 'Kim Sang Dược' : 'Cửu Chuyển Đan';
    if (have <= 0) { floatText(p.x, p.y - 130, 'Hết ' + nm + '!', '#aaa', 14); Sfx.play('deny'); return; }
    if (code === 'binh_hp' && p.hp >= p.maxhp) { floatText(p.x, p.y - 130, 'Máu đang đầy', '#aaa', 14); return; }
    if (code === 'binh_mp' && p.mp >= p.maxmp) { floatText(p.x, p.y - 130, 'Nội lực đang đầy', '#aaa', 14); return; }
    G.potCd = 1.5;
    if (code === 'binh_hp') { const h = Math.round(p.maxhp * 0.4); p.hp = Math.min(p.maxhp, p.hp + h); floatText(p.x, p.y - 130, '+' + h + ' máu', '#9dff6a', 18); }
    else { const m = Math.round(p.maxmp * 0.5); p.mp = Math.min(p.maxmp, p.mp + m); floatText(p.x, p.y - 130, '+' + m + ' nội lực', '#5ab0ff', 18); }
    Sfx.play('potion');
    for (let i = 0; i < 18; i++) part(p.x + rnd(-25, 25), p.y - rnd(10, 80), 0, rnd(-160, -60), rnd(0.4, 0.9), code === 'binh_hp' ? '#9dff6a' : '#5ab0ff', 3, true);
    Backend.useItem(code).then(r => { if (!r || !r.ok) log('Lỗi dùng thuốc: ' + ((r && r.error) || '')); });
  }

  // ================= PARTICLES / TEXT =================
  function part(x, y, vx, vy, life, col, size, add, kind) {
    if (G.parts.length > (MOBILE ? 380 : 700)) return; // het ngan sach hat -> bo qua (shift() tren mang lon ton kem)
    G.parts.push({ x, y, vx, vy, life, max: life, col, size: size || 3, add: !!add, kind: kind || '' });
  }
  function floatText(x, y, txt, col, size, big) { if (G.texts.length > 80) G.texts.shift(); G.texts.push({ x, y, txt: String(txt), col, size: size || 16, t: 0, dur: big ? 1.1 : 0.9, vy: big ? -70 : -55 }); }

  // ================= UPDATE =================
  function update(dt) {
    G.t += dt; G.hitN = 0; // dem so lan trung trong khung hinh -> gioi han hieu ung

    for (let i = G.msgs.length - 1; i >= 0; i--) { G.msgs[i].t += dt; if (G.msgs[i].t > G.msgs[i].dur) G.msgs.splice(i, 1); }
    updateWeather(dt);
    if (G.state !== 'play') { updateParticles(dt * 0.5); return; }
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    if (G.slowT > 0) { G.slowT -= dt; if (G.slowT <= 0) G.slow = 1; dt *= G.slow; }
    G.flushT += dt; if (G.flushT > 0.6) { G.flushT = 0; flushKills(false); }
    if (G.p.dead && G.p.deadT > 1.3) { G.state = 'dead'; G.input = {}; UI.result({ win: false, stage: G.stage }); return; }
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    if (G.potCd > 0) G.potCd -= dt;
    G.shake = Math.max(0, G.shake - dt * 2); G.vignette = Math.max(0, G.vignette - dt * 1.5);
    updatePlayer(dt);
    for (const e of G.enemies) e.boss ? bossAI(e, dt) : mobAI(e, dt);
    for (const e of G.enemies) physEnemy(e, dt);
    separate();
    G.enemies = G.enemies.filter(e => !(e.dead && e.deadT > 1.6));
    updateProjs(dt);
    updateFx(dt);
    updateParticles(dt);
    G.others.forEach(o => {
      const ahead = Math.min(Math.max(0, G.t - (o.seen || G.t)), 0.25); // ngoai suy toi da 0.25s sau goi tin cuoi
      const gx = o.tx + (o.vx || 0) * ahead, gy = clamp(o.ty + (o.vy || 0) * ahead, 40, GROUND), k = Math.min(1, dt * 14);
      o.x += (gx - o.x) * k; o.y += (gy - o.y) * k; o.moving = Math.abs(o.vx || 0) > 20 || Math.abs(gx - o.x) > 3;
    });
    if (G.mode === 'train') trainSpawner(dt);
    if (G.shared) updateNet(dt);
    if (G.portals.length) updatePortals(dt);
    updateLoot(dt);
    const p = G.p;
    const tx = clamp(p.x - VW * 0.42 + p.face * 40, 0, Math.max(0, G.worldW - VW));
    const ty = clamp(p.y - VH * 0.72, 0, WORLD_H - VH);
    G.camX += (tx - G.camX) * Math.min(1, dt * 5);
    G.camY += (ty - G.camY) * Math.min(1, dt * 4);
  }
  // Bam vao nguoi choi / NPC -> nhan vat tu chay toi (huy khi tu bam di chuyen, bi ket hoac qua 12s)
  function walkTo(kind, ref, range, onArrive) { G.walkTo = { kind, ref, range, onArrive, t: 0, lastX: G.p ? G.p.x : 0, stuck: 0 }; }
  function autoWalk(p, dt) {
    const w = G.walkTo, tgt = w.kind === 'player' ? G.others.get(w.ref) : w.ref;
    if (!tgt || p.dead || (w.t += dt) > 12) { G.walkTo = null; return 0; }
    const dx = tgt.x - p.x;
    if (Math.abs(dx) <= w.range) { G.walkTo = null; p.face = dx >= 0 ? 1 : -1; if (w.onArrive) w.onArrive(); return 0; }
    w.stuck = Math.abs(p.x - w.lastX) < 0.5 ? w.stuck + dt : 0; w.lastX = p.x;
    if (w.stuck > 0.8) { G.walkTo = null; return 0; } // vuong tuong
    return dx > 0 ? 1 : -1;
  }
  function updatePlayer(dt) {
    const p = G.p, I = G.input;
    for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
    p.invT = Math.max(0, p.invT - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.dashCd = Math.max(0, p.dashCd - dt);
    if (p.buffT > 0) p.buffT -= dt;
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }
    p.at += dt;
    if (p.dead) { p.deadT += dt; p.vx *= 0.9; physMove(p, p.vx, dt); return; }
    p.mp = Math.min(p.maxmp, p.mp + (4 + p.maxmp * 0.01) * dt);
    if (G.t - p.lastHurt > 6) p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.008 * dt); // hoi mau cham khi khong bi danh
    if (inSafe(p.x)) { p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.05 * dt); p.mp = Math.min(p.maxmp, p.mp + p.maxmp * 0.05 * dt); } // nghi ngoi trong doanh trai
    let mv = 0;
    if (I.left) mv -= 1; if (I.right) mv += 1;
    if (!mv && G.walkTo) mv = autoWalk(p, dt);
    // leo day: dung o day, giu Nhay -> leo len; giu Xuong khi dang tren khong -> tut xuong; bam trai/phai -> buong day
    const vn = p.dashT > 0 || p.flying ? null : vineAt(p);
    if (p.climb && (!vn || (mv && !I.jump && !I.down))) p.climb = false;
    if (vn && !p.climb && ((I.jump && !mv && p.y > vn.top + 6) || (I.down && !p.onG && p.y < vn.bot - 6 && p.y > vn.top - 2))) { p.climb = true; p.jumps = 0; p.flipT = 0; p.vx = 0; }
    if (p.climb) {
      G.pressed.jump = false; p.jbuf = 0; p.coyote = 0; p.dropT = Math.max(p.dropT || 0, 0.06); // xuyen qua be 1 chieu khi dang leo
      p.vy = I.jump ? -CLIMB_V : I.down ? CLIMB_V : 0; p.vx = 0; p.x += (vn.x - p.x) * Math.min(1, dt * 12);
      if (I.jump) { G.climbSndT = (G.climbSndT || 0) - dt; if (G.climbSndT <= 0) { G.climbSndT = 0.22; Sfx.play('step'); } }
    }
    if (p.dashT > 0) {
      p.dashT -= dt; p.trail.push({ x: p.x, y: p.y, a: 0.5, f: p.at });
      if (p.dashT <= 0) p.vx = p.face * 200;
    } else if (p.hurtT > 0) {
      p.vx *= 0.88;
    } else {
      const sp = p.atkT > 0 && p.onG ? 90 : 280 * (1 + (p.spd || 0) / 100) * (p.flying ? 1.25 : 1);
      if (mv) { p.face = mv; p.vx = mv * sp; } else p.vx *= p.onG ? 0.7 : 0.95;
    }
    if (G.pressed.down && p.onG && p.surf && !p.surf.h) { p.dropT = 0.28; p.onG = false; p.vy = 60; }
    p.coyote = p.onG ? COYOTE : Math.max(0, p.coyote - dt);
    p.jbuf = G.pressed.jump ? JBUF : Math.max(0, p.jbuf - dt);
    if (p.jbuf > 0) {
      if (I.down && p.onG && p.surf && !p.surf.h) { p.dropT = 0.28; p.vy = 60; p.jbuf = 0; }
      else if ((p.onG || p.coyote > 0) && p.jumps === 0) {
        p.vy = -JUMP_V; p.onG = false; p.jumps = 1; p.jbuf = 0; p.coyote = 0; p.squash = -1; Sfx.play('jump');
        for (let i = 0; i < 8; i++) part(p.x + rnd(-14, 14), p.y, rnd(-140, 140), rnd(-90, -10), rnd(0.25, 0.45), '#d8c8a8', 3);
      } else if (G.pressed.jump && !p.onG && p.jumps < 2) { // nhay lan 2: lon vong tren khong
        p.vy = -JUMP2_V; p.jumps = 2; p.jbuf = 0; p.flipT = FLIP_T; p.flipDir = (mv || p.face) * (p.face || 1); Sfx.play('jump'); Sfx.play('dash');
        G.fx.push({ type: 'ring', x: p.x, y: p.y + 4, t: 0, dur: 0.35, r: 70, col: '#cfeaff' });
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; part(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 6, Math.cos(a) * 260, Math.sin(a) * 60 + 80, 0.35, '#e0f4ff', 2.5, true, 'streak'); }
      }
    }
    // trong luc: roi nhanh hon, lo lung nhe o dinh khi giu phim nhay -> nhay "an" tay va dep hon
    p.gmul = p.vy > 0 ? 1.25 : (I.jump && Math.abs(p.vy) < 160 ? 0.55 : 1);
    if (p.wing >= 0) {
      const want = I.jump && !p.onG && p.jumps >= 2 && p.flyE > 0 && p.flipT <= 0.12 && !p.dead;
      if (want) {
        if (!p.flying) { p.flying = true; Sfx.play('dash'); G.fx.push({ type: 'ring', x: p.x, y: p.y - 40, t: 0, dur: 0.4, r: 90, col: WING_COL[p.wing] }); }
        p.flyE = Math.max(0, p.flyE - dt); p.gmul = 0; p.vy += (-260 - p.vy) * Math.min(1, dt * 6);
        if (Math.random() < 0.6) part(p.x - p.face * 30 + rnd(-20, 20), p.y - 50 + rnd(-15, 15), -p.face * rnd(40, 120), rnd(30, 90), rnd(0.4, 0.7), WING_COL[p.wing], rnd(2, 4), true);
        if (p.flyE <= 0) floatText(p.x, p.y - 130, 'Hết sức bay', '#ccc', 13);
      } else p.flying = false;
      if (p.onG) p.flyE = Math.min(p.flyMax, p.flyE + dt * p.flyMax / WING_FILL);
    }
    if (p.flipT > 0) { p.flipT -= dt; if (p.flipT > 0.05 && Math.random() < 0.9) p.trail.push({ x: p.x, y: p.y, a: 0.45, f: p.at, rot: flipAngle(p) }); }
    if (p.squash !== 0) p.squash = p.squash > 0 ? Math.max(0, p.squash - dt * 7) : Math.min(0, p.squash + dt * 7);
    if (G.pressed.dash && p.dashCd <= 0) {
      p.dashT = 0.18; p.dashCd = 0.75; p.vx = (mv || p.face) * 900; p.face = mv || p.face; p.invT = Math.max(p.invT, 0.25); p.vy = Math.min(p.vy, 0);
      Sfx.play('dash');
    }
    if (G.pressed.atk || I.atk) useSkill('atk');
    for (const sk of SKILL_BASE) if (sk.id !== 'atk' && G.pressed[sk.id]) useSkill(sk.id);
    if (G.pressed.talk) talkNpc();
    if (G.pressed.hp) usePotion('binh_hp');
    if (G.pressed.mpp) usePotion('binh_mp');
    G.pressed = {};
    p.noGrav = p.dashT > 0 || !!p.climb;
    if (p.dashT > 0) p.vy = 0;
    const wasAir = !p.onG;
    physMove(p, p.vx, dt);
    if (p.climb) { // len toi dinh -> dung tren be; tut toi chan -> buong
      if (p.y <= vn.top) { p.y = vn.top; p.vy = 0; p.climb = false; p.dropT = 0; p.onG = true; p.surf = G.plats.find(q => q.y === vn.top && p.x >= q.x && p.x <= q.x + q.w) || null; }
      else if (p.onG && p.y >= vn.bot - 1) p.climb = false;
    }
    if (p.onG) { p.jumps = 0; p.flipT = 0; if (wasAir && (p.landV || 0) > 500) { p.squash = 1; Sfx.play('land'); for (let i = 0; i < 8; i++) part(p.x, p.y, rnd(-160, 160), rnd(-90, -20), 0.35, '#c8b090', 3); } }
    if (p.onG && Math.abs(p.vx) > 60) { G.stepT -= dt; if (G.stepT <= 0) { G.stepT = 0.28; Sfx.play('step'); } }
    if (p.atkT > 0) {
      p.atkT -= dt;
      if (!p.atkHit && p.atkDur - p.atkT >= 0.09) {
        p.atkHit = true;
        const x0 = p.face > 0 ? p.x - 20 : p.x - 115, x1 = p.face > 0 ? p.x + 115 : p.x + 20;
        let n = 0;
        G.enemies.forEach(e => { if (!e.dead && e.x + e.hw > x0 && e.x - e.hw < x1 && Math.abs(e.y - p.y) < 75) { hitEnemy(e, 1.0, { knock: 170, dir: p.face, col: WEAPON_COL[p.weapon], sk: 'atk', cast: p.castAtk }); n++; } });
        tryPvp(1.0, { box: [x0, x1] });
        if (n) p.mp = Math.min(p.maxmp, p.mp + 3);
      }
    }
    if (p.trail.length) p.trail.forEach(t => t.a -= dt * 2.5);
    p.trail = p.trail.filter(t => t.a > 0).slice(-8);
    const prev = p.anim;
    if (p.hurtT > 0 && p.atkT <= 0) p.anim = 'hurt';
    else if (p.atkT > 0) p.anim = p.atkAnim;
    else if (p.climb) p.anim = p.vy ? 'jump' : 'idle';
    else if (!p.onG) p.anim = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 30) p.anim = 'run';
    else p.anim = 'idle';
    if (prev !== p.anim) p.at = 0;
  }
  // mode 0: dung yen (khep nhe, tho) · 1: tren khong · 2: dang bay (vo canh)
  function drawWing(row, x, y, face, mode, alpha) {
    const im = IMG.wings; if (!im) return;
    const fw = im.width / 5, fh = im.height / 8;
    const flap = mode === 2 ? Math.abs(Math.sin(G.t * 11)) : mode === 1 ? 0.6 + 0.4 * Math.sin(G.t * 6) : 0.5 + 0.15 * Math.sin(G.t * 2.4);
    const col = mode ? 4 : 3, w = 168 * (0.82 + 0.18 * flap), h = 66 * (0.7 + 0.45 * flap);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (alpha == null ? 1 : alpha) * (mode ? 0.95 : 0.8);
    ctx.drawImage(im, col * fw, row * fh, fw, fh, x - w / 2 - face * 4, y - 58 - h * 0.62, w, h); // tam canh o lung nhan vat
    ctx.restore();
  }
  function flipAngle(p) { const k = clamp(1 - p.flipT / FLIP_T, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; return e * Math.PI * 2 * (p.flipDir || 1); }
  function physEnemy(e, dt) {
    e.at += dt; e.st += dt; e.flash = Math.max(0, e.flash - dt);
    if (e.dead) { e.deadT += dt; e.kvx *= 0.92; physMove(e, e.kvx, dt); return; }
    e.kvx *= Math.pow(0.02, dt);
    if (Math.abs(e.kvx) < 5) e.kvx = 0;
    const wasAir = !e.onG;
    physMove(e, (e.walk || 0) + e.kvx, dt);
    if (e.shared && e.netT && G.t - e.netT < 2 && hasRT() && !RT.isHost()) {
      const dx = e.netX - e.x;
      if (Math.abs(dx) > 260) e.x = e.netX; else e.x += dx * Math.min(1, dt * 5);
      if (Math.abs(e.netY - e.y) > 90 && e.onG) { e.y = e.netY; e.vy = 0; }
    }
    if (e.slamming && e.onG && wasAir) bossLand(e);
    const lo = SAFE_W + e.hw + 8, hi = G.worldW - SAFE_R - e.hw - 8; // ranh gioi doanh trai
    if (e.x < lo) { e.x = lo; if (e.kvx < 0) e.kvx = 0; if (e.walk < 0) e.walk = 0; } else if (e.x > hi) { e.x = hi; if (e.kvx > 0) e.kvx = 0; if (e.walk > 0) e.walk = 0; }
    if (e.home < lo) e.home = lo + 40; else if (e.home > hi) e.home = hi - 40;
    e.dispHp += (e.hp - e.dispHp) * Math.min(1, dt * 3);
  }
  function separate() {
    const a = G.enemies;
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      const e = a[i], f = a[j]; if (e.dead || f.dead || Math.abs(e.y - f.y) > 30) continue;
      const d = f.x - e.x, min = (e.hw + f.hw) * 1.1;
      if (Math.abs(d) < min) { const push = (min - Math.abs(d)) / 2 * (d < 0 ? -1 : 1); if (!e.boss) e.x -= push; if (!f.boss) f.x += push; }
    }
  }
  function setSt(e, s) { if (e.state !== s) { e.state = s; e.st = 0; } }
  function aiTarget(e) {
    let best = G.p && !G.p.dead && !inSafe(G.p.x) ? G.p : null, bd = best ? Math.hypot(best.x - e.x, (best.y - e.y) * 1.5) : 1e9;
    if (G.shared) G.others.forEach(o => { if (o.hp > 0 && !inSafe(o.x)) { const d = Math.hypot(o.x - e.x, (o.y - e.y) * 1.5); if (d < bd) { bd = d; best = o; } } });
    return best;
  }
  function startMobAtk(e, hitAt, dur, cd) { e.state = 'atk'; e.st = 0; e.hitAt = hitAt; e.atkDur = dur; e.atkCd = cd; e.hitDone = false; e.atkAnim = Math.random() < 0.5 ? 'atk1' : 'atk2'; e.walk = 0; Sfx.play('swing'); }
  // AI quai: tuan tra tren be cua minh, phat hien -> duoi, nhay len be, roi xuong theo nguoi choi
  function mobAI(e, dt) {
    e.walk = 0;
    if (e.dead) return;
    const lp = G.p, tg = aiTarget(e), p = tg || lp, dx = p.x - e.x, adx = Math.abs(dx), dy = p.y - e.y;
    if (!tg && e.state !== 'atk') e.aggro = false; // muc tieu da vao doanh trai -> quay ve tuan tra
    if (e.atkCd > 0) e.atkCd -= dt;
    if (e.jumpCd > 0) e.jumpCd -= dt;
    if (e.stunT > 0) { e.stunT -= dt; if (e.state === 'atk') e.state = 'idle'; return; }
    if (e.state === 'hurt') { if (e.st > 0.28) { e.state = 'idle'; e.st = 0; } return; }
    if (e.state === 'atk') {
      if (!e.hitDone && e.st >= e.hitAt) {
        e.hitDone = true;
        if (e.ranged) {
          const sx = e.x + e.face * 26, sy = e.y - 62 * e.scale, tx = p.x, ty = p.y - 45;
          const ang = Math.atan2(ty - sy, tx - sx);
          G.projs.push({ owner: 'e', kind: e.projKind || 'dart', x: sx, y: sy, vx: Math.cos(ang) * 540, vy: Math.sin(ang) * 540, r: e.projKind ? 12 : 9, life: 1.5, dmg: e.atk, col: e.projCol || '#c0e0ff', rot: 0 });
          Sfx.play('dart');
        } else if (Math.abs(lp.x - e.x) < e.reach + 26 && Math.abs(lp.y - e.y) < 80 && sign(lp.x - e.x) === e.face) hurtPlayer(e.atk, e);
      }
      if (e.st >= e.atkDur) { e.state = 'idle'; e.st = 0; }
      return;
    }
    if (p.dead || (p === lp && lp.dead)) { setSt(e, 'idle'); return; }
    if (!e.aggro) {
      if (tg && ((adx < 480 && Math.abs(dy) < 260) || e.hp < e.max)) { e.aggro = true; floatText(e.x, e.y - 120 * e.scale, '!', '#ff5050', 22); }
      e.patrolT -= dt; if (e.patrolT <= 0) { e.patrolT = rnd(1.5, 3.5); e.patrolDir = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
      if (Math.abs(e.x - e.home) > 140) e.patrolDir = sign(e.home - e.x);
      if (e.surf && !e.surf.h) { if (e.x < e.surf.x + 18) e.patrolDir = 1; if (e.x > e.surf.x + e.surf.w - 18) e.patrolDir = -1; }
      if (e.patrolDir) { e.face = e.patrolDir; e.walk = e.patrolDir * e.speed * 0.4; setSt(e, 'run'); } else setSt(e, 'idle');
      return;
    }
    e.face = dx > 0 ? 1 : -1;
    // nhay len khi nguoi choi o cao hon / bi da chan
    if (e.onG && e.jumpCd <= 0 && ((dy < -70 && adx < 220) || e.blocked)) { e.vy = -(JUMP_V + 40); e.onG = false; e.jumpCd = rnd(1.2, 2.2); }
    // roi xuong khi nguoi choi o duoi
    if (e.onG && dy > 70 && adx < 60 && e.surf && !e.surf.h) e.dropT = 0.3;
    if (e.ranged) {
      if (adx < 230) { e.walk = -e.face * e.speed * 0.8; setSt(e, 'run'); }
      else if (adx > 430) { e.walk = e.face * e.speed; setSt(e, 'run'); }
      else setSt(e, 'idle');
      if (e.atkCd <= 0 && adx < 600 && Math.abs(dy) < 360) startMobAtk(e, 0.45, 0.7, rnd(1.8, 2.6));
    } else {
      if (adx > e.reach || Math.abs(dy) > 60) { e.walk = e.face * e.speed; setSt(e, 'run'); }
      else if (e.atkCd <= 0) startMobAtk(e, e.elite ? 0.42 : 0.38, 0.6, e.elite ? rnd(0.9, 1.3) : rnd(1.1, 1.7));
      else setSt(e, 'idle');
    }
  }

  // ---------- BOSS AI ----------
  function bossAI(e, dt) {
    if (e.dead) return;
    if (!e.dashing) e.walk = 0;
    const lp = G.p, tg = aiTarget(e), p = tg || lp, dx = p.x - e.x, adx = Math.abs(dx);
    if (!e.enr && e.hp < e.max * 0.35) { e.enr = true; banner(e.name + ' NỔI GIẬN!', '#ff3a3a', 2); Sfx.play('roar'); G.shake = 0.5; e.speed *= 1.25; }
    if (e.jumpCd > 0) e.jumpCd -= dt;
    if (e.stunT > 0) {
      e.stunT -= dt;
      if (!e.slamming) { if (e.move) endMove(e); e.walk = 0; e.trail = []; setSt(e, 'idle'); }
      return;
    }
    if (!e.move) {
      if (p.dead || !tg) { setSt(e, 'idle'); return; }
      e.face = dx > 0 ? 1 : -1; e.mcd -= dt;
      if (adx > 160) { e.walk = e.face * e.speed * 0.8; setSt(e, 'run'); } else setSt(e, 'idle');
      if (e.onG && e.jumpCd <= 0 && (e.blocked || (p.y < e.y - 90 && adx < 260))) { e.vy = -(JUMP_V + 80); e.jumpCd = 2; }
      if (e.mcd <= 0) pickBossMove(e, adx);
      return;
    }
    e.mt += dt;
    const m = e.move;
    if (m === 'combo') {
      const seg = e.mt < 0.55 ? 0 : e.mt < 1.1 ? 1 : 2;
      if (seg === 2) return endMove(e);
      if (seg !== e.seg) { e.seg = seg; e.hitDone = false; e.face = sign(p.x - e.x); e.state = 'atk'; e.atkAnim = seg ? 'atk2' : 'atk1'; e.st = 0; e.atkDur = 0.55; Sfx.play('swing'); }
      if (e.st < 0.25) e.walk = e.face * 200;
      if (!e.hitDone && e.st >= 0.3) {
        e.hitDone = true;
        G.fx.push({ type: 'slash', x: e.x, y: e.y, face: e.face, t: 0, dur: 0.22, col: '#ff6a5a', flip: !!seg, big: 1.5 });
        Sfx.play('slash');
        if (Math.abs(lp.x - e.x) < e.reach + 50 && sign(lp.x - e.x) === e.face && Math.abs(lp.y - e.y) < 120) hurtPlayer(e.atk, e, 1.0);
      }
    } else if (m === 'dash') {
      if (e.mt < 0.6) { setSt(e, 'idle'); if (!e.tele) { e.tele = true; G.fx.push({ type: 'tele_line', x: e.x, y: e.y, dir: e.face, len: 560, t: 0, dur: 0.6 }); } }
      else if (e.mt < 1.05) {
        if (!e.dashing) { e.dashing = true; e.hitDone = false; Sfx.play('dash'); }
        e.walk = e.face * 1250; setSt(e, 'run'); e.trail = (e.trail || []).concat([{ x: e.x, y: e.y, a: 0.5 }]).slice(-6);
        if (!e.hitDone && Math.abs(lp.x - e.x) < 60 && Math.abs(lp.y - e.y) < 100) { e.hitDone = true; hurtPlayer(e.atk, e, 1.3); }
      } else { e.dashing = false; e.walk = 0; e.trail = []; endMove(e); }
    } else if (m === 'fan') {
      if (e.mt < 0.45) { if (e.state !== 'atk') { e.state = 'atk'; e.st = 0; } e.atkAnim = 'atk2'; e.atkDur = 0.9; }
      else if (!e.fired) {
        e.fired = true; const n = e.enr ? 5 : 3; Sfx.play('fist');
        const sx = e.x + e.face * 50, sy = e.y - 85 * e.scale, base = Math.atan2((p.y - 45) - sy, p.x - sx);
        for (let k = 0; k < n; k++) {
          const ang = base + (k - (n - 1) / 2) * 0.16;
          G.projs.push({ owner: 'e', kind: 'orb', x: sx, y: sy, vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, r: 15, life: 2.2, dmg: e.atk * 0.85, col: bossFx(e) });
        }
      } else if (e.mt > 0.9) endMove(e);
    } else if (m === 'slam') {
      if (!e.slamming && !e.slamStarted) {
        const tx = clamp(p.x, 60, G.worldW - 60); e.slamX = tx; e.slamStarted = true;
        e.slamming = true; e.vy = -980; e.onG = false; e.walk = (tx - e.x) / 0.85; e.dashing = true; e.face = sign(tx - e.x);
        G.fx.push({ type: 'tele_circle', x: tx, y: p.y, t: 0, dur: 0.85, r: 150 });
        Sfx.play('jump');
      }
      if (e.mt > 1.8) { e.slamming = false; e.dashing = false; endMove(e); }
    } else if (m === 'summon') {
      setSt(e, 'idle');
      if (!e.fired && e.mt > 0.6) {
        e.fired = true; const n = e.enr ? 3 : 2; Sfx.play('gong');
        for (let k = 0; k < n; k++) {
          const sx = clamp(e.x + (k % 2 ? 1 : -1) * (160 + k * 60), 50, G.worldW - 50);
          const m2 = mkEnemy(Math.random() < 0.3 ? 'ranged' : 'mob', sx, e.y, { aggro: true, summon: true }); m2.vy = -500; m2.onG = false; G.enemies.push(m2);
          for (let i = 0; i < 16; i++) part(sx, e.y - 40, rnd(-150, 150), rnd(-300, 0), 0.6, '#a040ff', 4, true);
        }
        floatText(e.x, e.y - 170, 'Triệu tập thuộc hạ!', '#ff9a3a', 18);
      }
      if (e.mt > 1.2) endMove(e);
    }
  }
  function bossFx(e) { return e.color && e.color !== '#2a0a3a' ? '#ff5a3a' : '#b050ff'; }
  function pickBossMove(e, adx) {
    e.mt = 0; e.seg = -1; e.fired = false; e.tele = false; e.hitDone = false; e.slamStarted = false;
    if (e.kind === 'boss' && !e.sum60 && e.hp < e.max * 0.6) { e.sum60 = true; e.move = 'summon'; return; }
    if (e.kind === 'boss' && !e.sum30 && e.hp < e.max * 0.3) { e.sum30 = true; e.move = 'summon'; return; }
    const r = Math.random();
    if (adx < 180) e.move = r < 0.5 ? 'combo' : r < 0.72 ? 'slam' : r < 0.86 ? 'fan' : 'dash';
    else e.move = r < 0.35 ? 'dash' : r < 0.65 ? 'fan' : r < 0.9 ? 'slam' : 'combo';
  }
  function endMove(e) { e.move = null; e.state = 'idle'; e.st = 0; e.mcd = (e.enr ? 0.55 : 1.0) + Math.random() * 0.8; e.dashing = false; e.slamming = false; e.walk = 0; }
  function bossLand(e) {
    e.slamming = false; e.dashing = false; e.walk = 0; G.shake = 0.6; Sfx.play('slam');
    G.fx.push({ type: 'ring', x: e.x, y: e.y - 6, t: 0, dur: 0.45, r: 170, col: '#ff7a3a', flat: true });
    for (let i = 0; i < 30; i++) part(e.x + rnd(-80, 80), e.y, rnd(-300, 300), rnd(-400, -100), rnd(0.4, 0.8), '#b89a70', rnd(3, 6));
    const p = G.p;
    if (Math.abs(p.x - e.x) < 160 && Math.abs(p.y - e.y) < 40 && p.onG) hurtPlayer(e.atk, e, 1.4);
  }
  // ================= DO ROI TREN BAN DO (ai cung thay, di qua de nhat) =================
  const LOOT_COL = { potion: '#ff6a7a', up: '#ffd24a', stone: '#c47cff', mat: '#7cf0ff', crop: '#9dff6a', equip: '#ff9a3a' };
  const lootName = l => { const it = Backend.itemOf(l.code); return (it ? it.name : l.code) + (l.qty > 1 ? ' ×' + l.qty : ''); };
  function addLoot(list) {
    (list || []).forEach(l => {
      if (!l || G.loot.has(+l.id)) return;
      const it = Backend.itemOf(l.code) || {};
      G.loot.set(+l.id, { id: +l.id, code: l.code, qty: +l.qty || 1, x: +l.x, owner: +l.owner || 0, ownT: G.t + (+l.own || 0), expT: G.t + (+l.ttl || 120), t0: G.t, pend: false, cd: 0, col: LOOT_COL[it.type] || '#fff', ico: it.icon || l.code });
    });
  }
  function syncLoot(list) { // dong bo voi may chu: bo cai da mat, them cai moi
    const ids = new Set((list || []).map(l => +l.id));
    G.loot.forEach((l, id) => { if (!ids.has(id) && !l.pend) G.loot.delete(id); });
    addLoot(list);
  }
  function updateLoot(dt) {
    const p = G.p; if (!p) return;
    if (!G.shared) { G.lootSyncT -= dt; if (G.lootSyncT <= 0) { G.lootSyncT = 8; Backend.lootList(G.stage.idx).then(r => { if (r && r.ok && !G.shared) syncLoot(r.loot); }); } }
    const me = +user().id;
    G.loot.forEach((l, id) => {
      if (G.t > l.expT) { G.loot.delete(id); return; }
      if (l.cd > 0) l.cd -= dt;
      if (l.pend || l.cd > 0 || p.dead || G.t - l.t0 < 1.2) return; // nam tren dat it nhat 1.2s roi moi nhat
      if (Math.abs(l.x - p.x) > 46 || p.y < GROUND - 100) return;
      if (l.owner !== me && l.ownT > G.t) { if (l.cd <= 0) { floatText(l.x, GROUND - 70, 'Của người khác (' + Math.ceil(l.ownT - G.t) + 's)', '#aaa', 12); l.cd = 2; } return; }
      l.pend = true;
      Backend.lootPick(id).then(r => {
        l.pend = false;
        if (r && r.ok) {
          G.loot.delete(id); Sfx.play('coin');
          floatText(p.x, p.y - 140, '+ ' + lootName(l), l.col, 16);
          for (let i = 0; i < 10; i++) part(l.x, GROUND - 20, rnd(-120, 120), rnd(-300, -100), rnd(0.3, 0.6), l.col, 3, true);
        } else if (r && r.gone) G.loot.delete(id);
        else { if (r && r.wait) l.ownT = G.t + r.wait; l.cd = 1.5; }
      });
    });
  }
  function renderLoot(cx) {
    if (!G.loot.size) return;
    const p = G.p, me = +user().id;
    G.loot.forEach(l => {
      const x = l.x - cx; if (x < -40 || x > VW + 40) return;
      const age = G.t - l.t0, k = Math.min(1, age / 0.5);
      const y = GROUND - 16 - (k < 1 ? Math.sin(k * Math.PI) * 90 : Math.abs(Math.sin(G.t * 3 + l.id)) * 5);
      const fade = l.expT - G.t < 10 ? 0.4 + 0.6 * Math.abs(Math.sin(G.t * 6)) : 1, locked = l.owner !== me && l.ownT > G.t;
      ctx.globalAlpha = fade;
      glow(x, y, 26, l.col, 0.55);
      ctx.strokeStyle = l.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, GROUND - 2, 16, 5, 0, 0, 7); ctx.stroke();
      if (!drawIcon(l.ico, x - 15, y - 15, 30, fade)) { ctx.fillStyle = l.col; ctx.fillRect(x - 8, y - 8, 16, 16); }
      if (p && Math.abs(p.x - l.x) < 380) txt(lootName(l) + (locked ? ' 🔒 ' + Math.ceil(l.ownT - G.t) + 's' : ''), x, y - 22, 12, locked ? '#bbb' : l.col, 'center', true);
      if (locked) { ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, (l.ownT - G.t) / 15)); ctx.stroke(); } // vong dem nguoc cho nhat
      ctx.globalAlpha = 1;
    });
  }
  function updatePortals(dt) {
    if (G.portalCd > 0) G.portalCd -= dt;
    const p = G.p; if (!p || p.dead || G.portalCd > 0 || G.busy) return;
    for (const pt of G.portals) {
      if (Math.abs(p.x - pt.x) > 46 || p.y < GROUND - 160) continue;
      const u = user(), st = STAGES().find(x => +x.idx === pt.to);
      G.portalCd = 1.5;
      if (pt.to > (u.stage_max || 1)) { floatText(p.x, p.y - 140, 'Chưa mở: hạ Boss Bản Đồ ' + (pt.to - 1) + ' trước', '#ff8080', 15); Sfx.play('deny'); p.x -= pt.side * 60; return; }
      if (u.jail && +u.jail !== pt.to) { floatText(p.x, p.y - 140, 'TRUY NÃ - không thể rời bản đồ!', '#ff5050', 16); Sfx.play('deny'); p.x -= pt.side * 60; return; }
      Sfx.play('dash'); G.fx.push({ type: 'flash', t: 0, dur: 0.35, col: '#bfe8ff' });
      log('Đi tới ' + (st ? st.name : 'bản đồ ' + pt.to) + '...');
      enterStage(pt.to, 'train', pt.side > 0 ? 'left' : 'right');
      return;
    }
  }
  function drawPortal(pt, cx) {
    const x = pt.x - cx; if (x < -120 || x > VW + 120) return;
    const st = STAGES().find(q => +q.idx === pt.to), lock = pt.to > (user().stage_max || 1), y = GROUND - 75, t = G.t;
    const c1 = lock ? '#8a8a9a' : '#7cf0ff', c2 = lock ? '#4a4a5a' : '#b070ff';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(x, y, 120, c2, 0.35 + 0.1 * Math.sin(t * 3));
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = 4 - i; ctx.globalAlpha = 0.8 - i * 0.2; ctx.beginPath(); ctx.ellipse(x, y, 34 + i * 9 + Math.sin(t * 4 + i) * 3, 72 + i * 8, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 10; i++) { const a = t * (2 + i * 0.2) + i * 0.63; glow(x + Math.cos(a) * 30, y + Math.sin(a) * 66, 7, i % 2 ? c1 : c2, 0.8); }
    ctx.restore(); ctx.globalAlpha = 1;
    txt((pt.side < 0 ? '◀ ' : '') + (st ? st.name : 'Bản đồ ' + pt.to) + (pt.side > 0 ? ' ▶' : ''), x, y - 92, 14, lock ? '#aaa' : '#bff4ff', 'center', true);
    txt(lock ? '🔒 Chưa mở' : 'Cấp ' + (st ? st.unlock_level : '?') + ' · đi vào cổng', x, y - 76, 11, lock ? '#888' : '#fff', 'center', true);
  }
  function trainSpawner(dt) {
    const alive = G.enemies.filter(e => !e.dead && !e.boss).length, near = G.enemies.filter(e => !e.dead && Math.abs(e.x - G.p.x) < 1400).length;
    if (alive >= 30 && near >= 6) return;
    G.trainSpawnT -= dt; if (G.trainSpawnT > 0) return;
    G.trainSpawnT = near < 4 ? 0.45 : 0.9;
    const side = Math.random() < 0.5 ? -1 : 1;
    let x = side < 0 ? G.camX - 60 : G.camX + VW + 60;
    if (x < 40 || x > G.worldW - 40) x = side < 0 ? G.camX + VW + 60 : G.camX - 60;
    x = outSafe(x, 80);
    G.enemies.push(mkEnemy(Math.random() < 0.3 ? 'ranged' : 'mob', x, spawnPoint(x, Math.random() < 0.4), { aggro: true }));
  }

  function updateProjs(dt) {
    const p = G.p;
    G.projs = G.projs.filter(b => {
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.trail) { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 8) b.trail.shift(); }
      if (b.rot != null) b.rot += dt * (b.kind === 'p_petal' ? 8 : 20);
      if (b.owner === 'p') {
        if (b.kind === 'crescent' && Math.random() < 0.8) part(b.x - b.face * 30, b.y + rnd(-60, 60), -b.face * 100, rnd(-40, 40), 0.35, b.col, rnd(2, 5), true);
        G.enemies.forEach(e => {
          if (e.dead || b.hit.has(e.id)) return;
          if (Math.abs(e.x - b.x) < b.r + e.hw && Math.abs((e.y - 55 * e.scale) - b.y) < b.r + 55 * e.scale) {
            b.hit.add(e.id); hitEnemy(e, b.mult, { knock: b.knock, up: b.up, col: b.col, dir: sign(b.vx), sk: b.sk, cast: b.cast });
          }
        });
        if (b.kind === 'crescent' && !b.pvp) { b.pvp = true; tryPvp(b.mult, { box: [Math.min(p.x, b.x + b.vx * 0.7), Math.max(p.x, b.x + b.vx * 0.7)] }); }
      } else {
        if (inSafe(b.x)) { for (let i = 0; i < 5; i++) part(b.x, b.y, rnd(-120, 120), rnd(-120, 60), 0.3, '#ffe9a0', 2, true); return false; }
        if (b.kind === 'orb' && Math.random() < 0.5) part(b.x, b.y, rnd(-30, 30), rnd(-30, 30), 0.3, b.col, 3, true);
        if (!p.dead && Math.abs(p.x - b.x) < b.r + 16 && Math.abs((p.y - 40) - b.y) < b.r + 36) { hurtPlayer(b.dmg, { x: b.x - b.vx }, 1); return false; }
        for (const k of G.rocks) if (b.x > k.x && b.x < k.x + k.w && b.y > k.y && b.y < k.y + k.h) return false;
      }
      return b.life > 0 && b.x > -100 && b.x < G.worldW + 100 && b.y < GROUND + 20;
    });
  }
  function ultTick(f) {
    const box = e => !e.dead && e.x > G.camX - 40 && e.x < G.camX + VW + 40 && e.y > G.camY - 40 && e.y < G.camY + VH + 120;
    G.enemies.forEach(e => { if (box(e)) hitEnemy(e, 0.9, { knock: 80, col: f.col, crit: 0.2, sk: 'ult', cast: f.cast }); });
    if (f.ticks === 1) tryPvp(3, { box: [G.camX, G.camX + VW] });
  }
  function updateFx(dt) {
    G.punch = Math.max(0, G.punch - dt * 4);
    G.fx = G.fx.filter(f => {
      f.t += dt;
      if (f.type === 'vortex' && G.p) {
        const p = G.p;
        G.enemies.forEach(e => { if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 300 && Math.abs(e.y - p.y) < 160) e.kvx = sign(p.x - e.x) * 160; });
        const tick = Math.floor(f.t / 0.42);
        if (tick > f.ticks && f.ticks < 5) {
          f.ticks = tick; Sfx.play('slash'); G.shake = Math.max(G.shake, 0.15);
          G.enemies.forEach(e => { if (!e.dead && Math.abs(e.x - p.x) < 230 && Math.abs(e.y - p.y) < 150) hitEnemy(e, 0.6, { knock: 40, col: f.col, sk: 'vx', cast: f.cast }); });
          if (f.ticks === 1) tryPvp(3, { box: [p.x - 230, p.x + 230] });
        }
        if (Math.random() < 0.7) { const a = Math.random() * 6.28, r = rnd(60, 200); part(p.x + Math.cos(a) * r, p.y - 50 + Math.sin(a) * r * 0.4, -Math.sin(a) * 300, Math.cos(a) * 120, 0.35, f.col, rnd(2, 4), true, 'streak'); }
      }
      if (f.type && f.type.startsWith('ult_') && f.t > 0.3) {
        const tick = Math.floor((f.t - 0.3) / 0.22);
        if (tick > f.ticks && f.ticks < 6) { f.ticks = tick; G.shake = Math.max(G.shake, 0.25); ultTick(f); }
      }
      return f.t < f.dur;
    });
    G.texts = G.texts.filter(t => { t.t += dt; t.y += t.vy * dt; return t.t < t.dur; });
  }
  function updateParticles(dt) {
    const p = G.p;
    const a = G.parts; let j = 0; // cap nhat tai cho, khong tao mang moi moi khung (it rac bo nho -> it giat)
    for (let i = 0; i < a.length; i++) {
      const q = a[i]; q.life -= dt; if (q.life <= 0) continue;
      if (q.kind === 'streak') { q.vx *= 0.9; q.vy = q.vy * 0.9 + 300 * dt; }
      else if (q.kind === 'coin' && p && q.life < q.max * 0.6) { const dx = p.x - q.x, dy = (p.y - 60) - q.y; q.vx += dx * 8 * dt; q.vy += dy * 8 * dt; q.vx *= 0.94; q.vy *= 0.94; }
      else q.vy += (q.add ? 200 : 700) * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      a[j++] = q;
    }
    a.length = j;
  }
  function updateWeather(dt) {
    const fx = G.stage && G.stage.theme ? G.stage.theme.fx : 'leaves';
    const want = { snow: 120, embers: 70, petals: 50, leaves: 40, lanterns: 35, sea: 20 }[fx] || 30;
    if (G.weather.length > want) G.weather.length = want;
    while (G.weather.length < want) G.weather.push({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.5, 1.5), ph: Math.random() * 6 });
    G.weather.forEach(w => {
      w.ph += dt;
      if (fx === 'embers' || fx === 'lanterns') { w.y -= 50 * w.s * dt; w.x += Math.sin(w.ph) * 25 * dt; }
      else if (fx === 'snow') { w.y += 65 * w.s * dt; w.x += Math.sin(w.ph) * 30 * dt - 12 * dt; }
      else { w.y += 45 * w.s * dt; w.x += (Math.sin(w.ph * 1.3) * 50 - 30) * dt; }
      if (w.y > H + 10) { w.y = -10; w.x = Math.random() * W; } if (w.y < -10) { w.y = H + 10; w.x = Math.random() * W; }
      if (w.x < -10) w.x = W + 10; if (w.x > W + 10) w.x = -10;
    });
  }

  // ================= RENDER =================
  function render() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (G.state === 'loading') { renderLoading(); ctx.restore(); return; }
    const sh = G.shake > 0 ? G.shake * 16 : 0;
    ctx.translate(rnd(-sh, sh), rnd(-sh, sh));
    const inWorld = G.p && G.state !== 'title';
    renderBg(inWorld);
    if (inWorld) {
      const zz = Z * (1 + G.punch * 0.035);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zz / Z, zz / Z); ctx.translate(-W / 2, -H / 2); ctx.scale(Z, Z); ctx.translate(0, -G.camY);
      renderWorld();
      ctx.restore();
      renderScreenFx();
    } else renderTitle();
    ctx.restore();
    if (inWorld) renderHud();
    renderMsgs();
  }
  function renderLoading() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120a1e'); g.addColorStop(1, '#3a1420'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    txt('倚天屠龍記', W / 2, H / 2 - 80, 64, '#ffd76a', 'center', true, 'serif');
    txt('Đang tải... ' + Math.round(G.loadPct * 100) + '%', W / 2, H / 2 + 20, 20, '#fff', 'center');
    ctx.fillStyle = '#333'; ctx.fillRect(W / 2 - 200, H / 2 + 40, 400, 10); ctx.fillStyle = '#ffd76a'; ctx.fillRect(W / 2 - 200, H / 2 + 40, 400 * G.loadPct, 10);
  }
  function tileLayer(img, factor, y, h) {
    if (!img) return;
    const sc = h / img.height, w = img.width * sc;
    let off = -((G.camX * Z * factor) % w); if (off > 0) off -= w;
    for (let x = off; x < W + 2; x += w) ctx.drawImage(img, Math.floor(x), Math.floor(y), Math.ceil(w) + 1, h);
  }
  function renderBg(inWorld) {
    const st = G.stage || STAGES()[0];
    const L = bgLayers(st);
    const th = st.theme || {}, fx = th.fx || 'leaves';
    const lift = inWorld ? ((WORLD_H - VH) - G.camY) * Z : 0; // camera len cao -> nen troi xuong (thay nhieu troi hon)
    ctx.fillStyle = th.sky || '#4a3060'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    tileLayer(L.bg, 0, lift * 0.05, H + 20);
    tileLayer(L.far, 0.06, lift * 0.1, H);
    tileLayer(L.mtn, 0.15, lift * 0.18, H);
    if (fx === 'sea') {
      const y0 = H * 0.6 + lift * 0.22; const g = ctx.createLinearGradient(0, y0, 0, H + lift); g.addColorStop(0, 'rgba(40,110,170,0.95)'); g.addColorStop(1, 'rgba(10,40,80,1)');
      ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0 + lift);
      ctx.strokeStyle = 'rgba(200,240,255,0.35)'; ctx.lineWidth = 2;
      for (let r = 0; r < 6; r++) { ctx.beginPath(); for (let x = 0; x <= W; x += 16) { const yy = y0 + 14 + r * 26 + Math.sin(x * 0.025 + G.t * 2 + r - G.camX * 0.004 * (r + 1)) * 3; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
    }
    tileLayer(L.trees, 0.3, lift * 0.28, H);
    if (fx === 'lanterns') renderLanterns(lift * 0.3);
    tileLayer(L.fg, 0.5, lift * 0.38, H);
    ctx.imageSmoothingEnabled = true;
  }
  function renderLanterns(oy) {
    for (let i = 0; i < 14; i++) {
      const wx = i * 280 + 80, span = 14 * 280, x = ((wx - G.camX * 0.5) % span + span) % span - 100, y = 180 + (i % 3) * 50 + Math.sin(G.t + i) * 5 + oy;
      if (x < -40 || x > W + 40) continue;
      ctx.fillStyle = '#d02020'; ctx.beginPath(); ctx.ellipse(x, y, 13, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 7, y - 20, 14, 3); ctx.fillRect(x - 7, y + 17, 14, 3);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff8040'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  function gstyle() { return GROUND_STYLE[(G.stage && G.stage.theme && G.stage.theme.ground) || 'grass'] || GROUND_STYLE.grass; }
  function renderGround(cx) {
    const gs = gstyle(), x0 = 0, x1 = VW;
    const g = ctx.createLinearGradient(0, GROUND, 0, WORLD_H + 60); g.addColorStop(0, gs.body); g.addColorStop(1, gs.body2);
    ctx.fillStyle = g; ctx.fillRect(x0, GROUND, x1, WORLD_H + 80 - GROUND);
    ctx.fillStyle = gs.top; ctx.fillRect(x0, GROUND - 6, x1, 8); ctx.fillStyle = gs.top2; ctx.fillRect(x0, GROUND - 6, x1, 2);
    const off = -(cx % 64);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = off; x < x1; x += 64) { ctx.fillRect(x, GROUND + 4, 2, 24); ctx.fillRect(x + 32, GROUND + 30, 2, 24); }
    ctx.fillRect(0, GROUND + 28, x1, 2); ctx.fillRect(0, GROUND + 54, x1, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    if (cx < 30) ctx.fillRect(0, 0, 30 - cx, WORLD_H + 80);
    const rx = G.worldW - cx - 30; if (rx < VW) ctx.fillRect(rx, 0, VW - rx, WORLD_H + 80);
  }
  function renderTerrain(cx) {
    const gs = gstyle(), temple = G.stage && G.stage.theme && G.stage.theme.ground === 'temple';
    for (const k of G.rocks) {
      const x = k.x - cx; if (x > VW + 20 || x + k.w < -20) continue;
      const g = ctx.createLinearGradient(x, k.y, x + k.w, k.y + k.h); g.addColorStop(0, shade(gs.rock, 30)); g.addColorStop(1, shade(gs.rock, -50));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x, GROUND); ctx.lineTo(x + 4, k.y + 14); ctx.quadraticCurveTo(x + k.w * 0.15, k.y - 2, x + k.w * 0.45, k.y); ctx.quadraticCurveTo(x + k.w * 0.85, k.y - 3, x + k.w - 3, k.y + 12); ctx.lineTo(x + k.w, GROUND); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x + 8, k.y + 16); ctx.lineTo(x + k.w * 0.4, k.y + 6); ctx.stroke();
      ctx.fillStyle = gs.top; ctx.beginPath(); ctx.ellipse(x + k.w / 2, k.y + 2, k.w / 2 - 4, 5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(x + k.w * (0.3 + k.seed * 0.3), k.y + 18); ctx.lineTo(x + k.w * (0.4 + k.seed * 0.2), k.y + k.h * 0.6); ctx.stroke();
    }
    for (const p of G.plats) {
      const x = p.x - cx; if (x > VW + 20 || x + p.w < -20) continue;
      if (temple) {
        ctx.fillStyle = '#6a1a12'; ctx.fillRect(x, p.y, p.w, 14);
        ctx.fillStyle = '#b8302a'; ctx.fillRect(x, p.y - 4, p.w, 6); ctx.fillStyle = '#e8b040'; ctx.fillRect(x, p.y - 5, p.w, 2); ctx.fillRect(x, p.y + 12, p.w, 2);
        ctx.fillStyle = '#4a120c'; ctx.fillRect(x + 10, p.y + 14, 8, 26); ctx.fillRect(x + p.w - 18, p.y + 14, 8, 26);
        ctx.fillStyle = '#d02020'; ctx.beginPath(); ctx.ellipse(x + 14, p.y + 50, 7, 10, 0, 0, 7); ctx.ellipse(x + p.w - 14, p.y + 50, 7, 10, 0, 0, 7); ctx.fill();
      } else {
        const g = ctx.createLinearGradient(0, p.y, 0, p.y + 26); g.addColorStop(0, shade(gs.rock, 10)); g.addColorStop(1, shade(gs.rock, -60));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x + p.w, p.y); ctx.lineTo(x + p.w - 10, p.y + 18); ctx.quadraticCurveTo(x + p.w / 2, p.y + 34, x + 10, p.y + 18); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = gs.top; ctx.fillRect(x - 2, p.y - 5, p.w + 4, 7); ctx.fillStyle = gs.top2; ctx.fillRect(x, p.y - 5, p.w, 2);
        if (gs === GROUND_STYLE.grass) { ctx.fillStyle = gs.top; for (let i = 6; i < p.w - 6; i += 14) ctx.fillRect(x + i, p.y - 9, 2, 5); }
        if (gs === GROUND_STYLE.snow) { ctx.fillStyle = '#dff0ff'; for (let i = 8; i < p.w - 8; i += 22) { ctx.beginPath(); ctx.moveTo(x + i, p.y + 2); ctx.lineTo(x + i + 3, p.y + 12); ctx.lineTo(x + i + 6, p.y + 2); ctx.fill(); } }
      }
    }
    renderVines(cx);
    for (const d of G.deco) {
      const x = d.x - cx; if (x < -200 || x > VW + 200) continue;
      if (d.kind === 'tent' || d.kind === 'fire' || d.kind === 'gate') { drawCamp(d, x); continue; }
      if (d.kind === 'flag') {
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x, d.y - 90, 4, 90);
        ctx.fillStyle = G.stage.boss_color || '#b02020'; ctx.beginPath(); ctx.moveTo(x + 4, d.y - 88); ctx.lineTo(x + 40 + Math.sin(G.t * 3 + x) * 4, d.y - 78); ctx.lineTo(x + 4, d.y - 62); ctx.fill();
      } else if (d.kind === 'lamp') {
        ctx.fillStyle = '#4a4440'; ctx.fillRect(x - 4, d.y - 50, 8, 50); ctx.fillRect(x - 10, d.y - 64, 20, 16);
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,60,' + (0.35 + 0.1 * Math.sin(G.t * 7 + x)) + ')'; ctx.beginPath(); ctx.arc(x, d.y - 56, 18, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      } else if (d.kind === 'chest') {
        drawIcon('ui_gift', x - 16, d.y - 32, 32);
      }
    }
  }
  // thang tre (day leo): 2 thanh doc + nac ngang, 1 lan ve cho tat ca
  function renderVines(cx) {
    if (!G.vines || !G.vines.length) return;
    ctx.lineCap = 'round';
    const vis = G.vines.filter(v => v.x - cx > -40 && v.x - cx < VW + 40);
    if (!vis.length) return;
    ctx.strokeStyle = '#6a4a22'; ctx.lineWidth = 5; ctx.beginPath();
    vis.forEach(v => { const x = v.x - cx; ctx.moveTo(x - 13, v.top - 8); ctx.lineTo(x - 13, v.bot); ctx.moveTo(x + 13, v.top - 8); ctx.lineTo(x + 13, v.bot); });
    ctx.stroke();
    ctx.strokeStyle = '#b8904a'; ctx.lineWidth = 4; ctx.beginPath();
    vis.forEach(v => { const x = v.x - cx; for (let y = v.bot - 14; y > v.top - 4; y -= 24) { ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y); } });
    ctx.stroke();
    ctx.fillStyle = '#4a8a2a'; // la leo
    vis.forEach(v => { const x = v.x - cx; for (let y = v.top + 20; y < v.bot - 10; y += 70) { ctx.beginPath(); ctx.ellipse(x - 16, y, 7, 4, -0.6, 0, 7); ctx.ellipse(x + 16, y + 30, 7, 4, 0.6, 0, 7); ctx.fill(); } });
    const p = G.p, v = p && !p.climb && p.onG ? vineAt(p) : null;
    if (v && p.y > v.top + 6) txt(MOBILE ? '⤒ Giữ Nhảy để leo' : '⤒ Giữ ↑ để leo', p.x - cx, p.y - 150, 13, '#fff3b0', 'center', true);
  }
  // doanh trai: leu, lua trai, cong ranh gioi (man chan quai)
  function drawCamp(d, x) {
    const y = d.y;
    if (d.kind === 'tent') {
      const w = d.w || 140, h = w * 0.62;
      ctx.fillStyle = '#7a3a22'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a8562e'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, y); ctx.lineTo(x, y - h + 8); ctx.lineTo(x + w / 2 - 10, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a140c'; ctx.beginPath(); ctx.moveTo(x - w * 0.14, y); ctx.lineTo(x, y - h * 0.5); ctx.lineTo(x + w * 0.14, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a1a0c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h - 18); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(x, y - h - 18); ctx.lineTo(x + 18 + Math.sin(G.t * 3 + x) * 3, y - h - 13); ctx.lineTo(x, y - h - 8); ctx.fill();
    } else if (d.kind === 'fire') {
      ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 18, y - 6, 36, 6);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const f = Math.sin(G.t * 9 + i * 2) * 4; ctx.fillStyle = i ? 'rgba(255,170,40,0.75)' : 'rgba(255,90,20,0.8)'; ctx.beginPath(); ctx.ellipse(x + (i - 1) * 7, y - 16 - i * 4 + f, 8 - i, 16 - i * 2, 0, 0, 7); ctx.fill(); }
      glow(x, y - 20, 60 + Math.sin(G.t * 7) * 6, '#ff9a30', 0.45);
      ctx.globalCompositeOperation = 'source-over';
    } else if (d.kind === 'gate') {
      const a = 0.18 + 0.08 * Math.sin(G.t * 2.5);
      const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0); g.addColorStop(0, 'rgba(255,215,106,0)'); g.addColorStop(0.5, 'rgba(255,215,106,' + a + ')'); g.addColorStop(1, 'rgba(255,215,106,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 26, y - 260, 52, 260);
      ctx.fillStyle = '#5a2a14'; ctx.fillRect(x - 46, y - 150, 12, 150); ctx.fillRect(x + 34, y - 150, 12, 150);
      ctx.fillStyle = '#9a2a1a'; ctx.fillRect(x - 60, y - 166, 120, 18); ctx.fillStyle = '#e8b040'; ctx.fillRect(x - 60, y - 168, 120, 3);
      txt(d.label, x, y - 178, 13, '#ffe9b0', 'center', true);
      txt('🛡', x, y - 150, 14, '#fff', 'center');
    }
  }
  function renderTitle() {
    G.camX += 0.4;
    txt('倚天屠龍記', W / 2, 140, 76, '#ffd76a', 'center', true, 'serif');
    txt('TẠ TỐN TRUYỀN KỲ', W / 2, 205, 40, '#fff', 'center', true);
    txt('16 môn phái · 30 bản đồ nối liền · Cấp 1 - 100', W / 2, 245, 20, '#ffe9b0', 'center', true);
    const pm = pModel(), sk = skin(pm, playerColor());
    if (sk) drawFrame(pm, sk, frameIdx(pm, 'idle', G.t), W / 2, H - 110, 1, 1.3);
    // 2 tao hinh con lai dung hai ben
    ['samurai', 'ninja', 'kunoichi'].filter(k => k !== pm.key).forEach((k, i) => { const m = MODELS[k], sk2 = skin(m, playerColor()); if (sk2) { ctx.globalAlpha = 0.55; drawFrame(m, sk2, frameIdx(m, 'idle', G.t + i), W / 2 + (i ? 170 : -170), H - 110, i ? -1 : 1, 1.05); ctx.globalAlpha = 1; } });
  }
  function pModel() { return MODELS[user().avatar] || MODELS.samurai; }
  function frameIdx(m, anim, t, dur) {
    const a = m.anims[anim] || m.anims.idle;
    if (dur) return a.s + clamp(Math.floor((t / dur) * a.n), 0, a.n - 1);
    const f = Math.floor(t * (a.fps || 12));
    return a.s + (a.loop ? f % a.n : Math.min(f, a.n - 1));
  }
  function drawFrame(m, img, fi, x, y, face, sc) {
    const sx = (fi % m.cols) * m.sw, sy = Math.floor(fi / m.cols) * m.sh;
    ctx.save(); ctx.translate(x, y); ctx.scale(face * m.native < 0 ? -sc : sc, sc);
    ctx.drawImage(img, sx, sy, m.sw, m.sh, -m.cx, -m.footY, m.fw, m.fh);
    ctx.restore();
  }
  function drawChar(m, color, fi, sx, y, face, sc, o) {
    o = o || {};
    const img = skin(m, color);
    if (!img) { ctx.fillStyle = color || '#c33'; ctx.fillRect(sx - 18 * sc, y - 90 * sc, 36 * sc, 90 * sc); return; }
    if (o.shadowY != null) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx, o.shadowY + 2, 30 * sc, 7 * sc, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowB || 18; }
    drawFrame(m, img, fi, sx, y, face, sc);
    ctx.shadowBlur = 0;
    if (o.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, o.flash * 7); drawFrame(m, img, fi, sx, y, face, sc); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  }
  function enemyFrame(e) {
    const m = e.model;
    if (e.dead) return frameIdx(m, 'dead', e.deadT);
    if (e.stunT > 0) return frameIdx(m, 'idle', e.at * 0.3);
    if (e.state === 'atk') return frameIdx(m, e.ranged ? 'throw' : (e.atkAnim || 'atk1'), Math.min(e.st, e.atkDur - 0.001), e.atkDur);
    if (e.state === 'hurt') return frameIdx(m, 'hurt', e.st);
    if (!e.onG) return frameIdx(m, e.vy < 0 ? 'jump' : 'fall', e.at);
    if (e.state === 'run') return frameIdx(m, 'run', e.at);
    return frameIdx(m, 'idle', e.at);
  }
  // ---- quai vat pixel ----
  function monAnim(e) {
    const d = e.mon, A = d.anims;
    if (e.state === 'atk' && A.atk) { const n = A.atk.f.length; return [A.atk, Math.min(n - 1, Math.floor(e.st / Math.max(0.05, e.atkDur || 0.6) * n))]; }
    const still = e.stunT > 0 || (!e.walk && !e.dashing && e.state !== 'run');
    const a = still && A.idle ? A.idle : A.walk;
    return [a, Math.floor(e.at * d.fps * (e.stunT > 0 ? 0.3 : still && !A.idle ? 0.45 : 1)) % a.f.length];
  }
  // Toa do khung tinh tren atlas goc 2048px; CDN (Hostinger) co the thu nho anh -> nhan ti le that
  const MOB_ATLAS_W = 2048;
  function monFrame(im, a, i, x, y, flip, sc) {
    const f = a.f[i], k = (im.naturalWidth || im.width || MOB_ATLAS_W) / MOB_ATLAS_W; ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, f[0] * k, f[1] * k, a.w * k, a.h * k, -a.ax * sc, -a.ay * sc, a.w * sc, a.h * sc);
    ctx.restore();
  }
  function drawMonAt(e, sx, y, alpha) {
    const im = IMG.mobs; if (!im) return;
    const [a, i] = monAnim(e), d = e.mon; ctx.globalAlpha = alpha;
    monFrame(im, a, i, sx, y - (d.fly ? d.fly + Math.sin(G.t * 3 + e.id) * 6 : 0), d.face * e.face < 0, e.msc); ctx.globalAlpha = 1;
  }
  function drawMon(e, sx, alpha) {
    const im = IMG.mobs, d = e.mon; if (!im) return;
    const hover = d.fly ? d.fly + Math.sin(G.t * 3 + e.id) * 6 : 0, w = d.anims.walk.w * e.msc;
    if (e.dead) { // khoi tan + bong mo dan
      if (e.deadT < 0.3) drawMonAt(e, sx, e.y, (0.3 - e.deadT) / 0.3);
      const fx = MOBS.defs.fx_death; if (fx) { const a = fx.anims.walk, k = Math.floor(e.deadT * fx.fps); if (k < a.f.length) monFrame(im, a, k, sx, e.y - hover + 6, false, fx.sc * Math.max(1, w / 100)); }
      return;
    }
    if (e.onG) { ctx.fillStyle = 'rgba(0,0,0,' + (d.fly ? 0.18 : 0.35) + ')'; ctx.beginPath(); ctx.ellipse(sx, e.y + 2, Math.max(16, w * 0.32), 6, 0, 0, 7); ctx.fill(); }
    const [a, i] = monAnim(e), flip = d.face * e.face < 0, y = e.y - hover;
    ctx.globalAlpha = alpha;
    if (e.boss || e.elite) { ctx.shadowColor = e.boss ? (e.enr ? '#ff2020' : '#ff7a3a') : '#ffcc40'; ctx.shadowBlur = 14; }
    monFrame(im, a, i, sx, y, flip, e.msc);
    ctx.shadowBlur = 0;
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, e.flash * 7); monFrame(im, a, i, sx, y, flip, e.msc); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  }
  function inView(x, y, m) { return x - G.camX > -m && x - G.camX < VW + m && y > G.camY - m && y < G.camY + VH + m + 140; }
  function renderWorld() {
    const cx = G.camX;
    renderGround(cx);
    renderTerrain(cx);
    G.fx.forEach(f => {
      if (f.type === 'tele_circle') { const k = f.t / f.dur; ctx.fillStyle = 'rgba(255,40,40,' + (0.15 + 0.25 * Math.abs(Math.sin(f.t * 14))) + ')'; ctx.beginPath(); ctx.ellipse(f.x - cx, f.y, f.r, 22, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,80,80,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x - cx, f.y, f.r * k, 22 * k, 0, 0, 7); ctx.stroke(); }
      if (f.type === 'tele_line') { ctx.fillStyle = 'rgba(255,40,40,' + (0.12 + 0.2 * Math.abs(Math.sin(f.t * 16))) + ')'; const x0 = f.dir > 0 ? f.x : f.x - f.len; ctx.fillRect(x0 - cx, f.y - 110, f.len, 110); }
    });
    G.others.forEach((o, id) => {
      if (!inView(o.x, o.y, 100)) return; const sx = o.x - cx;
      const sc = o.sect && Backend.sectOf ? Backend.sectOf(o.sect) : null, color = sc ? sc.color : '#3a6ad0', om = MODELS[o.av] || MODELS.samurai;
      const an = o.anim && ANIM[o.anim] ? (o.anim === 'run' && !o.moving ? 'idle' : o.anim) : (o.moving ? 'run' : 'idle');
      const fi = an.startsWith('atk') ? frameIdx(om, an, G.t % 0.3, 0.3) : frameIdx(om, an, G.t);
      if (o.wing >= 0 && o.wing < 8) drawWing(o.wing, sx, o.y, o.face || 1, o.anim === 'jump' || o.anim === 'fall' ? 2 : 0, 0.85);
      drawChar(om, color, fi, sx, o.y, o.face || 1, SC_P, { alpha: 0.92, shadowY: o.y });
      const pi = G.pkInfo[id];
      txt((o.lv ? 'Cấp ' + o.lv + ' ' : '') + o.name + (pi && +pi.prov >= 100 ? ' [TRUY NÃ]' : pi && +pi.pk > 0 ? ' [PK]' : ''), sx, o.y - 92, 13, nameCol(id, '#9ad0ff'), 'center', true);
      if (sc) txt('[' + sc.name + ']', sx, o.y - 106, 10, '#cfe', 'center', true);
      // Giao chien (doi phuong / minh bat PK, vua chem nhau, hoac dang mat mau): thanh mau do lon + so mau tren dau
      const hpk = clamp(o.hp / Math.max(1, o.maxhp || 200), 0, 1), fight = (pi && +pi.pk > 0) || pkMode() || G.t - (o.fightT || -99) < 12 || hpk < 1;
      if (fight) { bar(sx - 40, o.y - 88, 80, 9, hpk, hpk > 0.5 ? '#3ad06a' : hpk > 0.25 ? '#f0b030' : '#ff3a3a', true); txt(Math.max(0, Math.round(o.hp)) + ' / ' + Math.round(o.maxhp || 0), sx, o.y - 71, 10, '#fff', 'center', true); }
      else bar(sx - 28, o.y - 86, 56, 5, hpk, '#4aa0ff');
      drawBubble(id, sx, o.y - 122);
    });
    G.portals.forEach(pt => drawPortal(pt, cx));
    renderLoot(cx);
    renderNpcs(cx);
    const list = G.enemies.slice().sort((a, b) => (a.boss ? 0 : 1) - (b.boss ? 0 : 1));
    for (const e of list) {
      if (!inView(e.x, e.y, 200)) continue;
      const sx = e.x - cx;
      const fade = e.dead ? clamp(1.6 - e.deadT, 0, 1) : 1;
      if (e.trail) e.trail.forEach(t => { t.a -= 0.03; if (t.a > 0) { if (e.mon) drawMonAt(e, t.x - cx, t.y, t.a * 0.5); else drawChar(e.model, e.color, frameIdx(e.model, 'run', e.at), t.x - cx, t.y, e.face, e.scale, { alpha: t.a * 0.6 }); } });
      if ((e.boss || e.elite) && !e.dead) {
        ctx.globalCompositeOperation = 'lighter'; const R = e.boss ? 110 : 70; const gr = ctx.createRadialGradient(sx, e.y - 60 * e.scale, 10, sx, e.y - 60 * e.scale, R);
        gr.addColorStop(0, e.enr ? 'rgba(255,40,20,0.35)' : e.elite ? 'rgba(255,200,60,0.22)' : 'rgba(255,140,40,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(sx - R, e.y - 60 * e.scale - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over';
      }
      if (e.mon) drawMon(e, sx, fade);
      else drawChar(e.model, e.color, enemyFrame(e), sx, e.y, e.face, e.scale, { alpha: fade, flash: e.flash, glow: e.boss ? (e.enr ? '#ff2020' : bossFx(e)) : e.elite ? '#ffcc40' : null, glowB: 16, shadowY: e.onG ? e.y : null });
      if (e.dead) continue;
      const top = e.mon ? e.y - e.mtop : e.y - 122 * e.scale;
      if (e.kind !== 'boss') {
        if (e.elite || e.fboss) drawIcon(e.fboss ? 'ui_boss' : 'ui_elite', sx - 46, top - 30, 16);
        txt(e.name, sx, top - 16, e.fboss ? 14 : 12, e.fboss ? '#ffb070' : e.elite ? '#ffd76a' : '#ffdede', 'center', true);
        bar(sx - (e.fboss ? 45 : 30), top - 10, e.fboss ? 90 : 60, e.fboss ? 8 : 6, e.hp / e.max, e.fboss ? '#ff7a2a' : e.elite ? '#e0a020' : '#e5484d', e.dispHp / e.max);
      }
      if (e.state === 'atk' && !e.hitDone && !e.boss) txt('!', sx, top - 32, 22, '#ff3030', 'center', true);
      if (e.stunT > 0) for (let k = 0; k < 3; k++) { const a = G.t * 5 + k * 2.1; txt('★', sx + Math.cos(a) * 20, top - 2 + Math.sin(a) * 5, 13, '#ffe066', 'center'); }
    }
    const p = G.p;
    if (p) {
      const sx = p.x - cx;
      const pm = pModel();
      p.trail.forEach(t => {
        if (t.rot == null) { drawChar(pm, playerColor(), frameIdx(pm, 'run', t.f), t.x - cx, t.y, p.face, SC_P, { alpha: t.a * 0.5 }); return; }
        const gx = t.x - cx, gy = t.y - 48; ctx.save(); ctx.translate(gx, gy); ctx.rotate(t.rot); ctx.translate(-gx, -gy);
        drawChar(pm, '#9fd8ff', frameIdx(pm, 'jump', 0), gx, t.y, p.face, SC_P, { alpha: t.a * 0.45 }); ctx.restore();
      });
      if (p.buffT > 0) {
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(sx, p.y - 45, 5, sx, p.y - 45, 80); gr.addColorStop(0, 'rgba(255,200,60,0.4)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(sx - 90, p.y - 130, 180, 150); ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.4) part(p.x + rnd(-25, 25), p.y - rnd(0, 30), 0, rnd(-160, -60), 0.6, skills()[4].col, 3, true);
      }
      let fi;
      if (p.dead) fi = frameIdx(pm, 'dead', p.deadT);
      else if (p.anim.startsWith('atk') || p.anim === 'throw') fi = frameIdx(pm, p.anim, p.atkDur - Math.max(0, p.atkT), p.atkDur);
      else fi = frameIdx(pm, p.anim, p.at);
      const blink = p.invT > 0 && !p.dead && p.dashT <= 0 && Math.floor(G.t * 20) % 2 === 0;
      if (!p.onG && !p.dead) { const gy = surfaceAt(p.x).map(q => q.y).filter(y => y >= p.y).sort((a, b) => a - b)[0] || GROUND, k = clamp(1 - (gy - p.y) / 400, 0.2, 1); ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * k) + ')'; ctx.beginPath(); ctx.ellipse(sx, gy + 2, 28 * k, 6 * k, 0, 0, 7); ctx.fill(); }
      const flip = p.flipT > 0 && !p.dead, sq = p.squash;
      ctx.save();
      if (flip) { const gy = p.y - 48; ctx.translate(sx, gy); ctx.rotate(flipAngle(p)); ctx.translate(-sx, -gy); fi = frameIdx(pm, 'jump', 0); }
      else if (sq) { const ax = sq > 0 ? 1 + sq * 0.14 : 1 + sq * 0.08, ay = sq > 0 ? 1 - sq * 0.16 : 1 - sq * 0.1; ctx.translate(sx, p.y); ctx.scale(ax, ay); ctx.translate(-sx, -p.y); }
      if (p.wing >= 0 && !p.dead) drawWing(p.wing, sx, p.y, p.face, p.flying ? 2 : p.onG ? 0 : 1, blink ? 0.45 : 1);
      drawChar(pm, playerColor(), fi, sx, p.y, p.face, SC_P, { alpha: blink ? 0.45 : 1, glow: flip ? 'rgba(160,220,255,0.9)' : p.weapon === 'do_long' ? 'rgba(255,215,0,0.8)' : null, glowB: flip ? 16 : 12, shadowY: p.onG ? p.y : null });
      ctx.restore();
      if (p.shield > 0) { ctx.strokeStyle = 'rgba(255,220,100,' + (0.4 + 0.2 * Math.sin(G.t * 6)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, p.y - 40, 38, 52, 0, 0, 7); ctx.stroke(); }
      const me = user(), mcol = (me.provoke || 0) >= 100 ? '#ff4040' : (me.provoke || 0) >= 50 ? '#ff9a3a' : pkMode() > 0 ? '#d08aff' : '#ffe066';
      txt((me.nickname || 'Tạ Tốn') + (me.jail ? ' [TRUY NÃ]' : pkMode() === 2 ? ' [ĐỒ SÁT]' : pkMode() === 1 ? ' [PK BANG]' : ''), sx, p.y - 92, 13, mcol, 'center', true);
      txt('[' + sect().name + ']', sx, p.y - 106, 10, '#cfe', 'center', true);
      drawBubble(+user().id || 0, sx, p.y - 122);
    }
    G.projs.forEach(b => drawProj(b, cx));
    const px0 = cx - 60, px1 = cx + VW + 60;
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalCompositeOperation = pass ? 'source-over' : 'lighter';
      for (const q of G.parts) {
        if (q.add !== !pass || q.x < px0 || q.x > px1) continue;
        const a = clamp(q.life / q.max, 0, 1);
        if (q.kind === 'coin') { ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x - cx, q.y, q.size, 0, 7); ctx.fill(); }
        else if (q.kind === 'streak') { ctx.globalAlpha = a; ctx.strokeStyle = q.col; ctx.lineWidth = q.size; ctx.beginPath(); ctx.moveTo(q.x - cx, q.y); ctx.lineTo(q.x - cx - q.vx * 0.035, q.y - q.vy * 0.035); ctx.stroke(); }
        else if (q.add) glow(q.x - cx, q.y, q.size * 2.2, q.col, a);
        else { ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.fillRect(q.x - cx - q.size / 2, q.y - q.size / 2, q.size, q.size); }
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    G.fx.forEach(f => { if (!SCREEN_FX[f.type]) drawFx(f, cx); });
    G.texts.forEach(t => {
      const k = t.t / t.dur, sc = t.t < 0.1 ? 1 + (0.1 - t.t) * 5 : 1;
      ctx.globalAlpha = clamp(1.4 - k * 1.4, 0, 1); txt(t.txt, t.x - cx, t.y, t.size * sc, t.col, 'center', true); ctx.globalAlpha = 1;
    });
  }
  const SCREEN_FX = { flash: 1, dark: 1, ult_dragon: 1, ult_swords: 1, ult_palm: 1, ult_storm: 1 };
  function renderScreenFx() {
    G.fx.forEach(f => { if (SCREEN_FX[f.type]) { ctx.save(); drawScreenFx(f); ctx.restore(); } });
    renderWeather();
    if (G.vignette > 0) { const gr = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 800); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, 'rgba(200,0,0,' + G.vignette * 0.6 + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  }
  function drawProj(b, cx) {
    const x = b.x - cx;
    if (b.trail && b.trail.length > 1 && b.kind.startsWith('p_')) { // dai sang mo dan
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 1; i < b.trail.length; i++) {
        const t0 = b.trail[i - 1], t1 = b.trail[i], k = i / b.trail.length;
        ctx.globalAlpha = k * 0.55; ctx.strokeStyle = b.col; ctx.lineWidth = b.r * 1.3 * k;
        ctx.beginPath(); ctx.moveTo(t0.x - cx, t0.y); ctx.lineTo(t1.x - cx, t1.y); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (b.kind === 'p_orb') {
      ctx.globalCompositeOperation = 'lighter';
      glow(x, b.y, b.r * 2.4, b.col); glow(x, b.y, b.r * 0.9, '#ffffff');
      ctx.globalCompositeOperation = 'source-over';
    } else if (b.kind === 'p_needle') {
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = b.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - b.face * 34, b.y); ctx.lineTo(x + b.face * 8, b.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + b.face * 8, b.y, 2.5, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    } else if (b.kind === 'p_sword') {
      ctx.save(); ctx.translate(x, b.y); ctx.scale(b.face, 1); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35; ctx.fillStyle = b.col; ctx.fillRect(-60, -3, 50, 6); ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(-24, 0, 26, 0); g.addColorStop(0, b.col); g.addColorStop(1, '#ffffff'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-22, -3); ctx.lineTo(20, -3); ctx.lineTo(28, 0); ctx.lineTo(20, 3); ctx.lineTo(-22, 3); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(-26, -7, 4, 14); ctx.fillRect(-36, -2, 10, 4);
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    } else if (b.kind === 'p_petal') {
      ctx.save(); ctx.translate(x, b.y); ctx.rotate(b.rot); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(0, -9, 5, 10, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    } else if (b.kind === 'crescent') {
      ctx.save(); ctx.translate(x, b.y); ctx.scale(b.face, 1); ctx.globalCompositeOperation = 'lighter';
      glow(0, 0, b.r * 1.3, b.col, 0.45);
      for (let k = 0; k < 5; k++) { // luoi trang khuyet: nhieu lop, mong dan ve 2 dau
        ctx.strokeStyle = k === 4 ? '#ffffff' : b.col; ctx.globalAlpha = k === 4 ? 0.95 : 0.3 + k * 0.1;
        ctx.lineWidth = [44, 32, 22, 14, 6][k]; ctx.beginPath(); ctx.arc(-50 - k * 3, 0, b.r - k * 2, -1.15 + k * 0.05, 1.15 - k * 0.05); ctx.stroke();
      }
      ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    } else if (b.kind === 'dart') {
      ctx.save(); ctx.translate(x, b.y); ctx.rotate(b.rot); ctx.fillStyle = '#d8e8ff';
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3, -10); ctx.lineTo(-3, -10); ctx.fill(); }
      ctx.restore();
    } else if (b.kind === 'orb') {
      ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(x, b.y, 2, x, b.y, b.r * 1.8);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, b.col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, b.y, b.r * 1.8, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function drawFx(f, cx) {
    const k = clamp(f.t / f.dur, 0, 1);
    if (f.t < 0) return;
    ctx.save();
    if (f.type === 'slash') {
      const sc = (f.big || 1) * 0.9, e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      ctx.translate(f.x - cx + f.face * 26 * sc, f.y - 48 * sc); ctx.scale(f.face * sc, f.flip ? -1 : 1);
      ctx.globalCompositeOperation = 'lighter';
      const a0 = -1.5, a1 = -1.5 + 2.7 * e, fade = 1 - k * k;
      for (let i = 0; i < 4; i++) { // luoi chem hinh trang khuyet, 4 lop
        const r = 72 - i * 3, w = (16 - i * 3.5) * fade, start = Math.max(a0, a1 - 1.6 + i * 0.12);
        ctx.globalAlpha = (i ? 0.45 : 0.9) * fade; ctx.strokeStyle = i === 3 ? '#ffffff' : f.col; ctx.lineWidth = Math.max(0.5, w);
        ctx.beginPath(); ctx.arc(0, 0, r, start, a1); ctx.stroke();
      }
      ctx.globalAlpha = fade; glow(Math.cos(a1) * 70, Math.sin(a1) * 70, 26, f.col);
    } else if (f.type === 'ring') {
      const e = 1 - Math.pow(1 - k, 2.5);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const rr = f.r * Math.max(0, e - i * 0.12); if (rr <= 0) continue;
        ctx.globalAlpha = (1 - k) * (i ? 0.45 : 1); ctx.strokeStyle = i ? '#ffffff' : f.col; ctx.lineWidth = (i ? 4 : 22) * (1 - k) + 1.5;
        ctx.beginPath(); ctx.ellipse(f.x - cx, f.y, rr, rr * (f.flat ? 0.15 : 0.45), 0, 0, 7); ctx.stroke();
      }
      glow(f.x - cx, f.y, 60 * (1 - k) + 10, f.col, (1 - k) * 0.8);
    } else if (f.type === 'glyph') {
      ctx.globalAlpha = 1 - k; txt(f.ch, f.x - cx, f.y - k * 40, 70 + k * 60, f.col, 'center', true, 'serif');
    } else if (f.type === 'hit') {
      const S = f.big ? 1.5 : 1;
      ctx.globalCompositeOperation = 'lighter'; ctx.translate(f.x - cx, f.y);
      glow(0, 0, 34 * S * (1 - k * 0.5), f.col, 1 - k);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff'; ctx.rotate(0.6);
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); const L = (i % 2 ? 22 : 40) * S * (0.6 + k * 0.6); ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(L, 0); ctx.lineTo(0, 3); ctx.fill(); }
      ctx.strokeStyle = f.col; ctx.lineWidth = 3 * (1 - k); ctx.beginPath(); ctx.arc(0, 0, 10 + 34 * S * k, 0, 7); ctx.stroke();
    } else if (f.type === 'sun') {
      ctx.globalCompositeOperation = 'lighter'; ctx.translate(f.x - cx, f.y); ctx.rotate(f.t * 2); ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.col || '#ffcc40'; ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(40 + k * 30, 0); ctx.lineTo(70 + k * 50, 0); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 36 + k * 30, 0, 7); ctx.stroke();
      ctx.rotate(-f.t * 2); txt(f.ch || '陽', 0, 14, 40, '#fff2a0', 'center', false, 'serif');
    } else if (f.type === 'vortex' && G.p) {
      const p = G.p, x = p.x - cx, y = p.y - 50, fade = f.t < 0.2 ? f.t / 0.2 : f.t > f.dur - 0.3 ? (f.dur - f.t) / 0.3 : 1;
      ctx.globalCompositeOperation = 'lighter';
      glow(x, y, 150, f.col, 0.35 * fade);
      for (let ring = 0; ring < 3; ring++) {
        const R = 70 + ring * 55, sp = (ring % 2 ? -1 : 1) * (5 + ring);
        ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = ring === 1 ? '#ffffff' : f.col; ctx.lineWidth = 3 + ring;
        ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.38, 0, f.t * sp, f.t * sp + 4.2); ctx.stroke();
        for (let b = 0; b < 4; b++) { // luoi dao xoay
          const a = f.t * sp + b * Math.PI / 2, bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R * 0.38;
          ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 2); ctx.globalAlpha = fade;
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(4, 0); ctx.lineTo(0, 14); ctx.lineTo(-4, 0); ctx.fill();
          ctx.restore(); glow(bx, by, 16, f.col, fade);
        }
      }
      ctx.globalAlpha = 0.8 * fade; txt(f.ch || '旋', x, y - 110, 34, f.col, 'center', true, 'serif');
    } else if (f.type === 'pillar') {
      ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(f.x - cx - 50, 0, f.x - cx + 50, 0);
      gr.addColorStop(0, 'rgba(255,220,80,0)'); gr.addColorStop(0.5, 'rgba(255,240,160,' + (1 - k) * 0.8 + ')'); gr.addColorStop(1, 'rgba(255,220,80,0)');
      ctx.fillStyle = gr; ctx.fillRect(f.x - cx - 50, G.camY - 20, 100, f.y - G.camY + 20);
    }
    ctx.restore();
  }
  // ---- tuyet ky T (ve theo toa do man hinh) ----
  function drawScreenFx(f) {
    const k = clamp(f.t / f.dur, 0, 1);
    if (f.type === 'flash') { ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = f.col; ctx.fillRect(0, 0, W, H); }
    else if (f.type === 'dark') { ctx.globalAlpha = Math.sin(k * Math.PI) * 0.55; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    else if (f.type === 'ult_dragon') drawDragon(f);
    else if (f.type === 'ult_swords') {
      ctx.globalCompositeOperation = 'lighter';
      f.items.forEach(s => {
        const tt = f.t - s.d; if (tt < 0 || tt > 0.55) return;
        const y = -60 + (tt / 0.35) * (H * 0.85); const yy = Math.min(y, H * 0.82);
        ctx.save(); ctx.translate(s.x, yy); ctx.globalAlpha = tt > 0.35 ? 1 - (tt - 0.35) / 0.2 : 1;
        ctx.globalAlpha *= 0.35; ctx.fillStyle = f.col; ctx.fillRect(-3, -s.len - 60, 6, 60); ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.35);
        const g = ctx.createLinearGradient(0, -s.len, 0, 0); g.addColorStop(0, f.col); g.addColorStop(1, '#ffffff'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-4, -s.len); ctx.lineTo(4, -s.len); ctx.lineTo(4, -8); ctx.lineTo(0, 0); ctx.lineTo(-4, -8); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.fillRect(-10, -s.len - 4, 20, 4); ctx.fillRect(-2, -s.len - 18, 4, 14);
        if (y >= H * 0.82) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 2, 22, 6, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      });
    } else if (f.type === 'ult_palm') {
      const drop = Math.min(1, f.t / 0.7), cxs = W / 2, y = -260 + drop * (H * 0.62 + 260);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.t > 1.4 ? Math.max(0, 1 - (f.t - 1.4) / 0.5) : 0.9;
      const g = ctx.createRadialGradient(cxs, y, 20, cxs, y, 260); g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cxs, y, 260, 0, 7); ctx.fill();
      ctx.fillStyle = f.col; ctx.beginPath(); ctx.ellipse(cxs, y, 120, 140, 0, 0, 7); ctx.fill();
      [-90, -45, 0, 45].forEach((dx, i) => { ctx.beginPath(); ctx.ellipse(cxs + dx * 1.05, y - 170 - (i === 1 || i === 2 ? 30 : 0), 26, 80, 0, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.ellipse(cxs + 140, y - 30, 26, 70, -0.8, 0, 7); ctx.fill();
      txt('卍', cxs, y + 30, 90, '#fff8d0', 'center', false, 'serif');
      if (drop >= 1) { const rk = Math.min(1, (f.t - 0.7) / 0.5); ctx.globalAlpha = 1 - rk; ctx.strokeStyle = f.col; ctx.lineWidth = 20; ctx.beginPath(); ctx.ellipse(cxs, H * 0.8, 600 * rk, 90 * rk, 0, 0, 7); ctx.stroke(); }
    } else if (f.type === 'ult_storm') {
      const p = G.p; const px = (p.x - G.camX) * Z, py = (p.y - 50 - G.camY) * Z;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const a = i * 0.9 + f.t * 6, rr = 30 + (i * 11 + f.t * 520) % 700;
        const x = px + Math.cos(a) * rr, y = py + Math.sin(a) * rr * 0.55;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.globalAlpha = 0.8 * (1 - rr / 760);
        ctx.fillStyle = i % 3 ? f.col : '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 13, 0, 0, 7); ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = 0.4 * (1 - k); ctx.strokeStyle = f.col; ctx.lineWidth = 6;
      for (let r2 = 0; r2 < 3; r2++) { ctx.beginPath(); ctx.ellipse(px, py, (120 + r2 * 140) * (0.5 + k), (60 + r2 * 70) * (0.5 + k), f.t * 2, 0, 7); ctx.stroke(); }
    }
  }
  function dragonPos(f, t) {
    const prog = (t - 0.1) / 1.5, sx = f.dir > 0 ? -300 + prog * (W + 600) : W + 300 - prog * (W + 600);
    return { x: sx, y: H * 0.42 + Math.sin(t * 7) * 110 + Math.sin(t * 3.1) * 50 };
  }
  function drawDragon(f) {
    const segs = 32, pts = [];
    for (let i = 0; i < segs; i++) pts.push(dragonPos(f, f.t - i * 0.03));
    ctx.globalCompositeOperation = 'lighter';
    for (let i = segs - 1; i >= 0; i--) {
      const q = pts[i], r = 40 * (1 - i / segs * 0.75);
      const gr = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, r * 2.2); gr.addColorStop(0, 'rgba(255,240,150,0.5)'); gr.addColorStop(1, 'rgba(255,150,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, r * 2.2, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = segs - 1; i >= 0; i--) {
      const q = pts[i], r = 36 * (1 - i / segs * 0.75);
      ctx.fillStyle = i % 2 ? '#e8a810' : '#ffd040'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#9a5a00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y + r * 0.2, r * 0.7, 0.2, Math.PI - 0.2); ctx.stroke();
      if (i % 4 === 2) { ctx.fillStyle = '#ff7a20'; ctx.beginPath(); ctx.moveTo(q.x, q.y - r); ctx.lineTo(q.x - 9, q.y - r - 18); ctx.lineTo(q.x + 9, q.y - r - 7); ctx.fill(); }
    }
    const h = pts[0], h2 = pts[2], ang = Math.atan2(h.y - h2.y, h.x - h2.x);
    ctx.translate(h.x, h.y); ctx.rotate(ang); ctx.scale(1.2, 1.2);
    ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.ellipse(18, 0, 46, 30, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe890'; ctx.beginPath(); ctx.moveTo(40, -6); ctx.lineTo(90, -22 - Math.sin(f.t * 20) * 6); ctx.lineTo(60, 0); ctx.lineTo(90, 22 + Math.sin(f.t * 20) * 6); ctx.lineTo(40, 8); ctx.fill();
    ctx.fillStyle = '#c00'; ctx.beginPath(); ctx.arc(26, -12, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(27, -13, 2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ff9a20'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(-30, -60, -60, -50); ctx.moveTo(-4, -20); ctx.quadraticCurveTo(-20, -40, -50, -30); ctx.stroke();
    ctx.strokeStyle = '#fff2a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, 8); ctx.quadraticCurveTo(80, 40 + Math.sin(f.t * 9) * 10, 40, 70); ctx.moveTo(60, -8); ctx.quadraticCurveTo(80, -40, 40, -70 + Math.sin(f.t * 9) * 10); ctx.stroke();
  }
  function renderWeather() {
    const fx = G.stage && G.stage.theme ? G.stage.theme.fx : 'leaves';
    G.weather.forEach(w => {
      if (fx === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(w.x, w.y, 1.8 * w.s + 0.6, 0, 7); ctx.fill(); }
      else if (fx === 'embers' || fx === 'lanterns') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,' + (120 + Math.floor(w.s * 60)) + ',40,' + (0.4 + 0.4 * Math.sin(w.ph * 3)) + ')'; ctx.fillRect(w.x, w.y, 3 * w.s, 3 * w.s); ctx.globalCompositeOperation = 'source-over'; }
      else if (fx === 'petals') { ctx.fillStyle = 'rgba(255,170,200,0.85)'; ctx.beginPath(); ctx.ellipse(w.x, w.y, 5 * w.s, 2.5 * w.s, w.ph, 0, 7); ctx.fill(); }
      else if (fx === 'sea') { ctx.fillStyle = 'rgba(220,240,255,0.5)'; ctx.fillRect(w.x, w.y, 2, 2); }
      else { ctx.fillStyle = w.s > 1 ? 'rgba(220,140,40,0.8)' : 'rgba(120,180,60,0.8)'; ctx.beginPath(); ctx.ellipse(w.x, w.y, 5 * w.s, 2.5 * w.s, w.ph * 2, 0, 7); ctx.fill(); }
    });
  }
  function txt(s, x, y, size, col, align, stroke, family) {
    ctx.font = 'bold ' + Math.round(size) + 'px ' + (family === 'serif' ? '"KaiTi","STKaiti","SimSun","Noto Serif CJK SC",serif' : '"Segoe UI",Arial,sans-serif');
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  // Bong bong chat tren dau nhan vat: hien 10 giay, tu xuong dong (toi da 3 dong)
  const BUBBLE_T = 10;
  function wrapText(t, maxW) {
    const words = String(t).split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; if (lines.length >= 3) break; }
    if (cur && lines.length < 3) lines.push(cur);
    if (lines.length === 3 && words.join(' ').length > lines.join(' ').length) lines[2] = lines[2].slice(0, -1) + '…';
    return lines.map(l => ctx.measureText(l).width > maxW ? l.slice(0, Math.max(1, Math.floor(l.length * maxW / ctx.measureText(l).width) - 1)) + '…' : l);
  }
  function drawBubble(id, x, y) {
    const b = G.bubbles[id]; if (!b) return;
    const age = G.t - b.t; if (age > BUBBLE_T || age < 0) { delete G.bubbles[id]; return; }
    ctx.globalAlpha = age < 0.15 ? age / 0.15 : age > BUBBLE_T - 0.6 ? (BUBBLE_T - age) / 0.6 : 1;
    ctx.font = 'bold 12px "Segoe UI",Arial,sans-serif';
    if (!b.lines) b.lines = wrapText(b.text, 200);
    const w = Math.min(220, Math.max(...b.lines.map(l => ctx.measureText(l).width)) + 18), h = b.lines.length * 15 + 9, by = y - h - (age < 0.15 ? (0.15 - age) * 40 : 0);
    ctx.fillStyle = b.pm ? 'rgba(255,236,250,0.95)' : 'rgba(255,255,255,0.94)'; ctx.strokeStyle = b.mine ? '#d8a020' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    rrect(x - w / 2, by, w, h, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, by + h); ctx.lineTo(x + 6, by + h); ctx.lineTo(x, by + h + 7); ctx.closePath(); ctx.fill();
    b.lines.forEach((l, i) => txt(l, x, by + 16 + i * 15, 12, '#222', 'center', false));
    ctx.globalAlpha = 1;
  }
  function bar(x, y, w, h, v, col, trail) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    if (trail != null && trail > v) { ctx.fillStyle = '#fff3c0'; ctx.fillRect(x, y, w * clamp(trail, 0, 1), h); }
    ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(v, 0, 1), h);
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ---------- NPC ----------
  function npcMarker(n) {
    if (n.svc) return SVC_MARK[n.svc] || '';
    const u = user(); let mk = '';
    for (const q of Backend.QUESTS) { if (q.npc !== n.id) continue; const st = Backend.questStatus(q, u); if (st === 'ready') return '?'; if (st === 'available') mk = '!'; }
    return mk;
  }
  function nearNpc() {
    const p = G.p; if (!p) return null; let best = null;
    G.npcs.forEach(n => { const d = Math.abs(n.x - p.x); if (d < 95 && Math.abs(p.y - GROUND) < 60 && (!best || d < Math.abs(best.x - p.x))) best = n; });
    return best;
  }
  function talkNpc(n) {
    n = n || nearNpc(); if (!n || G.state !== 'play' || !G.p || G.p.dead) return;
    G.state = 'npc'; G.input = {}; Sfx.play('ui');
    if (window.UI) UI.npc(n);
  }
  function renderNpcs(cx) {
    const near = nearNpc();
    G.npcs.forEach(n => {
      const sx = n.x - cx; if (sx < -100 || sx > VW + 100) return;
      if (G.p) n.face = sign(G.p.x - n.x);
      ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(sx, GROUND - 4, 2, sx, GROUND - 4, 46);
      gr.addColorStop(0, 'rgba(255,215,106,0.35)'); gr.addColorStop(1, 'rgba(255,215,106,0)'); ctx.fillStyle = gr; ctx.fillRect(sx - 50, GROUND - 30, 100, 40); ctx.globalCompositeOperation = 'source-over';
      drawChar(n.model, n.color, frameIdx(n.model, 'idle', G.t + n.x * 0.01), sx, GROUND, n.face || 1, SC_OTHER, { shadowY: GROUND });
      txt(n.name, sx, GROUND - 94, 13, '#7cf0ff', 'center', true);
      txt('〈' + n.title + '〉', sx, GROUND - 80, 10, '#cde', 'center', true);
      const mk = npcMarker(n);
      if (mk) { const by = GROUND - 112 + Math.sin(G.t * 4) * 4; txt(mk, sx, by, n.svc ? 22 : 26, mk === '?' ? '#7cff6a' : '#ffd24a', 'center', true); }
      if (near === n && G.state === 'play') {
        ctx.fillStyle = 'rgba(10,8,20,0.8)'; rrect(sx - 62, GROUND + 10, 124, 24, 8); ctx.fill();
        txt(MOBILE ? 'Chạm để nói chuyện' : '[F] Nói chuyện', sx, GROUND + 27, 13, '#ffe066', 'center', true);
      }
    });
  }

  // ---------- HUD (toa do man hinh) ----------
  function renderQuestTracker(u) {
    const list = [];
    for (const q of Backend.QUESTS) { const st = Backend.questStatus(q, u); if (st === 'active' || st === 'ready') list.push({ q, st });       if (list.length >= (MOBILE ? 2 : 4)) break; }
    if (!list.length) return;
    const x = W - 340, y0 = MOBILE ? 136 : 104, h = 26 + list.length * 44;
    if (MOBILE) hudRect(W, 0, HS, x, y0, 328, h, 'quest');
    ctx.fillStyle = 'rgba(10,8,20,0.7)'; rrect(x, y0, 328, h, 10); ctx.fill();
    drawIcon('ui_quest', x + 8, y0 + 5, 20); txt(MOBILE ? 'Nhiệm vụ (chạm để xem)' : 'Nhiệm vụ (phím N)', x + 34, y0 + 21, 16, '#ffd76a', 'left', true);
    list.forEach((it, i) => {
      const y = y0 + 46 + i * 44, q = it.q, pr = Math.min(q.n, Backend.questProgress(q, u));
      const nm = (q.cat === 'main' ? '★ ' : q.daily ? '◆ ' : '') + q.name;
      txt(nm.length > 30 ? nm.slice(0, 29) + '…' : nm, x + 10, y - 4, 15, it.st === 'ready' ? '#9dff6a' : q.cat === 'main' ? '#ffd76a' : '#fff', 'left', true);
      if (it.st === 'ready') txt(MOBILE ? '✔ Xong - chạm để nhận thưởng' : '✔ Xong - bấm N nhận thưởng', x + 10, y + 15, 14, '#9dff6a', 'left', true);
      else { bar(x + 10, y + 5, 250, 9, pr / q.n, '#ffb030'); txt(pr + '/' + q.n, x + 318, y + 14, 14, '#fff', 'right', true); }
    });
  }
  // ================= HUONG DAN NHIEM VU CHINH: viec can lam + mui ten chi duong =================
  function mainQuest(u) {
    for (const q of Backend.QUESTS) { if (q.cat !== 'main') continue; const st = Backend.questStatus(q, u); if (st !== 'done') return { q, st }; }
    return null;
  }
  function guideInfo(u) {
    if (!u.sect && (u.level || 1) >= SECT_LV) return { title: '⛩ Bái nhập môn phái', lines: [(MOBILE ? 'Chạm' : 'Bấm') + ' vào khung này để chọn 1 trong 16 môn phái,', 'mở tuyệt kỹ môn phái (T, Y) và nhận thêm chỉ số.'], x: null, col: '#ffb030', act: 'sect' };
    const m = mainQuest(u); if (!m) return null;
    const q = m.q, T = +q.stage, cur = G.stage.idx, st = STAGES().find(x => +x.idx === T), p = G.p;
    const g = { title: '★ ' + q.name, lines: [], x: null, col: '#ffd76a' };
    if (m.st === 'locked') { g.lines.push('Cần đạt cấp / mở bản đồ ' + T + ' để nhận chương này.'); return g; }
    if (m.st === 'available') { g.lines.push('Bấm ' + kh('N', 'Nhiệm vụ') + ' → "Nhận nhiệm vụ".'); return g; }
    if (m.st === 'ready') { g.lines.push('✔ Đã hoàn thành! Bấm ' + kh('N', 'Nhiệm vụ') + ' để nhận thưởng.'); g.col = '#9dff6a'; return g; }
    if (T !== cur) {
      if (T > (u.stage_max || 1)) { g.lines.push('Chưa mở bản đồ ' + T + ': hạ Boss Bản Đồ ' + (T - 1) + ' trước.'); return g; }
      const pt = G.portals.find(o => (T > cur ? o.side > 0 : o.side < 0));
      g.lines.push('Tới bản đồ ' + T + ': ' + (st ? st.name : '') + '.');
      g.lines.push('Đi theo mũi tên tới cổng ' + (T > cur ? 'cuối bản đồ (bên phải)' : 'đầu bản đồ (bên trái)') + ' hoặc mở Bản đồ (' + kh('M', 'Bản đồ') + ').');
      if (pt) g.x = pt.x;
      return g;
    }
    const boss = G.enemies.find(e => e.mboss && !e.dead);
    if (boss) { g.lines.push('Boss Bản Đồ ' + (st ? st.boss_name : '') + ' đã xuất hiện - đánh bại nó!'); g.x = boss.x; g.col = '#ff7a5a'; return g; }
    g.lines.push('Hạ thêm ' + G.mbLeft + ' quái để gọi Boss Bản Đồ ' + (st ? st.boss_name : '') + '.');
    let best = null; G.enemies.forEach(e => { if (!e.dead && (!best || Math.abs(e.x - p.x) < Math.abs(best.x - p.x))) best = e; });
    if (best) g.x = best.x;
    return g;
  }
  function renderGuide(u) {
    const g = guideInfo(u), p = G.p; if (!g || !p) return;
    const x0 = 14, y0 = MOBILE ? (u.jail ? 186 : 166) : (u.jail ? 156 : 140), w = 470, h = 34 + g.lines.length * 24, gs = MOBILE ? 1.1 : 1;
    hudAt(0, 0, gs, () => {
      ctx.fillStyle = 'rgba(30,18,6,0.78)'; rrect(x0, y0, w, h, 10); ctx.fill(); ctx.strokeStyle = g.col; ctx.lineWidth = 2; ctx.stroke();
      txt('📜 Hướng dẫn: ' + (g.title.length > 34 ? g.title.slice(0, 33) + '…' : g.title), x0 + 12, y0 + 24, 17, g.col, 'left', true);
      g.lines.forEach((l, i) => txt(l.length > 58 ? l.slice(0, 57) + '…' : l, x0 + 12, y0 + 48 + i * 24, 15, '#fff', 'left', true));
    });
    if (g.act || MOBILE) hudRect(0, 0, gs, x0, y0, w, h, g.act || 'quest');
    if (g.x == null) return;
    // mui ten vang tren dau nhan vat chi huong + khoang cach
    const dx = g.x - p.x, dir = dx >= 0 ? 1 : -1, dist = Math.abs(dx);
    const sx = (p.x - G.camX) * Z, sy = (p.y - 175 - G.camY) * Z + Math.sin(G.t * 5) * 4;
    if (dist > 80) {
      ctx.save(); ctx.translate(sx + dir * (40 + Math.sin(G.t * 6) * 6), sy); ctx.scale(dir, 1);
      ctx.fillStyle = g.col; ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(4, -10); ctx.lineTo(4, -22); ctx.lineTo(30, 0); ctx.lineTo(4, 22); ctx.lineTo(4, 10); ctx.lineTo(-26, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      txt(Math.round(dist / 10) + ' bước', sx + dir * 40, sy + 40, 14, '#fff', 'center', true);
    }
    // muc tieu trong tam nhin: mui ten nhun nhay tren dau muc tieu
    const tx = (g.x - G.camX) * Z;
    if (tx > 20 && tx < W - 20) {
      const ty = (GROUND - 190 - G.camY) * Z + Math.abs(Math.sin(G.t * 4)) * -14;
      ctx.fillStyle = g.col; ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx - 16, ty - 22); ctx.lineTo(tx + 16, ty - 22); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function hudAt(ax, ay, k, fn) { if (k === 1) return fn(); ctx.save(); ctx.translate(ax, ay); ctx.scale(k, k); ctx.translate(-ax, -ay); fn(); ctx.restore(); }
  function hudRect(ax, ay, k, x, y, w, h, act) { G.uiRects.push({ x: ax + (x - ax) * k, y: ay + (y - ay) * k, w: w * k, h: h * k, act }); }
  function renderHud() {
    const p = G.p, u = user(); G.uiRects = [];
    hudAt(0, 0, HS, () => hudPlayer(p, u));
    hudAt(W, 0, HS, () => hudMoney(u));
    hudAt(W / 2, 0, MOBILE ? 1.12 : 1, () => hudTop(p));
    const vis = G.enemies.some(e => !e.dead && inView(e.x, e.y, 0));
    if (!vis) {
      let best = null; G.enemies.forEach(e => { if (!e.dead && (!best || Math.abs(e.x - p.x) < Math.abs(best.x - p.x))) best = e; });
      if (best) { const d = sign(best.x - p.x), ax = d > 0 ? W - 50 : 50, ay = H * (MOBILE ? 0.4 : 0.5) + Math.sin(G.t * 6) * 6; ctx.fillStyle = 'rgba(255,90,60,0.85)'; ctx.beginPath(); ctx.moveTo(ax + d * 24, ay); ctx.lineTo(ax - d * 6, ay - 20); ctx.lineTo(ax - d * 6, ay + 20); ctx.fill(); }
    }
    if (G.combo >= 3) {
      const a = clamp(G.comboT, 0, 1), cx = MOBILE ? W / 2 + 260 : W - 24, cy = MOBILE ? H * 0.36 : 350; ctx.globalAlpha = a;
      txt(G.combo + ' LIÊN KÍCH', cx, cy, 34, '#ffb030', 'right', true); txt('連擊', cx, cy + 22, 16, '#fff', 'right', true); ctx.globalAlpha = 1;
    }
    hudAt(W, 0, HS, () => renderQuestTracker(u));
    renderGuide(u);
    if (!MOBILE) { hudSkills(p, u); ctx.fillStyle = 'rgba(12,10,24,0.8)'; rrect(W - 54, 56, 42, 34, 8); ctx.fill(); txt('❚❚', W - 33, 79, 15, '#fff', 'center'); G.uiRects.push({ x: W - 54, y: 56, w: 42, h: 34, act: 'pause' }); }
  }
  function hudPlayer(p, u) {
    ctx.fillStyle = 'rgba(10,8,20,0.7)'; rrect(12, 12, 330, 86, 12); ctx.fill(); ctx.strokeStyle = '#b8902a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(54, 55, 36, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffd76a'; ctx.stroke();
    const pm = pModel(), sk = skin(pm, playerColor());
    if (sk) { ctx.save(); ctx.beginPath(); ctx.arc(54, 55, 34, 0, 7); ctx.clip(); drawFrame(pm, sk, 0, 56, 132, 1, 0.75); ctx.restore(); }
    drawIcon(sect().icon || 'em_flame', 76, 66, 26);
    txt('Cấp ' + p.level, 54, 106, 14, '#ffe066', 'center', true);
    txt((u.nickname || 'Tạ Tốn') + ' · ' + sect().name, 100, 33, 14, '#fff', 'left', true);
    bar(100, 41, 228, 14, p.hp / p.maxhp, '#e5484d'); txt(Math.ceil(p.hp) + '/' + p.maxhp, 214, 53, 11, '#fff', 'center', true);
    if (p.shield > 0) bar(100, 41, 228 * clamp(p.shield / p.maxhp, 0, 1), 3, 1, '#ffd24a');
    bar(100, 60, 228, 11, p.mp / p.maxmp, '#3a8aff'); txt(Math.floor(p.mp) + '/' + p.maxmp, 214, 70, 10, '#fff', 'center', true);
    const need = Backend.RULES.expNeed(u.level || 1); bar(100, 77, 228, 6, (u.exp || 0) / need, '#9dff6a');
    if (p.wing >= 0) { bar(100, 86, 110, 5, p.flyMax ? p.flyE / p.flyMax : 0, WING_COL[p.wing]); txt('Bay', 214, 92, 9, '#cfe', 'left', true); }
    txt('KN ' + (u.exp || 0) + '/' + need, 328, 94, 10, '#cfe', 'right', true);
    const pkm = pkMode(), PKN = ['☮ Hòa bình', '⚔ PK Bang', '☠ Đồ sát'];
    txt(PKN[pkm] + '  ·  Thiện ' + (u.friendly == null ? 100 : u.friendly) + '  ·  Khiêu khích ' + (u.provoke || 0), 18, 126, 12, pkm ? '#d08aff' : '#bfe', 'left', true);
    if (u.jail) txt('⚠ TRUY NÃ: kẹt tại bản đồ này (giảm khiêu khích < 100 để rời)', 18, 144, 12, '#ff5050', 'left', true);
    if (p.buffT > 0) txt(skills()[4].name + ' ' + Math.ceil(p.buffT) + 's', 18, u.jail ? 162 : 144, 13, '#ffcc40', 'left', true);
  }
  function hudMoney(u) {
    ctx.fillStyle = 'rgba(10,8,20,0.7)'; rrect(W - 300, 12, 288, 36, 8); ctx.fill();
    drawIcon('gold', W - 294, 16, 28); txt(String(u.gold || 0), W - 262, 37, 15, '#ffd24a', 'left', true);
    drawIcon('nguyen_bao', W - 160, 16, 28); txt(String(u.ingot || 0), W - 128, 37, 15, '#ffe9a0', 'left', true);
    txt('Hạ: ' + G.kills, W - 22, 37, 12, '#fff', 'right', true);
  }
  function hudTop(p) {
    const s = G.stage;
    txt(s.idx + '. ' + s.name + (MOBILE ? '' : '  (đề cử Cấp ' + s.unlock_level + ')'), W / 2, 30, 18, '#ffe9b0', 'center', true);
    if (G.boss && !G.boss.dead) {
      const b = G.boss; drawIcon('ui_boss', W / 2 - 240, 40, 30);
      txt(b.name + (b.enr ? ' [CUỒNG NỘ]' : ''), W / 2, 54, 16, b.enr ? '#ff5050' : '#ffb0a0', 'center', true);
      bar(W / 2 - 200, 60, 400, 15, b.hp / b.max, b.enr ? '#ff2a2a' : '#d8402a', b.dispHp / b.max);
      txt(Math.max(0, Math.ceil(b.hp)) + ' / ' + b.max, W / 2, 73, 11, '#fff', 'center', true);
    } else {
      if (MOBILE) {
        txt('👑 Boss Bản Đồ xuất hiện sau ' + G.mbLeft + ' quái', W / 2, 52, 14, '#ffb070', 'center', true);
        if (G.shared) txt('🌐 ' + (1 + (window.RT ? RT.othersCount() : 0)) + ' người trong bản đồ', W / 2, 70, 12, '#9dff6a', 'center', true);
      } else {
      txt('👑 Boss Bản Đồ ' + s.boss_name + ' xuất hiện sau ' + G.mbLeft + ' quái nữa' + (G.shared ? ' (cả bản đồ cùng đếm)' : ''), W / 2, 52, 13, '#ffb070', 'center', true);
      txt(G.shared ? '🌐 ' + (1 + (window.RT ? RT.othersCount() : 0)) + ' người trong bản đồ · ' + (window.RT && RT.connected ? 'đã kết nối' : 'đang kết nối...') + ' · Tinh Anh & Thủ Lĩnh xuất hiện liên tục' : 'Đánh một mình · mỗi 20 quái có Tinh Anh, mỗi 30 quái có Thủ Lĩnh', W / 2, 70, 11, G.shared ? '#9dff6a' : '#cde', 'center', true);
      }
    }
    const mx = W / 2 - 200, my = 84; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(mx, my, 400, 6);
    G.enemies.forEach(e => { if (!e.dead) { ctx.fillStyle = e.boss ? '#ff3030' : e.elite ? '#ffd24a' : '#ff9a9a'; ctx.fillRect(mx + 400 * e.x / G.worldW - (e.boss ? 3 : 1.5), my - (e.boss ? 2 : 0), e.boss ? 6 : 3, e.boss ? 10 : 6); } });
    G.npcs.forEach(n => { ctx.fillStyle = '#7cf0ff'; ctx.fillRect(mx + 400 * n.x / G.worldW - 1.5, my, 3, 6); });
    G.portals.forEach(pt => { ctx.fillStyle = '#b070ff'; ctx.fillRect(mx + 400 * pt.x / G.worldW - 2, my - 2, 4, 10); });
    ctx.fillStyle = '#ffe066'; ctx.fillRect(mx + 400 * p.x / G.worldW - 2, my - 3, 4, 12);
  }
  function hudSkills(p, u) {
    const SK = skills();
    const slots = SK.map(sk => ({ sk })).concat([{ pot: 'binh_hp', key: 'Q', glyph: '藥', col: '#9dff6a', label: 'Thuốc máu' }, { pot: 'binh_mp', key: 'E', glyph: '丹', col: '#5ab0ff', label: 'Thuốc nội lực' }]);
    const sz = 60, gap = 10, tw = slots.length * sz + (slots.length - 1) * gap, x0 = Math.max(12, W / 2 - tw / 2 - 35), y0 = H - sz - 26;
    ctx.font = 'bold 11px "Segoe UI",Arial,sans-serif';
    slots.forEach((sl, i) => { // ten tieng Viet duoi o
      let nm = sl.sk ? sl.sk.name : sl.label; while (nm.length > 3 && ctx.measureText(nm).width > sz + gap - 2) nm = nm.slice(0, -2) + '…';
      txt(nm, x0 + i * (sz + gap) + sz / 2, y0 + sz + 15, 11, '#ffe9b0', 'center', true);
    });
    slots.forEach((sl, i) => {
      const x = x0 + i * (sz + gap), y = y0;
      ctx.fillStyle = 'rgba(12,10,24,0.82)'; rrect(x, y, sz, sz, 10); ctx.fill();
      let locked = false, cdk = 0, glyph, col, key, cnt = null, nomp = false;
      if (sl.sk) { const k = sl.sk; locked = skLocked(k, p.level); cdk = (p.cds[k.id] || 0) / k.cd; glyph = k.glyph; col = k.col; key = k.key; nomp = p.mp < k.mp; }
      else { glyph = sl.glyph; col = sl.col; key = sl.key; cnt = (u.inv || {})[sl.pot] || 0; cdk = G.potCd / 1.5; locked = cnt <= 0; }
      const ik = sl.sk ? sl.sk.icon : sl.pot;
      if (!drawIcon(ik, x + 1, y + 1, sz - 2, locked ? 0.35 : nomp ? 0.55 : 1)) {
        ctx.strokeStyle = locked ? '#444' : col; ctx.lineWidth = 2; rrect(x, y, sz, sz, 10); ctx.stroke();
        txt(glyph, x + sz / 2, y + 41, 32, locked ? '#555' : (nomp ? '#6a7aa0' : col), 'center', true, 'serif');
      }
      if (sl.sk) txt(glyph, x + sz - 6, y + 18, 13, col, 'right', true, 'serif');
      txt(key, x + 6, y + 15, 12, '#fff', 'left', true);
      if (sl.sk && sl.sk.mp) txt(sl.sk.mp, x + sz - 5, y + sz - 5, 10, '#7ab0ff', 'right', true);
      if (cnt != null) txt('x' + cnt, x + sz - 5, y + sz - 5, 11, '#fff', 'right', true);
      if (cdk > 0 && !locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.moveTo(x + sz / 2, y + sz / 2); ctx.arc(x + sz / 2, y + sz / 2, sz * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdk); ctx.closePath();
        ctx.save(); rrect(x, y, sz, sz, 10); ctx.clip(); ctx.fill(); ctx.restore();
        if (sl.sk) txt(((p.cds[sl.sk.id] || 0)).toFixed(1), x + sz / 2, y + sz / 2 + 6, 15, '#fff', 'center', true);
      }
      if (locked && sl.sk) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(x, y, sz, sz, 10); ctx.fill(); txt(sl.sk.sectLock ? 'Môn phái' : 'Cấp ' + sl.sk.lv, x + sz / 2, y + sz / 2 + 5, 13, '#bbb', 'center', true); }
      G.uiRects.push({ x, y, w: sz, h: sz, act: sl.sk ? sl.sk.id : sl.pot });
    });
  }
  function renderMsgs() { hudAt(W / 2, 0, MOBILE ? 1.15 : 1, renderMsgsIn); }
  function renderMsgsIn() {
    G.msgs.forEach((m, i) => {
      const k = m.t / m.dur, a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      const y = 210 + i * 46, sc = k < 0.15 ? 1.4 - k * 2.6 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(W / 2 - 360, y - 34, 720, 48);
      txt(m.text, W / 2, y, 28 * sc, m.col, 'center', true);
      ctx.globalAlpha = 1;
    });
  }

  // ================= INPUT =================
  // Di chuyen: A D (hoac mui ten), W / Space nhay, S xuong be. R (hoac J / X) danh thuong. 1-6 tuyet hoc. Q / E thuoc mau / noi luc.
  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'jump', Space: 'jump',
    KeyA: 'left', KeyD: 'right', KeyS: 'down', KeyW: 'jump',
    KeyR: 'atk', KeyJ: 'atk', KeyX: 'atk', ShiftLeft: 'dash', ShiftRight: 'dash', KeyL: 'dash', KeyF: 'talk',
    Digit1: 'tt', Digit2: 'sth', Digit3: 'dl', Digit4: 'cd', Digit5: 'ult', Digit6: 'vx',
    Numpad1: 'tt', Numpad2: 'sth', Numpad3: 'dl', Numpad4: 'cd', Numpad5: 'ult', Numpad6: 'vx',
    KeyQ: 'hp', KeyE: 'mpp',
  };
  const HOLD = { left: 1, right: 1, atk: 1, down: 1, jump: 1 };
  function typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  function onKey(e, down) {
    if (typing(e)) return;
    Sfx.init();
    const a = KEYMAP[e.code];
    if (down && G.state === 'npc' && (e.code === 'Escape' || e.code === 'KeyF')) { if (window.UI) UI.closeNpc(); e.preventDefault(); return; }
    if (down && (e.code === 'Escape' || e.code === 'KeyP') && (G.state === 'play' || G.state === 'pause')) { togglePause(); e.preventDefault(); return; }
    if (G.state === 'dialog' && down && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR' || e.code === 'KeyJ' || e.code === 'KeyX')) { if (window.UI) UI.dialogNext(); e.preventDefault(); return; }
    if (!a) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (down && (a === 'left' || a === 'right' || a === 'jump')) G.walkTo = null; // tu bam di chuyen -> huy tu chay toi muc tieu
    if (!down) { if (HOLD[a]) G.input[a] = false; return; }
    if (G.state !== 'play') return;
    if (HOLD[a]) G.input[a] = true;
    if (!e.repeat) G.pressed[a] = true;
  }
  function press(a, down) {
    Sfx.init();
    if (!down) { if (HOLD[a]) G.input[a] = false; return; }
    if (a === 'talk' && G.state === 'npc') { if (window.UI) UI.closeNpc(); return; }
    if (G.state !== 'play') return;
    if (HOLD[a]) G.input[a] = true;
    G.pressed[a] = true;
  }
  function togglePause() {
    if (G.state === 'play') { G.state = 'pause'; G.input = {}; G.pressed = {}; UI.pause(true); }
    else if (G.state === 'pause') { G.state = 'play'; G.input = {}; G.pressed = {}; UI.pause(false); }
  }
  function canvasPoint(ev) { // ho tro canvas co vien den (object-fit: contain)
    const r = cv.getBoundingClientRect(), k = Math.min(r.width / W, r.height / H);
    return { x: (ev.clientX - r.left - (r.width - W * k) / 2) / k, y: (ev.clientY - r.top - (r.height - H * k) / 2) / k };
  }
  function fitCanvas() {
    if (!MOBILE || !cv) return;
    const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const h = Math.round(clamp(W * r.height / r.width, 520, 900));
    if (h !== H) { H = h; VH = H / Z; cv.height = H; }
  }
  function onCanvasDown(ev) {
    Sfx.init();
    if (G.state === 'dialog') { UI.dialogNext(); return; }
    if (G.state !== 'play') return;
    const pt = canvasPoint(ev);
    const hit = G.uiRects.find(r => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
    if (hit) {
      ev.preventDefault();
      if (hit.act === 'pause') togglePause();
      else if (hit.act === 'quest') { if (window.UI) UI.openWin('quest'); }
      else if (hit.act === 'sect') { if (window.UI) UI.openSect(); }
      else if (hit.act === 'binh_hp') G.pressed.hp = true;
      else if (hit.act === 'binh_mp') G.pressed.mpp = true;
      else G.pressed[hit.act] = true;
      return;
    }
    const wx = pt.x / Z + G.camX, wy = pt.y / Z + G.camY;
    let pick = null, pd = 1e9;
    G.others.forEach((o, id) => { const d = Math.abs(o.x - wx); if (d < 38 && wy > o.y - 115 && wy < o.y + 12 && d < pd) { pd = d; pick = id; } });
    if (pick != null && G.onPlayerClick) {
      ev.preventDefault();
      const o = G.others.get(pick), cx = ev.clientX, cy = ev.clientY;
      if (Math.abs(o.x - G.p.x) <= 110) G.onPlayerClick(pick, o.name || '', cx, cy);
      else { walkTo('player', pick, 90, () => G.onPlayerClick(pick, o.name || '', cx, cy)); floatText(o.x, o.y - 130, '▼', '#ffd76a', 18); }
      return;
    }
    const cn = G.npcs.find(n => Math.abs(n.x - wx) < 40 && wy > GROUND - 100 && wy < GROUND + 10);
    if (cn) { ev.preventDefault(); if (Math.abs(cn.x - G.p.x) < 80) talkNpc(cn); else { walkTo('npc', cn, 60, () => talkNpc(cn)); floatText(cn.x, GROUND - 120, '▼', '#ffd76a', 18); } return; }
    if (ev.pointerType === 'mouse' && ev.button === 0) G.pressed.atk = true;
  }

  // ================= LOOP =================
  let last = 0, errShown = false, fitN = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (MOBILE && ++fitN % 30 === 1) fitCanvas();
    let dt = last ? (ts - last) / 1000 : 0; last = ts;
    if (!(dt > 0)) dt = 0; dt = Math.min(dt, 1 / 30);
    try { update(dt); render(); }
    catch (e) { console.error(e); if (!errShown) { errShown = true; log('Lỗi: ' + e.message); } }
  }

  async function init() {
    cv = document.getElementById('game'); if (!cv) return;
    cv.width = W; cv.height = H; ctx = cv.getContext('2d');
    if (MOBILE) { fitCanvas(); window.addEventListener('resize', fitCanvas); window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 300)); }
    requestAnimationFrame(frame);
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('blur', () => { G.input = {}; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') togglePause(); });
    cv.addEventListener('pointerdown', onCanvasDown);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    const unlock = () => { Sfx.init(); Music.refresh(); if (Amb.kind) Amb.refresh(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    const list = [['hero', 'assets/img/hero.png'], ['hero_robe', 'assets/img/hero_robe.png'], ['ninja', 'assets/img/ninja.png'], ['ninja_robe', 'assets/img/ninja_robe.png'],
      ['kunoichi', 'assets/img/kunoichi.png'], ['kunoichi_robe', 'assets/img/kunoichi_robe.png'], ['icons', 'assets/img/icons.png'], ['mobs', 'assets/img/mobs.png'], ['wings', 'assets/img/wings.png'], ['bg_bg', 'assets/img/bg/bg.png'], ['bg_far', 'assets/img/bg/montain-far.png'],
      ['bg_mtn', 'assets/img/bg/mountains.png'], ['bg_trees', 'assets/img/bg/trees.png'], ['bg_fg', 'assets/img/bg/foreground-trees.png'],
      ['bg_fback', 'assets/img/bg/forest-back.png'], ['bg_fmid', 'assets/img/bg/forest-mid.png'], ['bg_ffront', 'assets/img/bg/forest-front.png'], ['bg_flights', 'assets/img/bg/forest-lights.png'],
      ['bg_tbg', 'assets/img/bg/town-bg.png'], ['bg_tmid', 'assets/img/bg/town-mid.png'], ['bg_cave', 'assets/img/bg/cave.png']];
    let done = 0;
    await Promise.all(list.map(([k, src]) => loadImg(k, src + ASSET_V).then(ok => { done++; G.loadPct = done / (list.length + 1); if (!ok) console.warn('Thiếu ảnh', src); })));
    for (const k in MODELS) { const m = MODELS[k], im = IMG[m.img]; if (im) { m.sw = im.width / m.cols; m.sh = im.height / m.rows; } }
    await Backend.init();
    G.loadPct = 1;
    const readySet = () => new Set(Backend.QUESTS.filter(q => Backend.questStatus(q, user()) === 'ready').map(q => q.id));
    G.questReady = readySet();
    Backend.onChange(() => {
      if (G.p && G.state !== 'title') syncStats(false);
      const now = readySet();
      now.forEach(id => { if (!G.questReady.has(id)) { const q = Backend.QUESTS.find(x => x.id === id); banner('Hoàn thành nhiệm vụ: ' + q.name, '#9dff6a', 2.8); log('Nhiệm vụ hoàn thành: ' + q.name + ' - quay lại gặp người giao nhiệm vụ để nhận thưởng'); Sfx.play('win'); } });
      G.questReady = now;
    });
    skin(pModel(), playerColor());
    bindRT();
    G.state = 'title'; G.stage = STAGES()[0]; G.p = null;
    if (window.UI) UI.ready();
  }

  window.Game = {
    init, enterStage, leaveStage, revive, togglePause, press, Settings, saveSettings, Music, Sfx, Amb,
    get SKILLS() { return skills(); },
    get state() { return G.state; }, get mode() { return G.mode; }, get stageIdx() { return G.stage ? G.stage.idx : 1; }, get inStage() { return !!G.p && G.state !== 'title'; },
    resume() { if (G.state === 'pause') togglePause(); else if (G.state === 'npc' || G.state === 'ui') { G.state = 'play'; G.input = {}; G.pressed = {}; } },
    uiPause(on) { if (on && G.state === 'play') { G.state = 'ui'; G.input = {}; G.pressed = {}; } else if (!on && G.state === 'ui') { G.state = 'play'; G.input = {}; G.pressed = {}; } },
    rewardFx(r) { if (!r || !(r.ups > 0)) return; if (G.p && G.state !== 'title') levelUp(r.ups); else Sfx.play('levelup'); },
    refreshLook() { for (const k in SKIN_CACHE) delete SKIN_CACHE[k]; skin(pModel(), playerColor()); if (G.p) syncStats(true); },
    drawPortrait(canvas, avatar, color) {
      const m = MODELS[avatar] || pModel(), c = canvas.getContext('2d'), img = skin(m, color || playerColor());
      c.clearRect(0, 0, canvas.width, canvas.height); if (!img) return;
      const t = performance.now() / 1000, fi = frameIdx(m, 'idle', t), sc = canvas.height / 150;
      const sx = (fi % m.cols) * m.sw, sy = Math.floor(fi / m.cols) * m.sh;
      c.save(); c.translate(canvas.width / 2, canvas.height - 6); c.scale(m.native < 0 ? -sc : sc, sc);
      c.drawImage(img, sx, sy, m.sw, m.sh, -m.cx, -m.footY, m.fw, m.fh); c.restore();
    },
    talk() { talkNpc(); },
    banner(text, col, dur) { banner(text, col, dur); },
    SECT_LV,
    mobile: MOBILE, fit: fitCanvas,
    hold(a, v) { if (G.state === 'play' && HOLD[a]) G.input[a] = !!v; },
    touchState() {
      const p = G.p; if (!p || G.state === 'title') return null;
      const inv = user().inv || {};
      return {
        play: G.state === 'play', near: !!nearNpc(), hp: inv.binh_hp || 0, mp: inv.binh_mp || 0, pot: G.potCd / 1.5,
        sk: skills().map(k => ({ id: k.id, icon: k.icon, glyph: k.glyph, name: k.name, col: k.col, lv: k.lv, lock: skLocked(k, p.level), sectLock: !!k.sectLock, nomp: p.mp < k.mp, cd: (p.cds[k.id] || 0) / k.cd, left: p.cds[k.id] || 0 })),
      };
    },
    setPkInfo(list) { const m = {}; (list || []).forEach(o => { m[+o.user_id] = { pk: +o.pk_mode || 0, prov: +o.provoke || 0, g: +o.guild_id || 0, lv: +o.level || 1 }; }); G.pkInfo = m; },
    set onPvpHit(fn) { G.onPvpHit = fn; },
    get view() { return { camX: G.camX, camY: G.camY, z: Z, w: W, h: H, npcs: G.npcs.map(n => ({ id: n.id, x: n.x })) }; }, // chi doc (kiem thu / giao dien)
    get shared() { return G.shared && !!(window.RT && RT.ch); },
    myBubble(text) { G.bubbles[+user().id || 0] = { text, t: G.t, mine: true }; },
    showBubble(id, text) { if (+id && (+id === +user().id || G.others.has(+id))) G.bubbles[+id] = { text, t: G.t }; },
    set onPlayerClick(fn) { G.onPlayerClick = fn; },
    syncOthers(list) {
      if (G.shared) return;
      const seen = new Set();
      (list || []).forEach(o => {
        const id = +o.user_id; seen.add(id);
        const cur = G.others.get(id);
        const nx = +o.x || 0, ny = clamp(+o.y || GROUND, 40, GROUND);
        if (cur) { cur.face = nx > cur.tx ? 1 : nx < cur.tx ? -1 : cur.face; cur.tx = nx; cur.ty = ny; cur.hp = +o.hp || 0; cur.name = o.nickname; }
        else G.others.set(id, { x: nx, tx: nx, y: ny, ty: ny, hp: +o.hp || 0, maxhp: Math.max(+o.hp || 0, 200), name: o.nickname || 'Người chơi', face: 1 });
      });
      for (const id of Array.from(G.others.keys())) if (!seen.has(id)) G.others.delete(id);
    },
    pingInfo() { return G.p && G.state !== 'title' ? { stage: G.stage.idx, x: Math.round(G.p.x), y: Math.round(G.p.y), hp: Math.max(0, Math.round(G.p.hp)) } : null; },
    applyPvpDamage(d) {
      const p = G.p; if (!p || p.dead || G.state !== 'play' || d <= 0) return;
      p.hp -= d; p.lastHurt = G.t; p.hurtT = 0.2; G.vignette = 0.5; Sfx.play('hurt');
      floatText(p.x, p.y - 110, '-' + d + ' (PK)', '#ff9a3a', 20); log('Bị người chơi chém -' + d);
      if (p.hp <= 0) playerDie();
    },
    pvpFeedback(dmg, nick, kill) { if (G.p) floatText(G.p.x + G.p.face * 80, G.p.y - 90, '-' + dmg + ' ' + (nick || ''), '#ff9a3a', 16); if (kill) { log('Hạ gục ' + nick + '!'); banner('Hạ gục ' + nick + '!', '#ff9a3a'); } },
    log, toast,
    get _dbg() { return G; },
  };
})();
