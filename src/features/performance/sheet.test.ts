import { beforeEach, describe, expect, it } from 'vitest';
import { resetKpiMocks } from '@/features/performance/services/kpi.service';
import { resetSheetMocks, sheetService, sheetStore } from '@/features/performance/services/sheet.service';
import { PERF_ACTORS } from '@/features/performance/mock-data';

const who = (id: string) => PERF_ACTORS.find((row) => row.employeeId === id)!;
const HESTI = who('emp-hesti');
const LUKMAN = who('emp-lukman');
const BUDI = who('emp-budi-dm');
const RINA = who('emp-rina-amelia');
const DEDI = who('emp-dedi');
const YANTI = who('emp-yanti');

const TICKETS = '019ba5a1-c100-73f1-a3f1-4e2c015a91b7';
const INACTIVE_SOP = '019ba5af-7ca0-7e15-9e15-4e2c045a91b7';
let key = 0;
const k = () => `key-${++key}`;

beforeEach(() => {
  resetSheetMocks();
  resetKpiMocks();
});

describe('Lembar Penilaian — rezim baca PF-10', () => {
  it('DM hanya lembar yang ia nilai; HR bercakupan ALL; EMP tanpa daftar', async () => {
    const budi = await sheetService.search(BUDI, { dataScope: 'ALL', page: 1, size: 20 });
    expect(budi.rows.map((row) => row.id).sort()).toEqual(['rs-0001', 'rs-0004']);
    await expect(sheetService.search(LUKMAN, { dataScope: 'ALL', page: 1, size: 20 })).resolves.toMatchObject({ totalData: 4 });
    const mine = await sheetService.search(HESTI, { dataScope: 'ASSESSOR', page: 1, size: 20 });
    expect(mine.rows.map((row) => row.id)).toEqual(['rs-0003']);
    await expect(sheetService.search(DEDI, { dataScope: 'ASSESSOR', page: 1, size: 20 })).rejects.toMatchObject({ status: 403 });
  });

  it('detail: rantai di atas penilai boleh membaca, orang lain 404 anti-enumerasi', async () => {
    await expect(sheetService.get(RINA, 'rs-0001')).resolves.toMatchObject({ assessorId: 'emp-budi-dm' });
    await expect(sheetService.get(YANTI, 'rs-0001')).rejects.toMatchObject({ status: 404 });
    await expect(sheetService.get(BUDI, 'rs-0003')).rejects.toMatchObject({ status: 404 });
  });

  it('karyawan pemilik tidak pernah menerima nilai atasan (G5)', async () => {
    const own = await sheetService.get(DEDI, 'rs-0001');
    expect(own.items[0]).not.toHaveProperty('initialValue');
    expect(own.items[0].initialValueRecordedAt).not.toBeNull();
    const assessor = await sheetService.get(BUDI, 'rs-0001');
    expect(assessor.items[0].initialValue).toBe('38 tiket');
  });

  it('riwayat penilai: HR dan pemegang kursi saja; lebih dari satu baris = pernah berpindah', async () => {
    const history = await sheetService.supervisorHistory(LUKMAN, 'rs-0002');
    expect(history.map((row) => row.supervisorNameDisplay)).toEqual(['Eko Prasetyo', 'Rina Amelia']);
    expect((await sheetService.get(HESTI, 'rs-0002')).supervisorTransferred).toBe(true);
    await expect(sheetService.supervisorHistory(RINA, 'rs-0001')).rejects.toMatchObject({ status: 404 });
  });
});

describe('Gerbang isian diri (PF-37)', () => {
  it('atasan ditolak INITIAL_VALUE_LOCKED sampai SELURUH baris punya nilai awal, lalu terbuka otomatis', async () => {
    await expect(sheetService.readSelfAssessment(BUDI, 'rs-0001')).rejects.toMatchObject({
      status: 403,
      code: 'INITIAL_VALUE_LOCKED',
    });
    await sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-2', 'Baik, cukup aktif', k());
    await expect(sheetService.readSelfAssessment(BUDI, 'rs-0001')).rejects.toMatchObject({ status: 403 });
    await sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-3', 'Sudah mendampingi', k());
    await expect(sheetService.readSelfAssessment(BUDI, 'rs-0001')).resolves.toMatchObject({
      content: expect.stringContaining('tiket dukungan'),
    });
  });

  it('nilai awal tidak dapat ditimpa; HR tidak membaca isian diri', async () => {
    await expect(sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-1', '40 tiket', k())).rejects.toMatchObject({
      code: 'INITIAL_VALUE_LOCKED',
    });
    await expect(sheetService.readSelfAssessment(HESTI, 'rs-0001')).rejects.toMatchObject({ status: 403 });
  });

  it('karyawan tidak dapat mengubah isian diri begitu satu nilai awal tercatat', async () => {
    await expect(sheetService.saveSelfAssessment(DEDI, 'rs-0001', 'Revisi', k())).rejects.toMatchObject({
      code: 'INITIAL_VALUE_LOCKED',
    });
    await expect(sheetService.saveSelfAssessment(BUDI, 'rs-0001', 'Atas nama', k())).rejects.toMatchObject({ status: 403 });
  });
});

