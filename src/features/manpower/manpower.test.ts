import { describe, expect, it } from 'vitest';
import { planSchema, requisitionSchema } from '@/features/manpower/validation';
import { manpowerService } from '@/features/manpower/services/manpower.service';
import { CURRENT_USER, planTotals } from '@/features/manpower/types';
import type { ManpowerPlan } from '@/features/manpower/types';

const validRequisition = {
  planId: '',
  unitId: 'unit-fin-papua',
  parentPositionId: 'pos-fin-mgr',
  title: 'Staff Finance',
  headcount: 2,
  justification: 'Cabang baru butuh dua staf finance.',
};

describe('REQ-CREATE — validasi', () => {
  it('menolak headcount di bawah 1', async () => {
    await expect(
      requisitionSchema.validateAt('headcount', { ...validRequisition, headcount: 0 }),
    ).rejects.toThrow(/minimal 1/);
  });

  it('menolak justifikasi kosong dan judul lebih dari 150 karakter', async () => {
    await expect(
      requisitionSchema.validateAt('justification', { ...validRequisition, justification: '  ' }),
    ).rejects.toThrow(/Justifikasi wajib/);
    await expect(
      requisitionSchema.validateAt('title', { ...validRequisition, title: 'x'.repeat(151) }),
    ).rejects.toThrow(/150 karakter/);
  });

  it('menerima requisition yang lengkap', async () => {
    await expect(requisitionSchema.validate(validRequisition)).resolves.toBeTruthy();
  });
});

describe('REQ-CREATE — draft-first', () => {
  it('menyimpan sebagai DRAFT tanpa submit, dan IN_APPROVAL bila disubmit', async () => {
    const draft = await manpowerService.createRequisition(validRequisition, false);
    expect(draft.status).toBe('DRAFT');
    expect(draft.maker).toBe(CURRENT_USER);

    const submitted = await manpowerService.createRequisition(validRequisition, true);
    expect(submitted.status).toBe('IN_APPROVAL');
    expect(submitted.id).not.toBe(draft.id);
  });
});

describe('REQ-APPROVE — SoD', () => {
  it('menolak 409 bila maker memutuskan pengajuannya sendiri', async () => {
    const rows = await manpowerService.requisitions();
    const own = rows.find((row) => row.maker === CURRENT_USER && row.status === 'IN_APPROVAL')!;
    await expect(manpowerService.approveRequisition(own.id, '')).rejects.toThrow(/409/);
    await expect(manpowerService.rejectRequisition(own.id, '')).rejects.toThrow(/409/);
  });

  it('menyetujui requisition milik maker lain', async () => {
    const rows = await manpowerService.requisitions();
    const other = rows.find((row) => row.status === 'IN_APPROVAL' && row.maker !== CURRENT_USER)!;
    await manpowerService.approveRequisition(other.id, 'Disetujui');
    const after = await manpowerService.requisitions();
    expect(after.find((row) => row.id === other.id)!.status).toBe('APPROVED');
  });
});

describe('MP-CREATE — rencana headcount', () => {
  it('menolak akhir periode sebelum awal periode', async () => {
    await expect(
      planSchema.validateAt('periodEnd', {
        title: 'Rencana 2028',
        periodStart: '2028-01-01',
        periodEnd: '2027-12-31',
        lines: [{ unitId: 'unit-eng-hq', target: 3 }],
      }),
    ).rejects.toThrow(/setelah awal periode/);
  });

  it('menolak rencana tanpa baris target', async () => {
    await expect(
      planSchema.validateAt('lines', {
        title: 'Rencana 2028',
        periodStart: '2028-01-01',
        periodEnd: '2028-12-31',
        lines: [],
      }),
    ).rejects.toThrow(/minimal satu baris/);
  });

  it('rencana baru lahir DRAFT dengan aktual belum terhitung', async () => {
    const plan = await manpowerService.createPlan({
      title: 'Rencana Headcount 2028',
      periodStart: '2028-01-01',
      periodEnd: '2028-12-31',
      lines: [{ unitId: 'unit-eng-hq', target: 6 }],
    });
    expect(plan.status).toBe('DRAFT');
    expect(plan.lines[0].actual).toBeNull();
  });
});

describe('MP-OVERVIEW — gap dihitung, bukan disimpan', () => {
  const plan: ManpowerPlan = {
    id: 'p',
    title: 'x',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    status: 'ACTIVE',
    createdBy: 'x',
    lines: [
      { unitId: 'a', target: 12, actual: 10 },
      { unitId: 'b', target: 8, actual: 8 },
    ],
  };

  it('menjumlahkan target dan menghitung gap dari aktual', () => {
    expect(planTotals(plan)).toEqual({ target: 20, actual: 18, gap: 2 });
  });

  it('mengembalikan aktual & gap null bila belum ada angka aktual', () => {
    const untouched: ManpowerPlan = { ...plan, lines: [{ unitId: 'a', target: 5, actual: null }] };
    expect(planTotals(untouched)).toEqual({ target: 5, actual: null, gap: null });
  });
});
