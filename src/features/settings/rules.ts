import { ERASURE_TIMEZONES, PREFIX_LABELS } from '@/features/settings/mock-data';
import type {
  AccessClass,
  ErasureDraft,
  ErasureProgress,
  ErasureStatus,
  HistoryModule,
  KeadaanNilai,
  SettingRow,
  SettingsMenuId,
  SettingsRole,
  SetupOptions,
  SetupValue,
} from '@/features/settings/types';

export const SETTINGS_MENUS: SettingsMenuId[] = [
  'time',
  'finance',
  'payroll',
  'performance',
  'productivity',
  'document',
  'organization',
  'employee',
];

export const MENU_LABELS: Record<HistoryModule, string> = {
  time: 'Time',
  finance: 'Finance',
  payroll: 'Payroll',
  performance: 'Performance',
  productivity: 'Productivity',
  document: 'Document',
  organization: 'Organization',
  employee: 'Employee',
  platform: 'Platform',
};

/**
 * Menu → subset `setup_code` yang layarnya render (FSD Peta Menu). Awalan bertitik = kecocokan awalan;
 * tanpa titik = kecocokan penuh (Organisasi/Karyawan ber-gaya UPPER_SNAKE_CASE, nol awalan bertitik).
 */
export const MENU_PREFIXES: Record<SettingsMenuId, string[]> = {
  time: ['attendance.', 'leave.', 'overtime.', 'sick.', 'schedule.', 'oncall.', 'outbox.'],
  finance: ['finance.'],
  payroll: ['payroll.'],
  performance: ['performance.'],
  productivity: ['productivity.'],
  document: ['document.'],
  organization: ['BRANCH_HIERARCHY_MODE', 'COST_CENTER_ASSIGNMENT_MODE', 'SBU_ASSIGNMENT_MODE'],
  employee: ['REPRIMAND_RULE'],
};

const matches = (prefix: string, code: string) => (prefix.endsWith('.') ? code.startsWith(prefix) : code === prefix);

export const belongsTo = (menu: SettingsMenuId, code: string) => MENU_PREFIXES[menu].some((p) => matches(p, code));

/**
 * Kelas jawaban per peran (UIC §7): SUPER_ADMIN/HR_MANAGER PENUH untuk seluruh 8 Menu; kelas R‡ hanya baris
 * modul miliknya; lainnya nol akses (403 di gerbang). Menu Dokumen nol punya kelas R‡.
 */
const READ_MENUS: Partial<Record<SettingsRole, SettingsMenuId[]>> = {
  ROLE_HR_STAFF: ['time', 'productivity', 'employee'],
  ROLE_FINANCE_OFFICER: ['finance'],
  ROLE_PAYROLL_OFFICER: ['payroll'],
  ROLE_DEPARTMENT_MANAGER: ['performance'],
  ROLE_SYSTEM_ADMIN: ['organization'],
};

export function accessClass(role: SettingsRole): AccessClass {
  if (role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER') return 'FULL';
  return role in READ_MENUS ? 'READ' : 'NONE';
}

export const readableMenus = (role: SettingsRole): SettingsMenuId[] =>
  accessClass(role) === 'FULL' ? SETTINGS_MENUS : (READ_MENUS[role] ?? []);

/** Pintu tulis `A2`, Riwayat `A3`, dan Penghapusan Data `A5`–`A7`: tepat dua peran tertinggi. */
export const canWriteSettings = (role: SettingsRole) => accessClass(role) === 'FULL';
export const canReadHistory = canWriteSettings;
export const canManageErasure = canWriteSettings;

/**
 * Penurunan Sub Menu (FSD §2.5): awalan tingkat pertama selalu menjadi kelompok; turun satu tingkat hanya bila
 * awalan yang lebih dalam memuat > 1 key. Key tanpa titik (Organisasi/Karyawan) jatuh ke kelompok kosong.
 */
export function groupOf(code: string, codes: string[]): string {
  const segments = code.split('.');
  if (segments.length < 2) return '';
  let prefix = `${segments[0]}.`;
  for (let depth = 2; depth < segments.length; depth += 1) {
    const deeper = `${segments.slice(0, depth).join('.')}.`;
    if (codes.filter((item) => item.startsWith(deeper)).length > 1) prefix = deeper;
    else break;
  }
  return prefix;
}

/** Tab Sub Menu — urut peta menu beku (`PREFIX_LABELS`); satu kelompok saja ⇒ nol tab. */
export function deriveTabs(codes: string[]): { prefix: string; codes: string[] }[] {
  const groups = new Map<string, string[]>();
  codes.forEach((code) => {
    const prefix = groupOf(code, codes);
    groups.set(prefix, [...(groups.get(prefix) ?? []), code]);
  });
  if (groups.size <= 1) return [];
  const order = Object.keys(PREFIX_LABELS);
  const rank = (prefix: string) => (order.includes(prefix) ? order.indexOf(prefix) : order.length);
  return [...groups.entries()]
    .map(([prefix, items]) => ({ prefix, codes: items }))
    .sort((a, b) => rank(a.prefix) - rank(b.prefix) || a.prefix.localeCompare(b.prefix));
}

/** Judul tab: `label_awalan`, fallback teks awalan mentah. */
export const tabLabel = (prefix: string) => PREFIX_LABELS[prefix] ?? prefix;

/** Label baris: `label`, fallback `setup_code` (PROB-FRONTEND-034). */
export const rowLabel = (row: Pick<SettingRow, 'label' | 'setupCode'>) => row.label ?? row.setupCode;

/** Pemeriksaan nilai tahap 6 — tiap anggota wajib cocok; deretan kosong lolos hampa (PROB-SERVICE-440). */
export function valueOffered(options: SetupOptions | null | undefined, value: SetupValue[]): string | null {
  if (!options) return null;
  for (const item of value) {
    if (options.jenis === 'DAFTAR') {
      if (!options.pilihan.length)
        return `nilai ${String(item)} tidak dapat diperiksa; pilihan belum disusun pemilik makna.`;
      if (!options.pilihan.includes(String(item)))
        return `nilai ${String(item)} di luar pilihan (${options.pilihan.join(', ')}).`;
    } else if (options.satuan === 'MM-DD') {
      if (!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(item)))
        return `nilai ${String(item)} bukan tanggal berformat MM-DD.`;
    } else {
      const n = typeof item === 'number' ? item : Number(item);
      if (item === '' || !Number.isFinite(n)) return `nilai ${String(item)} bukan angka.`;
      if (options.min !== undefined && n < options.min) {
        return `nilai ${n} di bawah penawaran; minimum ${options.min}${options.satuan ? ` ${options.satuan}` : ''}.`;
      }
      if (options.max !== undefined && n > options.max) {
        return `nilai ${n} di luar penawaran; rentang yang ditawarkan ${options.min ?? 0} s.d. ${options.max}${options.satuan ? ` ${options.satuan}` : ''}.`;
      }
    }
  }
  return null;
}

