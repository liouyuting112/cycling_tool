"use client";

import { useEffect, useMemo, useState } from "react";
import MapPickerWrapper from "@/components/MapPickerWrapper";
import { type Point, type Spot } from "@/utils/db";

type Waypoint = { id: string; name: string; lat: number; lng: number };
type Accommodation = {
  id: string;
  waypoint_id: string;
  name: string;
  subType: "hotel" | "hostel";
  price_per_night: number;
  lat: number;
  lng: number;
  place_id: string;
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
};

interface Props {
  waypoints: Waypoint[];
  accommodations: Accommodation[];
  restaurants: Restaurant[];
}

type Segment = {
  idx: number;
  from: Waypoint;
  to: Waypoint;
};

type FoodPref = "convenience-store" | "restaurant";
type AccPref = "hotel" | "hostel";

function toSpot(a: Accommodation): Spot {
  return {
    id: a.id,
    name: a.name,
    type: "accommodation",
    subType: a.subType,
    county: "",
    price: a.price_per_night,
    lat: a.lat,
    lng: a.lng,
    tags: [],
  };
}

function toFoodSpot(r: Restaurant): Spot {
  return {
    id: r.id,
    name: r.name,
    type: "food",
    subType: r.diet_type === "convenience-store" ? "convenience-store" : "restaurant",
    county: "",
    price: r.estimated_cost,
    lat: r.lat,
    lng: r.lng,
    tags: [r.price_tier],
  };
}

