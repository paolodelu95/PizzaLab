import raw from './flours.json';
import internationalRaw from './internationalFlours.json';
import estimatesRaw from './wEstimates.json';
import type { Flour, WEstimate } from '../domain/types';
import { genericFlours } from './genericFlours';
import { glutenFreeFlours } from './glutenFreeFlours';

const glutenFreeMixes = new Set([
  'caputo-fioreglut-pizza-e-pane',
  'le-5-stagioni-gluten-free',
  'molino-vigevano-mix-pane-e-pizza-senza-glutine',
]);
const checkedCatalog = (raw as Flour[]).map((flour) =>
  glutenFreeMixes.has(flour.id)
    ? {
        ...flour,
        glutenFree: true,
        usable: true,
        kind: 'blend' as const,
        note: `${flour.note ? `${flour.note} ` : ''}Miscela senza glutine selezionabile: il W non si applica. Segui idratazione e procedimento riportati sulla confezione.`,
      }
    : flour,
);
// Il W stimato (scripts/estimate-w.mjs) si aggiunge solo alle farine che non dichiarano il W.
const estimates = estimatesRaw as Record<string, WEstimate>;
const withEstimate = (flour: Flour): Flour => (!flour.w && estimates[flour.id] ? { ...flour, wEstimate: estimates[flour.id] } : flour);
export const catalog = [
  ...genericFlours,
  ...glutenFreeFlours,
  ...checkedCatalog,
  ...(internationalRaw as Flour[]),
].map(withEstimate);
