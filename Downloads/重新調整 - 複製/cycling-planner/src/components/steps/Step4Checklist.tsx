"use client";

import { WizardData } from "@/types/wizard";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, CheckCircle2, Package, ListChecks } from "lucide-react";
import { useState } from "react";

interface Step4Props {
  data: WizardData;
  updateData: (data: Partial<WizardData>) => void;
}

export function Step4Checklist({ data, updateData }: Step4Props) {
  const [newItemName, setNewItemName] = useState("");

  const toggleItem = (id: string) => {
    const newList = data.equipmentList.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    updateData({ equipmentList: newList });
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    const newItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      checked: false
    };
    
    updateData({ equipmentList: [...data.equipmentList, newItem] });
    setNewItemName("");
  };

  const removeItem = (id: string) => {
    updateData({ equipmentList: data.equipmentList.filter(i => i.id !== id) });
  };

  const checkedCount = data.equipmentList.filter(i => i.checked).length;
  const progress = Math.round((checkedCount / (data.equipmentList.length || 1)) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          <Package className="text-primary" />
          出發裝備點查
        </h3>
        <p className="text-sm text-slate-500">
          單車客必備清單。點擊勾選您已準備好的物品。
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>準備進度</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800 border dark:border-slate-700">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add New Item */}
      <form onSubmit={addItem} className="flex gap-2">
        <input 
          type="text"
          className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-100 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-slate-800 dark:bg-slate-900"
          placeholder="新增個人備忘項目 (例如：防曬乳)"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
        />
        <Button type="submit" size="icon" className="h-12 w-12 rounded-xl">
          <Plus className="w-5 h-5" />
        </Button>
      </form>

      {/* Equipment List */}
      <div className="grid gap-3">
        {data.equipmentList.map((item) => (
          <div 
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`group flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              item.checked 
                ? "border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10" 
                : "border-slate-50 bg-slate-50 dark:border-slate-900 dark:bg-slate-900 hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                item.checked ? "bg-green-500 border-green-500 text-white" : "border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700"
              }`}>
                {item.checked && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className={`font-semibold ${item.checked ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                {item.name}
              </span>
            </div>
            {item.id.startsWith("custom-") && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-start gap-4 dark:bg-slate-900 dark:border-slate-800">
        <ListChecks className="w-6 h-6 text-primary shrink-0 dark:text-primary-foreground" />
        <p className="text-sm text-slate-500 leading-relaxed italic">
          「裝備就像信用，帶錯了很麻煩，沒帶到更慘。」
          <br />推薦檢查三次：出發前一週、出發前一晚、以及踏上踏板的那一刻。
        </p>
      </div>

    </div>
  );
}
