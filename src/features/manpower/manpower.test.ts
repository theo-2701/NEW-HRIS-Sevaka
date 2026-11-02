import { describe, expect, it } from 'vitest';
import { planSchema, requisitionSchema } from '@/features/manpower/validation';
import { manpowerService } from '@/features/manpower/services/manpower.service';
import { CURRENT_USER, openPositions, planTotals, requestorOptions, supervisorOptions, titleOf } from '@/features/manpower/types';
import type { ManpowerPlan } from '@/features/manpower/types';

const validRequisition = {
  planId: '',
  unitId: 'unit-fin-papua',
  parentPositionId: 'pos-fin-mgr',
  requestorId: 'emp-yohanes',
  positionIds: ['pos-fin-staff-1', 'pos-fin-staff-2'],
  reason: 'Cabang baru butuh dua staf finance.',
};

describe('REQ-CREATE — validasi (kaskade T2)', () => {
  it('wajib minimal satu posisi dicentang dan requestor dipilih', async () => {
    await expect(
      requisitionSchema.validateAt('positionIds', { ...validRequisition, positionIds: [] }),
    ).rejects.toThrow(/at least one/);
    await expect(
      requisitionSchema.validateAt('requestorId', { ...validRequisition, requestorId: '' }),
    ).rejects.toThrow(/Requestor/);
    await expect(
      requisitionSchema.validateAt('reason', { ...validRequisition, reason: '  ' }),
    ).rejects.toThrow(/Justification/);
  });

  it('menerima requisition yang lengkap', async () => {
    await expect(requisitionSchema.validate(validRequisition)).resolves.toBeTruthy();
  });

  it('checklist hanya memuat posisi kosong bawahan langsung supervisor', () => {
    expect(openPositions('pos-fin-mgr').map((row) => row.id)).toEqual(['pos-fin-staff-1', 'pos-fin-staff-2', 'pos-fin-ap']);
    expect(supervisorOptions('unit-fin-papua').map((row) => row.value)).toEqual(['pos-fin-mgr']);
    expect(requestorOptions('unit-fin-papua').map((row) => row.value)).toEqual(['emp-yohanes', 'emp-maria']);
    expect(titleOf(['pos-fin-staff-1', 'pos-fin-staff-2', 'pos-fin-ap'])).toBe('Staff Finance ×2, AP Officer');
  });
});

describe('REQ-CREATE — draft-first', () => {
  it('menyimpan sebagai DRAFT tanpa submit, dan IN_APPROVAL bila disubmit', async () => {
    const draft = await manpowerService.createRequisition(validRequisition, false);
    expect(draft.status).toBe('DRAFT');
    expect(draft.maker).toBe(CURRENT_USER);
    expect(draft.headcount).toBe(2);
    expect(draft.requestor).toBe('Yohanes Wenda');

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

describe('REQ — guard state (UIC-EMPLOYEE §1.6)', () => {
  it('requisition yang sudah diputus tidak bisa diputus lagi (409)', async () => {
    const rows = await manpowerService.requisitions();
    const other = rows.find((row) => row.status === 'IN_APPROVAL' && row.maker !== CURRENT_USER);
    if (!other) return;
    await manpowerService.approveRequisition(other.id, 'Disetujui');
    await expect(manpowerService.approveRequisition(other.id, 'Lagi')).rejects.toThrow(/409/);
  });

  it('server menolak posisi yang bukan kursi kosong bawahan supervisor (422)', async () => {
    await expect(
      manpowerService.createRequisition({ ...validRequisition, positionIds: ['pos-fin-ar'] }, false),
    ).rejects.toThrow(/422/);
  });

  it('server menolak requisition tanpa justifikasi (422)', async () => {
    await expect(
      manpowerService.createRequisition({ ...validRequisition, reason: '  ' }, false),
    ).rejects.toThrow(/422/);
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

describe('Planning — aktivasi rencana (TSD §3, keputusan USER E15)', () => {
  it('Draft bentrok dengan rencana Active ditolak 409', async () => {
    const plans = await manpowerService.plans();
    const draft = plans.find((row) => row.status === 'DRAFT' && row.id === 'plan-2027');
    expect(draft).toBeTruthy();
    const clash = await manpowerService.createPlan({
      title: 'Bentrok 2026',
      periodStart: '2026-06-01',
      periodEnd: '2026-12-31',
      lines: [{ unitId: 'unit-eng-hq', target: 3 }],
    });
    await expect(manpowerService.activatePlan(clash.id)).rejects.toThrow(/409/);
  });

  it('mengaktifkan Draft menghapus Draft lain yang beririsan', async () => {
    const twin = await manpowerService.createPlan({
      title: 'Kembar 2027',
      periodStart: '2027-03-01',
      periodEnd: '2027-06-30',
      lines: [{ unitId: 'unit-eng-hq', target: 2 }],
    });
    expect(await manpowerService.activatePlan('plan-2027')).toBeGreaterThanOrEqual(1);
    const after = await manpowerService.plans();
    expect(after.find((row) => row.id === 'plan-2027')?.status).toBe('ACTIVE');
    expect(after.some((row) => row.id === twin.id)).toBe(false);
  });
});
