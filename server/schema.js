// schema.js - tao bang con thieu + nang cap DB cu + nap ban do / cong thuc ren (thay install.php). Chay moi lan khoi dong, giu nguyen du lieu nguoi choi.
import { pool, q } from './db.js';
import { STAGES } from './data.js';
import { R } from './core.js';

const TABLES = [
`CREATE TABLE IF NOT EXISTS tt_users(
 id INT AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(50) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 nickname VARCHAR(50) NOT NULL,
 level INT DEFAULT 1, exp INT DEFAULT 0, gold INT DEFAULT 500,
 hp_max INT DEFAULT 200, mp_max INT DEFAULT 100,
 atk INT DEFAULT 18, def INT DEFAULT 6,
 stage_max INT DEFAULT 1,
 weapon_code VARCHAR(40) DEFAULT 'dao_thuong',
 sect VARCHAR(20) DEFAULT '',
 ingot INT DEFAULT 0, avatar VARCHAR(12) DEFAULT '', eq_v TINYINT DEFAULT 0,
 pk_mode TINYINT DEFAULT 0, friendly INT DEFAULT 100, provoke INT DEFAULT 0, provoke_at INT DEFAULT 0, jail_stage INT DEFAULT 0, pk_at INT DEFAULT 0,
 pt_str INT DEFAULT 0, pt_vit INT DEFAULT 0, pt_ene INT DEFAULT 0, pt_agi INT DEFAULT 0, pt_dfn INT DEFAULT 0, pt_mag INT DEFAULT 0,
 is_admin TINYINT DEFAULT 0, banned TINYINT DEFAULT 0, ban_note VARCHAR(200) DEFAULT '',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_stages(
 idx INT PRIMARY KEY, name VARCHAR(100), story TEXT,
 mob_name VARCHAR(100), mob_hp INT, mob_atk INT, mob_exp INT, mob_gold INT, mob_count INT DEFAULT 4,
 boss_name VARCHAR(100), boss_hp INT, boss_atk INT, boss_exp INT, boss_gold INT,
 bg VARCHAR(20) DEFAULT '#1a2b1a', unlock_level INT DEFAULT 1
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_user_progress(
 user_id INT, stage_idx INT, cleared TINYINT DEFAULT 0, stars INT DEFAULT 0,
 PRIMARY KEY(user_id, stage_idx)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_items(
 code VARCHAR(40) PRIMARY KEY, name VARCHAR(100), type VARCHAR(20),
 atk INT DEFAULT 0, def INT DEFAULT 0, price INT DEFAULT 0, des VARCHAR(255)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_inventory(
 user_id INT, item_code VARCHAR(40), qty INT DEFAULT 0,
 PRIMARY KEY(user_id, item_code)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_farm_plots(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL, slot INT NOT NULL,
 crop_code VARCHAR(40) DEFAULT NULL,
 planted_at INT DEFAULT 0, grow_sec INT DEFAULT 0,
 UNIQUE KEY uq_plot(user_id, slot)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_forge_recipes(
 id INT AUTO_INCREMENT PRIMARY KEY,
 weapon_code VARCHAR(40) UNIQUE, weapon_name VARCHAR(100),
 need_iron INT, need_wood INT, need_gold INT, atk_bonus INT, req_stage INT DEFAULT 1
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_guilds(
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(60) UNIQUE NOT NULL, master_id INT NOT NULL,
 level INT DEFAULT 1, notice VARCHAR(255) DEFAULT '', emblem VARCHAR(30) DEFAULT 'em_lion',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_guild_members(
 guild_id INT, user_id INT UNIQUE,
 role VARCHAR(20) DEFAULT 'member', joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(guild_id, user_id)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_messages(
 id INT AUTO_INCREMENT PRIMARY KEY,
 scope VARCHAR(20) DEFAULT 'world',
 guild_id INT DEFAULT NULL,
 from_id INT NOT NULL, to_id INT DEFAULT NULL,
 text VARCHAR(500) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_scope_time(scope, guild_id, id)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_pk_logs(
 id INT AUTO_INCREMENT PRIMARY KEY,
 challenger_id INT, defender_id INT,
 winner_id INT DEFAULT NULL, log TEXT,
 status VARCHAR(20) DEFAULT 'pending',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_presence_online(
 user_id INT PRIMARY KEY, nickname VARCHAR(50),
 map_stage INT DEFAULT 1, x INT DEFAULT 100, y INT DEFAULT 100,
 hp INT DEFAULT 100, dmg_pending INT DEFAULT 0,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_quests(
 user_id INT NOT NULL, quest_id VARCHAR(20) NOT NULL,
 state VARCHAR(10) DEFAULT 'active', progress INT DEFAULT 0, day DATE DEFAULT NULL,
 PRIMARY KEY(user_id, quest_id)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_mail(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL, text VARCHAR(500) NOT NULL, seen TINYINT DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_user_seen(user_id, seen)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_map_mobs(
 stage INT NOT NULL, mid INT NOT NULL, kind VARCHAR(10) NOT NULL DEFAULT 'mob',
 x INT NOT NULL DEFAULT 0, tier TINYINT NOT NULL DEFAULT 0,
 hp INT NOT NULL DEFAULT 0, max_hp INT NOT NULL DEFAULT 0,
 respawn_at INT NOT NULL DEFAULT 0, dmgs TEXT NULL,
 PRIMARY KEY(stage, mid)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_map_state(
 stage INT PRIMARY KEY, kills INT NOT NULL DEFAULT 0, fb_kills INT NOT NULL DEFAULT 0, mb_kills INT NOT NULL DEFAULT 0
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_equip(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL, code VARCHAR(40) NOT NULL,
 plus TINYINT NOT NULL DEFAULT 0, holes TINYINT NOT NULL DEFAULT 0, stones VARCHAR(120) NOT NULL DEFAULT '',
 equipped TINYINT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_user(user_id, equipped)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_map_loot(
 id INT AUTO_INCREMENT PRIMARY KEY,
 stage INT NOT NULL, x INT NOT NULL DEFAULT 0, code VARCHAR(40) NOT NULL, qty INT NOT NULL DEFAULT 1,
 owner_id INT NOT NULL DEFAULT 0, own_until INT NOT NULL DEFAULT 0, expire_at INT NOT NULL DEFAULT 0, taken TINYINT NOT NULL DEFAULT 0,
 INDEX idx_stage(stage, taken)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_friends(
 user_id INT NOT NULL, friend_id INT NOT NULL, status TINYINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id, friend_id), INDEX idx_friend(friend_id, status)
) ENGINE=InnoDB`,
`CREATE TABLE IF NOT EXISTS tt_offers(
 id INT AUTO_INCREMENT PRIMARY KEY,
 kind VARCHAR(10) NOT NULL, from_id INT NOT NULL, to_id INT NOT NULL, data TEXT,
 status TINYINT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_to(to_id, status), INDEX idx_from(from_id, status)
) ENGINE=InnoDB`,
];
const ALTERS = [
  "ALTER TABLE tt_users ADD COLUMN is_admin TINYINT DEFAULT 0",
  "ALTER TABLE tt_presence_online ADD COLUMN dmg_pending INT DEFAULT 0",
  "ALTER TABLE tt_guilds ADD COLUMN emblem VARCHAR(30) DEFAULT 'em_lion'",
  "ALTER TABLE tt_users ADD COLUMN sect VARCHAR(20) DEFAULT ''",
  "ALTER TABLE tt_users ADD COLUMN ingot INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN avatar VARCHAR(12) DEFAULT ''",
  "ALTER TABLE tt_users ADD COLUMN eq_v TINYINT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pk_mode TINYINT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN friendly INT DEFAULT 100",
  "ALTER TABLE tt_users ADD COLUMN provoke INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN provoke_at INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN jail_stage INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pk_at INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pt_str INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pt_vit INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pt_ene INT DEFAULT 0",
  "ALTER TABLE tt_map_state ADD COLUMN mb_kills INT NOT NULL DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN banned TINYINT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN ban_note VARCHAR(200) DEFAULT ''",
  "ALTER TABLE tt_users ADD COLUMN pt_agi INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pt_dfn INT DEFAULT 0",
  "ALTER TABLE tt_users ADD COLUMN pt_mag INT DEFAULT 0",
];

