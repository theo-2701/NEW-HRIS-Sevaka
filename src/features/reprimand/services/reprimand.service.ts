import { api } from '@/services/api';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER, EMPLOYEE_OPTIONS, deriveLevel, isEffective, labelOf } from '@/features/reprimand/types';
import type {
  PolicyMode,
  Reprimand,
  ReprimandCategory,
  ReprimandDraft,
  Standing,
} from '@/features/reprimand/types';

/**
 * API service Reprimand.
 *
 * Endpoint kontrak (FSD §6 · UIC §7):
 *   GET  /reprimands                     — RP-LIST (riwayat)
 *   GET  /reprimands/standing            — RP-STANDING (derive-on-read)
 *   POST /reprimands                     — RP-CREATE (snapshot dibekukan server)
 *   POST /reprimands/{id}/approve        — RP-APPROVE (checker ≠ maker ≠ subjek)
 *   POST /reprimands/{id}/revoke
 *
 * `RP-TYPE-SETTING` (`cnf_reprimand_category` / `cnf_reprimand_policy`,
 * dual-mode DIRECT/ACCUMULATIVE) **belum dispesifikasi sebagai endpoint** di
 * TSD §7.7 — jalur di bawah mengikuti model yang terdokumentasi dan ditandai
 * GAP di UI sampai kontraknya ada.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

let mockCategories: ReprimandCategory[] = [
  { code: 'VERBAL', label: 'Verbal warning', point: 0, validityMonths: 3, levelOrder: 0, terminal: false, active: true },
  { code: 'SP1', label: 'SP1 — peringatan tertulis pertama', point: 1, validityMonths: 6, levelOrder: 1, terminal: false, active: true },
  { code: 'SP2', label: 'SP2 — peringatan tertulis kedua', point: 2, validityMonths: 6, levelOrder: 2, terminal: false, active: true },
  { code: 'SP3', label: 'SP3 — peringatan terakhir', point: 3, validityMonths: 6, levelOrder: 3, terminal: true, active: true },
];

let mockPolicy: PolicyMode = 'DIRECT';

/** Snapshot dibekukan dari konfigurasi yang berlaku SAAT diterbitkan. */
function freezeSnapshot(code: string) {
  const category = mockCategories.find((row) => row.code === code && row.active);
  if (!category) throw new Error('422 — kategori tidak ada di master reprimand.');
  return {
    code: category.code,
    label: category.label,
    point: category.point,
    validityMonths: category.validityMonths,
    levelOrder: category.levelOrder,
    terminal: category.terminal,
  };
}

function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

function seed(
  employeeId: string,
  employeeName: string,
  unit: string,
  code: string,
  issuedDate: string,
  status: Reprimand['status'],
  maker: string,
  reason: string,
): Reprimand {
  const snapshot = freezeSnapshot(code);
  return {
    id: `RP-${issuedDate.replace(/-/g, '')}-${code}`,
    employeeId,
    employeeName,
    unit,
    categoryCode: code,
    snapshot,
    issuedDate,
    expiryDate: addMonths(issuedDate, snapshot.validityMonths),
    status,
    maker,
    reason,
  };
}

let mockRows: Reprimand[] = [
  seed('emp-eka', 'Eka Saputra', 'BR-Papua', 'SP1', '2026-03-02', 'ACTIVE', 'Rina Hartono', 'Terlambat menyerahkan rekonsiliasi kas cabang tiga kali berturut-turut.'),
  seed('emp-eka', 'Eka Saputra', 'BR-Papua', 'SP2', '2026-05-18', 'ACTIVE', 'Rina Hartono', 'Kesalahan pencatatan ledger yang berulang setelah pembinaan.'),
  seed('emp-dimas', 'Dimas Prabowo', 'HQ', 'SP3', '2026-06-01', 'ACTIVE', 'Dewi Anggraini', 'Pelanggaran kebijakan keamanan data pelanggan.'),
  seed('emp-nadia', 'Nadia Rahman', 'BR-Surabaya', 'VERBAL', '2026-06-20', 'ACTIVE', 'Bagus Pratama', 'Tidak hadir pada rapat pipeline tanpa pemberitahuan.'),
  seed('emp-fajar', 'Fajar Nugroho', 'BR-Jakarta', 'SP1', '2026-07-01', 'IN_APPROVAL', 'Rina Hartono', 'Meninggalkan gudang tanpa serah terima kunci.'),
  seed('emp-nadia', 'Nadia Rahman', 'BR-Surabaya', 'SP1', '2025-11-10', 'REVOKED', 'Bagus Pratama', 'Dicabut setelah klarifikasi — laporan awal keliru.'),
];

function find(id: string): Reprimand {
  const row = mockRows.find((item) => item.id === id);
  if (!row) throw new Error('Reprimand tidak ditemukan.');
  return row;
}

/**
 * Standing diturunkan dari snapshot yang aktif — bukan dari konfigurasi yang
 * berlaku sekarang. Mengubah master kategori TIDAK mengubah standing lama.
 */
function computeStanding(rows: Reprimand[], mode: PolicyMode): Standing[] {
  const byEmployee = new Map<string, Reprimand[]>();
  rows.forEach((row) => {
    byEmployee.set(row.employeeId, [...(byEmployee.get(row.employeeId) ?? []), row]);
  });

  return [...byEmployee.entries()].map(([employeeId, list]) => {
    const effective = list.filter(isEffective);
    const points = effective.reduce((sum, row) => sum + row.snapshot.point, 0);
    const highestLevel = effective.reduce((max, row) => Math.max(max, row.snapshot.levelOrder), 0);
    const terminal = effective.some((row) => row.snapshot.terminal);
    const latestIssuedDate = list.reduce((latest, row) => (row.issuedDate > latest ? row.issuedDate : latest), '');

    return {
      employeeId,
      employeeName: list[0].employeeName,
      unit: list[0].unit,
      points,
      highestLevel,
      level: deriveLevel(mode, { points, highestLevel, terminal }),
      latestIssuedDate,
    };
  });
}