export const formatValue = (value: SetupValue[] | null) =>
  value === null ? '—' : value.length ? value.join(', ') : '[ ]';

/**
 * `keadaan_nilai` → badge + sikap layar (FSD §3.2). Layar DILARANG menyimpulkan jenis kekosongan dari isi nilai;
 * baris BERLAKU tidak berlambang.
 */
export const KEADAAN_META: Record<
  KeadaanNilai,
  { badge: string | null; tone: 'warn' | 'info' | 'mute'; stance: string }
> = {
  BERLAKU: { badge: null, tone: 'mute', stance: 'Applies as stored.' },
  SENGAJA_KOSONG: { badge: 'Empty on purpose', tone: 'mute', stance: 'Empty is a decision here — nothing to do.' },
  BAWAAN_SEMENTARA: {
    badge: 'Temporary default',
    tone: 'info',
    stance: 'Default not settled by the module owner yet — follow up with them, not in this screen.',
  },
  WAJIB_BERSYARAT: {
    badge: 'Conditionally required',
    tone: 'warn',
    stance: 'May stay empty until its partner setting needs it.',
  },
};

/* ── Riwayat Perubahan ───────────────────────────────────────────────────────────────────────── */

export const HISTORY_MODULES: HistoryModule[] = [...SETTINGS_MENUS, 'platform'];

const MODULE_PREFIXES: Record<HistoryModule, string[]> = { ...MENU_PREFIXES, platform: ['settings.'] };

/**
 * Chip Modul → `filters.setup_code_prefixes`. Kesembilan dicentang (atau nol dicentang) ⇒ medan TIDAK dikirim
 * sama sekali — bukan 17 awalan yang melampaui batas 16 kontrak (FSD §9.2, keputusan SET-130).
 */
export function historyPrefixes(selected: HistoryModule[]): string[] | undefined {
  if (!selected.length || HISTORY_MODULES.every((module) => selected.includes(module))) return undefined;
  return HISTORY_MODULES.filter((module) => selected.includes(module)).flatMap((module) => MODULE_PREFIXES[module]);
}

/** Kolom Menu di grid riwayat — diturunkan lapis tampilan dari awalan `setup_code`. */
export const moduleOf = (code: string): HistoryModule =>
  SETTINGS_MENUS.find((menu) => belongsTo(menu, code)) ?? 'platform';

export const prefixMatches = matches;

/* ── Permintaan Penghapusan Data ─────────────────────────────────────────────────────────────── */

export function summarizeProgress(progress: ErasureProgress[]) {
  return {
    totalService: progress.length,
    completedService: progress.filter((row) => row.progressStatus === 'COMPLETED').length,
    heldService: progress.filter((row) => row.progressStatus === 'HELD').length,
  };
}

/** Status permintaan naik murni karena mesin: lahir REQUESTED → IN_PROGRESS → COMPLETED (terminal). */
export function erasureStatus(progress: ErasureProgress[]): ErasureStatus {
  if (progress.length && progress.every((row) => row.progressStatus === 'COMPLETED')) return 'COMPLETED';
  if (progress.some((row) => row.broadcastCount > 0 || row.progressStatus !== 'PENDING')) return 'IN_PROGRESS';
  return 'REQUESTED';
}

/** Validasi `A5`: tiga medan wajib, tanggal surat tidak boleh di masa depan, zona IANA dikenal. */
export function validateErasureDraft(draft: ErasureDraft, now: Date = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.employeeId) errors.employeeId = 'Choose the data subject.';
  if (!draft.requestedAt) errors.requestedAt = 'Letter date is required.';
  else if (new Date(`${draft.requestedAt.slice(0, 10)}T00:00:00`) > now)
    errors.requestedAt = 'Letter date cannot be in the future.';
  if (!draft.requestedAtTimezone) errors.requestedAtTimezone = 'Time zone is required.';
  else if (!ERASURE_TIMEZONES.includes(draft.requestedAtTimezone)) errors.requestedAtTimezone = 'Unknown time zone.';
  return errors;
}

export const SERVICE_LABELS: Record<string, string> = {
  workflow: 'Workflow',
  time: 'Time',
  finance: 'Finance',
  productivity: 'Productivity',
  performance: 'Performance',
  payroll: 'Payroll',
  document: 'Document',
  settings: 'Settings',
  notification: 'Notification',
  insight: 'Insight',
  company: 'Company',
  employee: 'Employee',
  'employee-profile': 'Employee Profile',
  auth: 'Auth',
};
