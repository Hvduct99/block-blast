// config.js - cau hinh may chu doc tu bien moi truong (hPanel Hostinger -> Environment variables, hoac file .env khi chay may rieng).
// KHONG ghi mat khau / secret vao ma nguon.
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // khong dung import.meta.dirname: Node < 20.11 khong co
const envFile = resolve(ROOT, '.env');
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const env = (k, d = '') => (process.env[k] ?? d).trim();

export const PORT = +env('PORT', '3000');
export const DB = { host: env('DB_HOST', 'localhost'), port: +env('DB_PORT', '3306'), database: env('DB_NAME'), user: env('DB_USER'), password: env('DB_PASS') };
export const PUSHER = { appId: env('PUSHER_APP_ID'), key: env('PUSHER_KEY'), secret: env('PUSHER_SECRET'), cluster: env('PUSHER_CLUSTER', 'ap1'), prefix: env('PUSHER_PREFIX', 'tt') };
export const SESSION_SECRET = env('SESSION_SECRET') || (DB.password ? 'tt:' + DB.password + ':' + PUSHER.secret : 'tt-dev-secret');

const missing = ['DB_NAME', 'DB_USER', 'DB_PASS'].filter(k => !env(k));
if (missing.length) console.warn('[config] Thiếu biến môi trường: ' + missing.join(', ') + ' -> không kết nối được MySQL');
if (!PUSHER.key || !PUSHER.secret || !PUSHER.appId) console.warn('[config] Thiếu PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET -> tắt bản đồ chung nhiều người');
