"use client";

import { useEffect, useMemo, useState } from "react";

type BudgetLevel = "低" | "中" | "高";
type AccommodationType = "民宿" | "飯店" | "背包客棧";
type FoodOption = "素食" | "便利商店" | "平價餐廳" | "奢華餐廳";

type PlaceOption = {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  estimatedCost: number;
};

type SegmentSelections = {
  restaurants: PlaceOption[];
  convenienceStores: PlaceOption[];
};

type SegmentFoodCache = {
  vegetarian: PlaceOption[];
  budget: PlaceOption[];
  luxury: PlaceOption[];
  convenienceStores: PlaceOption[];
};

const STORAGE_KEY = "taiwan-loop-trip-planner-v1";

const STATIONS = ["台北車站", "台中車站", "高雄車站", "花蓮車站", "台東車站"];

const EQUIPMENT_ITEMS = [
  "安全帽",
  "前後車燈",
  "補胎工具",
  "打氣筒",
  "行動電源",
  "雨衣",
  "急救包",
  "替換車衣",
];

function segmentKey(from: string, to: string) {
  return `${from}->${to}`;
}

function buildDirectionsUrl(hotels: PlaceOption[]) {
  if (hotels.length < 2) return "#";
  const points = hotels.map((h) => (h.address?.trim() ? h.address.trim() : `${h.lat},${h.lng}`));
  const origin = encodeURIComponent(points[0]);
  const destination = encodeURIComponent(points[points.length - 1]);
  const waypoints =
    points.length > 2
      ? "&waypoints=" + points.slice(1, -1).map((p) => encodeURIComponent(p)).join("|")
      : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=bicycling`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function TaiwanTripPlanner() {
  const [step, setStep] = useState(1);

  // Step 1
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("中");
  const [budgetAmount, setBudgetAmount] = useState(20000);
  const [days, setDays] = useState(7);
  const [startStation, setStartStation] = useState("台北車站");

  // Step 2
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>(["便利商店", "平價餐廳"]);
  const [accommodationType, setAccommodationType] = useState<AccommodationType>("飯店");

  // Step 3
  const [cities, setCities] = useState<string[]>([]);
  const [isPlanningCities, setIsPlanningCities] = useState(false);

  // Step 4 cache + selection
  const [hotelCache, setHotelCache] = useState<Record<string, PlaceOption[]>>({});
  const [selectedHotelByCity, setSelectedHotelByCity] = useState<Record<string, PlaceOption | null>>({});
  const [loadingHotels, setLoadingHotels] = useState<Record<string, boolean>>({});

  // Step 5 cache + selection
  const [segmentFoodCache, setSegmentFoodCache] = useState<Record<string, SegmentFoodCache>>({});
  const [selectedFoodsBySegment, setSelectedFoodsBySegment] = useState<Record<string, SegmentSelections>>({});
  const [loadingSegmentFoods, setLoadingSegmentFoods] = useState<Record<string, boolean>>({});

  // Equipment
  const [equipmentChecked, setEquipmentChecked] = useState<Record<string, boolean>>({});

  const steps = [
    "預算/天數",
    "偏好設定",
    "AI 規劃城市",
    "選每城住宿",
    "選路段餐飲",
    "完成行程",
  ];

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setStep((parsed.step as number) || 1);
      setBudgetLevel((parsed.budgetLevel as BudgetLevel) || "中");
      setBudgetAmount((parsed.budgetAmount as number) || 20000);
      setDays((parsed.days as number) || 7);
      setStartStation((parsed.startStation as string) || "台北車站");
      setFoodOptions((parsed.foodOptions as FoodOption[]) || ["便利商店", "平價餐廳"]);
      setAccommodationType((parsed.accommodationType as AccommodationType) || "飯店");
      setCities((parsed.cities as string[]) || []);
      setHotelCache((parsed.hotelCache as Record<string, PlaceOption[]>) || {});
      setSelectedHotelByCity((parsed.selectedHotelByCity as Record<string, PlaceOption | null>) || {});
      setSegmentFoodCache((parsed.segmentFoodCache as Record<string, SegmentFoodCache>) || {});
      setSelectedFoodsBySegment(
        (parsed.selectedFoodsBySegment as Record<string, SegmentSelections>) || {}
      );
      setEquipmentChecked((parsed.equipmentChecked as Record<string, boolean>) || {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step,
        budgetLevel,
        budgetAmount,
        days,
        startStation,
        foodOptions,
        accommodationType,
        cities,
        hotelCache,
        selectedHotelByCity,
        segmentFoodCache,
        selectedFoodsBySegment,
        equipmentChecked,
      })
    );
  }, [
    step,
    budgetLevel,
    budgetAmount,
    days,
    startStation,
    foodOptions,
    accommodationType,
    cities,
    hotelCache,
    selectedHotelByCity,
    segmentFoodCache,
    selectedFoodsBySegment,
    equipmentChecked,
  ]);

  const segments = useMemo(() => {
    return cities.slice(0, -1).map((from, i) => ({ from, to: cities[i + 1], key: segmentKey(from, cities[i + 1]) }));
  }, [cities]);

  const selectedHotelsOrdered = useMemo(() => {
    return cities
      .map((city) => selectedHotelByCity[city])
      .filter((h): h is PlaceOption => Boolean(h));
  }, [cities, selectedHotelByCity]);

  const directionsUrl = useMemo(() => buildDirectionsUrl(selectedHotelsOrdered), [selectedHotelsOrdered]);

  const estimatedTotalCost = useMemo(() => {
    const hotelCost = selectedHotelsOrdered.reduce((s, h) => s + (h.estimatedCost || 0), 0);
    const foodCost = Object.values(selectedFoodsBySegment).reduce((sum, seg) => {
      return (
        sum +
        seg.restaurants.reduce((v, r) => v + (r.estimatedCost || 0), 0) +
        seg.convenienceStores.reduce((v, c) => v + (c.estimatedCost || 0), 0)
      );
    }, 0);
    return hotelCost + foodCost;
  }, [selectedHotelsOrdered, selectedFoodsBySegment]);

  async function handleGenerateCities() {
    setIsPlanningCities(true);
    try {
      const resp = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, startStation }),
      });
      const data = (await resp.json()) as { cities?: string[]; error?: string };
      if (!resp.ok || !data.cities) {
        throw new Error(data.error || "城市規劃失敗");
      }
      setCities(data.cities);
      setStep(4);
    } catch (error) {
      alert(`Gemini 規劃失敗：${String(error)}`);
    } finally {
      setIsPlanningCities(false);
    }
  }

  async function fetchHotelsForCity(city: string) {
    if (hotelCache[city]) return;
    setLoadingHotels((p) => ({ ...p, [city]: true }));
    try {
      const resp = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          category: "hotel",
          accommodationType,
          limit: 8,
        }),
      });
      const data = (await resp.json()) as { places?: PlaceOption[]; error?: string };
      if (!resp.ok || !data.places) throw new Error(data.error || "住宿搜尋失敗");
      setHotelCache((prev) => ({ ...prev, [city]: data.places || [] }));
    } catch (error) {
      alert(`${city} 住宿載入失敗：${String(error)}`);
    } finally {
      setLoadingHotels((p) => ({ ...p, [city]: false }));
    }
  }

  async function fetchFoodsForSegment(from: string, to: string) {
    const key = segmentKey(from, to);
    if (segmentFoodCache[key]) return;
    const fromHotel = selectedHotelByCity[from];
    const toHotel = selectedHotelByCity[to];
    if (!fromHotel || !toHotel) {
      alert("請先選好這兩站的旅館，才能抓路線附近餐飲");
      return;
    }
    setLoadingSegmentFoods((p) => ({ ...p, [key]: true }));
    try {
      const points = [0.25, 0.5, 0.75].map((t) => ({
        lat: lerp(fromHotel.lat, toHotel.lat, t),
        lng: lerp(fromHotel.lng, toHotel.lng, t),
      }));

      async function fetchCategory(category: "restaurant-vegetarian" | "restaurant-budget" | "restaurant-luxury" | "convenience") {
        const all: PlaceOption[] = [];
        for (const p of points) {
          const resp = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: to,
              category,
              limit: 8,
              lat: p.lat,
              lng: p.lng,
              radius: 7000,
            }),
          });
          const data = (await resp.json()) as { places?: PlaceOption[]; error?: string };
          if (!resp.ok) throw new Error(data.error || `${category} 搜尋失敗`);
          all.push(...(data.places || []));
        }
        return Array.from(new Map(all.map((x) => [x.id, x])).values()).slice(0, 8);
      }

      const [vegetarian, budget, luxury, convenienceStores] = await Promise.all([
        foodOptions.includes("素食") ? fetchCategory("restaurant-vegetarian") : Promise.resolve([]),
        foodOptions.includes("平價餐廳") ? fetchCategory("restaurant-budget") : Promise.resolve([]),
        foodOptions.includes("奢華餐廳") ? fetchCategory("restaurant-luxury") : Promise.resolve([]),
        foodOptions.includes("便利商店") ? fetchCategory("convenience") : Promise.resolve([]),
      ]);

      setSegmentFoodCache((prev) => ({
        ...prev,
        [key]: {
          vegetarian,
          budget,
          luxury,
          convenienceStores,
        },
      }));
      setSelectedFoodsBySegment((prev) => ({
        ...prev,
        [key]: prev[key] || { restaurants: [], convenienceStores: [] },
      }));
    } catch (error) {
      alert(`${from}→${to} 餐飲載入失敗：${String(error)}`);
    } finally {
      setLoadingSegmentFoods((p) => ({ ...p, [key]: false }));
    }
  }

  function toggleSegmentSelection(segKey: string, type: "restaurants" | "convenienceStores", place: PlaceOption) {
    setSelectedFoodsBySegment((prev) => {
      const existing = prev[segKey] || { restaurants: [], convenienceStores: [] };
      const currentList = existing[type];
      const found = currentList.some((x) => x.id === place.id);
      const nextList = found ? currentList.filter((x) => x.id !== place.id) : [...currentList, place];
      return { ...prev, [segKey]: { ...existing, [type]: nextList } };
    });
  }

  function removeSelection(segKey: string, type: "restaurants" | "convenienceStores", placeId: string) {
    setSelectedFoodsBySegment((prev) => {
      const existing = prev[segKey] || { restaurants: [], convenienceStores: [] };
      return {
        ...prev,
        [segKey]: {
          ...existing,
          [type]: existing[type].filter((x) => x.id !== placeId),
        },
      };
    });
  }

  function exportVisualTable() {
    const rows = cities.map((city, i) => {
      const hotel = selectedHotelByCity[city];
      const next = cities[i + 1];
      const seg = next ? selectedFoodsBySegment[segmentKey(city, next)] : undefined;
      const restaurants = seg?.restaurants.map((r) => `${r.name}｜${r.address}`).join("<br>") || "-";
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${city}</td>
          <td>${hotel?.name || "-"}</td>
          <td>${hotel?.address || "-"}</td>
          <td>${hotel?.phone || "-"}</td>
          <td>${restaurants}</td>
          <td>${next ? next : "-"}</td>
        </tr>
      `;
    });

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>台灣環島行程規劃表</title>
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; padding: 24px; background: #f8fafc; }
    h1 { margin: 0 0 8px; }
    .meta { margin-bottom: 16px; color: #334155; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; vertical-align: top; font-size: 14px; }
    th { background: #0f172a; color: white; text-align: left; }
  </style>
</head>
<body>
  <h1>台灣環島行程規劃表</h1>
  <div class="meta">預算：${budgetAmount}｜天數：${days}｜飲食：${foodOptions.join("、") || "未設定"}｜住宿：${accommodationType}</div>
  <table>
    <thead>
      <tr>
        <th>日期</th>
        <th>城市</th>
        <th>旅館名稱</th>
        <th>旅館地址</th>
        <th>旅館電話</th>
        <th>餐廳名稱 / 地址</th>
        <th>下一站</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("\n")}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taiwan-trip-plan.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  const allHotelsSelected = cities.length > 0 && cities.every((city) => Boolean(selectedHotelByCity[city]));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {steps.map((s, i) => {
            const idx = i + 1;
            return (
              <span
                key={s}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  step === idx ? "bg-blue-600 text-white" : step > idx ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {idx}. {s}
              </span>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-xl font-bold">步驟1：預算與天數</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">預算等級</label>
              <div className="flex gap-2">
                {(["低", "中", "高"] as BudgetLevel[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudgetLevel(b)}
                    className={`px-3 py-2 rounded-lg border ${budgetLevel === b ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-medium">
              自訂金額
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              天數（3-14）
              <input
                type="number"
                min={3}
                max={14}
                value={days}
                onChange={(e) => setDays(Math.max(3, Math.min(14, Number(e.target.value) || 3)))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              出發車站
              <select
                value={startStation}
                onChange={(e) => setStartStation(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="rounded-lg bg-slate-900 text-white px-4 py-2">
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-xl font-bold">步驟2：飲食與住宿偏好</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">飲食偏好（可複選）</p>
              <div className="flex flex-wrap gap-2">
                {(["素食", "便利商店", "平價餐廳", "奢華餐廳"] as FoodOption[]).map((opt) => {
                  const selected = foodOptions.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        setFoodOptions((prev) =>
                          selected ? prev.filter((x) => x !== opt) : [...prev, opt]
                        )
                      }
                      className={`px-3 py-2 rounded-lg border ${selected ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">住宿類型</p>
              <div className="flex gap-2">
                {(["民宿", "飯店", "背包客棧"] as AccommodationType[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAccommodationType(a)}
                    className={`px-3 py-2 rounded-lg border ${accommodationType === a ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-lg border px-4 py-2">
              上一步
            </button>
            <button onClick={() => setStep(3)} className="rounded-lg bg-slate-900 text-white px-4 py-2">
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-xl font-bold">步驟3：AI 規劃環島停靠城市</h2>
          <p className="text-sm text-slate-600">
            只呼叫 Gemini 產生城市順序，不含 Places 資料（節省 API 費用）。
          </p>
          {cities.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              目前規劃：{cities.join(" → ")}
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="rounded-lg border px-4 py-2">
              上一步
            </button>
            <button
              onClick={handleGenerateCities}
              disabled={isPlanningCities}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 disabled:opacity-50"
            >
              {isPlanningCities ? "規劃中..." : "產生城市清單"}
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-xl font-bold">步驟4：每個停靠城市選旅館（5-8 間）</h2>
          {cities.map((city) => (
            <div key={city} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{city}</p>
                <button
                  onClick={() => fetchHotelsForCity(city)}
                  className="text-sm rounded-lg border px-3 py-1"
                >
                  {hotelCache[city] ? "已載入（快取）" : loadingHotels[city] ? "載入中..." : "載入旅館"}
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {(hotelCache[city] || []).map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => setSelectedHotelByCity((p) => ({ ...p, [city]: hotel }))}
                    className={`text-left rounded-lg border p-2 ${
                      selectedHotelByCity[city]?.id === hotel.id ? "border-blue-500 bg-blue-50" : "border-slate-200"
                    }`}
                  >
                    <div className="font-medium text-sm">{hotel.name}</div>
                    <div className="text-xs text-slate-600">{hotel.address}</div>
                    <div className="text-xs text-slate-500 mt-1">預估每晚：${hotel.estimatedCost}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="rounded-lg border px-4 py-2">
              上一步
            </button>
            <button
              onClick={() => setStep(5)}
              disabled={!allHotelsSelected}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-xl font-bold">步驟5：每段路線選餐廳與便利商店（可多選/可移除）</h2>
          {segments.map((seg) => {
            const cache = segmentFoodCache[seg.key];
            const selected = selectedFoodsBySegment[seg.key] || { restaurants: [], convenienceStores: [] };
            return (
              <div key={seg.key} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{seg.from} → {seg.to}</p>
                  <button
                    onClick={() => fetchFoodsForSegment(seg.from, seg.to)}
                    className="text-sm rounded-lg border px-3 py-1"
                  >
                    {cache ? "已載入（快取）" : loadingSegmentFoods[seg.key] ? "載入中..." : "載入餐飲"}
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium mb-1">餐廳（路段附近，最多 8 間/類）</p>
                    <div className="space-y-1">
                      {(cache?.vegetarian || []).map((r) => (
                        <button key={`veg-${r.id}`} onClick={() => toggleSegmentSelection(seg.key, "restaurants", r)} className={`w-full text-left rounded border p-2 text-sm ${selected.restaurants.some((x) => x.id === r.id) ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                          🥬 {r.name}（${r.estimatedCost}）
                        </button>
                      ))}
                      {(cache?.budget || []).map((r) => (
                        <button key={`bud-${r.id}`} onClick={() => toggleSegmentSelection(seg.key, "restaurants", r)} className={`w-full text-left rounded border p-2 text-sm ${selected.restaurants.some((x) => x.id === r.id) ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                          💸 {r.name}（${r.estimatedCost}）
                        </button>
                      ))}
                      {(cache?.luxury || []).map((r) => (
                        <button key={`lux-${r.id}`} onClick={() => toggleSegmentSelection(seg.key, "restaurants", r)} className={`w-full text-left rounded border p-2 text-sm ${selected.restaurants.some((x) => x.id === r.id) ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                          ✨ {r.name}（${r.estimatedCost}）
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">便利商店（最多 8 間候選）</p>
                    <div className="space-y-1">
                      {(cache?.convenienceStores || []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => toggleSegmentSelection(seg.key, "convenienceStores", c)}
                          className={`w-full text-left rounded border p-2 text-sm ${
                            selected.convenienceStores.some((x) => x.id === c.id) ? "border-blue-500 bg-blue-50" : "border-slate-200"
                          }`}
                        >
                          {c.name}（${c.estimatedCost}）
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(selected.restaurants.length > 0 || selected.convenienceStores.length > 0) && (
                  <div className="rounded bg-slate-50 p-2 text-xs">
                    <p className="font-semibold mb-1">已選（可移除）</p>
                    <div className="space-y-1">
                      {selected.restaurants.map((r) => (
                        <div key={r.id} className="flex items-center justify-between">
                          <span>餐廳｜{r.name}（${r.estimatedCost}）</span>
                          <button
                            onClick={() => removeSelection(seg.key, "restaurants", r.id)}
                            className="text-red-600"
                          >
                            移除
                          </button>
                        </div>
                      ))}
                      {selected.convenienceStores.map((c) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span>便利商店｜{c.name}（${c.estimatedCost}）</span>
                          <button
                            onClick={() => removeSelection(seg.key, "convenienceStores", c.id)}
                            className="text-red-600"
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="rounded-lg border px-4 py-2">
              上一步
            </button>
            <button onClick={() => setStep(6)} className="rounded-lg bg-slate-900 text-white px-4 py-2">
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-xl font-bold">步驟6：完整行程總覽（可視化表格）</h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">總預算：${budgetAmount.toLocaleString()}</div>
            <div className="rounded-lg bg-slate-50 p-3">預估花費：${estimatedTotalCost.toLocaleString()}</div>
            <div className="rounded-lg bg-slate-50 p-3">剩餘：${(budgetAmount - estimatedTotalCost).toLocaleString()}</div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">日期</th>
                  <th className="px-3 py-2 text-left">城市</th>
                  <th className="px-3 py-2 text-left">旅館名稱</th>
                  <th className="px-3 py-2 text-left">旅館地址</th>
                  <th className="px-3 py-2 text-left">旅館電話</th>
                  <th className="px-3 py-2 text-left">餐廳名稱 / 地址</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city, i) => {
                  const hotel = selectedHotelByCity[city];
                  const nextCity = cities[i + 1];
                  const seg = nextCity ? selectedFoodsBySegment[segmentKey(city, nextCity)] : undefined;
                  return (
                    <tr key={`${city}-${i}`} className="border-t">
                      <td className="px-3 py-2">Day {i + 1}</td>
                      <td className="px-3 py-2">{city}</td>
                      <td className="px-3 py-2">{hotel?.name || "-"}</td>
                      <td className="px-3 py-2">{hotel?.address || "-"}</td>
                      <td className="px-3 py-2">{hotel?.phone || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {(seg?.restaurants || []).map((r) => (
                            <div key={r.id}>🍽️ {r.name}｜{r.address}</div>
                          ))}
                          {(seg?.convenienceStores || []).map((c) => (
                            <div key={c.id}>🏪 {c.name}｜{c.address}</div>
                          ))}
                          {!seg || ((seg.restaurants.length === 0) && (seg.convenienceStores.length === 0)) ? "-" : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <h3 className="font-semibold mb-2">裝備清單（可勾選）</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {EQUIPMENT_ITEMS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(equipmentChecked[item])}
                    onChange={(e) =>
                      setEquipmentChecked((prev) => ({ ...prev, [item]: e.target.checked }))
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm"
            >
              在 Google Maps 開啟完整路線
            </a>
            <button onClick={exportVisualTable} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm">
              下載可視化行程表（HTML）
            </button>
            <button onClick={() => setStep(5)} className="rounded-lg border px-4 py-2 text-sm">
              回上一步調整
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

