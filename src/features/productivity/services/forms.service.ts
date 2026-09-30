import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import { AGGREGATE_THRESHOLD, FORM_GRANT_SEED, FORM_SEED, SUBMISSION_SEED } from '@/features/productivity/forms-data';
import { PROD_EMPLOYEES } from '@/features/productivity/mock-data';
import { employeeOf, nameOf } from '@/features/productivity/rules';
import { prodClock } from '@/features/productivity/services/clock';
import { camelize, newIdempotencyKey, snakeize } from '@/features/productivity/services/wire';
import type { WirePage } from '@/features/productivity/services/wire';
import type {
  Form,
  FormAggregate,
  FormDistribution,
  FormDraft,
  FormState,
  FormSubmission,
  FormWindowGrant,
  PendingRespondent,
  ProdActor,
  SubmissionChange,
  SubmissionItem,
} from '@/features/productivity/types';

/**
 * API service Forms & Survey — UIC-001-PRODUCTIVITY-0.4 §5 (`F4.01`–`F4.20`).
 *
 * Empat permukaan aktor: penyusun (HR Manager) · pengisi (self) · pembaca jawaban (HR; menyempit ke HR Manager +
 * Health Data Officer bila sensitif) · penerima agregat (atasan + HR; nol bila sensitif). Nol HR menulis jawaban
 * orang lain, nol lampiran, nol DELETE pada jawaban.
 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

type StoredForm = Omit<Form, 'submissionCount' | 'attributesLocked'> & { deletedAt: string | null };

let forms: StoredForm[] = [];
let submissions: FormSubmission[] = [];
let submissionChanges: SubmissionChange[] = [];
let formGrants: FormWindowGrant[] = [];
let seq = { form: 4, question: 11, submission: 9, change: 0, grant: 1 };

export function resetFormsMocks() {
  forms = FORM_SEED.map((row) => ({ ...row, questions: row.questions.map((item) => ({ ...item })), deletedAt: null }));
  submissions = SUBMISSION_SEED.map((row) => ({
    ...row,
    items: row.items.map((item) => ({ ...item, answerValue: [...item.answerValue] })),
  }));
  submissionChanges = [];
  formGrants = FORM_GRANT_SEED.map((row) => ({ ...row, grantedBy: { ...row.grantedBy } }));
  seq = { form: 4, question: 11, submission: 9, change: 0, grant: 1 };
}
resetFormsMocks();

const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(message, status, code);
};
const pad = (n: number) => String(n).padStart(4, '0');
const nowIso = () => prodClock.now().toISOString();
const isHrRole = (actor: ProdActor) => actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_HR_STAFF';

const view = (row: StoredForm): Form => {
  const { deletedAt: _deleted, ...rest } = row;
  void _deleted;
  const count = submissions.filter((item) => item.formId === row.id).length;
  return {
    ...rest,
    questions: [...rest.questions].sort((a, b) => a.questionOrder - b.questionOrder).map((item) => ({ ...item })),
    submissionCount: count,
    attributesLocked: count > 0,
  };
};

const findForm = (id: string) =>
  forms.find((row) => row.id === id && !row.deletedAt) ?? fail(404, 'NOT_FOUND', 'Formulir tidak ditemukan.');

/** Sasaran: SELURUH_KARYAWAN cocok langsung; PER_BAGIAN cocok bila posisi di daftar — tanpa posisi = tidak pernah. */
const inAudience = (form: StoredForm, employeeId: string) => {
  if (form.audienceScope === 'SELURUH_KARYAWAN') return true;
  const positionId = employeeOf(employeeId)?.positionId;
  return Boolean(positionId && form.audiencePositionIds.includes(positionId));
};

const hasGrant = (formId: string, employeeId: string) =>
  formGrants.some((row) => row.formId === formId && row.targetEmployeeId === employeeId);

