export interface Flour {
  id: string; brand: string; name: string; type: string;
  w: [number, number] | null; protein: number | null; proteinBasis: string;
  pl: string | null; source: string; checkedAt: string;
  kind: 'wheat' | 'blend' | 'other'; usable: boolean; note: string;
}
export interface PizzaStyle {
  id: string; name: string; subtitle: string; hydration: number; hydrationRange: [number, number];
  ballWeight: number; salt: number; oil: number; cold: number; bulk: number; proof: number;
  minW: number; oven: number; bake: string; tip: string; pan: boolean;
}
export interface DoughConfig {
  styleId: string; flourId: string; secondFlourId: string; secondFlourPercent: number;
  count: number; ballWeight: number; panWidth: number; panLength: number; panDensity: number;
  hydration: number; salt: number; oil: number; yeast: 'fresh' | 'instant';
  bulkHours: number; coldHours: number; proofHours: number; roomTemp: number; fridgeTemp: number;
  ovenTemp: number; bakeAt: string;
}
export interface Advice { id: string; level: 'info' | 'warning' | 'error'; title: string; text: string }
export interface Stage { id: string; title: string; at: string; until: string; detail: string }
export interface Recipe {
  id: string; name: string; createdAt: string; config: DoughConfig;
  notes: string; rating: number; completedStages: string[];
}
export interface StoredState { version: 1; config: DoughConfig; recipes: Recipe[]; activeId: string | null; customFlours: Flour[] }
