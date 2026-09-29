import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  ASSIGNMENT_GAP,
  DEPLOYED_AT,
  LOCKED_CODES,
  ROD_CODES,
  SETTING_SEED,
  SETTINGS_VIEWERS,
  VERSION_HISTORY,
} from '@/features/settings/mock-data';
import type { HistoryActor } from '@/features/settings/mock-data';
import {
  accessClass,
  belongsTo,
  canReadHistory,
  canWriteSettings,
  prefixMatches,
  readableMenus,
  valueOffered,
} from '@/features/settings/rules';
import { SettingsWriteError } from '@/features/settings/types';
import type {
  Paged,
  SettingChange,
  SettingErrorCode,
  SettingRow,
  SettingRowError,
  SettingsActor,
  SettingWriteRow,
  SetupValue,
  VersionRow,
  VersionSearch,
} from '@/features/settings/types';

/**
 * API service Settings — UIC-001-SETTINGS-0.12.
 *
 *   A1  GET  /settings                  — seluruh setelan yang boleh dilihat pemanggil; penyaringan per-Menu di layar
 *   A2  PUT  /settings                  — `{settings:[{setup_code, setup_value[, confirm_transition]}]}` satu transaksi
 *   A3  POST /settings/versions/search  — riwayat lintas-setelan, badan NESTED (`filters` + paginasi di root)
 *
 * Nol persetujuan orang kedua; tiap perubahan melahirkan satu baris versi (dibaca Menu Riwayat Perubahan).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

interface StoredSetting extends SettingRow {
  versionNumber: number;
  updatedAt: string;
}

interface StoredVersion extends VersionRow {
  /** Tidak pernah ikut jawaban — hanya untuk penyaring pelaku. */
  employeeId: string | null;
}

let store: StoredSetting[] = [];
let versions: StoredVersion[] = [];
let versionSeq = 0;

const nextVersionId = () => `0198fb00-0000-7000-8000-${String((versionSeq += 1)).padStart(12, '0')}`;

function actorIdentity(by: HistoryActor) {
  if (by.kind === 'SYSTEM')
    return {
      createdBy: { nama: 'SYSTEM', nik: 'SYSTEM' },
      isSystemActor: true,
      isAnonymizedActor: false,
      employeeId: null,
    };
  if (by.kind === 'ANONYMIZED')
    return {
      createdBy: { nama: 'ANONYMIZED', nik: 'ANONYMIZED' },
      isSystemActor: false,
      isAnonymizedActor: true,
      employeeId: null,
    };
  const person = SETTINGS_VIEWERS.find((viewer) => viewer.id === by.employeeId);
  return {
    createdBy: { nama: person?.nama ?? by.employeeId, nik: person?.nik ?? '-' },
    isSystemActor: false,
    isAnonymizedActor: false,
    employeeId: by.employeeId,
  };
}

function pushVersion(code: string, value: SetupValue[], at: string, by: HistoryActor) {
  const previous = [...versions].reverse().find((row) => row.setupCode === code);
  versions.push({
    id: nextVersionId(),
    setupCode: code,
    versionNumber: (previous?.versionNumber ?? 0) + 1,
    setupValue: [...value],
    previousSetupValue: previous ? [...previous.setupValue] : null,
    createdAt: at,
    isLocked: LOCKED_CODES.includes(code),
    ...actorIdentity(by),
  });
}

export function resetSettingsMocks() {
  versions = [];
  versionSeq = 0;
  const codes = [...SETTING_SEED.map((row) => row.setupCode), ...LOCKED_CODES];
  codes.forEach((code) => {
    const history = VERSION_HISTORY[code];
    if (history) history.forEach((entry) => pushVersion(code, entry.value, entry.at, entry.by));
    else {
      const seed = SETTING_SEED.find((row) => row.setupCode === code);
      pushVersion(code, seed?.setupValue ?? [], DEPLOYED_AT, { kind: 'SYSTEM' });
    }
  });
  store = SETTING_SEED.map((row) => {
    const own = versions.filter((item) => item.setupCode === row.setupCode);
    const last = own[own.length - 1];
    return {
      ...row,
      setupValue: row.setupValue ? [...row.setupValue] : null,
      keadaanNilai: row.keadaanNilai ?? 'BERLAKU',
      versionNumber: last?.versionNumber ?? 1,
      updatedAt: last?.createdAt ?? DEPLOYED_AT,
    };
  });
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
  'ASSIGNMENT_GAP_BLOCKS_REQUIRED',
];
const STATUS_OF: Record<SettingErrorCode, number> = {
  SETUP_CODE_LOCKED: 403,
  FORBIDDEN: 403,
  SETUP_CODE_UNKNOWN: 422,
  SETUP_PREFIX_UNREGISTERED: 422,
  SETUP_VALUE_NOT_OFFERED: 422,
  VALIDATION_ERROR: 422,
  ASSIGNMENT_GAP_BLOCKS_REQUIRED: 422,
  INTERNAL_ERROR: 500,
};