/** Gerbang baca baris mentah — dievaluasi terhadap `is_sensitive`, bukan peran semata. */
function requireRawRead(actor: ProdActor, form: StoredForm) {
  const allowed = form.isSensitive
    ? actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_HEALTH_DATA_OFFICER'
    : isHrRole(actor);
  if (!allowed)
    fail(
      403,
      form.isSensitive ? 'PROD_FORM_SENSITIVE_READ_DENIED' : 'FORBIDDEN',
      form.isSensitive
        ? 'Formulir bertanda sensitif hanya dapat dibaca HR Manager dan Health Data Officer.'
        : 'Hanya HR yang dapat membaca jawaban formulir.',
    );
}

/** Bentuk jawaban wajib cocok `question_type` (PD-96). */
function answerMismatch(
  item: Pick<SubmissionItem, 'questionTypeSnapshot' | 'questionChoicesSnapshot' | 'questionTextSnapshot'>,
  value: string[],
) {
  const choices = item.questionChoicesSnapshot ?? [];
  const bad = (() => {
    switch (item.questionTypeSnapshot) {
      case 'PILIHAN_SATU':
        return value.length !== 1 || !choices.includes(value[0]);
      case 'PILIHAN_BANYAK':
        return value.some((entry) => !choices.includes(entry));
      case 'ANGKA':
        return value.length !== 1 || value[0].trim() === '' || !Number.isFinite(Number(value[0]));
      case 'TANGGAL':
        return value.length !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(value[0]);
      default:
        return value.length > 1;
    }
  })();
  return bad ? `Jawaban "${item.questionTextSnapshot}" tidak cocok dengan jenis pertanyaannya.` : null;
}

function validateDraft(draft: FormDraft) {
  if (!draft.formTitle.trim()) fail(422, 'VALIDATION_ERROR', 'Judul formulir wajib diisi.');
  if (draft.identityMode === 'ANONIM' && draft.obligation === 'WAJIB')
    fail(422, 'PROD_FORM_ANONYMOUS_CANNOT_BE_MANDATORY', 'Formulir anonim tidak dapat diwajibkan.');
  if (draft.obligation === 'WAJIB' && !draft.responseDueDate)
    fail(422, 'VALIDATION_ERROR', 'Tenggat respons wajib diisi untuk formulir wajib.');
  if (draft.isSensitive && !(Number(draft.retentionMonths) > 0))
    fail(422, 'VALIDATION_ERROR', 'Masa simpan (bulan) wajib diisi untuk formulir sensitif.');
  if (draft.audienceScope === 'PER_BAGIAN' && !draft.audiencePositionIds.length)
    fail(422, 'VALIDATION_ERROR', 'Pilih minimal satu posisi untuk cakupan per bagian.');
  if (!draft.questions.length) fail(422, 'VALIDATION_ERROR', 'Formulir wajib punya minimal satu pertanyaan.');
  draft.questions.forEach((question, index) => {
    if (!question.questionText.trim()) fail(422, 'VALIDATION_ERROR', `Teks pertanyaan ${index + 1} wajib diisi.`);
    if (
      (question.questionType === 'PILIHAN_SATU' || question.questionType === 'PILIHAN_BANYAK') &&
      question.questionChoices.split(',').filter((item) => item.trim()).length < 2
    )
      fail(422, 'VALIDATION_ERROR', `Pertanyaan ${index + 1} wajib punya minimal dua pilihan.`);
  });
}

