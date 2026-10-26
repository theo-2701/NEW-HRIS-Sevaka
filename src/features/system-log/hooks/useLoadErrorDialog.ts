import { useEffect, useRef } from 'react';
import { useUiStore } from '@/store/ui.store';
import { isLoadError } from '@/features/system-log/rules';

/** Kalimat galat bersama untuk 5xx/putus jaringan (FSD-AUTH 0.24 `EC-4`/`EC-5`). */
export const UNAVAILABLE_MESSAGE = 'This is temporarily unavailable. Please try again in a moment.';

/** `EC-4` — dialog galat baku sekali per kegagalan (memakai modal hasil bersama + kode galat). */
export function useLoadErrorDialog(error: unknown, errorUpdatedAt: number) {
  const shown = useRef(0);
  useEffect(() => {
    if (!isLoadError(error) || !errorUpdatedAt || shown.current === errorUpdatedAt) return;
    shown.current = errorUpdatedAt;
    const message = error instanceof Error ? error.message : '';
    const [status, code] = message.split(/\s+/);
    const { recordError, toast } = useUiStore.getState();
    recordError({ status: Number(status) || undefined, code: /^[A-Z]{3}-[A-Z]{3}-\d{3}$/.test(code ?? '') ? code : undefined });
    toast(UNAVAILABLE_MESSAGE, 'danger');
  }, [error, errorUpdatedAt]);
}

