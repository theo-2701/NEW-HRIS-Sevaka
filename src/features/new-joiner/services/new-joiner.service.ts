import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER } from '@/features/new-joiner/types';
import type { Candidate, CandidateDraft, MaterializePayload } from '@/features/new-joiner/types';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';
import { JOB_GRADE_OPTIONS, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import { registerMaterializedEmployee } from '@/features/employees/services/employee.service';
import { startOnboardingForNewJoiner } from '@/features/transitions/services/transition.service';

/**
 * API service New Joiner Submission.
 *
 * Endpoint kontrak (FSD §4 · UIC §4):
 *   GET    /new-joiners                      — NJ-LIST  (lihat catatan gap)
 *   POST   /new-joiners                      — NJ-CREATE (draft / submit)
 *   POST   /new-joiners/{id}/submit          — draft → SUBMITTED
 *   POST   /new-joiners/{id}/approve         — NJ-APPROVE, menahan kursi
 *   POST   /new-joiners/{id}/reject          — status REJECTED (§6.3); endpoint tak eksplisit di §4
 *   POST   /new-joiners/{id}/cancel
 *   POST   /new-joiners/{id}/materialize     — NJ-MATERIALIZE (Idempotency-Key)
 *
 * `PROB-FRONTEND-004`: kontrak read/list NJ-LIST belum ditegaskan di §7.
 * Selama itu, list dirender dari data contoh dengan struktur envelope grid
 * UIC §1.5 supaya siap dipasang saat endpoint dispesifikasi.
 *
 * KTP dikirim sebagai field transient; yang disimpan hanya 4 digit terakhir.
 */
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

/** Guard state UIC-EMPLOYEE §4 — transisi di luar status sah = 409. */
function assertStatus(row: Candidate, allowed: Candidate['status'][], action: string) {
  if (!allowed.includes(row.status)) {
    throw new Error(`409 — kandidat berstatus ${row.status}; ${action} hanya sah dari ${allowed.join('/')}.`);
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      // MbV (UIC-EMPLOYEE §4.1): identitas bercabang mengikuti kewarganegaraan.
      const name = draft.name.trim();
      if (!name || name.length > 150) throw new Error('422 — candidate_name wajib, maksimal 150 karakter.');
      if (!EMAIL.test(draft.email.trim())) throw new Error('422 — candidate_email tidak valid.');
      if (draft.nationality === 'CITIZEN' && !/^\d{16}$/.test(draft.idCardNumber)) {
        throw new Error('422 — id_card_number wajib 16 digit untuk CITIZEN.');
      }
      if (draft.nationality === 'FOREIGNER' && !/^[A-Z0-9]{6,15}$/.test(draft.passportNumber)) {
        throw new Error('422 — passport_number wajib [A-Z0-9]{6,15} untuk FOREIGNER.');
      }
      if (!draft.intendedJoinDate || draft.intendedJoinDate < toIsoDate(new Date())) {
        throw new Error('422 — intended_join_date wajib dan tidak boleh di masa lalu.');
      }
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
          // Create §4.1 selalu melahirkan DRAFT; "Ajukan" = transisi §4.2 terpisah.
          status: 'DRAFT',
          maker: CURRENT_USER,
        },
        ...mockRows,
      ];
      if (submitNow) mockRows[0].status = 'SUBMITTED';
      return;
    }
    await api.post('/new-joiners', draft);
    if (submitNow) {
      // Kontrak memisahkan create (DRAFT) dan submit.
    }
  },

  async submit(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['DRAFT'], 'submit');
      row.status = 'SUBMITTED';
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
      assertStatus(row, ['SUBMITTED', 'IN_APPROVAL'], 'approve');
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
      assertStatus(row, ['SUBMITTED', 'IN_APPROVAL'], 'reject');
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
      assertStatus(row, ['DRAFT', 'SUBMITTED', 'IN_APPROVAL', 'APPROVED'], 'cancel');
      row.status = 'CANCELLED';
      delete row.seatExpiry;
      return;
    }
    await api.post(`/new-joiners/${id}/cancel`);
  },

  async remove(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      // FSD §4.2: hanya DRAFT yang boleh dihapus bebas — sesudahnya jejaknya wajib tinggal.
      assertStatus(find(id), ['DRAFT'], 'hapus');
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
      if (row.status === 'MATERIALIZED') throw new Error('409 — kandidat ini sudah dimaterialisasi.');
      const today = toIsoDate(new Date());
      if (row.status === 'APPROVED' && row.seatExpiry && row.seatExpiry < today) row.status = 'EXPIRED';
      if (row.status === 'EXPIRED') throw new Error('410 — kursi kandidat sudah kedaluwarsa (approved_expiry_date lewat).');
      assertStatus(row, ['APPROVED'], 'materialize');
      if (!payload.joinDate) throw new Error('422 — join_date wajib diisi.');
      if (!payload.jobGradeId) throw new Error('422 — job_grade_id wajib (tingkat Class).');

      row.status = 'MATERIALIZED';
      row.jobGradeId = payload.jobGradeId;
      row.intendedJoinDate = payload.joinDate;
      delete row.seatExpiry;

      // Koneksi antar modul: karyawan baru di Directory + transisi Onboarding.
      const positionLabel = labelOf(POSITION_OPTIONS, row.positionId);
      registerMaterializedEmployee({
        name: row.name,
        email: row.email,
        positionLabel,
        jobGrade: labelOf(JOB_GRADE_OPTIONS, payload.jobGradeId),
        joinDate: payload.joinDate,
      });
      startOnboardingForNewJoiner({ name: row.name, positionLabel, effectiveDate: payload.joinDate });
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
