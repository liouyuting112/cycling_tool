"use client";

import { WizardData } from "@/types/wizard";
import { SPOT_DB, ROUTES, STATION_COORDS, type Spot } from "@/utils/db";
import { Button } from "@/components/ui/Button";
import { Map, Printer, PhoneCall, Wallet, CalendarDays, CheckCircle2, Package, ExternalLink, Clock, MapPin } from "lucide-react";
import { useMemo, useRef } from "react";

interface Props { data: WizardData; }

export function Step5Summary({ data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const ALL = useMemo(() => [...SPOT_DB, ...(data.customSpots || [])], [data.customSpots]);
  const route = useMemo(() => ROUTES.find(r => r.id === data.routeId) || ROUTES[0], [data.routeId]);
  const dailyKm = route.totalDistance / data.totalDays;

  const totalSpent = useMemo(() => {
    return Object.values(data.selections).reduce((sum, sel) => {
      const acc = ALL.find(s => s.id === sel.accommodationId);
      const fc = sel.foodIds.reduce((f, fid) => f + (ALL.find(s => s.id === fid)?.price || 0), 0);
      return sum + (acc?.price || 0) + fc;
    }, 0);
  }, [data.selections, ALL]);

  const STATION = STATION_COORDS[data.departureLocation] as { lat: number; lng: number } | undefined;

  const googleMapsSearch = (spot: Spot) => {
    // 不使用 Places API 的前提下，盡量用「OSM 名稱 + 地址」讓 Google 匹配到同一個 POI。
    const query = spot.address?.trim()
      ? `${spot.name}, ${spot.address.trim()}`
      : spot.name;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&ll=${spot.lat},${spot.lng}`;
  };

  // Google Maps 路線導航（含中繼美食站）
  const googleMapsRoute = (day: number) => {
    const sel = data.selections[day];
    if (!sel) return "#";
    const points: string[] = [];

    // 起點
    if (day === 1) {
      if (STATION) points.push(`${STATION.lat},${STATION.lng}`);
      else points.push(data.departureLocation);
    } else {
      const prev = ALL.find(s => s.id === data.selections[day - 1]?.accommodationId);
      if (prev) points.push(`${prev.lat},${prev.lng}`);
      else if (STATION) points.push(`${STATION.lat},${STATION.lng}`);
      else points.push(data.departureLocation);
    }

    // 美食中繼
    sel.foodIds.forEach(fid => {
      const f = ALL.find(s => s.id === fid);
      if (f) points.push(`${f.lat},${f.lng}`);
    });

    // 終點
    const acc = ALL.find(s => s.id === sel.accommodationId);
    if (acc) points.push(`${acc.lat},${acc.lng}`);
    else if (day === data.totalDays && data.isRoundTrip) {
      if (STATION) points.push(`${STATION.lat},${STATION.lng}`);
      else points.push(data.departureLocation);
    }

    if (points.length < 2) return "#";
    const origin = encodeURIComponent(points[0]);
    const dest = encodeURIComponent(points[points.length - 1]);
    const wp = points.length > 2 ? "&waypoints=" + points.slice(1, -1).map(p => encodeURIComponent(p)).join("|") : "";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${wp}&travelmode=bicycling`;
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutesTotal: number) => {
    const roundedTotal = Math.round(minutesTotal);
    const hours = Math.floor((roundedTotal / 60) % 24);
    const minutes = roundedTotal % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const DAILY_START_TIME = "08:00";
  const FOOD_STAY_HOURS = 1;

  const handlePrint = () => {
    window.print();
  };

  const uncheckedEquipment = data.equipmentList.filter(e => !e.checked);

  return (
    <div className="space-y-8">
      {/* Header card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2 text-primary mb-4">
          <CheckCircle2 className="w-6 h-6" />
          <h3 className="text-2xl font-black tracking-tight">行程規劃完成！</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-bold">路線</p>
            <p className="font-bold text-sm">{route.name}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-bold">天數</p>
            <p className="font-bold text-lg flex items-center gap-1"><CalendarDays className="w-4 h-4 text-slate-500" />{data.totalDays} 天</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-bold">每日里程</p>
            <p className="font-bold text-lg flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-500" />~{Math.round(dailyKm)} km</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-bold">預算</p>
            <p className={`font-bold text-lg flex items-center gap-1 ${totalSpent > data.totalBudgetAmount ? "text-red-400" : "text-green-400"}`}>
              <Wallet className="w-4 h-4" />${(data.totalBudgetAmount - totalSpent).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* === 可視化行程表 === */}
      <div ref={printRef} className="print:p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-black text-slate-900">📋 完整行程表</h4>
          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden rounded-xl">
            <Printer className="w-4 h-4 mr-1" /> 列印 / 截圖
          </Button>
        </div>

        <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider p-3 border-b">
            <div className="col-span-1">Day</div>
            <div className="col-span-2">出發</div>
            <div className="col-span-2">騎乘</div>
            <div className="col-span-3">住宿</div>
            <div className="col-span-3">沿途美食</div>
            <div className="col-span-1">費用</div>
          </div>

          {/* Table rows */}
          {Array.from({ length: data.totalDays }).map((_, i) => {
            const day = i + 1;
            const sel = data.selections[day];
            const acc = ALL.find(s => s.id === sel?.accommodationId);
            const foods =
              sel?.foodIds
                .map(fid => ALL.find(s => s.id === fid))
                .filter((s): s is Spot => Boolean(s)) || [];
            const isLast = day === data.totalDays && data.isRoundTrip;
            const dayCost = (acc?.price || 0) + foods.reduce((s, f) => s + f.price, 0);

            // --- 時間估算（簡化：只知道每一天總騎乘時間，路段時間在各停靠點間平均分配）---
            const rideHours = dailyKm / data.speedLevel;
            const segments = Math.max(foods.length + 1, 1); // 起點 -> 食物1 -> ... -> 末端
            const rideSegmentMinutes = (rideHours * 60) / segments;
            const foodStayMinutes = FOOD_STAY_HOURS * 60;

            let cursorMinutes = parseTime(DAILY_START_TIME);
            const foodTimes: string[] = [];
            foods.forEach(() => {
              cursorMinutes += rideSegmentMinutes; // 抵達用餐點
              foodTimes.push(formatTime(cursorMinutes));
              cursorMinutes += foodStayMinutes; // 用餐停留
            });
            cursorMinutes += rideSegmentMinutes; // 抵達住宿/回程終點
            const endTimeStr = formatTime(cursorMinutes);

            // 起點名稱
            let startName = data.departureLocation;
            if (day > 1) {
              const prevAcc = ALL.find(s => s.id === data.selections[day - 1]?.accommodationId);
              if (prevAcc) startName = prevAcc.name;
            }

            return (
              <div key={day} className={`grid grid-cols-12 p-3 items-center text-sm border-b last:border-0 ${day % 2 === 0 ? "bg-slate-50/50" : ""}`}>
                <div className="col-span-1">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-black">{day}</span>
                </div>
                <div className="col-span-2 text-slate-600 text-xs font-medium truncate">{startName}</div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> 08:00 出發 → 約 {endTimeStr} 到達
                  </p>
                  <p className="text-[10px] text-slate-400">{Math.round(dailyKm)} km｜{(dailyKm / data.speedLevel).toFixed(1)}h</p>
                </div>
                <div className="col-span-3">
                  {isLast ? (
                    <span className="text-xs text-green-600 font-bold">🏁 回到 {data.departureLocation}（約 {endTimeStr} 到達）</span>
                  ) : acc ? (
                    <div>
                      <a href={googleMapsSearch(acc)} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        🏨 {acc.name} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <p className="text-[10px] text-slate-400">${acc.price} | 入住約 {endTimeStr}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-red-400">
                      未選 | 預計約 {endTimeStr} 抵達
                    </span>
                  )}
                </div>
                <div className="col-span-3">
                  {foods.length > 0 ? (
                    <div className="space-y-0.5">
                      {foods.map(f => (
                        <a key={f.id} href={googleMapsSearch(f)} target="_blank" rel="noopener noreferrer"
                          className="block text-[10px] text-slate-600 hover:text-primary hover:underline truncate">
                          🍜 {f.name} (${f.price}) @ {foodTimes[foods.findIndex(x => x.id === f.id)] ?? "—"}
                        </a>
                      ))}
                    </div>
                  ) : <span className="text-[10px] text-slate-300">—</span>}
                </div>
                <div className="col-span-1 text-xs font-bold text-slate-700">${dayCost}</div>
              </div>
            );
          })}

          {/* Total row */}
          <div className="grid grid-cols-12 p-3 bg-slate-900 text-white text-sm font-black">
            <div className="col-span-1"></div>
            <div className="col-span-2"></div>
            <div className="col-span-2">總計 {route.totalDistance} km</div>
            <div className="col-span-3"></div>
            <div className="col-span-3"></div>
            <div className="col-span-1">${totalSpent.toLocaleString()}</div>
          </div>
        </div>

        {/* Google Maps route links */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Map className="w-4 h-4" /> Google Maps 導航</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: data.totalDays }).map((_, i) => {
              const day = i + 1;
              const acc = ALL.find(s => s.id === data.selections[day]?.accommodationId);
              return (
                <a key={day} href={googleMapsRoute(day)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-2">
                    <Map className="w-4 h-4" /> Day {day}: {acc?.name || (day === data.totalDays && data.isRoundTrip ? "回程" : "—")}
                  </span>
                  <ExternalLink className="w-3 h-3 text-blue-400" />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* 裝備確認 */}
      <div className={`p-4 rounded-2xl border-2 ${uncheckedEquipment.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
        <h4 className={`font-black flex items-center gap-2 ${uncheckedEquipment.length > 0 ? "text-amber-700" : "text-green-700"}`}>
          <Package className="w-5 h-5" />
          {uncheckedEquipment.length > 0 ? `⚠️ ${uncheckedEquipment.length} 項裝備尚未備齊` : "✅ 裝備全部就緒"}
        </h4>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {data.equipmentList.map(eq => (
            <span key={eq.id} className={`text-xs ${eq.checked ? "text-green-600" : "text-red-500 font-bold"}`}>
              {eq.checked ? "✅" : "❌"} {eq.name}
            </span>
          ))}
        </div>
      </div>

      {/* 緊急聯繫 */}
      <div className="bg-red-50 border-2 border-dashed border-red-200 p-4 rounded-2xl">
        <h4 className="text-red-700 font-black flex items-center gap-2 text-sm"><PhoneCall className="w-4 h-4" /> 環島緊急救助</h4>
        <div className="mt-2 grid gap-1.5">
          <div className="flex justify-between p-2 bg-white rounded-lg text-sm">
            <span className="font-bold">110 / 119</span><span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">報警/救護</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded-lg text-sm">
            <span className="font-bold">0800-011-765</span><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">單車環島專線</span>
          </div>
        </div>
      </div>
    </div>
  );
}
