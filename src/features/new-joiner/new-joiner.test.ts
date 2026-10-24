import { describe, expect, it } from 'vitest';
import { candidateSchema, inviteSchema, materializeSchema } from '@/features/new-joiner/validation';
import { newJoinerService, rivalsOf } from '@/features/new-joiner/services/new-joiner.service';
import { STEP_SCHEMAS } from '@/features/new-joiner/addEmployee';
import type { Candidate, CandidateDraft } from '@/features/new-joiner/types';
import { employeeService } from '@/features/employees/services/employee.service';
import { transitionService } from '@/features/transitions/services/transition.service';
import {
  EMPTY_PROFILE,
  atsBridgeService,
  atsAvailableForNewJoiner,
  candidatePortalService,
  previewLink,
} from '@/features/ats-bridge/services/ats-bridge.service';
import { atsCandidatesForNewJoiner } from '@/features/new-joiner/services/new-joiner.service';
import { emptyNewEmployee } from '@/features/new-joiner/newEmployee';
import { useAuthStore } from '@/store/auth.store';

useAuthStore.setState({ user: { id: 'u-hrm', name: 'Tony Stark', email: 'tony@ptdika.co.id', role: 'ROLE_HR_MANAGER' } });

const base: CandidateDraft = {
  positionId: 'pos-be',
  requisitionId: 'REQ-0230',
  name: 'Kandidat Uji',
  nationality: 'CITIZEN',
  idCardNumber: '3171021505900012',
  passportNumber: '',
  visaNumber: '',
  email: 'kandidat@email.com',
  phone: '081234567890',
  intendedJoinDate: '2099-01-01',
};

const edit = { ...base, hasIdCard: false };

const materialize = {
  joinDate: '2099-02-01',
  jobGradeId: 'gr-3a',
  contractFileName: 'k.pdf',
  ...emptyNewEmployee({ username: 'siti.nurhaliza', companyEmail: 'siti.nurhaliza@ptdika.co.id' }),
};

function candidate(patch: Partial<Candidate>): Candidate {
  return {
    id: 'x',
    name: 'X',
    email: 'x@email.com',
    phone: '081234567890',
    positionId: 'pos-be',
    requisitionId: '',
    nationality: 'CITIZEN',
    idCardLast4: '0000',
    passportNumber: '',
    visaNumber: '',
    intendedJoinDate: '2099-01-01',
    status: 'SUBMITTED',
    maker: 'Rina Hartono',
    makerId: 'usr-rina-hartono',
    ...patch,
  };
}

const search = (keyword: string) =>
  employeeService.search({
    keyword,
    branchId: '',
    createdFrom: '',
    createdTo: '',
    employmentStatus: [],
    page: 1,
    size: 10,
    sortBy: 'createdAt',
    sortDir: 'DESC',
  });

/** Calon DRAFT baru lewat From ATS (data kandidat sudah lengkap). */
async function draftFromAts(atsBridgeId: string) {
  return newJoinerService.invite({ requisitionId: 'REQ-0229', positionId: 'pos-hradm', source: 'ATS', email: '', atsBridgeId });
}

describe('Edit DRAFT — MbV identitas', () => {
  it('WNI wajib KTP 16 digit; KTP tersimpan boleh dikosongkan', async () => {
    await expect(candidateSchema.validate(edit)).resolves.toBeTruthy();
    await expect(candidateSchema.validate({ ...edit, idCardNumber: '317102150590' })).rejects.toThrow(/16 digits/);
    await expect(candidateSchema.validate({ ...edit, idCardNumber: '', hasIdCard: true })).resolves.toBeTruthy();
  });

  it('WNA wajib paspor + visa; tanggal masuk tidak boleh lampau', async () => {
    const wna = { ...edit, nationality: 'FOREIGNER', idCardNumber: '', passportNumber: 'A1234567', visaNumber: 'VK2026ABC' };
    await expect(candidateSchema.validate(wna)).resolves.toBeTruthy();
    await expect(candidateSchema.validate({ ...wna, passportNumber: 'a1' })).rejects.toThrow(/6–15/);
    await expect(candidateSchema.validate({ ...wna, visaNumber: '' })).rejects.toThrow(/visa number/);
    await expect(candidateSchema.validate({ ...edit, intendedJoinDate: '2000-01-01' })).rejects.toThrow(/past/);
  });
});

