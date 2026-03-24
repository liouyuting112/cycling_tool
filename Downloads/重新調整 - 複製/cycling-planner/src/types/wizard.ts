import { Spot } from "@/utils/db";

export interface SpotSelection {
  accommodationId?: string;
  foodIds: string[];
  attractionIds: string[];
}

export interface WizardData {
  departureLocation: string;
  totalDays: number;
  speedLevel: 15 | 20 | 25;
  totalBudgetAmount: number;
  routeId?: string;
  isRoundTrip: boolean;
  foodPreferences: string[]; // ["convenience-store", "restaurant", etc]
  accommodationTypePreferences: string[];
  selections: Record<number, SpotSelection>; // day index -> selections
  equipmentList: { id: string; name: string; checked: boolean }[];
  customSpots: Spot[];
}
