import { Spot, haversineKm } from "./db";

type OverpassTags = {
  name?: string;
  tourism?: string;
  amenity?: string;
  shop?: string;
  "addr:housenumber"?: string;
  "addr:street"?: string;
  "addr:city"?: string;
  "addr:county"?: string;
};

type OverpassCenter = { lat: number; lon: number };

type OverpassElement = {
  id: number | string;
  tags?: OverpassTags;
  lat?: number;
  lon?: number;
  center?: OverpassCenter;
};

const PRICES: Record<string, number> = {
  hotel: 2500, guest_house: 2000, motel: 1800, hostel: 800,
  convenience: 150, restaurant: 300, fast_food: 150, cafe: 200, bicycle: 0,
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

/**
 * 搜尋旅館：半徑 15km → 25km → 40km，自動擴大直到找到
 * 搜尋美食：半徑固定 3km，最多回傳 20 筆（離目標最近排序）
 */
export async function fetchOSMSpotsWithFallback(
  lat: number, lng: number,
  type: "accommodation" | "food" | "repair" | "all" = "all"
): Promise<Spot[]> {
  if (type === "accommodation") {
    // 住宿只要在「停靠點附近」：逐步擴大，但最後不要到太遠。
    for (const radius of [12000, 18000, 25000]) {
      const spots = await queryOverpass(lat, lng, radius, "accommodation", 30);
      if (spots.length > 0) return spots;
    }
    return [];
  }

  if (type === "food") {
    // 美食半徑逐步擴大，避免 OSM 資料不足造成「選了旅館卻沒有美食」
    for (const [radius, limit] of [
      [3000, 20],
      [5000, 25],
      [8000, 30],
    ] as const) {
      const spots = await queryOverpass(lat, lng, radius, "food", limit);
      if (spots.length > 0) return spots;
    }
    return [];
  }

  if (type === "repair") {
    return queryOverpass(lat, lng, 15000, "repair", 10);
  }

  // type === "all": 先找旅館，再找美食（分開查詢控制數量）
  let hotels: Spot[] = [];
  for (const radius of [12000, 18000, 25000]) {
    hotels = await queryOverpass(lat, lng, radius, "accommodation", 30);
    if (hotels.length > 0) break;
  }

  let food: Spot[] = [];
  for (const [radius, limit] of [
    [3000, 20],
    [5000, 25],
    [8000, 30],
  ] as const) {
    food = await queryOverpass(lat, lng, radius, "food", limit);
    if (food.length > 0) break;
  }
  const repair = await queryOverpass(lat, lng, 15000, "repair", 10);
  return [...hotels, ...food, ...repair];
}

async function queryOverpass(
  lat: number, lng: number, radius: number,
  category: "accommodation" | "food" | "repair",
  limit: number
): Promise<Spot[]> {
  let filters = "";
  if (category === "accommodation") {
    filters = `nwr["tourism"~"hotel|hostel|guest_house|motel"](around:${radius},${lat},${lng});`;
  } else if (category === "food") {
    filters = `nwr["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lng});`;
    filters += `nwr["shop"="convenience"](around:${radius},${lat},${lng});`;
  } else {
    filters = `nwr["shop"="bicycle"](around:${radius},${lat},${lng});`;
  }

  const query = `[out:json][timeout:15];(${filters});out center ${limit};`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OverpassElement[] };
      if (!data.elements || !Array.isArray(data.elements)) continue;
      const spots = parseElements(data.elements, category);
      if (spots.length > 0) {
        // 按距離排序
        const center = { lat, lng };
        spots.sort((a, b) => haversineKm(a, center) - haversineKm(b, center));
        return spots.slice(0, limit);
      }
    } catch { continue; }
  }
  return [];
}

function parseElements(elements: OverpassElement[], _category: string): Spot[] {
  return elements
    .filter((el): el is OverpassElement & { tags: OverpassTags } => Boolean(el.tags?.name))
    .map((el) => {
      const t = el.tags;
      let spotType: Spot["type"] = "food";
      let subType: Spot["subType"] = "restaurant";
      let price = 300;

      if (t.tourism === "hotel") { spotType = "accommodation"; subType = "hotel"; price = PRICES.hotel; }
      else if (t.tourism === "guest_house" || t.tourism === "motel") { spotType = "accommodation"; subType = "hotel"; price = PRICES.guest_house; }
      else if (t.tourism === "hostel") { spotType = "accommodation"; subType = "hostel"; price = PRICES.hostel; }
      else if (t.shop === "bicycle") { spotType = "emergency"; subType = "repair"; price = 0; }
      else if (t.shop === "convenience") { spotType = "food"; subType = "convenience-store"; price = PRICES.convenience; }
      else if (t.amenity === "cafe") { spotType = "food"; subType = "cafe"; price = PRICES.cafe; }
      else if (t.amenity === "fast_food") { spotType = "food"; subType = "restaurant"; price = PRICES.fast_food; }
      else if (t.amenity === "restaurant") { spotType = "food"; subType = "restaurant"; price = PRICES.restaurant; }
      else return null;

      const sLat = el.lat || el.center?.lat;
      const sLng = el.lon || el.center?.lon;
      if (!sLat || !sLng) return null;

      return {
        id: `osm-${el.id}`,
        name: t.name as string,
        type: spotType,
        subType,
        county: t["addr:city"] || t["addr:county"] || "",
        address: (t["addr:street"] || t["addr:housenumber"])
          ? `${(t["addr:street"] || "").trim()}${t["addr:street"] && t["addr:housenumber"] ? " " : ""}${(t["addr:housenumber"] || "").trim()}`
          : undefined,
        price,
        lat: sLat,
        lng: sLng,
        tags: ["OSM"],
      } as Spot;
    })
    .filter(Boolean) as Spot[];
}