describe('NJ-CREATE 0.83 — undangan', () => {
  it('skema: email wajib untuk Invite by email, kandidat wajib untuk From ATS', async () => {
    const seat = { requisitionId: 'REQ-0230', positionId: 'pos-be' };
    await expect(inviteSchema.validate({ ...seat, source: 'EMAIL', email: '', atsBridgeId: '' })).rejects.toThrow(/email/);
    await expect(inviteSchema.validate({ ...seat, source: 'ATS', email: '', atsBridgeId: '' })).rejects.toThrow(/ATS candidate/);
  });

  it('posisi mengikuti checklist requisition; From ATS tanpa kandidat asal Bulk Import', async () => {
    await expect(
      newJoinerService.invite({ requisitionId: 'REQ-0230', positionId: 'pos-fe', source: 'EMAIL', email: 'a@b.co', atsBridgeId: '' }),
    ).rejects.toThrow(/checklist/);
    const ats = await atsCandidatesForNewJoiner();
    expect(ats.some((item) => item.source === 'BULK_IMPORT')).toBe(false);
  });

  it('requisition wajib APPROVED + aktif dan posisi milik unit requisition (422)', async () => {
    await expect(
      newJoinerService.invite({ requisitionId: 'REQ-0231', positionId: 'pos-fin', source: 'EMAIL', email: 'a@b.co', atsBridgeId: '' }),
    ).rejects.toThrow(/requisition_id/);
    await expect(
      newJoinerService.invite({ requisitionId: 'REQ-0230', positionId: 'pos-hrbp', source: 'EMAIL', email: 'a@b.co', atsBridgeId: '' }),
    ).rejects.toThrow(/position_id/);
  });

  it('Invite by email → WAITING_CANDIDATE + baris ATS sumber New Joiner; email aktif kembar 409; resend', async () => {
    const row = await newJoinerService.invite({
      requisitionId: 'REQ-0230',
      positionId: 'pos-be',
      source: 'EMAIL',
      email: 'Baru.Calon@gmail.com',
      atsBridgeId: '',
    });
    expect(row).toMatchObject({ status: 'WAITING_CANDIDATE', email: 'baru.calon@gmail.com', name: '' });
    const [ats] = await atsBridgeService.search({ source: 'NEW_JOINER', atsStatus: 'WAITING_CANDIDATE', keyword: 'baru.calon' });
    expect(ats.id).toBe(row.atsBridgeId);
    await expect(
      newJoinerService.invite({ requisitionId: 'REQ-0230', positionId: 'pos-be', source: 'EMAIL', email: 'baru.calon@gmail.com', atsBridgeId: '' }),
    ).rejects.toThrow(/409/);
    const before = (await atsBridgeService.detail(ats.id)).linkSendCount;
    await newJoinerService.resendLink(row.id);
    expect((await atsBridgeService.detail(ats.id)).linkSendCount).toBe(before + 1);
  });

  it('From ATS → DRAFT berisi data kandidat; kandidat itu tidak tersedia lagi', async () => {
    const row = await draftFromAts('ats-03');
    expect(row).toMatchObject({ status: 'DRAFT', name: 'Reza Fahlevi', email: 'reza.fahlevi@gmail.com', idCardLast4: '0002' });
    expect(JSON.stringify(row)).not.toContain('3175011203950002');
    expect((await atsAvailableForNewJoiner()).some((item) => item.id === 'ats-03')).toBe(false);
    await expect(draftFromAts('ats-03')).rejects.toThrow(/409/);
    // Kandidat yang masih dipegang calon aktif tidak boleh dihapus dari ATS Bridge.
    await expect(atsBridgeService.remove('ats-03')).rejects.toThrow(/409/);
  });

  it('kandidat undangan mengirim portal → calon WAITING jadi DRAFT; resend tidak berlaku lagi', async () => {
    const token = 'demo-nadia';
    await candidatePortalService.consent(token, 'DIKA', true);
    await candidatePortalService.saveProfile(token, 'DIKA', {
      ...EMPTY_PROFILE,
      candidateName: 'Nadia Rahma',
      nationality: 'CITIZEN',
      idCardNumber: '3175014101990004',
      candidatePhone: '0812 7700 7788',
      placeOfBirth: 'Bandung',
      dateOfBirth: '1999-01-01',
      gender: 'Female',
      maritalStatus: 'Single',
      lastEducation: "Bachelor's degree (S1)",
      religion: 'Islam',
      idCardAddress: 'Jl. Dago 10',
      idCardZip: { zipId: 'z-12950', zip: '12950', provinceName: 'DKI Jakarta', regencyName: 'Jakarta Selatan', districtName: 'Setiabudi', villageName: 'Karet Kuningan' },
    });
    await candidatePortalService.upload(token, 'DIKA', 'cv', new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }));
    await candidatePortalService.upload(token, 'DIKA', 'id-card', new File(['x'], 'ktp.png', { type: 'image/png' }));
    await candidatePortalService.submit(token, 'DIKA');

    const row = (await newJoinerService.list()).find((item) => item.id === 'nj-10')!;
    expect(row).toMatchObject({ status: 'DRAFT', name: 'Nadia Rahma', phone: '+6281277007788', idCardLast4: '0004' });
    await expect(newJoinerService.resendLink(row.id)).rejects.toThrow(/409/);
    // Dari portal belum ada rencana tanggal masuk → wajib lewat Edit dulu.
    await expect(newJoinerService.submit(row.id)).rejects.toThrow(/intended join date/);
    await newJoinerService.update(row.id, { ...base, name: row.name, email: row.email, idCardNumber: '' });
    await newJoinerService.submit(row.id);
    expect((await newJoinerService.list()).find((item) => item.id === 'nj-10')?.status).toBe('SUBMITTED');
  });

  it('batalkan calon WAITING → tautan undangan ikut mati', async () => {
    const row = await newJoinerService.invite({ requisitionId: 'REQ-0230', positionId: 'pos-be', source: 'EMAIL', email: 'batal@gmail.com', atsBridgeId: '' });
    expect(previewLink(row.atsBridgeId!)).not.toBeNull();
    await newJoinerService.cancel(row.id);
    expect(previewLink(row.atsBridgeId!)).toBeNull();
    expect((await atsBridgeService.detail(row.atsBridgeId!)).atsStatus).toBe('INACTIVE');
  });
});

