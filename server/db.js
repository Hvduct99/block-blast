// db.js - ket noi MySQL (thay PDO trong config.php cu)
import mysql from 'mysql2/promise';
import { DB } from './config.js';

export const pool = mysql.createPool({ ...DB, charset: 'utf8mb4', connectionLimit: 10, dateStrings: true, decimalNumbers: true, waitForConnections: true });

// q(c, sql, params): c = pool hoac connection dang trong transaction. SELECT -> mang dong, con lai -> {affectedRows, insertId}
export async function q(c, sql, params = []) { const [r] = await c.query(sql, params); return r; }
export async function one(c, sql, params = []) { return (await q(c, sql, params))[0] || null; }
export async function col(c, sql, params = []) { const r = await one(c, sql, params); return r ? Object.values(r)[0] : null; }

// Transaction: loi -> rollback, nem lai loi
export async function tx(fn) {
  const c = await pool.getConnection();
  try { await c.beginTransaction(); const r = await fn(c); await c.commit(); return r; }
  catch (e) { try { await c.rollback(); } catch (_) { } throw e; }
  finally { c.release(); }
}
