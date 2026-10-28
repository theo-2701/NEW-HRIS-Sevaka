import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { employeeService, registerMaterializedEmployee } from '@/features/employees/services/employee.service';
import { JOB_GRADE_OPTIONS, labelOf } from '@/features/new-joiner/types';
import { assertNewEmployee, claimUsername, suggestUsername } from '@/features/new-joiner/newEmployee';
import { queueContactVerification } from '@/features/contact-verification/services/contact-verification.service';
import type {
  AtsBridge,
  AtsFilter,
  CandidateProfile,
  MaterializeInput,
  MaterializeResult,
  PortalState,
  PortalStep,
  ZipArea,
} from '@/features/ats-bridge/types';

/**
 * ATS Bridge (UIC-EMPLOYEE §4A, TSD §7.4.12) + Portal Kandidat publik (UIC §4B, TSD §7.4.10–11).
 *
 * Mode dummy: satu penyimpanan di memori — portal kandidat mengisi baris ATS yang sama, jadi
 * undangan dari layar HR bisa langsung dicoba lewat tautan pratinjau (`previewLink`).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const DAY = 24 * 60 * 60 * 1000;

export const EMPTY_PROFILE: CandidateProfile = {
  candidateName: '',
  nationality: '',
  idCardNumber: '',
  passportNumber: '',
  visaNumber: '',
  candidatePhone: '',
  placeOfBirth: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  lastEducation: '',
  religion: '',
  bloodType: '',
  homeOwnershipStatus: '',
  disabilityStatus: '',
  motherMaidenName: '',
  npwp: '',
  npwpName: '',
  bpjsTenagaKerjaNumber: '',
  bpjsKesehatanNumber: '',
  idCardAddress: '',
  idCardZip: null,
  isDomicileSameAsIdCard: true,
  domicileAddress: '',
  domicileZip: null,
};

interface Stored extends AtsBridge {
  token: string | null;
  profile: CandidateProfile;
  step: PortalStep;
  /** Calon New Joiner aktif yang memegang kandidat ini (`available_for_new_joiner=false`). */
  linkedNewJoinerId: string | null;
  /** Domain email yang dibekukan batch Bulk Import saat Approve (usulan Company Email). */
  emailDomain: string | null;
}

/** Profil contoh untuk kandidat yang sudah COMPLETED di dataset dummy. */
const filled = (name: string, phone: string, idCard: string): CandidateProfile => ({
  ...EMPTY_PROFILE,
  candidateName: name,
  nationality: 'CITIZEN',
  idCardNumber: idCard,
  candidatePhone: phone,
  placeOfBirth: 'Jakarta',
  dateOfBirth: '1996-04-12',
  gender: 'Female',
  maritalStatus: 'Single',
  lastEducation: "Bachelor's degree (S1)",
  religion: 'Islam',
  idCardAddress: 'Jl. H.R. Rasuna Said Kav. 1',
});

const row = (input: Partial<Stored> & Pick<Stored, 'id' | 'source' | 'atsStatus' | 'candidateEmail'>): Stored => ({
  candidateName: null,
  consentStatus: null,
  requestorEmployeeId: 'emp-sari',
  requestorName: 'Sari Kartika',
  requestorNik: 'NIK-0007',
  parentId: null,
  linkSentAt: '2026-10-23T09:00:00+07:00',
  linkSendCount: 1,
  tokenExpiresAt: '2026-10-24T09:00:00+07:00',
  completedAt: null,
  createdAt: '2026-10-23T09:00:00+07:00',
  cvUploaded: false,
  idPhotoUploaded: false,
  usedEmployeeId: null,
  token: null,
  profile: { ...EMPTY_PROFILE },
  step: 'CONSENT',
  linkedNewJoinerId: null,
  emailDomain: null,
  ...input,
});

