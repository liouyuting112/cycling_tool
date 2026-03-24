import { writeFile } from "node:fs/promises";

const API_KEY = "AIzaSyAP5MQ0ECHEiGHzTDBtdeMC33zVJx1XcvM";

const WAYPOINTS = [
  { id: "wp4-hun", name: "花蓮車站", lat: 23.993, lng: 121.601 },
  { id: "wp4-ila", name: "宜蘭車站", lat: 24.754, lng: 121.753 },
  { id: "wp4-tpe", name: "台北車站", lat: 25.048, lng: 121.517 },
];

const TARGETS = { hotel: 6, hostel: 6, convenience: 6, restaurantCheap: 6, restaurantExpensive: 6 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toBudgetTier(pricePerNight) { if (pricePerNight <= 1800) return "low"; if (pricePerNight <= 4200) return "mid"; return "high"; }
function hotelPrice(priceLevel, subtype) { if (subtype === "hostel") { const map = { 1: 900, 2: 1400, 3: 2000, 4: 2800 }; return map[priceLevel] ?? 1400; } const map = { 1: 2800, 2: 3500, 3: 5000, 4: 7600 }; return map[priceLevel] ?? 3500; }
function restaurantPrice(priceLevel) { const map = { 1: 180, 2: 260, 3: 420, 4: 650 }; return map[priceLevel] ?? 260; }
function restaurantTier(priceLevel) { return priceLevel === 3 || priceLevel === 4 ? "expensive" : "cheap"; }
function pickUnique(candidates, count, seen) { const out = []; for (const c of candidates) { if (!c.place_id) continue; if (seen.has(c.place_id)) continue; seen.add(c.place_id); out.push(c); if (out.length >= count) break; } return out; }
async function fetchJson(url) { const res = await fetch(url); return res.json(); }
async function nearbySearch({ lat, lng, radius, type, keyword = "", pages = 2 }) {
  const all = []; let pageToken = "";
  for (let i = 0; i < pages; i++) {
    let url;
    if (pageToken) { await sleep(2200); url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(pageToken)}&key=${API_KEY}`; }
    else { const params = new URLSearchParams({ location: `${lat},${lng}`, radius: String(radius), type, key: API_KEY }); if (keyword) params.set("keyword", keyword); url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`; }
    const data = await fetchJson(url); if (data.status !== "OK" && data.status !== "ZERO_RESULTS") break; if (Array.isArray(data.results)) all.push(...data.results); pageToken = data.next_page_token || ""; if (!pageToken) break;
  } return all;
}
async function placeDetails(placeId) { const fields = "name,geometry/location,price_level,formatted_address,types"; const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${API_KEY}`; const data = await fetchJson(url); if (data.status !== "OK") return null; return data.result; }
async function enrichMany(candidates, limit, mapFn) { const out = []; for (const c of candidates) { if (out.length >= limit) break; const d = await placeDetails(c.place_id); if (!d?.geometry?.location) continue; const item = mapFn(d, c); if (!item) continue; out.push(item); await sleep(80); } return out; }

async function buildForWaypoint(wp) {
  const seenHotels = new Set(); const seenHostels = new Set(); const seenConv = new Set(); const seenRest = new Set();
  const hotelCandidates = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 12000, type: "lodging", keyword: "hotel", pages: 3 });
  const hostelCandidates = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 12000, type: "lodging", keyword: "hostel", pages: 3 });
  const lodgingCandidates = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 12000, type: "lodging", pages: 3 });
  const convCandidates = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 8000, type: "convenience_store", pages: 2 });
  const restaurantCandidates = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 12000, type: "restaurant", pages: 3 });
  const restaurantBuffet = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 12000, type: "restaurant", keyword: "buffet", pages: 2 });
  const restaurantSteak = await nearbySearch({ lat: wp.lat, lng: wp.lng, radius: 12000, type: "restaurant", keyword: "steak", pages: 2 });

  const hotelPicked = pickUnique(hotelCandidates, TARGETS.hotel, seenHotels);
  const hostelPicked = pickUnique(hostelCandidates, TARGETS.hostel, seenHostels);
  if (hostelPicked.length < TARGETS.hostel) hostelPicked.push(...pickUnique(lodgingCandidates, TARGETS.hostel - hostelPicked.length, seenHostels));
  const convPicked = pickUnique(convCandidates, TARGETS.convenience, seenConv);
  const restPicked = pickUnique([...restaurantCandidates, ...restaurantBuffet, ...restaurantSteak], 80, seenRest);

  const accommodations = [];
  accommodations.push(...(await enrichMany(hotelPicked, TARGETS.hotel, (d, c) => ({ id: `acc-${wp.id}-${c.place_id}`, waypoint_id: wp.id, name: d.name || c.name, subType: "hotel", budget_tier: toBudgetTier(hotelPrice(d.price_level, "hotel")), price_per_night: hotelPrice(d.price_level, "hotel"), lat: d.geometry.location.lat, lng: d.geometry.location.lng, place_id: c.place_id, address: d.formatted_address || "" }))));
  accommodations.push(...(await enrichMany(hostelPicked, TARGETS.hostel, (d, c) => ({ id: `acc-${wp.id}-${c.place_id}`, waypoint_id: wp.id, name: d.name || c.name, subType: "hostel", budget_tier: toBudgetTier(hotelPrice(d.price_level, "hostel")), price_per_night: hotelPrice(d.price_level, "hostel"), lat: d.geometry.location.lat, lng: d.geometry.location.lng, place_id: c.place_id, address: d.formatted_address || "" }))));

  const restaurants = [];
  restaurants.push(...(await enrichMany(convPicked, TARGETS.convenience, (d, c) => ({ id: `res-${wp.id}-${c.place_id}`, waypoint_id: wp.id, name: d.name || c.name, diet_type: "convenience-store", price_tier: "standard", estimated_cost: 180, lat: d.geometry.location.lat, lng: d.geometry.location.lng, place_id: c.place_id, address: d.formatted_address || "" }))));

  const cheap = []; const expensive = [];
  for (const c of restPicked) {
    if (cheap.length >= TARGETS.restaurantCheap && expensive.length >= TARGETS.restaurantExpensive) break;
    const d = await placeDetails(c.place_id); if (!d?.geometry?.location) continue;
    const tier = restaurantTier(d.price_level);
    const item = { id: `res-${wp.id}-${c.place_id}`, waypoint_id: wp.id, name: d.name || c.name, diet_type: "restaurant", price_tier: tier, estimated_cost: restaurantPrice(d.price_level), lat: d.geometry.location.lat, lng: d.geometry.location.lng, place_id: c.place_id, address: d.formatted_address || "" };
    if (tier === "cheap" && cheap.length < TARGETS.restaurantCheap) cheap.push(item);
    if (tier === "expensive" && expensive.length < TARGETS.restaurantExpensive) expensive.push(item);
    await sleep(80);
  }
  if (expensive.length < TARGETS.restaurantExpensive) {
    for (const c of restPicked) {
      if (expensive.length >= TARGETS.restaurantExpensive) break;
      const d = await placeDetails(c.place_id); if (!d?.geometry?.location) continue;
      if (restaurantTier(d.price_level) !== "cheap") continue;
      const item = { id: `res-${wp.id}-${c.place_id}`, waypoint_id: wp.id, name: d.name || c.name, diet_type: "restaurant", price_tier: "expensive", estimated_cost: Math.max(420, restaurantPrice(d.price_level)), lat: d.geometry.location.lat, lng: d.geometry.location.lng, place_id: c.place_id, address: d.formatted_address || "" };
      if (!expensive.some((e) => e.place_id === item.place_id)) expensive.push(item);
      await sleep(80);
    }
  }
  restaurants.push(...cheap, ...expensive);
  return { accommodations, restaurants };
}

async function main() {
  const output = { Routes: [{ id: "northeast-corridor-4", name: "北東走廊（花蓮→宜蘭→台北）", type: "northeast-corridor", recommended_days: 3, supported_start_stations: WAYPOINTS.map((w) => w.name) }], Waypoints: WAYPOINTS, Accommodations: [], Restaurants: [] };
  for (const wp of WAYPOINTS) { const block = await buildForWaypoint(wp); output.Accommodations.push(...block.accommodations); output.Restaurants.push(...block.restaurants); }
  const json = JSON.stringify(output, null, 2);
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  if (outArg) { const outPath = outArg.slice("--out=".length); await writeFile(outPath, json, "utf8"); console.log(`written: ${outPath}`); return; }
  console.log(json);
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });

