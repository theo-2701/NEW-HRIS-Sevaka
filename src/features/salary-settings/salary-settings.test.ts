import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetSalarySettingsMocks,
  salarySettingsService as service,
} from '@/features/salary-settings/services/salary-settings.service';
import { payrollAuthorizationService as authorization } from '@/features/payroll-authorization/services/payroll-authorization.service';
import { VIEWERS } from '@/features/salary-settings/mock-data';
import { nextPeriodStart } from '@/features/salary-settings/rules';

const RUDI = VIEWERS[0];
const MAYA = VIEWERS[1];

const draft = {
  componentCode: 'SC-009',
  componentName: 'Tunjangan Kehadiran',
  isFixed: false,
  isOvertimeBasis: null,
  isTaxable: false,
  isBpjsDeductible: false,
};

beforeEach(() => resetSalarySettingsMocks());

describe('Setelan Gaji — katalog komponen (UIC §4.1–§4.6)', () => {
  it('komponen baru lahir AKTIF dan dasar lembur mengikuti sifat tetap bila tidak dikirim', async () => {
    const row = await service.createComponent(RUDI, { ...draft, isFixed: true });
    expect(row).toMatchObject({ proposalState: 'AKTIF', isFixed: true, isOvertimeBasis: true });
    expect((await service.components()).map((item) => item.componentCode)).toContain('SC-009');
  });

  it('kode wajib sesuai format dan tidak boleh ganda', async () => {
    await expect(service.createComponent(RUDI, { ...draft, componentCode: 'sc 9' })).rejects.toThrow(/422/);
    await expect(service.createComponent(RUDI, { ...draft, componentCode: 'SC-001' })).rejects.toThrow(/sudah dipakai/);
  });

  it('HR Manager hanya membaca katalog', async () => {
    await expect(service.createComponent(MAYA, draft)).rejects.toThrow(/403/);
    expect((await service.components()).length).toBeGreaterThan(0);
  });

  it('hanya nama yang bisa diubah langsung', async () => {
    const renamed = await service.renameComponent(RUDI, 'SC-004', 'Uang Makan & Transport Harian');
    expect(renamed).toMatchObject({ componentCode: 'SC-004', name: 'Uang Makan & Transport Harian' });
  });

  it('komponen yang sudah dipakai tidak bisa dihapus', async () => {
    await expect(service.deleteComponent(RUDI, 'SC-001')).rejects.toThrow(/PAY_COMPONENT_IN_USE/);
    await service.createComponent(RUDI, draft);
    expect(await service.deleteComponent(RUDI, 'SC-009')).toEqual({ id: 'SC-009' });
  });

  it('usulan sifat wajib berbeda, tidak boleh menumpuk, dan masuk antrean Pemeriksa', async () => {
    const active = (await service.components()).find((row) => row.componentCode === 'SC-004')!;
    await expect(
      service.proposeTraitChange(RUDI, 'SC-004', {
        isFixed: active.isFixed,
        isOvertimeBasis: active.isOvertimeBasis,
        isTaxable: active.isTaxable,
        isBpjsDeductible: active.isBpjsDeductible,
      }),
    ).rejects.toThrow(/minimal satu sifat/);

    const proposed = await service.proposeTraitChange(RUDI, 'SC-004', { ...active, isOvertimeBasis: true });
    expect(proposed).toMatchObject({
      proposalState: 'MENUNGGU_PERSETUJUAN',
      proposedEffectiveFrom: nextPeriodStart(),
      proposedBy: 'emp-rudi',
    });
    expect((await authorization.traitQueue()).map((row) => row.componentCode)).toContain('SC-004');

    await expect(service.proposeTraitChange(RUDI, 'SC-004', { ...active, isTaxable: false })).rejects.toThrow(
      /sudah punya usulan/,
    );
  });
});