describe('NJ-APPROVE — kursi & saingan', () => {
  it('menghitung hanya kandidat aktif di posisi yang sama sebagai saingan', () => {
    const target = candidate({ id: 'a' });
    const rows = [
      target,
      candidate({ id: 'b', status: 'IN_APPROVAL' }),
      candidate({ id: 'c', status: 'REJECTED' }),
      candidate({ id: 'd', positionId: 'pos-fin' }),
    ];
    expect(rivalsOf(rows, target).map((row) => row.id)).toEqual(['b']);
  });

  it('menolak keputusan oleh maker sendiri (SoD)', async () => {
    await newJoinerService.submit('nj-9');
    await expect(newJoinerService.approve('nj-9', '')).rejects.toThrow(/409/);
  });
});

describe('Edit DRAFT — guard server', () => {
  it('KTP transient: hanya 4 digit terakhir tersimpan; HP diseragamkan ke +62', async () => {
    const row = await draftFromAts('ats-05');
    await newJoinerService.update(row.id, { ...base, name: 'Transient Test', idCardNumber: '3171021505901234', phone: '0812-3456-7890' });
    const saved = (await newJoinerService.list()).find((item) => item.id === row.id)!;
    expect(saved).toMatchObject({ idCardLast4: '1234', phone: '+6281234567890' });
    expect(JSON.stringify(saved)).not.toContain('3171021505901234');
  });

  it('menolak HP, nama, dan KTP di luar pola (422); Ubah/hapus hanya DRAFT (409)', async () => {
    const row = (await newJoinerService.list()).find((item) => item.name === 'Transient Test')!;
    await expect(newJoinerService.update(row.id, { ...base, phone: '021-5551234' })).rejects.toThrow(/candidate_phone/);
    await expect(newJoinerService.update(row.id, { ...base, name: 'Budi123' })).rejects.toThrow(/candidate_name/);
    await expect(newJoinerService.update(row.id, { ...base, idCardNumber: '123' })).rejects.toThrow(/422/);
    const submitted = (await newJoinerService.list()).find((item) => item.status === 'SUBMITTED')!;
    await expect(newJoinerService.update(submitted.id, base)).rejects.toThrow(/409/);
    await expect(newJoinerService.remove(submitted.id)).rejects.toThrow(/409/);
    await expect(newJoinerService.submit(submitted.id)).rejects.toThrow(/409/);
  });
});