const seed = (): Stored[] => [
  row({ id: 'ats-01', source: 'ATS', atsStatus: 'WAITING_CANDIDATE', candidateEmail: 'andi.wijaya@gmail.com', token: 'demo-andi' }),
  row({
    id: 'ats-02',
    source: 'BULK_IMPORT',
    atsStatus: 'COMPLETED',
    candidateEmail: 'putri.amalia@gmail.com',
    candidateName: 'Putri Amalia',
    consentStatus: 'AGREED',
    completedAt: '2026-10-22T15:20:00+07:00',
    createdAt: '2026-10-21T10:00:00+07:00',
    cvUploaded: true,
    idPhotoUploaded: true,
    step: 'DONE',
    profile: filled('Putri Amalia', '+6281277001122', '3175015504960001'),
    emailDomain: 'ptdika.co.id',
  }),
  row({
    id: 'ats-03',
    source: 'NEW_JOINER',
    atsStatus: 'COMPLETED',
    candidateEmail: 'reza.fahlevi@gmail.com',
    candidateName: 'Reza Fahlevi',
    consentStatus: 'AGREED',
    completedAt: '2026-10-22T11:05:00+07:00',
    createdAt: '2026-10-20T08:30:00+07:00',
    cvUploaded: true,
    idPhotoUploaded: true,
    step: 'DONE',
    requestorEmployeeId: 'emp-hendra',
    requestorName: 'Hendra Kusuma',
    requestorNik: 'NIK-0002',
    profile: { ...filled('Reza Fahlevi', '+6281277003344', '3175011203950002'), gender: 'Male' },
  }),
  row({
    id: 'ats-04',
    source: 'ATS',
    atsStatus: 'INACTIVE',
    candidateEmail: 'dewi.anggraini@gmail.com',
    candidateName: 'Dewi Anggraini',
    consentStatus: 'AGREED',
    completedAt: '2026-10-15T13:00:00+07:00',
    createdAt: '2026-10-14T09:00:00+07:00',
    step: 'DONE',
  }),
  row({
    id: 'ats-05',
    source: 'ATS',
    atsStatus: 'COMPLETED',
    candidateEmail: 'dewi.anggraini@gmail.com',
    candidateName: 'Dewi Anggraini',
    consentStatus: 'AGREED',
    parentId: 'ats-04',
    completedAt: '2026-10-21T10:40:00+07:00',
    createdAt: '2026-10-20T09:00:00+07:00',
    cvUploaded: true,
    idPhotoUploaded: true,
    step: 'DONE',
    profile: filled('Dewi Anggraini', '+6281277005566', '3175014409970003'),
  }),
  row({
    id: 'ats-06',
    source: 'BULK_IMPORT',
    atsStatus: 'WAITING_CANDIDATE',
    candidateEmail: 'yoga.pratama@gmail.com',
    consentStatus: 'DECLINED',
    token: 'demo-yoga',
  }),
  // Undangan dari form New Joiner (calon nj-10) — tautan contoh /candidate/DIKA#t=demo-nadia.
  row({
    id: 'ats-07',
    source: 'NEW_JOINER',
    atsStatus: 'WAITING_CANDIDATE',
    candidateEmail: 'nadia.rahma@gmail.com',
    token: 'demo-nadia',
    requestorEmployeeId: 'emp-tony',
    requestorName: 'Tony Stark',
    requestorNik: 'NIK-0001',
    linkedNewJoinerId: 'nj-10',
  }),
];

let store: Stored[] = seed();

export function resetAtsMocks() {
  store = seed();
}

const find = (id: string) => {
  const found = store.find((item) => item.id === id);
  if (!found) throw new Error('404 — Candidate not found.');
  return found;
};

const fromToken = (token: string) => {
  const found = store.find((item) => item.token === token && item.atsStatus === 'WAITING_CANDIDATE');
  // Satu jawaban untuk tak berbentuk / tak ditemukan / kedaluwarsa / terpakai (anti-enumerasi).
  // ponytail: masa berlaku 24 jam tidak dicek di mode dummy supaya tautan contoh tetap bisa dicoba.
  if (!found) {
    throw new Error('404 — This link cannot be used.');
  }
  return found;
};

const strip = ({ token: _t, profile: _p, step: _s, linkedNewJoinerId: _l, emailDomain: _d, ...rest }: Stored): AtsBridge => ({
  ...rest,
});

/** Sandi awal kotak surat (mode dummy) — dibuat server, tampil sekali, tidak disimpan. */
function mailboxPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(14)), (n) => chars[n % chars.length]).join('');
}

const newToken = () => crypto.randomUUID().replace(/-/g, '');

function sendLink(target: Stored) {
  const now = new Date();
  target.token = newToken();
  target.linkSentAt = now.toISOString();
  target.linkSendCount += 1;
  target.tokenExpiresAt = new Date(now.getTime() + DAY).toISOString();
}

/** Data kandidat yang dibaca New Joiner (sumber From ATS, dan saat kandidat undangan selesai mengisi). */
export interface AtsSnapshot {
  atsStatus: AtsBridge['atsStatus'];
  candidateEmail: string;
  profile: CandidateProfile;
}