describe('Setelan Gaji — nilai per karyawan (UIC §4.7–§4.8)', () => {
  it('riwayat menandai baris yang sedang berlaku', async () => {
    const rows = await service.employeeValues('pay-indah');
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.isCurrent)).toHaveLength(2);
  });

  it('usulan baru masuk antrean Pemeriksa dengan tanggal berlaku dari sistem', async () => {
    const row = await service.proposeValueChange(RUDI, {
      employeeId: 'pay-indah',
      salaryComponentId: 'SC-002',
      amount: '900000',
      umpReason: '',
      umpNote: '',
    });
    expect(row).toMatchObject({ approvalState: 'MENUNGGU_PERSETUJUAN', effectiveFrom: nextPeriodStart() });
    expect((await authorization.proposalQueue()).map((item) => item.id)).toContain(row.id);
  });

  it('satu usulan menunggu per karyawan dan komponen', async () => {
    await expect(
      service.proposeValueChange(RUDI, {
        employeeId: 'pay-bayu',
        salaryComponentId: 'SC-001',
        amount: '4600000',
        umpReason: '',
        umpNote: '',
      }),
    ).rejects.toThrow(/sudah ada usulan menunggu/);
  });

  it('gaji dasar di bawah UMP cabang wajib beralasan, dan jawabannya masuk jejak', async () => {
    const belowUmp = {
      employeeId: 'pay-dewi',
      salaryComponentId: 'SC-001',
      amount: '3900000',
      umpReason: '' as const,
      umpNote: '',
    };
    await expect(service.proposeValueChange(RUDI, belowUmp)).rejects.toThrow(/di bawah UMP/);
    await expect(
      service.proposeValueChange(RUDI, { ...belowUmp, umpReason: 'LAINNYA', umpNote: '  ' }),
    ).rejects.toThrow(/wajib disertai catatan/);

    const before = (await service.umpAttestations()).length;
    await service.proposeValueChange(RUDI, {
      ...belowUmp,
      umpReason: 'LAINNYA',
      umpNote: 'Penyesuaian bertahap sesuai kebijakan grade review.',
    });
    const after = await service.umpAttestations();
    expect(after).toHaveLength(before + 1);
    const written = after.find((row) => row.reasonNote?.includes('grade review'))!;
    expect(written).toMatchObject({
      employeeId: 'pay-dewi',
      checkPoint: 'PENETAPAN_ATAU_PERUBAHAN',
      isBelowUmp: true,
      selectedReason: 'LAINNYA',
      createdBy: 'emp-rudi',
    });
  });

  it('nominal di atas UMP tidak menulis baris jejak', async () => {
    const before = (await service.umpAttestations()).length;
    await service.proposeValueChange(RUDI, {
      employeeId: 'pay-dewi',
      salaryComponentId: 'SC-001',
      amount: '4800000',
      umpReason: '',
      umpNote: '',
    });
    expect(await service.umpAttestations()).toHaveLength(before);
  });
});

describe('Setelan Gaji — kumpulan massal (UIC §4.10–§4.16)', () => {
  it('siklus draft: buat, tambah anggota, hapus anggota, lalu kunci', async () => {
    const batch = await service.createBatch(RUDI, 'Penyesuaian Tunjangan Transport');
    expect(batch).toMatchObject({ status: 'DRAFT', impactSummary: null, items: [] });

    await service.addBatchItem(RUDI, batch.id, { employeeId: 'pay-dewi', salaryComponentId: 'SC-001', amount: '200000' });
    const withTwo = await service.addBatchItem(RUDI, batch.id, {
      employeeId: 'pay-bayu',
      salaryComponentId: 'SC-001',
      amount: '100000',
    });
    expect(withTwo.items).toHaveLength(2);

    const afterRemove = await service.removeBatchItem(RUDI, batch.id, 'pay-bayu', 'SC-001');
    expect(afterRemove.items).toHaveLength(1);

    const submitted = await service.submitBatch(RUDI, batch.id);
    expect(submitted).toMatchObject({ status: 'MENUNGGU_PERSETUJUAN', requiresEscalation: false });
    expect(submitted.impactSummary).toMatchObject({ affectedCount: 1, netCostShiftAmount: 200000 });
  });

  it('kumpulan kosong tidak bisa diajukan, dan yang sudah dikunci tidak bisa diubah', async () => {
    const batch = await service.createBatch(RUDI, 'Kumpulan kosong');
    await expect(service.submitBatch(RUDI, batch.id)).rejects.toThrow(/tanpa anggota/);
    await service.addBatchItem(RUDI, batch.id, { employeeId: 'pay-agus', salaryComponentId: 'SC-001', amount: '50000' });
    await service.submitBatch(RUDI, batch.id);
    await expect(
      service.addBatchItem(RUDI, batch.id, { employeeId: 'pay-dewi', salaryComponentId: 'SC-001', amount: '50000' }),
    ).rejects.toThrow(/selagi DRAFT/);
    await expect(service.deleteBatch(RUDI, batch.id)).rejects.toThrow(/hanya kumpulan DRAFT/);
  });

  it('eskalasi dihitung dari jumlah anggota, bukan dipilih pengaju', async () => {
    const batch = await service.createBatch(RUDI, 'Kenaikan enam karyawan');
    const members = ['pay-dewi', 'pay-agus', 'pay-fajar', 'pay-yusuf', 'pay-rina', 'pay-bayu'];
    for (const employeeId of members) {
      await service.addBatchItem(RUDI, batch.id, { employeeId, salaryComponentId: 'SC-001', amount: '100000' });
    }
    const submitted = await service.submitBatch(RUDI, batch.id);
    expect(submitted.requiresEscalation).toBe(true);
    expect(submitted.escalationApproverId).toBe('emp-hesti');
    expect((await authorization.batches()).map((row) => row.id)).toContain(batch.id);
  });

  it('kumpulan draft bisa dibatalkan dan hilang dari antrean Pemeriksa', async () => {
    const batch = await service.createBatch(RUDI, 'Draft sementara');
    expect((await authorization.batches()).map((row) => row.id)).not.toContain(batch.id);
    await service.deleteBatch(RUDI, batch.id);
    expect((await service.batches()).map((row) => row.id)).not.toContain(batch.id);
  });
});
