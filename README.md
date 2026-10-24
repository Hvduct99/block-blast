# 🐯 Tạ Tốn Truyền Kỳ

Game nhập vai võ hiệp 2D (Ỷ Thiên Đồ Long Ký) chạy hoàn toàn trên trình duyệt: 30 bản đồ, 16 môn phái, Boss bản đồ, cường hóa / đục sao / khảm đá, nông trại, bang hội, nhiệm vụ NPC.

**Công nghệ:** Node.js + [Vite](https://vite.dev) · [Three.js](https://threejs.org) (nền 3D trang đăng nhập) · [Tailwind CSS v4](https://tailwindcss.com) · engine game Canvas 2D.

## Chạy trên máy

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # xuất bản tĩnh vào dist/
npm run preview   # xem thử bản build
```

## Deploy lên GitHub Pages

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
  login.js            Logic đăng nhập, sao lưu / khôi phục dữ liệu
  play.js             Điểm vào trang game
  three/scene.js      Cảnh 3D: núi thủy mặc, trăng, Đồ Long Đao, tàn lửa
  server/             "Máy chủ" chạy trong trình duyệt (thay cho PHP + MySQL cũ)
    api.js            Các endpoint api/*.php cũ: auth, game, equip, forge, farm, quest, loot, social, friend, pk
    rules.js          Luật game: cấp độ, rơi đồ, chỉ số chiến đấu, PK
    db.js             Lưu trữ localStorage (mỗi yêu cầu là một transaction)
  game/               Engine & giao diện game (game.js, app.js, backend.js, worldmap.js, realtime.js)
  data/               Dữ liệu bản đồ, nhiệm vụ, môn phái, trang bị, quái
  styles/             CSS (Tailwind + style game)
```

## Lưu ý

- GitHub Pages chỉ phục vụ file tĩnh, nên dữ liệu người chơi được lưu **trong trình duyệt** (localStorage). Dùng mục *Sao lưu / khôi phục dữ liệu* ở trang đăng nhập để chuyển sang máy khác.
- Các tính năng nhiều người thời gian thực của bản PHP (bản đồ chung qua Pusher, PK trên bản đồ, chat thế giới giữa các máy) cần máy chủ thật nên không có ở bản tĩnh; game chạy ở chế độ đánh một mình. Bạn bè / giao dịch / thách đấu vẫn dùng được giữa các tài khoản trên cùng trình duyệt.

## Ghi công

Nhân vật: Segel, pzUH · Nền: ansimuz, pwl · Cánh: OpenGameArt · Quái vật: ansimuz (Gothicvania, Sunny Land, Grotto Escape II — CC0) · Nhạc: OpenGameArt · Biểu tượng: game-icons.net (Lorc, Delapouite, Skoll, Faithtoken, Willdabeast, Carl Olsen, Darkzaitzev, Sbed, Caro Asercion).
