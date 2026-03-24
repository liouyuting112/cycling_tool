import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat") || "24.87";
    const lng = searchParams.get("lng") || "121.05";
    const radius = searchParams.get("radius") || "15000";
    const type = searchParams.get("type") || "all";

    let queryParts = "";

    if (type === "accommodation" || type === "all") {
      queryParts += `nwr["tourism"~"hotel|hostel|guest_house|motel"](around:${radius},${lat},${lng});`;
    }

    if (type === "food" || type === "all") {
      queryParts += `nwr["shop"="convenience"](around:${radius},${lat},${lng});`;
      queryParts += `nwr["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lng});`;
    }

    queryParts += `nwr["shop"="bicycle"](around:${radius},${lat},${lng});`;

    const query = "[out:json][timeout:25];(" + queryParts + ");out center;";
    const bodyStr = "data=" + encodeURIComponent(query);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyStr,
    });

    if (!res.ok) {
      // Try fallback
      const res2 = await fetch("https://lz4.overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyStr,
      });

      if (!res2.ok) {
        return NextResponse.json({ elements: [], error: "All Overpass servers returned error" });
      }

      const json2 = await res2.json();
      return NextResponse.json(json2);
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ elements: [], error: String(err) });
  }
}
