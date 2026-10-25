// app.cjs - file khoi dong cho Hostinger (LiteSpeed / Passenger nap entry bang require(), khong nap thang ES module duoc).
// hPanel -> Node.js app -> Entry file: app.cjs
process.on('uncaughtException', e => console.error('[uncaughtException]', e));
process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));
import('./server/index.js').catch(e => { console.error('[startup] Không khởi động được máy chủ:', e); process.exit(1); });