export function atsSnapshot(id: string): AtsSnapshot | null {
  const found = store.find((item) => item.id === id);
  return found ? { atsStatus: found.atsStatus, candidateEmail: found.candidateEmail, profile: { ...found.profile } } : null;
}

/** `POST /ats-bridges/search` `available_for_new_joiner=true`: setuju + lengkap + belum dipegang calon aktif. */
export async function atsAvailableForNewJoiner(): Promise<AtsBridge[]> {
  if (MOCK) {
    await delay(150);
    return store
      .filter((item) => item.atsStatus === 'COMPLETED' && item.consentStatus === 'AGREED' && !item.linkedNewJoinerId)
      .map(strip);
  }
  const { data } = await api.post<{ data: AtsBridge[] }>('/employee/ats-bridges/search', {
    available_for_new_joiner: true,
    page: 1,
    size: 100,
  });
  return data.data;
}

/** Mode dummy: penautan kandidat ATS ke calon New Joiner (dilepas saat calon batal). */
export function linkAtsToNewJoiner(atsId: string, newJoinerId: string | null) {
  const found = store.find((item) => item.id === atsId);
  if (found) found.linkedNewJoinerId = newJoinerId;
}

/**
 * Mode dummy: calon New Joiner batal/ditolak → kandidat dilepas. Undangan yang belum diisi ikut mati
 * (token dicabut, INACTIVE) supaya tautan lama tidak bisa dipakai lagi.
 */
export function releaseAtsFromNewJoiner(atsId: string) {
  const found = store.find((item) => item.id === atsId);
  if (!found) return;
  found.linkedNewJoinerId = null;
  if (found.atsStatus === 'WAITING_CANDIDATE') {
    found.atsStatus = 'INACTIVE';
    found.token = null;
  }
}

/** Mode dummy: calon New Joiner dimaterialisasi → kandidat ATS terpakai. */
export function markAtsUsed(atsId: string, employeeId: string) {
  const found = store.find((item) => item.id === atsId);
  if (!found) return;
  found.atsStatus = 'USED';
  found.usedEmployeeId = employeeId;
}

/** Mode dummy: undangan dari form New Joiner (sumber Invite by email) = baris ATS `source=NEW_JOINER`. */
export function inviteForNewJoiner(email: string, newJoinerId: string, requestor: { id: string; name: string; nik: string }): string {
  if (store.some((item) => item.candidateEmail === email.toLowerCase() && item.atsStatus === 'WAITING_CANDIDATE')) {
    throw new Error('409 — This email already has a pending invitation.');
  }
  const created = row({
    id: `ats-${String(store.length + 10).padStart(2, '0')}`,
    source: 'NEW_JOINER',
    atsStatus: 'WAITING_CANDIDATE',
    candidateEmail: email.toLowerCase(),
    requestorEmployeeId: requestor.id,
    requestorName: requestor.name,
    requestorNik: requestor.nik,
    createdAt: new Date().toISOString(),
    linkSendCount: 0,
    linkedNewJoinerId: newJoinerId,
  });
  sendLink(created);
  store = [created, ...store];
  return created.id;
}

/** Mode dummy: email yang masih menunggu kandidat atau sudah jadi karyawan tidak diundang ulang lewat impor. */
export function atsEmailTaken(email: string): boolean {
  return store.some(
    (item) => item.candidateEmail === email.toLowerCase() && (item.atsStatus === 'WAITING_CANDIDATE' || item.atsStatus === 'USED'),
  );
}

/**
 * Mode dummy: persetujuan Bulk Import mengirim magic link user consent ke tiap email yang lolos periksa
 * dan melahirkan satu baris ATS `source=BULK_IMPORT` (FSD-001-EMPLOYEE 0.46 §8).
 */
export function inviteFromImport(
  email: string,
  requestor: { id: string; name: string; nik: string },
  emailDomain: string | null = null,
): string {
  const created = row({
    id: `ats-${String(store.length + 10).padStart(2, '0')}`,
    source: 'BULK_IMPORT',
    atsStatus: 'WAITING_CANDIDATE',
    candidateEmail: email.toLowerCase(),
    requestorEmployeeId: requestor.id,
    requestorName: requestor.name,
    requestorNik: requestor.nik,
    createdAt: new Date().toISOString(),
    linkSendCount: 0,
    emailDomain,
  });
  sendLink(created);
  store = [created, ...store];
  return created.id;
}