describe('Tanda baca & keberatan (P3.08/P3.09)', () => {
  it('hanya pemilik; tanda baca direset tiap baris ditambah/diubah', async () => {
    await expect(sheetService.markRead(BUDI, 'rs-0001', 'rsi-0001-2', k())).rejects.toMatchObject({ status: 403 });
    await sheetService.markRead(DEDI, 'rs-0001', 'rsi-0001-2', k());
    await sheetService.saveObjectionNote(DEDI, 'rs-0001', 'rsi-0001-2', 'Target kurang terukur', k());
    let own = await sheetService.get(DEDI, 'rs-0001');
    expect(own.items[1]).toMatchObject({ employeeObjectionNote: 'Target kurang terukur' });
    expect(own.items[1].employeeReadAt).not.toBeNull();
    await sheetService.updateItem(BUDI, 'rs-0001', 'rsi-0001-2', { target: 'Membantu 3 rekan kerja' }, k());
    own = await sheetService.get(DEDI, 'rs-0001');
    expect(own.items.every((row) => row.employeeReadAt === null)).toBe(true);
    expect(own.items[1].employeeReadResetCount).toBe(1);
  });
});

describe('CRUD baris nilai (P3.05–P3.07)', () => {
  it('MASTER disalin dari daftar induk aktif; item nonaktif ditolak', async () => {
    const row = await sheetService.addItem(BUDI, 'rs-0001', { origin: 'MASTER', masterItemId: TICKETS, target: '10 tiket' }, k());
    expect(row).toMatchObject({ origin: 'MASTER', itemNameSnapshot: 'Menyelesaikan tiket dukungan', rawWeight: 40 });
    await expect(
      sheetService.addItem(BUDI, 'rs-0001', { origin: 'MASTER', masterItemId: INACTIVE_SOP, target: 'x' }, k()),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
  });

  it('porsi ADDITIONAL dihitung termasuk baris baru terhadap pagar 30%', async () => {
    // 15 / 85 = 17,6% → tambah 10: 25 / 95 = 26,3% (lolos) → tambah 20: 45 / 115 = 39,1% (ditolak)
    const draft = { origin: 'ADDITIONAL' as const, itemNameSnapshot: 'Dokumentasi', targetTypeSnapshot: 'NARRATIVE' as const, target: 'SOP' };
    await sheetService.addItem(BUDI, 'rs-0001', { ...draft, rawWeight: 10 }, k());
    await expect(sheetService.addItem(BUDI, 'rs-0001', { ...draft, rawWeight: 20 }, k())).rejects.toMatchObject({
      code: 'ADDITIONAL_ITEM_QUOTA_EXCEEDED',
    });
    await expect(sheetService.updateItem(BUDI, 'rs-0001', 'rsi-0001-3', { rawWeight: 40 }, k())).rejects.toMatchObject({
      code: 'ADDITIONAL_ITEM_QUOTA_EXCEEDED',
    });
  });

  it('bobot MASTER terkunci; hanya pemegang kursi; hanya selama IN_PROGRESS', async () => {
    await expect(sheetService.updateItem(BUDI, 'rs-0001', 'rsi-0001-1', { rawWeight: 50 }, k())).rejects.toMatchObject({
      status: 403,
      code: 'MASTER_WEIGHT_LOCKED',
    });
    await expect(sheetService.updateItem(RINA, 'rs-0001', 'rsi-0001-3', { target: 'x' }, k())).rejects.toMatchObject({
      status: 403,
    });
    await expect(sheetService.deleteItem(HESTI, 'rs-0003', 'rsi-0003-1', k())).rejects.toMatchObject({
      code: 'PERIOD_PHASE_INVALID',
    });
    await sheetService.deleteItem(BUDI, 'rs-0001', 'rsi-0001-3', k());
    expect((await sheetService.get(BUDI, 'rs-0001')).items).toHaveLength(2);
  });
});

describe('Ajukan lembar (P4.01, dirender di Menu 3)', () => {
  it('membekukan porsi bobot, resolve penyetuju = atasan penilai, status PENDING_APPROVAL', async () => {
    const result = await sheetService.submit(BUDI, 'rs-0001');
    expect(result).toMatchObject({ status: 'PENDING_APPROVAL', cycleNo: 1, roundNo: 1, approver: { name: 'Rina Amelia' } });
    expect(result.workflowProcessInstanceId).toBeTruthy();
    const sheet = await sheetService.get(BUDI, 'rs-0001');
    expect(sheet.items.map((row) => row.frozenWeightRatio)).toEqual([47.06, 35.29, 17.65]);
    await expect(sheetService.submit(BUDI, 'rs-0001')).rejects.toMatchObject({ code: 'PERIOD_PHASE_INVALID' });
  });

  it('lembar dikembalikan diajukan ulang sebagai putaran berikutnya; HR Manager penilai boleh mengajukan', async () => {
    const result = await sheetService.submit(HESTI, 'rs-0003');
    expect(result).toMatchObject({ cycleNo: 1, roundNo: 2, approver: { employeeId: 'emp-hesti' } });
    await expect(sheetService.submit(LUKMAN, 'rs-0003')).rejects.toMatchObject({ status: 403 });
  });

  it('total bobot baris berlaku nol ditolak WEIGHT_SUM_ZERO', async () => {
    // Baris MASTER tidak bisa dihapus lewat UI, jadi kondisi Σ bobot = 0 disiapkan langsung di store.
    for (const row of sheetStore.find('rs-0001')!.items) row.deletedAt = '2026-03-12T00:00:00+07:00';
    await expect(sheetService.submit(BUDI, 'rs-0001')).rejects.toMatchObject({ status: 422, code: 'WEIGHT_SUM_ZERO' });
  });
});
