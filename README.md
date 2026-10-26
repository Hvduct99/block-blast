# 🐯 Tạ Tốn Truyền Kỳ

Game nhập vai võ hiệp 2D (Ỷ Thiên Đồ Long Ký) chạy hoàn toàn trên trình duyệt: 30 bản đồ, 16 môn phái, Boss bản đồ, cường hóa / đục sao / khảm đá, nông trại, bang hội, nhiệm vụ NPC.

**Công nghệ:** [Vite](https://vite.dev) · [Three.js](https://threejs.org) (nền 3D trang đăng nhập) · [Tailwind CSS v4](https://tailwindcss.com) · engine game Canvas 2D · máy chủ: **Supabase** (Postgres + Edge Function) · realtime: **Pusher**.

## Kiến trúc

```
Trình duyệt (Hostinger, file tĩnh dist/)  ──HTTP──▶  Supabase Edge Function "api"  ──▶  Postgres (Supabase)
            │                                          (logic game, giữ nguyên api/*.php cũ)
            └──────────── WebSocket ─────────────▶  Pusher (bản đồ chung thời gian thực)
```

## Deploy

**1. Supabase** (repo đã nối GitHub ↔ Supabase): mỗi lần push lên `main`, Supabase tự chạy SQL trong [supabase/migrations/](supabase/migrations/) và deploy function [supabase/functions/api/](supabase/functions/api/).
Thêm secrets một lần: Dashboard → **Edge Functions → Secrets**: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` (`ap1`), `PUSHER_PREFIX` (`tt`), `TT_SECRET` (chuỗi ngẫu nhiên dài).

Deploy bằng tay (nếu cần):

```bash
npx supabase login
npx supabase link --project-ref xkdzxgtlgrktvkwtvidx
npx supabase db push
npx supabase functions deploy api --no-verify-jwt
npx supabase secrets set PUSHER_APP_ID=... PUSHER_KEY=... PUSHER_SECRET=... PUSHER_CLUSTER=ap1 PUSHER_PREFIX=tt TT_SECRET=...
```

Kiểm tra: `https://xkdzxgtlgrktvkwtvidx.supabase.co/functions/v1/api/health` → `{"ok":true,"db":true,"pusher":true}`.

**2. Hostinger** (meimo.net): trang tĩnh — Framework **Vite**, build `npm run build`, output `dist`. Không cần biến môi trường (đổi project Supabase: đặt `VITE_API_URL`).

## Chạy thử trên máy (không cần Supabase)

```bash
npm install
cp .env.example .env                                         # điền PUSHER_* nếu muốn thử bản đồ chung
VITE_API_URL=http://localhost:3000/functions/v1/api npm run build
npm start                                                    # http://localhost:3000 (Postgres nhúng PGlite)
```

Sửa `src/data/*` hoặc `src/offline/rules.js` → chạy `npm run sync:supabase` rồi commit (function dùng bản sao trong `supabase/functions/api/shared/`). Đổi dữ liệu bản đồ sau khi đã deploy → tạo file migration mới.

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
  boot-server.js      Chọn máy chủ: Supabase (mặc định) hoặc giả lập trong trình duyệt (VITE_BACKEND=local)
  login.js            Logic đăng nhập, sao lưu / khôi phục dữ liệu
  play.js             Điểm vào trang game
  three/scene.js      Cảnh 3D: núi thủy mặc, trăng, Đồ Long Đao, tàn lửa
supabase/
  migrations/         Bảng Postgres (bật RLS) + dữ liệu bản đồ / công thức rèn (thay install.php)
  functions/api/      Edge Function: app.js (định tuyến), core.js, routes/ (game · social · rt bản đồ chung), pusher.js
scripts/              sync-supabase.mjs (sinh shared/ + seed), dev-server.mjs (chạy thử với PGlite)
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

- Bản Hostinger + Supabase: bản đồ chung thời gian thực, PK, chat, bạn bè, giao dịch, bang hội giữa mọi người chơi.
- Bản GitHub Pages chỉ là file tĩnh: dữ liệu lưu **trong trình duyệt**, chơi một mình (có sao lưu / khôi phục ở trang đăng nhập).

## Ghi công

Nhân vật: Segel, pzUH · Nền: ansimuz, pwl · Cánh: OpenGameArt · Quái vật: ansimuz (Gothicvania, Sunny Land, Grotto Escape II — CC0) · Nhạc: OpenGameArt · Biểu tượng: game-icons.net (Lorc, Delapouite, Skoll, Faithtoken, Willdabeast, Carl Olsen, Darkzaitzev, Sbed, Caro Asercion).
