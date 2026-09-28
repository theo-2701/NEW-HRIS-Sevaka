import { PREFIX_LABELS } from '@/features/settings/mock-data';
import type {
  AccessClass,
  SettingRow,
  SettingsMenuId,
  SettingsRole,
  SetupOptions,
  SetupValue,
} from '@/features/settings/types';

/** Menu → subset `setup_code` yang layarnya render (FSD Peta Menu). Waktu 7 awalan, Karyawan satu enum. */
export const MENU_PREFIXES: Record<SettingsMenuId, string[]> = {
  time: ['attendance.', 'leave.', 'overtime.', 'sick.', 'schedule.', 'oncall.', 'outbox.'],
  employee: ['REPRIMAND_RULE'],
};

export const belongsTo = (menu: SettingsMenuId, code: string) =>
  MENU_PREFIXES[menu].some((prefix) => (prefix.endsWith('.') ? code.startsWith(prefix) : code === prefix));

/**
 * Kelas jawaban per peran (FSD Peta Menu, UIC §1.1 butir 4): SUPER_ADMIN/HR_MANAGER PENUH untuk seluruh menu;
 * R‡ hanya baris modul miliknya; lainnya nol akses (403 di gerbang).
 */
const READ_MENUS: Partial<Record<SettingsRole, SettingsMenuId[]>> = {
  ROLE_HR_STAFF: ['time', 'employee'],
  ROLE_FINANCE_OFFICER: [],
};

export function accessClass(role: SettingsRole): AccessClass {
  if (role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER') return 'FULL';
  return role in READ_MENUS ? 'READ' : 'NONE';
}

export const readableMenus = (role: SettingsRole): SettingsMenuId[] =>
  accessClass(role) === 'FULL' ? ['time', 'employee'] : (READ_MENUS[role] ?? []);

export const canWriteSettings = (role: SettingsRole) => accessClass(role) === 'FULL';

export const prefixOf = (code: string) => (code.includes('.') ? `${code.split('.')[0]}.` : code);

/** Judul tab: `label_awalan`, fallback teks awalan mentah. */
export const tabLabel = (prefix: string) => PREFIX_LABELS[prefix] ?? prefix;

/** Label baris: `label`, fallback `setup_code` (PROB-FRONTEND-034). */
export const rowLabel = (row: Pick<SettingRow, 'label' | 'setupCode'>) => row.label ?? row.setupCode;

/** Pemeriksaan nilai tahap 6 — tiap anggota wajib cocok; deretan kosong lolos hampa (PROB-SERVICE-440). */
export function valueOffered(options: SetupOptions | null | undefined, value: SetupValue[]): string | null {
  if (!options) return null;
  for (const item of value) {
    if (options.jenis === 'DAFTAR') {
      if (!options.pilihan.includes(String(item)))
        return `nilai ${String(item)} di luar pilihan (${options.pilihan.join(', ')}).`;
    } else {
      const n = typeof item === 'number' ? item : Number(item);
      if (!Number.isFinite(n)) return `nilai ${String(item)} bukan angka.`;
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
