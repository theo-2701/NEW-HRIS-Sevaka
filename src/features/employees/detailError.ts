/**
 * Keadaan galat layar Detail pegawai — UIC-EMPLOYEE 0.76 §2.2 (TSD-EMPLOYEE 0.199 §7.14.3). Percabangan memakai
 * status + penanda kalimat, BUKAN `error_code` (kode hanya untuk disalin ke tiket):
 *   403 aturan setup cabang (`EMP-AUZ-724`, kalimat berakhir "(branch setup rule)") ⇒ kalimat setup cabang;
 *   503 (`EMP-DEP-725`) atau putus jaringan ⇒ "coba lagi" — bukan "tidak ditemukan";
 *   404 dan 403 lain ⇒ satu kalimat anti-enumeration.
 */
export type DetailErrorKind = 'branch-rule' | 'unavailable' | 'not-found';

export const DETAIL_ERROR_TEXT: Record<DetailErrorKind, string> = {
  'branch-rule':
    'You cannot view this employee because their branch is at a higher level than the branch of your position (branch setup rule).',
  unavailable: 'This is temporarily unavailable. Please try again in a moment.',
  'not-found': 'The employee was not found or is outside your access.',
};

export function detailErrorKind(error: unknown): DetailErrorKind {
  const message = error instanceof Error ? error.message : '';
  if (/^403\b/.test(message) && /\(branch setup rule\)/i.test(message)) return 'branch-rule';
  if (/^(503|502|504)\b/.test(message) || /network error|failed to fetch/i.test(message)) return 'unavailable';
  return 'not-found';
}

/** Mode dummy: id contoh untuk memperagakan keadaan 403 aturan cabang dan 503. */
export const DETAIL_DEMO_ERRORS: Record<string, string> = {
  'emp-branch-rule':
    '403 EMP-AUZ-724 — You cannot view this employee because their branch is at a higher level than the branch of your position (branch setup rule).',
  'emp-unavailable': '503 EMP-DEP-725 — The company service is not reachable yet.',
};