export async function migrate() {
  for (const sql of TABLES) { try { await q(pool, sql); } catch (e) { console.error('[schema]', e.message); } }
  for (const sql of ALTERS) { try { await q(pool, sql); } catch (_) { /* cot da co */ } }
  // 30 ban do - nguon duy nhat: src/data/stages.js
  await q(pool, 'DELETE FROM tt_stages');
  await q(pool, 'INSERT INTO tt_stages(idx,name,story,mob_name,mob_hp,mob_atk,mob_exp,mob_gold,mob_count,boss_name,boss_hp,boss_atk,boss_exp,boss_gold,bg,unlock_level) VALUES ?',
    [STAGES.map(s => [s.idx, s.name, s.story, s.mob_name, s.mob_hp, s.mob_atk, s.mob_exp, s.mob_gold, s.mob_count, s.boss_name, s.boss_hp, s.boss_atk, s.boss_exp, s.boss_gold, s.bg, s.unlock_level])]);
  await q(pool, 'DELETE FROM tt_forge_recipes');
  await q(pool, 'INSERT INTO tt_forge_recipes(weapon_code,weapon_name,need_iron,need_wood,need_gold,atk_bonus,req_stage) VALUES ?',
    [R.FORGE_RECIPES.map(r => [r.weapon_code, r.weapon_name, r.need_iron, r.need_wood, r.need_gold, r.atk_bonus, r.req_stage])]);
}
