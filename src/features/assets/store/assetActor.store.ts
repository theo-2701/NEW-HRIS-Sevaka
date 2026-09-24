import { create } from 'zustand';
import { ASSET_VIEWERS } from '@/features/assets/mock-data';
import type { AssetActor } from '@/features/assets/types';

/** Identitas aktif dibagi ke empat layar Assets supaya list → detail memakai peran yang sama. */
export const useAssetActor = create<{ actor: AssetActor; setActor: (next: AssetActor) => void }>()((set) => ({
  actor: ASSET_VIEWERS[0],
  setActor: (actor) => set({ actor }),
}));
