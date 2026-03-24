"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { type MapPickerProps } from "./MapPicker";

// Because Leaflet uses window and document natively, we must disable Server-Side Rendering (SSR) for it
const DynamicMapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] sm:h-[700px] rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-primary">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <span className="text-sm font-bold animate-pulse">正在載入開源地圖 (OpenStreetMap)...</span>
    </div>
  )
});

export default function MapPickerWrapper(props: MapPickerProps) {
  return <DynamicMapPicker {...props} />;
}
