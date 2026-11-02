import { describe, expect, it } from 'vitest';
import { candidateSchema, materializeSchema } from '@/features/new-joiner/validation';
import { newJoinerService, rivalsOf } from '@/features/new-joiner/services/new-joiner.service';
import { STEP_SCHEMAS } from '@/features/new-joiner/addEmployee';
import type { Candidate } from '@/features/new-joiner/types';
import { employeeService } from '@/features/employees/services/employee.service';
import { candidateDemoLink } from '@/features/new-joiner/services/new-joiner.service';
import { transitionService } from '@/features/transitions/services/transition.service';

const base = {
  positionId: 'pos-be',
  requisitionId: '',
  name: 'Kandidat Uji',
  email: 'kandidat@email.com',
  phone: '081234567890',
  intendedJoinDate: '2099-01-01',
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
    intendedJoinDate: '2099-01-01',
    status: 'SUBMITTED',
    maker: 'Rina Hartono',
    ...patch,
  };
}

describe('NJ-CREATE — MbV identitas', () => {
  it('menerima WNI dengan KTP 16 digit', async () => {
    await expect(
      candidateSchema.validate({ ...base, nationality: 'CITIZEN', idCardNumber: '3171021505900012', passportNumber: '' }),
    ).resolves.toBeTruthy();
  });

  it('menolak KTP yang bukan 16 digit', async () => {
    await expect(
      candidateSchema.validate({ ...base, nationality: 'CITIZEN', idCardNumber: '317102150590', passportNumber: '' }),
    ).rejects.toThrow(/16 digit/);
  });

  it('mewajibkan paspor untuk WNA dan mengabaikan KTP', async () => {
    await expect(
      candidateSchema.validate({ ...base, nationality: 'FOREIGNER', idCardNumber: '', passportNumber: 'A1234567' }),
    ).resolves.toBeTruthy();
    await expect(
      candidateSchema.validate({ ...base, nationality: 'FOREIGNER', idCardNumber: '', passportNumber: 'a1' }),
    ).rejects.toThrow(/6–15 karakter/);
  });

  it('menolak tanggal rencana masuk di masa lalu', async () => {
    await expect(
      candidateSchema.validate({
        ...base,
        intendedJoinDate: '2000-01-01',
        nationality: 'CITIZEN',
        idCardNumber: '3171021505900012',
        passportNumber: '',
      }),
    ).rejects.toThrow(/masa lalu/);
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
    const rows = await newJoinerService.list();
    const own = rows.find((row) => row.status === 'DRAFT');
    expect(own).toBeDefined();
    await newJoinerService.submit(own!.id);
    await expect(newJoinerService.approve(own!.id, '')).rejects.toThrow(/409/);
  });
});

describe('NJ-CREATE — KTP transient', () => {
  it('hanya menyimpan 4 digit terakhir KTP', async () => {
    await newJoinerService.create(
      {
        positionId: 'pos-be',
        requisitionId: '',
        name: 'Transient Test',
        nationality: 'CITIZEN',
        idCardNumber: '3171021505901234',
        passportNumber: '',
        email: 'transient@email.com',
        phone: '081234567890',
        intendedJoinDate: '2099-01-01',
      },
      false,
    );
    const rows = await newJoinerService.list();
    const saved = rows.find((row) => row.name === 'Transient Test');
    expect(saved?.idCardLast4).toBe('1234');
    expect(JSON.stringify(saved)).not.toContain('3171021505901234');
  });
});

describe('NJ-MATERIALIZE & Add Employee', () => {
  it('mewajibkan tanggal, job grade, dan berkas kontrak', async () => {
    await expect(materializeSchema.validate({ joinDate: '', jobGradeId: '', contractFileName: '' })).rejects.toThrow();
    await expect(
      materializeSchema.validate({ ...MAT, contractFileName: 'kontrak.pdf' }),
    ).resolves.toBeTruthy();
    // T59: username dan company email wajib.
    await expect(materializeSchema.validate({ ...MAT, username: '' })).rejects.toThrow(/Username/);
  });

  it('memvalidasi langkah wizard secara terpisah', async () => {
    await expect(STEP_SCHEMAS[1].validateAt('employeeId', { employeeId: '' })).rejects.toThrow(/Employee ID/);
    await expect(STEP_SCHEMAS[2].validateAt('basicSalary', { basicSalary: '8.000.000' })).rejects.toThrow(
      /tanpa titik/,
    );
  });
});

