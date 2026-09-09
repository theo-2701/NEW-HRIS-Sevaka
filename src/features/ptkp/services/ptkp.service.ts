import { api } from '@/services/api';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER, LOCKED_TAX_YEAR_UNTIL } from '@/features/ptkp/types';
import type { PtkpAdjustmentDraft, PtkpCode, PtkpPeriod, PtkpSubject } from '@/features/ptkp/types';

/**
 * API service PTKP Adjustment.
 *
 * Endpoint kontrak (FSD §2 · UIC §8):
 *   GET  /employees/{id}/ptkp-periods     — periode berjalan + riwayat
 *   POST /employees/{id}/ptkp-periods     — PTKP-ADJUST (menutup + membuka)
 *
 * Jalur MOCK menegakkan aturan yang sama seperti server:
 *  • `attestation` wajib `true` → tanpa itu 422.
 *  • Pemohon tidak boleh mengubah PTKP dirinya sendiri → 403.
 *  • Backdate melewati tahun pajak terkunci ditolak.
 *  • Riwayat append-only: baris lama hanya ditutup (diberi `effectiveUntil` dan
 *    status CLOSED), tidak pernah diubah isinya atau dihapus.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

const subjects: PtkpSubject[] = [
  { id: 'emp-eka', name: 'Eka Saputra', nik: 'EMP-0005', position: 'Staff Finance', branch: 'BR-Papua', companyId: 'COMPANY001' },
  { id: 'emp-dimas', name: 'Dimas Prabowo', nik: 'EMP-0012', position: 'Backend Engineer', branch: 'HQ', companyId: 'COMPANY001' },
  { id: 'emp-nadia', name: 'Nadia Rahman', nik: 'EMP-0021', position: 'Sales Executive', branch: 'BR-Surabaya', companyId: 'COMPANY001' },
  { id: CURRENT_USER.id, name: CURRENT_USER.name, nik: 'EMP-0001', position: 'Administrator', branch: 'HQ', companyId: 'COMPANY001' },
];

let mockPeriods: Record<string, PtkpPeriod[]> = {
  'emp-eka': [
    {
      id: 'p-eka-2',
      code: 'TK0',
      effectiveFrom: '2025-01-01',
      effectiveUntil: '',
      status: 'ACTIVE',
      changedBy: 'Rina Hartono',
      recordedAt: '2025-01-02T09:14:00+07:00',
      eventDate: '2025-12-15',
      eventNote: 'pernikahan',
    },
    {
      id: 'p-eka-1',
      code: 'TK0',
      effectiveFrom: '2024-01-01',
      effectiveUntil: '2024-12-31',
      status: 'CLOSED',
      changedBy: 'Rina Hartono',
      recordedAt: '2024-01-04T10:02:00+07:00',
    },
  ],
  'emp-dimas': [
    {
      id: 'p-dimas-1',
      code: 'K1',
      effectiveFrom: '2025-03-01',
      effectiveUntil: '',
      status: 'ACTIVE',
      changedBy: 'Dewi Anggraini',
      recordedAt: '2025-03-01T08:40:00+07:00',
      eventDate: '2025-02-20',
      eventNote: 'kelahiran anak pertama',
    },
  ],
  'emp-nadia': [
    {
      id: 'p-nadia-1',
      code: 'TK1',
      effectiveFrom: '2024-07-01',
      effectiveUntil: '',
      status: 'ACTIVE',
      changedBy: 'Rina Hartono',
      recordedAt: '2024-07-01T13:20:00+07:00',
    },
  ],
  [CURRENT_USER.id]: [
    {
      id: 'p-tony-1',
      code: 'K2',
      effectiveFrom: '2024-01-01',
      effectiveUntil: '',
      status: 'ACTIVE',
      changedBy: 'Rina Hartono',
      recordedAt: '2024-01-03T11:05:00+07:00',
    },
  ],
};

/** Sehari sebelum tanggal mulai periode baru — batas tutup periode lama. */
function previousDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return toIsoDate(date);
}

export const ptkpService = {
  async subjects(): Promise<PtkpSubject[]> {
    if (MOCK) {
      await delay(200);
      return subjects.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: PtkpSubject[] }>('/employees/ptkp-subjects');
    return data.rows;
  },

  async periods(employeeId: string): Promise<PtkpPeriod[]> {
    if (MOCK) {
      await delay(200);
      return (mockPeriods[employeeId] ?? []).map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: PtkpPeriod[] }>(`/employees/${employeeId}/ptkp-periods`);
    return data.rows;
  },

  async adjust(employeeId: string, draft: PtkpAdjustmentDraft): Promise<PtkpPeriod> {
    if (MOCK) {
      await delay();

      if (!draft.attestation) {
        throw new Error('422 — atestasi wajib dicentang sebelum PTKP bisa disimpan.');
      }
      if (employeeId === CURRENT_USER.id) {
        throw new Error('403 — verifier harus berbeda dari pemohon; Anda tidak bisa mengubah PTKP sendiri.');
      }
      if (draft.effectiveFrom <= LOCKED_TAX_YEAR_UNTIL) {
        throw new Error(`422 — tahun pajak sampai ${LOCKED_TAX_YEAR_UNTIL} sudah dikunci; backdate ditolak.`);
      }

      const rows = mockPeriods[employeeId] ?? [];
      const running = rows.find((row) => row.status === 'ACTIVE');
      if (running && draft.effectiveFrom <= running.effectiveFrom) {
        throw new Error('422 — tanggal mulai harus setelah periode berjalan.');
      }

      // Periode berjalan ditutup H-1, tidak dihapus (log append-only).
      const closed = running
        ? { ...running, effectiveUntil: previousDay(draft.effectiveFrom), status: 'CLOSED' as const }
        : null;

      const created: PtkpPeriod = {
        id: newId(),
        code: draft.code as PtkpCode,
        effectiveFrom: draft.effectiveFrom,
        effectiveUntil: '',
        status: 'ACTIVE',
        // Aktor dicap server dari token, bukan dikirim klien.
        changedBy: CURRENT_USER.name,
        recordedAt: new Date().toISOString(),
        eventDate: draft.eventDate || undefined,
        remarks: draft.remarks || undefined,
        documentId: draft.documentName ? `doc-${newId().slice(0, 8)}` : undefined,
      };

      mockPeriods = {
        ...mockPeriods,
        [employeeId]: [created, ...rows.map((row) => (closed && row.id === closed.id ? closed : row))],
      };
      return created;
    }

    const { data } = await api.post<PtkpPeriod>(`/employees/${employeeId}/ptkp-periods`, {
      code: draft.code,
      effectiveFrom: draft.effectiveFrom,
      eventDate: draft.eventDate || undefined,
      remarks: draft.remarks || undefined,
      attestation: draft.attestation,
    });
    return data;
  },
};
