import { beforeEach, describe, expect, it } from 'vitest';
import { objectionService, resetObjectionMocks } from '@/features/performance/services/objection.service';
import { resetSheetMocks } from '@/features/performance/services/sheet.service';
import { PERF_ACTORS } from '@/features/performance/mock-data';

const who = (id: string) => PERF_ACTORS.find((row) => row.employeeId === id)!;
const HESTI = who('emp-hesti');
const LUKMAN = who('emp-lukman');
const BUDI = who('emp-budi-dm');
const RINA = who('emp-rina-amelia');
const DEDI = who('emp-dedi');
const YANTI = who('emp-yanti');
const page = { page: 1, size: 20 };
let seq = 0;
const k = () => `obj-key-${++seq}`;

beforeEach(() => {
  resetSheetMocks();
  resetObjectionMocks();
});

describe('Rezim baca berjenjang (P5.02–P5.04)', () => {
  it('DM hanya sanggahan yang dibebankan kepadanya; HR company-wide; EMP tanpa grid', async () => {
    const rina = await objectionService.search(RINA, { ...page, holderEmployeeId: 'emp-hesti' });
    expect(rina.rows.map((row) => row.id).sort()).toEqual(['obj-0001', 'obj-0002']);
    await expect(objectionService.search(BUDI, page)).resolves.toMatchObject({ totalData: 0 });
    const hr = await objectionService.search(LUKMAN, { ...page, status: 'SUBMITTED' });
    expect(hr.rows.map((row) => row.id)).toEqual(['obj-0001']);
    await expect(objectionService.search(DEDI, page)).rejects.toMatchObject({ status: 403 });
  });

  it('detail: pengaju, pemikul, dan HR; lainnya 404', async () => {
    await expect(objectionService.get(YANTI, 'obj-0002')).resolves.toMatchObject({ answer: { answeredByEmployeeId: 'emp-rina-amelia' } });
    await expect(objectionService.get(DEDI, 'obj-0002')).rejects.toMatchObject({ status: 404 });
    await expect(objectionService.mine(BUDI)).resolves.toHaveLength(1);
  });
});

describe('Ajukan sanggahan (P5.01)', () => {
  it('tenggat lewat tanpa jendela dibuka ulang → OBJECTION_DEADLINE_PASSED', async () => {
    await expect(
      objectionService.create(BUDI, { reviewSheetId: 'rs-0002', subjectType: 'VALUE', submissionNote: 'Tinjau ulang.' }, k()),
    ).rejects.toMatchObject({ status: 422, code: 'OBJECTION_DEADLINE_PASSED' });
  });

  it('setelah HR membuka jendela: VALUE ke penilai, REJECTED_FINAL ke penyetuju yang menolak', async () => {
    await objectionService.reopen(HESTI, 'rs-0002', 'Audit ulang target kolaborasi.', k());
    const value = await objectionService.create(
      BUDI,
      { reviewSheetId: 'rs-0002', subjectType: 'VALUE', submissionNote: 'Mohon ditinjau ulang.' },
      k(),
    );
    expect(value).toMatchObject({ status: 'SUBMITTED', approvalRoundId: null, currentHolder: { holderEmployeeId: 'emp-rina-amelia' } });
    expect(value.viaReopenWindowId).not.toBeNull();

    await objectionService.reopen(HESTI, 'rs-0004', 'Kesalahan input target.', k());
    const rejected = await objectionService.create(
      YANTI,
      { reviewSheetId: 'rs-0004', subjectType: 'REJECTED_FINAL', approvalRoundId: 'ar-0004-2', submissionNote: 'Sudah direvisi.' },
      k(),
    );
    expect(rejected.currentHolder.holderEmployeeId).toBe('emp-rina-amelia');
  });

  it('pasangan jenis/putaran divalidasi; bukan pemilik lembar 404; catatan tanpa < >', async () => {
    await objectionService.reopen(HESTI, 'rs-0004', 'Audit.', k());
    await expect(
      objectionService.create(YANTI, { reviewSheetId: 'rs-0004', subjectType: 'VALUE', submissionNote: 'x' }, k()),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      objectionService.create(
        YANTI,
        { reviewSheetId: 'rs-0004', subjectType: 'REJECTED_FINAL', approvalRoundId: 'ar-0004-1', submissionNote: 'x' },
        k(),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      objectionService.create(DEDI, { reviewSheetId: 'rs-0004', subjectType: 'REJECTED_FINAL', approvalRoundId: 'ar-0004-2', submissionNote: 'x' }, k()),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      objectionService.create(
        YANTI,
        { reviewSheetId: 'rs-0004', subjectType: 'REJECTED_FINAL', approvalRoundId: 'ar-0004-2', submissionNote: '<script>' },
        k(),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('Jawab (P5.05) & buka kembali jendela (P5.06)', () => {
  it('hanya pemikul teraktif; jawaban 1:1 langsung ANSWERED', async () => {
    await expect(objectionService.answer(HESTI, 'obj-0001', 'Sudah sesuai.', k())).rejects.toMatchObject({
      status: 403,
      code: 'OBJECTION_ANSWER_FORBIDDEN',
    });
    await objectionService.answer(RINA, 'obj-0001', 'Nilai sudah sesuai kesepakatan awal.', k());
    await expect(objectionService.get(BUDI, 'obj-0001')).resolves.toMatchObject({ status: 'ANSWERED' });
    await expect(objectionService.answer(RINA, 'obj-0001', 'Lagi.', k())).rejects.toMatchObject({ status: 409 });
  });

  it('HR Staff baca saja; alasan kosong → REOPEN_WINDOW_REASON_REQUIRED; tenggat = jangka penuh', async () => {
    await expect(objectionService.reopen(LUKMAN, 'rs-0004', 'Audit.', k())).rejects.toMatchObject({ status: 403 });
    await expect(objectionService.reopen(HESTI, 'rs-0004', '   ', k())).rejects.toMatchObject({
      code: 'REOPEN_WINDOW_REASON_REQUIRED',
    });
    const row = await objectionService.reopen(HESTI, 'rs-0004', 'Audit.', k());
    const days = (new Date(row.newDeadlineAt).getTime() - new Date(row.openedAt).getTime()) / 86_400_000;
    expect(days).toBe(14);
    await expect(objectionService.reopenSearch(LUKMAN, page)).resolves.toMatchObject({ totalData: 2 });
  });
});
