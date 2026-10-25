// login.js - trang dang nhap / dang ky (thay index.php). Tai khoan tren may chu (MySQL), hoac luu cuc bo khi build VITE_BACKEND=local
import './styles/login.css';
import './data/equip.js'; // ban cuc bo: dang ky tang Dao Thuong -> can bang trang bi
import { api, ONLINE } from './boot-server.js';
import { exportData, importData } from './offline/db.js';

const $ = id => document.getElementById(id);
const call = async (action, data) => (await api('api/auth.php?action=' + action, data)).data;
let mode = 'login';

function setMsg(text, kind) {
  const m = $('msg'); m.textContent = text || '';
  m.className = 'min-h-5 text-center text-sm ' + (kind === 'ok' ? 'text-jade' : kind === 'err' ? 'text-[#ff8a7a]' : 'text-parchment/70');
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === m)));
  $('nickRow').classList.toggle('hidden', m !== 'register');
  $('nickRow').classList.toggle('block', m === 'register');
  $('password').autocomplete = m === 'register' ? 'new-password' : 'current-password';
  $('submitBtn').textContent = m === 'register' ? 'Tạo nhân vật' : 'Đăng nhập';
  setMsg('');
}
async function refresh() {
  const me = await call('me');
  $('loggedBox').classList.toggle('hidden', !me.ok);
  if (me.ok) $('loggedName').textContent = me.user.nickname;
  if (ONLINE) return; // danh sach tai khoan / sao luu chi co o ban cuc bo
  const acc = (await call('accounts')).list || [];
  $('accBox').classList.toggle('hidden', !acc.length);
  $('accList').innerHTML = '';
  acc.forEach(a => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs hover:border-gold/60';
    b.textContent = a.nickname + ' · Cấp ' + a.level;
    b.onclick = () => { setMode('login'); $('username').value = a.username; $('password').focus(); };
    $('accList').appendChild(b);
  });
}

document.querySelectorAll('.tab').forEach(t => { t.onclick = () => setMode(t.dataset.tab); });
$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('submitBtn'); btn.disabled = true; setMsg('Đang xử lý...');
  const u = $('username').value.trim();
  const j = await call(mode, { username: u, password: $('password').value, nickname: $('nickname').value.trim() || u });
  btn.disabled = false;
  if (j.ok) { setMsg('Thành công! Đang vào game...', 'ok'); location.href = 'play.html'; }
  else setMsg(j.error || 'Lỗi', 'err');
});

$('btnExport').onclick = () => {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'ta-ton-sao-luu-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$('fileImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { importData(await f.text()); setMsg('Đã khôi phục dữ liệu', 'ok'); await call('logout'); refresh(); }
  catch (err) { setMsg(err.message || 'Không đọc được tệp', 'err'); }
  e.target.value = '';
};

if (new URLSearchParams(location.search).has('logout')) { await call('logout'); history.replaceState(null, '', location.pathname); }
if (ONLINE) $('backupBox').remove();
setMode('login');
refresh();

// Nen 3D tai sau cung (khong chan form). WebGL loi -> van dung duoc form tren nen toi
import('./three/scene.js').then(m => m.startScene($('bg3d'))).catch(err => console.warn('Không khởi tạo được nền 3D', err));
