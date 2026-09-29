/** W stimato per le farine che non lo dichiarano: valore teorico, intervallo largo, metodo esplicito. */
export interface WEstimate {
  /** Valore centrale della stima. */
  value: number;
  min: number;
  max: number;
  method: string;
  confidence: "media" | "bassa";
  checkedAt: string;
}
export interface Flour {
  id: string;
  brand: string;
  name: string;
  type: string;
  w: [number, number] | null;
  /** Presente solo se `w` manca: non è un dato del produttore. */
  wEstimate?: WEstimate;
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
  /** Stili nati in teglia tonda (es. focaccia barese). */
  panShape?: "rect" | "round";
  panDiameter?: number;
  /** Grammi di impasto per cm² tipici dello stile. */
  panDensity?: number;
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
  /** Forma della teglia negli stili in teglia: rettangolare (larghezza × lunghezza) o tonda (diametro). */
  panShape: "rect" | "round";
  panDiameter: number;
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
  /** Correzione proposta con un tocco (per ora solo l’idratazione). */
  fix?: { hydration: number };
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
/** Una teglia salvata nel profilo: misure interne e materiale. */
export interface UserPan {
  id: string;
  name: string;
  /** Assente nelle teglie salvate prima delle teglie tonde: vale come rettangolare. */
  shape?: "rect" | "round";
  diameter?: number;
  width: number;
  length: number;
  surface: DoughConfig["bakeSurface"];
  createdAt: string;
}
/** Un forno di casa salvato nel profilo, con la temperatura che raggiunge davvero. */
export interface UserOven {
  id: string;
  name: string;
  ovenType: string;
  temp: number;
  bakeSurface: DoughConfig["bakeSurface"];
  createdAt: string;
}
/** Una ricetta da rifare: tutte le scelte tranne le date. */
export interface RecipeTemplate {
  id: string;
  name: string;
  createdAt: string;
  config: DoughConfig;
}
export interface Recipe {
  id: string;
  name: string;
  createdAt: string;
  config: DoughConfig;
  notes: string;
  rating: number;
  completedStages: string[];
  temperatureReadings?: TemperatureReading[];
  favorite?: boolean;
  /** Momento in cui il piano è stato avviato con «Programma» o «Inizia ora». */
  startedAt?: string;
  /** Momento in cui la pizza è stata conclusa e archiviata tra le passate. */
  finishedAt?: string;
  /** Taratura del forno registrata a partire da questa pizza. */
  calibrationId?: string;
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
  config: DoughConfig;
  recipes: Recipe[];
  activeId: string | null;
  customFlours: Flour[];
  savedBlends: FlourBlend[];
  equipmentProfiles: EquipmentProfile[];
  sourdoughProfiles: SourdoughProfile[];
  activeSourdoughId: string | null;
  bakeCalibrations: BakeCalibration[];
  /** Nome con cui l’app saluta l’utente (facoltativo). */
  profileName?: string;
  userOvens?: UserOven[];
  userPans?: UserPan[];
  templates?: RecipeTemplate[];
  /** Minuti di anticipo delle notifiche rispetto a ogni fase (0 = all’orario esatto). */
  reminderLeadMinutes?: number;
  /** Unità mostrate all’utente: i dati restano sempre salvati in grammi e °C. */
  units?: { weight: "g" | "oz"; temp: "C" | "F" };
  /** Lingua scelta dall’utente; se manca si usa quella del dispositivo. */
  language?: "it" | "en";
}