function placeLink(name: string, lat: number, lng: number, placeId: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(
    placeId
  )}&ll=${lat},${lng}`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function pointToSegmentDistanceKm(p: Point, a: Point, b: Point): number {
  const meanLat = ((a.lat + b.lat + p.lat) / 3) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(meanLat);
  const ky = 110.57;
  const ax = a.lng * kx;
  const ay = a.lat * ky;
  const bx = b.lng * kx;
  const by = b.lat * ky;
  const px = p.lng * kx;
  const py = p.lat * ky;
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function RoutePreviewPlanner({ waypoints, accommodations, restaurants }: Props) {
  const [setupDone, setSetupDone] = useState(false);
  const [totalBudget, setTotalBudget] = useState(15000);
  const [totalDays, setTotalDays] = useState(Math.max(2, waypoints.length));
  const [foodPrefs, setFoodPrefs] = useState<FoodPref[]>(["convenience-store", "restaurant"]);
  const [accPrefs, setAccPrefs] = useState<AccPref[]>(["hotel", "hostel"]);
  const [startFromFirst, setStartFromFirst] = useState(true);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const [selectedHotelBySegment, setSelectedHotelBySegment] = useState<Record<number, string>>({});
  const [selectedFoodsBySegment, setSelectedFoodsBySegment] = useState<Record<number, string[]>>({});
  const [dynamicFoodBySegment, setDynamicFoodBySegment] = useState<Record<number, Spot[]>>({});
  const [loadingFood, setLoadingFood] = useState(false);

  const orderedWaypoints = useMemo(
    () => (startFromFirst ? waypoints : [...waypoints].reverse()),
    [waypoints, startFromFirst]
  );

  const segments = useMemo<Segment[]>(
    () =>
      orderedWaypoints.slice(0, -1).map((from, idx) => ({
        idx,
        from,
        to: orderedWaypoints[idx + 1],
      })),
    [orderedWaypoints]
  );

  const safeActiveSegmentIdx = Math.min(activeSegmentIdx, Math.max(segments.length - 1, 0));
  const activeSegment = segments[safeActiveSegmentIdx];

  const activeHotelId = selectedHotelBySegment[safeActiveSegmentIdx];
  const activeFoodIds = selectedFoodsBySegment[safeActiveSegmentIdx] || [];

  const segmentHotels = useMemo(() => {
    if (!activeSegment) return [];
    return accommodations.filter(
      (a) => a.waypoint_id === activeSegment.to.id && accPrefs.includes(a.subType)
    );
  }, [accommodations, activeSegment, accPrefs]);

  const dbSegmentFoods = useMemo(() => {
    if (!activeSegment) return [];
    const candidates = restaurants.filter((r) => {
      if (!foodPrefs.includes(r.diet_type)) return false;
      return r.waypoint_id === activeSegment.from.id || r.waypoint_id === activeSegment.to.id;
    });
    return candidates.filter((r) => {
      const d = pointToSegmentDistanceKm(
        { lat: r.lat, lng: r.lng },
        { lat: activeSegment.from.lat, lng: activeSegment.from.lng },
        { lat: activeSegment.to.lat, lng: activeSegment.to.lng }
      );
      return d <= 18;
    });
  }, [restaurants, activeSegment, foodPrefs]);

  useEffect(() => {
    if (!setupDone || !activeSegment || !activeHotelId) return;
    if (dynamicFoodBySegment[safeActiveSegmentIdx]?.length) return;
    let cancelled = false;

    const fetchDynamicFoods = async () => {
      setLoadingFood(true);
      try {
        const sampleTs = [0.2, 0.4, 0.6, 0.8];
        const foodSpots: Spot[] = [];

        for (const t of sampleTs) {
          const lat = lerp(activeSegment.from.lat, activeSegment.to.lat, t);
          const lng = lerp(activeSegment.from.lng, activeSegment.to.lng, t);
          const res = await fetch(`/api/osm?lat=${lat}&lng=${lng}&radius=6000&type=food`);
          if (!res.ok) continue;
          const data = (await res.json()) as { elements?: Array<Record<string, unknown>> };
          const elements = Array.isArray(data.elements) ? data.elements : [];
          for (const el of elements) {
            const tags = (el.tags || {}) as Record<string, string | undefined>;
            const latNum = Number(el.lat ?? (el.center as { lat?: number } | undefined)?.lat);
            const lngNum = Number(el.lon ?? (el.center as { lon?: number } | undefined)?.lon);
            if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) continue;
            if (!tags.name) continue;

            let subType: Spot["subType"] | null = null;
            let price = 250;
            if (tags.shop === "convenience") {
              if (!foodPrefs.includes("convenience-store")) continue;
              subType = "convenience-store";
              price = 180;
            } else if (
              tags.amenity === "restaurant" ||
              tags.amenity === "fast_food" ||
              tags.amenity === "cafe"
            ) {
              if (!foodPrefs.includes("restaurant")) continue;
              subType = "restaurant";
              price = tags.amenity === "fast_food" ? 150 : tags.amenity === "cafe" ? 200 : 300;
            }
            if (!subType) continue;

            const distKm = pointToSegmentDistanceKm(
              { lat: latNum, lng: lngNum },
              { lat: activeSegment.from.lat, lng: activeSegment.from.lng },
              { lat: activeSegment.to.lat, lng: activeSegment.to.lng }
            );
            if (distKm > 12) continue;

            foodSpots.push({
              id: `osm-${String(el.id)}`,
              name: tags.name,
              type: "food",
              subType,
              county: tags["addr:city"] || tags["addr:county"] || "",
              price,
              lat: latNum,
              lng: lngNum,
              tags: ["route"],
              address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
            });
          }
        }

        const dedup = Array.from(
          new Map(foodSpots.map((s) => [`${s.name}-${s.lat.toFixed(4)}-${s.lng.toFixed(4)}`, s])).values()
        ).slice(0, 60);

        if (!cancelled) {
          setDynamicFoodBySegment((prev) => ({ ...prev, [safeActiveSegmentIdx]: dedup }));
        }
      } finally {
        if (!cancelled) setLoadingFood(false);
      }
    };

    fetchDynamicFoods();
    return () => {
      cancelled = true;
    };
  }, [
    setupDone,
    activeSegment,
    activeHotelId,
    safeActiveSegmentIdx,
    dynamicFoodBySegment,
    foodPrefs,
  ]);

  const segmentFoods = useMemo(() => {
    const dyn = dynamicFoodBySegment[safeActiveSegmentIdx] || [];
    const base = [...dbSegmentFoods, ...dyn];
    return Array.from(new Map(base.map((s) => [s.id, s])).values());
  }, [dbSegmentFoods, dynamicFoodBySegment, safeActiveSegmentIdx]);

  const mapSpots = useMemo(() => {
    if (!activeSegment) return [];
    if (!activeHotelId) {
      // 還沒選旅館 -> 只顯示終點附近可住點，逼流程先選住宿。
      return segmentHotels.map(toSpot);
    }
    // 已選旅館 -> 只顯示選中旅館 + 可選補給點
    const hotel = segmentHotels.find((h) => h.id === activeHotelId);
    const out: Spot[] = [];
    if (hotel) out.push(toSpot(hotel));
    out.push(...segmentFoods.map(toFoodSpot));
    return out;
  }, [activeSegment, activeHotelId, segmentHotels, segmentFoods]);

  const routePath = useMemo<Point[]>(
    () => orderedWaypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
    [orderedWaypoints]
  );

  const handleSelectAccommodation = (id: string) => {
    setSelectedHotelBySegment((prev) => ({ ...prev, [safeActiveSegmentIdx]: id }));
  };

  const handleRemoveAccommodation = (idx: number) => {
    setSelectedHotelBySegment((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    // 住宿重選時，清空該段已選餐飲，避免路段邏輯不一致
    setSelectedFoodsBySegment((prev) => {
      const next = { ...prev };
      next[idx] = [];
      return next;
    });
  };

  const handleToggleFood = (id: string) => {
    setSelectedFoodsBySegment((prev) => {
      const curr = prev[safeActiveSegmentIdx] || [];
      const next = curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id];
      return { ...prev, [safeActiveSegmentIdx]: next };
    });
  };

  const selectedHotelObjects = useMemo(
    () => {
      return segments
        .map((s) => accommodations.find((a) => a.id === selectedHotelBySegment[s.idx]))
        .filter((x): x is Accommodation => Boolean(x));
    },
    [segments, accommodations, selectedHotelBySegment]
  );

  const selectedFoodObjects = useMemo(
    () => {
      return segments.flatMap((s) => {
        const ids = selectedFoodsBySegment[s.idx] || [];
        return ids
          .map((id) => restaurants.find((r) => r.id === id))
          .filter((x): x is Restaurant => Boolean(x));
      });
    },
    [segments, restaurants, selectedFoodsBySegment]
  );

  const googleRouteLink = useMemo(() => {
    if (orderedWaypoints.length < 2) return "#";
    const routePoints: string[] = [];
    routePoints.push(`${orderedWaypoints[0].lat},${orderedWaypoints[0].lng}`);

    segments.forEach((seg) => {
      const foodIds = selectedFoodsBySegment[seg.idx] || [];
      foodIds.forEach((fid) => {
        const food = restaurants.find((r) => r.id === fid);
        if (food) routePoints.push(`${food.lat},${food.lng}`);
      });

      const hotelId = selectedHotelBySegment[seg.idx];
      const hotel = accommodations.find((a) => a.id === hotelId);
      if (hotel) routePoints.push(`${hotel.lat},${hotel.lng}`);
      else routePoints.push(`${seg.to.lat},${seg.to.lng}`);
    });

    const unique = routePoints.filter((p, i) => i === 0 || p !== routePoints[i - 1]);
    if (unique.length < 2) return "#";
    const origin = encodeURIComponent(unique[0]);
    const destination = encodeURIComponent(unique[unique.length - 1]);
    const waypointStr =
      unique.length > 2
        ? "&waypoints=" + unique.slice(1, -1).map((p) => encodeURIComponent(p)).join("|")
        : "";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointStr}&travelmode=bicycling`;
  }, [orderedWaypoints, segments, accommodations, restaurants, selectedFoodsBySegment, selectedHotelBySegment]);

  const activeHotelObject = segmentHotels.find((h) => h.id === activeHotelId);
  const estimatedSpent = useMemo(() => {
    const hotelSum = selectedHotelObjects.reduce((s, h) => s + h.price_per_night, 0);
    const foodSum = selectedFoodObjects.reduce((s, f) => s + f.estimated_cost, 0);
    return hotelSum + foodSum;
  }, [selectedHotelObjects, selectedFoodObjects]);
  const remaining = totalBudget - estimatedSpent;

  if (!setupDone) {
    return (
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <h3 className="text-lg font-bold">先設定條件，再開始選店家</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm space-y-1">
            <span className="font-medium">預算（總額）</span>
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium">預計天數</span>
            <input
              type="number"
              min={2}
              max={14}
              className="w-full rounded-lg border px-3 py-2"
              value={totalDays}
              onChange={(e) => setTotalDays(Number(e.target.value) || 2)}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="font-medium text-sm">飲食設定</div>
            <div className="flex gap-2">
              {(["convenience-store", "restaurant"] as FoodPref[]).map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    setFoodPrefs((prev) =>
                      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
                    )
                  }
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    foodPrefs.includes(f) ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                >
                  {f === "convenience-store" ? "便利商店" : "餐廳"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-sm">住宿設定</div>
            <div className="flex gap-2">
              {(["hotel", "hostel"] as AccPref[]).map((a) => (
                <button
                  key={a}
                  onClick={() =>
                    setAccPrefs((prev) =>
                      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                    )
                  }
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    accPrefs.includes(a) ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                >
                  {a === "hotel" ? "飯店" : "青旅/民宿"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <button
            onClick={() => setStartFromFirst(true)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              startFromFirst ? "border-blue-500 bg-blue-50" : "border-slate-200"
            }`}
          >
            {waypoints[0]?.name} 出發
          </button>
          <button
            onClick={() => setStartFromFirst(false)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              !startFromFirst ? "border-blue-500 bg-blue-50" : "border-slate-200"
            }`}
          >
            {waypoints[waypoints.length - 1]?.name} 出發
          </button>
        </div>

        <button
          onClick={() => setSetupDone(true)}
          className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
        >
          開始規劃路線
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <div className="rounded-xl border bg-white p-3 space-y-2">
          <div className="text-sm font-bold text-slate-800">出發方向</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setStartFromFirst(true);
                setActiveSegmentIdx(0);
              }}
              className={`rounded-lg border px-2 py-2 text-xs ${
                startFromFirst ? "border-blue-500 bg-blue-50" : "border-slate-200"
              }`}
            >
              {waypoints[0]?.name} 起
            </button>
            <button
              onClick={() => {
                setStartFromFirst(false);
                setActiveSegmentIdx(0);
              }}
              className={`rounded-lg border px-2 py-2 text-xs ${
                !startFromFirst ? "border-blue-500 bg-blue-50" : "border-slate-200"
              }`}
            >
              {waypoints[waypoints.length - 1]?.name} 起
            </button>
          </div>

          <div className="pt-2 text-sm font-bold text-slate-800">規劃路段</div>
          {segments.map((s) => (
            <button
              key={`${s.from.id}-${s.to.id}`}
              onClick={() => setActiveSegmentIdx(s.idx)}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                safeActiveSegmentIdx === s.idx ? "border-blue-500 bg-blue-50" : "border-slate-200"
              }`}
            >
              {s.from.name} → {s.to.name}
              {selectedHotelBySegment[s.idx] ? <span className="ml-2 text-green-600">已選住宿</span> : null}
            </button>
          ))}

          <div className="pt-2 text-xs text-slate-600 space-y-1">
            <div>
              預算：${totalBudget.toLocaleString()} / 已選：${estimatedSpent.toLocaleString()} /{" "}
              <span className={remaining < 0 ? "text-red-600 font-bold" : ""}>
                剩餘：${remaining.toLocaleString()}
              </span>
            </div>
            <div>天數設定：{totalDays} 天</div>
            <div>已選住宿：{selectedHotelObjects.length}</div>
            <div>已選餐飲：{selectedFoodObjects.length}</div>
          </div>
          <a
            href={googleRouteLink}
            target="_blank"
            rel="noreferrer"
            className="block text-center rounded-lg bg-slate-900 text-white py-2 text-sm font-semibold"
          >
            在 Google 看完整行程
          </a>
        </div>

        <div className="space-y-3">
          {activeSegment && (
            <div className="rounded-xl border bg-white p-3 text-sm">
              <div className="font-semibold">
                目前路段：{activeSegment.from.name} → {activeSegment.to.name}
              </div>
              {!activeHotelId ? (
                <div className="text-red-600 mt-1">Step 1：先選住宿（選完才會出現餐廳/便利商店）</div>
              ) : (
                <div className="text-green-700 mt-1">
                  Step 2：已選住宿「{activeHotelObject?.name}」，現在可選路段補給
                </div>
              )}
              {loadingFood && activeHotelId ? (
                <div className="text-blue-600 mt-1">正在抓取該路段的餐廳/便利商店...</div>
              ) : null}
            </div>
          )}
          <MapPickerWrapper
            targetCoord={
              activeSegment
                ? { lat: activeSegment.to.lat, lng: activeSegment.to.lng }
                : { lat: waypoints[0].lat, lng: waypoints[0].lng }
            }
            routePath={routePath}
            spots={mapSpots}
            activeAccommodationId={activeHotelId}
            activeFoodIds={activeFoodIds}
            onSelectAccommodation={handleSelectAccommodation}
            onToggleFood={handleToggleFood}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-3">
          <h3 className="font-semibold mb-2">已選住宿</h3>
          {selectedHotelObjects.length === 0 ? (
            <p className="text-sm text-slate-500">尚未選擇</p>
          ) : (
            selectedHotelObjects.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 py-1">
                <a href={placeLink(h.name, h.lat, h.lng, h.place_id)} target="_blank" rel="noreferrer" className="text-sm hover:underline">
                  {h.name}（{h.waypoint_id} / ${h.price_per_night}）
                </a>
                <button
                  onClick={() => {
                    const idx = segments.find((s) => selectedHotelBySegment[s.idx] === h.id)?.idx;
                    if (idx !== undefined) handleRemoveAccommodation(idx);
                  }}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
                >
                  刪除
                </button>
              </div>
            ))
          )}
        </div>
        <div className="rounded-xl border bg-white p-3">
          <h3 className="font-semibold mb-2">已選餐飲/便利商店</h3>
          {selectedFoodObjects.length === 0 ? (
            <p className="text-sm text-slate-500">尚未選擇</p>
          ) : (
            selectedFoodObjects.map((f) => {
              const segIdx = segments.find((s) => (selectedFoodsBySegment[s.idx] || []).includes(f.id))?.idx;
              return (
                <div key={f.id} className="flex items-center justify-between gap-2 py-1">
                  <a href={placeLink(f.name, f.lat, f.lng, f.place_id)} target="_blank" rel="noreferrer" className="text-sm hover:underline">
                    {f.name}（{f.diet_type} / ${f.estimated_cost}）
                  </a>
                  <button
                    onClick={() => {
                      if (segIdx === undefined) return;
                      setSelectedFoodsBySegment((prev) => ({
                        ...prev,
                        [segIdx]: (prev[segIdx] || []).filter((id) => id !== f.id),
                      }));
                    }}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
                  >
                    刪除
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

