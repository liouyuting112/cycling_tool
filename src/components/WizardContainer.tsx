"use client";

import { useState, useEffect, useCallback } from "react";
import { WizardData } from "@/types/wizard";
import { Step1Basic } from "./steps/Step1Basic";
import { Step2Preferences } from "./steps/Step2Preferences";
import { Step3Interactive } from "./steps/Step3Interactive";
import { Step4Checklist } from "./steps/Step4Checklist";
import { Step5Summary } from "./steps/Step5Summary";
import { Button } from "./ui/Button";
import { AlertCircle, AlertTriangle, RefreshCcw } from "lucide-react";

const STORAGE_KEY = "cycling-planner-data";
const STEP_KEY = "cycling-planner-step";

const INITIAL_DATA: WizardData = {
  departureLocation: "基隆車站",
  totalDays: 7,
  speedLevel: 20,
  totalBudgetAmount: 15000,
  routeId: "route-circle-1",
  isRoundTrip: true,
  foodPreferences: ["restaurant"],
  accommodationTypePreferences: ["hotel"],
  selections: {},
  equipmentList: [
    { id: "eq-1", name: "安全帽 (必備)", checked: false },
    { id: "eq-2", name: "排汗車衣 (2-3件)", checked: false },
    { id: "eq-3", name: "補胎工具/打氣筒", checked: false },
    { id: "eq-4", name: "前後車燈", checked: false },
    { id: "eq-5", name: "反光背心", checked: false },
    { id: "eq-6", name: "水壺 (至少1個)", checked: false },
    { id: "eq-7", name: "手機支架/充電器", checked: false },
    { id: "eq-8", name: "雨衣/防風外套", checked: false },
  ],
  customSpots: [],
};

const STEPS = [
  { id: 1, title: "基本設定" },
  { id: 2, title: "挑選路線" },
  { id: 3, title: "行程規畫" },
  { id: 4, title: "裝備檢查" },
  { id: 5, title: "完成計畫" },
];

export function WizardContainer() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const sd = localStorage.getItem(STORAGE_KEY);
      const ss = localStorage.getItem(STEP_KEY);
      // Defer state updates to avoid react-hooks/set-state-in-effect warnings
      setTimeout(() => {
        if (sd) setData({ ...INITIAL_DATA, ...JSON.parse(sd) });
        if (ss) setStep(parseInt(ss) || 1);
        setLoaded(true);
      }, 0);
    } catch {
      setTimeout(() => setLoaded(true), 0);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STEP_KEY, String(step));
    } catch {}
  }, [data, step, loaded]);

  const updateData = useCallback((u: Partial<WizardData>) => setData(p => ({ ...p, ...u })), []);

  // Step 3 驗證：除了最後一天(環島)，其他天都要有旅館
  const step3Validation = () => {
    let missing = 0;
    for (let d = 1; d <= data.totalDays; d++) {
      const isLastRoundTrip = d === data.totalDays && data.isRoundTrip;
      if (!isLastRoundTrip && !data.selections[d]?.accommodationId) missing++;
    }
    return missing === 0 ? null : `尚有 ${missing} 天未選旅館`;
  };

  // Step 4：警告但不阻擋
  const step4Warning = () => {
    const unchecked = data.equipmentList.filter(i => !i.checked).length;
    return unchecked === 0 ? null : `尚有 ${unchecked} 項裝備未勾選`;
  };

  const canNext = () => {
    if (step === 3) return !step3Validation();
    return true; // Step 4 warning only, not blocking
  };

  const handleReset = () => {
    if (window.confirm("確定要清除所有規劃資料並重新開始？")) {
      setData(INITIAL_DATA);
      setStep(1);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_KEY);
    }
  };

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between pb-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center flex-1 relative">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm z-10 ${step >= s.id ? "bg-primary text-white shadow" : "bg-slate-200 text-slate-400"}`}>{s.id}</div>
            <p className={`mt-2 text-[10px] font-bold ${step >= s.id ? "text-slate-900" : "text-slate-400"}`}>{s.title}</p>
            {i < STEPS.length - 1 && <div className={`absolute top-4 left-1/2 w-full h-[2px] -translate-y-1/2 ${step > s.id ? "bg-primary" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 min-h-[500px]">
        {step === 1 && <Step1Basic data={data} updateData={updateData} />}
        {step === 2 && <Step2Preferences data={data} updateData={updateData} />}
        {step === 3 && <Step3Interactive data={data} updateData={updateData} />}
        {step === 4 && <Step4Checklist data={data} updateData={updateData} />}
        {step === 5 && <Step5Summary data={data} />}
      </div>

      {/* Validation messages */}
      {step === 3 && step3Validation() && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" /> {step3Validation()}
        </div>
      )}
      {step === 4 && step4Warning() && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {step4Warning()}（繼續將記錄為缺件）
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setStep(p => Math.max(1, p - 1))} disabled={step === 1} className="rounded-xl px-6">上一步</Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-400 hover:text-red-500 text-xs">
            <RefreshCcw className="w-3 h-3 mr-1" /> 重新規劃
          </Button>
        </div>
        <span className="text-xs text-slate-400">{step} / 5</span>
        {step < 5 && (
          <Button onClick={() => setStep(p => Math.min(5, p + 1))} disabled={!canNext()} className={`rounded-xl px-6 font-bold ${!canNext() ? "opacity-50" : ""}`}>下一步</Button>
        )}
        {step === 5 && <div />}
      </div>
    </div>
  );
}
