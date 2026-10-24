import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CANDIDATE_NAME, CANDIDATE_PHONE, normalizePhone } from '@/features/new-joiner/validation';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER, CURRENT_USER_ID, POSITIONS, positionsForRequisition } from '@/features/new-joiner/types';
import { assertNewEmployee, claimUsername } from '@/features/new-joiner/newEmployee';
import type { Candidate, CandidateDraft, InviteDraft, MaterializePayload, Nationality } from '@/features/new-joiner/types';
import { manpowerService } from '@/features/manpower/services/manpower.service';
import type { Requisition } from '@/features/manpower/types';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';
import { JOB_GRADE_OPTIONS, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import { employeeService, registerMaterializedEmployee } from '@/features/employees/services/employee.service';
import { startOnboardingForNewJoiner } from '@/features/transitions/services/transition.service';
import {
  atsAvailableForNewJoiner,
  atsBridgeService,
  atsSnapshot,
  inviteForNewJoiner,
  linkAtsToNewJoiner,
  markAtsUsed,
  releaseAtsFromNewJoiner,
} from '@/features/ats-bridge/services/ats-bridge.service';
import type { CandidateProfile } from '@/features/ats-bridge/types';

/**
 * API service New Joiner Submission (FSD-001-EMPLOYEE 0.46 §4 · UIC §4).
 *
 *   POST   /new-joiners/search               — NJ-LIST
 *   POST   /new-joiners                      — NJ-CREATE: Invite by email → WAITING_CANDIDATE,
 *                                                From ATS → DRAFT berisi data kandidat
 *   POST   /new-joiners/{id}/resend-link     — tautan baru untuk calon WAITING_CANDIDATE
 *   PUT    /new-joiners/{id}                 — Ubah (hanya DRAFT; Posisi & Requisition tetap)
 *   POST   /new-joiners/{id}/submit          — DRAFT → SUBMITTED
 *   POST   /new-joiners/{id}/approve         — NJ-APPROVE, menahan kursi (checker tanpa Tolak —
 *                                                REJECTED hanya otomatis untuk sibling, TSD §7.4.9)
 *   POST   /new-joiners/{id}/cancel          — bukan untuk APPROVED (FSD 0.22)
 *   DELETE /new-joiners/{id}                 — hapus draf
 *   POST   /new-joiners/{id}/materialize     — NJ-MATERIALIZE (Idempotency-Key)
 *
 * Data identitas calon datang dari kandidat sendiri (portal ATS). KTP transient: yang tersimpan
 * hanya 4 digit terakhir.
 */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

/** Kursi yang di-reserve setelah approve berlaku 14 hari (FSD §4.2). */
const SEAT_DAYS = 14;

/** Calon yang sudah selesai — email boleh dipakai lagi untuk calon baru. */
const CLOSED: Candidate['status'][] = ['REJECTED', 'MATERIALIZED', 'CANCELLED', 'EXPIRED'];

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

type SeedRow = Omit<Candidate, 'makerId'>;

/** Data contoh: ID pembuat dari nama; yang sudah diajukan diberi waktu ajuan 3 minggu sebelum tanggal masuk. */
function seed(row: SeedRow): Candidate {
  const makerId = row.maker === CURRENT_USER ? CURRENT_USER_ID : `usr-${row.maker.toLowerCase().replace(/\s+/g, '-')}`;
  if (row.status === 'DRAFT' || row.status === 'WAITING_CANDIDATE') return { ...row, makerId };
  const submitted = new Date(`${row.intendedJoinDate}T09:00:00+07:00`);
  submitted.setDate(submitted.getDate() - 21);
  return { ...row, makerId, submittedAt: submitted.toISOString() };
}

let mockRows: Candidate[] = (
  [
    {
      id: 'nj-10',
      name: '',
      email: 'nadia.rahma@gmail.com',
      phone: '',
      positionId: 'pos-be',
      requisitionId: 'REQ-0230',
      nationality: '',
      idCardLast4: '',
      passportNumber: '',
      visaNumber: '',
      intendedJoinDate: '',
      status: 'WAITING_CANDIDATE',
      maker: CURRENT_USER,
      atsBridgeId: 'ats-07',
    },
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
  if (!row) throw new Error('404 — Candidate not found.');
  return row;
}

/** SoD (FSD §4.2): maker tidak boleh menjadi checker atas pengajuannya sendiri. */
function assertChecker(row: Candidate) {
  if (row.makerId === CURRENT_USER_ID) {
    throw new Error('409 — You added this candidate, so someone else must approve it.');
  }
}

/** Guard state UIC-EMPLOYEE §4 — transisi di luar status sah = 409. */
function assertStatus(row: Candidate, allowed: Candidate['status'][], action: string) {
  if (!allowed.includes(row.status)) {
    throw new Error(`409 — This candidate is ${row.status}; ${action} is only allowed from ${allowed.join('/')}.`);
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Requisition yang boleh dipilih calon: APPROVED dan hari ini di dalam masa aktifnya (FSD 0.22). */
export function isPickableRequisition(row: Requisition, today = toIsoDate(new Date())): boolean {
  return row.status === 'APPROVED' && row.activeFrom <= today && today <= row.activeUntil;
}

/** Data isian kandidat (portal ATS) → kolom calon. KTP utuh tidak ikut tersimpan. */
function fromProfile(profile: CandidateProfile): Partial<Candidate> {
  const foreigner = profile.nationality === 'FOREIGNER';
  return {
    name: profile.candidateName,
    phone: normalizePhone(profile.candidatePhone),
    nationality: profile.nationality,
    idCardLast4: foreigner ? '' : profile.idCardNumber.slice(-4),
    passportNumber: foreigner ? profile.passportNumber : '',
    visaNumber: foreigner ? profile.visaNumber : '',
  };
}

/** Mode dummy: kandidat undangan yang sudah mengirim portal → calon WAITING_CANDIDATE jadi DRAFT. */
function syncFromAts() {
  for (const row of mockRows) {
    if (row.status !== 'WAITING_CANDIDATE' || !row.atsBridgeId) continue;
    const snap = atsSnapshot(row.atsBridgeId);
    if (snap?.atsStatus !== 'COMPLETED') continue;
    Object.assign(row, fromProfile(snap.profile), { status: 'DRAFT' });
  }
}

/** L2: payload hanya memuat identitas cabang kewarganegaraan yang terpilih. */
function toBody(draft: CandidateDraft) {
  const { idCardNumber, passportNumber, visaNumber, ...rest } = draft;
  const identity = draft.nationality === 'CITIZEN' ? { idCardNumber } : { passportNumber, visaNumber };
  return { ...rest, ...identity, phone: normalizePhone(draft.phone) };
}

/** Validasi server Ubah (UIC-EMPLOYEE 0.42 §4.1). KTP kosong = tetap memakai yang tersimpan. */
async function assertCandidate(draft: CandidateDraft, keepIdCard: boolean) {
  const name = draft.name.trim();
  if (!name || name.length > 150) throw new Error('422 — candidate_name is required, at most 150 characters.');
  if (!CANDIDATE_NAME.test(name)) throw new Error('422 — candidate_name may only contain letters, spaces and \'.,-');
  if (!EMAIL.test(draft.email.trim())) throw new Error('422 — candidate_email is not a valid email address.');
  if (!CANDIDATE_PHONE.test(normalizePhone(draft.phone ?? ''))) {
    throw new Error('422 — candidate_phone is required, e.g. +628123456789.');
  }
  if (!draft.nationality) throw new Error('422 — nationality is required.');
  if (draft.nationality === 'CITIZEN' && !(keepIdCard && !draft.idCardNumber) && !/^\d{16}$/.test(draft.idCardNumber)) {
    throw new Error('422 — id_card_number must be 16 digits for a CITIZEN.');
  }
  if (draft.nationality === 'FOREIGNER') {
    if (!/^[A-Z0-9]{6,15}$/.test(draft.passportNumber)) {
      throw new Error('422 — passport_number must be [A-Z0-9]{6,15} for a FOREIGNER.');
    }
    if (!draft.visaNumber) throw new Error('422 — visa_number is required for a FOREIGNER.');
    if (!/^[A-Z0-9]{6,20}$/.test(draft.visaNumber)) throw new Error('422 — visa_number must be [A-Z0-9]{6,20}.');
  }
  if (!draft.intendedJoinDate || draft.intendedJoinDate < toIsoDate(new Date())) {
    throw new Error('422 — intended_join_date is required and cannot be in the past.');
  }
}

/** Requisition APPROVED + aktif; posisi milik unit requisition (EMP-BIZ-544) dan checklist-nya (EMP-BIZ-545). */
async function assertSeat(requisitionId: string, positionId: string) {
  const requisition = (await manpowerService.requisitions()).find((row) => row.id === requisitionId);
  if (!requisition || !isPickableRequisition(requisition)) {
    throw new Error('422 — requisition_id must be an approved requisition that is still active.');
  }
  const position = POSITIONS.find((item) => item.value === positionId);
  if (!position || position.unitId !== requisition.unitId) {
    throw new Error("422 — position_id must belong to the requisition's organization unit.");
  }
  if (!positionsForRequisition(requisition).some((item) => item.value === positionId)) {
    throw new Error("422 — position_id is not on the requisition's position checklist.");
  }
}

/**
 * Pilihan "From ATS" (TSD 0.192 §7.4.12, 0.160): kandidat yang sudah lengkap, bukan asal Bulk Import, dan
 * belum dipegang calon aktif — menurut tautan ATS ATAU email yang sama.
 */
export async function atsCandidatesForNewJoiner() {
  const held = new Set(mockRows.filter((row) => !CLOSED.includes(row.status)).map((row) => row.email.toLowerCase()));
  return (await atsAvailableForNewJoiner()).filter(
    (item) => item.source !== 'BULK_IMPORT' && !held.has(item.candidateEmail.toLowerCase()),
  );
}

export const newJoinerService = {
  async list(): Promise<Candidate[]> {
    if (MOCK) {
      await delay();
      syncFromAts();
      return mockRows.map((row) => ({ ...row }));
    }
    // UIC-EMPLOYEE §4.5 — grid NJ-LIST.
    const { data } = await api.post<{ data: Candidate[] }>('/new-joiners/search', { page: 1, size: 100 });
    return data.data;
  },

  /**
   * NJ-CREATE 0.46: Invite by email → WAITING_CANDIDATE + baris ATS `source=NEW_JOINER` berisi tautan;
   * From ATS → DRAFT memakai data kandidat yang sudah lengkap.
   */
  async invite(draft: InviteDraft): Promise<Candidate> {
    if (MOCK) {
      await delay(400);
      await assertSeat(draft.requisitionId, draft.positionId);
      const base: Candidate = {
        id: newId(),
        name: '',
        email: '',
        phone: '',
        positionId: draft.positionId,
        requisitionId: draft.requisitionId,
        nationality: '',
        idCardLast4: '',
        passportNumber: '',
        visaNumber: '',
        intendedJoinDate: '',
        status: 'WAITING_CANDIDATE',
        maker: CURRENT_USER,
        makerId: CURRENT_USER_ID,
      };
      if (draft.source === 'EMAIL') {
        const email = draft.email.trim().toLowerCase();
        if (!EMAIL.test(email)) throw new Error('422 — Enter a valid email address.');
        if (mockRows.some((row) => row.email.toLowerCase() === email && !CLOSED.includes(row.status))) {
          throw new Error('409 — This email already belongs to an active candidate.');
        }
        const row: Candidate = { ...base, email };
        row.atsBridgeId = inviteForNewJoiner(email, row.id, { id: 'emp-tony', name: CURRENT_USER, nik: 'NIK-0001' });
        mockRows = [row, ...mockRows];
        return { ...row };
      }
      const snap = (await atsCandidatesForNewJoiner()).some((item) => item.id === draft.atsBridgeId)
        ? atsSnapshot(draft.atsBridgeId)
        : null;
      if (!snap) throw new Error('409 — This ATS candidate is no longer available. Choose another one.');
      const row: Candidate = {
        ...base,
        ...fromProfile(snap.profile),
        email: snap.candidateEmail,
        status: 'DRAFT',
        atsBridgeId: draft.atsBridgeId,
      };
      linkAtsToNewJoiner(draft.atsBridgeId, row.id);
      mockRows = [row, ...mockRows];
      return { ...row };
    }
    const { data } = await api.post<Candidate>('/new-joiners', {
      requisition_id: draft.requisitionId,
      position_id: draft.positionId,
      candidate_source: draft.source,
      ...(draft.source === 'EMAIL' ? { candidate_email: draft.email.trim() } : { ats_bridge_id: draft.atsBridgeId }),
    });
    return data;
  },

  /** Tautan baru (yang lama mati) untuk calon yang belum mengisi datanya. */
  async resendLink(id: string): Promise<void> {
    if (MOCK) {
      const row = find(id);
      assertStatus(row, ['WAITING_CANDIDATE'], 'resend link');
      await atsBridgeService.resendLink(row.atsBridgeId!);
      return;
    }
    await api.post(`/new-joiners/${id}/resend-link`);
  },

  /** Ubah — hanya DRAFT (selain itu 409); Posisi & Requisition tidak ikut berubah; MbV dievaluasi ulang. */
  async update(id: string, draft: CandidateDraft): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['DRAFT'], 'edit');
      await assertCandidate(draft, Boolean(row.idCardLast4));
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
      // Calon dari portal belum punya rencana tanggal masuk — HR melengkapinya lewat Edit.
      if (!row.intendedJoinDate) throw new Error('422 — Set the intended join date with Edit before submitting.');
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
        if (rival.atsBridgeId) releaseAtsFromNewJoiner(rival.atsBridgeId);
      });
      row.status = 'APPROVED';
      row.seatExpiry = addDays(SEAT_DAYS);
      row.checkerNote = note;
      return rivals.length;
    }
    const { data } = await api.post<{ autoRejected: number }>(`/new-joiners/${id}/approve`, { note });
    return data.autoRejected;
  },

  /** Calon APPROVED tidak dapat dibatalkan sejak FSD 0.22 (409). Undangan yang belum diisi ikut dicabut. */
  async cancel(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['WAITING_CANDIDATE', 'DRAFT', 'SUBMITTED', 'IN_APPROVAL'], 'cancel');
      row.status = 'CANCELLED';
      delete row.seatExpiry;
      if (row.atsBridgeId) releaseAtsFromNewJoiner(row.atsBridgeId);
      return;
    }
    await api.post(`/new-joiners/${id}/cancel`);
  },

  async remove(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      // FSD §4.2: hanya DRAFT yang boleh dihapus bebas — sesudahnya jejaknya wajib tinggal.
      assertStatus(row, ['DRAFT'], 'delete');
      if (row.atsBridgeId) releaseAtsFromNewJoiner(row.atsBridgeId);
      mockRows = mockRows.filter((item) => item.id !== id);
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

  /** NIK saran = nomor urut berikutnya di Directory (format bebas, HR boleh mengganti). */
  async suggestNik(): Promise<string> {
    const { total } = await employeeService.search({
      keyword: '',
      branchId: '',
      createdFrom: '',
      createdTo: '',
      employmentStatus: [],
      page: 1,
      size: 1,
      sortBy: 'createdAt',
      sortDir: 'DESC',
    });
    return `NIK-${String(101 + total).padStart(4, '0')}`;
  },

  /** `nikAlsoUsed` = NIK sama dengan karyawan lain — hanya peringatan, tidak menolak. */
  async materialize(payload: MaterializePayload): Promise<{ nikAlsoUsed: boolean }> {
    if (MOCK) {
      await delay();
      const row = find(payload.id);
      if (row.status === 'MATERIALIZED') throw new Error('409 — This candidate is already an employee.');
      const today = toIsoDate(new Date());
      if (row.status === 'APPROVED' && row.seatExpiry && row.seatExpiry < today) row.status = 'EXPIRED';
      if (row.status === 'EXPIRED') throw new Error('410 — The seat hold has expired (approved_expiry_date passed).');
      assertStatus(row, ['APPROVED'], 'materialize');
      if (!payload.joinDate) throw new Error('422 — join_date is required.');
      if (!payload.jobGradeId) throw new Error('422 — job_grade_id is required.');
      assertNewEmployee(payload);
      const nik = payload.nik.trim();

      const { rows: sameNik } = await employeeService.search({
        keyword: nik,
        branchId: '',
        createdFrom: '',
        createdTo: '',
        employmentStatus: [],
        page: 1,
        size: 50,
        sortBy: 'name',
        sortDir: 'ASC',
      });

      row.status = 'MATERIALIZED';
      row.jobGradeId = payload.jobGradeId;
      row.intendedJoinDate = payload.joinDate;
      delete row.seatExpiry;

      // Koneksi antar modul: karyawan baru di Directory + transisi Onboarding + kandidat ATS terpakai.
      const positionLabel = labelOf(POSITION_OPTIONS, row.positionId);
      const employee = registerMaterializedEmployee({
        name: row.name,
        email: payload.companyEmail.trim(),
        positionLabel,
        jobGrade: labelOf(JOB_GRADE_OPTIONS, payload.jobGradeId),
        joinDate: payload.joinDate,
        nik,
        branchId: POSITIONS.find((item) => item.value === row.positionId)?.branchId,
        bank: payload.bankCode
          ? { bankCode: payload.bankCode, accountNumber: payload.accountNumber, accountHolderName: payload.accountHolderName }
          : undefined,
      });
      claimUsername(payload.username);
      if (row.atsBridgeId) markAtsUsed(row.atsBridgeId, employee.id);
      startOnboardingForNewJoiner({ name: row.name, positionLabel, effectiveDate: payload.joinDate });
      return { nikAlsoUsed: sameNik.some((item) => item.nik === nik) };
    }
    // Idempotency-Key: submit yang diulang tidak boleh membuat karyawan ganda.
    const { data } = await api.post<{ nikAlsoUsed: boolean }>(
      `/new-joiners/${payload.id}/materialize`,
      {
        join_date: payload.joinDate,
        job_grade_id: payload.jobGradeId,
        contract_document_id: payload.contractFileName,
        nik: payload.nik.trim(),
        username: payload.username.trim(),
        company_email: payload.companyEmail.trim(),
        role_code: payload.roleCode || undefined,
        work_status_id: payload.workStatusId || undefined,
        bank_code: payload.bankCode || undefined,
        account_number: payload.accountNumber || undefined,
        account_holder_name: payload.accountHolderName || undefined,
      },
      { headers: { 'Idempotency-Key': newId() } },
    );
    return data;
  },
};
