# Block Blast Fullstack Starter

Starter project để phát triển game kiểu Block Blast với:

- `frontend`: Next.js (App Router) + Tailwind CSS **3.4.10**
- `backend`: Node.js + Express API
- Root scripts để chạy fullstack cùng lúc

## 1) Công nghệ & thư viện đã cài

### Frontend (`frontend`)
- `next`, `react`, `react-dom`
- `tailwindcss@3.4.10`, `postcss`, `autoprefixer`
- `typescript`, `eslint`, `eslint-config-next`

### Backend (`backend`)
- `express`: tạo REST API
- `cors`: cho phép frontend gọi API
- `helmet`: bảo mật headers cơ bản
- `morgan`: log request
- `dotenv`: quản lý biến môi trường
- `nodemon` (dev): tự restart server khi sửa code

### Root (`/`)
- `concurrently`: chạy frontend + backend cùng lúc

## 2) Cấu trúc thư mục

```bash
block-blast/
├── frontend/               # Next.js app
├── backend/                # Node.js API
│   ├── src/server.js
│   └── .env.example
├── package.json            # scripts fullstack
└── README.md
```

## 3) Chạy local

### Yêu cầu
- Node.js LTS khuyến nghị: **v22.x** (hoặc v20.19+)
- npm 10+

> Bạn đang dùng Node v23 nên vẫn chạy được, nhưng có thể có cảnh báo engine từ một số package.

### Cài dependencies
```bash
# root
npm install

# frontend
cd frontend
npm install

# backend
cd ../backend
npm install
```

### Chạy fullstack
```bash
# tại root
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000/api/health

## 4) API backend mẫu

- `GET /api/health`: kiểm tra server
- `GET /api/leaderboard`: dữ liệu bảng điểm mẫu

Biến môi trường backend:
1. Copy `backend/.env.example` thành `backend/.env`
2. Điều chỉnh giá trị nếu cần

## 5) Quy trình push GitHub

```bash
git init
git add .
git commit -m "init block blast fullstack starter"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 6) Deploy với Hostinger từ GitHub

Luồng khuyến nghị:
1. Push code lên GitHub (repo public/private đều được nếu Hostinger có quyền truy cập).
2. Trong Hostinger, tạo website/app mới và chọn deploy từ GitHub repo.
3. Cấu hình build/start:
   - Frontend (Next.js):
     - Install: `npm install`
     - Build: `npm run build`
     - Start: `npm run start`
     - Working directory: `frontend`
   - Backend (Node.js):
     - Install: `npm install`
     - Start: `npm run start`
     - Working directory: `backend`
4. Thêm environment variables tương ứng (`PORT`, `CLIENT_ORIGIN`,...)
5. Trỏ domain/subdomain theo kiến trúc bạn chọn:
   - `app.domain.com` cho frontend
   - `api.domain.com` cho backend

> Nếu gói Hostinger của bạn chỉ hỗ trợ 1 service, nên tách frontend/backend thành 2 app độc lập hoặc deploy backend qua VPS/Platform khác.

## 7) Hướng mở rộng cho game blockblast

- Thêm engine game ở frontend:
  - ma trận 9x9
  - sinh block ngẫu nhiên
  - drag/drop + snap logic
  - clear hàng/cột/ô 3x3
  - combo và score multiplier
- Backend thêm:
  - API lưu điểm (`POST /api/scores`)
  - auth người chơi (nếu cần)
  - chống spam submit score (rate limit + validation)
