import { api } from '@/services/api';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER } from '@/features/new-joiner/types';
import type { Candidate, CandidateDraft, MaterializePayload } from '@/features/new-joiner/types';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';

/**
 * API service New Joiner Submission.
 *
 * Endpoint kontrak (FSD §4 · UIC §4):
 *   GET    /new-joiners                      — NJ-LIST  (lihat catatan gap)
 *   POST   /new-joiners                      — NJ-CREATE (draft / submit)
 *   POST   /new-joiners/{id}/submit          — draft → SUBMITTED
 *   POST   /new-joiners/{id}/approve         — NJ-APPROVE, menahan kursi
 *   POST   /new-joiners/{id}/reject
 *   POST   /new-joiners/{id}/cancel
 *   POST   /new-joiners/{id}/materialize     — NJ-MATERIALIZE (Idempotency-Key)
 *
 * `PROB-FRONTEND-004`: kontrak read/list NJ-LIST belum ditegaskan di §7.
 * Selama itu, list dirender dari data contoh dengan struktur envelope grid
 * UIC §1.5 supaya siap dipasang saat endpoint dispesifikasi.
 *
 * KTP dikirim sebagai field transient; yang disimpan hanya 4 digit terakhir.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

/** Kursi yang di-reserve setelah approve berlaku 14 hari (FSD §4.2). */
const SEAT_DAYS = 14;

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

let mockRows: Candidate[] = [
  {
    id: 'nj-1',
    name: 'Putri Maharani',
    email: 'putri.m@email.com',
    positionId: 'pos-be',
    requisitionId: 'REQ-0230',
    nationality: 'CITIZEN',
    idCardLast4: '0012',
    passportNumber: '',
    intendedJoinDate: '2026-11-01',
    status: 'SUBMITTED',
    maker: 'Rina Hartono',
  },
  {
    id: 'nj-2',
    name: 'James Okafor',
    email: 'j.okafor@email.com',
    positionId: 'pos-be',
    requisitionId: 'REQ-0230',
    nationality: 'FOREIGNER',
    idCardLast4: '',
    passportNumber: 'A1234567',
    intendedJoinDate: '2026-11-01',
    status: 'SUBMITTED',
    maker: 'Rina Hartono',
  },
  {
    id: 'nj-3',
    name: 'Andi Wijaya',
    email: 'andi.w@email.com',
    positionId: 'pos-fin',
    requisitionId: 'REQ-0231',
    nationality: 'CITIZEN',
    idCardLast4: '7781',
    passportNumber: '',
    intendedJoinDate: '2026-10-28',
    status: 'IN_APPROVAL',
    maker: 'Dewi Anggraini',
  },
  {
    id: 'nj-4',
    name: 'Siti Nurhaliza',
    email: 'siti.n@email.com',
    positionId: 'pos-hrbp',
    requisitionId: '',
    nationality: 'CITIZEN',
    idCardLast4: '4410',
    passportNumber: '',
    intendedJoinDate: '2026-10-20',
    status: 'APPROVED',
    maker: 'Rina Hartono',
    seatExpiry: addDays(4),
  },
  {
    id: 'nj-5',
    name: 'Rudi Santoso',
    email: 'rudi.s@email.com',
    positionId: 'pos-sales',
    requisitionId: '',
    nationality: 'CITIZEN',
    idCardLast4: '9032',
    passportNumber: '',
    intendedJoinDate: '2026-10-18',
    status: 'APPROVED',
    maker: 'Bagus Pratama',
    seatExpiry: addDays(11),
  },
  {
    id: 'nj-6',
    name: 'Maya Kusuma',
    email: 'maya.k@email.com',
    positionId: 'pos-fin',
    requisitionId: 'REQ-0231',
    nationality: 'CITIZEN',
    idCardLast4: '1187',
    passportNumber: '',
    intendedJoinDate: '2026-09-15',
    status: 'MATERIALIZED',
    maker: 'Rina Hartono',
    jobGradeId: 'gr-3a',
  },
  {
    id: 'nj-7',
    name: 'Bima Sakti',
    email: 'bima.s@email.com',
    positionId: 'pos-sales',
    requisitionId: '',
    nationality: 'CITIZEN',
    idCardLast4: '5520',
    passportNumber: '',
    intendedJoinDate: '2026-09-10',
    status: 'REJECTED',
    maker: 'Bagus Pratama',
  },
  {
    id: 'nj-8',
    name: 'Clara Dubois',
    email: 'clara.d@email.com',
    positionId: 'pos-hrbp',
    requisitionId: '',
    nationality: 'FOREIGNER',
    idCardLast4: '',
    passportNumber: 'FR889201',
    intendedJoinDate: '2026-08-30',
    status: 'EXPIRED',
    maker: 'Dewi Anggraini',
  },
  {
    id: 'nj-9',
    name: 'Yoga Pratama',
    email: 'yoga.p@email.com',
    positionId: 'pos-be',
    requisitionId: '',
    nationality: 'CITIZEN',
    idCardLast4: '3345',
    passportNumber: '',
    intendedJoinDate: '2026-12-01',
    status: 'DRAFT',
    maker: CURRENT_USER,
  },
];

