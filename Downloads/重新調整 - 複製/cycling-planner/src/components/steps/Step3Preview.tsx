"use client";

import { WizardData } from "@/types/wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, LifeBuoy, X, ShieldAlert, Stethoscope, Wrench, Phone } from "lucide-react";
import { useState } from "react";

interface Step3Props {
  data: WizardData;
}

export function Step3Preview({ data }: Step3Props) {
  const [showSOS, setShowSOS] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* SOS Overlay Button */}
      <button
        onClick={() => setShowSOS(true)}
        className="fixed bottom-24 right-6 z-40 bg-red-600 text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-all hover:scale-110 flex items-center gap-2 font-bold"
        aria-label="SOS 緊急求助"
      >
        <LifeBuoy className="w-6 h-6 animate-pulse" />
        <span className="hidden sm:inline">SOS 緊急求助</span>
      </button>

      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-500 overflow-hidden">
            <CardHeader className="bg-red-600 text-white flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6" />
                <CardTitle>緊急救助中心</CardTitle>
              </div>
              <button onClick={() => setShowSOS(false)}><X className="w-6 h-6" /></button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-slate-500 font-medium italic border-l-4 border-red-500 pl-3">
                系統已偵測到您目前大約在「{data.departureLocation}」周邊路段...
              </p>
              
              <div className="grid gap-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="text-red-600 w-5 h-5" />
                    <div>
                      <p className="font-bold">比鄰醫療站</p>
                      <p className="text-xs text-slate-500">距離 1.2km | 開放中</p>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive"><Phone className="w-4 h-4 mr-1"/> 撥打</Button>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="text-orange-600 w-5 h-5" />
                    <div>
                      <p className="font-bold">捷安特維修中心</p>
                      <p className="text-xs text-slate-500">距離 3.5km | 救援中</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700"><Phone className="w-4 h-4 mr-1"/> 撥打</Button>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-[11px] text-slate-500">
                註：本功能僅提供「救助相關」訊息，不會出現任何住宿或美食推薦。
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="pt-6 border-t border-slate-100">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex-row items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">行程預覽已停用</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                為了避免出現未驗證的模擬店家（你不想一直試錯/也不想要假資料），
                本專案的住宿與美食請使用 `Step3Interactive` 直接用 OSM 點位來挑選。
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="secondary">現在請在 Step 3 選擇旅館與美食</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
