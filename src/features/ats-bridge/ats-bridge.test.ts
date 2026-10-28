import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMPTY_PROFILE,
  atsBridgeService,
  candidatePortalService,
  previewLink,
  resetAtsMocks,
} from '@/features/ats-bridge/services/ats-bridge.service';
import { emptyNewEmployee } from '@/features/new-joiner/newEmployee';
import { useAuthStore } from '@/store/auth.store';

beforeEach(() => {
  resetAtsMocks();
  useAuthStore.setState({ user: { id: 'u-hrs', name: 'HR Staff', email: 'hrs@ptdika.co.id', role: 'ROLE_HR_STAFF' } });
});

const account = (patch = {}) => ({
  joinDate: '2026-11-02',
  jobGradeId: 'gr-3a',
  ...emptyNewEmployee({ nik: 'NIK-0161', username: 'putri.amalia', companyEmail: 'putri.amalia@ptdika.co.id', ...patch }),
});

const profile = {
  ...EMPTY_PROFILE,
  candidateName: 'Andi Wijaya',
  nationality: 'CITIZEN' as const,
  idCardNumber: '3175010101900001',
  candidatePhone: '0812 3456 7890',
  placeOfBirth: 'Jakarta',
  dateOfBirth: '1995-05-01',
  gender: 'Male',
  maritalStatus: 'Single',
  lastEducation: "Bachelor's degree (S1)",
  religion: 'Islam',
  idCardAddress: 'Jl. Rasuna Said 1',
  idCardZip: { zipId: 'z-12950', zip: '12950', provinceName: 'DKI Jakarta', regencyName: 'Jakarta Selatan', districtName: 'Setiabudi', villageName: 'Karet Kuningan' },
};

describe('ATS Bridge (FSD-001-EMPLOYEE §4A)', () => {
  it('undangan ganda untuk email yang masih menunggu ditolak 409', async () => {
    await expect(
      atsBridgeService.invite({ candidateEmail: 'andi.wijaya@gmail.com', requestorEmployeeId: 'emp-x', requestorName: 'X', requestorNik: '1' }),
    ).rejects.toThrow(/409/);
  });

  it('Create Employee: usulan username@domain batch; username & company email wajib; peran di luar hak 403; sandi sekali', async () => {
    await expect(atsBridgeService.resendLink('ats-02')).rejects.toThrow(/409/);
    const detail = await atsBridgeService.detail('ats-02');
    expect(detail.materializeSuggestion).toMatchObject({ username: 'putri.amalia', companyEmail: 'putri.amalia@ptdika.co.id' });
    await expect(atsBridgeService.materialize('ats-02', account({ username: '' }), 'k0')).rejects.toThrow(/username/);
    await expect(atsBridgeService.materialize('ats-02', account({ companyEmail: '' }), 'k0')).rejects.toThrow(/company_email/);
    await expect(atsBridgeService.materialize('ats-02', account({ roleCode: 'ROLE_HR_STAFF' }), 'k0')).rejects.toThrow(/403/);
    await expect(atsBridgeService.materialize('ats-02', account({ username: 'tony.stark' }), 'k0')).rejects.toThrow(/409/);
    await expect(atsBridgeService.materialize('ats-02', account({ accountNumber: '1234567' }), 'k0')).rejects.toThrow(/bank/);
    const result = await atsBridgeService.materialize('ats-02', account({ roleCode: 'ROLE_GA_STAFF' }), 'k1');
    expect(result).toMatchObject({ username: 'putri.amalia', companyEmail: 'putri.amalia@ptdika.co.id' });
    expect(result.mailboxInitialPassword).toHaveLength(14);
    await expect(atsBridgeService.remove('ats-02')).rejects.toThrow(/409/);
  });

  it('Create Employee hanya untuk kandidat Bulk Import yang COMPLETED', async () => {
    await expect(atsBridgeService.materialize('ats-03', account({ username: 'reza.f' }), 'k2')).rejects.toThrow(/422/);
  });
});

describe('Portal kandidat (FSD-001-EMPLOYEE §4B)', () => {
  it('alur penuh: consent → data → dokumen → kirim; tautan mati sesudahnya', async () => {
    const token = previewLink('ats-01')!.split('#t=')[1];
    let state = await candidatePortalService.state(token, 'DIKA');
    expect(state.step).toBe('CONSENT');
    state = await candidatePortalService.consent(token, 'DIKA', false);
    expect(state.step).toBe('CONSENT');
    state = await candidatePortalService.consent(token, 'DIKA', true);
    expect(state.step).toBe('PROFILE');
    state = await candidatePortalService.saveProfile(token, 'DIKA', profile);
    expect(state.step).toBe('DOCUMENTS');
    expect(state.profile.candidatePhone).toBe('+6281234567890');
    await candidatePortalService.upload(token, 'DIKA', 'cv', new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }));
    state = await candidatePortalService.upload(token, 'DIKA', 'id-card', new File(['x'], 'ktp.png', { type: 'image/png' }));
    expect(state.step).toBe('READY');
    state = await candidatePortalService.submit(token, 'DIKA');
    expect(state.step).toBe('DONE');
    await expect(candidatePortalService.state(token, 'DIKA')).rejects.toThrow(/404/);
    const [row] = await atsBridgeService.search({ keyword: 'andi.wijaya' });
    expect(row.atsStatus).toBe('COMPLETED');
  });

  it('isian salah dikembalikan per medan; KTP wajib 16 digit untuk WNI', async () => {
    const token = previewLink('ats-01')!.split('#t=')[1];
    await candidatePortalService.consent(token, 'DIKA', true);
    await expect(candidatePortalService.saveProfile(token, 'DIKA', { ...profile, idCardNumber: '123' })).rejects.toMatchObject({
      fields: { idCardNumber: expect.any(String) },
    });
    // HP seluler Indonesia saja (FSD §4B.1) — nomor luar negeri ditolak.
    await expect(candidatePortalService.saveProfile(token, 'DIKA', { ...profile, candidatePhone: '+6591234567' })).rejects.toMatchObject({
      fields: { candidatePhone: expect.any(String) },
    });
  });

  it('CV harus PDF', async () => {
    const token = previewLink('ats-01')!.split('#t=')[1];
    await expect(
      candidatePortalService.upload(token, 'DIKA', 'cv', new File(['x'], 'cv.docx', { type: 'application/msword' })),
    ).rejects.toThrow(/PDF/);
  });
});
