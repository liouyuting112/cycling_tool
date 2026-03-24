import TaiwanTripPlanner from "@/components/TaiwanTripPlanner";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-extrabold text-slate-900">台灣環島旅遊規劃 Web App</h1>
          <p className="mt-2 text-slate-600">
            Next.js + Gemini + Google Places(New)｜可視化表格匯出｜可上 Vercel
          </p>
        </header>
        <TaiwanTripPlanner />
      </div>
    </main>
  );
}
