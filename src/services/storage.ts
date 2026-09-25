import { Preferences } from '@capacitor/preferences';
import { defaultConfig } from '../domain/styles';
import { validateConfig } from '../domain/calculator';
import type { StoredState } from '../domain/types';
const KEY = 'pizzamico-state-v1';
export const emptyState = (): StoredState => ({ version: 1, config: defaultConfig(), recipes: [], activeId: null, customFlours: [] });
export async function readState(): Promise<StoredState> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return emptyState();
  const parsed = JSON.parse(value) as StoredState;
  if (parsed.version !== 1 || !parsed.config || !Array.isArray(parsed.recipes) || !Array.isArray(parsed.customFlours)) throw new Error('Archivio non riconosciuto');
  if (validateConfig(parsed.config).length) parsed.config = defaultConfig();
  parsed.recipes = parsed.recipes.filter(r => r && typeof r.id === 'string' && r.config && !validateConfig(r.config).length && Array.isArray(r.completedStages) && typeof r.notes === 'string' && typeof r.name === 'string' && Number.isFinite(r.rating));
  parsed.customFlours = parsed.customFlours.filter(f => f && typeof f.id === 'string' && typeof f.name === 'string' && typeof f.brand === 'string' && (f.w === null || (Array.isArray(f.w) && f.w.length === 2 && f.w.every(n => Number.isFinite(n) && n >= 50 && n <= 500))));
  if (!parsed.recipes.some(r => r.id === parsed.activeId)) parsed.activeId = null;
  return parsed;
}
let pending = Promise.resolve();
export function writeState(state: StoredState): Promise<void> {
  const value = JSON.stringify(state);
  pending = pending.catch(() => {}).then(() => Preferences.set({ key: KEY, value }));
  return pending;
}
