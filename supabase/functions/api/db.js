// db.js - lop ket noi Postgres dung chung cho Deno (Supabase Edge Function, driver postgres.js) va Node (test, PGlite).
// Cau lenh viet kieu MySQL cu voi dau "?" -> tu doi thanh $1, $2... Ket qua: mang dong, kem .affectedRows va .insertId (cot id cua RETURNING id).
let driver = null; // { query(text, params) -> {rows, affectedRows}, begin(fn) }

export function setDriver(d) { driver = d; }
export const pool = { query: (t, p) => driver.query(t, p) };

const toPg = sql => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
export async function q(c, sql, params = []) {
  const r = await c.query(toPg(sql), params);
  const rows = r.rows || [];
  rows.affectedRows = r.affectedRows ?? 0;
  rows.insertId = rows[0] && rows[0].id != null ? +rows[0].id : 0;
  return rows;
}
export async function one(c, sql, params = []) { return (await q(c, sql, params))[0] || null; }
export async function col(c, sql, params = []) { const r = await one(c, sql, params); return r ? Object.values(r)[0] : null; }
// Transaction: loi -> rollback, nem lai loi
export function tx(fn) { return driver.begin(c => fn(c)); }

// Driver postgres.js (Deno / Node). Dung trong index.ts
export function postgresDriver(sql) {
  const wrap = s => ({
    async query(text, params) { const r = await s.unsafe(text, params); return { rows: Array.from(r), affectedRows: r.count ?? 0 }; },
  });
  return { ...wrap(sql), begin: fn => sql.begin(t => fn(wrap(t))) };
}
// Driver PGlite (Postgres nhung trong Node) - chi de test may rieng
export function pgliteDriver(db) {
  const wrap = s => ({
    async query(text, params) { const r = await s.query(text, params); return { rows: r.rows, affectedRows: r.affectedRows ?? 0 }; },
  });
  return { ...wrap(db), begin: fn => db.transaction(t => fn(wrap(t))) };
}
