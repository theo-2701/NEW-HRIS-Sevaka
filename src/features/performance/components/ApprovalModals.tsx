import { Form, Formik } from 'formik';
import { Link } from 'react-router-dom';
import * as Yup from 'yup';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { RadioBranch } from '@/components/RadioBranch';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { TextAreaField } from '@/components/form/TextAreaField';
import { cycleRound, formatDistribution } from '@/features/performance/format';
import { useApprovalRounds, useDecide, useReturnQuota } from '@/features/performance/hooks/useApprovals';
import { returnsUsed } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  OUTCOME_LABEL,
  PERF_PATHS,
  type ApprovalRound,
  type PendingApproval,
  type RoundOutcome,
} from '@/features/performance/types';
import { formatDateTime } from '@/lib/format';

const OUTCOME_TONE = { APPROVED: 'ok', RETURNED: 'warn', REJECTED_FINAL: 'err' } as const;

/** Tiga warna — merah khusus Ditolak final; putaran berjalan bukan nilai enum, jadi tanpa badge warna. */
export function OutcomeBadge({ outcome }: { outcome: RoundOutcome | null }) {
  if (!outcome) return <span className="font-medium text-fg-3">Menunggu keputusan</span>;
  return <StatusBadge tone={OUTCOME_TONE[outcome]}>{OUTCOME_LABEL[outcome]}</StatusBadge>;
}

/** F4/F5/F6 — satu tabel untuk tiga bentuk riwayat; alasan kosong sah untuk Disetujui. */
export function RoundsTable({ rows, loading }: { rows: ApprovalRound[]; loading?: boolean }) {
  return (
    <DataTable<ApprovalRound>
      rows={rows}
      rowKey={(row) => row.id}
      loading={loading}
      empty="Lembar ini belum pernah diajukan."
      columns={[
        { key: 'round', header: 'Siklus · Putaran', nowrap: true, render: (row) => cycleRound(row.cycleNo, row.roundNo) },
        { key: 'approver', header: 'Penyetuju', strong: true, render: (row) => row.approver.name },
        { key: 'outcome', header: 'Hasil', render: (row) => <OutcomeBadge outcome={row.outcome} /> },
        { key: 'reason', header: 'Alasan', muted: true, render: (row) => row.decisionReason ?? '—' },
        {
          key: 'decided',
          header: 'Diputuskan',
          nowrap: true,
          render: (row) => (row.decidedAt ? formatDateTime(row.decidedAt) : '—'),
        },
      ]}
    />
  );
}

const decisionSchema = Yup.object({
  decision: Yup.string().oneOf(['APPROVED', 'RETURNED', 'REJECTED_FINAL']).required(),
  decisionReason: Yup.string()
    .trim()
    .max(1000, 'Maksimal 1000 karakter.')
    .when('decision', {
      is: (decision: string) => decision !== 'APPROVED',
      then: (schema) => schema.required('Alasan keputusan wajib diisi.'),
    }),
});

/**
 * F2 (jatah tersisa, pill amber) / F3 (jatah habis, pill merah, Kembalikan mati dengan alasan).
 * Field alasan hanya ada untuk Kembalikan/Tolak final — tidak dirender untuk Setujui.
 */
export function DecideModal({
  item,
  onClose,
  onForwarded,
}: {
  item: PendingApproval | null;
  onClose: () => void;
  onForwarded: (roundId: string) => void;
}) {
  const { actor } = usePerfActor();
  const open = Boolean(item);
  const quota = useReturnQuota(open);
  const rounds = useApprovalRounds(actor, item?.reviewSheetId, open);
  const decide = useDecide(actor, item?.reviewSheetId ?? '');
  const used = item && rounds.data ? returnsUsed(rounds.data, item.cycleNo) : 0;
  const limit = quota.data ?? 0;
  const exhausted = quota.data !== undefined && used >= limit;

  return (
    <Formik<{ decision: RoundOutcome; decisionReason: string }>
      initialValues={{ decision: 'APPROVED', decisionReason: '' }}
      validationSchema={decisionSchema}
      onSubmit={(values, helpers) => {
        if (!item) return;
        decide.mutate(
          {
            decision: values.decision,
            decisionReason: values.decision === 'APPROVED' ? undefined : values.decisionReason.trim(),
          },
          {
            onSuccess: () => {
              onForwarded(item.approvalRoundId);
              helpers.resetForm();
              onClose();
            },
          },
        );
      }}
    >
      {({ values, setFieldValue, submitForm, resetForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title="Putuskan lembar"
          description="Keputusan diteruskan ke mesin alur kerja; status lembar berubah setelah proses itu selesai."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={decide.isPending || rounds.isLoading}>
                {decide.isPending ? 'Mengirim…' : 'Kirim keputusan'}
              </Button>
            </>
          }
        >
          {item && (
            <Form className="grid gap-4">
              <dl className="m-0 grid grid-cols-[160px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-cloud px-3.5 py-3 font-body text-[13px]">
                <dt className="font-medium text-fg-3">Karyawan dinilai</dt>
                <dd className="m-0 flex flex-wrap items-center gap-3 font-semibold text-fg-1">
                  {item.employee.name}
                  <Link to={PERF_PATHS.sheetDetail(item.reviewSheetId)} className="font-bold text-secondary-700 underline">
                    Buka lembar
                  </Link>
                </dd>
                <dt className="font-medium text-fg-3">Siklus · Putaran</dt>
                <dd className="m-0 font-semibold text-fg-1">{cycleRound(item.cycleNo, item.roundNo)}</dd>
                <dt className="font-medium text-fg-3">Sebaran nilai penilai</dt>
                <dd className="m-0 font-semibold text-fg-1">{formatDistribution(item.assessorScoreDistribution)}</dd>
                <dt className="font-medium text-fg-3">Diajukan</dt>
                <dd className="m-0 font-semibold text-fg-1">{formatDateTime(item.submittedAt)}</dd>
              </dl>

              {quota.data !== undefined && !rounds.isLoading && (
                <span
                  className={
                    exhausted
                      ? 'inline-flex w-fit items-center rounded-pill border border-error-200 bg-error-50 px-3.5 py-1.5 font-body text-[12px] font-semibold text-error-800'
                      : 'inline-flex w-fit items-center rounded-pill border border-warning-200 bg-warning-50 px-3.5 py-1.5 font-body text-[12px] font-semibold text-warning-800'
                  }
                >
                  {exhausted
                    ? `Jatah kembalikan habis: ${used} dari ${limit} terpakai`
                    : `Sisa jatah kembalikan: ${limit - used} dari ${limit}`}
                </span>
              )}

              <RadioBranch<RoundOutcome>
                name="decision"
                value={values.decision}
                onChange={(next) => void setFieldValue('decision', next)}
                options={[
                  { value: 'APPROVED', title: 'Setujui', description: 'Lembar disahkan. Alasan tidak diperlukan.' },
                  {
                    value: 'RETURNED',
                    title: 'Kembalikan',
                    description: exhausted
                      ? 'Tidak tersedia — jatah pengembalian siklus ini sudah habis.'
                      : 'Lembar kembali ke penilai untuk diperbaiki lalu diajukan ulang.',
                    disabled: exhausted,
                  },
                  {
                    value: 'REJECTED_FINAL',
                    title: 'Tolak final',
                    description: 'Keputusan akhir untuk siklus ini; karyawan masih dapat mengajukan sanggahan.',
                  },
                ]}
              />

              {values.decision !== 'APPROVED' && (
                <TextAreaField name="decisionReason" label="Alasan keputusan" required rows={4} maxLength={1000} />
              )}
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}