/** Pratinjau tautan kandidat (mode dummy) — di produksi tautan hanya ada di email kandidat. */
export function previewLink(id: string, companyCode = 'DIKA'): string | null {
  const found = store.find((item) => item.id === id);
  return found?.token && found.atsStatus === 'WAITING_CANDIDATE' ? `/candidate/${companyCode}#t=${found.token}` : null;
}

/**
 * Naskah contoh. Kontrak mengirim `content_html`; mode dummy memakai teks biasa — blok dipisah baris
 * kosong, baris pertama blok yang diawali nomor ("1. …") dibaca layar sebagai subjudul.
 */
const CONSENT_TEXT = `By continuing, you agree that PT Danamas Insan Kreasi Andalan may collect and process the personal data you provide in this form, under Law No. 27 of 2022 on Personal Data Protection.

1. Data we collect
Identity data: full name, ID card (KTP) or passport and visa number, place and date of birth, gender, religion, marital status, blood type, disability status and mother's maiden name.
Contact data: mobile number, email and the address on your ID card and your domicile.
Tax and insurance data: tax ID (NPWP) and BPJS numbers, if you have them.
Documents: your CV and a photo of your ID card.

2. Why we use it
Your data is used only to assess your application and, if you are hired, to prepare your employment record, payroll, tax and BPJS registration.

3. Who can see it
Only the HR team that invited you and the people directly involved in your hiring. We do not sell your data or share it for marketing.

4. How long we keep it
If you are hired, your data moves to your employee record. If you are not hired, we delete it within 12 months, unless a regulation requires us to keep it longer.

5. Your rights
You may ask to see, correct or delete your data, or withdraw this consent, by contacting the HR team that invited you. Withdrawing consent stops your application process.

6. If you do not agree
You may decline. Your data will not be processed, and we cannot continue your hiring through this form.`;

/** Kode pos contoh — referensi wilayah dummy. */
const ZIPS: ZipArea[] = [
  { zipId: 'z-12950', zip: '12950', provinceName: 'DKI Jakarta', regencyName: 'Jakarta Selatan', districtName: 'Setiabudi', villageName: 'Karet Kuningan' },
  { zipId: 'z-12920', zip: '12920', provinceName: 'DKI Jakarta', regencyName: 'Jakarta Selatan', districtName: 'Setiabudi', villageName: 'Karet Semanggi' },
  { zipId: 'z-40115', zip: '40115', provinceName: 'Jawa Barat', regencyName: 'Kota Bandung', districtName: 'Coblong', villageName: 'Dago' },
  { zipId: 'z-40115b', zip: '40115', provinceName: 'Jawa Barat', regencyName: 'Kota Bandung', districtName: 'Coblong', villageName: 'Lebak Siliwangi' },
  { zipId: 'z-90111', zip: '90111', provinceName: 'Sulawesi Selatan', regencyName: 'Kota Makassar', districtName: 'Ujung Pandang', villageName: 'Baru' },
];

function state(target: Stored, companyCode: string): PortalState {
  return {
    step: target.step,
    candidateEmail: target.candidateEmail,
    companyCode,
    // ponytail: tanggal seed sudah lewat; pratinjau menampilkan sisa masa berlaku yang wajar (+20 jam dari sekarang).
    expiresAt:
      target.tokenExpiresAt && Date.parse(target.tokenExpiresAt) > Date.now()
        ? target.tokenExpiresAt
        : new Date(Date.now() + 20 * 3_600_000).toISOString(),
    consentStatus: target.consentStatus,
    consent: target.step === 'CONSENT' ? { versionNo: '3', content: CONSENT_TEXT } : null,
    profile: { ...target.profile },
    cvUploaded: target.cvUploaded,
    idPhotoUploaded: target.idPhotoUploaded,
  };
}

