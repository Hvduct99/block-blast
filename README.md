# Block Blast

Game Block Blast clone — Next.js (App Router) + Tailwind CSS **3.4.10** tại root, backend Express API ở `backend/`.

## Công nghệ

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 3.4.10** + PostCSS + Autoprefixer
- **@dnd-kit** (drag & drop), **lucide-react** (icons)
- **Backend**: Express, cors, helmet, morgan, dotenv

## Cấu trúc thư mục

```
block-blast/            ← Next.js app (ROOT - Hostinger detect)
├── src/
│   ├── app/            # App Router pages
│   ├── components/     # Game components
│   └── lib/            # Utils, shapes
├── public/             # Static assets
├── backend/            # Node.js Express API (tách riêng)
│   ├── src/server.js
│   └── .env.example
├── package.json        # Next.js dependencies → Hostinger nhận ra
├── next.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Chạy local

```bash
npm install
npm run dev          # → http://localhost:3000

# Backend (terminal riêng)
cd backend
npm install
npm run dev          # → http://localhost:4000
```

## Deploy Hostinger

Hostinger auto-detect Next.js từ `package.json` ở root.

1. Push code lên GitHub.
2. Trong Hostinger → Git → Connect repo `block-blast`.
3. Hostinger sẽ tự nhận ra Next.js framework.
4. Build command: `npm run build` (mặc định).
5. Start command: `npm run start` (mặc định).

> Backend API deploy riêng nếu cần (VPS hoặc service khác).