/** Kandidat lain yang masih memperebutkan posisi yang sama. */
export function rivalsOf(rows: Candidate[], candidate: Candidate): Candidate[] {
  return rows.filter(
    (row) =>
      row.id !== candidate.id &&
      row.positionId === candidate.positionId &&
      (row.status === 'SUBMITTED' || row.status === 'IN_APPROVAL'),
  );
}

function find(id: string): Candidate {
  const row = mockRows.find((r) => r.id === id);
  if (!row) throw new Error('Kandidat tidak ditemukan.');
  return row;
}

/** SoD (FSD §4.2): maker tidak boleh menjadi checker atas pengajuannya sendiri. */
function assertChecker(row: Candidate) {
  if (row.maker === CURRENT_USER) {
    throw new Error('409 — Anda pengaju kandidat ini, jadi tidak boleh memutuskan sendiri.');
  }
}

export const newJoinerService = {
  async list(): Promise<Candidate[]> {
    if (MOCK) {
      await delay();
      return mockRows.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Candidate[] }>('/new-joiners');
    return data.rows;
  },

  async create(draft: CandidateDraft, submitNow: boolean): Promise<void> {
    if (MOCK) {
      await delay();
      mockRows = [
        {
          id: newId(),
          name: draft.name.trim(),
          email: draft.email.trim(),
          positionId: draft.positionId,
          requisitionId: draft.requisitionId,
          nationality: draft.nationality,
          // KTP transient: hanya 4 digit terakhir yang disimpan.
          idCardLast4: draft.nationality === 'CITIZEN' ? draft.idCardNumber.slice(-4) : '',
          passportNumber: draft.nationality === 'FOREIGNER' ? draft.passportNumber : '',
          intendedJoinDate: draft.intendedJoinDate,
          status: submitNow ? 'SUBMITTED' : 'DRAFT',
          maker: CURRENT_USER,
        },
        ...mockRows,
      ];
      return;
    }
    await api.post('/new-joiners', { ...draft, submit: submitNow });
  },

  async submit(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      find(id).status = 'SUBMITTED';
      return;
    }
    await api.post(`/new-joiners/${id}/submit`);
  },

  /** Mengembalikan jumlah kandidat saingan yang otomatis ditolak. */
  async approve(id: string, note: string): Promise<number> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
      const rivals = rivalsOf(mockRows, row);
      rivals.forEach((rival) => {
        rival.status = 'REJECTED';
      });
      row.status = 'APPROVED';
      row.seatExpiry = addDays(SEAT_DAYS);
      row.checkerNote = note;
      return rivals.length;
    }
    const { data } = await api.post<{ autoRejected: number }>(`/new-joiners/${id}/approve`, { note });
    return data.autoRejected;
  },

  async reject(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
      row.status = 'REJECTED';
      row.checkerNote = note;
      return;
    }
    await api.post(`/new-joiners/${id}/reject`, { note });
  },

  async cancel(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      row.status = 'CANCELLED';
      delete row.seatExpiry;
      return;
    }
    await api.post(`/new-joiners/${id}/cancel`);
  },

  async remove(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockRows = mockRows.filter((row) => row.id !== id);
      return;
    }
    await api.delete(`/new-joiners/${id}`);
  },

  /**
   * Jalur manual Add Employee (POST /employees). Di luar alur maker/checker;
   * memakai Idempotency-Key dengan alasan yang sama seperti materialize.
   */
  async addEmployee(values: AddEmployeeValues): Promise<void> {
    if (MOCK) {
      await delay(500);
      return;
    }
    await api.post('/employees', values, { headers: { 'Idempotency-Key': newId() } });
  },

  async materialize(payload: MaterializePayload): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(payload.id);
      row.status = 'MATERIALIZED';
      row.jobGradeId = payload.jobGradeId;
      row.intendedJoinDate = payload.joinDate;
      delete row.seatExpiry;
      return;
    }
    // Idempotency-Key: submit yang diulang tidak boleh membuat karyawan ganda.
    await api.post(
      `/new-joiners/${payload.id}/materialize`,
      { joinDate: payload.joinDate, jobGradeId: payload.jobGradeId },
      { headers: { 'Idempotency-Key': newId() } },
    );
  },
};
