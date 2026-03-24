"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Spot, Point } from "@/utils/db";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Utensils, BedDouble, Plus } from "lucide-react";
import { useEffect } from "react";

// Fix for Next.js missing Leaflet Icons
const leafletIconProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
delete leafletIconProto._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const hotelIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const foodIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedHotelIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -38],
  shadowSize: [41, 41]
});

const defaultIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map re-centering when target changes
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 12, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

export interface MapPickerProps {
  targetCoord: Point;
  routePath: Point[];
  spots: Spot[];
  activeAccommodationId?: string;
  activeFoodIds?: string[];
  onSelectAccommodation: (id: string) => void;
  onToggleFood: (id: string) => void;
}

export default function MapPicker({ targetCoord, routePath, spots, activeAccommodationId, activeFoodIds, onSelectAccommodation, onToggleFood }: MapPickerProps) {
  
  const polylinePositions = routePath.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <div className="w-full h-[600px] sm:h-[700px] rounded-2xl overflow-hidden shadow-sm border-2 border-slate-200 dark:border-slate-800 relative z-0">
      <MapContainer 
        center={[targetCoord.lat, targetCoord.lng]} 
        zoom={12} 
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto re-center on coordinate change */}
        <MapRecenter lat={targetCoord.lat} lng={targetCoord.lng} />

        {/* Route Path */}
        <Polyline positions={polylinePositions} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }} />
        
        {/* Target Circle Area */}
        <Circle 
            center={[targetCoord.lat, targetCoord.lng]} 
            radius={10000} 
            pathOptions={{ fillColor: '#3b82f6', color: '#3b82f6', fillOpacity: 0.05, weight: 1, dashArray: '5, 5' }} 
        />
        
        {/* Target Destination Pin - Only show if hotel not yet selected */}
        {!activeAccommodationId && (
            <Marker position={[targetCoord.lat, targetCoord.lng]} icon={defaultIcon}>
                <Popup>
                    <div className="font-bold text-slate-800">📍 今日預計騎乘終點</div>
                    <div className="text-xs text-slate-500">周圍半徑 10 公里探索區</div>
                </Popup>
            </Marker>
        )}

        {/* Spots Markers */}
        {spots.map(spot => {
            const isHotel = spot.type === "accommodation";
            const isFood = spot.type === "food";
            const isSelectedHotel = isHotel && spot.id === activeAccommodationId;
            const isSelectedFood = !isHotel && activeFoodIds?.includes(spot.id);
            const isSelected = isSelectedHotel || isSelectedFood;
            
            let iconToUse = defaultIcon;
            if (isSelectedHotel) iconToUse = selectedHotelIcon;
            else if (isHotel) iconToUse = hotelIcon;
            else if (isFood) iconToUse = foodIcon;

            return (
                <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={iconToUse}>
                    <Popup>
                        <div className="space-y-3 min-w-[200px]">
                            <div className="space-y-1 border-b pb-2">
                                <div className="flex items-center gap-1.5 font-bold text-[15px] text-slate-800">
                                    {isHotel ? <BedDouble className="w-4 h-4 text-red-500" /> : <Utensils className="w-4 h-4 text-yellow-600" />}
                                    {spot.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                                        {spot.subType === 'hotel' ? '飯店' : spot.subType === 'hostel' ? '青旅' : spot.subType === 'convenience-store' ? '便利店' : '餐廳'}
                                    </span>
                                    <span className="text-sm font-bold text-primary">Est. ${spot.price}</span>
                                </div>
                                {spot.county && (
                                  <div className="text-[10px] text-slate-400">{spot.county}</div>
                                )}
                            </div>
                            
                            <Button 
                                size="sm" 
                                variant={isSelected ? "secondary" : "default"}
                                className={`w-full text-xs font-bold ${isSelected ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}`}
                                onClick={() => {
                                    if (isHotel) onSelectAccommodation(spot.id);
                                    else onToggleFood(spot.id);
                                }}
                            >
                                {isSelected ? (
                                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline-block" /> 已加入行程</>
                                ) : (
                                    <><Plus className="w-3.5 h-3.5 mr-1.5 inline-block" /> 加入行程 / 扣除預算</>
                                )}
                            </Button>
                        </div>
                    </Popup>
                </Marker>
            )
        })}
      </MapContainer>
    </div>
  );
}
