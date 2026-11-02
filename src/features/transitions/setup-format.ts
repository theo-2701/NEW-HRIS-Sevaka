import { employeeName } from '@/features/time-off/mock-data';
import type { MaterializationSetup } from '@/features/transitions/setup-types';
import { TYPE_LABEL } from '@/features/transitions/types';

export const setupTitle = (row: MaterializationSetup) =>
  `${TYPE_LABEL[row.type]} · ${row.subtype ?? 'All subtypes'} · ${row.branch ?? 'Company default'}`;

export const handlerSummary = (row: MaterializationSetup) =>
  [...new Set(row.tasks.flatMap((t) => t.handlers))].map(employeeName).join(', ') || '—';
