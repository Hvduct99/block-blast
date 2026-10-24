window.TATON_QUESTS = {
"npcs": [
{
"id": "an_to_to",
"name": "Ân Tố Tố",
"title": "Thiên Ưng Giáo",
"color": "#d870a0",
"stage": 1,
"x": 330,
"greet": "Tạ đại ca! Đồ Long Đao gây sóng gió khắp giang hồ, huynh phải cẩn thận."
},
{
"id": "tho_ren",
"name": "Thợ Rèn Minh Giáo",
"title": "Lò rèn Quang Minh",
"color": "#8a5a2a",
"stage": 1,
"x": 470,
"greet": "Muốn có thần binh thì phải có thép tốt. Mang sắt gỗ tới đây!"
},
{
"id": "lao_nong",
"name": "Lão Nông",
"title": "Ruộng lúa Băng Hỏa",
"color": "#6a8a3a",
"stage": 2,
"x": 330,
"greet": "Đảo băng mà vẫn trồng được lúa, ấy là nhờ trời thương người chăm chỉ."
},
{
"id": "truong_thuy_son",
"name": "Trương Thúy Sơn",
"title": "Võ Đang Ngũ Hiệp",
"color": "#e8e8f0",
"stage": 2,
"x": 470,
"greet": "Tạ huynh, tâm ma trong lòng huynh mới là kẻ địch đáng sợ nhất."
},
{
"id": "duong_tieu",
"name": "Dương Tiêu",
"title": "Quang Minh Tả Sứ",
"color": "#b02a2a",
"stage": 3,
"x": 330,
"greet": "Sư Vương trở về, Minh Giáo ta có hy vọng rồi!"
},
{
"id": "vo_ky",
"name": "Trương Vô Kỵ",
"title": "Giáo chủ Minh Giáo",
"color": "#2a7a3a",
"stage": 5,
"x": 330,
"greet": "Nghĩa phụ! Hài nhi đã luyện thành Cửu Dương Thần Công."
},
{
"id": "tieu_chieu",
"name": "Tiểu Chiêu",
"title": "Thánh nữ Ba Tư",
"color": "#7a5ac0",
"stage": 7,
"x": 330,
"greet": "Kim Hoa Bà Bà đã kể cho Tiểu Chiêu nghe về Sư Vương rất nhiều."
},
{
"id": "trieu_man",
"name": "Triệu Mẫn",
"title": "Thiệu Mẫn Quận Chúa",
"color": "#c84a6a",
"stage": 12,
"x": 330,
"greet": "Tạ lão gia tử, Mẫn Mẫn nay đã đứng về phía Vô Kỵ ca ca rồi."
},
{
"id": "truong_tam_phong",
"name": "Trương Tam Phong",
"title": "Võ Đang Tổ Sư",
"color": "#f0f0f8",
"stage": 15,
"x": 330,
"greet": "Thái Cực sinh lưỡng nghi... võ học vốn không có tận cùng."
},
{
"id": "duong_bat_hoi",
"name": "Dương Bất Hối",
"title": "Minh Giáo",
"color": "#e8a0b0",
"stage": 18,
"x": 330,
"greet": "Bất hối - đời người không hối tiếc. Sư Vương hãy tiến lên đỉnh võ lâm!"
}
],
"quests": [
{
"id": "m01",
"cat": "main",
"npc": "tho_ren",
"name": "Chương 1: Vương Bàn Sơn Đảo",
"desc": "Thiên Ưng Giáo mở đại hội Dương Đao Lập Uy, khoe Đồ Long Đao trước quần hùng. Kim Mao Sư Vương Tạ Tốn một mình xông lên đảo đoạt bảo đao. → Đánh bại Bạch Quy Thọ (Boss Bản Đồ 1).",
"type": "boss",
"stage": 1,
"n": 1,
"req": {},
"reward": {
"ingot": 2,
"exp": 480,
"gold": 378,
"items": {
"cuong_1": 3,
"binh_hp": 3
}
}
},
{
"id": "m02",
"cat": "main",
"npc": "truong_thuy_son",
"name": "Chương 2: Băng Hỏa Đảo",
"desc": "Trôi dạt tới hòn đảo nơi băng giá và núi lửa cùng tồn tại. Cơn cuồng bệnh trong lòng Tạ Tốn trỗi dậy thành Tâm Ma. → Đánh bại Tâm Ma Cuồng Sư (Boss Bản Đồ 2).",
"type": "boss",
"stage": 2,
"n": 1,
"req": {
"prev": "m01"
},
"reward": {
"ingot": 2,
"exp": 660,
"gold": 540,
"items": {
"cuong_1": 3,
"binh_hp": 3
}
}
},
{
"id": "m03",
"cat": "main",
"npc": "duong_tieu",
"name": "Chương 3: Quang Minh Đỉnh",
"desc": "Lục đại môn phái vây công tổng đàn Minh Giáo. Tạ Tốn là Hộ Giáo Pháp Vương, không thể khoanh tay đứng nhìn. → Đánh bại Hà Thái Xung (Boss Bản Đồ 3).",
"type": "boss",
"stage": 3,
"n": 1,
"req": {
"prev": "m02"
},
"reward": {
"ingot": 3,
"exp": 900,
"gold": 702,
"items": {
"cuong_2": 3,
"binh_hp": 3
}
}
},
{
"id": "m04",
"cat": "main",
"npc": "duong_tieu",
"name": "Chương 4: Nga Mi Kim Đỉnh",
"desc": "Nga Mi phái truy sát giáo chúng Minh Giáo. Diệt Tuyệt Sư Thái tay cầm Ỷ Thiên Kiếm, kiếm khí lạnh thấu xương. → Đánh bại Diệt Tuyệt Sư Thái (Boss Bản Đồ 4).",
"type": "boss",
"stage": 4,
"n": 1,
"req": {
"prev": "m03"
},
"reward": {
"ingot": 3,
"exp": 1140,
"gold": 918,
"items": {
"cuong_2": 3,
"binh_hp": 3
}
}
},
{
"id": "m05",
"cat": "main",
"npc": "vo_ky",
"name": "Chương 5: Võ Đang Sơn",
"desc": "Triệu Mẫn sai cao thủ Nhữ Dương Vương Phủ đánh úp Võ Đang. Trương Tam Phong bị thương, Võ Đang nguy cấp. → Đánh bại A Nhị (Boss Bản Đồ 5).",
"type": "boss",
"stage": 5,
"n": 1,
"req": {
"prev": "m04"
},
"reward": {
"ingot": 3,
"exp": 1380,
"gold": 1080,
"items": {
"cuong_3": 3,
"binh_hp": 3,
"giap_sat": 1
}
}
},
{
"id": "m06",
"cat": "main",
"npc": "vo_ky",
"name": "Chương 6: Vạn An Tự Đại Đô",
"desc": "Cao thủ lục đại phái bị trúng Thập Hương Nhuyễn Cân Tán, giam trên tháp Vạn An Tự. Huyền Minh Nhị Lão canh giữ. → Đánh bại Huyền Minh Nhị Lão (Boss Bản Đồ 6).",
"type": "boss",
"stage": 6,
"n": 1,
"req": {
"prev": "m05"
},
"reward": {
"ingot": 4,
"exp": 1620,
"gold": 1296,
"items": {
"cuong_3": 3,
"binh_hp": 3
}
}
},
{
"id": "m07",
"cat": "main",
"npc": "tieu_chieu",
"name": "Chương 7: Linh Xà Đảo",
"desc": "Tam Sứ Ba Tư Minh Giáo vượt biển tới đòi bắt Đại Ỷ Ti về tổng giáo. Tạ Tốn mù hai mắt vẫn đứng ra cản đường. → Đánh bại Diệu Phong Sứ (Boss Bản Đồ 7).",
"type": "boss",
"stage": 7,
"n": 1,
"req": {
"prev": "m06"
},
"reward": {
"ingot": 4,
"exp": 1920,
"gold": 1512,
"items": {
"cuong_4": 3,
"binh_hp": 3
}
}
},
{
"id": "m08",
"cat": "main",
"npc": "tieu_chieu",
"name": "Chương 8: Đồ Sư Anh Hùng Hội",
"desc": "Thiếu Lâm mở Đồ Sư Đại Hội, lấy Tạ Tốn làm mồi nhử quần hùng tranh đoạt Đồ Long Đao. → Đánh bại Tống Thanh Thư (Boss Bản Đồ 8).",
"type": "boss",
"stage": 8,
"n": 1,
"req": {
"prev": "m07"
},
"reward": {
"ingot": 4,
"exp": 2220,
"gold": 1782,
"items": {
"cuong_4": 3,
"binh_hp": 3
}
}
},
{
"id": "m09",
"cat": "main",
"npc": "tieu_chieu",
"name": "Chương 9: Kim Cang Phục Ma Khuyên",
"desc": "Tam Độ thần tăng Thiếu Lâm ngồi trên ba gốc tùng, dùng Kim Cang Phục Ma Khuyên giam giữ Tạ Tốn dưới hầm đá. → Đánh bại Độ Ách Thần Tăng (Boss Bản Đồ 9).",
"type": "boss",
"stage": 9,
"n": 1,
"req": {
"prev": "m08"
},
"reward": {
"ingot": 5,
"exp": 2520,
"gold": 2052,
"items": {
"cuong_5": 3,
"binh_hp": 3
}
}
},
{
"id": "m10",
"cat": "main",
"npc": "tieu_chieu",
"name": "Chương 10: Quyết Chiến Thành Côn",
"desc": "Thành Côn - kẻ giết cả nhà Tạ Tốn, nay đội lốt Viên Chân hòa thượng. Mối huyết hải thâm thù phải được trả! → Đánh bại Thành Côn - Viên Chân (Boss Bản Đồ 10).",
"type": "boss",
"stage": 10,
"n": 1,
"req": {
"prev": "m09"
},
"reward": {
"ingot": 5,
"exp": 2820,
"gold": 2268,
"items": {
"cuong_5": 3,
"binh_hp": 3,
"canh_bach": 1
}
}
},
{
"id": "m11",
"cat": "main",
"npc": "tieu_chieu",
"name": "Chương 11: Hồ Điệp Cốc",
"desc": "Hồ Điệp Cốc của Điệp Cốc Y Tiên Hồ Thanh Ngưu, nay bị Kim Hoa Bà Bà bao vây truy sát. → Đánh bại Kim Hoa Bà Bà (Boss Bản Đồ 11).",
"type": "boss",
"stage": 11,
"n": 1,
"req": {
"prev": "m10"
},
"reward": {
"ingot": 5,
"exp": 3000,
"gold": 2430,
"items": {
"cuong_6": 3,
"binh_hp": 3
}
}
},
{
"id": "m12",
"cat": "main",
"npc": "trieu_man",
"name": "Chương 12: Lục Liễu Sơn Trang",
"desc": "Sơn trang của Triệu Mẫn ẩn giữa rừng liễu, cơ quan trùng trùng, cao thủ Vương Phủ canh giữ. → Đánh bại Hạc Bút Ông (Boss Bản Đồ 12).",
"type": "boss",
"stage": 12,
"n": 1,
"req": {
"prev": "m11"
},
"reward": {
"ingot": 6,
"exp": 3180,
"gold": 2538,
"items": {
"cuong_6": 3,
"binh_hp": 3
}
}
},
{
"id": "m13",
"cat": "main",
"npc": "trieu_man",
"name": "Chương 13: Côn Luân Tam Thánh Phong",
"desc": "Đỉnh tuyết Côn Luân, nơi Côn Luân Tam Thánh Hà Túc Đạo từng đàn cầm luận kiếm. → Đánh bại Hà Túc Đạo (Boss Bản Đồ 13).",
"type": "boss",
"stage": 13,
"n": 1,
"req": {
"prev": "m12"
},
"reward": {
"ingot": 6,
"exp": 3360,
"gold": 2700,
"items": {
"cuong_7": 3,
"binh_hp": 3
}
}
},
{
"id": "m14",
"cat": "main",
"npc": "trieu_man",
"name": "Chương 14: Hoa Sơn Tuyệt Đỉnh",
"desc": "Vách đá Hoa Sơn dựng đứng, kiếm khí ngút trời. Tiên Vu Thông âm mưu đoạt ngôi chưởng môn. → Đánh bại Tiên Vu Thông (Boss Bản Đồ 14).",
"type": "boss",
"stage": 14,
"n": 1,
"req": {
"prev": "m13"
},
"reward": {
"ingot": 6,
"exp": 3540,
"gold": 2862,
"items": {
"cuong_7": 3,
"binh_hp": 3
}
}
},
{
"id": "m15",
"cat": "main",
"npc": "truong_tam_phong",
"name": "Chương 15: Không Động Ngũ Lão Phong",
"desc": "Năm ngọn núi của Không Động phái, nơi Thất Thương Quyền được truyền dạy. → Đánh bại Đường Văn Lượng (Boss Bản Đồ 15).",
"type": "boss",
"stage": 15,
"n": 1,
"req": {
"prev": "m14"
},
"reward": {
"ingot": 7,
"exp": 3720,
"gold": 3024,
"items": {
"cuong_8": 3,
"binh_hp": 3,
"thanh_tam": 2
}
}
},
{
"id": "m16",
"cat": "main",
"npc": "truong_tam_phong",
"name": "Chương 16: Cái Bang Tổng Đà",
"desc": "Quân Sơn Cái Bang tổng đà, Trần Hữu Lượng cấu kết Thành Côn mưu đồ bá nghiệp. → Đánh bại Trần Hữu Lượng (Boss Bản Đồ 16).",
"type": "boss",
"stage": 16,
"n": 1,
"req": {
"prev": "m15"
},
"reward": {
"ingot": 7,
"exp": 3900,
"gold": 3132,
"items": {
"cuong_9": 3,
"binh_hp": 3
}
}
},
{
"id": "m17",
"cat": "main",
"npc": "truong_tam_phong",
"name": "Chương 17: Quang Minh Mật Đạo",
"desc": "Đường hầm bí mật dưới Quang Minh Đỉnh, nơi Dương Đỉnh Thiên tẩu hỏa nhập ma năm xưa. → Đánh bại Thanh Dực Bức Vương (Boss Bản Đồ 17).",
"type": "boss",
"stage": 17,
"n": 1,
"req": {
"prev": "m16"
},
"reward": {
"ingot": 7,
"exp": 4080,
"gold": 3294,
"items": {
"cuong_9": 3,
"binh_hp": 3
}
}
},
{
"id": "m18",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 18: Ba Tư Thánh Hỏa Đàn",
"desc": "Thánh đàn Minh Giáo Ba Tư trên biển, lửa thánh cháy không bao giờ tắt. → Đánh bại Lưu Vân Sứ (Boss Bản Đồ 18).",
"type": "boss",
"stage": 18,
"n": 1,
"req": {
"prev": "m17"
},
"reward": {
"ingot": 8,
"exp": 4260,
"gold": 3456,
"items": {
"cuong_10": 3,
"binh_hp": 3
}
}
},
{
"id": "m19",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 19: Thiếu Thất Tàng Kinh Các",
"desc": "Tàng Kinh Các Thiếu Lâm - nơi cất giữ bí kíp thất truyền, Tam Độ canh giữ ngày đêm. → Đánh bại Độ Kiếp Thần Tăng (Boss Bản Đồ 19).",
"type": "boss",
"stage": 19,
"n": 1,
"req": {
"prev": "m18"
},
"reward": {
"ingot": 8,
"exp": 4440,
"gold": 3564,
"items": {
"cuong_10": 3,
"binh_hp": 3
}
}
},
{
"id": "m20",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 20: Võ Lâm Chí Tôn Đài",
"desc": "Đài Chí Tôn trên đỉnh Tung Sơn - ai thắng sẽ là Võ Lâm Chí Tôn, hiệu lệnh thiên hạ. → Đánh bại Chu Chỉ Nhược (Boss Bản Đồ 20).",
"type": "boss",
"stage": 20,
"n": 1,
"req": {
"prev": "m19"
},
"reward": {
"ingot": 8,
"exp": 4620,
"gold": 3726,
"items": {
"cuong_11": 3,
"binh_hp": 3,
"canh_hong": 1
}
}
},
{
"id": "m21",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 21: Long Môn Tiêu Cục",
"desc": "Long Môn Tiêu Cục nhận áp tiêu đưa Du Đại Nham về Võ Đang, nhưng cả tiêu cục bị thảm sát trong một đêm. Kim Cang Môn đứng sau tất cả. → Đánh bại Kim Cang Môn Chủ (Boss Bản Đồ 21).",
"type": "boss",
"stage": 21,
"n": 1,
"req": {
"prev": "m20"
},
"reward": {
"ingot": 9,
"exp": 4800,
"gold": 3888,
"items": {
"cuong_11": 3,
"binh_hp": 3
}
}
},
{
"id": "m22",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 22: Hồng Mai Sơn Trang",
"desc": "Sơn trang của Chu Cửu Chân, hoa mai đỏ rợp trời, đàn chó dữ cùng gia đinh canh giữ ngày đêm. → Đánh bại Chu Trường Linh (Boss Bản Đồ 22).",
"type": "boss",
"stage": 22,
"n": 1,
"req": {
"prev": "m21"
},
"reward": {
"ingot": 9,
"exp": 4980,
"gold": 3996,
"items": {
"cuong_12": 3,
"binh_hp": 3
}
}
},
{
"id": "m23",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 23: Côn Luân Viên Hầu Cốc",
"desc": "Thung lũng biệt lập dưới vách Côn Luân, nơi bạch viên giấu Cửu Dương Chân Kinh trong bụng suốt trăm năm. → Đánh bại Bạch Viên Thần Hầu (Boss Bản Đồ 23).",
"type": "boss",
"stage": 23,
"n": 1,
"req": {
"prev": "m22"
},
"reward": {
"ingot": 9,
"exp": 5160,
"gold": 4158,
"items": {
"cuong_12": 3,
"binh_hp": 3
}
}
},
{
"id": "m24",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 24: Hải Sa Bến Cảng",
"desc": "Bến cảng muối của Hải Sa Phái - bọn chúng rải muối độc hại người giang hồ, cướp thuyền buôn trên biển. → Đánh bại Nguyên Quảng Ba (Boss Bản Đồ 24).",
"type": "boss",
"stage": 24,
"n": 1,
"req": {
"prev": "m23"
},
"reward": {
"ingot": 10,
"exp": 5340,
"gold": 4320,
"items": {
"cuong_13": 3,
"binh_hp": 3
}
}
},
{
"id": "m25",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 25: Tây Vực Đại Mạc",
"desc": "Sa mạc mênh mông trên đường tới Quang Minh Đỉnh, lục đại phái phục kích giáo chúng Minh Giáo giữa bão cát. → Đánh bại Tây Hoa Tử (Boss Bản Đồ 25).",
"type": "boss",
"stage": 25,
"n": 1,
"req": {
"prev": "m24"
},
"reward": {
"ingot": 10,
"exp": 5520,
"gold": 4428,
"items": {
"cuong_13": 3,
"binh_hp": 3,
"bua_ho": 3
}
}
},
{
"id": "m26",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 26: Nhữ Dương Vương Phủ",
"desc": "Vương phủ Mông Cổ canh phòng nghiêm ngặt, Triệu Mẫn giam giữ cao thủ giang hồ trong ngục tối. → Đánh bại Nhữ Dương Vương (Boss Bản Đồ 26).",
"type": "boss",
"stage": 26,
"n": 1,
"req": {
"prev": "m25"
},
"reward": {
"ingot": 10,
"exp": 5700,
"gold": 4590,
"items": {
"cuong_14": 3,
"binh_hp": 3
}
}
},
{
"id": "m27",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 27: Đại Đô Hoàng Thành",
"desc": "Kinh thành Đại Đô của triều Nguyên, cấm vệ quân Mông Cổ trùng trùng điệp điệp bảo vệ hoàng cung. → Đánh bại Vương Bảo Bảo (Boss Bản Đồ 27).",
"type": "boss",
"stage": 27,
"n": 1,
"req": {
"prev": "m26"
},
"reward": {
"ingot": 11,
"exp": 5880,
"gold": 4752,
"items": {
"cuong_14": 3,
"binh_hp": 3
}
}
},
{
"id": "m28",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 28: Ỷ Thiên Kiếm Trủng",
"desc": "Hang động bí ẩn nơi Quách Tương năm xưa chôn giấu bí mật của Ỷ Thiên Kiếm và Đồ Long Đao. → Đánh bại Kiếm Trủng Thủ Hộ (Boss Bản Đồ 28).",
"type": "boss",
"stage": 28,
"n": 1,
"req": {
"prev": "m27"
},
"reward": {
"ingot": 11,
"exp": 6060,
"gold": 4914,
"items": {
"cuong_15": 3,
"binh_hp": 3
}
}
},
{
"id": "m29",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 29: Thiên Sơn Tuyết Lĩnh",
"desc": "Đỉnh Thiên Sơn quanh năm tuyết phủ, Tuyết Lĩnh Song Xú chiếm núi xưng vương, chặn đường người qua lại. → Đánh bại Băng Phách Ma Quân (Boss Bản Đồ 29).",
"type": "boss",
"stage": 29,
"n": 1,
"req": {
"prev": "m28"
},
"reward": {
"ingot": 11,
"exp": 6180,
"gold": 4968,
"items": {
"cuong_15": 3,
"binh_hp": 3
}
}
},
{
"id": "m30",
"cat": "main",
"npc": "duong_bat_hoi",
"name": "Chương 30: Thánh Hỏa Tuyệt Đỉnh",
"desc": "Trận quyết chiến cuối cùng trên Thánh Hỏa Đỉnh - nơi tâm ma của cả võ lâm tụ lại thành Hỗn Nguyên Ma Tôn. → Đánh bại Hỗn Nguyên Ma Tôn (Boss Bản Đồ 30).",
"type": "boss",
"stage": 30,
"n": 1,
"req": {
"prev": "m29"
},
"reward": {
"ingot": 12,
"exp": 6300,
"gold": 5076,
"items": {
"cuong_16": 3,
"binh_hp": 3,
"canh_hoa": 1
}
}
},
{
"id": "q01",
"npc": "an_to_to",
"name": "Lên đảo Vương Bàn",
"desc": "Hạ 5 Đệ Tử Thiên Ưng ở Vương Bàn Sơn Đảo.",
"type": "kill",
"stage": 1,
"n": 5,
"req": {},
"reward": {
"exp": 80,
"gold": 60,
"items": {
"binh_hp": 2
}
},
"cat": "side"
},
{
"id": "q02",
"npc": "an_to_to",
"name": "Đoạt Đồ Long Đao",
"desc": "Đánh bại Bạch Quy Thọ (Boss Bản Đồ 1).",
"type": "boss",
"stage": 1,
"n": 1,
"req": {
"prev": "q01"
},
"reward": {
"ingot": 2,
"exp": 150,
"gold": 120,
"items": {
"binh_mp": 2
}
},
"cat": "side"
},
{
"id": "q03",
"npc": "tho_ren",
"name": "Thép tốt rèn đao",
"desc": "Rèn thành công 1 món vũ khí ở tab Rèn.",
"type": "forge",
"stage": 0,
"n": 1,
"req": {},
"reward": {
"exp": 120,
"gold": 200,
"items": {
"sat": 5,
"go": 5
}
},
"cat": "side"
},
{
"id": "q04",
"npc": "lao_nong",
"name": "Ruộng lúa Băng Hỏa",
"desc": "Thu hoạch nông trại 3 lần.",
"type": "harvest",
"stage": 0,
"n": 3,
"req": {},
"reward": {
"exp": 100,
"gold": 100,
"items": {
"go": 5
}
},
"cat": "side"
},
{
"id": "q05",
"npc": "truong_thuy_son",
"name": "Ảo ảnh cuồng ma",
"desc": "Hạ 10 Ảo Ảnh Cuồng Ma ở Băng Hỏa Đảo.",
"type": "kill",
"stage": 2,
"n": 10,
"req": {
"stage": 2
},
"reward": {
"exp": 300,
"gold": 150,
"items": {
"binh_hp": 3
}
},
"cat": "side"
},
{
"id": "q06",
"npc": "truong_thuy_son",
"name": "Trừ Tâm Ma",
"desc": "Đánh bại Tâm Ma Cuồng Sư (Boss Bản Đồ 2).",
"type": "boss",
"stage": 2,
"n": 1,
"req": {
"prev": "q05"
},
"reward": {
"ingot": 2,
"exp": 450,
"gold": 250,
"items": {
"giap_vai": 1
}
},
"cat": "side"
},
{
"id": "q07",
"npc": "duong_tieu",
"name": "Cứu viện Quang Minh Đỉnh",
"desc": "Đánh bại Hà Thái Xung (Boss Bản Đồ 3).",
"type": "boss",
"stage": 3,
"n": 1,
"req": {
"stage": 3
},
"reward": {
"ingot": 3,
"exp": 700,
"gold": 350,
"items": {
"binh_mp": 3
}
},
"cat": "side"
},
{
"id": "q08",
"npc": "duong_tieu",
"name": "Hộ Giáo Pháp Vương",
"desc": "Đạt cấp 8 để lĩnh ngộ Cửu Dương Hộ Thể.",
"type": "level",
"stage": 0,
"n": 8,
"req": {
"prev": "q07"
},
"reward": {
"exp": 0,
"gold": 500,
"items": {
"giap_sat": 1
}
},
"cat": "side"
},
{
"id": "q09",
"npc": "vo_ky",
"name": "Võ Đang nguy cấp",
"desc": "Đánh bại A Nhị (Boss Bản Đồ 5).",
"type": "boss",
"stage": 5,
"n": 1,
"req": {
"stage": 5
},
"reward": {
"ingot": 3,
"exp": 1200,
"gold": 600,
"items": {
"binh_hp": 5
}
},
"cat": "side"
},
{
"id": "q10",
"npc": "vo_ky",
"name": "Long Đằng Cửu Thiên",
"desc": "Đạt cấp 12 để lĩnh ngộ tuyệt học tối thượng.",
"type": "level",
"stage": 0,
"n": 12,
"req": {
"prev": "q09"
},
"reward": {
"exp": 0,
"gold": 1000,
"items": {
"binh_hp": 5,
"binh_mp": 5
}
},
"cat": "side"
},
{
"id": "q11",
"npc": "tieu_chieu",
"name": "Thánh Hỏa Lệnh",
"desc": "Đánh bại Diệu Phong Sứ (Boss Bản Đồ 7).",
"type": "boss",
"stage": 7,
"n": 1,
"req": {
"stage": 7
},
"reward": {
"ingot": 5,
"exp": 2000,
"gold": 1000,
"items": {
"kim_ty_giap": 1
}
},
"cat": "side"
},
{
"id": "q12",
"npc": "tieu_chieu",
"name": "Huyết hải thâm thù",
"desc": "Đánh bại Thành Côn (Boss Bản Đồ 10).",
"type": "boss",
"stage": 10,
"n": 1,
"req": {
"prev": "q11",
"stage": 10
},
"reward": {
"ingot": 10,
"exp": 6000,
"gold": 3000,
"items": {
"do_long": 1
}
},
"cat": "side"
},
{
"id": "q13",
"npc": "trieu_man",
"name": "Lục Liễu Sơn Trang",
"desc": "Đánh bại Hạc Bút Ông (Boss Bản Đồ 12).",
"type": "boss",
"stage": 12,
"n": 1,
"req": {
"stage": 12
},
"reward": {
"ingot": 5,
"exp": 9000,
"gold": 2500,
"items": {
"binh_hp": 10
}
},
"cat": "side"
},
{
"id": "q14",
"npc": "trieu_man",
"name": "Tuyệt thế cao thủ",
"desc": "Đạt cấp 55.",
"type": "level",
"stage": 0,
"n": 55,
"req": {
"prev": "q13"
},
"reward": {
"exp": 0,
"gold": 6000,
"items": {
"binh_mp": 10,
"sat": 30,
"go": 20
}
},
"cat": "side"
},
{
"id": "q15",
"npc": "truong_tam_phong",
"name": "Thái Cực truyền nhân",
"desc": "Hạ 60 Đệ Tử Không Động ở Không Động Ngũ Lão Phong.",
"type": "kill",
"stage": 15,
"n": 60,
"req": {
"stage": 15
},
"reward": {
"exp": 14000,
"gold": 3000,
"items": {
"binh_hp": 8
}
},
"cat": "side"
},
{
"id": "q16",
"npc": "truong_tam_phong",
"name": "Đại chiến Không Động",
"desc": "Đánh bại Đường Văn Lượng (Boss Bản Đồ 15).",
"type": "boss",
"stage": 15,
"n": 1,
"req": {
"prev": "q15"
},
"reward": {
"ingot": 6,
"exp": 18000,
"gold": 4000,
"items": {
"binh_mp": 8
}
},
"cat": "side"
},
{
"id": "q17",
"npc": "duong_bat_hoi",
"name": "Thánh Hỏa Đàn",
"desc": "Đánh bại Lưu Vân Sứ (Boss Bản Đồ 18).",
"type": "boss",
"stage": 18,
"n": 1,
"req": {
"stage": 18
},
"reward": {
"ingot": 8,
"exp": 30000,
"gold": 8000,
"items": {
"binh_hp": 15
}
},
"cat": "side"
},
{
"id": "q18",
"npc": "duong_bat_hoi",
"name": "Võ Lâm Chí Tôn",
"desc": "Đánh bại Chu Chỉ Nhược trên Võ Lâm Chí Tôn Đài (Boss Bản Đồ 20).",
"type": "boss",
"stage": 20,
"n": 1,
"req": {
"prev": "q17",
"stage": 20
},
"reward": {
"ingot": 20,
"exp": 60000,
"gold": 20000,
"items": {
"binh_hp": 20,
"binh_mp": 20
}
},
"cat": "side"
},
{
"id": "q19",
"npc": "duong_bat_hoi",
"name": "Đỉnh cao võ học",
"desc": "Đạt cấp 100 - Võ Lâm Thần Thoại.",
"type": "level",
"stage": 0,
"n": 100,
"req": {
"prev": "q18"
},
"reward": {
"ingot": 50,
"exp": 0,
"gold": 100000,
"items": {
"kim_ty_giap": 1
}
},
"cat": "side"
},
{
"id": "d03",
"npc": "an_to_to",
"name": "[Hằng ngày] Săn boss",
"desc": "Hạ 3 Thủ Lĩnh ở bản đồ bất kỳ.",
"type": "fboss",
"stage": 0,
"n": 3,
"daily": true,
"req": {},
"reward": {
"ingot": 2,
"exp": 0,
"exp_lv": 60,
"gold": 400,
"items": {
"binh_hp": 3,
"binh_mp": 2
},
"gold_lv": 50
},
"cat": "daily"
},
{
"id": "d01",
"npc": "an_to_to",
"name": "[Hằng ngày] Luyện công",
"desc": "Hạ 30 quái bất kỳ.",
"type": "kill",
"stage": 0,
"n": 30,
"daily": true,
"req": {},
"reward": {
"ingot": 1,
"exp": 0,
"exp_lv": 40,
"gold": 200,
"items": {
"binh_hp": 2
},
"gold_lv": 25
},
"cat": "daily"
},
{
"id": "d02",
"npc": "lao_nong",
"name": "[Hằng ngày] Chăm ruộng",
"desc": "Thu hoạch nông trại 4 lần.",
"type": "harvest",
"stage": 0,
"n": 4,
"daily": true,
"req": {},
"reward": {
"ingot": 1,
"exp": 0,
"exp_lv": 20,
"gold": 150,
"items": {
"binh_mp": 1
},
"gold_lv": 15
},
"cat": "daily"
},
{
"id": "d04",
"npc": "an_to_to",
"name": "[Hằng ngày] Bách chiến bách thắng",
"desc": "Hạ 150 quái bất kỳ.",
"type": "kill",
"stage": 0,
"n": 150,
"reward": {
"ingot": 3,
"exp": 0,
"exp_lv": 80,
"gold": 0,
"gold_lv": 60,
"items": {
"binh_hp": 5,
"binh_mp": 3
}
},
"cat": "daily",
"daily": true,
"req": {}
},
{
"id": "d05",
"npc": "duong_tieu",
"name": "[Hằng ngày] Trảm thủ đầu lĩnh",
"desc": "Đánh bại 1 Boss Bản Đồ (bản đồ bất kỳ).",
"type": "boss",
"stage": 0,
"n": 1,
"reward": {
"ingot": 2,
"exp": 0,
"exp_lv": 50,
"gold": 0,
"gold_lv": 40,
"items": {
"cuong_1": 2
}
},
"cat": "daily",
"daily": true,
"req": {}
},
{
"id": "d06",
"npc": "tho_ren",
"name": "[Hằng ngày] Tôi luyện thần binh",
"desc": "Cường hóa trang bị 2 lần (thành công hay thất bại đều tính).",
"type": "enhance",
"stage": 0,
"n": 2,
"reward": {
"ingot": 1,
"exp": 0,
"exp_lv": 20,
"gold": 0,
"gold_lv": 25,
"items": {
"cuong_1": 2
}
},
"cat": "daily",
"daily": true,
"req": {}
},
{
"id": "d07",
"npc": "tho_ren",
"name": "[Hằng ngày] Luyện đá",
"desc": "Ghép đá (Đá Cường Hóa hoặc đá sao) 1 lần.",
"type": "merge",
"stage": 0,
"n": 1,
"reward": {
"ingot": 1,
"exp": 0,
"exp_lv": 20,
"gold": 0,
"gold_lv": 20,
"items": {}
},
"cat": "daily",
"daily": true,
"req": {}
},
{
"id": "d08",
"npc": "duong_tieu",
"name": "[Hằng ngày] Luận võ",
"desc": "Tham gia 1 trận thách đấu với người chơi khác (phím V / bấm vào người chơi).",
"type": "duel",
"stage": 0,
"n": 1,
"reward": {
"ingot": 1,
"exp": 0,
"exp_lv": 30,
"gold": 0,
"gold_lv": 30,
"items": {}
},
"cat": "daily",
"daily": true,
"req": {}
}
]
};
