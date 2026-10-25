// db.js - "co so du lieu" cuc bo thay cho MySQL: 1 khoi JSON trong localStorage.
// Moi yeu cau API chay nhu 1 transaction: loi giua chung -> khoi phuc ban da luu gan nhat (xem api.js).
const KEY = 'tt_db_v2';
const SESSION_KEY = 'tt_session';

const empty = () => ({
  v: 2,
  seq: {},
  users: {},     // id -> hang tt_users
  inv: {},       // uid -> { item_code: qty }
  progress: {},  // uid -> { stage_idx: stars }
  quests: {},    // uid -> { quest_id: {state, progress, day} }
  equip: {},     // id -> {id, user_id, code, plus, holes, stones, equipped}
  farm: {},      // uid -> [{slot, crop_code, planted_at, grow_sec}]
  guilds: {},    // id -> {id, name, master_id, level, notice, emblem, created_at}
  gmembers: {},  // uid -> {guild_id, role, joined_at}
  messages: [],  // {id, scope, guild_id, from_id, to_id, text, created_at}
  mail: [],      // {id, user_id, text, seen}
  pk_logs: [],   // {id, challenger_id, defender_id, winner_id, log, status, created_at}
  friends: [],   // {user_id, friend_id, status}
  offers: [],    // {id, kind, from_id, to_id, data, status, created_at}
});

let mem = null;      // ban dang dung
let saved = null;    // chuoi JSON da luu gan nhat (diem khoi phuc)
let memStore = {};   // du phong khi localStorage bi chan (che do an danh...)

function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return memStore[k] ?? null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) { memStore[k] = v; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (_) { delete memStore[k]; } }

export function db() {
  if (!mem) {
    saved = lsGet(KEY);
    try { mem = saved ? Object.assign(empty(), JSON.parse(saved)) : empty(); } catch (_) { mem = empty(); }
    if (!saved) saved = JSON.stringify(mem);
  }
  return mem;
}
export function commit() {
  const s = JSON.stringify(db());
  if (s !== saved) { saved = s; lsSet(KEY, s); }
}
export function rollback() { mem = null; db(); }
export function nextId(name) { const d = db(); d.seq[name] = (d.seq[name] | 0) + 1; return d.seq[name]; }

export const session = {
  get uid() { return +(lsGet(SESSION_KEY) || 0); },
  set uid(v) { if (v) lsSet(SESSION_KEY, String(v)); else lsDel(SESSION_KEY); },
};

// Sao luu / khoi phuc (du lieu chi nam trong trinh duyet nay)
export function exportData() { commit(); return JSON.stringify(db()); }
export function importData(text) {
  const j = JSON.parse(text);
  if (!j || typeof j !== 'object' || !j.users) throw new Error('Tệp dữ liệu không hợp lệ');
  mem = Object.assign(empty(), j); saved = null; commit();
}
