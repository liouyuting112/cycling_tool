import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoutePreviewPlanner from "@/components/RoutePreviewPlanner";

type Waypoint = { id: string; name: string; lat: number; lng: number };
type RouteMeta = { id: string; name: string; type: string; recommended_days: number };
type Accommodation = {
  id: string;
  waypoint_id: string;
  name: string;
  subType: "hotel" | "hostel";
  price_per_night: number;
  lat: number;
  lng: number;
  place_id: string;
  address?: string;
};
type Restaurant = {
  id: string;
  waypoint_id: string;
  name: string;
  diet_type: "convenience-store" | "restaurant";
  price_tier: "standard" | "cheap" | "expensive";
  estimated_cost: number;
  lat: number;
  lng: number;
  place_id: string;
  address?: string;
};
type RouteDataset = {
  Routes: RouteMeta[];
  Waypoints: Waypoint[];
  Accommodations: Accommodation[];
  Restaurants: Restaurant[];
};

const ROUTE_FILE_MAP: Record<string, string> = {
  route1: "route1-full.json",
  route2: "route2-full.json",
  route3: "route3-full.json",
  route4: "route4-full.json",
};

async function loadRouteData(routeId: string): Promise<RouteDataset> {
  const file = ROUTE_FILE_MAP[routeId];
  if (!file) notFound();
  const filePath = path.join(process.cwd(), "scripts", "output", file);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as RouteDataset;
}

export default async function PreviewRoutePage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  const data = await loadRouteData(routeId);
  const route = data.Routes[0];

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{route.name}</h1>
            <p className="text-slate-600 mt-1">
              建議 {route.recommended_days} 天・可視化預覽（Google Places 實際點位）
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/preview" className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700">
              路線清單
            </Link>
            <Link href="/" className="px-3 py-2 rounded-lg bg-slate-900 text-white">
              回規劃工具
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border p-4">停靠點：{data.Waypoints.length}</div>
          <div className="rounded-xl bg-white border p-4">住宿總數：{data.Accommodations.length}</div>
          <div className="rounded-xl bg-white border p-4">美食總數：{data.Restaurants.length}</div>
        </div>
        <RoutePreviewPlanner
          waypoints={data.Waypoints}
          accommodations={data.Accommodations}
          restaurants={data.Restaurants}
        />
      </div>
    </main>
  );
}

