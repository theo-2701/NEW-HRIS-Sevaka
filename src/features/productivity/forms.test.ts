import { beforeEach, describe, expect, it } from 'vitest';
import { formsService, resetFormsMocks } from '@/features/productivity/services/forms.service';
import { PROD_ACTORS } from '@/features/productivity/mock-data';
import type { FormDraft } from '@/features/productivity/types';

const actor = (id: string) => PROD_ACTORS.find((row) => row.employeeId === id)!;
const DEDI = actor('emp-dedi');
const RINA = actor('emp-rina-amelia');
const HESTI = actor('emp-hesti');
const LUKMAN = actor('emp-lukman');
const FAJAR = actor('emp-fajar');
const NADIA = actor('emp-nadia');
const FORM_A = 'f4000000-0000-7000-8000-000000000001';
const FORM_B = 'f4000000-0000-7000-8000-000000000002';
const FORM_C = 'f4000000-0000-7000-8000-000000000003';
const FORM_D = 'f4000000-0000-7000-8000-000000000004';
const SUB_DEDI_A = '5b000000-0000-7000-8000-000000000001';

const draft = (patch: Partial<FormDraft> = {}): FormDraft => ({
  formTitle: 'Survei Uji',
  identityMode: 'BER_IDENTITAS',
  obligation: 'SUKARELA',
  audienceScope: 'SELURUH_KARYAWAN',
  audiencePositionIds: [],
  isSensitive: false,
  responseDueDate: '',
  retentionMonths: '',
  questions: [{ questionType: 'ISIAN_TEKS', questionText: 'Apa kabar?', questionChoices: '' }],
  ...patch,
});

beforeEach(() => resetFormsMocks());

