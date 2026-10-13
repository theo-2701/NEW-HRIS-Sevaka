import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CANDIDATE_NAME, CANDIDATE_PHONE, normalizePhone } from '@/features/new-joiner/validation';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER, CURRENT_USER_ID } from '@/features/new-joiner/types';
import type { Candidate, CandidateDraft, MaterializePayload, Nationality } from '@/features/new-joiner/types';
import { manpowerService } from '@/features/manpower/services/manpower.service';
import type { Requisition } from '@/features/manpower/types';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';
import { JOB_GRADE_OPTIONS, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import { registerMaterializedEmployee } from '@/features/employees/services/employee.service';
import { startOnboardingForNewJoiner } from '@/features/transitions/services/transition.service';

/**
 * API service New Joiner Submission.
 *
 * Endpoint kontrak (FSD §4 · UIC §4):
 *   GET    /new-joiners                      — NJ-LIST  (lihat catatan gap)
 *   POST   /new-joiners                      — NJ-CREATE (selalu DRAFT)
 *   PUT    /new-joiners/{id}                 — Ubah (hanya DRAFT)
 *   POST   /new-joiners/{id}/submit          — draft → SUBMITTED
 *   POST   /new-joiners/{id}/approve         — NJ-APPROVE, menahan kursi (checker tanpa Tolak —
 *                                                REJECTED hanya otomatis untuk sibling, TSD §7.4.9)
 *   POST   /new-joiners/{id}/cancel          — bukan untuk APPROVED (FSD 0.22)
 *   DELETE /new-joiners/{id}                 — hapus draf
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

type SeedRow = Omit<Candidate, 'makerId'>;

/** Data contoh: ID pembuat dari nama; yang sudah diajukan diberi waktu ajuan 3 minggu sebelum tanggal masuk. */
function seed(row: SeedRow): Candidate {
  const makerId = row.maker === CURRENT_USER ? CURRENT_USER_ID : `usr-${row.maker.toLowerCase().replace(/\s+/g, '-')}`;
  if (row.status === 'DRAFT') return { ...row, makerId };
  const submitted = new Date(`${row.intendedJoinDate}T09:00:00+07:00`);
  submitted.setDate(submitted.getDate() - 21);
  return { ...row, makerId, submittedAt: submitted.toISOString() };
}

let mockRows: Candidate[] = (
  [
    {
      id: 'nj-1',
      name: 'Putri Maharani',
      email: 'putri.m@email.com',
      phone: '+628120000010',
      positionId: 'pos-be',
      requisitionId: 'REQ-0230',
      nationality: 'CITIZEN',
      idCardLast4: '0012',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-11-01',
      status: 'SUBMITTED',
      maker: 'Rina Hartono',
    },
    {
      id: 'nj-2',
      name: 'James Okafor',
      email: 'j.okafor@email.com',
      phone: '+628120000011',
      positionId: 'pos-be',
      requisitionId: 'REQ-0230',
      nationality: 'FOREIGNER',
      idCardLast4: '',
      passportNumber: 'A1234567',
      visaNumber: 'VA12345679',
      intendedJoinDate: '2026-11-01',
      status: 'SUBMITTED',
      maker: 'Rina Hartono',
    },
    {
      id: 'nj-3',
      name: 'Andi Wijaya',
      email: 'andi.w@email.com',
      phone: '+628120000012',
      positionId: 'pos-fin',
      requisitionId: 'REQ-0231',
      nationality: 'CITIZEN',
      idCardLast4: '7781',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-10-28',
      status: 'IN_APPROVAL',
      maker: 'Dewi Anggraini',
    },
    {
      id: 'nj-4',
      name: 'Siti Nurhaliza',
      email: 'siti.n@email.com',
      phone: '+628120000013',
      positionId: 'pos-hrbp',
      requisitionId: 'REQ-0229',
      nationality: 'CITIZEN',
      idCardLast4: '4410',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-10-20',
      status: 'APPROVED',
      maker: 'Rina Hartono',
      seatExpiry: addDays(4),
    },
    {
      id: 'nj-5',
      name: 'Rudi Santoso',
      email: 'rudi.s@email.com',
      phone: '+628120000014',
      positionId: 'pos-sales',
      requisitionId: 'REQ-0228',
      nationality: 'CITIZEN',
      idCardLast4: '9032',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-10-18',
      status: 'APPROVED',
      maker: 'Bagus Pratama',
      seatExpiry: addDays(11),
    },
    {
      id: 'nj-6',
      name: 'Maya Kusuma',
      email: 'maya.k@email.com',
      phone: '+628120000015',
      positionId: 'pos-fin',
      requisitionId: 'REQ-0231',
      nationality: 'CITIZEN',
      idCardLast4: '1187',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-09-15',
      status: 'MATERIALIZED',
      maker: 'Rina Hartono',
      jobGradeId: 'gr-3a',
    },
    {
      id: 'nj-7',
      name: 'Bima Sakti',
      email: 'bima.s@email.com',
      phone: '+628120000016',
      positionId: 'pos-sales',
      requisitionId: 'REQ-0228',
      nationality: 'CITIZEN',
      idCardLast4: '5520',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-09-10',
      status: 'REJECTED',
      maker: 'Bagus Pratama',
    },
    {
      id: 'nj-8',
      name: 'Clara Dubois',
      email: 'clara.d@email.com',
      phone: '+628120000017',
      positionId: 'pos-hrbp',
      requisitionId: 'REQ-0229',
      nationality: 'FOREIGNER',
      idCardLast4: '',
      passportNumber: 'FR889201',
      visaNumber: 'VFR8892019',
      intendedJoinDate: '2026-08-30',
      status: 'EXPIRED',
      maker: 'Dewi Anggraini',
    },
    {
      id: 'nj-9',
      name: 'Yoga Pratama',
      email: 'yoga.p@email.com',
      phone: '+628120000018',
      positionId: 'pos-be',
      requisitionId: 'REQ-0230',
      nationality: 'CITIZEN',
      idCardLast4: '3345',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '2026-12-01',
      status: 'DRAFT',
      maker: CURRENT_USER,
    },
  ] as SeedRow[]
).map(seed);

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
  if (row.makerId === CURRENT_USER_ID) {
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

/** Requisition yang boleh dipilih calon: APPROVED dan hari ini di dalam masa aktifnya (FSD 0.22). */
export function isPickableRequisition(row: Requisition, today = toIsoDate(new Date())): boolean {
  return row.status === 'APPROVED' && row.activeFrom <= today && today <= row.activeUntil;
}

/** L2: payload hanya memuat identitas cabang kewarganegaraan yang terpilih. */
function toBody(draft: CandidateDraft) {
  const { idCardNumber, passportNumber, visaNumber, ...rest } = draft;
  const identity = draft.nationality === 'CITIZEN' ? { idCardNumber } : { passportNumber, visaNumber };
  return { ...rest, ...identity, phone: normalizePhone(draft.phone) };
}

/** Validasi server NJ-CREATE / Ubah (UIC-EMPLOYEE 0.42 §4.1). */
async function assertCandidate(draft: CandidateDraft) {
  const name = draft.name.trim();
  if (!name || name.length > 150) throw new Error('422 — candidate_name wajib, maksimal 150 karakter.');
  if (!CANDIDATE_NAME.test(name)) throw new Error('422 — candidate_name format §8.9 (subset full_name auth).');
  if (!EMAIL.test(draft.email.trim())) throw new Error('422 — candidate_email tidak valid.');
  if (!CANDIDATE_PHONE.test(normalizePhone(draft.phone ?? ''))) {
    throw new Error('422 — candidate_phone wajib, format §8.3 (mis. +628123456789).');
  }
  if (!draft.nationality) throw new Error('422 — nationality wajib dipilih.');
  if (draft.nationality === 'CITIZEN' && !/^\d{16}$/.test(draft.idCardNumber)) {
    throw new Error('422 — id_card_number wajib 16 digit untuk CITIZEN.');
  }
  if (draft.nationality === 'FOREIGNER') {
    if (!/^[A-Z0-9]{6,15}$/.test(draft.passportNumber)) {
      throw new Error('422 — passport_number wajib [A-Z0-9]{6,15} untuk FOREIGNER.');
    }
    if (!draft.visaNumber) throw new Error('422 — visa_number wajib untuk nationality FOREIGNER');
    if (!/^[A-Z0-9]{6,20}$/.test(draft.visaNumber)) throw new Error('422 — visa_number [A-Z0-9]{6,20}.');
  }
  if (!draft.intendedJoinDate || draft.intendedJoinDate < toIsoDate(new Date())) {
    throw new Error('422 — intended_join_date wajib dan tidak boleh di masa lalu.');
  }
  const requisitions = await manpowerService.requisitions();
  const requisition = requisitions.find((row) => row.id === draft.requisitionId);
  if (!requisition || !isPickableRequisition(requisition)) {
    throw new Error('422 — requisition_id wajib menunjuk Requisition APPROVED yang masih di masa aktifnya.');
  }
}

export const newJoinerService = {
  async list(): Promise<Candidate[]> {
    if (MOCK) {
      await delay();
      return mockRows.map((row) => ({ ...row }));
    }
    // UIC-EMPLOYEE §4.5 — grid NJ-LIST.
    const { data } = await api.post<{ data: Candidate[] }>('/new-joiners/search', { page: 1, size: 100 });
    return data.data;
  },

  /** Create §4.1 selalu melahirkan DRAFT; "Ajukan" = transisi §4.2 terpisah (dari panel calon-tersimpan). */
  async create(draft: CandidateDraft): Promise<Candidate> {
    if (MOCK) {
      await delay();
      await assertCandidate(draft);
      const nationality = draft.nationality as Nationality;
      const row: Candidate = {
        id: newId(),
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: normalizePhone(draft.phone),
        positionId: draft.positionId,
        requisitionId: draft.requisitionId,
        nationality,
        // KTP transient: hanya 4 digit terakhir yang disimpan.
        idCardLast4: nationality === 'CITIZEN' ? draft.idCardNumber.slice(-4) : '',
        passportNumber: nationality === 'FOREIGNER' ? draft.passportNumber : '',
        visaNumber: nationality === 'FOREIGNER' ? draft.visaNumber : '',
        intendedJoinDate: draft.intendedJoinDate,
        status: 'DRAFT',
        maker: CURRENT_USER,
        makerId: CURRENT_USER_ID,
      };
      mockRows = [row, ...mockRows];
      return { ...row };
    }
    const { data } = await api.post<Candidate>('/new-joiners', toBody(draft));
    return data;
  },

  /** Ubah — hanya DRAFT (selain itu 409); Posisi & Requisition tidak ikut berubah; MbV dievaluasi ulang. */
  async update(id: string, draft: CandidateDraft): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['DRAFT'], 'ubah');
      await assertCandidate({ ...draft, positionId: row.positionId, requisitionId: row.requisitionId });
      const nationality = draft.nationality as Nationality;
      Object.assign(row, {
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: normalizePhone(draft.phone),
        nationality,
        idCardLast4: nationality === 'CITIZEN' ? draft.idCardNumber.slice(-4) || row.idCardLast4 : '',
        passportNumber: nationality === 'FOREIGNER' ? draft.passportNumber : '',
        visaNumber: nationality === 'FOREIGNER' ? draft.visaNumber : '',
        intendedJoinDate: draft.intendedJoinDate,
      });
      return;
    }
    const { positionId: _p, requisitionId: _r, ...rest } = toBody(draft);
    await api.put(`/new-joiners/${id}`, rest);
  },

  async submit(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['DRAFT'], 'submit');
      row.status = 'SUBMITTED';
      row.submittedAt = new Date().toISOString();
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

  /** Calon APPROVED tidak dapat dibatalkan sejak FSD 0.22 (409). */
  async cancel(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['DRAFT', 'SUBMITTED', 'IN_APPROVAL'], 'cancel');
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
      if (row.status === 'EXPIRED')
        throw new Error('410 — kursi kandidat sudah kedaluwarsa (approved_expiry_date lewat).');
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
