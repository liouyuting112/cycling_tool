// Test Overpass API directly
const lat = 24.87;
const lng = 121.05;
const radius = 15000;

const query = `[out:json][timeout:15];(nwr["tourism"~"hotel|hostel|guest_house"](around:${radius},${lat},${lng}););out center 10;`;

async function test() {
  // Test overpass.kumi.systems
  console.log("--- Testing overpass.kumi.systems ---");
  try {
    const r1 = await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    const d1 = await r1.json();
    console.log("Status:", r1.status, "Elements:", d1.elements?.length || 0);
    d1.elements?.slice(0, 5).forEach(e => console.log(" -", e.tags?.name, "| lat:", e.lat || e.center?.lat, "| lng:", e.lon || e.center?.lon));
  } catch (e) {
    console.log("KUMI ERROR:", e.message);
  }

  // Test overpass-api.de
  console.log("\n--- Testing overpass-api.de ---");
  try {
    const r2 = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    const d2 = await r2.json();
    console.log("Status:", r2.status, "Elements:", d2.elements?.length || 0);
    d2.elements?.slice(0, 5).forEach(e => console.log(" -", e.tags?.name, "| lat:", e.lat || e.center?.lat, "| lng:", e.lon || e.center?.lon));
  } catch (e) {
    console.log("DE ERROR:", e.message);
  }

  // Test lz4.overpass-api.de  
  console.log("\n--- Testing lz4.overpass-api.de ---");
  try {
    const r3 = await fetch("https://lz4.overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    const d3 = await r3.json();
    console.log("Status:", r3.status, "Elements:", d3.elements?.length || 0);
    d3.elements?.slice(0, 5).forEach(e => console.log(" -", e.tags?.name, "| lat:", e.lat || e.center?.lat, "| lng:", e.lon || e.center?.lon));
  } catch (e) {
    console.log("LZ4 ERROR:", e.message);
  }
}

test();
