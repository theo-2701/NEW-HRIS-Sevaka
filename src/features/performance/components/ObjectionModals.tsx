import { useMemo, type ReactNode } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { Banner } from '@/features/performance/components/PerfBits';
import { cycleRound, displayName, shortId } from '@/features/performance/format';
import {
  useAnswerObjection,
  useCreateObjection,
  useDeadlineDays,
  useObjection,
  useReopenWindow,
} from '@/features/performance/hooks/useObjections';
import { useSheets } from '@/features/performance/hooks/useSheets';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  HOLDER_CONTEXT_LABEL,
  OBJECTION_STATUS_LABEL,
  SUBJECT_LABEL,
  type ApprovalRound,
  type ObjectionHolder,
  type ObjectionRow,
  type ObjectionStatus,
  type ObjectionSubject,
} from '@/features/performance/types';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/store/ui.store';

const useOpenKey = (open: boolean) => useMemo(() => (open ? crypto.randomUUID() : ''), [open]);

/** §4.5.11 — tidak kosong/seluruhnya spasi, tanpa `<`/`>`. */
const noteField = (label: string, max: number) =>
  Yup.string()
    .trim()
    .required(`${label} wajib diisi.`)
    .max(max, `Maksimal ${max} karakter.`)
    .test('no-tags', 'Tidak boleh memuat tanda < atau >.', (value) => !/[<>]/.test(value ?? ''));

/** Biru untuk nilai disahkan, merah untuk tolak final — dua entry-point yang sengaja berbeda. */
export function SubjectBadge({ subject }: { subject: ObjectionSubject }) {
  return <StatusBadge tone={subject === 'VALUE' ? 'info' : 'err'}>{SUBJECT_LABEL[subject]}</StatusBadge>;
}

export function ObjectionStatusBadge({ status }: { status: ObjectionStatus }) {
  return <StatusBadge tone={status === 'SUBMITTED' ? 'warn' : 'ok'}>{OBJECTION_STATUS_LABEL[status]}</StatusBadge>;
}

export function HolderCell({ holder }: { holder: ObjectionHolder }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold text-fg-1">{displayName(holder.holderEmployeeId)}</span>
      {holder.holderContext && (
        <span className="font-body text-[11.5px] font-medium text-fg-3">{HOLDER_CONTEXT_LABEL[holder.holderContext]}</span>
      )}
    </span>
  );
}

type SummaryRow = [string, ReactNode];

