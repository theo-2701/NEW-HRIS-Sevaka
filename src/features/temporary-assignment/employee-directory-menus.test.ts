import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import { workStatusService } from '@/features/work-status/services/work-status.service';
import { emailDomainService } from '@/features/email-domain/services/email-domain.service';
import { roleGrantService } from '@/features/role-grant/services/role-grant.service';
import { temporaryAssignmentService, vacantSeats } from '@/features/temporary-assignment/services/temporary-assignment.service';
import {
  contactVerificationService,
  previewVerificationLink,
} from '@/features/contact-verification/services/contact-verification.service';
import { transitionService } from '@/features/transitions/services/transition.service';

const as = (role: string) => useAuthStore.setState({ user: { id: 'u', name: 'Tony Stark', email: 't@ptdika.co.id', role } });

beforeEach(() => as('ROLE_HR_MANAGER'));

describe('Work Status (FSD-001-EMPLOYEE 0.83 §11)', () => {
  it('nama kembar 409; jenis yang masih dipegang karyawan tidak dapat dinonaktifkan', async () => {
    const [permanent] = await workStatusService.search({ keyword: 'permanent' });
    const { id: _id, activeEmployeeCount: _c, ...input } = permanent;
    await expect(workStatusService.create({ ...input, name: 'permanent employee' })).rejects.toThrow(/^409/);
    await expect(workStatusService.update(permanent.id, { ...input, isActive: false })).rejects.toThrow(/cannot be deactivated/);
    const [freelancer] = await workStatusService.search({ keyword: 'freelancer' });
    const { id: _f, activeEmployeeCount: _n, ...rest } = freelancer;
    await workStatusService.update(freelancer.id, { ...rest, isActive: false });
    expect((await workStatusService.search({ isActive: true })).some((row) => row.id === freelancer.id)).toBe(false);
  });
});

describe('Email Domain (§12)', () => {
  it('disimpan huruf kecil; kembar 409; bentuk tidak sah 422', async () => {
    const row = await emailDomainService.create('Contoh.CO.id');
    expect(row.domainName).toBe('contoh.co.id');
    await expect(emailDomainService.create('contoh.co.id')).rejects.toThrow(/^409/);
    await expect(emailDomainService.create('nodot')).rejects.toThrow(/^422/);
  });
});

describe('Role Grant Rules (§13)', () => {
  it('hanya Super Admin mengubah; Employee wajib; grantable mengikuti pemanggil', async () => {
    expect((await roleGrantService.get()).canEdit).toBe(false);
    await expect(roleGrantService.save([{ grantorRole: 'ROLE_HR_STAFF', grantableRoles: ['ROLE_EMPLOYEE'] }])).rejects.toThrow(/^403/);
    as('ROLE_SUPER_ADMIN');
    await expect(roleGrantService.save([{ grantorRole: 'ROLE_HR_STAFF', grantableRoles: ['ROLE_GA_STAFF'] }])).rejects.toThrow(/^422/);
    await roleGrantService.save([{ grantorRole: 'ROLE_HR_MANAGER', grantableRoles: ['ROLE_EMPLOYEE', 'ROLE_SYSTEM_ADMIN'] }]);
    as('ROLE_HR_MANAGER');
    expect(await roleGrantService.grantable()).toEqual(['ROLE_SYSTEM_ADMIN', 'ROLE_EMPLOYEE']);
  });
});

describe('Temporary Assignment (§10)', () => {
  it('ajukan → pengaju tidak boleh menyetujui → checker lain menyetujui → perpanjang → kembali lebih awal', async () => {
    const seat = vacantSeats('unit-eng-hq')[0];
    const draft = {
      employeeId: 'emp-tony',
      assignmentType: 'ROTATION' as const,
      unitId: 'unit-eng-hq',
      assignedSeatId: seat.id,
      startDate: '2099-01-01',
      returnDate: '2099-02-01',
      reason: '',
    };
    await expect(temporaryAssignmentService.create({ ...draft, employeeId: 'emp-bagus' }, 'k-x')).rejects.toThrow(/active employee/);
    await expect(temporaryAssignmentService.create({ ...draft, returnDate: '2098-12-31' }, 'k-y')).rejects.toThrow(/after the start/);
    const row = await temporaryAssignmentService.create(draft, 'k-ta-1');
    expect(row.status).toBe('IN_APPROVAL');
    await expect(temporaryAssignmentService.create(draft, 'k-ta-2')).rejects.toThrow(/^409/);
    await expect(temporaryAssignmentService.approve(row.id)).rejects.toThrow(/^409/);

    // ta-2 diajukan orang lain: boleh disetujui; mulai di masa depan ⇒ APPROVED, kursi tidak lagi kosong.
    await temporaryAssignmentService.approve('ta-2');
    const approved = (await temporaryAssignmentService.search({ keyword: 'Eka' }))[0];
    expect(approved.status).toBe('APPROVED');
    expect(vacantSeats('unit-ops-jkt').some((item) => item.id === approved.assignedSeatId)).toBe(false);
    await expect(temporaryAssignmentService.extend('ta-2', approved.returnDate)).rejects.toThrow(/^422/);

    await temporaryAssignmentService.returnEarly('ta-1');
    const returned = (await temporaryAssignmentService.search({ keyword: 'Doni' }))[0];
    expect(returned).toMatchObject({ status: 'RETURNED', returnTrigger: 'EARLY' });
  });
});

describe('Email and Phone Verification (§14)', () => {
  it('kirim maksimal 50; saluran terbukti dilewati; verifikasi lewat halaman publik; Cancel access memulai offboarding', async () => {
    await expect(contactVerificationService.send('EMAIL', [])).rejects.toThrow(/^422/);
    const result = await contactVerificationService.send('PHONE', ['cv-2', 'cv-3']);
    expect(result).toMatchObject({ sent: 1, skipped: [{ id: 'cv-2', reason: 'Already verified.' }] });

    await contactVerificationService.send('EMAIL', ['cv-1']);
    const token = previewVerificationLink('cv-1', 'EMAIL')!.split('#t=')[1];
    const done = await contactVerificationService.confirm(token);
    expect(done).toMatchObject({ kind: 'EMAIL', value: 'fajar.nugroho@ptdika.co.id', allVerified: false });
    await expect(contactVerificationService.confirm(token)).rejects.toThrow('404');

    await expect(contactVerificationService.cancelAccess('cv-1', 'OTHER', ' ')).rejects.toThrow(/^422/);
    await contactVerificationService.cancelAccess('cv-1', 'CANDIDATE_WITHDREW', '');
    expect((await contactVerificationService.search()).some((row) => row.id === 'cv-1')).toBe(false);
    const offboarding = (await transitionService.list()).find((row) => row.employee === 'Fajar Nugroho' && row.type === 'OFFBOARDING');
    expect(offboarding?.status).toBe('IN_APPROVAL');
  });
});
