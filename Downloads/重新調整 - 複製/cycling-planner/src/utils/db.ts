export interface Point { lat: number; lng: number; }
export interface Spot {
  id: string; name: string;
  type: "accommodation" | "food" | "attraction" | "emergency";
  subType?: "convenience-store" | "restaurant" | "hotel" | "hostel" | "repair" | "cafe";
  county: string; price: number; lat: number; lng: number; tags: string[];
  // Optional: used to make Google Maps search query more precise (name + address).
  address?: string;
}
export interface Route {
  id: string; name: string; description: string;
  totalDistance: number; recommendedDays: number; path: Point[]; counties: string[];
}

export const STATION_COORDS: Record<string, Point> = {
  "基隆車站": { lat: 25.1318, lng: 121.7397 },
  "台北車站": { lat: 25.0480, lng: 121.5170 },
  "新北板橋車站": { lat: 25.0143, lng: 121.4637 },
  "桃園車站": { lat: 24.9892, lng: 121.3135 },
  "新竹車站": { lat: 24.8015, lng: 120.9715 },
  "苗栗車站": { lat: 24.5700, lng: 120.8200 },
  "台中車站": { lat: 24.1370, lng: 120.6850 },
  "彰化車站": { lat: 24.0815, lng: 120.5385 },
  "南投車站 (員林接駁)": { lat: 23.9580, lng: 120.5680 },
  "雲林斗六車站": { lat: 23.7100, lng: 120.4310 },
  "嘉義車站": { lat: 23.4800, lng: 120.4490 },
  "台南車站": { lat: 22.9970, lng: 120.2130 },
  "高雄車站": { lat: 22.6394, lng: 120.3024 },
  "屏東車站": { lat: 22.6698, lng: 120.4862 },
  "宜蘭車站": { lat: 24.7540, lng: 121.7530 },
  "花蓮車站": { lat: 23.9930, lng: 121.6010 },
  "台東車站": { lat: 22.7554, lng: 121.1436 },
};

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLng / 2);
  const v = s1 * s1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
  return R * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