describe('Menyusun formulir', () => {
  it('HR Manager saja; lahir TERBUKA; anonim tidak dapat diwajibkan; syarat kondisional', async () => {
    await expect(formsService.createForm(LUKMAN, draft())).rejects.toMatchObject({ status: 403 });
    const form = await formsService.createForm(HESTI, draft());
    expect(form).toMatchObject({ state: 'TERBUKA', code: 'FRM-0005', submissionCount: 0, attributesLocked: false });
    await expect(
      formsService.createForm(HESTI, draft({ identityMode: 'ANONIM', obligation: 'WAJIB' })),
    ).rejects.toMatchObject({ code: 'PROD_FORM_ANONYMOUS_CANNOT_BE_MANDATORY' });
    await expect(formsService.createForm(HESTI, draft({ obligation: 'WAJIB' }))).rejects.toMatchObject({ status: 422 });
    await expect(formsService.createForm(HESTI, draft({ isSensitive: true }))).rejects.toMatchObject({ status: 422 });
    await expect(
      formsService.createForm(
        HESTI,
        draft({ questions: [{ questionType: 'PILIHAN_SATU', questionText: 'Q', questionChoices: 'Ya' }] }),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('atribut terkunci sejak jawaban pertama; tutup satu arah; hapus ditolak bila berjawaban', async () => {
    await expect(formsService.updateAttributes(HESTI, FORM_A, { isSensitive: true })).rejects.toMatchObject({
      code: 'PROD_FORM_ATTRIBUTE_LOCKED',
    });
    await formsService.setFormState(HESTI, FORM_A, 'DITUTUP');
    await expect(formsService.setFormState(HESTI, FORM_A, 'TERBUKA')).rejects.toMatchObject({
      code: 'PROD_FORM_STATE_TRANSITION_INVALID',
    });
    await expect(formsService.deleteForm(HESTI, FORM_A)).rejects.toMatchObject({
      status: 409,
      code: 'PROD_FORM_HAS_SUBMISSION',
    });
  });
});

describe('Membaca jawaban & agregat', () => {
  it('gerbang sensitivitas: HR Staff ditolak, Health Data Officer boleh; anonim tanpa responden', async () => {
    await expect(formsService.submissions(LUKMAN, FORM_D)).rejects.toMatchObject({
      status: 403,
      code: 'PROD_FORM_SENSITIVE_READ_DENIED',
    });
    await expect(formsService.submissions(NADIA, FORM_D)).resolves.toHaveLength(1);
    await expect(formsService.submissions(NADIA, FORM_A)).rejects.toMatchObject({ status: 403 });
    const anon = await formsService.submissions(HESTI, FORM_C);
    expect(anon.every((row) => row.respondentEmployeeId === null)).toBe(true);
    await expect(formsService.submissions(HESTI, FORM_C, 'emp-dedi')).rejects.toMatchObject({ status: 403 });
  });

  it('agregat angka-saja: teks hanya dicacah; sensitif 403; di bawah ambang 422', async () => {
    const aggregate = await formsService.aggregate(RINA, FORM_A);
    expect(aggregate.respondentCount).toBe(5);
    expect(aggregate.questions[0].aggregate).toEqual({ '1': 0, '2': 0, '3': 1, '4': 3, '5': 1 });
    expect(aggregate.questions[1].aggregate).toEqual({ count: 5 });
    await expect(formsService.aggregate(HESTI, FORM_D)).rejects.toMatchObject({
      code: 'PROD_FORM_AGGREGATE_SENSITIVE_DENIED',
    });
    await expect(formsService.aggregate(HESTI, FORM_C)).rejects.toMatchObject({
      code: 'PROD_FORM_AGGREGATE_BELOW_THRESHOLD',
    });
    await expect(formsService.aggregate(DEDI, FORM_A)).rejects.toMatchObject({ status: 403 });
  });

  it('belum mengisi: hanya BER_IDENTITAS + WAJIB, hanya HR; audiens per posisi', async () => {
    const pending = await formsService.pendingRespondents(HESTI, FORM_B);
    expect(pending.map((row) => row.name).sort()).toEqual(['Fajar Setiawan', 'Sinta Maharani']);
    await expect(formsService.pendingRespondents(RINA, FORM_B)).rejects.toMatchObject({ status: 403 });
    await expect(formsService.pendingRespondents(HESTI, FORM_A)).rejects.toMatchObject({ status: 422 });
  });
});

describe('Mengisi & menyunting', () => {
  it('distribusi: audiens per posisi, anonim selalu belum-terkirim', async () => {
    const dedi = await formsService.distributions(DEDI);
    expect(dedi.find((row) => row.formId === FORM_B)).toMatchObject({ alreadySubmitted: true });
    expect(dedi.find((row) => row.formId === FORM_C)).toMatchObject({ alreadySubmitted: false });
    const hesti = await formsService.distributions(HESTI);
    expect(hesti.some((row) => row.formId === FORM_B)).toBe(false);
  });

  it('kirim: duplikat BER_IDENTITAS 409, bentuk salah 422, anonim boleh berulang', async () => {
    await expect(formsService.submit(DEDI, FORM_A, { 'fq-0001': ['5'], 'fq-0002': ['x'] })).rejects.toMatchObject({
      status: 409,
    });
    await expect(formsService.submit(FAJAR, FORM_B, { 'fq-0005': ['Tetangga'] })).rejects.toMatchObject({
      code: 'PROD_FORM_ANSWER_TYPE_MISMATCH',
    });
    await formsService.submit(DEDI, FORM_C, { 'fq-0006': ['5'] });
    await formsService.submit(DEDI, FORM_C, { 'fq-0006': ['4'] });
    expect(await formsService.submissions(HESTI, FORM_C)).toHaveLength(4);
    await expect(formsService.submit(HESTI, FORM_B, { 'fq-0005': ['Pasangan'] })).rejects.toMatchObject({
      code: 'PROD_FORM_NOT_IN_AUDIENCE',
    });
  });

  it('sunting: pemilik saja (termasuk terhadap HR); hanya item berubah tercatat; tertutup butuh grant', async () => {
    await expect(formsService.editSubmission(HESTI, SUB_DEDI_A, { 'fq-0002': ['x'] })).rejects.toMatchObject({
      status: 403,
      code: 'PROD_NOT_OBJECT_OWNER',
    });
    const changed = await formsService.editSubmission(DEDI, SUB_DEDI_A, {
      'fq-0001': ['4'],
      'fq-0002': ['Lebih banyak mentoring.'],
    });
    expect(changed).toBe(1);
    expect(await formsService.submissionChanges(DEDI, SUB_DEDI_A)).toHaveLength(1);
    await formsService.setFormState(HESTI, FORM_A, 'DITUTUP');
    await expect(formsService.editSubmission(DEDI, SUB_DEDI_A, { 'fq-0001': ['5'] })).rejects.toMatchObject({
      code: 'PROD_WINDOW_GRANT_REQUIRED',
    });
    await formsService.grantWindow(HESTI, FORM_A, 'emp-dedi', 'Koreksi jawaban');
    await expect(formsService.editSubmission(DEDI, SUB_DEDI_A, { 'fq-0001': ['5'] })).resolves.toBe(1);
    await expect(formsService.grantWindow(HESTI, FORM_C, 'emp-dedi', 'x')).rejects.toMatchObject({
      code: 'PROD_FORM_ANONYMOUS_IMMUTABLE',
    });
  });
});
