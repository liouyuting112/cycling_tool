import { NextResponse } from "next/server";

type Category = "hotel" | "restaurant" | "restaurant-budget" | "restaurant-luxury" | "restaurant-vegetarian" | "convenience";
type AccommodationType = "民宿" | "飯店" | "背包客棧";
type DietPreference = "葷食" | "素食" | "無限制";

type PlacesRequest = {
  city: string;
  category: Category;
  accommodationType?: AccommodationType;
  dietPreference?: DietPreference;
  limit?: number;
  lat?: number;
  lng?: number;
  radius?: number;
};

type PlaceResult = {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  estimatedCost: number;
};

function buildQuery(body: PlacesRequest) {
  const limit = Math.max(5, Math.min(8, body.limit || 8));

  if (body.category === "hotel") {
    const accommodationMap: Record<AccommodationType, string> = {
      民宿: "民宿",
      飯店: "飯店",
      背包客棧: "背包客棧",
    };
    return {
      textQuery: `${body.city} ${accommodationMap[body.accommodationType || "飯店"]}`,
      includedType: "lodging",
      pageSize: limit,
      kind: "hotel",
    };
  }

  if (body.category === "convenience") {
    return {
      textQuery: `${body.city} 便利商店`,
      includedType: "convenience_store",
      pageSize: limit,
      kind: "convenience",
    };
  }

  if (body.category === "restaurant-budget") {
    return {
      textQuery: `${body.city} 平價餐廳`,
      includedType: "restaurant",
      pageSize: limit,
      kind: "restaurant-budget",
    };
  }
  if (body.category === "restaurant-luxury") {
    return {
      textQuery: `${body.city} 高級餐廳`,
      includedType: "restaurant",
      pageSize: limit,
      kind: "restaurant-luxury",
    };
  }
  if (body.category === "restaurant-vegetarian") {
    return {
      textQuery: `${body.city} 素食餐廳`,
      includedType: "vegetarian_restaurant",
      pageSize: limit,
      kind: "restaurant-vegetarian",
    };
  }
  return {
    textQuery: `${body.city} 餐廳`,
    includedType: "restaurant",
    pageSize: limit,
    kind: "restaurant",
  };
}

async function searchPlaces(apiKey: string, payload: Record<string, unknown>) {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.location",
    "places.googleMapsUri",
    "places.priceLevel",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API 失敗: ${text}`);
  }

  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      location?: { latitude?: number; longitude?: number };
      googleMapsUri?: string;
      priceLevel?: string;
    }>;
  };

  const kind = String(payload.kind || "restaurant");
  const places = (data.places || []).map((p): PlaceResult => {
    let estimatedCost = 300;
    if (kind === "hotel") {
      const map: Record<string, number> = { PRICE_LEVEL_FREE: 1200, PRICE_LEVEL_INEXPENSIVE: 1800, PRICE_LEVEL_MODERATE: 2600, PRICE_LEVEL_EXPENSIVE: 3800, PRICE_LEVEL_VERY_EXPENSIVE: 5200 };
      estimatedCost = map[p.priceLevel || "PRICE_LEVEL_MODERATE"] || 2600;
    } else if (kind === "convenience") {
      estimatedCost = 150;
    } else if (kind === "restaurant-budget") {
      estimatedCost = 220;
    } else if (kind === "restaurant-luxury") {
      estimatedCost = 680;
    } else if (kind === "restaurant-vegetarian") {
      estimatedCost = 260;
    } else {
      estimatedCost = 320;
    }

    return {
      id: p.id || "",
      name: p.displayName?.text || "未知店家",
      address: p.formattedAddress || "",
      phone: p.nationalPhoneNumber || "",
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      mapsUrl:
        p.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          p.displayName?.text || p.formattedAddress || ""
        )}`,
      estimatedCost,
    };
  });

  return places.filter((p) => p.id && p.lat && p.lng);
}

async function searchNearby(apiKey: string, payload: Record<string, unknown>) {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.location",
    "places.googleMapsUri",
    "places.priceLevel",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places Nearby 失敗: ${text}`);
  }

  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      location?: { latitude?: number; longitude?: number };
      googleMapsUri?: string;
      priceLevel?: string;
    }>;
  };

  const kind = String(payload.kind || "restaurant");
  const places = (data.places || []).map((p): PlaceResult => {
    let estimatedCost = 300;
    if (kind === "hotel") {
      const map: Record<string, number> = { PRICE_LEVEL_FREE: 1200, PRICE_LEVEL_INEXPENSIVE: 1800, PRICE_LEVEL_MODERATE: 2600, PRICE_LEVEL_EXPENSIVE: 3800, PRICE_LEVEL_VERY_EXPENSIVE: 5200 };
      estimatedCost = map[p.priceLevel || "PRICE_LEVEL_MODERATE"] || 2600;
    } else if (kind === "convenience") estimatedCost = 150;
    else if (kind === "restaurant-budget") estimatedCost = 220;
    else if (kind === "restaurant-luxury") estimatedCost = 680;
    else if (kind === "restaurant-vegetarian") estimatedCost = 260;
    else estimatedCost = 320;

    return {
      id: p.id || "",
      name: p.displayName?.text || "未知店家",
      address: p.formattedAddress || "",
      phone: p.nationalPhoneNumber || "",
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      mapsUrl:
        p.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          p.displayName?.text || p.formattedAddress || ""
        )}`,
      estimatedCost,
    };
  });

  return places.filter((p) => p.id && p.lat && p.lng);
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "缺少 NEXT_PUBLIC_GOOGLE_PLACES_API_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as PlacesRequest;
    if (!body.city || !body.category) {
      return NextResponse.json({ error: "缺少 city/category" }, { status: 400 });
    }

    const query = buildQuery(body);
    let places: PlaceResult[];
    if (body.lat && body.lng) {
      const includedType = String(query.includedType);
      places = await searchNearby(apiKey, {
        includedTypes: [includedType],
        maxResultCount: Math.max(5, Math.min(8, body.limit || 8)),
        locationRestriction: {
          circle: {
            center: { latitude: body.lat, longitude: body.lng },
            radius: Math.max(500, Math.min(50000, body.radius || 6000)),
          },
        },
        rankPreference: "DISTANCE",
        kind: query.kind,
      });
    } else {
      places = await searchPlaces(apiKey, query);
    }

    // 素食若太少，降級到一般餐廳補足
    if (body.category === "restaurant-vegetarian" && places.length < 5) {
      places = await searchPlaces(apiKey, {
        textQuery: `${body.city} 餐廳`,
        includedType: "restaurant",
        pageSize: Math.max(5, Math.min(8, body.limit || 8)),
        kind: "restaurant",
      });
    }

    return NextResponse.json({ places });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

