// sync-supabase.mjs - sinh phan dung chung cho Supabase tu ma nguon client:
//   supabase/functions/api/shared/ : data.js (ban do, trang bi, mon phai, nhiem vu), rules.js + db.js (luat game, giong src/offline)
//   supabase/migrations/..._seed.sql : 30 ban do + cong thuc ren
// Chay lai (npm run sync:supabase) moi khi sua src/data/* hoac src/offline/rules.js, roi commit.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => resolve(ROOT, ...a);
const load = f => { const r = readFileSync(P('src/data', f), 'utf8'); return JSON.parse(r.slice(r.indexOf('{'), r.lastIndexOf('}') + 1)); };

const SH = P('supabase/functions/api/shared');
mkdirSync(SH, { recursive: true });
const data = { TATON_DATA: load('stages.js'), TATON_EQUIP: load('equip.js'), TATON_SECTS: load('sects.js'), TATON_QUESTS: load('quests.js') };
writeFileSync(resolve(SH, 'data.js'), '// SINH TU DONG boi scripts/sync-supabase.mjs tu src/data/*.js - khong sua tay\n' +
  'Object.assign(globalThis, ' + JSON.stringify(data) + ');\nexport const STAGES = globalThis.TATON_DATA.stages;\n');
for (const f of ['rules.js', 'db.js']) copyFileSync(P('src/offline', f), resolve(SH, f));

const esc = v => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const S = data.TATON_DATA.stages;
const RECIPES = [['mu_sat', 'Thiết Khôi', 8, 4, 300, 0, 2], ['giay_sat', 'Thiết Ngoa', 8, 4, 300, 0, 2], ['giap_sat', 'Giáp Sắt', 12, 6, 400, 0, 2], ['kim_ty_giap', 'Kim Ty Nhuyễn Giáp', 35, 20, 1800, 0, 7], ['y_thien_kiem', 'Ỷ Thiên Kiếm', 35, 25, 2500, 0, 8], ['kiem_sat', 'Kiếm Sắt', 5, 3, 100, 15, 1], ['bua_da', 'Búa Đá Lớn', 10, 8, 300, 25, 2], ['dai_dao', 'Đại Đao Minh Giáo', 20, 15, 700, 45, 4], ['do_long', 'Đồ Long Đao', 40, 30, 2000, 90, 9]];
let seed = '-- SINH TU DONG boi scripts/sync-supabase.mjs: 30 ban do (src/data/stages.js) + cong thuc ren\nDELETE FROM tt_stages;\n' +
  'INSERT INTO tt_stages(idx,name,story,mob_name,mob_hp,mob_atk,mob_exp,mob_gold,mob_count,boss_name,boss_hp,boss_atk,boss_exp,boss_gold,bg,unlock_level) VALUES\n' +
  S.map(s => '(' + [s.idx, s.name, s.story, s.mob_name, s.mob_hp, s.mob_atk, s.mob_exp, s.mob_gold, s.mob_count, s.boss_name, s.boss_hp, s.boss_atk, s.boss_exp, s.boss_gold, s.bg, s.unlock_level].map(esc).join(',') + ')').join(',\n') + ';\n' +
  'DELETE FROM tt_forge_recipes;\nINSERT INTO tt_forge_recipes(weapon_code,weapon_name,need_iron,need_wood,need_gold,atk_bonus,req_stage) VALUES\n' +
  RECIPES.map(r => '(' + r.map(esc).join(',') + ')').join(',\n') + ';\n';
writeFileSync(P('supabase/migrations/20261026000100_ta_ton_seed.sql'), seed);
console.log('Đã đồng bộ', S.length, 'bản đồ vào supabase/');
