import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import { LOCKED_CODES, SETTING_SEED } from '@/features/settings/mock-data';
import { accessClass, belongsTo, canWriteSettings, readableMenus, valueOffered } from '@/features/settings/rules';
import { SettingsWriteError } from '@/features/settings/types';
import type {
  SettingChange,
  SettingErrorCode,
  SettingRow,
  SettingRowError,
  SettingsActor,
  SettingWriteRow,
} from '@/features/settings/types';

/**
 * API service Settings — UIC-001-SETTINGS-0.12.
 *
 *   A1  GET /settings   — seluruh setelan yang boleh dilihat pemanggil; penyaringan per-Menu di layar
 *   A2  PUT /settings   — `{settings:[{setup_code, setup_value}]}` satu transaksi, nol short-circuit
 *
 * Nol persetujuan orang kedua; tiap perubahan melahirkan satu baris versi (dibaca Menu Riwayat Perubahan).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

interface StoredSetting extends SettingRow {
  versionNumber: number;
  updatedAt: string;
}

export interface SettingVersion {
  setupCode: string;
  versionNumber: number;
  before: SettingRow['setupValue'];
  after: SettingRow['setupValue'];
  changedBy: string;
  changedAt: string;
}

let store: StoredSetting[] = [];
let versions: SettingVersion[] = [];

export function resetSettingsMocks() {
  store = SETTING_SEED.map((row) => ({
    ...row,
    setupValue: row.setupValue ? [...row.setupValue] : null,
    versionNumber: 1,
    updatedAt: '2026-01-05T02:00:00+07:00',
  }));
  versions = [];
}
resetSettingsMocks();

/** Presedensi kode galat A2 — paling keras menang (UIC §2.5). */
const SEVERITY: SettingErrorCode[] = [
  'SETUP_CODE_LOCKED',
  'FORBIDDEN',
  'SETUP_CODE_UNKNOWN',
  'SETUP_PREFIX_UNREGISTERED',
  'SETUP_VALUE_NOT_OFFERED',
  'VALIDATION_ERROR',
];
const STATUS_OF: Record<SettingErrorCode, number> = {
  SETUP_CODE_LOCKED: 403,
  FORBIDDEN: 403,
  SETUP_CODE_UNKNOWN: 422,
  SETUP_PREFIX_UNREGISTERED: 422,
  SETUP_VALUE_NOT_OFFERED: 422,
  VALIDATION_ERROR: 422,
};

const toApiRow = (row: SettingChange) => ({ setup_code: row.setupCode, setup_value: row.setupValue });

