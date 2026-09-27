export interface Flour {
  id: string;
  brand: string;
  name: string;
  type: string;
  w: [number, number] | null;
  protein: number | null;
  proteinBasis: string;
  pl: string | null;
  source: string;
  checkedAt: string;
  kind: "wheat" | "blend" | "other";
  glutenFree?: boolean;
  usable: boolean;
  note: string;
}
export interface PizzaStyle {
  id: string;
  name: string;
  subtitle: string;
  hydration: number;
  hydrationRange: [number, number];
  ballWeight: number;
  salt: number;
  oil: number;
  cold: number;
  bulk: number;
  proof: number;
  minW: number;
  oven: number;
  bake: string;
  tip: string;
  pan: boolean;
}
export interface DoughConfig {
  styleId: string;
  flourId: string;
  secondFlourId: string;
  secondFlourPercent: number;
  thirdFlourId: string;
  thirdFlourPercent: number;
  fourthFlourId: string;
  fourthFlourPercent: number;
  count: number;
  ballWeight: number;
  panWidth: number;
  panLength: number;
  panDensity: number;
  hydration: number;
  salt: number;
  oil: number;
  sugar: number;
  malt: number;
  yeast: "fresh" | "instant" | "sourdough" | "licoli";
  yeastMode: "auto" | "weighable" | "manual";
  manualYeastPercent: number;
  weighableYeastGrams: number;
  starterPercent: number;
  starterHydration: number;
  sourdoughProfileId: string;
  preferment: "none" | "poolish" | "biga";
  prefermentPercent: number;
  prefermentHours: number;
  prefermentTemp: number;
  prefermentFlourId: string;
  autolyse: boolean;
  autolyseWaterPercent: number;
  autolyseMinutes: number;
  foldCount: number;
  foldIntervalMinutes: number;
  mixer: "hand" | "stand" | "spiral" | "thermomix";
  mixerProfileId: string;
  flourTemp: number;
  desiredDoughTemp: number;
  planMode: "date" | "duration" | "automatic";
  startAt: string;
  ovenType: string;
  bulkHours: number;
  coldHours: number;
  proofHours: number;
  roomTemp: number;
  fridgeTemp: number;
  ovenTemp: number;
  bakeMinutes: number;
  ovenRack: "bottom" | "lower-middle" | "middle" | "upper-middle" | "top";
  bakeSurface:
    | "biscotto"
    | "stone"
    | "steel"
    | "light-pan"
    | "dark-pan"
    | "perforated-pan"
    | "cast-iron";
  pizzaDiameter: number;
  toppingCount: number;
  toppingWidth: number;
  toppingLength: number;
  toppingPresetId: string;
  toppingLoad: number;
  toppingMoisture: number;
  bakeAt: string;
}
export interface Advice {
  id: string;
  level: "info" | "warning" | "error";
  title: string;
  text: string;
}
export interface Stage {
  id: string;
  title: string;
  at: string;
  until: string;
  detail: string;
}
export interface TemperatureReading {
  id: string;
  at: string;
  temp: number;
  place: "impasto" | "ambiente" | "frigo";
}
export interface FlourBlend {
  id: string;
  name: string;
  createdAt: string;
  components: { flourId: string; percent: number }[];
}
export interface EquipmentProfile {
  id: string;
  name: string;
  mixer: DoughConfig["mixer"];
  mixerProfileId: string;
  ovenType: string;
  ovenTemp: number;
  ovenRack?: DoughConfig["ovenRack"];
  bakeSurface?: DoughConfig["bakeSurface"];
  panWidth: number;
  panLength: number;
  createdAt: string;
}
export interface Recipe {
  id: string;
  name: string;
  createdAt: string;
  config: DoughConfig;
  notes: string;
  rating: number;
  completedStages: string[];
  status: "saved" | "active" | "completed";
  completedAt?: string;
  temperatureReadings?: TemperatureReading[];
  favorite?: boolean;
}
export interface StarterFeeding {
  id: string;
  at: string;
  starterGrams: number;
  flourGrams: number;
  waterGrams: number;
  temperature: number;
  rise: number;
  peakHours: number;
  notes: string;
}
export interface SourdoughProfile {
  id: string;
  name: string;
  kind: "licoli" | "solid";
  phase: "creating" | "strengthening" | "mature";
  storage: "room" | "fridge";
  startedAt: string;
  lastFedAt: string | null;
  nextFeedAt: string;
  preferredTime: string;
  starterGrams: number;
  flourName: string;
  temperature: number;
  feedRatio: 1 | 2 | 4;
  readyStreak: number;
  remindersEnabled: boolean;
  feedings: StarterFeeding[];
}
export interface BakeCalibration {
  id: string;
  createdAt: string;
  ovenType: string;
  flourId: string;
  plannedMinutes: number;
  actualMinutes: number;
  crust: "pale" | "good" | "dark";
  crumb: "raw" | "good" | "dry";
  base: "pale" | "good" | "dark";
}
export interface StoredState {
  version: 1;
  onboardingComplete: boolean;
  config: DoughConfig;
  recipes: Recipe[];
  activeId: string | null;
  customFlours: Flour[];
  savedBlends: FlourBlend[];
  equipmentProfiles: EquipmentProfile[];
  sourdoughProfiles: SourdoughProfile[];
  activeSourdoughId: string | null;
  bakeCalibrations: BakeCalibration[];
}
