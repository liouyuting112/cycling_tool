"use client";

import { WizardData } from "@/types/wizard";
import { Card, CardContent } from "@/components/ui/Card";
import { ROUTES } from "@/utils/db";
import { Map, MapPin, Search, Calendar, Zap } from "lucide-react";
import { useState } from "react";

interface Step2Props {
  data: WizardData;
  updateData: (data: Partial<WizardData>) => void;
}

export function Step2Preferences({ data, updateData }: Step2Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoutes = ROUTES.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       r.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if the departureLocation contains any of the route's counties
    const matchLocation = !data.departureLocation || 
        r.counties?.some(county => data.departureLocation.includes(county) || county.includes(data.departureLocation));
        
    return matchSearch && matchLocation;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 路線搜索與選擇 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" />
            挑選一條「百大路線」作為基底
          </label>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="搜尋編號或關鍵字..."
              className="w-full h-9 pl-9 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredRoutes.map((route) => {
            const isHard = (route.totalDistance / data.speedLevel / route.recommendedDays) > 6;
            
            return (
              <Card
                key={route.id}
                className={`cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden group ${
                  data.routeId === route.id ? "border-primary ring-1 ring-primary bg-primary/5 dark:bg-primary/10" : "border-slate-200 dark:border-slate-800"
                }`}
                onClick={() => updateData({ routeId: route.id })}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${data.routeId === route.id ? "bg-primary text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800"}`}>
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{route.name}</h4>
                        {isHard && <Zap className="w-4 h-4 text-amber-500" />}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{route.description}</p>
                      
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          <Map className="w-3 h-3" />
                          {route.totalDistance} km
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          建議 {route.recommendedDays} 天
                        </div>
                        {data.totalDays < route.recommendedDays && (
                          <div className="text-[10px] text-red-500 font-bold animate-pulse">
                            ⚠️ 您的天數較急促
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredRoutes.length === 0 && (
            <div className="col-span-full py-12 text-center space-y-3 bg-slate-50 rounded-xl dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-white w-fit mx-auto rounded-full shadow-sm dark:bg-slate-800">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">找不到路線？可能是因為該路線未經過您的出發地（{data.departureLocation}），請嘗試更換出發地或重新搜尋。</p>
            </div>
          )}
        </div>
      </div>

      {/* 偏好過濾 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 飲食偏好 */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            飲食偏好 (影響推薦清單)
          </label>
          <div className="flex gap-2">
            {[
              { id: "convenience-store", label: "便利商店", icon: "🏪" },
              { id: "restaurant", label: "餐廳/熱炒", icon: "🍜" },
            ].map((pref) => {
              const isSelected = data.foodPreferences.includes(pref.id);
              return (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() => {
                    const next = isSelected 
                      ? data.foodPreferences.filter(p => p !== pref.id)
                      : [...data.foodPreferences, pref.id];
                    updateData({ foodPreferences: next });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected ? "border-primary bg-primary/5 text-primary" : "border-slate-100 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                  }`}
                >
                  <span>{pref.icon}</span>
                  <span className="text-xs font-bold">{pref.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 住宿類型 */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            住宿類型 (嚴選符合點位)
          </label>
          <div className="flex gap-2">
            {[
              { id: "hotel", label: "飯店/商旅", icon: "🏨" },
              { id: "hostel", label: "青旅/民宿", icon: "🏠" },
            ].map((pref) => {
              const isSelected = data.accommodationTypePreferences.includes(pref.id);
              return (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() => {
                    const next = isSelected 
                      ? data.accommodationTypePreferences.filter(p => p !== pref.id)
                      : [...data.accommodationTypePreferences, pref.id];
                    updateData({ accommodationTypePreferences: next });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected ? "border-primary bg-primary/5 text-primary" : "border-slate-100 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                  }`}
                >
                  <span>{pref.icon}</span>
                  <span className="text-xs font-bold">{pref.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-50 p-6 rounded-2xl space-y-3">
        <h4 className="font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary fill-primary" />
          為什麼路線選擇很重要？
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          挑選路線後，下一階段系統將會依照該路線的「停靠站點」為您推薦合適的住宿點位，並根據您的腳力計算預計抵達時間。
        </p>
      </div>

    </div>
  );
}
