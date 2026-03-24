"use client";

import { WizardData } from "@/types/wizard";
import { ROUTES } from "@/utils/db";
import { Card, CardContent } from "@/components/ui/Card";
import { Bike, Gauge, Navigation2, CalendarDays, Utensils, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMemo } from "react";

interface Step1Props {
  data: WizardData;
  updateData: (data: Partial<WizardData>) => void;
}

const LOCATIONS = [
  "基隆車站", "台北車站", "新北板橋車站", "桃園車站", "新竹車站", 
  "苗栗車站", "台中車站", "彰化車站", "南投車站 (員林接駁)", "雲林斗六車站", 
  "嘉義車站", "台南車站", "高雄車站", "屏東車站", "宜蘭車站", 
  "花蓮車站", "台東車站", "澎湖 (馬公)", "金門", "連江 (馬祖)"
];

const SPEED_LEVELS = [
  { value: 15, label: "休閒漫遊", desc: "約 15 km/h，邊騎邊玩", icon: Bike },
  { value: 20, label: "一般運動", desc: "約 20 km/h，規律前進", icon: Navigation2 },
  { value: 25, label: "挑戰極限", desc: "約 25 km/h，全速衝刺", icon: Gauge },
] as const;

export function Step1Basic({ data, updateData }: Step1Props) {
  const route = useMemo(() => ROUTES.find(r => r.id === data.routeId) || ROUTES[0], [data.routeId]);

  const DAILY_MAX_RIDING_HOURS = 10;
  const totalRideHours = route.totalDistance / data.speedLevel;
  const recommendedDays = Math.max(1, Math.ceil(totalRideHours / DAILY_MAX_RIDING_HOURS));
  const nightsNeeded = data.isRoundTrip ? Math.max(0, recommendedDays - 1) : recommendedDays;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-6 md:grid-cols-2">
        {/* 出發地點 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Navigation2 className="w-4 h-4 text-primary" />
            真正出發起點
          </label>
          <select
            className="w-full h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            value={data.departureLocation}
            onChange={(e) => updateData({ departureLocation: e.target.value })}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* 總天數 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            行程總天數
          </label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateData({ totalDays: Math.max(1, data.totalDays - 1) })}
              type="button"
            >
              -
            </Button>
            <input 
              type="number"
              className="flex-1 text-center font-semibold text-lg h-11 border border-slate-200 rounded-md bg-white dark:border-slate-800 dark:bg-slate-950 px-2"
              value={data.totalDays}
              onChange={(e) => updateData({ totalDays: parseInt(e.target.value) || 1 })}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateData({ totalDays: data.totalDays + 1 })}
              type="button"
            >
              +
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 總預算 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            總預算金額 (TWD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
            <input 
              type="number"
              className="w-full h-11 pl-8 rounded-md border border-slate-200 bg-white px-3 py-2 text-lg font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
              placeholder="例如: 15000"
              value={data.totalBudgetAmount}
              onChange={(e) => updateData({ totalBudgetAmount: parseInt(e.target.value) || 0 })}
            />
          </div>
          <p className="text-[10px] text-slate-400">平均每日預算: ${Math.floor(data.totalBudgetAmount / (data.totalDays || 1))}</p>
        </div>

        {/* 類型 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            行程類型
          </label>
          <div className="flex gap-2">
            <Button 
              variant={data.isRoundTrip ? "default" : "outline"} 
              className="flex-1"
              onClick={() => updateData({ isRoundTrip: true })}
            >
              來回環線
            </Button>
            <Button 
              variant={!data.isRoundTrip ? "default" : "outline"} 
              className="flex-1"
              onClick={() => updateData({ isRoundTrip: false })}
            >
              單趟直行
            </Button>
          </div>
        </div>
      </div>

      {/* 腳力等級評估 */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bike className="w-4 h-4 text-primary" />
          腳力等級評估 (均速)
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {SPEED_LEVELS.map(({ value, label, desc, icon: Icon }) => (
            <Card
              key={value}
              className={`cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden ${
                data.speedLevel === value ? "border-primary ring-1 ring-primary bg-primary/5 dark:bg-primary/10" : "border-slate-200 dark:border-slate-800"
              }`}
              onClick={() => updateData({ speedLevel: value as 15 | 20 | 25 })}
            >
              <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-full ${data.speedLevel === value ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{label}</h4>
                  <p className="text-xs text-slate-500 mt-1">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 住宿需求判斷（依預估時間） */}
      <div className="bg-slate-900 text-slate-50 p-6 rounded-2xl space-y-3">
        <h4 className="font-black flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          時間預估與住宿建議
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed">
          依目前路線距離與你的腳力（均速 {data.speedLevel} km/h）估計：整趟騎乘約{" "}
          <span className="font-black text-white">{totalRideHours.toFixed(1)} 小時</span>。
          若以每日上限 <span className="font-black text-white">{DAILY_MAX_RIDING_HOURS} 小時</span> 估算，
          建議行程天數為 <span className="font-black text-white">{recommendedDays} 天</span>。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {recommendedDays <= 1 ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-200 border border-green-500/20 text-xs font-bold">
              ✅ 不用住宿（單日可完成）
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-100 border border-amber-500/20 text-xs font-bold">
              🏨 建議安排住宿：{nightsNeeded} 晚
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            className="ml-auto print:hidden border-slate-600 text-slate-50 hover:bg-slate-800"
            onClick={() => {
              if (recommendedDays !== data.totalDays) {
                updateData({ totalDays: recommendedDays, selections: {} });
              }
            }}
            disabled={recommendedDays === data.totalDays}
          >
            套用建議天數
          </Button>
        </div>
      </div>
    </div>
  );
}