export const formsService = {
  /** `F4.04` — HR membaca seluruh; Health Data Officer hanya sensitif; atasan hanya non-sensitif (untuk agregat). */
  async forms(actor: ProdActor, keyword = ''): Promise<Form[]> {
    if (MOCK) {
      await delay();
      const term = keyword.trim().toLowerCase();
      const visible = (row: StoredForm) => {
        if (isHrRole(actor)) return true;
        if (actor.role === 'ROLE_HEALTH_DATA_OFFICER') return row.isSensitive;
        if (actor.role === 'ROLE_DEPT_MANAGER') return !row.isSensitive;
        return false;
      };
      if (actor.role === 'ROLE_EMPLOYEE')
        fail(403, 'FORBIDDEN', 'Daftar formulir untuk HR — isi formulir Anda di My Submissions.');
      return forms
        .filter((row) => !row.deletedAt && visible(row))
        .filter((row) => !term || `${row.code} ${row.formTitle}`.toLowerCase().includes(term))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(view);
    }
    const { data } = await api.post('/forms/search', snakeize({ filters: { formTitle: keyword || undefined } }));
    return camelize<WirePage<Form>>(data).data;
  },

  /** `F4.01` — HR Manager saja; lahir TERBUKA (DRAF gugur); pertanyaan awal satu transaksi. */
  async createForm(actor: ProdActor, draft: FormDraft): Promise<Form> {
    if (MOCK) {
      await delay(320);
      if (actor.role !== 'ROLE_HR_MANAGER') fail(403, 'FORBIDDEN', 'Hanya HR Manager yang dapat menyusun formulir.');
      validateDraft(draft);
      seq.form += 1;
      const row: StoredForm = {
        id: `f4000000-0000-7000-8000-${String(seq.form).padStart(12, '0')}`,
        code: `FRM-${pad(seq.form)}`,
        formTitle: draft.formTitle.trim(),
        identityMode: draft.identityMode,
        obligation: draft.identityMode === 'ANONIM' ? 'SUKARELA' : draft.obligation,
        audienceScope: draft.audienceScope,
        audiencePositionIds: draft.audienceScope === 'PER_BAGIAN' ? [...draft.audiencePositionIds] : [],
        isSensitive: draft.isSensitive,
        responseDueDate: draft.responseDueDate || null,
        retentionMonths: draft.isSensitive ? Number(draft.retentionMonths) : null,
        state: 'TERBUKA',
        questions: draft.questions.map((question, index) => {
          seq.question += 1;
          const choice = question.questionType === 'PILIHAN_SATU' || question.questionType === 'PILIHAN_BANYAK';
          return {
            id: `fq-${pad(seq.question)}`,
            questionType: question.questionType,
            questionText: question.questionText.trim(),
            questionChoices: choice
              ? question.questionChoices
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
              : null,
            questionOrder: index + 1,
          };
        }),
        createdAt: nowIso(),
        deletedAt: null,
      };
      forms.push(row);
      return view(row);
    }
    const body = {
      ...draft,
      retentionMonths: draft.retentionMonths ? Number(draft.retentionMonths) : undefined,
      responseDueDate: draft.responseDueDate || undefined,
      questions: draft.questions.map((question, index) => ({
        ...question,
        questionChoices: question.questionChoices
          ? question.questionChoices.split(',').map((item) => item.trim())
          : undefined,
        questionOrder: index + 1,
      })),
    };
    const { data } = await api.post('/forms', snakeize(body), { headers: { 'Idempotency-Key': newIdempotencyKey() } });
    return camelize<Form>(data);
  },

  /** `F4.03` — hanya TERBUKA → DITUTUP (pembukaan-kembali tingkat agregat tak tersedia). */
  async setFormState(actor: ProdActor, id: string, state: FormState): Promise<Form> {
    if (MOCK) {
      await delay(250);
      if (actor.role !== 'ROLE_HR_MANAGER') fail(403, 'FORBIDDEN', 'Hanya HR Manager yang dapat mengubah formulir.');
      const row = findForm(id);
      if (row.state === 'DITUTUP' && state === 'TERBUKA')
        fail(
          422,
          'PROD_FORM_STATE_TRANSITION_INVALID',
          'Formulir yang sudah ditutup tidak dapat dibuka kembali — buka jendela per orang.',
        );
      row.state = state;
      return view(row);
    }
    const { data } = await api.patch(`/forms/${id}`, { state });
    return camelize<Form>(data);
  },

  /** `F4.03` — atribut identitas & sensitivitas terkunci permanen sejak jawaban pertama. */
  async updateAttributes(
    actor: ProdActor,
    id: string,
    patch: { identityMode?: Form['identityMode']; isSensitive?: boolean },
  ) {
    if (MOCK) {
      await delay(250);
      if (actor.role !== 'ROLE_HR_MANAGER') fail(403, 'FORBIDDEN', 'Hanya HR Manager yang dapat mengubah formulir.');
      const row = findForm(id);
      if (submissions.some((item) => item.formId === id))
        fail(
          422,
          'PROD_FORM_ATTRIBUTE_LOCKED',
          'identity_mode/is_sensitive dikunci permanen sejak jawaban pertama masuk.',
        );
      if (patch.identityMode === 'ANONIM' && row.obligation === 'WAJIB')
        fail(422, 'PROD_FORM_ANONYMOUS_CANNOT_BE_MANDATORY', 'Formulir anonim tidak dapat diwajibkan.');
      Object.assign(row, patch);
      return view(row);
    }
    const { data } = await api.patch(`/forms/${id}`, snakeize(patch));
    return camelize<Form>(data);
  },

  /** `F4.05` — sudah berjawaban ⇒ 409, arahkan ke Tutup. */
  async deleteForm(actor: ProdActor, id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      if (actor.role !== 'ROLE_HR_MANAGER') fail(403, 'FORBIDDEN', 'Hanya HR Manager yang dapat menghapus formulir.');
      const row = findForm(id);
      if (submissions.some((item) => item.formId === id))
        fail(409, 'PROD_FORM_HAS_SUBMISSION', 'Formulir sudah punya pengiriman — tutup formulir, bukan hapus.');
      row.deletedAt = nowIso();
      return;
    }
    await api.delete(`/forms/${id}`);
  },

  /** `F4.14` — baris mentah; `created_by` tidak pernah disertakan; filter per-responden atas ANONIM = 403. */
  async submissions(actor: ProdActor, formId: string, respondentEmployeeId?: string): Promise<FormSubmission[]> {
    if (MOCK) {
      await delay();
      const form = findForm(formId);
      requireRawRead(actor, form);
      if (form.identityMode === 'ANONIM' && respondentEmployeeId)
        fail(403, 'FORBIDDEN', 'Formulir anonim tidak mendukung penyaringan per-responden.');
      return submissions
        .filter((row) => row.formId === formId)
        .filter((row) => !respondentEmployeeId || row.respondentEmployeeId === respondentEmployeeId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map((row) => ({
          ...row,
          respondentEmployeeId: form.identityMode === 'ANONIM' ? null : row.respondentEmployeeId,
        }));
    }
    const { data } = await api.post(
      `/forms/${formId}/submissions/search`,
      snakeize({ filters: { respondentEmployeeId } }),
    );
    return camelize<WirePage<FormSubmission>>(data).data;
  },

  /** `F4.17` — angka saja; ISIAN_TEKS hanya cacah; sensitif 403; di bawah ambang 422 tanpa menyebut cacahnya. */
  async aggregate(actor: ProdActor, formId: string): Promise<FormAggregate> {
    if (MOCK) {
      await delay();
      if (!isHrRole(actor) && actor.role !== 'ROLE_DEPT_MANAGER')
        fail(403, 'FORBIDDEN', 'Agregat hanya untuk atasan berjenjang dan HR.');
      const form = findForm(formId);
      if (form.isSensitive)
        fail(403, 'PROD_FORM_AGGREGATE_SENSITIVE_DENIED', 'Formulir sensitif tidak memiliki agregat.');
      const rows = submissions.filter((row) => row.formId === formId);
      if (rows.length < AGGREGATE_THRESHOLD)
        fail(422, 'PROD_FORM_AGGREGATE_BELOW_THRESHOLD', 'Jumlah responden belum mencapai ambang minimum agregat.');
      return {
        formId,
        respondentCount: rows.length,
        questions: [...form.questions]
          .sort((a, b) => a.questionOrder - b.questionOrder)
          .map((question) => {
            const answers = rows
              .map((row) => row.items.find((item) => item.questionId === question.id)?.answerValue ?? [])
              .filter((value) => value.some((entry) => entry.trim() !== ''));
            const aggregate: Record<string, number> = {};
            if (question.questionType === 'PILIHAN_SATU' || question.questionType === 'PILIHAN_BANYAK') {
              (question.questionChoices ?? []).forEach((choice) => {
                aggregate[choice] = answers.filter((value) => value.includes(choice)).length;
              });
            } else aggregate.count = answers.length;
            return {
              questionId: question.id,
              questionText: question.questionText,
              questionType: question.questionType,
              answeredCount: answers.length,
              aggregate,
            };
          }),
      };
    }
    const { data } = await api.get(`/forms/${formId}/answer-aggregates`);
    return camelize<FormAggregate>(data);
  },

  /** `F4.18` — HR saja; hanya BER_IDENTITAS + WAJIB; urut nama posisi; nol eskalasi. */
  async pendingRespondents(actor: ProdActor, formId: string): Promise<PendingRespondent[]> {
    if (MOCK) {
      await delay();
      if (!isHrRole(actor)) fail(403, 'FORBIDDEN', 'Daftar belum mengisi hanya untuk HR.');
      const form = findForm(formId);
      if (form.identityMode !== 'BER_IDENTITAS' || form.obligation !== 'WAJIB')
        fail(422, 'VALIDATION_ERROR', 'Daftar belum mengisi hanya berlaku untuk formulir wajib yang berindentitas.');
      const done = new Set(submissions.filter((row) => row.formId === formId).map((row) => row.respondentEmployeeId));
      return PROD_EMPLOYEES.filter((row) => inAudience(form, row.employeeId) && !done.has(row.employeeId))
        .map((row) => ({ employeeId: row.employeeId, name: row.name, positionName: row.positionName }))
        .sort((a, b) => a.positionName.localeCompare(b.positionName) || a.name.localeCompare(b.name));
    }
    const { data } = await api.get(`/forms/${formId}/pending-respondents`);
    return camelize<{ data: PendingRespondent[] }>(data).data;
  },

  /** `F4.19` — membuka WEWENANG satu orang, bukan isi; nol untuk ANONIM; nol sesudah masa simpan. */
  async grantWindow(
    actor: ProdActor,
    formId: string,
    targetEmployeeId: string,
    grantReason: string,
  ): Promise<FormWindowGrant> {
    if (MOCK) {
      await delay(250);
      if (!isHrRole(actor)) fail(403, 'FORBIDDEN', 'Hanya HR yang dapat membuka jendela pengisian.');
      const form = findForm(formId);
      if (form.identityMode === 'ANONIM')
        fail(422, 'PROD_FORM_ANONYMOUS_IMMUTABLE', 'Formulir anonim tidak mendukung pembukaan jendela per orang.');
      if (form.retentionMonths) {
        const expiry = new Date(form.createdAt);
        expiry.setMonth(expiry.getMonth() + form.retentionMonths);
        if (prodClock.now() > expiry)
          fail(422, 'PROD_FORM_RETENTION_EXPIRED', 'Formulir sudah melewati masa simpannya.');
      }
      if (!targetEmployeeId) fail(422, 'VALIDATION_ERROR', 'Karyawan wajib dipilih.');
      if (!grantReason.trim()) fail(422, 'VALIDATION_ERROR', 'Alasan wajib diisi.');
      seq.grant += 1;
      const grant: FormWindowGrant = {
        id: `fg-${pad(seq.grant)}`,
        formId,
        targetEmployeeId,
        grantReason: grantReason.trim(),
        grantedBy: { employeeId: actor.employeeId, name: nameOf(actor.employeeId) },
        grantedAt: nowIso(),
      };
      formGrants.push(grant);
      return { ...grant };
    }
    const { data } = await api.post('/form-window-grants', snakeize({ formId, targetEmployeeId, grantReason }));
    return camelize<FormWindowGrant>(data);
  },

  /** `F4.20` */
  async grants(actor: ProdActor, formId: string): Promise<FormWindowGrant[]> {
    if (MOCK) {
      await delay(150);
      if (!isHrRole(actor)) fail(403, 'FORBIDDEN', 'Riwayat jendela hanya untuk HR.');
      return formGrants.filter((row) => row.formId === formId).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
    }
    const { data } = await api.post('/form-window-grants/search', snakeize({ filters: { formId } }));
    return camelize<WirePage<FormWindowGrant>>(data).data;
  },

  /* ── Pengisi (self) ──────────────────────────────────────────────────────── */

  /** `F4.09` — formulir TERBUKA (atau ber-grant) yang menyasar pemanggil; `already_submitted` selalu false bila anonim. */
  async distributions(actor: ProdActor): Promise<FormDistribution[]> {
    if (MOCK) {
      await delay();
      return forms
        .filter((row) => !row.deletedAt && inAudience(row, actor.employeeId))
        .filter((row) => row.state === 'TERBUKA' || hasGrant(row.id, actor.employeeId))
        .map((row) => {
          const mine =
            row.identityMode === 'BER_IDENTITAS'
              ? submissions.find((item) => item.formId === row.id && item.respondentEmployeeId === actor.employeeId)
              : undefined;
          return {
            formId: row.id,
            formTitle: row.formTitle,
            identityMode: row.identityMode,
            obligation: row.obligation,
            responseDueDate: row.responseDueDate,
            state: row.state,
            alreadySubmitted: Boolean(mine),
            windowGranted: hasGrant(row.id, actor.employeeId),
            submissionId: mine?.id ?? null,
          };
        })
        .sort((a, b) => (a.responseDueDate ?? '9999').localeCompare(b.responseDueDate ?? '9999'));
    }
    const { data } = await api.get('/form-distributions');
    return camelize<WirePage<FormDistribution>>(data).data;
  },

  /** Pertanyaan formulir untuk pengisi (bagian dari `F4.09`/detail). */
  async formForRespondent(actor: ProdActor, formId: string): Promise<Form> {
    if (MOCK) {
      await delay(150);
      const form = findForm(formId);
      if (!inAudience(form, actor.employeeId))
        fail(403, 'PROD_FORM_NOT_IN_AUDIENCE', 'Anda bukan sasaran formulir ini.');
      return view(form);
    }
    const { data } = await api.get(`/forms/${formId}`);
    return camelize<Form>(data);
  },

  /**
   * `F4.10` — gerbang berurutan: TERBUKA/grant (403) → sasaran (403) → duplikat BER_IDENTITAS (409, dilewati pada
   * ANONIM) → bentuk jawaban (422). Respons tidak pernah mengembalikan identitas responden.
   */
  async submit(
    actor: ProdActor,
    formId: string,
    answers: Record<string, string[]>,
  ): Promise<{ submissionId: string; itemCount: number }> {
    if (MOCK) {
      await delay(300);
      const form = findForm(formId);
      if (form.state !== 'TERBUKA' && !hasGrant(formId, actor.employeeId))
        fail(403, 'PROD_WINDOW_GRANT_REQUIRED', 'Formulir sudah ditutup — minta HR membuka jendela untuk Anda.');
      if (!inAudience(form, actor.employeeId))
        fail(403, 'PROD_FORM_NOT_IN_AUDIENCE', 'Anda bukan sasaran formulir ini.');
      if (
        form.identityMode === 'BER_IDENTITAS' &&
        submissions.some((row) => row.formId === formId && row.respondentEmployeeId === actor.employeeId)
      )
        fail(409, 'PROD_FORM_ALREADY_SUBMITTED', 'Anda sudah mengisi formulir ini — sunting jawaban Anda.');
      const items: SubmissionItem[] = form.questions.map((question) => ({
        questionId: question.id,
        questionTypeSnapshot: question.questionType,
        questionTextSnapshot: question.questionText,
        questionChoicesSnapshot: question.questionChoices ? [...question.questionChoices] : null,
        answerValue: (answers[question.id] ?? []).filter((entry, index, list) => list.indexOf(entry) === index),
      }));
      const mismatch = items.map((item) => answerMismatch(item, item.answerValue)).find(Boolean);
      if (mismatch) fail(422, 'PROD_FORM_ANSWER_TYPE_MISMATCH', mismatch);
      seq.submission += 1;
      const row: FormSubmission = {
        id: `5b000000-0000-7000-8000-${String(seq.submission).padStart(12, '0')}`,
        formId,
        respondentEmployeeId: form.identityMode === 'ANONIM' ? null : actor.employeeId,
        submittedAt: nowIso(),
        items,
      };
      submissions.push(row);
      return { submissionId: row.id, itemCount: items.length };
    }
    const { data } = await api.post(
      '/form-submissions',
      snakeize({
        formId,
        answers: Object.entries(answers).map(([questionId, answerValue]) => ({ questionId, answerValue })),
      }),
      { headers: { 'Idempotency-Key': newIdempotencyKey() } },
    );
    return camelize<{ submissionId: string; itemCount: number }>(data);
  },

  /** `F4.12` — teks pertanyaan dari salinan beku, bukan definisi hari ini. */
  async mySubmission(actor: ProdActor, id: string): Promise<FormSubmission> {
    if (MOCK) {
      await delay(150);
      const row = submissions.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Pengiriman tidak ditemukan.');
      if (row.respondentEmployeeId !== actor.employeeId)
        fail(403, 'PROD_NOT_OBJECT_OWNER', 'Hanya pemilik jawaban yang dapat membukanya.');
      return { ...row, items: row.items.map((item) => ({ ...item, answerValue: [...item.answerValue] })) };
    }
    const { data } = await api.get(`/my-submissions/${id}`);
    return camelize<FormSubmission>(data);
  },

  /**
   * `F4.13` — pemilik SAJA (termasuk terhadap HR); ANONIM tak dapat disunting; TERBUKA/grant; bentuk cocok; hanya
   * item yang benar-benar berubah ditulis. `submitted_at` tidak bergeser.
   */
  async editSubmission(actor: ProdActor, id: string, answers: Record<string, string[]>): Promise<number> {
    if (MOCK) {
      await delay(300);
      const row = submissions.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Pengiriman tidak ditemukan.');
      const form = findForm(row.formId);
      if (row.respondentEmployeeId !== actor.employeeId)
        fail(403, 'PROD_NOT_OBJECT_OWNER', 'Hanya pemilik jawaban yang boleh menyunting.');
      if (form.identityMode === 'ANONIM')
        fail(422, 'PROD_FORM_ANONYMOUS_IMMUTABLE', 'Jawaban formulir anonim tidak dapat disunting.');
      if (form.state !== 'TERBUKA' && !hasGrant(form.id, actor.employeeId))
        fail(403, 'PROD_WINDOW_GRANT_REQUIRED', 'Formulir sudah ditutup — minta HR membuka jendela untuk Anda.');
      const mismatch = row.items
        .filter((item) => answers[item.questionId] !== undefined)
        .map((item) => answerMismatch(item, answers[item.questionId]))
        .find(Boolean);
      if (mismatch) fail(422, 'PROD_FORM_ANSWER_TYPE_MISMATCH', mismatch);
      let changed = 0;
      row.items.forEach((item) => {
        const next = answers[item.questionId];
        if (!next || JSON.stringify(next) === JSON.stringify(item.answerValue)) return;
        seq.change += 1;
        submissionChanges.push({
          id: `sc-${pad(seq.change)}`,
          submissionId: row.id,
          questionTextSnapshot: item.questionTextSnapshot,
          oldValue: item.answerValue.join(', '),
          newValue: next.join(', '),
          createdAt: nowIso(),
        });
        item.answerValue = [...next];
        changed += 1;
      });
      return changed;
    }
    await api.patch(
      `/my-submissions/${id}`,
      snakeize({ answers: Object.entries(answers).map(([questionId, answerValue]) => ({ questionId, answerValue })) }),
    );
    return Object.keys(answers).length;
  },

  /** `F4.16` — riwayat sunting, terbaru dulu. */
  async submissionChanges(actor: ProdActor, id: string): Promise<SubmissionChange[]> {
    if (MOCK) {
      await delay(120);
      const row = submissions.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Pengiriman tidak ditemukan.');
      if (row.respondentEmployeeId !== actor.employeeId) requireRawRead(actor, findForm(row.formId));
      return submissionChanges
        .filter((item) => item.submissionId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const { data } = await api.get(`/form-submissions/${id}/changes`);
    return camelize<WirePage<SubmissionChange>>(data).data;
  },
};
