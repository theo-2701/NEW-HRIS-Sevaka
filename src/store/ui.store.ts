import { create } from 'zustand';

export type ToastTone = 'ok' | 'info' | 'warn' | 'danger';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

/** Modal hasil (berhasil/gagal) — pengganti toast untuk pesan penting (Notulen 12 Okt 2026, #7). */
export interface Notice {
  id: string;
  tone: 'ok' | 'danger';
  message: string;
  /** Status HTTP & kode galat dari ApiError terakhir — hanya untuk `danger`. */
  status?: number;
  code?: string;
  /** Alamat halaman saat galat muncul — dipakai menebak kode service. */
  path: string;
  at: string;
}

interface LastError {
  status?: number;
  code?: string;
  at: number;
}

interface UiState {
  /** Section sidebar yang sedang terbuka di flyout (rail 84px + panel). */
  openSection: string | null;
  setOpenSection: (section: string | null) => void;

  toasts: Toast[];
  /**
   * Padanan `Flow.toast()` di prototype. `ok`/`danger` kini tampil sebagai modal hasil (pesan penting);
   * hanya `info`/`warn` yang tetap toast (info tidak penting).
   */
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;

  notice: Notice | null;
  dismissNotice: () => void;
  /** Dicatat MutationCache global; ditempelkan ke modal galat yang muncul sesaat sesudahnya. */
  lastError: LastError | null;
  recordError: (error: unknown) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  openSection: null,
  setOpenSection: (openSection) => set({ openSection }),

  toasts: [],
  toast: (message, tone = 'ok') => {
    if (tone === 'ok' || tone === 'danger') {
      const last = get().lastError;
      const fresh = tone === 'danger' && last && Date.now() - last.at < 2000 ? last : null;
      set({
        notice: {
          id: crypto.randomUUID(),
          tone,
          message,
          status: fresh?.status,
          code: fresh?.code,
          path: window.location.pathname,
          at: new Date().toISOString(),
        },
        lastError: null,
      });
      return;
    }
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, tone, message }] });
    window.setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  notice: null,
  dismissNotice: () => set({ notice: null }),
  lastError: null,
  recordError: (error) => {
    const { status, code } = (error ?? {}) as { status?: number; code?: string };
    set({ lastError: { status, code, at: Date.now() } });
  },
}));

/** Helper singkat supaya service/hook bisa memanggil tanpa hook React. */
export const toast = (message: string, tone: ToastTone = 'ok') => useUiStore.getState().toast(message, tone);
