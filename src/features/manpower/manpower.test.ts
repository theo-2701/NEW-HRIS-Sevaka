import { describe, expect, it } from 'vitest';
import { planSchema, requisitionSchema } from '@/features/manpower/validation';
import { manpowerService } from '@/features/manpower/services/manpower.service';
import { CURRENT_USER, isOwnRequisition, planTotals } from '@/features/manpower/types';
import type { ManpowerPlan, RequisitionDraft } from '@/features/manpower/types';

const validRequisition: RequisitionDraft = {
  planId: '',
  positionMode: 'NEW',
  positionId: '',
  unitId: 'unit-fin-papua',
  parentPositionId: 'pos-fin-mgr',
  title: 'Staff Finance',
  headcount: 2,
  reason: 'Cabang baru butuh dua staf finance.',
  activeFrom: '2099-01-01',
  activeUntil: '2099-06-30',
};

describe('REQ-CREATE — validasi', () => {
  it('menolak headcount di bawah 1', async () => {
    await expect(requisitionSchema.validateAt('headcount', { ...validRequisition, headcount: 0 })).rejects.toThrow(
      /at least 1/,
    );
  });

  it('menolak justifikasi kosong dan judul lebih dari 150 karakter', async () => {
    await expect(requisitionSchema.validateAt('reason', { ...validRequisition, reason: '  ' })).rejects.toThrow(
      /Justification is required/,
    );
    await expect(
      requisitionSchema.validateAt('title', { ...validRequisition, title: 'x'.repeat(151) }),
    ).rejects.toThrow(/150 characters/);
  });

  it('kursi yang sudah ada wajib memilih posisinya (Notulen 12 Okt 2026 #2)', async () => {
    await expect(
      requisitionSchema.validateAt('positionId', { ...validRequisition, positionMode: 'EXISTING', positionId: '' }),
    ).rejects.toThrow(/existing position/);
    await expect(
      manpowerService.createRequisition({ ...validRequisition, positionMode: 'EXISTING', positionId: '' }),
    ).rejects.toThrow(/position_id/);
  });

  it('menerima requisition yang lengkap', async () => {
    await expect(requisitionSchema.validate(validRequisition)).resolves.toBeTruthy();
  });
});

describe('REQ-CREATE — lahir IN_APPROVAL (FSD 0.24 §3.1)', () => {
  it('tanpa draf: requisition baru langsung IN_APPROVAL, terisi 0', async () => {
    const row = await manpowerService.createRequisition(validRequisition);
    expect(row).toMatchObject({ status: 'IN_APPROVAL', maker: CURRENT_USER, filledCount: 0 });
  });

  it('tanggal batas sebelum mulai ditolak skema; batas di masa lampau ditolak server', async () => {
    await expect(
      requisitionSchema.validateAt('activeUntil', { ...validRequisition, activeUntil: '2098-12-31' }),
    ).rejects.toThrow(/cannot be earlier/);
    await expect(
      manpowerService.createRequisition({ ...validRequisition, activeFrom: '2020-01-01', activeUntil: '2020-02-01' }),
    ).rejects.toThrow(/masa lampau/);
  });
});

describe('REQ — Ubah · Batalkan · Tutup', () => {
  it('Ubah dan Batalkan hanya saat IN_APPROVAL', async () => {
    const row = await manpowerService.createRequisition(validRequisition);
    await manpowerService.updateRequisition(row.id, { ...validRequisition, headcount: 3 });
    expect((await manpowerService.requisitions()).find((r) => r.id === row.id)!.headcount).toBe(3);
    await manpowerService.cancelRequisition(row.id);
    await expect(manpowerService.updateRequisition(row.id, validRequisition)).rejects.toThrow(/422/);
  });

  it('Tutup: APPROVED → CLOSED dengan alasan wajib; status lain 422', async () => {
    await expect(manpowerService.closeRequisition('REQ-0229', '  ')).rejects.toThrow(/alasan/);
    await manpowerService.closeRequisition('REQ-0229', 'Posisi dibekukan');
    const row = (await manpowerService.requisitions()).find((r) => r.id === 'REQ-0229')!;
    expect(row).toMatchObject({ status: 'CLOSED', closedReason: 'Posisi dibekukan', closedByName: CURRENT_USER });
    await expect(manpowerService.closeRequisition('REQ-0229', 'lagi')).rejects.toThrow(/422/);
    await expect(manpowerService.cancelRequisition('REQ-0230')).rejects.toThrow(/422/);
  });
});

describe('REQ-APPROVE — SoD', () => {
  it('menolak 409 bila maker memutuskan pengajuannya sendiri', async () => {
    const rows = await manpowerService.requisitions();
    const own = rows.find((row) => isOwnRequisition(row) && row.status === 'IN_APPROVAL')!;
    await expect(manpowerService.approveRequisition(own.id, '')).rejects.toThrow(/409/);
    await expect(manpowerService.rejectRequisition(own.id, '')).rejects.toThrow(/409/);
  });

  it('menyetujui requisition milik maker lain', async () => {
    const rows = await manpowerService.requisitions();
    const other = rows.find((row) => row.status === 'IN_APPROVAL' && !isOwnRequisition(row))!;
    await manpowerService.approveRequisition(other.id, 'Disetujui');
    const after = await manpowerService.requisitions();
    expect(after.find((row) => row.id === other.id)!.status).toBe('APPROVED');
  });
});

describe('REQ — guard state (UIC-EMPLOYEE §1.6)', () => {
  it('requisition yang sudah diputus tidak bisa diputus lagi (422 status)', async () => {
    await expect(manpowerService.approveRequisition('REQ-0230', 'Lagi')).rejects.toThrow(/422/);
  });

  it('server menolak requisition tanpa justifikasi (422)', async () => {
    await expect(manpowerService.createRequisition({ ...validRequisition, reason: '  ' })).rejects.toThrow(/422/);
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
