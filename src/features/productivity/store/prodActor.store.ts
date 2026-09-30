import { create } from 'zustand';
import { PROD_ACTORS } from '@/features/productivity/mock-data';
import type { ProdActor } from '@/features/productivity/types';

/** Identitas aktif dibagi ke seluruh layar Productivity supaya list → detail → menu lain memakai peran yang sama. */
export const useProdActor = create<{ actor: ProdActor; setActor: (next: ProdActor) => void }>()((set) => ({
  actor: PROD_ACTORS[0],
  setActor: (actor) => set({ actor }),
}));