const REGISTERED_PREFIXES = [
  'attendance.',
  'leave.',
  'overtime.',
  'sick.',
  'schedule.',
  'oncall.',
  'outbox.',
  'finance.',
  'payroll.',
  'performance.',
  'productivity.',
  'document.',
  'settings.',
];

const toApiRow = (row: SettingChange) => ({
  setup_code: row.setupCode,
  setup_value: row.setupValue,
  ...(row.confirmTransition !== undefined ? { confirm_transition: row.confirmTransition } : {}),
});

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
            keadaanNilai: row.keadaanNilai,
            pasanganKey: row.pasanganKey ?? null,
          };
          if (cls === 'FULL') {
            out.setupOptions = row.setupOptions ?? null;
            // `jangkauan` hanya diterima kelas PENUH (FSD §5.6).
            out.jangkauan = row.jangkauan ? row.jangkauan.map((item) => ({ ...item })) : [];
          }
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
        keadaan_nilai?: SettingRow['keadaanNilai'];
        pasangan_key?: string | null;
        jangkauan?: SettingRow['jangkauan'];
      }[];
    }>('/settings');
    return data.data.map((raw) => ({
      setupCode: raw.setup_code,
      setupValue: raw.setup_value,
      ...('setup_options' in raw ? { setupOptions: raw.setup_options ?? null } : {}),
      description: raw.description,
      label: raw.label,
      isRetired: raw.is_retired,
      keadaanNilai: raw.keadaan_nilai,
      pasanganKey: raw.pasangan_key ?? null,
      ...(raw.jangkauan ? { jangkauan: raw.jangkauan } : {}),
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
      let viewMissing = false;
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
        if (!row) {
          if (change.setupCode.includes('.') && !REGISTERED_PREFIXES.some((p) => prefixMatches(p, change.setupCode)))
            return fail('SETUP_PREFIX_UNREGISTERED', 'awalan tidak terdaftar di berkas penjaga.');
          return fail('SETUP_CODE_UNKNOWN', 'setup_code tidak dikenal di perusahaan ini.');
        }
        if (row.isRetired) return fail('SETUP_VALUE_NOT_OFFERED', 'setelan pensiun tidak lagi menerima nilai.');
        const offered = valueOffered(row.setupOptions, change.setupValue);
        if (offered) return fail('SETUP_VALUE_NOT_OFFERED', offered);
        // Tahap 7 — gerbang R/O/D, hanya dua setelan Organisasi.
        const isRod = ROD_CODES.includes(change.setupCode);
        if (change.confirmTransition !== undefined && !isRod) {
          return fail(
            'VALIDATION_ERROR',
            'confirm_transition tidak sah menyertai baris ini; setelan ini bukan pola R/O/D.',
          );
        }
        if (!isRod) return;
        const target = String(change.setupValue[0] ?? '');
        const current = String(row.setupValue?.[0] ?? '');
        if (target === current) return;
        if (target === 'DISABLED' && change.confirmTransition !== true) {
          return fail(
            'VALIDATION_ERROR',
            'Transisi ke DISABLED menuntut konfirmasi eksplisit (confirm_transition: true).',
          );
        }
        if (target === 'REQUIRED') {
          if (!ASSIGNMENT_GAP.viewProvisioned) viewMissing = true;
          else if ((ASSIGNMENT_GAP.gaps[change.setupCode] ?? 0) > 0) {
            const noun = change.setupCode === 'SBU_ASSIGNMENT_MODE' ? 'SBU' : 'Cost Center';
            fail(
              'ASSIGNMENT_GAP_BLOCKS_REQUIRED',
              `${ASSIGNMENT_GAP.gaps[change.setupCode]} karyawan aktif belum memiliki penugasan ${noun} (dari ${ASSIGNMENT_GAP.activeEmployees} aktif); tugaskan dahulu melalui penugasan massal.`,
            );
          }
        }
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
      // Keadaan HARI INI (ORG-6): VIEW gap belum digelar ⇒ 500, transaksi batal.
      if (viewMissing) {
        throw new SettingsWriteError(
          500,
          'INTERNAL_ERROR',
          [],
          'Pemeriksaan kelengkapan penugasan belum dapat dijalankan.',
        );
      }
      const now = new Date().toISOString();
      return changes.map((change) => {
        const row = store.find((item) => item.setupCode === change.setupCode)!;
        const same = JSON.stringify(row.setupValue) === JSON.stringify(change.setupValue);
        if (!same) {
          pushVersion(row.setupCode, change.setupValue, now, { kind: 'HUMAN', employeeId: actor.id });
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
   * `A3` — tepat dua peran; peran lain (termasuk ber-R‡) ditolak DI GERBANG sebelum kueri. Urut `created_at DESC,
   * id DESC` bawaan; hasil kosong = 200 `data:[]`, bukan 404. Baris ANONIM & TERKUNCI tetap tampil.
   */
  async searchVersions(actor: SettingsActor, search: VersionSearch): Promise<Paged<VersionRow>> {
    const page = search.page ?? 1;
    const size = search.size ?? 25;
    if (MOCK) {
      await delay(200);
      if (!canReadHistory(actor.role)) {
        throw new ApiError('Peran tidak berwenang membaca riwayat perubahan setelan', 403, 'FORBIDDEN');
      }
      if (size < 1 || size > 100) throw new ApiError('size harus 1..100.', 422, 'VALIDATION_ERROR');
      if ((search.setupCodePrefixes?.length ?? 0) > 16)
        throw new ApiError('setup_code_prefixes maksimum 16 anggota.', 422, 'VALIDATION_ERROR');
      if (search.startDate && search.endDate && search.endDate < search.startDate)
        throw new ApiError('end_date tidak boleh sebelum start_date.', 422, 'VALIDATION_ERROR');
      const day = (iso: string) => iso.slice(0, 10);
      const sortBy = search.sortBy ?? 'created_at';
      const dir = (search.sortDirection ?? 'DESC') === 'DESC' ? -1 : 1;
      const filtered = versions
        .filter((row) => !search.setupCode || row.setupCode === search.setupCode)
        .filter((row) => !search.setupCodePrefixes || search.setupCodePrefixes.some((p) => row.setupCode.startsWith(p)))
        .filter((row) => !search.createdByEmployeeId || row.employeeId === search.createdByEmployeeId)
        .filter((row) => search.isSystemActor === undefined || row.isSystemActor === search.isSystemActor)
        .filter((row) => !search.startDate || day(row.createdAt) >= search.startDate)
        .filter((row) => !search.endDate || day(row.createdAt) <= search.endDate)
        .sort((a, b) => {
          const key =
            sortBy === 'version_number'
              ? a.versionNumber - b.versionNumber
              : sortBy === 'setup_code'
                ? a.setupCode.localeCompare(b.setupCode)
                : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return key * dir || a.id.localeCompare(b.id) * dir;
        });
      return {
        data: filtered.slice((page - 1) * size, page * size).map((row) => {
          const { employeeId: _hidden, ...rest } = row;
          void _hidden;
          return { ...rest, createdBy: { ...rest.createdBy } };
        }),
        totalData: filtered.length,
        totalPage: Math.ceil(filtered.length / size),
        currentPage: page,
        size,
      };
    }
    const { data } = await api.post<{
      data: {
        id: string;
        setup_code: string;
        version_number: number;
        setup_value: SetupValue[];
        previous_setup_value: SetupValue[] | null;
        created_at: string;
        created_by: { nama: string; nik: string };
        is_system_actor: boolean;
        is_anonymized_actor: boolean;
        is_locked: boolean;
      }[];
      total_data: number;
      total_page: number;
      current_page: number;
      size: number;
    }>('/settings/versions/search', {
      filters: {
        setup_code: search.setupCode,
        setup_code_prefixes: search.setupCodePrefixes,
        created_by_employee_id: search.createdByEmployeeId,
        is_system_actor: search.isSystemActor,
        start_date: search.startDate,
        end_date: search.endDate,
      },
      page,
      size,
      sort_by: search.sortBy,
      sort_direction: search.sortDirection,
    });
    return {
      data: data.data.map((raw) => ({
        id: raw.id,
        setupCode: raw.setup_code,
        versionNumber: raw.version_number,
        setupValue: raw.setup_value,
        previousSetupValue: raw.previous_setup_value,
        createdAt: raw.created_at,
        createdBy: raw.created_by,
        isSystemActor: raw.is_system_actor,
        isAnonymizedActor: raw.is_anonymized_actor,
        isLocked: raw.is_locked,
      })),
      totalData: data.total_data,
      totalPage: data.total_page,
      currentPage: data.current_page,
      size: data.size,
    };
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
    const rows = await settingsService.read({ id: 'self', label: 'self', role: 'ROLE_HR_STAFF', nama: '', nik: '' });
    return rows.find((row) => row.setupCode === 'REPRIMAND_RULE')?.setupValue?.[0]?.toString() ?? null;
  },

  /** Hanya untuk pengujian — baris versi yang lahir SESUDAH penggelaran (manusia/mesin). */
  versionsOf(code: string): VersionRow[] {
    return versions
      .filter((row) => row.setupCode === code && row.versionNumber > 1)
      .map((row) => {
        const { employeeId: _hidden, ...rest } = row;
        void _hidden;
        return rest;
      });
  },
};
