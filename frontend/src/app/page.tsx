export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Block Blast Clone Starter</h1>
        <p className="mt-2 text-slate-300">
          Frontend dùng Next.js + Tailwind CSS 3.4.10. Backend API chạy bằng Node.js/Express tại cổng 4000.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 text-lg font-semibold">Game Board (9x9)</h2>
          <div className="grid grid-cols-9 gap-1 rounded-lg bg-slate-950 p-2">
            {Array.from({ length: 81 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square rounded-sm border border-slate-800 bg-slate-900"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold">Next Steps</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            <li>Tạo logic kéo-thả block bằng state management.</li>
            <li>Thêm hệ thống tính điểm và xóa dòng/cột.</li>
            <li>Kết nối API `/api/leaderboard` để lưu điểm.</li>
            <li>Deploy GitHub và cấu hình Hostinger từ repo.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
