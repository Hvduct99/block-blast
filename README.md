# 🐯 Tạ Tốn Truyền Kỳ

Game nhập vai võ hiệp 2D (Ỷ Thiên Đồ Long Ký) chạy hoàn toàn trên trình duyệt: 30 bản đồ, 16 môn phái, Boss bản đồ, cường hóa / đục sao / khảm đá, nông trại, bang hội, nhiệm vụ NPC.

**Công nghệ:** Node.js (Express + MySQL + Pusher) · [Vite](https://vite.dev) · [Three.js](https://threejs.org) (nền 3D trang đăng nhập) · [Tailwind CSS v4](https://tailwindcss.com) · engine game Canvas 2D.

## Chạy trên máy

```bash
npm install
cp .env.example .env   # điền thông tin MySQL + Pusher
npm run build
npm start              # http://localhost:3000
```

Khi sửa giao diện: chạy `npm run dev:server` và `npm run dev` song song (Vite chuyển `/api` sang cổng 3000).

## Deploy lên Hostinger (chơi nhiều người)

hPanel → Websites → **Node.js Web App** → kết nối repo GitHub, cài đặt:

| Mục | Giá trị |
|---|---|
| Framework preset | Express / Other |
| Node version | 22 (tối thiểu 20.19) |
| Build command | `npm run build` |
| Entry file (Start command) | `app.cjs` (`npm start`) |
| Output directory | `dist` |

**Environment variables** (không ghi vào mã nguồn): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `PUSHER_PREFIX`, `SESSION_SECRET` (xem [.env.example](.env.example)).

Máy chủ tự tạo bảng còn thiếu và nạp bản đồ / công thức rèn mỗi lần khởi động, dùng được luôn database MySQL của bản PHP cũ (tài khoản cũ đăng nhập bình thường). Kiểm tra kết nối DB: `/api/health`.

## Deploy lên GitHub Pages (bản chơi một mình)

1. Đẩy mã lên nhánh `main` của repo.
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Mỗi lần push, workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) tự build và đăng tại `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Bản build dùng đường dẫn tương đối (`base: './'`) nên chạy được ở mọi đường dẫn con, không cần sửa cấu hình theo tên repo.

## Cấu trúc

```
index.html            Trang đăng nhập / đăng ký (Tailwind + nền Three.js)
play.html             Trang game
public/assets/        Ảnh sprite, nền, nhạc (phục vụ nguyên trạng)
src/
  boot-server.js      Chọn máy chủ: Node thật (mặc định) hoặc giả lập (VITE_BACKEND=local)
  login.js            Logic đăng nhập, sao lưu / khôi phục dữ liệu
  play.js             Điểm vào trang game
  three/scene.js      Cảnh 3D: núi thủy mặc, trăng, Đồ Long Đao, tàn lửa
server/               Máy chủ Node: Express + MySQL + Pusher (port từ api/*.php cũ, giữ nguyên đường dẫn API)
  api/                game/auth/loot/quest/farm/forge · equip/pk/social/friend · rt (bản đồ chung) + xác thực Pusher
  schema.js           Tạo bảng / nâng cấp DB (thay install.php)
src/
  offline/            "Máy chủ" giả lập trong trình duyệt cho bản GitHub Pages (VITE_BACKEND=local)
    api.js            Các endpoint api/*.php cũ: auth, game, equip, forge, farm, quest, loot, social, friend, pk
    rules.js          Luật game: cấp độ, rơi đồ, chỉ số chiến đấu, PK
    db.js             Lưu trữ localStorage (mỗi yêu cầu là một transaction)
  game/               Engine & giao diện game (game.js, app.js, backend.js, worldmap.js, realtime.js)
  data/               Dữ liệu bản đồ, nhiệm vụ, môn phái, trang bị, quái
  styles/             CSS (Tailwind + style game)
```

## Lưu ý

- Bản Hostinger (máy chủ Node): bản đồ chung thời gian thực, PK, chat, bạn bè, giao dịch, bang hội giữa mọi người chơi.
- Bản GitHub Pages chỉ là file tĩnh: dữ liệu lưu **trong trình duyệt**, chơi một mình (có sao lưu / khôi phục ở trang đăng nhập).

## Ghi công

Nhân vật: Segel, pzUH · Nền: ansimuz, pwl · Cánh: OpenGameArt · Quái vật: ansimuz (Gothicvania, Sunny Land, Grotto Escape II — CC0) · Nhạc: OpenGameArt · Biểu tượng: game-icons.net (Lorc, Delapouite, Skoll, Faithtoken, Willdabeast, Carl Olsen, Darkzaitzev, Sbed, Caro Asercion).
