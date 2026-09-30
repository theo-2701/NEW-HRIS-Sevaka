import { useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { Modal } from '@/components/Modal';
import { AddButton, RemoveRowButton, RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { ErrorBanner, Note } from '@/features/productivity/components/ProdBits';
import {
  useCreateForm,
  useDeleteForm,
  useEditSubmission,
  useFormAggregate,
  useFormGrant,
  useFormGrants,
  useFormSubmissions,
  useMySubmission,
  usePendingRespondents,
  useRespondentForm,
  useSetFormState,
  useSubmissionChanges,
  useSubmitForm,
} from '@/features/productivity/hooks/useForms';
import { AGGREGATE_THRESHOLD } from '@/features/productivity/forms-data';
import { PROD_EMPLOYEES } from '@/features/productivity/mock-data';
import { AUDIENCE_LABEL, nameOf, POSITIONS, QUESTION_TYPE_LABEL } from '@/features/productivity/rules';
import type { Form, FormDraft, FormQuestion, ProdActor, QuestionType } from '@/features/productivity/types';
import { formatDate, formatDateTime } from '@/lib/format';

const EMPTY_FORM: FormDraft = {
  formTitle: '',
  identityMode: 'BER_IDENTITAS',
  obligation: 'SUKARELA',
  audienceScope: 'SELURUH_KARYAWAN',
  audiencePositionIds: [],
  isSensitive: false,
  responseDueDate: '',
  retentionMonths: '',
  questions: [{ questionType: 'PILIHAN_SATU', questionText: '', questionChoices: '' }],
};

const isChoice = (type: QuestionType) => type === 'PILIHAN_SATU' || type === 'PILIHAN_BANYAK';

/**
 * `FRM-A3` — composer 7 field + pertanyaan dinamis. Kewajiban terkunci SUKARELA saat Mode Identitas = ANONIM
 * (gerbang Anonim × Wajib); tenggat wajib bila WAJIB; masa simpan wajib bila sensitif; posisi wajib bila per bagian.
 */
export function FormComposerModal({ actor, open, onClose }: { actor: ProdActor; open: boolean; onClose: () => void }) {
  const create = useCreateForm();
  const [draft, setDraft] = useState<FormDraft>(EMPTY_FORM);
  const set = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const setQuestion = (index: number, patch: Partial<FormDraft['questions'][number]>) =>
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  const close = () => {
    setDraft(EMPTY_FORM);
    create.reset();
    onClose();
  };
  const anonymous = draft.identityMode === 'ANONIM';

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="New form"
      description="The form opens immediately for its audience. Identity mode and sensitivity lock once the first answer arrives."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={() => create.mutate({ actor, draft }, { onSuccess: close })}>
            {create.isPending ? 'Creating…' : 'Create form'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={create.error} />
        <TextRow label="Form title" required value={draft.formTitle} onChange={(value) => set('formTitle', value)} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Identity mode" required>
            <Segmented
              value={draft.identityMode}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  identityMode: value,
                  obligation: value === 'ANONIM' ? 'SUKARELA' : prev.obligation,
                }))
              }
              options={[
                { value: 'BER_IDENTITAS', label: 'Named' },
                { value: 'ANONIM', label: 'Anonymous' },
              ]}
            />
          </Field>
          <Field label="Obligation" required hint={anonymous ? 'Anonymous forms are always voluntary.' : undefined}>
            <div className={anonymous ? 'pointer-events-none opacity-60' : undefined}>
              <Segmented
                value={draft.obligation}
                onChange={(value) => set('obligation', value)}
                options={[
                  { value: 'SUKARELA', label: 'Voluntary' },
                  { value: 'WAJIB', label: 'Mandatory' },
                ]}
              />
            </div>
          </Field>
          <SelectRow
            label="Audience"
            required
            value={draft.audienceScope}
            onChange={(value) => set('audienceScope', value as FormDraft['audienceScope'])}
            options={(Object.keys(AUDIENCE_LABEL) as FormDraft['audienceScope'][]).map((value) => ({
              value,
              label: AUDIENCE_LABEL[value],
            }))}
          />
          <Field
            label="Sensitive data"
            hint="Sensitive answers are readable only by the HR Manager and the Health Data Officer, with no aggregate."
          >
            <label className="flex h-9 items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
              <Checkbox checked={draft.isSensitive} onCheckedChange={(value) => set('isSensitive', value === true)} />
              Mark this form as sensitive
            </label>
          </Field>
          {draft.audienceScope === 'PER_BAGIAN' && (
            <div className="md:col-span-2">
              <Field
                label="Positions"
                required
                hint="Employees without a structural position never see forms targeted by position."
              >
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {POSITIONS.map((position) => (
                    <label
                      key={position.value}
                      className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1"
                    >
                      <Checkbox
                        checked={draft.audiencePositionIds.includes(position.value)}
                        onCheckedChange={(value) =>
                          set(
                            'audiencePositionIds',
                            value === true
                              ? [...draft.audiencePositionIds, position.value]
                              : draft.audiencePositionIds.filter((item) => item !== position.value),
                          )
                        }
                      />
                      {position.label}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          )}
          {draft.obligation === 'WAJIB' && (
            <Field label="Response due date" required>
              <DatePicker value={draft.responseDueDate} onChange={(value) => set('responseDueDate', value)} />
            </Field>
          )}
          {draft.isSensitive && (
            <Field label="Retention (months)" required>
              <Input
                type="number"
                min={1}
                value={draft.retentionMonths}
                onChange={(event) => set('retentionMonths', event.target.value)}
              />
            </Field>
          )}
        </div>
        {anonymous && (
          <Note>
            Anonymous forms cannot be mandatory: there is no way to know who has not answered, so the obligation is
            locked to Voluntary.
          </Note>
        )}

        <Field label="Questions" required>
          <div className="flex flex-col gap-3">
            {draft.questions.map((question, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-fog p-3">
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs font-bold text-fg-3">Q{index + 1}</span>
                  <Select
                    value={question.questionType}
                    onValueChange={(value) => setQuestion(index, { questionType: value as QuestionType })}
                  >
                    <SelectTrigger className="h-9 w-[180px]" aria-label={`Question ${index + 1} type`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {QUESTION_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    aria-label={`Question ${index + 1} text`}
                    placeholder="Question text"
                    value={question.questionText}
                    onChange={(event) => setQuestion(index, { questionText: event.target.value })}
                  />
                  {draft.questions.length > 1 && (
                    <RemoveRowButton
                      onClick={() =>
                        set(
                          'questions',
                          draft.questions.filter((_, i) => i !== index),
                        )
                      }
                    />
                  )}
                </div>
                {isChoice(question.questionType) && (
                  <Input
                    aria-label={`Question ${index + 1} choices`}
                    placeholder="Choices, separated by commas — e.g. 1, 2, 3, 4, 5"
                    value={question.questionChoices}
                    onChange={(event) => setQuestion(index, { questionChoices: event.target.value })}
                  />
                )}
              </div>
            ))}
            <div>
              <AddButton
                onClick={() =>
                  set('questions', [
                    ...draft.questions,
                    { questionType: 'ISIAN_TEKS', questionText: '', questionChoices: '' },
                  ])
                }
              >
                Add question
              </AddButton>
            </div>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

const answerText = (value: string[]) => (value.length ? value.join(', ') : '—');

type DetailTab = 'QUESTIONS' | 'RESPONSES' | 'PENDING' | 'GRANTS' | 'AGGREGATE';

/**
 * `FRM-A5`/`A6`/`A7` — satu modal detail bertab sesuai jenis formulir: Jawaban Masuk (baris mentah, digerbang
 * sensitivitas; anonim tanpa kolom responden), Belum Mengisi (BER_IDENTITAS + WAJIB), Jendela (bukan anonim),
 * Agregat (non-sensitif, ambang interim). Setiap baca baris orang lain tercatat di jejak akses.
 */
export function FormDetailModal({
  actor,
  form,
  onClose,
}: {
  actor: ProdActor;
  form: Form | null;
  onClose: () => void;
}) {
  const hr = actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_HR_STAFF';
  const canRaw = form
    ? form.isSensitive
      ? actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_HEALTH_DATA_OFFICER'
      : hr
    : false;
  const tabs: DetailTab[] = form
    ? [
        'QUESTIONS',
        ...(hr || actor.role === 'ROLE_HEALTH_DATA_OFFICER' ? (['RESPONSES'] as const) : []),
        ...(hr && form.identityMode === 'BER_IDENTITAS' && form.obligation === 'WAJIB' ? (['PENDING'] as const) : []),
        ...(hr && form.identityMode === 'BER_IDENTITAS' ? (['GRANTS'] as const) : []),
        ...(!form.isSensitive && (hr || actor.role === 'ROLE_DEPT_MANAGER') ? (['AGGREGATE'] as const) : []),
      ]
    : [];
  const [tab, setTab] = useState<DetailTab>('QUESTIONS');
  const active = tabs.includes(tab) ? tab : tabs[0];
  useEffect(() => setTab(actor.role === 'ROLE_DEPT_MANAGER' ? 'AGGREGATE' : 'QUESTIONS'), [form?.id, actor.role]);

  const id = form?.id ?? '';
  const responses = useFormSubmissions(actor, id, Boolean(form) && active === 'RESPONSES');
  const aggregate = useFormAggregate(actor, id, Boolean(form) && active === 'AGGREGATE');
  const pending = usePendingRespondents(actor, id, Boolean(form) && active === 'PENDING');
  const grants = useFormGrants(actor, id, Boolean(form) && active === 'GRANTS');
  const grant = useFormGrant();
  const close = useSetFormState();
  const remove = useDeleteForm();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');

  if (!form) return null;
  const manager = actor.role === 'ROLE_HR_MANAGER';
  const questions = form.questions;
  const labelOf: Record<DetailTab, string> = {
    QUESTIONS: 'Questions',
    RESPONSES: form.identityMode === 'ANONIM' ? 'Anonymous responses' : 'Responses',
    PENDING: 'Not answered',
    GRANTS: 'Reopened for',
    AGGREGATE: 'Aggregate',
  };

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${form.code} · ${form.formTitle}`}
      description={`${AUDIENCE_LABEL[form.audienceScope]} · ${form.submissionCount} response${form.submissionCount === 1 ? '' : 's'}${form.responseDueDate ? ` · due ${formatDate(form.responseDueDate)}` : ''}`}
      size="wide"
      footer={
        <>
          {manager && form.submissionCount === 0 && (
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ actor, id: form.id }, { onSuccess: onClose })}
            >
              Delete form
            </Button>
          )}
          {manager && form.state === 'TERBUKA' && (
            <Button
              variant="secondary"
              disabled={close.isPending}
              onClick={() => close.mutate({ actor, id: form.id, state: 'DITUTUP' })}
            >
              Close form
            </Button>
          )}
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={close.error ?? remove.error} />
        {tabs.length > 1 && (
          <TabMenu<DetailTab>
            value={active}
            onChange={setTab}
            items={tabs.map((value) => ({ value, label: labelOf[value] }))}
          />
        )}

        {active === 'QUESTIONS' && (
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {questions.map((question) => (
              <li key={question.id} className="rounded-md border border-fog px-3 py-2 font-body text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-fg-1">
                    {question.questionOrder}. {question.questionText}
                  </span>
                  <StatusBadge tone="mute">{QUESTION_TYPE_LABEL[question.questionType]}</StatusBadge>
                </div>
                {question.questionChoices && (
                  <p className="m-0 mt-1 text-xs text-fg-3">{question.questionChoices.join(' · ')}</p>
                )}
              </li>
            ))}
          </ol>
        )}

        {active === 'RESPONSES' && (
          <>
            {form.audienceScope === 'PER_BAGIAN' && (
              <Note>Employees without a structural position never appear in this list.</Note>
            )}
            {!canRaw ? (
              <ErrorBanner error={responses.error ?? new Error('Not allowed')} />
            ) : responses.error ? (
              <ErrorBanner error={responses.error} />
            ) : (
              <DataTable
                rows={responses.data ?? []}
                rowKey={(row) => row.id}
                loading={responses.isLoading}
                empty="No response yet."
                columns={[
                  ...(form.identityMode === 'ANONIM'
                    ? []
                    : [
                        {
                          key: 'who',
                          header: 'Respondent',
                          render: (row: NonNullable<typeof responses.data>[number]) => nameOf(row.respondentEmployeeId),
                        },
                      ]),
                  {
                    key: 'at',
                    header: 'Submitted',
                    nowrap: true,
                    render: (row: NonNullable<typeof responses.data>[number]) => formatDateTime(row.submittedAt),
                  },
                  {
                    key: 'answers',
                    header: 'Answers',
                    render: (row: NonNullable<typeof responses.data>[number]) => (
                      <ul className="m-0 flex list-none flex-col gap-0.5 whitespace-normal p-0">
                        {row.items.map((item) => (
                          <li key={item.questionId} className="text-xs">
                            <span className="text-fg-3">{item.questionTextSnapshot}:</span>{' '}
                            <span className="font-semibold text-fg-1">{answerText(item.answerValue)}</span>
                          </li>
                        ))}
                      </ul>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}

        {active === 'PENDING' && (
          <>
            <Note>
              A simple list for HR — nothing is escalated from here.{' '}
              {form.audienceScope === 'PER_BAGIAN' && 'Employees without a structural position never appear.'}
            </Note>
            <ErrorBanner error={pending.error} />
            <DataTable
              rows={pending.data ?? []}
              rowKey={(row) => row.employeeId}
              loading={pending.isLoading}
              empty="Everyone in the audience has answered."
              columns={[
                { key: 'name', header: 'Employee', strong: true, render: (row) => row.name },
                { key: 'position', header: 'Position', render: (row) => row.positionName },
              ]}
            />
          </>
        )}

        {active === 'GRANTS' && (
          <>
            <Note>
              Reopening lets one person answer or edit their own answers after the form closes. Nobody can answer for
              them.
            </Note>
            <ErrorBanner error={grant.error ?? grants.error} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
              <SelectRow
                label="Employee"
                placeholder="Choose employee…"
                value={target}
                onChange={setTarget}
                options={PROD_EMPLOYEES.map((row) => ({
                  value: row.employeeId,
                  label: `${row.name} · ${row.positionName}`,
                }))}
              />
              <TextRow label="Reason" value={reason} onChange={setReason} />
              <RowButton
                className="mb-0.5"
                disabled={!target || !reason.trim() || grant.isPending}
                onClick={() =>
                  grant.mutate(
                    { actor, formId: form.id, targetEmployeeId: target, reason },
                    {
                      onSuccess: () => {
                        setTarget('');
                        setReason('');
                      },
                    },
                  )
                }
              >
                Reopen for this person
              </RowButton>
            </div>
            <DataTable
              rows={grants.data ?? []}
              rowKey={(row) => row.id}
              loading={grants.isLoading}
              empty="No one has been given a reopened window."
              columns={[
                { key: 'who', header: 'Employee', strong: true, render: (row) => nameOf(row.targetEmployeeId) },
                {
                  key: 'reason',
                  header: 'Reason',
                  render: (row) => <span className="whitespace-normal">{row.grantReason}</span>,
                },
                { key: 'by', header: 'Granted by', render: (row) => row.grantedBy.name },
                { key: 'at', header: 'At', nowrap: true, muted: true, render: (row) => formatDateTime(row.grantedAt) },
              ]}
            />
          </>
        )}

        {active === 'AGGREGATE' && (
          <>
            <Note tone="warn">
              Minimum of {AGGREGATE_THRESHOLD} respondents before any aggregate is shown — a temporary value waiting for
              a decision. Text answers are only counted, never shown.
            </Note>
            {aggregate.error ? (
              <ErrorBanner error={aggregate.error} />
            ) : aggregate.data ? (
              <div className="flex flex-col gap-3">
                <p className="m-0 font-body text-[13px] font-semibold text-fg-2">
                  {aggregate.data.respondentCount} respondents
                </p>
                {aggregate.data.questions.map((question) => (
                  <div
                    key={question.questionId}
                    className="rounded-md border border-fog px-3 py-2 font-body text-[13px]"
                  >
                    <div className="font-bold text-fg-1">{question.questionText}</div>
                    <div className="text-xs text-fg-3">{question.answeredCount} answered</div>
                    {question.questionType === 'ISIAN_TEKS' ? (
                      <div className="mt-1 text-xs font-semibold text-fg-2">
                        {question.aggregate.count} text answers (content not shown)
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-1">
                        {Object.entries(question.aggregate).map(([choice, count]) => {
                          const width = question.answeredCount ? Math.round((count / question.answeredCount) * 100) : 0;
                          return (
                            <div key={choice} className="flex items-center gap-2 text-xs">
                              <span className="w-32 shrink-0 truncate text-fg-2">{choice}</span>
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-vapor">
                                <span
                                  className="block h-full rounded-full bg-secondary-500"
                                  style={{ width: `${width}%` }}
                                />
                              </span>
                              <span className="w-8 text-right font-bold text-fg-1">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 font-body text-[13px] text-fg-3">Loading…</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  switch (question.questionType) {
    case 'PILIHAN_SATU':
      return (
        <Select value={value[0] ?? ''} onValueChange={(next) => onChange([next])}>
          <SelectTrigger className="h-9 w-full" aria-label={question.questionText}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {(question.questionChoices ?? []).map((choice) => (
              <SelectItem key={choice} value={choice}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'PILIHAN_BANYAK':
      return (
        <div className="flex flex-wrap gap-3">
          {(question.questionChoices ?? []).map((choice) => (
            <label key={choice} className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
              <Checkbox
                checked={value.includes(choice)}
                onCheckedChange={(checked) =>
                  onChange(checked === true ? [...value, choice] : value.filter((item) => item !== choice))
                }
              />
              {choice}
            </label>
          ))}
        </div>
      );
    case 'ANGKA':
      return (
        <Input
          type="number"
          aria-label={question.questionText}
          value={value[0] ?? ''}
          onChange={(event) => onChange([event.target.value])}
        />
      );
    case 'TANGGAL':
      return <DatePicker value={value[0] ?? ''} onChange={(next) => onChange(next ? [next] : [])} />;
    default:
      return (
        <Textarea
          rows={2}
          aria-label={question.questionText}
          value={value[0] ?? ''}
          onChange={(event) => onChange([event.target.value])}
        />
      );
  }
}

/**
 * `MS-A3`/`MS-A5` (sunting, pertanyaan dari salinan beku) dan pengisian baru — termasuk `MS-A6` formulir anonim
 * dengan peringatan tak dapat disunting. Pemilik saja; HR tidak punya tombol sunting.
 */
export function AnswerModal({
  actor,
  formId,
  submissionId,
  onClose,
}: {
  actor: ProdActor;
  formId: string | null;
  submissionId: string | null;
  onClose: () => void;
}) {
  const form = useRespondentForm(actor, formId);
  const mine = useMySubmission(actor, submissionId);
  const changes = useSubmissionChanges(actor, submissionId);
  const submit = useSubmitForm();
  const edit = useEditSubmission();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!formId) return;
    const seed: Record<string, string[]> = {};
    mine.data?.items.forEach((item) => {
      seed[item.questionId] = [...item.answerValue];
    });
    setAnswers(seed);
    submit.reset();
    edit.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang saat formulir/jawaban berganti
  }, [formId, mine.data?.id]);

  if (!formId) return null;
  const editing = Boolean(submissionId);
  const anonymous = form.data?.identityMode === 'ANONIM';
  const questions: FormQuestion[] = editing
    ? (mine.data?.items ?? []).map((item, index) => ({
        id: item.questionId,
        questionType: item.questionTypeSnapshot,
        questionText: item.questionTextSnapshot,
        questionChoices: item.questionChoicesSnapshot,
        questionOrder: index + 1,
      }))
    : (form.data?.questions ?? []);
  const pending = submit.isPending || edit.isPending;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={form.data?.formTitle ?? 'Form'}
      description={
        editing
          ? 'Questions are shown as they were when you answered. Only answers you change are recorded.'
          : anonymous
            ? 'Anonymous — your name is not stored with the answers.'
            : undefined
      }
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending || !questions.length}
            onClick={() =>
              editing
                ? edit.mutate({ actor, id: submissionId!, answers }, { onSuccess: onClose })
                : submit.mutate({ actor, formId, answers }, { onSuccess: onClose })
            }
          >
            {pending ? 'Sending…' : editing ? 'Save changes' : 'Send answers'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={form.error ?? mine.error ?? submit.error ?? edit.error} />
        {anonymous && !editing && (
          <Note tone="warn">Anonymous answers cannot be edited after sending — not by you, and not by HR.</Note>
        )}
        {questions.map((question) => (
          <Field key={question.id} label={`${question.questionOrder}. ${question.questionText}`}>
            <AnswerInput
              question={question}
              value={answers[question.id] ?? []}
              onChange={(next) => setAnswers((prev) => ({ ...prev, [question.id]: next }))}
            />
          </Field>
        ))}
        {editing && (changes.data ?? []).length > 0 && (
          <Field label="Your edits">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {(changes.data ?? []).map((row) => (
                <li key={row.id} className="font-body text-xs text-fg-2">
                  <span className="font-semibold">{row.questionTextSnapshot}</span>: {row.oldValue || '—'} →{' '}
                  {row.newValue || '—'} · <span className="text-fg-3">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </div>
    </Modal>
  );
}