export const settingsService = {
  /** `A1` — kelas PENUH membawa penawaran; kelas R‡ penawaran DI-OMIT; nol akses → 403 sebelum kueri. */
  async read(actor: SettingsActor): Promise<SettingRow[]> {
    if (MOCK) {
      await delay();
      const cls = accessClass(actor.role);
      if (cls === 'NONE') throw new ApiError('Peran Anda tidak memegang setelan mana pun.', 403, 'FORBIDDEN');
      const menus = readableMenus(actor.role);
      return store
        .filter((row) => cls === 'FULL' || menus.some((menu) => belongsTo(menu, row.setupCode)))
        .sort((a, b) => a.setupCode.localeCompare(b.setupCode))
        .map((row) => {
          const out: SettingRow = {
            setupCode: row.setupCode,
            setupValue: row.setupValue ? [...row.setupValue] : null,
            description: row.description,
            label: row.label,
            isRetired: row.isRetired,
          };
          if (cls === 'FULL') out.setupOptions = row.setupOptions ?? null;
          return out;
        });
    }
    const { data } = await api.get<{
      data: {
        setup_code: string;
        setup_value: SettingRow['setupValue'];
        setup_options?: SettingRow['setupOptions'];
        description: string | null;
        label: string | null;
        is_retired: boolean;
      }[];
    }>('/settings');
    return data.data.map((raw) => ({
      setupCode: raw.setup_code,
      setupValue: raw.setup_value,
      ...('setup_options' in raw ? { setupOptions: raw.setup_options ?? null } : {}),
      description: raw.description,
      label: raw.label,
      isRetired: raw.is_retired,
    }));
  },

  /**
   * `A2` — tujuh tahap pemeriksaan per baris, SELURUH baris dinilai; satu ditolak ⇒ nol setelan berubah.
   * Nilai sama persis dengan yang berjalan ⇒ `changed:false`, nol versi baru.
   */
  async write(actor: SettingsActor, changes: SettingChange[]): Promise<SettingWriteRow[]> {
    if (MOCK) {
      await delay(350);
      if (!canWriteSettings(actor.role)) {
        throw new SettingsWriteError(
          403,
          'FORBIDDEN',
          [],
          'Hanya HR Manager dan Super Admin yang dapat mengubah setelan.',
        );
      }
      if (!changes.length) {
        throw new SettingsWriteError(422, 'VALIDATION_ERROR', [], 'Tidak ada setelan yang dikirim.');
      }
      const errors: SettingRowError[] = [];
      const seen = new Set<string>();
      changes.forEach((change) => {
        const fail = (code: SettingErrorCode, message: string) =>
          errors.push({ field: change.setupCode, code, message: `${code} - ${message}` });
        if (seen.has(change.setupCode)) return fail('VALIDATION_ERROR', 'setup_code dikirim lebih dari sekali.');
        seen.add(change.setupCode);
        if (!Array.isArray(change.setupValue)) return fail('VALIDATION_ERROR', 'setup_value wajib berupa deretan.');
        if (LOCKED_CODES.includes(change.setupCode)) {
          return fail('SETUP_CODE_LOCKED', 'setelan ini milik platform dan tidak dapat diubah dari sisi perusahaan.');
        }
        const row = store.find((item) => item.setupCode === change.setupCode);
        if (!row) return fail('SETUP_CODE_UNKNOWN', 'setup_code tidak dikenal di perusahaan ini.');
        if (row.isRetired) return fail('SETUP_VALUE_NOT_OFFERED', 'setelan pensiun tidak lagi menerima nilai.');
        const offered = valueOffered(row.setupOptions, change.setupValue);
        if (offered) fail('SETUP_VALUE_NOT_OFFERED', offered);
      });
      if (errors.length) {
        const top = SEVERITY.find((code) => errors.some((item) => item.code === code))!;
        throw new SettingsWriteError(
          STATUS_OF[top],
          top,
          errors,
          `${errors.length} dari ${changes.length} setelan ditolak; nol setelan berubah.`,
        );
      }
      const now = new Date().toISOString();
      return changes.map((change) => {
        const row = store.find((item) => item.setupCode === change.setupCode)!;
        const same = JSON.stringify(row.setupValue) === JSON.stringify(change.setupValue);
        if (!same) {
          versions.push({
            setupCode: row.setupCode,
            versionNumber: row.versionNumber + 1,
            before: row.setupValue,
            after: [...change.setupValue],
            changedBy: actor.label,
            changedAt: now,
          });
          row.setupValue = [...change.setupValue];
          row.versionNumber += 1;
          row.updatedAt = now;
        }
        return {
          setupCode: row.setupCode,
          setupValue: row.setupValue ? [...row.setupValue] : [],
          versionNumber: same ? null : row.versionNumber,
          changed: !same,
          updatedAt: row.updatedAt,
        };
      });
    }
    const { data } = await api.put<{
      settings: {
        setup_code: string;
        setup_value: SettingRow['setupValue'];
        version_number: number | null;
        changed: boolean;
        updated_at: string;
      }[];
    }>('/settings', { settings: changes.map(toApiRow) });
    return data.settings.map((raw) => ({
      setupCode: raw.setup_code,
      setupValue: raw.setup_value ?? [],
      versionNumber: raw.version_number,
      changed: raw.changed,
      updatedAt: raw.updated_at,
    }));
  },

  /**
   * Koneksi antar modul (tanpa API): nilai `REPRIMAND_RULE` dibaca layar Reprimand Type Setting sebagai
   * spanduk baca-saja — satu sumber nilai untuk kedua layar (PROB-FRONTEND-042).
   */
  async reprimandRule(): Promise<string | null> {
    if (MOCK) {
      await delay(100);
      return store.find((row) => row.setupCode === 'REPRIMAND_RULE')?.setupValue?.[0]?.toString() ?? null;
    }
    const rows = await settingsService.read({ id: 'self', label: 'self', role: 'ROLE_HR_STAFF' });
    return rows.find((row) => row.setupCode === 'REPRIMAND_RULE')?.setupValue?.[0]?.toString() ?? null;
  },

  /** Hanya untuk pengujian & Menu Riwayat Perubahan kelak. */
  versionsOf(code: string): SettingVersion[] {
    return versions.filter((row) => row.setupCode === code).map((row) => ({ ...row }));
  },
};
