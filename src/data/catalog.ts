import raw from './flours.json';
import type { Flour } from '../domain/types';
import { genericFlours } from './genericFlours';
export const catalog = [...genericFlours,...raw as Flour[]];