describe('NJ — guard state & koneksi Directory/Onboarding (UIC-EMPLOYEE §4)', () => {
  it('submit hanya dari DRAFT dan hapus hanya DRAFT (409)', async () => {
    const rows = await newJoinerService.list();
    const submitted = rows.find((row) => row.status === 'SUBMITTED')!;
    await expect(newJoinerService.submit(submitted.id)).rejects.toThrow(/409/);
    await expect(newJoinerService.remove(submitted.id)).rejects.toThrow(/409/);
  });

  it('server menolak KTP yang bukan 16 digit (422)', async () => {
    await expect(
      newJoinerService.create(
        { ...base, nationality: 'CITIZEN', idCardNumber: '123', passportNumber: '' },
        false,
      ),
    ).rejects.toThrow(/422/);
  });

  it('materialize melahirkan karyawan di Directory + transisi Onboarding, lalu tidak bisa diulang', async () => {
    const rows = await newJoinerService.list();
    const approved = rows.find((row) => row.status === 'APPROVED')!;
    const directoryBefore = (await employeeService.search({
      keyword: approved.name,
      branchId: '',
      createdFrom: '',
      createdTo: '',
      employmentStatus: [],
      page: 1,
      size: 10,
      sortBy: 'createdAt',
      sortDir: 'DESC',
    })).total;

    await newJoinerService.materialize({ id: approved.id, ...MAT });

    const directoryAfter = await employeeService.search({
      keyword: approved.name,
      branchId: '',
      createdFrom: '',
      createdTo: '',
      employmentStatus: [],
      page: 1,
      size: 10,
      sortBy: 'createdAt',
      sortDir: 'DESC',
    });
    expect(directoryAfter.total).toBe(directoryBefore + 1);
    expect(directoryAfter.rows[0].employmentStatus).toBe('WAITING');

    const onboarding = (await transitionService.list()).find(
      (row) => row.type === 'ONBOARDING' && row.employee === approved.name,
    );
    expect(onboarding?.status).toBe('IN_PROGRESS');

    await expect(
      newJoinerService.materialize({ id: approved.id, ...MAT }),
    ).rejects.toThrow(/409/);
  });
});

const MAT = {
  joinDate: '2099-02-01',
  jobGradeId: 'gr-3a',
  contractFileName: 'k.pdf',
  nik: 'NIK-0131',
  username: 'kandidat.uji',
  companyEmail: 'kandidat.uji@ptdika.co.id',
  workArrangement: 'WFO' as const,
  radiusValidation: true,
  isSelfie: true,
};

describe('Alur New Joiner email-saja (TSD §7.4.1, §7.4.11)', () => {
  it('undang ⇒ WAITING_CANDIDATE; portal mengisi data ⇒ DRAFT; token sekali pakai', async () => {
    const row = await newJoinerService.invite({ source: 'INVITE', requisitionId: 'REQ-0230', positionId: 'pos-be', email: 'calon.baru@gmail.com', atsBridgeId: '' });
    expect(row.status).toBe('WAITING_CANDIDATE');
    await expect(newJoinerService.submit(row.id)).rejects.toThrow(/409/);
    const token = candidateDemoLink(row.id)!.split('#t=')[1];
    await newJoinerService.portalSubmit(token, {
      name: 'Calon Baru',
      nationality: 'CITIZEN',
      idCardNumber: '3175012345678901',
      passportNumber: '',
      phone: '081234567890',
      intendedJoinDate: '2099-03-01',
      cvFileName: 'cv.pdf',
      idPhotoFileName: 'ktp.jpg',
    });
    const after = (await newJoinerService.list()).find((item) => item.id === row.id)!;
    expect(after).toMatchObject({ status: 'DRAFT', name: 'Calon Baru', idCardLast4: '8901' });
    await expect(newJoinerService.portalState(token)).rejects.toThrow(/invalid/);
  });

  it('posisi harus bagian requisition; kandidat ATS Bulk Import tidak bisa dipilih', async () => {
    await expect(
      newJoinerService.invite({ source: 'INVITE', requisitionId: 'REQ-0230', positionId: 'pos-fin', email: 'x@y.com', atsBridgeId: '' }),
    ).rejects.toThrow(/EMP-BIZ-545/);
    expect(newJoinerService.atsOptions().every((row) => row.source !== 'BULK_IMPORT')).toBe(true);
  });
});

describe('NJ-CREATE — candidate_phone (UIC-EMPLOYEE §4.1)', () => {
  it('nomor HP wajib dan diseragamkan ke +62', async () => {
    await expect(newJoinerService.create({ ...base, nationality: 'CITIZEN', idCardNumber: '3171021505909999', passportNumber: '', phone: '' }, false)).rejects.toThrow(/candidate_phone/);
    await newJoinerService.create(
      { ...base, name: 'Phone Test', nationality: 'CITIZEN', idCardNumber: '3171021505908888', passportNumber: '', phone: '0812-3456-7890' },
      false,
    );
    const saved = (await newJoinerService.list()).find((row) => row.name === 'Phone Test');
    expect(saved?.phone).toBe('+6281234567890');
  });

  it('menolak nomor yang tidak berpola +62/0-8xxxxxxxxxx (TSD-EMPLOYEE 0.26 §8.3)', async () => {
    await expect(
      newJoinerService.create({ ...base, nationality: 'CITIZEN', idCardNumber: '3171021505907777', passportNumber: '', phone: '021-5551234' }, false),
    ).rejects.toThrow(/candidate_phone/);
  });
});

describe('NJ-CREATE — candidate_name (TSD-EMPLOYEE 0.26 §8.9)', () => {
  it('menolak nama yang memuat angka atau simbol di luar pola', async () => {
    await expect(
      newJoinerService.create({ ...base, name: 'Budi123', nationality: 'CITIZEN', idCardNumber: '3171021505906666', passportNumber: '' }, false),
    ).rejects.toThrow(/candidate_name/);
  });
});
