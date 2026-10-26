-- Ta Ton Truyen Ky: cau truc du lieu (port tu install.php MySQL sang Postgres / Supabase)
-- Moi bang BAT RLS va khong co policy: Data API (publishable key) khong doc/ghi duoc.
-- Chi Edge Function "api" (ket noi thang Postgres) moi truy cap.

CREATE TABLE IF NOT EXISTS tt_users(
 id SERIAL PRIMARY KEY,
 username VARCHAR(50) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 nickname VARCHAR(50) NOT NULL,
 level INT DEFAULT 1, exp INT DEFAULT 0, gold INT DEFAULT 500,
 hp_max INT DEFAULT 200, mp_max INT DEFAULT 100,
 atk INT DEFAULT 18, def INT DEFAULT 6,
 stage_max INT DEFAULT 1,
 weapon_code VARCHAR(40) DEFAULT 'dao_thuong',
 sect VARCHAR(20) DEFAULT '',
 ingot INT DEFAULT 0, avatar VARCHAR(12) DEFAULT '', eq_v SMALLINT DEFAULT 1,
 pk_mode SMALLINT DEFAULT 0, friendly INT DEFAULT 100, provoke INT DEFAULT 0, provoke_at INT DEFAULT 0, jail_stage INT DEFAULT 0, pk_at INT DEFAULT 0,
 pt_str INT DEFAULT 0, pt_vit INT DEFAULT 0, pt_ene INT DEFAULT 0, pt_agi INT DEFAULT 0, pt_dfn INT DEFAULT 0, pt_mag INT DEFAULT 0,
 is_admin SMALLINT DEFAULT 0, banned SMALLINT DEFAULT 0, ban_note VARCHAR(200) DEFAULT '',
 created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tt_stages(
 idx INT PRIMARY KEY, name VARCHAR(100), story TEXT,
 mob_name VARCHAR(100), mob_hp INT, mob_atk INT, mob_exp INT, mob_gold INT, mob_count INT DEFAULT 4,
 boss_name VARCHAR(100), boss_hp INT, boss_atk INT, boss_exp INT, boss_gold INT,
 bg VARCHAR(20) DEFAULT '#1a2b1a', unlock_level INT DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tt_user_progress(user_id INT, stage_idx INT, cleared SMALLINT DEFAULT 0, stars INT DEFAULT 0, PRIMARY KEY(user_id, stage_idx));
CREATE TABLE IF NOT EXISTS tt_inventory(user_id INT, item_code VARCHAR(40), qty INT DEFAULT 0, PRIMARY KEY(user_id, item_code));
CREATE TABLE IF NOT EXISTS tt_farm_plots(id SERIAL PRIMARY KEY, user_id INT NOT NULL, slot INT NOT NULL, crop_code VARCHAR(40) DEFAULT NULL, planted_at INT DEFAULT 0, grow_sec INT DEFAULT 0, UNIQUE(user_id, slot));
CREATE TABLE IF NOT EXISTS tt_forge_recipes(id SERIAL PRIMARY KEY, weapon_code VARCHAR(40) UNIQUE, weapon_name VARCHAR(100), need_iron INT, need_wood INT, need_gold INT, atk_bonus INT, req_stage INT DEFAULT 1);
CREATE TABLE IF NOT EXISTS tt_guilds(id SERIAL PRIMARY KEY, name VARCHAR(60) UNIQUE NOT NULL, master_id INT NOT NULL, level INT DEFAULT 1, notice VARCHAR(255) DEFAULT '', emblem VARCHAR(30) DEFAULT 'em_lion', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tt_guild_members(guild_id INT, user_id INT UNIQUE, role VARCHAR(20) DEFAULT 'member', joined_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(guild_id, user_id));
CREATE TABLE IF NOT EXISTS tt_messages(id SERIAL PRIMARY KEY, scope VARCHAR(20) DEFAULT 'world', guild_id INT DEFAULT NULL, from_id INT NOT NULL, to_id INT DEFAULT NULL, text VARCHAR(500) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_msg_scope ON tt_messages(scope, guild_id, id);
CREATE TABLE IF NOT EXISTS tt_pk_logs(id SERIAL PRIMARY KEY, challenger_id INT, defender_id INT, winner_id INT DEFAULT NULL, log TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tt_presence_online(user_id INT PRIMARY KEY, nickname VARCHAR(50), map_stage INT DEFAULT 1, x INT DEFAULT 100, y INT DEFAULT 100, hp INT DEFAULT 100, dmg_pending INT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tt_quests(user_id INT NOT NULL, quest_id VARCHAR(20) NOT NULL, state VARCHAR(10) DEFAULT 'active', progress INT DEFAULT 0, day DATE DEFAULT NULL, PRIMARY KEY(user_id, quest_id));
CREATE TABLE IF NOT EXISTS tt_mail(id SERIAL PRIMARY KEY, user_id INT NOT NULL, text VARCHAR(500) NOT NULL, seen SMALLINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_mail_user ON tt_mail(user_id, seen);
CREATE TABLE IF NOT EXISTS tt_map_mobs(stage INT NOT NULL, mid INT NOT NULL, kind VARCHAR(10) NOT NULL DEFAULT 'mob', x INT NOT NULL DEFAULT 0, tier SMALLINT NOT NULL DEFAULT 0, hp INT NOT NULL DEFAULT 0, max_hp INT NOT NULL DEFAULT 0, respawn_at INT NOT NULL DEFAULT 0, dmgs TEXT NULL, PRIMARY KEY(stage, mid));
CREATE TABLE IF NOT EXISTS tt_map_state(stage INT PRIMARY KEY, kills INT NOT NULL DEFAULT 0, fb_kills INT NOT NULL DEFAULT 0, mb_kills INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tt_equip(id SERIAL PRIMARY KEY, user_id INT NOT NULL, code VARCHAR(40) NOT NULL, plus SMALLINT NOT NULL DEFAULT 0, holes SMALLINT NOT NULL DEFAULT 0, stones VARCHAR(120) NOT NULL DEFAULT '', equipped SMALLINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_equip_user ON tt_equip(user_id, equipped);
CREATE TABLE IF NOT EXISTS tt_map_loot(id SERIAL PRIMARY KEY, stage INT NOT NULL, x INT NOT NULL DEFAULT 0, code VARCHAR(40) NOT NULL, qty INT NOT NULL DEFAULT 1, owner_id INT NOT NULL DEFAULT 0, own_until INT NOT NULL DEFAULT 0, expire_at INT NOT NULL DEFAULT 0, taken SMALLINT NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_loot_stage ON tt_map_loot(stage, taken);
CREATE TABLE IF NOT EXISTS tt_friends(user_id INT NOT NULL, friend_id INT NOT NULL, status SMALLINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id, friend_id));
CREATE INDEX IF NOT EXISTS idx_friend ON tt_friends(friend_id, status);
CREATE TABLE IF NOT EXISTS tt_offers(id SERIAL PRIMARY KEY, kind VARCHAR(10) NOT NULL, from_id INT NOT NULL, to_id INT NOT NULL, data TEXT, status SMALLINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_offer_to ON tt_offers(to_id, status);
CREATE INDEX IF NOT EXISTS idx_offer_from ON tt_offers(from_id, status);
-- Trang thai phien (thay $_SESSION): Edge Function khong giu bo nho giua cac lan goi
CREATE TABLE IF NOT EXISTS tt_runtime(user_id INT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());

ALTER TABLE tt_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_farm_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_forge_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_pk_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_presence_online ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_mail ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_map_mobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_map_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_equip ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_map_loot ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_runtime ENABLE ROW LEVEL SECURITY;
