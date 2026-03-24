type CsvWaypointType = "start" | "attraction" | "food" | "accommodation" | "ride" | string;

interface CsvWaypoint {
  type: CsvWaypointType;
  time: string;
  name: string;
}

interface CsvDayData {
  day: number;
  waypoints: CsvWaypoint[];
}

/**
 * Generates a Google Maps Directions URL for cycling mode
 */
export function generateGoogleMapsUrl(waypoints: { name: string }[]): string {
  if (waypoints.length < 2) return "#";

  const origin = encodeURIComponent(waypoints[0].name);
  const destination = encodeURIComponent(waypoints[waypoints.length - 1].name);

  // Middle waypoints
  let waypointsParam = "";
  if (waypoints.length > 2) {
    const middleWaypoints = waypoints.slice(1, waypoints.length - 1);
    waypointsParam = "&waypoints=" + middleWaypoints.map((w) => encodeURIComponent(w.name)).join("|");
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=bicycling`;
}

/**
 * Generates CSV content for export
 */
export function generateCsvExport(itinerary: CsvDayData[]): string {
  // Add BOM for Excel UTF8 compatibility
  let csv = "\uFEFFDay,Time,Location,Type,Notes\n"; 

  const typeLabelMap: Record<string, string> = {
    start: "出發",
    attraction: "景點",
    food: "餐廳",
    accommodation: "住宿",
    ride: "騎乘",
  };
  
  itinerary.forEach((dayData) => {
    dayData.waypoints.forEach((wp) => {
      const typeLabel = typeLabelMap[wp.type] || "其他";

      // Wrap string in quotes to avoid CSV comma issues
      csv += `${dayData.day},${wp.time},"${wp.name}",${typeLabel},""\n`;
    });
  });
  
  return csv;
}