/** Validasi isian portal (UIC §4B.2 #3); kembalikan pesan per medan. */
export function validateProfile(profile: CandidateProfile): Record<string, string> {
  const errors: Record<string, string> = {};
  const need = (key: keyof CandidateProfile, message: string) => {
    if (!String(profile[key] ?? '').trim()) errors[key] = message;
  };
  need('candidateName', 'Enter your full name.');
  need('nationality', 'Choose your nationality.');
  if (profile.nationality === 'CITIZEN' && !/^\d{16}$/.test(profile.idCardNumber)) {
    errors.idCardNumber = 'Enter the 16-digit ID card number.';
  }
  if (profile.nationality === 'FOREIGNER') {
    need('passportNumber', 'Enter your passport number.');
    need('visaNumber', 'Enter your visa number.');
  }
  if (!/^(\+62|62|0)8\d{7,12}$/.test(profile.candidatePhone.replace(/[\s-]/g, ''))) {
    errors.candidatePhone = 'Enter an Indonesian mobile number, e.g. 0812 3456 7890.';
  }
  need('placeOfBirth', 'Enter your place of birth.');
  need('dateOfBirth', 'Enter your date of birth.');
  need('gender', 'Choose your gender.');
  need('maritalStatus', 'Choose your marital status.');
  need('lastEducation', 'Choose your last education.');
  need('religion', 'Choose your religion.');
  need('idCardAddress', 'Enter the address on your ID card.');
  if (!profile.idCardZip) errors.idCardZip = 'Search your postal code and choose your area.';
  if (!profile.isDomicileSameAsIdCard) {
    need('domicileAddress', 'Enter your domicile address.');
    if (!profile.domicileZip) errors.domicileZip = 'Search the domicile postal code and choose your area.';
  }
  return errors;
}

const normalizePhone = (value: string) => {
  const digits = value.replace(/[\s-]/g, '');
  if (digits.startsWith('+62')) return digits;
  if (digits.startsWith('62')) return `+${digits}`;
  return `+62${digits.replace(/^0/, '')}`;
};

