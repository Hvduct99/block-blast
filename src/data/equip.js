// Trang bi, da sao, cuong hoa, tien te - nguon DUY NHAT cho ca PHP (load_js_json) va JS.
window.TATON_EQUIP = {
"slots": [
"weapon",
"armor",
"helmet",
"boots",
"ring",
"amulet",
"wing"
],
"slotName": {
"weapon": "Vũ khí",
"armor": "Giáp",
"helmet": "Mũ",
"boots": "Giày",
"ring": "Nhẫn",
"amulet": "Dây chuyền",
"wing": "Cánh"
},
"stats": {
"atk": "Công",
"def": "Thủ",
"hp": "Máu",
"mp": "Nội lực",
"crit": "Chí mạng %"
},
"enhance": {
"max": 16,
"pct": 8,
"gold": [
150,
487,
971,
1583,
2314,
3155,
4100,
5145,
6285,
7518,
8840,
10249,
11743,
13320,
14978,
16700
],
"rate": [
100,
100,
95,
90,
85,
80,
70,
60,
50,
45,
40,
35,
30,
25,
20,
15
],
"dropFrom": 7,
"stone": "cuong_"
},
"holes": {
"max": {
"weapon": 5,
"armor": 4,
"helmet": 3,
"boots": 3,
"ring": 3,
"amulet": 4,
"wing": 2
},
"gold": [
500,
1500,
4000,
9000,
20000
],
"tool": [
1,
1,
2,
2,
3
]
},
"merge": {
"need": 3,
"goldPerTier": 200,
"maxTier": 6
},
"unlayGoldPerTier": 500,
"exchange": 200,
"legacy": [
"dao_thuong",
"kiem_sat",
"bua_da",
"dai_dao",
"do_long",
"giap_vai",
"giap_sat",
"kim_ty_giap"
],
"items": [
{
"code": "binh_hp",
"name": "Kim Sang Dược",
"type": "potion",
"price": 30,
"ingot": 0,
"sell": 10,
"des": "Hồi 40% máu (phím 1)"
},
{
"code": "binh_mp",
"name": "Cửu Chuyển Đan",
"type": "potion",
"price": 40,
"ingot": 0,
"sell": 12,
"des": "Hồi 50% nội lực (phím 2)"
},
{
"code": "lua",
"name": "Lúa Vàng",
"type": "crop",
"price": 0,
"ingot": 0,
"sell": 5,
"des": "Nông sản - bán lấy ngân lượng"
},
{
"code": "go",
"name": "Gỗ Lim",
"type": "crop",
"price": 0,
"ingot": 0,
"sell": 8,
"des": "Nguyên liệu rèn vũ khí"
},
{
"code": "sat",
"name": "Quặng Sắt",
"type": "crop",
"price": 0,
"ingot": 0,
"sell": 12,
"des": "Nguyên liệu rèn vũ khí"
},
{
"code": "huyen_thiet",
"name": "Huyền Thiết",
"type": "mat",
"price": 0,
"ingot": 0,
"sell": 20,
"des": "Nguyên liệu cũ (bản trước) - bán lấy ngân lượng"
},
{
"code": "cuong_1",
"name": "Đá Cường Hóa Cấp 1",
"type": "up",
"price": 120,
"ingot": 0,
"sell": 8,
"des": "Nâng trang bị lên +1 · rơi từ quái bản đồ 1-2 · 6 viên ghép 1 viên cấp 2",
"tier": 1,
"icon": "huyen_thiet"
},
{
"code": "cuong_2",
"name": "Đá Cường Hóa Cấp 2",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 16,
"des": "Nâng trang bị lên +2 · rơi từ quái bản đồ 3-4 · 6 viên ghép 1 viên cấp 3",
"tier": 2,
"icon": "huyen_thiet"
},
{
"code": "cuong_3",
"name": "Đá Cường Hóa Cấp 3",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 24,
"des": "Nâng trang bị lên +3 · rơi từ quái bản đồ 5-6 · 6 viên ghép 1 viên cấp 4",
"tier": 3,
"icon": "huyen_thiet"
},
{
"code": "cuong_4",
"name": "Đá Cường Hóa Cấp 4",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 32,
"des": "Nâng trang bị lên +4 · rơi từ quái bản đồ 7-8 · 6 viên ghép 1 viên cấp 5",
"tier": 4,
"icon": "huyen_thiet"
},
{
"code": "cuong_5",
"name": "Đá Cường Hóa Cấp 5",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 40,
"des": "Nâng trang bị lên +5 · rơi từ quái bản đồ 9-10 · 6 viên ghép 1 viên cấp 6",
"tier": 5,
"icon": "huyen_thiet"
},
{
"code": "cuong_6",
"name": "Đá Cường Hóa Cấp 6",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 48,
"des": "Nâng trang bị lên +6 · rơi từ quái bản đồ 11-12 · 6 viên ghép 1 viên cấp 7",
"tier": 6,
"icon": "huyen_thiet"
},
{
"code": "cuong_7",
"name": "Đá Cường Hóa Cấp 7",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 56,
"des": "Nâng trang bị lên +7 · rơi từ quái bản đồ 13-14 · 6 viên ghép 1 viên cấp 8",
"tier": 7,
"icon": "huyen_thiet"
},
{
"code": "cuong_8",
"name": "Đá Cường Hóa Cấp 8",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 64,
"des": "Nâng trang bị lên +8 · rơi từ quái bản đồ 15 · 6 viên ghép 1 viên cấp 9",
"tier": 8,
"icon": "huyen_thiet"
},
{
"code": "cuong_9",
"name": "Đá Cường Hóa Cấp 9",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 72,
"des": "Nâng trang bị lên +9 · rơi từ quái bản đồ 16-17 · 6 viên ghép 1 viên cấp 10",
"tier": 9,
"icon": "huyen_thiet"
},
{
"code": "cuong_10",
"name": "Đá Cường Hóa Cấp 10",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 80,
"des": "Nâng trang bị lên +10 · rơi từ quái bản đồ 18-19 · 6 viên ghép 1 viên cấp 11",
"tier": 10,
"icon": "huyen_thiet"
},
{
"code": "cuong_11",
"name": "Đá Cường Hóa Cấp 11",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 88,
"des": "Nâng trang bị lên +11 · rơi từ quái bản đồ 20-21 · 6 viên ghép 1 viên cấp 12",
"tier": 11,
"icon": "huyen_thiet"
},
{
"code": "cuong_12",
"name": "Đá Cường Hóa Cấp 12",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 96,
"des": "Nâng trang bị lên +12 · rơi từ quái bản đồ 22-23 · 6 viên ghép 1 viên cấp 13",
"tier": 12,
"icon": "huyen_thiet"
},
{
"code": "cuong_13",
"name": "Đá Cường Hóa Cấp 13",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 104,
"des": "Nâng trang bị lên +13 · rơi từ quái bản đồ 24-25 · 6 viên ghép 1 viên cấp 14",
"tier": 13,
"icon": "huyen_thiet"
},
{
"code": "cuong_14",
"name": "Đá Cường Hóa Cấp 14",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 112,
"des": "Nâng trang bị lên +14 · rơi từ quái bản đồ 26-27 · 6 viên ghép 1 viên cấp 15",
"tier": 14,
"icon": "huyen_thiet"
},
{
"code": "cuong_15",
"name": "Đá Cường Hóa Cấp 15",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 120,
"des": "Nâng trang bị lên +15 · rơi từ quái bản đồ 28-29 · 6 viên ghép 1 viên cấp 16",
"tier": 15,
"icon": "huyen_thiet"
},
{
"code": "cuong_16",
"name": "Đá Cường Hóa Cấp 16",
"type": "up",
"price": 0,
"ingot": 0,
"sell": 128,
"des": "Nâng trang bị lên +16 (tối đa) · rơi từ quái bản đồ 30",
"tier": 16,
"icon": "huyen_thiet"
},
{
"code": "duc_sao",
"name": "Đục Sao Chùy",
"type": "mat",
"price": 800,
"ingot": 1,
"sell": 100,
"des": "Đục thêm 1 lỗ sao trên trang bị"
},
{
"code": "bua_ho",
"name": "Bùa Hộ Mệnh",
"type": "mat",
"price": 0,
"ingot": 5,
"sell": 0,
"des": "Cường hóa thất bại không bị tụt cấp"
},
{
"code": "thanh_tam",
"name": "Thanh Tâm Đan",
"type": "mat",
"price": 0,
"ingot": 2,
"sell": 0,
"des": "Giảm 50 điểm khiêu khích (dùng ở bảng PK [K])",
"icon": "em_lotus"
},
{
"code": "st_atk_1",
"name": "Hồng Tinh Thạch 1★",
"type": "stone",
"price": 300,
"ingot": 0,
"sell": 60,
"des": "Khảm vào lỗ sao: +6 Công",
"stone": "atk",
"tier": 1,
"val": 6,
"icon": "st_atk"
},
{
"code": "st_atk_2",
"name": "Hồng Tinh Thạch 2★",
"type": "stone",
"price": 0,
"ingot": 3,
"sell": 120,
"des": "Khảm vào lỗ sao: +14 Công",
"stone": "atk",
"tier": 2,
"val": 14,
"icon": "st_atk"
},
{
"code": "st_atk_3",
"name": "Hồng Tinh Thạch 3★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 180,
"des": "Khảm vào lỗ sao: +26 Công",
"stone": "atk",
"tier": 3,
"val": 26,
"icon": "st_atk"
},
{
"code": "st_atk_4",
"name": "Hồng Tinh Thạch 4★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 240,
"des": "Khảm vào lỗ sao: +44 Công",
"stone": "atk",
"tier": 4,
"val": 44,
"icon": "st_atk"
},
{
"code": "st_atk_5",
"name": "Hồng Tinh Thạch 5★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 300,
"des": "Khảm vào lỗ sao: +70 Công",
"stone": "atk",
"tier": 5,
"val": 70,
"icon": "st_atk"
},
{
"code": "st_atk_6",
"name": "Hồng Tinh Thạch 6★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 360,
"des": "Khảm vào lỗ sao: +110 Công",
"stone": "atk",
"tier": 6,
"val": 110,
"icon": "st_atk"
},
{
"code": "st_hp_1",
"name": "Lục Tinh Thạch 1★",
"type": "stone",
"price": 300,
"ingot": 0,
"sell": 60,
"des": "Khảm vào lỗ sao: +40 Máu",
"stone": "hp",
"tier": 1,
"val": 40,
"icon": "st_hp"
},
{
"code": "st_hp_2",
"name": "Lục Tinh Thạch 2★",
"type": "stone",
"price": 0,
"ingot": 3,
"sell": 120,
"des": "Khảm vào lỗ sao: +90 Máu",
"stone": "hp",
"tier": 2,
"val": 90,
"icon": "st_hp"
},
{
"code": "st_hp_3",
"name": "Lục Tinh Thạch 3★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 180,
"des": "Khảm vào lỗ sao: +170 Máu",
"stone": "hp",
"tier": 3,
"val": 170,
"icon": "st_hp"
},
{
"code": "st_hp_4",
"name": "Lục Tinh Thạch 4★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 240,
"des": "Khảm vào lỗ sao: +290 Máu",
"stone": "hp",
"tier": 4,
"val": 290,
"icon": "st_hp"
},
{
"code": "st_hp_5",
"name": "Lục Tinh Thạch 5★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 300,
"des": "Khảm vào lỗ sao: +470 Máu",
"stone": "hp",
"tier": 5,
"val": 470,
"icon": "st_hp"
},
{
"code": "st_hp_6",
"name": "Lục Tinh Thạch 6★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 360,
"des": "Khảm vào lỗ sao: +750 Máu",
"stone": "hp",
"tier": 6,
"val": 750,
"icon": "st_hp"
},
{
"code": "st_mp_1",
"name": "Lam Tinh Thạch 1★",
"type": "stone",
"price": 300,
"ingot": 0,
"sell": 60,
"des": "Khảm vào lỗ sao: +15 Nội lực",
"stone": "mp",
"tier": 1,
"val": 15,
"icon": "st_mp"
},
{
"code": "st_mp_2",
"name": "Lam Tinh Thạch 2★",
"type": "stone",
"price": 0,
"ingot": 3,
"sell": 120,
"des": "Khảm vào lỗ sao: +35 Nội lực",
"stone": "mp",
"tier": 2,
"val": 35,
"icon": "st_mp"
},
{
"code": "st_mp_3",
"name": "Lam Tinh Thạch 3★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 180,
"des": "Khảm vào lỗ sao: +65 Nội lực",
"stone": "mp",
"tier": 3,
"val": 65,
"icon": "st_mp"
},
{
"code": "st_mp_4",
"name": "Lam Tinh Thạch 4★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 240,
"des": "Khảm vào lỗ sao: +110 Nội lực",
"stone": "mp",
"tier": 4,
"val": 110,
"icon": "st_mp"
},
{
"code": "st_mp_5",
"name": "Lam Tinh Thạch 5★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 300,
"des": "Khảm vào lỗ sao: +180 Nội lực",
"stone": "mp",
"tier": 5,
"val": 180,
"icon": "st_mp"
},
{
"code": "st_mp_6",
"name": "Lam Tinh Thạch 6★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 360,
"des": "Khảm vào lỗ sao: +290 Nội lực",
"stone": "mp",
"tier": 6,
"val": 290,
"icon": "st_mp"
},
{
"code": "st_def_1",
"name": "Hoàng Tinh Thạch 1★",
"type": "stone",
"price": 300,
"ingot": 0,
"sell": 60,
"des": "Khảm vào lỗ sao: +4 Thủ",
"stone": "def",
"tier": 1,
"val": 4,
"icon": "st_def"
},
{
"code": "st_def_2",
"name": "Hoàng Tinh Thạch 2★",
"type": "stone",
"price": 0,
"ingot": 3,
"sell": 120,
"des": "Khảm vào lỗ sao: +9 Thủ",
"stone": "def",
"tier": 2,
"val": 9,
"icon": "st_def"
},
{
"code": "st_def_3",
"name": "Hoàng Tinh Thạch 3★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 180,
"des": "Khảm vào lỗ sao: +17 Thủ",
"stone": "def",
"tier": 3,
"val": 17,
"icon": "st_def"
},
{
"code": "st_def_4",
"name": "Hoàng Tinh Thạch 4★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 240,
"des": "Khảm vào lỗ sao: +29 Thủ",
"stone": "def",
"tier": 4,
"val": 29,
"icon": "st_def"
},
{
"code": "st_def_5",
"name": "Hoàng Tinh Thạch 5★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 300,
"des": "Khảm vào lỗ sao: +47 Thủ",
"stone": "def",
"tier": 5,
"val": 47,
"icon": "st_def"
},
{
"code": "st_def_6",
"name": "Hoàng Tinh Thạch 6★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 360,
"des": "Khảm vào lỗ sao: +75 Thủ",
"stone": "def",
"tier": 6,
"val": 75,
"icon": "st_def"
},
{
"code": "st_crit_1",
"name": "Tử Tinh Thạch 1★",
"type": "stone",
"price": 300,
"ingot": 0,
"sell": 60,
"des": "Khảm vào lỗ sao: +1 Chí mạng %",
"stone": "crit",
"tier": 1,
"val": 1,
"icon": "st_crit"
},
{
"code": "st_crit_2",
"name": "Tử Tinh Thạch 2★",
"type": "stone",
"price": 0,
"ingot": 3,
"sell": 120,
"des": "Khảm vào lỗ sao: +2 Chí mạng %",
"stone": "crit",
"tier": 2,
"val": 2,
"icon": "st_crit"
},
{
"code": "st_crit_3",
"name": "Tử Tinh Thạch 3★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 180,
"des": "Khảm vào lỗ sao: +3 Chí mạng %",
"stone": "crit",
"tier": 3,
"val": 3,
"icon": "st_crit"
},
{
"code": "st_crit_4",
"name": "Tử Tinh Thạch 4★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 240,
"des": "Khảm vào lỗ sao: +5 Chí mạng %",
"stone": "crit",
"tier": 4,
"val": 5,
"icon": "st_crit"
},
{
"code": "st_crit_5",
"name": "Tử Tinh Thạch 5★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 300,
"des": "Khảm vào lỗ sao: +7 Chí mạng %",
"stone": "crit",
"tier": 5,
"val": 7,
"icon": "st_crit"
},
{
"code": "st_crit_6",
"name": "Tử Tinh Thạch 6★",
"type": "stone",
"price": 0,
"ingot": 0,
"sell": 360,
"des": "Khảm vào lỗ sao: +10 Chí mạng %",
"stone": "crit",
"tier": 6,
"val": 10,
"icon": "st_crit"
},
{
"code": "dao_thuong",
"name": "Đao Thường",
"type": "equip",
"price": 100,
"ingot": 0,
"sell": 30,
"des": "Cấp 1 · Vũ khí",
"slot": "weapon",
"lv": 1,
"st": {
"atk": 5
}
},
{
"code": "kiem_sat",
"name": "Kiếm Sắt",
"type": "equip",
"price": 300,
"ingot": 0,
"sell": 90,
"des": "Cấp 5 · Vũ khí",
"slot": "weapon",
"lv": 5,
"st": {
"atk": 15
}
},
{
"code": "bua_da",
"name": "Búa Đá Lớn",
"type": "equip",
"price": 600,
"ingot": 0,
"sell": 180,
"des": "Cấp 12 · Vũ khí",
"slot": "weapon",
"lv": 12,
"st": {
"atk": 25,
"hp": 40
}
},
{
"code": "dai_dao",
"name": "Đại Đao Minh Giáo",
"type": "equip",
"price": 1500,
"ingot": 0,
"sell": 450,
"des": "Cấp 25 · Vũ khí",
"slot": "weapon",
"lv": 25,
"st": {
"atk": 45,
"crit": 1
}
},
{
"code": "y_thien_kiem",
"name": "Ỷ Thiên Kiếm",
"type": "equip",
"price": 0,
"ingot": 30,
"sell": 1350,
"des": "Cấp 45 · Vũ khí",
"slot": "weapon",
"lv": 45,
"st": {
"atk": 70,
"crit": 3
}
},
{
"code": "do_long",
"name": "Đồ Long Đao",
"type": "equip",
"price": 0,
"ingot": 0,
"sell": 1080,
"des": "Cấp 60 · Vũ khí",
"slot": "weapon",
"lv": 60,
"st": {
"atk": 95,
"crit": 5
}
},
{
"code": "giap_vai",
"name": "Giáp Vải",
"type": "equip",
"price": 150,
"ingot": 0,
"sell": 45,
"des": "Cấp 1 · Giáp",
"slot": "armor",
"lv": 1,
"st": {
"def": 5,
"hp": 30
}
},
{
"code": "giap_sat",
"name": "Giáp Sắt",
"type": "equip",
"price": 700,
"ingot": 0,
"sell": 210,
"des": "Cấp 15 · Giáp",
"slot": "armor",
"lv": 15,
"st": {
"def": 15,
"hp": 80
}
},
{
"code": "kim_ty_giap",
"name": "Kim Ty Nhuyễn Giáp",
"type": "equip",
"price": 2500,
"ingot": 0,
"sell": 750,
"des": "Cấp 40 · Giáp",
"slot": "armor",
"lv": 40,
"st": {
"def": 35,
"hp": 200
}
},
{
"code": "mu_vai",
"name": "Mũ Vải",
"type": "equip",
"price": 120,
"ingot": 0,
"sell": 36,
"des": "Cấp 1 · Mũ",
"slot": "helmet",
"lv": 1,
"st": {
"def": 2,
"hp": 20
}
},
{
"code": "mu_sat",
"name": "Thiết Khôi",
"type": "equip",
"price": 600,
"ingot": 0,
"sell": 180,
"des": "Cấp 15 · Mũ",
"slot": "helmet",
"lv": 15,
"st": {
"def": 7,
"hp": 60
}
},
{
"code": "mu_kim",
"name": "Kim Quan",
"type": "equip",
"price": 2200,
"ingot": 0,
"sell": 660,
"des": "Cấp 40 · Mũ",
"slot": "helmet",
"lv": 40,
"st": {
"def": 16,
"hp": 150
}
},
{
"code": "giay_vai",
"name": "Hài Vải",
"type": "equip",
"price": 120,
"ingot": 0,
"sell": 36,
"des": "Cấp 1 · Giày",
"slot": "boots",
"lv": 1,
"st": {
"def": 2,
"mp": 10
}
},
{
"code": "giay_sat",
"name": "Thiết Ngoa",
"type": "equip",
"price": 600,
"ingot": 0,
"sell": 180,
"des": "Cấp 15 · Giày",
"slot": "boots",
"lv": 15,
"st": {
"def": 6,
"mp": 30
}
},
{
"code": "giay_kc",
"name": "Khinh Công Hài",
"type": "equip",
"price": 2200,
"ingot": 0,
"sell": 660,
"des": "Cấp 40 · Giày",
"slot": "boots",
"lv": 40,
"st": {
"def": 12,
"mp": 80,
"crit": 2
}
},
{
"code": "nhan_dong",
"name": "Đồng Chỉ Hoàn",
"type": "equip",
"price": 400,
"ingot": 0,
"sell": 120,
"des": "Cấp 5 · Nhẫn",
"slot": "ring",
"lv": 5,
"st": {
"atk": 4,
"crit": 1
}
},
{
"code": "nhan_ngoc",
"name": "Bích Ngọc Giới",
"type": "equip",
"price": 1800,
"ingot": 0,
"sell": 540,
"des": "Cấp 25 · Nhẫn",
"slot": "ring",
"lv": 25,
"st": {
"atk": 12,
"crit": 2
}
},
{
"code": "nhan_huyet",
"name": "Huyết Ngọc Giới",
"type": "equip",
"price": 0,
"ingot": 25,
"sell": 1125,
"des": "Cấp 50 · Nhẫn",
"slot": "ring",
"lv": 50,
"st": {
"atk": 25,
"crit": 4
}
},
{
"code": "ngoc_boi",
"name": "Ngọc Bội",
"type": "equip",
"price": 400,
"ingot": 0,
"sell": 120,
"des": "Cấp 5 · Dây chuyền",
"slot": "amulet",
"lv": 5,
"st": {
"hp": 50,
"mp": 20
}
},
{
"code": "day_chuyen",
"name": "Minh Châu Liên",
"type": "equip",
"price": 1800,
"ingot": 0,
"sell": 540,
"des": "Cấp 25 · Dây chuyền",
"slot": "amulet",
"lv": 25,
"st": {
"hp": 150,
"mp": 60
}
},
{
"code": "thanh_hoa_lenh",
"name": "Thánh Hỏa Lệnh",
"type": "equip",
"price": 0,
"ingot": 25,
"sell": 1125,
"des": "Cấp 50 · Dây chuyền",
"slot": "amulet",
"lv": 50,
"st": {
"hp": 320,
"mp": 120,
"atk": 10
}
},
{
"code": "canh_bach",
"name": "Bạch Hạc Dực",
"type": "equip",
"price": 0,
"ingot": 20,
"sell": 4000,
"des": "Cấp 10 · Cánh · bay 1.6s",
"slot": "wing",
"lv": 10,
"st": {
"atk": 20,
"hp": 200,
"def": 10,
"crit": 1
},
"wing": 0,
"fly": 1.6
},
{
"code": "canh_luc",
"name": "Bích Ngọc Dực",
"type": "equip",
"price": 0,
"ingot": 45,
"sell": 8000,
"des": "Cấp 20 · Cánh · bay 2.0s",
"slot": "wing",
"lv": 20,
"st": {
"atk": 40,
"hp": 400,
"mp": 60,
"def": 18,
"crit": 2
},
"wing": 2,
"fly": 2.0
},
{
"code": "canh_lam",
"name": "Thanh Phong Dực",
"type": "equip",
"price": 0,
"ingot": 80,
"sell": 12000,
"des": "Cấp 30 · Cánh · bay 2.4s",
"slot": "wing",
"lv": 30,
"st": {
"atk": 65,
"hp": 650,
"mp": 100,
"def": 28,
"crit": 3
},
"wing": 3,
"fly": 2.4
},
{
"code": "canh_hong",
"name": "Hồ Điệp Dực",
"type": "equip",
"price": 0,
"ingot": 120,
"sell": 16000,
"des": "Cấp 40 · Cánh · bay 2.8s",
"slot": "wing",
"lv": 40,
"st": {
"atk": 95,
"hp": 950,
"mp": 150,
"def": 40,
"crit": 4
},
"wing": 6,
"fly": 2.8
},
{
"code": "canh_kim",
"name": "Kim Bằng Dực",
"type": "equip",
"price": 0,
"ingot": 170,
"sell": 20000,
"des": "Cấp 50 · Cánh · bay 3.2s",
"slot": "wing",
"lv": 50,
"st": {
"atk": 130,
"hp": 1300,
"mp": 200,
"def": 55,
"crit": 5
},
"wing": 1,
"fly": 3.2
},
{
"code": "canh_thuong",
"name": "Thương Long Dực",
"type": "equip",
"price": 0,
"ingot": 240,
"sell": 26000,
"des": "Cấp 65 · Cánh · bay 3.6s",
"slot": "wing",
"lv": 65,
"st": {
"atk": 175,
"hp": 1750,
"mp": 260,
"def": 72,
"crit": 6
},
"wing": 4,
"fly": 3.6
},
{
"code": "canh_tu",
"name": "Tử Điện Dực",
"type": "equip",
"price": 0,
"ingot": 320,
"sell": 32000,
"des": "Cấp 80 · Cánh · bay 4.0s",
"slot": "wing",
"lv": 80,
"st": {
"atk": 230,
"hp": 2300,
"mp": 330,
"def": 92,
"crit": 7
},
"wing": 7,
"fly": 4.0
},
{
"code": "canh_hoa",
"name": "Hỏa Phượng Dực",
"type": "equip",
"price": 0,
"ingot": 0,
"sell": 38000,
"des": "Cấp 95 · Cánh · bay 5.0s · chỉ có từ nhiệm vụ chính tuyến chương cuối",
"slot": "wing",
"lv": 95,
"st": {
"atk": 300,
"hp": 3000,
"mp": 420,
"def": 120,
"crit": 9
},
"wing": 5,
"fly": 5.0
},
{
"code": "kiem_thanh_phong",
"name": "Thanh Phong Kiếm",
"type": "equip",
"price": 890,
"ingot": 0,
"sell": 296,
"des": "Cấp 18 · Vũ khí",
"slot": "weapon",
"lv": 18,
"st": {
"atk": 35
},
"icon": "kiem_sat"
},
{
"code": "dao_han_thiet",
"name": "Hàn Thiết Đao",
"type": "equip",
"price": 2190,
"ingot": 0,
"sell": 730,
"des": "Cấp 35 · Vũ khí",
"slot": "weapon",
"lv": 35,
"st": {
"atk": 58,
"crit": 2
},
"icon": "dai_dao"
},
{
"code": "kiem_bich_huyet",
"name": "Bích Huyết Kiếm",
"type": "equip",
"price": 3730,
"ingot": 0,
"sell": 1243,
"des": "Cấp 52 · Vũ khí",
"slot": "weapon",
"lv": 52,
"st": {
"atk": 82,
"crit": 3
},
"icon": "y_thien_kiem"
},
{
"code": "dao_tu_kim",
"name": "Tử Kim Đao",
"type": "equip",
"price": 5570,
"ingot": 37,
"sell": 1856,
"des": "Cấp 70 · Vũ khí",
"slot": "weapon",
"lv": 70,
"st": {
"atk": 118,
"crit": 5
},
"icon": "do_long"
},
{
"code": "kiem_long_tuyen",
"name": "Long Tuyền Kiếm",
"type": "equip",
"price": 6670,
"ingot": 44,
"sell": 2223,
"des": "Cấp 80 · Vũ khí",
"slot": "weapon",
"lv": 80,
"st": {
"atk": 140,
"crit": 6
},
"icon": "y_thien_kiem"
},
{
"code": "kiem_huyen_thiet",
"name": "Huyền Thiết Trọng Kiếm",
"type": "equip",
"price": 7830,
"ingot": 52,
"sell": 2610,
"des": "Cấp 90 · Vũ khí",
"slot": "weapon",
"lv": 90,
"st": {
"atk": 165,
"crit": 7,
"hp": 200
},
"icon": "kiem_sat"
},
{
"code": "dao_thien_ha",
"name": "Thiên Hạ Đệ Nhất Đao",
"type": "equip",
"price": 9020,
"ingot": 60,
"sell": 3006,
"des": "Cấp 100 · Vũ khí",
"slot": "weapon",
"lv": 100,
"st": {
"atk": 195,
"crit": 8
},
"icon": "do_long"
},
{
"code": "giap_da",
"name": "Giáp Da Thú",
"type": "equip",
"price": 300,
"ingot": 0,
"sell": 100,
"des": "Cấp 8 · Giáp",
"slot": "armor",
"lv": 8,
"st": {
"def": 10,
"hp": 55
},
"icon": "giap_vai"
},
{
"code": "giap_toa_tu",
"name": "Tỏa Tử Giáp",
"type": "equip",
"price": 1390,
"ingot": 0,
"sell": 463,
"des": "Cấp 25 · Giáp",
"slot": "armor",
"lv": 25,
"st": {
"def": 24,
"hp": 130
},
"icon": "giap_sat"
},
{
"code": "giap_huyen_thiet",
"name": "Huyền Thiết Giáp",
"type": "equip",
"price": 4020,
"ingot": 26,
"sell": 1340,
"des": "Cấp 55 · Giáp",
"slot": "armor",
"lv": 55,
"st": {
"def": 50,
"hp": 300
},
"icon": "giap_sat"
},
{
"code": "giap_long_lan",
"name": "Long Lân Giáp",
"type": "equip",
"price": 5570,
"ingot": 37,
"sell": 1856,
"des": "Cấp 70 · Giáp",
"slot": "armor",
"lv": 70,
"st": {
"def": 66,
"hp": 420
},
"icon": "kim_ty_giap"
},
{
"code": "giap_kim_cuong",
"name": "Kim Cương Giáp",
"type": "equip",
"price": 7240,
"ingot": 48,
"sell": 2413,
"des": "Cấp 85 · Giáp",
"slot": "armor",
"lv": 85,
"st": {
"def": 82,
"hp": 560
},
"icon": "kim_ty_giap"
},
{
"code": "giap_thien_tam",
"name": "Thiên Tàm Bảo Y",
"type": "equip",
"price": 9020,
"ingot": 60,
"sell": 3006,
"des": "Cấp 100 · Giáp",
"slot": "armor",
"lv": 100,
"st": {
"def": 100,
"hp": 720
},
"icon": "kim_ty_giap"
},
{
"code": "mu_da",
"name": "Mũ Da Thú",
"type": "equip",
"price": 300,
"ingot": 0,
"sell": 100,
"des": "Cấp 8 · Mũ",
"slot": "helmet",
"lv": 8,
"st": {
"def": 4,
"hp": 40
},
"icon": "mu_vai"
},
{
"code": "mu_ho_dau",
"name": "Hổ Đầu Khôi",
"type": "equip",
"price": 1390,
"ingot": 0,
"sell": 463,
"des": "Cấp 25 · Mũ",
"slot": "helmet",
"lv": 25,
"st": {
"def": 11,
"hp": 95
},
"icon": "mu_sat"
},
{
"code": "mu_huyen_thiet",
"name": "Huyền Thiết Khôi",
"type": "equip",
"price": 4020,
"ingot": 26,
"sell": 1340,
"des": "Cấp 55 · Mũ",
"slot": "helmet",
"lv": 55,
"st": {
"def": 23,
"hp": 220
},
"icon": "mu_sat"
},
{
"code": "mu_long",
"name": "Long Quan",
"type": "equip",
"price": 5570,
"ingot": 37,
"sell": 1856,
"des": "Cấp 70 · Mũ",
"slot": "helmet",
"lv": 70,
"st": {
"def": 30,
"hp": 300
},
"icon": "mu_kim"
},
{
"code": "mu_phuong",
"name": "Phượng Quan",
"type": "equip",
"price": 7240,
"ingot": 48,
"sell": 2413,
"des": "Cấp 85 · Mũ",
"slot": "helmet",
"lv": 85,
"st": {
"def": 38,
"hp": 390
},
"icon": "mu_kim"
},
{
"code": "mu_thien_tu",
"name": "Thiên Tử Quan",
"type": "equip",
"price": 9020,
"ingot": 60,
"sell": 3006,
"des": "Cấp 100 · Mũ",
"slot": "helmet",
"lv": 100,
"st": {
"def": 46,
"hp": 480
},
"icon": "mu_kim"
},
{
"code": "giay_da",
"name": "Hài Da Thú",
"type": "equip",
"price": 300,
"ingot": 0,
"sell": 100,
"des": "Cấp 8 · Giày",
"slot": "boots",
"lv": 8,
"st": {
"def": 4,
"mp": 20
},
"icon": "giay_vai"
},
{
"code": "giay_truy_phong",
"name": "Truy Phong Ngoa",
"type": "equip",
"price": 1390,
"ingot": 0,
"sell": 463,
"des": "Cấp 25 · Giày",
"slot": "boots",
"lv": 25,
"st": {
"def": 9,
"mp": 55,
"crit": 1
},
"icon": "giay_sat"
},
{
"code": "giay_dap_tuyet",
"name": "Đạp Tuyết Hài",
"type": "equip",
"price": 4020,
"ingot": 26,
"sell": 1340,
"des": "Cấp 55 · Giày",
"slot": "boots",
"lv": 55,
"st": {
"def": 17,
"mp": 120,
"crit": 3
},
"icon": "giay_kc"
},
{
"code": "giay_lang_ba",
"name": "Lăng Ba Hài",
"type": "equip",
"price": 5570,
"ingot": 37,
"sell": 1856,
"des": "Cấp 70 · Giày",
"slot": "boots",
"lv": 70,
"st": {
"def": 22,
"mp": 160,
"crit": 3
},
"icon": "giay_kc"
},
{
"code": "giay_than_hanh",
"name": "Thần Hành Ngoa",
"type": "equip",
"price": 7240,
"ingot": 48,
"sell": 2413,
"des": "Cấp 85 · Giày",
"slot": "boots",
"lv": 85,
"st": {
"def": 27,
"mp": 200,
"crit": 4
},
"icon": "giay_kc"
},
{
"code": "giay_phi_van",
"name": "Phi Vân Hài",
"type": "equip",
"price": 9020,
"ingot": 60,
"sell": 3006,
"des": "Cấp 100 · Giày",
"slot": "boots",
"lv": 100,
"st": {
"def": 32,
"mp": 250,
"crit": 5
},
"icon": "giay_kc"
},
{
"code": "nhan_ngan",
"name": "Ngân Chỉ Hoàn",
"type": "equip",
"price": 700,
"ingot": 0,
"sell": 233,
"des": "Cấp 15 · Nhẫn",
"slot": "ring",
"lv": 15,
"st": {
"atk": 8,
"crit": 1
},
"icon": "nhan_dong"
},
{
"code": "nhan_hac_ngoc",
"name": "Hắc Ngọc Giới",
"type": "equip",
"price": 2190,
"ingot": 0,
"sell": 730,
"des": "Cấp 35 · Nhẫn",
"slot": "ring",
"lv": 35,
"st": {
"atk": 17,
"crit": 3
},
"icon": "nhan_ngoc"
},
{
"code": "nhan_long_van",
"name": "Long Văn Giới",
"type": "equip",
"price": 5040,
"ingot": 33,
"sell": 1680,
"des": "Cấp 65 · Nhẫn",
"slot": "ring",
"lv": 65,
"st": {
"atk": 33,
"crit": 5
},
"icon": "nhan_huyet"
},
{
"code": "nhan_phuong_huyet",
"name": "Phượng Huyết Giới",
"type": "equip",
"price": 6670,
"ingot": 44,
"sell": 2223,
"des": "Cấp 80 · Nhẫn",
"slot": "ring",
"lv": 80,
"st": {
"atk": 42,
"crit": 6
},
"icon": "nhan_huyet"
},
{
"code": "nhan_can_khon",
"name": "Càn Khôn Giới",
"type": "equip",
"price": 8420,
"ingot": 56,
"sell": 2806,
"des": "Cấp 95 · Nhẫn",
"slot": "ring",
"lv": 95,
"st": {
"atk": 52,
"crit": 7
},
"icon": "nhan_ngoc"
},
{
"code": "bua_ho_than",
"name": "Hộ Thân Phù",
"type": "equip",
"price": 700,
"ingot": 0,
"sell": 233,
"des": "Cấp 15 · Dây chuyền",
"slot": "amulet",
"lv": 15,
"st": {
"hp": 95,
"mp": 40
},
"icon": "ngoc_boi"
},
{
"code": "boi_bich_ngoc",
"name": "Bích Ngọc Bội",
"type": "equip",
"price": 2190,
"ingot": 0,
"sell": 730,
"des": "Cấp 35 · Dây chuyền",
"slot": "amulet",
"lv": 35,
"st": {
"hp": 220,
"mp": 85
},
"icon": "ngoc_boi"
},
{
"code": "long_chau",
"name": "Long Châu",
"type": "equip",
"price": 5040,
"ingot": 33,
"sell": 1680,
"des": "Cấp 65 · Dây chuyền",
"slot": "amulet",
"lv": 65,
"st": {
"hp": 420,
"mp": 160,
"atk": 15
},
"icon": "day_chuyen"
},
{
"code": "lien_phuong_hoang",
"name": "Phượng Hoàng Liên",
"type": "equip",
"price": 6670,
"ingot": 44,
"sell": 2223,
"des": "Cấp 80 · Dây chuyền",
"slot": "amulet",
"lv": 80,
"st": {
"hp": 540,
"mp": 200,
"atk": 20
},
"icon": "day_chuyen"
},
{
"code": "chau_thai_cuc",
"name": "Thái Cực Châu",
"type": "equip",
"price": 8420,
"ingot": 56,
"sell": 2806,
"des": "Cấp 95 · Dây chuyền",
"slot": "amulet",
"lv": 95,
"st": {
"hp": 680,
"mp": 250,
"atk": 26
},
"icon": "thanh_hoa_lenh"
}
],
"upStone": {
"prefix": "cuong_",
"max": 16,
"need": 6,
"goldPerTier": 50,
"dropPct": 22,
"stages": 30
},
"wingInfo": {
"img": "assets/img/wings.png",
"fw": 188,
"fh": 75,
"cols": 5,
"rows": 8,
"recharge": 0.6,
"desc": "Đeo cánh: khi đang trên không, giữ phím nhảy để BAY (thời gian bay có hạn, hồi lại khi chạm đất)."
}
};
