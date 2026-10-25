// data.js - doc du lieu game dung chung voi client (src/data/*.js: "window.X = {...};") giong load_js_json cu,
// gan vao globalThis.window de dung lai cac ham luat thuan trong src/offline/rules.js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './config.js';

function loadJsJson(name) {
  const raw = readFileSync(resolve(ROOT, 'src/data', name), 'utf8');
  return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
}
globalThis.window = globalThis.window || {};
Object.assign(globalThis.window, {
  TATON_DATA: loadJsJson('stages.js'),
  TATON_EQUIP: loadJsJson('equip.js'),
  TATON_SECTS: loadJsJson('sects.js'),
  TATON_QUESTS: loadJsJson('quests.js'),
});
export const STAGES = globalThis.window.TATON_DATA.stages;