export const reprimandService = {
  async list(): Promise<Reprimand[]> {
    if (MOCK) {
      await delay(200);
      return mockRows.map((row) => ({ ...row, snapshot: { ...row.snapshot } }));
    }
    const { data } = await api.get<{ rows: Reprimand[] }>('/reprimands');
    return data.rows;
  },

  async standing(): Promise<Standing[]> {
    if (MOCK) {
      await delay(200);
      return computeStanding(mockRows, mockPolicy);
    }
    const { data } = await api.get<{ rows: Standing[] }>('/reprimands/standing');
    return data.rows;
  },

  /** Pratinjau snapshot untuk form — nilainya tetap milik server. */
  previewSnapshot(code: string, issuedDate: string) {
    const snapshot = freezeSnapshot(code);
    return {
      ...snapshot,
      expiryDate: issuedDate ? addMonths(issuedDate, snapshot.validityMonths) : '',
    };
  },

  async create(draft: ReprimandDraft): Promise<Reprimand> {
    if (MOCK) {
      await delay();
      if (draft.employeeId === CURRENT_USER.id) {
        throw new Error('403 — Anda tidak bisa menerbitkan reprimand untuk diri sendiri.');
      }

      const [name, rest] = labelOf(EMPLOYEE_OPTIONS, draft.employeeId).split(' — ');
      const snapshot = freezeSnapshot(draft.categoryCode);
      const row: Reprimand = {
        id: `RP-${newId().slice(0, 8).toUpperCase()}`,
        employeeId: draft.employeeId,
        employeeName: name,
        unit: (rest ?? '').split(', ')[1] ?? '—',
        categoryCode: draft.categoryCode,
        // Snapshot dibekukan server; klien tidak pernah mengirim angkanya.
        snapshot,
        issuedDate: draft.issuedDate,
        expiryDate: addMonths(draft.issuedDate, snapshot.validityMonths),
        status: 'IN_APPROVAL',
        maker: CURRENT_USER.name,
        reason: draft.reason.trim(),
        documentId: draft.documentName ? `doc-${newId().slice(0, 8)}` : undefined,
      };
      mockRows = [row, ...mockRows];
      return row;
    }

    // Perhatikan payload: hanya kategori + konteks, tanpa angka snapshot.
    const { data } = await api.post<Reprimand>('/reprimands', {
      employeeId: draft.employeeId,
      categoryCode: draft.categoryCode,
      issuedDate: draft.issuedDate,
      reason: draft.reason,
    });
    return data;
  },

  async approve(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (row.maker === CURRENT_USER.name) {
        throw new Error('409 — Anda maker reprimand ini dan tidak boleh menyetujuinya.');
      }
      if (row.employeeId === CURRENT_USER.id) {
        throw new Error('409 — Anda subjek reprimand ini dan tidak boleh memutuskannya.');
      }
      row.status = 'ACTIVE';
      row.checkerNote = note;
      return;
    }
    await api.post(`/reprimands/${id}/approve`, { note });
  },

  /** Revoke bersifat final — reprimand tidak bisa diaktifkan lagi. */
  async revoke(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (row.employeeId === CURRENT_USER.id) {
        throw new Error('409 — Anda subjek reprimand ini dan tidak boleh memutuskannya.');
      }
      row.status = 'REVOKED';
      row.checkerNote = note;
      return;
    }
    await api.post(`/reprimands/${id}/revoke`, { note });
  },

  // ---------- RP-TYPE-SETTING (GAP: endpoint CRU belum dispesifikasi) ----------

  async categories(): Promise<ReprimandCategory[]> {
    if (MOCK) {
      await delay(200);
      return mockCategories.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: ReprimandCategory[] }>('/config/reprimand-categories');
    return data.rows;
  },

  async saveCategory(category: ReprimandCategory, originalCode?: string): Promise<void> {
    if (MOCK) {
      await delay();
      const duplicate = mockCategories.some(
        (row) => row.code === category.code && row.code !== originalCode,
      );
      if (duplicate) throw new Error('409 — kode kategori sudah dipakai.');

      mockCategories = originalCode
        ? mockCategories.map((row) => (row.code === originalCode ? { ...category } : row))
        : [...mockCategories, { ...category }];
      return;
    }
    if (originalCode) {
      await api.put(`/config/reprimand-categories/${originalCode}`, category);
      return;
    }
    await api.post('/config/reprimand-categories', category);
  },

  /**
   * Menonaktifkan kategori — **soft**, tidak ada hard-delete. Reprimand lama
   * tetap memakai snapshot-nya masing-masing.
   */
  async deactivateCategory(code: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const active = mockCategories.filter((row) => row.active);
      if (active.length <= 1) throw new Error('422 — minimal satu kategori harus tetap aktif.');
      mockCategories = mockCategories.map((row) => (row.code === code ? { ...row, active: false } : row));
      return;
    }
    await api.post(`/config/reprimand-categories/${code}/deactivate`);
  },

  async policy(): Promise<PolicyMode> {
    if (MOCK) {
      await delay(150);
      return mockPolicy;
    }
    const { data } = await api.get<{ mode: PolicyMode }>('/config/reprimand-policy');
    return data.mode;
  },

  async savePolicy(mode: PolicyMode): Promise<void> {
    if (MOCK) {
      await delay();
      mockPolicy = mode;
      return;
    }
    await api.put('/config/reprimand-policy', { mode });
  },
};
