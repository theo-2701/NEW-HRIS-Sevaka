import { create } from 'zustand';
import { PERF_ACTORS } from '@/features/performance/mock-data';
import type { PerfActor } from '@/features/performance/types';

/** Peran aktif dibagi ke seluruh layar Performance — list → detail → menu lain memakai peran yang sama. */
export const usePerfActor = create<{ actor: PerfActor; setActor: (next: PerfActor) => void }>()((set) => ({
  actor: PERF_ACTORS[0],
  setActor: (actor) => set({ actor }),
}));
