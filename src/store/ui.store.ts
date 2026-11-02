import { create } from 'zustand';
import { referenceFor, type ErrorReference } from '@/lib/errorReference';

export type ToastTone = 'ok' | 'info' | 'warn' | 'danger';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  /** Galat berkode: Error code + Trace ID yang bisa disalin. */
  reference?: ErrorReference;
}

interface UiState {
  /** Section sidebar yang sedang terbuka di flyout (rail 84px + panel). */
  openSection: string | null;
  setOpenSection: (section: string | null) => void;

  toasts: Toast[];
  /** Padanan `Flow.toast()` di prototype: umpan balik kode respons 201/200/422/409. */
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  openSection: null,
  setOpenSection: (openSection) => set({ openSection }),

  toasts: [],
  toast: (message, tone = 'ok') => {
    const id = crypto.randomUUID();
    const reference = tone === 'danger' ? referenceFor(message) : undefined;
    set({ toasts: [...get().toasts, { id, tone, message, reference }] });
    // Galat berrujukan bertahan lebih lama supaya sempat disalin.
    window.setTimeout(() => get().dismissToast(id), reference ? 9000 : 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Helper singkat supaya service/hook bisa memanggil tanpa hook React. */
export const toast = (message: string, tone: ToastTone = 'ok') =>
  useUiStore.getState().toast(message, tone);
