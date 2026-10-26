// Chon "may chu" cho backend.js (script kieu cu):
//  - mac dinh: Supabase Edge Function "api" (supabase/functions/api) + Postgres + Pusher -> choi nhieu nguoi
//  - VITE_BACKEND=local (GitHub Pages): may chu gia lap trong trinh duyet, choi mot minh
import Pusher from 'pusher-js';
import * as LocalServer from './offline/api.js';

export const ONLINE = import.meta.env.VITE_BACKEND !== 'local';
// Dia chi Edge Function (cong khai). Doi bang bien VITE_API_URL khi build neu doi project Supabase
export const API_BASE = (import.meta.env.VITE_API_URL || 'https://xkdzxgtlgrktvkwtvidx.supabase.co/functions/v1/api').replace(/\/$/, '');
window.TT_ONLINE = ONLINE;
window.TT_API_BASE = API_BASE;
if (ONLINE) window.Pusher = Pusher; // realtime.js dung window.Pusher
else window.LocalServer = LocalServer;

// Token dang nhap (may chu tra ve khi dang ky / dang nhap) - gui kem moi yeu cau
const TOKEN_KEY = 'tt_token';
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } };
const setToken = t => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (_) { } };
window.TT_AUTH_HEADERS = () => ({ 'x-tt-token': getToken() });

// Goi API theo dang cu: 'api/<ten>.php?action=...' (+ du lieu POST) -> { status, data }
export async function api(url, data) {
  if (!ONLINE) return LocalServer.handle(url, data);
  if (/[?&]action=logout\b/.test(url)) setToken('');
  const o = { cache: 'no-store', headers: window.TT_AUTH_HEADERS() };
  if (data) { const f = new URLSearchParams(); for (const k in data) f.append(k, data[k] == null ? '' : data[k]); o.method = 'POST'; o.body = f; }
  let r;
  try { r = await fetch(API_BASE + '/' + url.replace(/^\/?api\//, ''), o); }
  catch (_) { return { status: 0, data: { ok: false, error: 'Mất kết nối máy chủ game' } }; }
  let j; try { j = JSON.parse(await r.text()); } catch (_) { j = { ok: false, error: 'Máy chủ game chưa sẵn sàng (HTTP ' + r.status + ')' }; }
  if (j && j.token) setToken(j.token);
  if (r.status === 401) setToken('');
  return { status: r.status, data: j };
}
window.TT_API = api;
