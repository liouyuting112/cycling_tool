"use client";

import { WizardData } from "@/types/wizard";
import { ROUTES, SPOT_DB, Spot, Point, STATION_COORDS, haversineKm, getNearestPointIndex } from "@/utils/db";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BedDouble, Utensils, CheckCircle2, Wallet, MapPin, ArrowRight, Map as MapIcon, Loader2, Wrench, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { fetchOSMSpotsWithFallback } from "@/utils/osm";
import MapPickerWrapper from "@/components/MapPickerWrapper";

interface Props { data: WizardData; updateData: (d: Partial<WizardData>) => void; }

export function Step3Interactive({ data, updateData }: Props) {
  const [activeDay, setActiveDay] = useState(1);
  const [daySpots, setDaySpots] = useState<Record<number, Spot[]>>({});
  const [isFetching, setIsFetching] = useState(false);

  const ALL_SPOTS = useMemo(() => [...SPOT_DB, ...(data.customSpots || [])], [data.customSpots]);
  const route = useMemo(() => ROUTES.find(r => r.id === data.routeId) || ROUTES[0], [data.routeId]);

  // 起點站座標 → 路線上最近的索引
  const startCoord = useMemo(() => STATION_COORDS[data.departureLocation] || STATION_COORDS["基隆車站"], [data.departureLocation]);
  const startIdx = useMemo(() => getNearestPointIndex(route.path, startCoord), [route.path, startCoord]);

  const dailyKm = useMemo(() => route.totalDistance / data.totalDays, [route, data.totalDays]);

  // 計算騎乘時間（小時）
  const dailyHours = useMemo(() => dailyKm / data.speedLevel, [dailyKm, data.speedLevel]);

  // 住宿/美食的「停靠點周圍」限制（避免點位散到太遠）
  const MAX_HOTEL_KM_PRIMARY = 15;
  const MAX_HOTEL_KM_FALLBACK = 25;
  const MAX_FOOD_KM_PRIMARY = 8;
  const MAX_FOOD_KM_FALLBACK = 12;

  // 最後一天如果是環島，回到起點不需要住宿
  const isLastDay = activeDay === data.totalDays;

  // 根據起點索引計算每天的終點座標
  const getPointAtKm = useCallback((km: number): Point => {
    const ratio = Math.min(Math.max(km / route.totalDistance, 0), 1);
    const offset = Math.floor(ratio * (route.path.length - 1));
    const idx = (startIdx + offset) % route.path.length;
    return route.path[idx] || route.path[0];
  }, [route, startIdx]);

  const dayTargets = useMemo(() => {
    const targets: Record<number, { start: Point; end: Point }> = {};
    for (let d = 1; d <= data.totalDays; d++) {
      targets[d] = {
        start: getPointAtKm((d - 1) * dailyKm),
        end: getPointAtKm(d * dailyKm),
      };
    }
    return targets;
  }, [data.totalDays, dailyKm, getPointAtKm]);

  const todayStart = dayTargets[activeDay]?.start || getPointAtKm(0);
  const todayEnd = dayTargets[activeDay]?.end || getPointAtKm(0);
  const todayMid = getPointAtKm((activeDay - 0.5) * dailyKm);
  const hasHotel = Boolean(data.selections[activeDay]?.accommodationId);
  const allowFood = hasHotel || (activeDay === data.totalDays && data.isRoundTrip);

  // ===== 下載 OSM 資料 =====
  useEffect(() => {
    if (daySpots[activeDay] && daySpots[activeDay].length > 0) return;

    let mounted = true;
    (async () => {
      setIsFetching(true);
      try {
        const [hotelSpotsAll, foodStartSpotsAll, foodMidSpotsAll, foodEndSpotsAll, repairSpots] = await Promise.all([
          fetchOSMSpotsWithFallback(todayEnd.lat, todayEnd.lng, "accommodation"),
          fetchOSMSpotsWithFallback(todayStart.lat, todayStart.lng, "food"),
          fetchOSMSpotsWithFallback(todayMid.lat, todayMid.lng, "food"),
          fetchOSMSpotsWithFallback(todayEnd.lat, todayEnd.lng, "food"),
          fetchOSMSpotsWithFallback(todayEnd.lat, todayEnd.lng, "repair"),
        ]);

        if (mounted) {
          const centerHotel = { lat: todayEnd.lat, lng: todayEnd.lng };
          const foodCenters = [
            { lat: todayStart.lat, lng: todayStart.lng },
            { lat: todayMid.lat, lng: todayMid.lng },
            { lat: todayEnd.lat, lng: todayEnd.lng },
          ];

          const hotelPrimary = hotelSpotsAll.filter(h => haversineKm(h, centerHotel) <= MAX_HOTEL_KM_PRIMARY);
          const hotelFallback = hotelSpotsAll.filter(h => haversineKm(h, centerHotel) <= MAX_HOTEL_KM_FALLBACK);
          const finalHotels = hotelPrimary.length > 0 ? hotelPrimary : hotelFallback;

          const mergedFoods = [...foodStartSpotsAll, ...foodMidSpotsAll, ...foodEndSpotsAll];
          const dedupFoods = Array.from(new Map(mergedFoods.map(s => [s.id, s])).values());

          const isNearFoodPrimary = (f: Spot) => foodCenters.some(c => haversineKm(f, c) <= MAX_FOOD_KM_PRIMARY);
          const isNearFoodFallback = (f: Spot) => foodCenters.some(c => haversineKm(f, c) <= MAX_FOOD_KM_FALLBACK);

          const foodPrimary = dedupFoods.filter(isNearFoodPrimary);
          const foodFallback = dedupFoods.filter(isNearFoodFallback);
          const finalFoods = foodPrimary.length > 0 ? foodPrimary : foodFallback;

          setDaySpots(prev => ({ ...prev, [activeDay]: [...finalHotels, ...finalFoods, ...repairSpots] }));
        }
      } catch { /* fallback: empty */ }
      if (mounted) { setIsFetching(false); }
    })();
    return () => { mounted = false; };
  }, [activeDay, todayStart.lat, todayStart.lng, todayEnd.lat, todayEnd.lng, todayMid.lat, todayMid.lng]); // eslint-disable-line

  const currentSpots = daySpots[activeDay] || [];
  
  // 旅館：停靠點附近
  const hotels = useMemo(() => currentSpots.filter(s => s.type === "accommodation"), [currentSpots]);
  // 美食：有住宿後出現；環島最後一天回程日也允許選美食（不需住宿）
  const food = useMemo(() => allowFood ? currentSpots.filter(s => s.type === "food") : [], [currentSpots, allowFood]);
  // 維修站
  const repair = useMemo(() => currentSpots.filter(s => s.type === "emergency"), [currentSpots]);

  // 地圖上的 spots：旅館 + 已選後的美食 + 維修站
  const mapSpots = useMemo(() => {
    const spots = [...hotels, ...repair];
    if (allowFood) spots.push(...food);
    return spots;
  }, [hotels, food, repair, allowFood]);

  // 預算計算
  const totalSpent = useMemo(() => {
    const allSpots = [...ALL_SPOTS, ...Object.values(daySpots).flat()];
    return Object.values(data.selections).reduce((sum, sel) => {
      const acc = allSpots.find(s => s.id === sel.accommodationId);
      const foodCost = sel.foodIds.reduce((fs, fid) => fs + (allSpots.find(s => s.id === fid)?.price || 0), 0);
      return sum + (acc?.price || 0) + foodCost;
    }, 0);
  }, [data.selections, ALL_SPOTS, daySpots]);

  const remaining = data.totalBudgetAmount - totalSpent;

  // 持久化 OSM Spot
  const persistSpot = useCallback((id: string) => {
    const spot = currentSpots.find(s => s.id === id);
    if (spot?.id.startsWith("osm-") && !(data.customSpots || []).some(s => s.id === id)) {
      updateData({ customSpots: [...(data.customSpots || []), spot] });
    }
  }, [currentSpots, data.customSpots, updateData]);

  const handleSelectHotel = (id: string) => {
    persistSpot(id);
    const sel = data.selections[activeDay] || { foodIds: [], attractionIds: [] };
    updateData({ selections: { ...data.selections, [activeDay]: { ...sel, accommodationId: id } } });
  };

  const handleToggleFood = (id: string) => {
    persistSpot(id);
    const sel = data.selections[activeDay] || { foodIds: [], attractionIds: [] };
    const fids = sel.foodIds.includes(id) ? sel.foodIds.filter(f => f !== id) : [...sel.foodIds, id];
    updateData({ selections: { ...data.selections, [activeDay]: { ...sel, foodIds: fids } } });
  };

  // 重選旅館
  const handleResetHotel = () => {
    const sel = data.selections[activeDay] || { foodIds: [], attractionIds: [] };
    updateData({ selections: { ...data.selections, [activeDay]: { ...sel, accommodationId: undefined } } });
  };

  const selectedHotel = hasHotel
    ? [...ALL_SPOTS, ...currentSpots].find(s => s.id === data.selections[activeDay]?.accommodationId) : null;

  const mapCenter = selectedHotel ? { lat: selectedHotel.lat, lng: selectedHotel.lng } : todayEnd;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[550px]">
      {/* Day sidebar */}
      <div className="w-full lg:w-52 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto pb-3 lg:pb-0">
        {Array.from({ length: data.totalDays }).map((_, i) => {
          const day = i + 1;
          const sel = data.selections[day];
          const hasAcc = Boolean(sel?.accommodationId);
          const isLast = day === data.totalDays && data.isRoundTrip;
          const canAccess = day === 1 || Boolean(data.selections[day - 1]?.accommodationId) || (day - 1 === data.totalDays && data.isRoundTrip);
          const accName = hasAcc ? [...ALL_SPOTS, ...Object.values(daySpots).flat()].find(s => s.id === sel!.accommodationId)?.name || "已選" : null;

          return (
            <button key={day} onClick={() => canAccess && setActiveDay(day)} disabled={!canAccess}
              className={`flex-shrink-0 flex items-center justify-between p-3 rounded-xl transition-all border-2 text-left ${activeDay === day ? "border-primary bg-primary/5 shadow" : canAccess ? "border-transparent bg-slate-50 hover:bg-slate-100" : "opacity-30 bg-slate-100 cursor-not-allowed"}`}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Day {day} {isLast ? "🏁" : ""}</p>
                <p className={`text-sm font-bold truncate ${activeDay === day ? "text-primary" : "text-slate-700"}`}>
                  {isLast && !hasAcc ? "回到起點" : accName || (canAccess ? "待規劃" : "🔒")}
                </p>
              </div>
              {hasAcc && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <MapPin className="text-primary w-5 h-5" /> Day {activeDay}
              {isLastDay && data.isRoundTrip && <span className="text-sm font-normal text-slate-500 ml-2">🏁 回程日</span>}
            </h3>
            <p className="text-xs text-slate-500">
              {data.departureLocation} 出發 | 今日 ~{Math.round(dailyKm)}km | 約 {dailyHours.toFixed(1)} 小時
              {dailyHours > 8 && <span className="text-red-500 font-bold"> ⚠ 超過 8 小時</span>}
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-3">
            <Wallet className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase">剩餘</p>
              <p className={`text-lg font-black ${remaining < 0 ? "text-red-400" : ""}`}>${remaining.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex flex-wrap gap-2">
          {isFetching ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 搜尋附近旅館與美食中…
            </span>
          ) : isLastDay && data.isRoundTrip ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> 🏁 最後一天回到 {data.departureLocation}，不需住宿！
            </span>
          ) : !hasHotel ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              <BedDouble className="w-3.5 h-3.5" /> Step 1: 選旅館 ({hotels.length} 間)
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 🏨 {selectedHotel?.name} (${selectedHotel?.price})
              </span>
              <button onClick={handleResetHotel} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold hover:bg-red-50 hover:text-red-500 transition-colors">
                <RotateCcw className="w-3 h-3" /> 重選
              </button>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <Utensils className="w-3.5 h-3.5" /> Step 2: 選美食 ({food.length} 個)
              </span>
            </>
          )}
          {repair.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold">
              <Wrench className="w-3 h-3" /> {repair.length} 維修站
            </span>
          )}

          {allowFood && hasHotel && food.length === 0 && !isFetching && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
              <AlertCircle className="w-3 h-3" /> 此停靠點周圍 OSM 未找到美食/便利店（可先選下一天旅館或改換天數）
            </span>
          )}
        </div>

        {/* Map + controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapIcon className="w-4 h-4 text-primary" /> 地圖</h4>
            <div className="flex gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-bold">住宿/美食僅使用 OSM 點位</Badge>
            </div>
          </div>
          <MapPickerWrapper
            targetCoord={mapCenter}
            routePath={route.path}
            spots={mapSpots}
            activeAccommodationId={data.selections[activeDay]?.accommodationId}
            activeFoodIds={data.selections[activeDay]?.foodIds || []}
            onSelectAccommodation={handleSelectHotel}
            onToggleFood={handleToggleFood}
          />
        </div>

        {/* Selected items */}
        {(hasHotel || allowFood) && (
          <div className="flex flex-wrap gap-1.5">
            {hasHotel && selectedHotel && (
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">🏨 {selectedHotel.name} ${selectedHotel.price}</span>
            )}
            {(data.selections[activeDay]?.foodIds || []).map(fid => {
              const f = [...ALL_SPOTS, ...currentSpots].find(s => s.id === fid);
              if (!f) return null;
              return <span key={fid} className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-bold">🍜 {f.name} ${f.price}</span>;
            })}
          </div>
        )}

        {/* Next day / Skip last day */}
        {isLastDay && data.isRoundTrip ? (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
            <p className="text-green-700 font-bold">🏁 恭喜！最後一天回到 {data.departureLocation}，不需住宿。</p>
            <p className="text-xs text-green-600 mt-1">你可以在沿途選擇美食補給。完成後按底部「下一步」進入裝備確認。</p>
          </div>
        ) : hasHotel && activeDay < data.totalDays ? (
          <Button size="lg" className="w-full font-bold rounded-xl py-6 bg-green-600 hover:bg-green-700 shadow-lg" onClick={() => setActiveDay(activeDay + 1)}>
            ✅ Day {activeDay} 完成 → Day {activeDay + 1}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