export const atsBridgeService = {
  async search(filter: AtsFilter = {}): Promise<AtsBridge[]> {
    if (MOCK) {
      await delay();
      const keyword = (filter.keyword ?? '').trim().toLowerCase();
      return store
        .filter((item) => {
          if (filter.atsStatus && item.atsStatus !== filter.atsStatus) return false;
          if (filter.source && item.source !== filter.source) return false;
          if (filter.consentStatus && item.consentStatus !== filter.consentStatus) return false;
          if (!keyword) return true;
          return [item.candidateEmail, item.candidateName ?? ''].some((value) => value.toLowerCase().includes(keyword));
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map(strip);
    }
    const { data } = await api.post<{ data: AtsBridge[] }>('/employee/ats-bridges/search', {
      keyword: filter.keyword || undefined,
      ats_status: filter.atsStatus,
      source: filter.source,
      consent_status: filter.consentStatus,
      page: 1,
      size: 100,
      sort_by: 'created_at',
      sort_direction: 'DESC',
    });
    return data.data;
  },

  async detail(
    id: string,
  ): Promise<AtsBridge & { materializeSuggestion: { username: string; nik: string; companyEmail: string } | null }> {
    if (MOCK) {
      await delay(150);
      const found = find(id);
      const username = suggestUsername(found.candidateEmail);
      const suggest =
        found.source === 'BULK_IMPORT' && found.atsStatus === 'COMPLETED'
          ? {
              username,
              nik: `NIK-${String(160 + store.length).padStart(4, '0')}`,
              // username@domain bila batch asal memilih Company Email Domain saat Approve.
              companyEmail: found.emailDomain ? `${username}@${found.emailDomain}` : '',
            }
          : null;
      return { ...strip(found), materializeSuggestion: suggest };
    }
    const { data } = await api.get(`/employee/ats-bridges/${id}`);
    return data;
  },

  async invite(input: { candidateEmail: string; requestorEmployeeId: string; requestorName: string; requestorNik: string }) {
    const email = input.candidateEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('422 — Enter a valid email address.');
    if (!input.requestorEmployeeId) throw new Error('422 — Choose the requestor.');
    if (MOCK) {
      await delay(400);
      if (store.some((item) => item.candidateEmail === email && item.atsStatus === 'WAITING_CANDIDATE')) {
        throw new Error('409 — This email already has a pending invitation. Use Resend Link instead.');
      }
      const created = row({
        id: `ats-${String(store.length + 10).padStart(2, '0')}`,
        source: 'ATS',
        atsStatus: 'WAITING_CANDIDATE',
        candidateEmail: email,
        requestorEmployeeId: input.requestorEmployeeId,
        requestorName: input.requestorName,
        requestorNik: input.requestorNik,
        createdAt: new Date().toISOString(),
        linkSendCount: 0,
      });
      sendLink(created);
      store = [created, ...store];
      return strip(created);
    }
    const { data } = await api.post<AtsBridge>('/employee/ats-bridges', {
      candidate_email: email,
      requestor_employee_id: input.requestorEmployeeId,
    });
    return data;
  },

  async resendLink(id: string): Promise<AtsBridge> {
    if (MOCK) {
      await delay(300);
      const found = find(id);
      if (found.atsStatus !== 'WAITING_CANDIDATE') throw new Error('409 — Only a candidate still waiting can get a new link.');
      sendLink(found);
      return strip(found);
    }
    const { data } = await api.post<AtsBridge>(`/employee/ats-bridges/${id}/resend-link`, {});
    return data;
  },

  async remove(id: string): Promise<void> {
    if (MOCK) {
      await delay(300);
      const found = find(id);
      if (found.atsStatus === 'USED') throw new Error('409 — This candidate is already an employee and cannot be deleted.');
      if (found.linkedNewJoinerId) {
        throw new Error('409 — This candidate is used by an active New Joiner submission. Cancel that submission first.');
      }
      store = store.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/employee/ats-bridges/${id}`);
  },

  /** Kandidat asal Bulk Import yang `COMPLETED` → karyawan (UIC §4A.5). */
  async materialize(id: string, input: MaterializeInput, idempotencyKey: string): Promise<MaterializeResult> {
    if (!input.joinDate) throw new Error('422 — Enter the start date.');
    if (!input.jobGradeId) throw new Error('422 — Choose a grade.');
    if (MOCK) {
      assertNewEmployee(input);
      await delay(500);
      const found = find(id);
      if (found.source !== 'BULK_IMPORT' || found.atsStatus !== 'COMPLETED') {
        throw new Error('422 — Only a completed Bulk Import candidate can be created as an employee here.');
      }
      const nik = input.nik.trim();
      const { rows } = await employeeService.search({
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
      const employee = registerMaterializedEmployee({
        name: found.candidateName ?? found.candidateEmail,
        email: input.companyEmail.trim() || found.candidateEmail,
        positionLabel: 'Staff — Operations',
        jobGrade: labelOf(JOB_GRADE_OPTIONS, input.jobGradeId),
        joinDate: input.joinDate,
        nik,
        bank: input.bankCode
          ? { bankCode: input.bankCode, accountNumber: input.accountNumber, accountHolderName: input.accountHolderName }
          : undefined,
      });
      claimUsername(input.username);
      queueContactVerification({
        employeeId: employee.id,
        name: employee.name,
        nik,
        username: input.username.trim(),
        companyEmail: input.companyEmail.trim(),
        phone: found.profile.candidatePhone,
      });
      found.atsStatus = 'USED';
      found.usedEmployeeId = employee.id;
      return {
        employeeId: employee.id,
        username: input.username.trim(),
        companyEmail: input.companyEmail.trim(),
        mailboxInitialPassword: mailboxPassword(),
        nikAlsoUsed: rows.some((item) => item.nik === nik),
      };
    }
    const { data } = await api.post<MaterializeResult>(
      `/employee/ats-bridges/${id}/materialize`,
      {
        join_date: input.joinDate,
        job_grade_id: input.jobGradeId,
        nik: input.nik.trim(),
        username: input.username.trim(),
        company_email: input.companyEmail.trim(),
        role_code: input.roleCode || undefined,
        work_status_id: input.workStatusId || undefined,
        bank_code: input.bankCode || undefined,
        account_number: input.accountNumber || undefined,
        account_holder_name: input.accountHolderName || undefined,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data;
  },
};

/**
 * Portal kandidat — PUBLIK, tanpa login; tiap panggilan membawa header `X-Candidate-Token`
 * (token tidak pernah dikirim di URL; FE menyimpannya di sessionStorage).
 */
export const candidatePortalService = {
  async state(token: string, companyCode: string): Promise<PortalState> {
    if (MOCK) {
      await delay(200);
      return state(fromToken(token), companyCode);
    }
    const { data } = await api.get<PortalState>('/employee/candidate-portal/state', {
      headers: { 'X-Candidate-Token': token },
    });
    return data;
  },

  async consent(token: string, companyCode: string, accepted: boolean): Promise<PortalState> {
    if (MOCK) {
      await delay(250);
      const target = fromToken(token);
      target.consentStatus = accepted ? 'AGREED' : 'DECLINED';
      if (accepted) target.step = 'PROFILE';
      return state(target, companyCode);
    }
    const { data } = await api.post<PortalState>(
      '/employee/candidate-portal/consent',
      { accepted },
      { headers: { 'X-Candidate-Token': token } },
    );
    return data;
  },

  async saveProfile(token: string, companyCode: string, profile: CandidateProfile): Promise<PortalState> {
    const errors = validateProfile(profile);
    if (Object.keys(errors).length) {
      throw Object.assign(new Error('422 — Some fields need your attention.'), { fields: errors });
    }
    if (MOCK) {
      await delay(300);
      const target = fromToken(token);
      if (target.consentStatus !== 'AGREED') throw new Error('422 — Agree to the consent first.');
      // Nilai yang tidak berlaku dibuang server (paspor+visa untuk WNI, KTP untuk WNA).
      target.profile = {
        ...profile,
        candidatePhone: normalizePhone(profile.candidatePhone),
        idCardNumber: profile.nationality === 'CITIZEN' ? profile.idCardNumber : '',
        passportNumber: profile.nationality === 'FOREIGNER' ? profile.passportNumber : '',
        visaNumber: profile.nationality === 'FOREIGNER' ? profile.visaNumber : '',
      };
      target.candidateName = profile.candidateName.trim();
      target.step = target.cvUploaded && target.idPhotoUploaded ? 'READY' : 'DOCUMENTS';
      return state(target, companyCode);
    }
    const { data } = await api.put<PortalState>('/employee/candidate-portal/profile', profile, {
      headers: { 'X-Candidate-Token': token },
    });
    return data;
  },

  async zips(token: string, zip: string): Promise<ZipArea[]> {
    if (!/^\d{5}$/.test(zip)) throw new Error('422 — A postal code has exactly 5 digits.');
    if (MOCK) {
      await delay(250);
      fromToken(token);
      return ZIPS.filter((item) => item.zip === zip);
    }
    const { data } = await api.get<ZipArea[]>('/employee/candidate-portal/zips', {
      params: { zip },
      headers: { 'X-Candidate-Token': token },
    });
    return data;
  },

  async upload(token: string, companyCode: string, kind: 'cv' | 'id-card', file: File): Promise<PortalState> {
    if (file.size > 5 * 1024 * 1024) throw new Error('422 — The file is larger than 5 MB.');
    const okType = kind === 'cv' ? file.type === 'application/pdf' : ['image/jpeg', 'image/png'].includes(file.type);
    if (!okType) throw new Error(kind === 'cv' ? '422 — Upload a PDF file.' : '422 — Upload a JPEG or PNG photo.');
    if (MOCK) {
      await delay(500);
      const target = fromToken(token);
      if (kind === 'cv') target.cvUploaded = true;
      else target.idPhotoUploaded = true;
      if (target.cvUploaded && target.idPhotoUploaded && target.step === 'DOCUMENTS') target.step = 'READY';
      return state(target, companyCode);
    }
    const body = new FormData();
    body.append('file', file);
    const { data } = await api.post<PortalState>(`/employee/candidate-portal/documents/${kind}`, body, {
      headers: { 'X-Candidate-Token': token },
    });
    return data;
  },

  /** Kirim data: token mati, status ATS `COMPLETED`, baris lama kembar (email/KTP) jadi `INACTIVE`. */
  async submit(token: string, companyCode: string): Promise<PortalState> {
    if (MOCK) {
      await delay(400);
      const target = fromToken(token);
      if (target.consentStatus !== 'AGREED' || !target.profile.candidateName || !target.cvUploaded || !target.idPhotoUploaded) {
        throw new Error('422 — Complete the consent, your data and both documents first.');
      }
      const twin = store.find(
        (item) =>
          item.id !== target.id &&
          item.atsStatus === 'COMPLETED' &&
          (item.candidateEmail === target.candidateEmail ||
            (target.profile.idCardNumber && item.profile.idCardNumber === target.profile.idCardNumber)),
      );
      if (twin) {
        twin.atsStatus = 'INACTIVE';
        target.parentId = twin.id;
      }
      target.atsStatus = 'COMPLETED';
      target.completedAt = new Date().toISOString();
      target.step = 'DONE';
      const done = state(target, companyCode);
      target.token = null;
      return done;
    }
    const { data } = await api.post<PortalState>('/employee/candidate-portal/submit', {}, {
      headers: { 'X-Candidate-Token': token },
    });
    return data;
  },
};
