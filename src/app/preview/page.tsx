import Link from "next/link";

const routes = [
  { id: "route1", name: "第1條：西部走廊（台北→高雄）" },
  { id: "route2", name: "第2條：東部走廊（台北→花蓮→台東）" },
  { id: "route3", name: "第3條：南部走廊（高雄→屏東→台東）" },
  { id: "route4", name: "第4條：北東走廊（花蓮→宜蘭→台北）" },
];

export default function PreviewIndexPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-5">
        <h1 className="text-3xl font-bold text-slate-900">路線可視化預覽</h1>
        <p className="text-slate-600">先看資料長相是否符合需求，再接進正式規劃流程。</p>
        <div className="grid gap-3">
          {routes.map((r) => (
            <Link
              key={r.id}
              href={`/preview/${r.id}`}
              className="block rounded-xl border bg-white p-4 hover:border-slate-400"
            >
              {r.name}
            </Link>
          ))}
        </div>
        <Link href="/" className="inline-block px-3 py-2 rounded-lg bg-slate-900 text-white">
          回規劃工具
        </Link>
      </div>
    </main>
  );
}

