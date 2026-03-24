export interface InputWaypoint {
  id: string;
  name: string;
  type: "start" | "attraction" | "food" | "accommodation" | "ride";
  distanceToNext?: number; // km, from this point to the next
}

export interface CalculatedWaypoint extends InputWaypoint {
  arrivalTime: string;
  leaveTime: string;
}

export interface DayCalculationResult {
  waypoints: CalculatedWaypoint[];
  totalRidingHours: number;
  warning?: string;
}

/**
 * Parses time string "HH:MM" into minutes from midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight into "HH:MM" string
 */
function formatTime(minutesTotal: number): string {
  const hours = Math.floor(minutesTotal / 60) % 24;
  const minutes = Math.floor(minutesTotal % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Core function to calculate itinerary times based on distances, speed, and stay durations.
 */
export function calculateItinerary(
  waypoints: InputWaypoint[],
  speedLevel: 15 | 20 | 25,
  dailyStartTime: string = "08:00",
  stayDurations: Record<string, number> = { attraction: 0.5, food: 1, start: 0, accommodation: 0 }
): DayCalculationResult {
  const resultWaypoints: CalculatedWaypoint[] = [];
  let currentTime = parseTime(dailyStartTime);
  let totalRidingMinutes = 0;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    
    // Arrival time is current accumulated time
    const arrivalTimeStr = formatTime(currentTime);
    
    // Stay duration
    const stayHours = stayDurations[wp.type] || 0;
    const stayMinutes = stayHours * 60;
    
    // Calculate leave time
    currentTime += stayMinutes;
    const leaveTimeStr = formatTime(currentTime);

    resultWaypoints.push({
      ...wp,
      arrivalTime: arrivalTimeStr,
      leaveTime: leaveTimeStr,
    });

    // Ride time to NEXT waypoint (if applicable)
    if (wp.distanceToNext !== undefined) {
      const rideHours = wp.distanceToNext / speedLevel;
      const rideMinutes = rideHours * 60;
      currentTime += rideMinutes;
      totalRidingMinutes += rideMinutes;
    }
  }

  const totalRidingHours = totalRidingMinutes / 60;
  let warning = undefined;
  if (totalRidingHours > 8) {
    warning = "今日純騎乘時間加總超過 8 小時，行程較硬，請注意體力與補給！";
  }

  return {
    waypoints: resultWaypoints,
    totalRidingHours,
    warning,
  };
}