function Summary({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="m-0 grid grid-cols-[150px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-cloud px-3.5 py-3 font-body text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-medium text-fg-3">{label}</dt>
          <dd className="m-0 font-semibold text-fg-1">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * G1 (`VALUE`, penjawab = penilai) / G2 (`REJECTED_FINAL`, penjawab = penyetuju putaran tolak).
 * Jenis tetap dari tombol yang dibuka — bukan dropdown jenis dalam satu form generik.
 */
export function CreateObjectionModal({
  subject,
  sheetId,
  round,
  onClose,
}: {
  subject: ObjectionSubject | null;
  sheetId: string;
  round: ApprovalRound | null;
  onClose: () => void;
}) {
  const { actor } = usePerfActor();
  const create = useCreateObjection(actor);
  const key = useOpenKey(Boolean(subject));
  const summary: SummaryRow[] = subject ? [['Jenis', <SubjectBadge key="subject" subject={subject} />]] : [];
  if (subject === 'REJECTED_FINAL' && round) {
    summary.push(
      [
        'Putaran ditolak',
        <span key="round" title={round.id}>
          {cycleRound(round.cycleNo, round.roundNo)} · <span className="font-mono text-[12px]">{shortId(round.id)}</span>
        </span>,
      ],
      ['Penjawab', round.approver.name],
    );
  } else if (subject === 'VALUE') {
    summary.push([
      'Penjawab',
      'Ditentukan sistem dari rantai penilaian — penilai lembar, atau atasan berikutnya bila penilai tidak lagi aktif.',
    ]);
  }
  return (
    <Formik
      initialValues={{ submissionNote: '' }}
      validationSchema={Yup.object({ submissionNote: noteField('Isi sanggahan', 4000) })}
      onSubmit={(values, helpers) => {
        if (!subject) return;
        create.mutate(
          {
            draft: {
              reviewSheetId: sheetId,
              subjectType: subject,
              approvalRoundId: subject === 'REJECTED_FINAL' ? round?.id : undefined,
              submissionNote: values.submissionNote.trim(),
            },
            idempotencyKey: key,
          },
          {
            onSuccess: (row) => {
              toast(`Sanggahan diajukan. Penjawab: ${displayName(row.currentHolder.holderEmployeeId)}.`, 'ok');
              helpers.resetForm();
              onClose();
            },
          },
        );
      }}
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={Boolean(subject)}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title={subject === 'REJECTED_FINAL' ? 'Sanggah tolak final' : 'Sanggah nilai disahkan'}
          description="Sanggahan atas nama Anda sendiri; penjawab ditentukan sistem, bukan dipilih."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={create.isPending}>
                {create.isPending ? 'Mengirim…' : 'Ajukan sanggahan'}
              </Button>
            </>
          }
        >
          {subject && (
            <Form className="grid gap-4">
              <Summary rows={summary} />
              <TextAreaField name="submissionNote" label="Isi sanggahan" required rows={6} maxLength={4000} />
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}

/** Drill-down `P5.02` — bukan layar tersendiri. */
export function ObjectionDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const { data } = useObjection(actor, id);
  return (
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Detail sanggahan"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {!data ? (
        <p className="m-0 font-body text-[13px] font-medium text-fg-3">Memuat sanggahan…</p>
      ) : (
        <div className="grid gap-4">
          <Summary
            rows={[
              ['Jenis', <SubjectBadge key="subject" subject={data.subjectType} />],
              ['Status', <ObjectionStatusBadge key="status" status={data.status} />],
              ['Pengaju', displayName(data.submittedByEmployeeId)],
              ['Pemikul aktif', <HolderCell key="holder" holder={data.currentHolder} />],
              ['Diajukan', formatDateTime(data.submittedAt)],
              ...(data.viaReopenWindowId ? ([['Lewat jendela', 'Dibuka kembali oleh HR']] as SummaryRow[]) : []),
            ]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[12px] font-bold uppercase tracking-[0.05em] text-fg-3">Isi sanggahan</span>
            <p className="m-0 whitespace-pre-line font-body text-[13.5px] font-medium leading-relaxed text-fg-1">{data.submissionNote}</p>
          </div>
          {data.answer ? (
            <div className="flex flex-col gap-1.5">
              <span className="font-body text-[12px] font-bold uppercase tracking-[0.05em] text-fg-3">
                Jawaban · {displayName(data.answer.answeredByEmployeeId)} · {formatDateTime(data.answer.answeredAt)}
              </span>
              <p className="m-0 whitespace-pre-line font-body text-[13.5px] font-medium leading-relaxed text-fg-1">
                {data.answer.answerText}
              </p>
            </div>
          ) : (
            <Banner tone="info">Belum dijawab. Bila pemikul tidak menjawab tepat waktu, kewajiban naik ke atasan berikutnya.</Banner>
          )}
        </div>
      )}
    </Modal>
  );
}

/** G4 — kutipan isi sanggahan di atas field jawaban; hanya pemikul teraktif yang lolos server. */
export function AnswerObjectionModal({ row, onClose }: { row: ObjectionRow | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const detail = useObjection(actor, row?.id ?? null);
  const answer = useAnswerObjection(actor);
  const key = useOpenKey(Boolean(row));
  return (
    <Formik
      initialValues={{ answerText: '' }}
      validationSchema={Yup.object({ answerText: noteField('Jawaban', 4000) })}
      onSubmit={(values, helpers) => {
        if (!row) return;
        answer.mutate(
          { id: row.id, text: values.answerText.trim(), idempotencyKey: key },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        );
      }}
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={Boolean(row)}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title="Jawab sanggahan"
          description="Satu sanggahan hanya punya satu jawaban; status berubah menjadi dijawab saat jawaban tersimpan."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={answer.isPending}>
                {answer.isPending ? 'Menyimpan…' : 'Kirim jawaban'}
              </Button>
            </>
          }
        >
          {row && (
            <Form className="grid gap-4">
              <Summary
                rows={[
                  ['Jenis', <SubjectBadge key="subject" subject={row.subjectType} />],
                  ['Pengaju', displayName(row.submittedByEmployeeId)],
                  ['Diajukan', formatDateTime(row.submittedAt)],
                ]}
              />
              <blockquote className="m-0 whitespace-pre-line rounded-md border-l-4 border-secondary-300 bg-primary-50 px-4 py-3 font-body text-[13.5px] font-medium leading-relaxed text-fg-1">
                {detail.data?.submissionNote ?? 'Memuat isi sanggahan…'}
              </blockquote>
              <TextAreaField name="answerText" label="Jawaban" required rows={5} maxLength={4000} />
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}

/** G6 — Create-only; tenggat baru = jangka penuh dari setelan, dibaca dari respons (bukan konstanta). */
export function ReopenWindowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actor } = usePerfActor();
  const reopen = useReopenWindow(actor);
  const days = useDeadlineDays(open);
  const sheets = useSheets(actor, { dataScope: 'ALL', page: 1, size: 100 }, open);
  const key = useOpenKey(open);
  const options = (sheets.data?.rows ?? [])
    .filter((row) => row.status === 'APPROVED' || row.status === 'REJECTED_FINAL')
    .map((row) => ({ value: row.id, label: row.employeeNameDisplay }));

  return (
    <Formik
      initialValues={{ sheetId: '', reason: '' }}
      validationSchema={Yup.object({
        sheetId: Yup.string().required('Karyawan & lembar wajib dipilih.'),
        reason: noteField('Alasan', 1000),
      })}
      onSubmit={(values, helpers) =>
        reopen.mutate(
          { sheetId: values.sheetId, reason: values.reason.trim(), idempotencyKey: key },
          {
            onSuccess: (row) => {
              toast(`Jendela sanggah dibuka sampai ${formatDateTime(row.newDeadlineAt)}.`, 'ok');
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          title="Buka kembali jendela sanggah"
          description="Karyawan dapat mengajukan sanggahan lagi sampai tenggat baru. Riwayat pembukaan tersimpan dan tidak dapat diubah."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={reopen.isPending}>
                {reopen.isPending ? 'Menyimpan…' : 'Buka jendela'}
              </Button>
            </>
          }
        >
          <Form className="grid gap-4">
            <SelectField
              name="sheetId"
              label="Karyawan & lembar"
              required
              placeholder="Pilih lembar yang sudah diputuskan"
              options={options}
            />
            <TextAreaField name="reason" label="Alasan" required rows={4} maxLength={1000} />
            {days.data !== undefined && (
              <Banner tone="info">
                Tenggat baru dihitung sistem: {days.data} hari penuh sejak jendela dibuka — bukan sisa tenggat lama.
              </Banner>
            )}
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
