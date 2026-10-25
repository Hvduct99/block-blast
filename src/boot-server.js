// Chon "may chu" cho backend.js (script kieu cu):
//  - mac dinh: may chu Node that (server/index.js + MySQL + Pusher) -> choi nhieu nguoi
//  - VITE_BACKEND=local (GitHub Pages): may chu gia lap trong trinh duyet, choi mot minh
import Pusher from 'pusher-js';
import * as LocalServer from './offline/api.js';

export const ONLINE = import.meta.env.VITE_BACKEND !== 'local';
window.TT_ONLINE = ONLINE;
if (ONLINE) window.Pusher = Pusher; // realtime.js dung window.Pusher
else window.LocalServer = LocalServer;

// Goi API theo dang cu: GET url?action=..., POST form -> { status, data }
export async function api(url, data) {
  if (!ONLINE) return LocalServer.handle(url, data);
  const o = { credentials: 'same-origin', cache: 'no-store' };
  if (data) { const f = new URLSearchParams(); for (const k in data) f.append(k, data[k] == null ? '' : data[k]); o.method = 'POST'; o.body = f; }
  const r = await fetch(url, o);
  let j; try { j = JSON.parse(await r.text()); } catch (_) { j = { ok: false, error: 'Máy chủ đang bận, vui lòng thử lại.' }; }
  return { status: r.status, data: j };
}
window.TT_API = api;
