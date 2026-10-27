// worldmap.js - Ban do giang ho ve bang canvas: giay da, bien, dao, day nui (tuyet), song, rung, duong di 20 dia danh, "ban dang o day".
(function () {
  'use strict';
  const MW = 1200, MH = 560;
  // Vi tri 20 dia danh tren ban do (theo dia ly Y Thien Do Long Ky: tay = Con Lon/Quang Minh Dinh, giua = Vo Dang/Thieu Lam, dong = bien dao)
  const POS = {
    1: [1010, 330], 2: [1118, 78], 3: [128, 232], 4: [238, 440], 5: [520, 335], 6: [705, 112], 7: [1062, 470], 8: [612, 215], 9: [668, 268], 10: [540, 205],
    11: [432, 482], 12: [846, 176], 13: [72, 118], 14: [338, 258], 15: [262, 128], 16: [790, 360], 17: [176, 330], 18: [940, 520], 19: [728, 300], 20: [640, 420],
    21: [470, 92], 22: [880, 268], 23: [190, 182], 24: [858, 452], 25: [74, 300], 26: [572, 128], 27: [790, 62], 28: [322, 382], 29: [420, 330], 30: [1000, 205],
  };
  function seeded(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  let base = null; // lop nen ve san 1 lan
  function coast(x) { return 905 + Math.sin(x * 0.02) * 30 + Math.sin(x * 0.051 + 1.3) * 18; } // x = toa do y -> duong bo bien
  function paintBase() {
    const c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d'), r = seeded(1999);
    // giay da
    const pg = g.createRadialGradient(MW / 2, MH / 2, 80, MW / 2, MH / 2, 720); pg.addColorStop(0, '#f1e2b8'); pg.addColorStop(1, '#c9a76a');
    g.fillStyle = pg; g.fillRect(0, 0, MW, MH);
    for (let i = 0; i < 2600; i++) { g.fillStyle = 'rgba(110,70,30,' + (r() * 0.06) + ')'; g.fillRect(r() * MW, r() * MH, 1 + r() * 2, 1 + r() * 2); }
    // bien phia dong
    g.beginPath(); g.moveTo(MW, 0); for (let y = 0; y <= MH; y += 8) g.lineTo(coast(y), y); g.lineTo(MW, MH); g.closePath();
    const sg = g.createLinearGradient(880, 0, MW, 0); sg.addColorStop(0, '#7fb2c8'); sg.addColorStop(1, '#4f88a8'); g.fillStyle = sg; g.fill();
    g.strokeStyle = '#6a5030'; g.lineWidth = 2.5; g.beginPath(); for (let y = 0; y <= MH; y += 8) { const x = coast(y); y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) { const x = 930 + r() * 260, y = r() * MH; g.beginPath(); g.arc(x, y, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    // dao
    const island = (x, y, rx, ry, snow) => {
      g.beginPath(); for (let a = 0; a < 6.3; a += 0.3) { const k = 1 + (r() - 0.5) * 0.35; g.lineTo(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k); } g.closePath();
      g.fillStyle = snow ? '#eef6fb' : '#d9c48a'; g.fill(); g.strokeStyle = '#6a5030'; g.lineWidth = 2; g.stroke();
    };
    island(1010, 338, 46, 26); island(1118, 86, 54, 30, true); island(1062, 476, 40, 24); island(940, 526, 34, 20); island(1000, 212, 44, 26);
    // song (Hoang Ha + Truong Giang)
    const river = (pts, w) => { g.strokeStyle = '#5f97b5'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.quadraticCurveTo(p[0], p[1], p[2], p[3]) : g.moveTo(p[0], p[1])); g.stroke(); };
    river([[40, 180], [220, 140, 380, 190], [520, 240, 640, 170], [760, 120, 880, 150], [900, 160, 915, 175]], 4);
    river([[60, 400], [240, 360, 400, 420], [560, 470, 700, 400], [820, 340, 905, 380]], 5);
    // rung
    for (let i = 0; i < 220; i++) {
      const x = 60 + r() * 820, y = 40 + r() * 500; if (x > coast(y) - 20) continue;
      g.fillStyle = 'rgba(60,110,50,' + (0.35 + r() * 0.35) + ')'; g.beginPath(); g.arc(x, y, 3 + r() * 4, 0, 7); g.fill();
    }
    // day nui (tay - giua), co tuyet o phia tay bac
    const mountain = (x, y, s, snow) => {
      g.fillStyle = '#9a7a4a'; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 1.3); g.lineTo(x + s, y); g.closePath(); g.fill();
      g.fillStyle = '#6e5230'; g.beginPath(); g.moveTo(x, y - s * 1.3); g.lineTo(x + s, y); g.lineTo(x + s * 0.2, y); g.closePath(); g.fill();
      if (snow) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - s * 0.32, y - s * 0.88); g.lineTo(x, y - s * 1.3); g.lineTo(x + s * 0.32, y - s * 0.88); g.lineTo(x + s * 0.1, y - s * 0.98); g.lineTo(x - s * 0.08, y - s * 0.86); g.closePath(); g.fill(); }
      g.strokeStyle = '#4a3418'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 1.3); g.lineTo(x + s, y); g.stroke();
    };
    const ranges = [[30, 60, 380, 300, 30, 0.6], [440, 150, 780, 320, 18, 0.15], [150, 380, 330, 520, 10, 0.1], [640, 60, 860, 130, 8, 0.25]];
    const peaks = [];
    ranges.forEach(([x0, y0, x1, y1, n, snow]) => { for (let i = 0; i < n; i++) peaks.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 14 + r() * 18, r() < snow]); });
    peaks.sort((a, b) => a[1] - b[1]).forEach(m => mountain(m[0], m[1], m[2], m[3]));
    // vien + la ban + tieu de
    g.strokeStyle = '#6a4a20'; g.lineWidth = 8; g.strokeRect(4, 4, MW - 8, MH - 8);
    g.strokeStyle = '#b8902a'; g.lineWidth = 2; g.strokeRect(14, 14, MW - 28, MH - 28);
    const cx = 80, cy = 470; g.strokeStyle = '#6a4a20'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.stroke();
    g.fillStyle = '#8a2020'; g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx + 8, cy); g.lineTo(cx - 8, cy); g.fill();
    g.fillStyle = '#4a3418'; g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx + 8, cy); g.lineTo(cx - 8, cy); g.fill();
    g.font = 'bold 14px serif'; g.fillStyle = '#4a3418'; g.textAlign = 'center'; g.fillText('北', cx, cy - 46); g.fillText('南', cx, cy + 58);
    g.font = 'bold 30px "KaiTi","STKaiti",serif'; g.fillStyle = 'rgba(90,40,10,0.75)'; g.fillText('江湖輿圖', 600, 44);
    return c;
  }
  const WM = {
    POS, W: MW, H: MH,
    draw(canvas, o) {
      if (!base) base = paintBase();
      const g = canvas.getContext('2d'), t = o.t || 0, stages = o.stages || [];
      g.clearRect(0, 0, MW, MH); g.drawImage(base, 0, 0);
      // duong di (net dut, chay)
      g.save(); g.setLineDash([8, 7]); g.lineDashOffset = -t * 18; g.lineWidth = 3;
      for (let i = 1; i < stages.length; i++) {
        const a = POS[stages[i - 1].idx], b = POS[stages[i].idx]; if (!a || !b) continue;
        g.strokeStyle = stages[i].idx <= o.maxStage ? 'rgba(160,30,20,0.85)' : 'rgba(90,70,50,0.35)';
        g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.15, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.15, b[0], b[1]); g.stroke();
      }
      g.restore();
      // cac dia danh
      stages.forEach(s => {
        const p = POS[s.idx]; if (!p) return;
        const lock = s.idx > o.maxStage, st = (o.stars || {})[String(s.idx)] || 0, sel = o.selected === s.idx, hov = o.hover === s.idx;
        const R = sel || hov ? 22 : 18;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(p[0] + 2, p[1] + 4, R, R * 0.55, 0, 0, 7); g.fill();
        const fg = g.createRadialGradient(p[0] - 4, p[1] - 5, 2, p[0], p[1], R);
        if (lock) { fg.addColorStop(0, '#b8b0a0'); fg.addColorStop(1, '#5a544a'); }
        else if (s.idx > 10) { fg.addColorStop(0, '#e0a0ff'); fg.addColorStop(1, '#5a1a7a'); }
        else { fg.addColorStop(0, '#ffe68a'); fg.addColorStop(1, '#a8501a'); }
        g.fillStyle = fg; g.beginPath(); g.arc(p[0], p[1], R, 0, 7); g.fill();
        g.lineWidth = sel ? 3.5 : 2; g.strokeStyle = sel ? '#ffffff' : '#3a2008'; g.stroke();
        g.font = 'bold 18px "Segoe UI",Arial'; g.textAlign = 'center'; g.fillStyle = lock ? '#ddd' : '#2a1404'; g.fillText(lock ? '🔒' : String(s.idx), p[0], p[1] + 6);
        g.font = 'bold ' + (sel || hov ? 19 : 17) + 'px "Segoe UI",Arial'; g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(246,234,198,0.97)';
        g.strokeText(s.name, p[0], p[1] + R + 19); g.fillStyle = lock ? '#6a5a4a' : '#3a1a04'; g.fillText(s.name, p[0], p[1] + R + 19);
        if (st) { g.fillStyle = '#d89a10'; g.font = 'bold 15px Arial'; g.fillText('★'.repeat(st), p[0], p[1] - R - 6); }
      });
      // ban dang o day
      const cur = POS[o.current];
      if (cur) {
        const bob = Math.sin(t * 4) * 4, x = cur[0], y = cur[1] - 30 + bob;
        g.strokeStyle = 'rgba(255,60,40,' + (0.6 - (t % 1) * 0.6) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(cur[0], cur[1], 18 + (t % 1) * 22, 0, 7); g.stroke();
        g.fillStyle = '#3a2008'; g.fillRect(x - 1, y - 30, 3, 32);
        g.fillStyle = '#d02020'; g.beginPath(); g.moveTo(x + 2, y - 30); g.lineTo(x + 30 + Math.sin(t * 6) * 3, y - 23); g.lineTo(x + 2, y - 15); g.fill();
        g.font = 'bold 17px "Segoe UI",Arial'; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = '#fff6d0'; g.strokeText('Bạn đang ở đây', x + 8, y - 36); g.fillStyle = '#a01010'; g.fillText('Bạn đang ở đây', x + 8, y - 36);
      }
    },
    hit(canvas, clientX, clientY) {
      const r = canvas.getBoundingClientRect(), x = (clientX - r.left) * MW / r.width, y = (clientY - r.top) * MH / r.height;
      let best = 0, bd = 26;
      for (const k in POS) { const d = Math.hypot(POS[k][0] - x, POS[k][1] - y); if (d < bd) { bd = d; best = +k; } }
      return best;
    },
  };
  window.WorldMap = WM;
})();
