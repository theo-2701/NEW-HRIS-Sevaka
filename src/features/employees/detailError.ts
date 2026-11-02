import { ApiError } from '@/services/api';

export type DetailErrorKind = 'NOT_FOUND' | 'BRANCH_RULE' | 'UNAVAILABLE';

/**
 * Keadaan galat layar Detail (CATATAN 25 Okt 2026, EMP-2610242024 T13). Percabangan membaca
 * `status` + penanda kalimat, BUKAN `error_code` (kode hanya untuk ditampilkan/disalin).
 * 404 dan 403 selain aturan cabang sama-sama "tidak ditemukan" (anti-enumerasi).
 */
export function detailErrorKind(error: unknown): DetailErrorKind {
  const status = error instanceof ApiError ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  if (status === 503 || status === 0) return 'UNAVAILABLE';
  if (status === 403 && /branch/i.test(message)) return 'BRANCH_RULE';
  return 'NOT_FOUND';
}

export const DETAIL_ERROR_TEXT: Record<DetailErrorKind, { title: string; body: string }> = {
  NOT_FOUND: {
    title: 'Employee not found',
    body: 'This employee was not found or is outside your access.',
  },
  BRANCH_RULE: {
    title: 'Outside your branch setup',
    body: 'Your branch setup does not let you open employees of this branch. Ask an HR Manager to adjust your branch access.',
  },
  UNAVAILABLE: {
    title: 'Temporarily unavailable',
    body: 'This is temporarily unavailable. Please try again in a moment.',
  },
};