describe('NJ-MATERIALIZE & Add Employee', () => {
  it('mewajibkan tanggal, class, kontrak, NIK ≤ 50, username berpola, dan company email', async () => {
    await expect(materializeSchema.validate({ ...materialize, nik: '' })).rejects.toThrow(/NIK/);
    await expect(materializeSchema.validate({ ...materialize, nik: 'x'.repeat(51) })).rejects.toThrow(/50/);
    await expect(materializeSchema.validate({ ...materialize, nik: 'N1', username: '1abc' })).rejects.toThrow(/Start with a letter/);
    await expect(materializeSchema.validate({ ...materialize, nik: 'N1', companyEmail: '' })).rejects.toThrow(/company email/);
    await expect(materializeSchema.validate({ ...materialize, nik: 'N1', accountNumber: '1234567' })).rejects.toThrow(/bank/);
    await expect(materializeSchema.validate({ ...materialize, nik: 'NIK-0200' })).resolves.toBeTruthy();
  });

  it('memvalidasi langkah wizard secara terpisah', async () => {
    await expect(STEP_SCHEMAS[1].validateAt('employeeId', { employeeId: '' })).rejects.toThrow(/Employee ID/);
    await expect(STEP_SCHEMAS[2].validateAt('basicSalary', { basicSalary: '8.000.000' })).rejects.toThrow(/tanpa titik/);
  });

  it('materialize → karyawan di Directory + Onboarding; NIK kembar hanya peringatan; tidak bisa diulang; APPROVED tak bisa dibatalkan', async () => {
    const approved = (await newJoinerService.list()).find((row) => row.status === 'APPROVED')!;
    await expect(newJoinerService.cancel(approved.id)).rejects.toThrow(/409/);
    const before = (await search(approved.name)).total;

    const result = await newJoinerService.materialize({ id: approved.id, ...materialize, nik: 'NIK-0005' });
    expect(result.nikAlsoUsed).toBe(true);

    const after = await search(approved.name);
    expect(after.total).toBe(before + 1);
    expect(after.rows[0]).toMatchObject({
      employmentStatus: 'WAITING',
      nik: 'NIK-0005',
      email: 'siti.nurhaliza@ptdika.co.id',
      branchName: 'HO-Jakarta',
    });
    const onboarding = (await transitionService.list()).find((row) => row.type === 'ONBOARDING' && row.employee === approved.name);
    expect(onboarding?.status).toBe('IN_PROGRESS');

    await expect(newJoinerService.materialize({ id: approved.id, ...materialize, nik: 'NIK-0300' })).rejects.toThrow(/409/);
  });
});