export function getNearestPointIndex(path: Point[], target: Point): number {
  let minIdx = 0, minDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = haversineKm(path[i], target);
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

// ========== 環島一號線 ~120 points 加密版 ==========
// 按順時針：基隆→台北→桃園→新竹→苗栗→台中→彰化→雲林→嘉義→台南→高雄
// →屏東(墾丁)→台東→花蓮→宜蘭→基隆
const CIRCLE_1_PATH: Point[] = [
  // 基隆 → 台北
  {lat:25.1318,lng:121.7397},{lat:25.1150,lng:121.7280},{lat:25.0900,lng:121.6950},
  {lat:25.0600,lng:121.6500},{lat:25.0480,lng:121.5170},
  // 台北 → 桃園
  {lat:25.0340,lng:121.4650},{lat:24.9980,lng:121.4380},{lat:24.9550,lng:121.3700},
  {lat:24.9536,lng:121.2250},
  // 桃園 → 新竹
  {lat:24.9400,lng:121.1700},{lat:24.9100,lng:121.1200},{lat:24.8700,lng:121.0500},
  {lat:24.8300,lng:121.0100},{lat:24.8015,lng:120.9715},
  // 新竹 → 苗栗
  {lat:24.7500,lng:120.9300},{lat:24.6900,lng:120.8800},{lat:24.6300,lng:120.8500},
  {lat:24.5700,lng:120.8200},
  // 苗栗 → 台中
  {lat:24.5100,lng:120.7800},{lat:24.4400,lng:120.7500},{lat:24.3500,lng:120.7300},
  {lat:24.2700,lng:120.7100},{lat:24.1960,lng:120.6970},{lat:24.1370,lng:120.6850},
  // 台中 → 彰化
  {lat:24.1000,lng:120.6500},{lat:24.0604,lng:120.5420},
  // 彰化 → 雲林
  {lat:24.0000,lng:120.5000},{lat:23.9300,lng:120.4700},{lat:23.8600,lng:120.4500},
  {lat:23.7900,lng:120.4300},{lat:23.7100,lng:120.4310},
  // 雲林 → 嘉義
  {lat:23.6500,lng:120.4350},{lat:23.5800,lng:120.4400},{lat:23.4800,lng:120.4490},
  // 嘉義 → 台南
  {lat:23.4000,lng:120.3800},{lat:23.3200,lng:120.3200},{lat:23.2400,lng:120.2900},
  {lat:23.1600,lng:120.2600},{lat:23.0800,lng:120.2300},{lat:22.9970,lng:120.2130},
  // 台南 → 高雄
  {lat:22.9300,lng:120.2600},{lat:22.8500,lng:120.2800},{lat:22.7700,lng:120.2900},
  {lat:22.7000,lng:120.3000},{lat:22.6394,lng:120.3024},
  // 高雄 → 屏東 → 恆春 (密集！繞墾丁半島)
  {lat:22.5800,lng:120.3200},{lat:22.5200,lng:120.3600},{lat:22.4700,lng:120.4200},
  {lat:22.4200,lng:120.4500},{lat:22.3700,lng:120.4700},{lat:22.3200,lng:120.5000},
  {lat:22.2700,lng:120.5400},{lat:22.2200,lng:120.5800},{lat:22.1700,lng:120.6200},
  {lat:22.1200,lng:120.6600},{lat:22.0700,lng:120.6900},{lat:22.0300,lng:120.7100},
  // 恆春半島南端 (鵝鑾鼻) — 沿海岸走
  {lat:21.9900,lng:120.7350},{lat:21.9600,lng:120.7600},{lat:21.9450,lng:120.7900},
  {lat:21.9400,lng:120.8200},{lat:21.9500,lng:120.8500},{lat:21.9700,lng:120.8700},
  // 南迴 → 台東 (沿海岸！)
  {lat:22.0000,lng:120.8900},{lat:22.0300,lng:120.9050},{lat:22.0600,lng:120.9150},
  {lat:22.0900,lng:120.9250},{lat:22.1200,lng:120.9350},{lat:22.1500,lng:120.9400},
  {lat:22.1930,lng:120.9450},{lat:22.2300,lng:120.9500},{lat:22.2800,lng:120.9600},
  {lat:22.3300,lng:120.9700},{lat:22.3800,lng:120.9800},{lat:22.4300,lng:120.9900},
  {lat:22.4800,lng:121.0000},{lat:22.5300,lng:121.0100},{lat:22.5800,lng:121.0300},
  {lat:22.6300,lng:121.0500},{lat:22.6800,lng:121.0700},{lat:22.7200,lng:121.1000},
  {lat:22.7554,lng:121.1436},
  // 台東 → 花蓮 (東海岸密集！沿台11線)
  {lat:22.8000,lng:121.1500},{lat:22.8500,lng:121.1550},{lat:22.9000,lng:121.1600},
  {lat:22.9500,lng:121.1650},{lat:23.0000,lng:121.1500},{lat:23.0500,lng:121.1450},
  {lat:23.1000,lng:121.1500},{lat:23.1500,lng:121.1600},{lat:23.2000,lng:121.1800},
  {lat:23.2500,lng:121.2000},{lat:23.3000,lng:121.2300},{lat:23.3500,lng:121.2600},
  {lat:23.4000,lng:121.3000},{lat:23.4500,lng:121.3200},{lat:23.5000,lng:121.3500},
  {lat:23.5500,lng:121.3700},{lat:23.6000,lng:121.3900},{lat:23.6500,lng:121.4200},
  {lat:23.7000,lng:121.4500},{lat:23.7500,lng:121.4700},{lat:23.8000,lng:121.4800},
  {lat:23.8500,lng:121.5000},{lat:23.9000,lng:121.5400},{lat:23.9500,lng:121.5700},
  {lat:23.9930,lng:121.6010},
  // 花蓮 → 宜蘭 (蘇花沿線)
  {lat:24.0300,lng:121.6100},{lat:24.0700,lng:121.6200},{lat:24.1200,lng:121.6300},
  {lat:24.1700,lng:121.6400},{lat:24.2200,lng:121.6500},{lat:24.2700,lng:121.6600},
  {lat:24.3200,lng:121.6800},{lat:24.3700,lng:121.7000},{lat:24.4200,lng:121.7100},
  {lat:24.4700,lng:121.7200},{lat:24.5200,lng:121.7350},{lat:24.5700,lng:121.7450},
  {lat:24.6200,lng:121.7500},{lat:24.6700,lng:121.7550},{lat:24.7200,lng:121.7530},
  {lat:24.7540,lng:121.7530},
  // 宜蘭 → 基隆 (東北角)
  {lat:24.7900,lng:121.7550},{lat:24.8300,lng:121.7600},{lat:24.8700,lng:121.7650},
  {lat:24.9100,lng:121.7700},{lat:24.9500,lng:121.7800},{lat:24.9900,lng:121.7850},
  {lat:25.0300,lng:121.7800},{lat:25.0700,lng:121.7700},{lat:25.1000,lng:121.7550},
  {lat:25.1318,lng:121.7397},
];

export const ROUTES: Route[] = [
  {
    id: "route-circle-1",
    name: "環島一號線 (標準大環島)",
    description: "全台標示最完整路線，順時針環行。約 940km。",
    totalDistance: 940,
    recommendedDays: 9,
    path: CIRCLE_1_PATH,
    counties: ["基隆","台北","新北","桃園","新竹","苗栗","台中","彰化","雲林","嘉義","台南","高雄","屏東","台東","花蓮","宜蘭"],
  },
  {
    id: "route-west",
    name: "西部走廊 (台北→高雄)",
    description: "沿西部平原直行，路況平坦適合新手。約 380km。",
    totalDistance: 380,
    recommendedDays: 4,
    path: CIRCLE_1_PATH.slice(3, 45),
    counties: ["台北","桃園","新竹","苗栗","台中","彰化","雲林","嘉義","台南","高雄"],
  },
  {
    id: "route-east",
    name: "花東縱谷海線 (台東→花蓮)",
    description: "東部絕美山海景色，被譽為最美單車路線。約 180km。",
    totalDistance: 180,
    recommendedDays: 3,
    path: CIRCLE_1_PATH.slice(74, 100),
    counties: ["台東","花蓮"],
  },
  {
    id: "route-south",
    name: "南迴公路 (高雄→台東)",
    description: "穿越恆春半島的挑戰路線。約 200km。",
    totalDistance: 200,
    recommendedDays: 3,
    path: CIRCLE_1_PATH.slice(44, 75),
    counties: ["高雄","屏東","台東"],
  },
];

export const SPOT_DB: Spot[] = [];
