import raw from './flours.json';
import type { Flour } from '../domain/types';
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
export const catalog = [...genericFlours, ...glutenFreeFlours, ...checkedCatalog];
