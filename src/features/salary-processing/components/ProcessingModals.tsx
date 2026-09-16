import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { RadioBranch } from '@/components/RadioBranch';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import {
  FinalStateBadge,
  FindingTypeTag,
  Money,
  PeriodStatusBadge,
} from '@/features/salary-processing/components/ProcessingBits';
import {
  useBulkResolve,
  useResolveFinding,
  useReviewPeriod,
  useRunPeriod,
  useSubmitImport,
  useVerifyImport,
} from '@/features/salary-processing/hooks/useSalaryProcessing';
import { EMPLOYEES, FINDING_TYPE_INFO, employeeName } from '@/features/salary-processing/mock-data';
import { newIdempotencyKey, periodLabel, periodName, runBranch } from '@/features/salary-processing/rules';
import { MONTH_NAMES } from '@/features/salary-processing/types';
import type {
  Actor,
  FinalState,
  Finding,
  HistoryImport,
  ImportDraft,
  PayrollPeriod,
} from '@/features/salary-processing/types';
import { formatDate, formatDateTime } from '@/lib/format';

const YEARS = [2025, 2026, 2027];

function FieldHint({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11px] font-medium leading-snug text-fg-3">{children}</span>;
}

/** A2 — Jalankan periode. Satu form, dua cabang server; kunci idempotensi dibuat saat modal dibuka. */
export function RunPeriodModal({
  actor,
  open,
  initial,
  periods,
  onClose,
  onDone,
}: {
  actor: Actor;
  open: boolean;
  initial: { year: number; month: number } | null;
  periods: PayrollPeriod[];
  onClose: () => void;
  onDone: (period: PayrollPeriod) => void;
}) {
  const run = useRunPeriod();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (!open) return;
    setYear(initial?.year ?? 2026);
    setMonth(initial?.month ?? 10);
    setIdempotencyKey(newIdempotencyKey());
  }, [open, initial]);

  const { branch, existing } = runBranch(periods, year, month);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={initial ? 'Recalculate period' : 'Run period'}
      description="Pilih tahun dan bulan. Periode yang belum ada akan dihitung baru; periode yang masih Calculated akan dihitung ulang."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={branch === 'BLOCKED' || run.isPending}
            onClick={() =>
              run.mutate(
                { actor, input: { periodYear: year, periodMonth: month, idempotencyKey } },
                {
                  onSuccess: (result) => {
                    onDone(result.period);
                    onClose();
                  },
                },
              )
            }
          >
            {run.isPending ? 'Calculating…' : branch === 'RECALCULATE' ? 'Recalculate' : 'Run period'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>
            Year<em>*</em>
          </Label>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))} disabled={Boolean(initial)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((item) => (
                <SelectItem key={item} value={String(item)}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>
            Month<em>*</em>
          </Label>
          <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))} disabled={Boolean(initial)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, index) => (
                <SelectItem key={name} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border-1 bg-mist px-4 py-3 font-body text-[13px] font-medium leading-normal text-fg-2">
        <strong className="text-fg-1">{periodLabel({ periodYear: year, periodMonth: month })}</strong> ·{' '}
        {branch === 'INSERT' && 'Periode baru akan dihitung dan berstatus Calculated.'}
        {branch === 'RECALCULATE' && 'Periode sudah ada dan masih Calculated — angka dan parameter beku akan dihitung ulang.'}
        {branch === 'BLOCKED' && existing && (
          <>
            Periode sudah berstatus <PeriodStatusBadge status={existing.status} />. Hitung ulang hanya bisa setelah HR
            Manager membukanya kembali.
          </>
        )}
      </div>
    </Modal>
  );
}

/** A4 — Tinjau: konfirmasi tanpa isian. */
export function ReviewPeriodModal({
  actor,
  period,
  onClose,
}: {
  actor: Actor;
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const review = useReviewPeriod();
  return (
    <Modal
      open={Boolean(period)}
      onOpenChange={(next) => !next && onClose()}
      title="Mark period as reviewed"
      description="Setelah ditinjau, periode menunggu HR Manager untuk dikunci dan diotorisasi penyerahannya."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={review.isPending}
            onClick={() => period && review.mutate({ actor, id: period.id }, { onSuccess: onClose })}
          >
            {review.isPending ? 'Saving…' : 'Mark as reviewed'}
          </Button>
        </>
      }
    >
      {period && (
        <KeyValueList>
          <KeyValueRow label="Period">
            {periodLabel(period)} · {periodName(period)}
          </KeyValueRow>
          <KeyValueRow label="Status">
            <PeriodStatusBadge status={period.status} />
          </KeyValueRow>
          <KeyValueRow label="Calculated">
            {employeeName(period.calculated.employeeId)} · {formatDateTime(period.calculated.at)}
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

function DetailValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-fg-4">null</span>;
  if (typeof value === 'boolean') return <span className="font-mono text-xs">{String(value)}</span>;
  return <span className="font-mono text-xs">{String(value)}</span>;
}

/** B3 — detail temuan; bentuk `detail` berbeda per jenis. */
export function FindingDetailModal({
  finding,
  periodText,
  onClose,
}: {
  finding: Finding | null;
  periodText: string;
  onClose: () => void;
}) {
  const info = FINDING_TYPE_INFO.find((row) => row.type === finding?.findingType);
  return (
    <Modal
      open={Boolean(finding)}
      onOpenChange={(next) => !next && onClose()}
      title={finding ? `Finding ${finding.id}` : ''}
      description={info?.meaning}
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {finding && (
        <>
          <KeyValueList>
            <KeyValueRow label="Finding type">
              <FindingTypeTag type={finding.findingType} />
            </KeyValueRow>
            <KeyValueRow label="Period">{periodText}</KeyValueRow>
            <KeyValueRow label="Subject">{finding.employeeId ? employeeName(finding.employeeId) : 'Period-level'}</KeyValueRow>
            <KeyValueRow label="Final state">
              <FinalStateBadge state={finding.finalState} />
            </KeyValueRow>
            {finding.finalState && (
              <KeyValueRow label="Resolved">
                {employeeName(finding.resolvedBy)} · {formatDateTime(finding.resolvedAt ?? '')}
              </KeyValueRow>
            )}
            {finding.resolutionReason && <KeyValueRow label="Reason">{finding.resolutionReason}</KeyValueRow>}
            {finding.repeatCount !== null && <KeyValueRow label="Repeat count">{finding.repeatCount}</KeyValueRow>}
            <KeyValueRow label="Created">{formatDateTime(finding.createdAt)}</KeyValueRow>
          </KeyValueList>

          <div className="flex flex-col gap-2">
            <span className="font-body text-xs font-bold uppercase tracking-[0.05em] text-fg-3">Detail</span>
            <div className="rounded-lg border border-border-1 bg-mist px-4 py-3">
              <KeyValueList>
                {Object.entries(finding.detail).map(([key, value]) => (
                  <KeyValueRow key={key} label={key}>
                    <DetailValue value={value} />
                  </KeyValueRow>
                ))}
              </KeyValueList>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

/** B5/B6 — tutup satu temuan. */
export function ResolveFindingModal({
  actor,
  finding,
  onClose,
}: {
  actor: Actor;
  finding: Finding | null;
  onClose: () => void;
}) {
  const resolve = useResolveFinding();
  const [finalState, setFinalState] = useState<FinalState | ''>('');
  const [reason, setReason] = useState('');
  const notPickedUp = finding?.findingType === 'PERIOD_NOT_PICKED_UP';

  useEffect(() => {
    if (!finding) return;
    setFinalState(finding.findingType === 'PERIOD_NOT_PICKED_UP' ? 'DITERIMA' : '');
    setReason('');
  }, [finding]);

  const ready = finalState === 'DIPERBAIKI' || (finalState === 'DITERIMA' && reason.trim().length > 0);

  return (
    <Modal
      open={Boolean(finding)}
      onOpenChange={(next) => !next && onClose()}
      title="Resolve finding"
      description={finding ? `${finding.id} · ${finding.findingType}${finding.employeeId ? ` · ${employeeName(finding.employeeId)}` : ''}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || resolve.isPending}
            onClick={() =>
              finding &&
              resolve.mutate(
                { actor, id: finding.id, input: { finalState, resolutionReason: reason } },
                { onSuccess: onClose },
              )
            }
          >
            {resolve.isPending ? 'Saving…' : 'Resolve'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label>
          Final state<em>*</em>
        </Label>
        <RadioBranch<FinalState>
          name="final-state"
          value={finalState as FinalState}
          onChange={setFinalState}
          options={[
            {
              value: 'DIPERBAIKI',
              title: 'Diperbaiki',
              description: notPickedUp
                ? 'Tidak tersedia untuk jenis ini — tertutup otomatis saat sistem klien mengambil periode.'
                : 'Penyebabnya sudah diperbaiki di sumber datanya.',
              disabled: notPickedUp,
            },
            {
              value: 'DITERIMA',
              title: 'Diterima',
              description: 'Diterima apa adanya dengan alasan tertulis.',
            },
          ]}
        />
      </div>

      {finalState === 'DITERIMA' && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="resolution-reason">
            Resolution reason<em>*</em>
          </Label>
          <Textarea
            id="resolution-reason"
            rows={3}
            value={reason}
            placeholder="Mis. default SBU company belum tersedia"
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}

/** B7 — tutup borongan; keadaan akhir terkunci ke Diterima dengan satu alasan bersama. */
export function BulkResolveModal({
  actor,
  findings,
  onClose,
  onDone,
}: {
  actor: Actor;
  findings: Finding[];
  onClose: () => void;
  onDone: () => void;
}) {
  const bulk = useBulkResolve();
  const [reason, setReason] = useState('');
  const open = findings.length > 0;

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Resolve ${findings.length} findings as Diterima`}
      description="Borongan hanya untuk Diterima. Satu alasan ditulis sama ke seluruh temuan terpilih."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim() || bulk.isPending}
            onClick={() =>
              bulk.mutate(
                { actor, ids: findings.map((row) => row.id), reason },
                {
                  onSuccess: () => {
                    onDone();
                    onClose();
                  },
                },
              )
            }
          >
            {bulk.isPending ? 'Saving…' : 'Resolve as Diterima'}
          </Button>
        </>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-1.5 rounded-lg border border-border-1 bg-mist p-3">
        {findings.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2 font-body text-[13px] font-medium text-fg-2">
            <span className="font-mono text-xs text-fg-1">{row.id}</span>
            <FindingTypeTag type={row.findingType} />
            <span>{row.employeeId ? employeeName(row.employeeId) : 'Period-level'}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1">
        <Label htmlFor="bulk-reason">
          Shared resolution reason<em>*</em>
        </Label>
        <Textarea id="bulk-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
    </Modal>
  );
}

const EMPTY_DRAFT: ImportDraft = {
  employeeId: '',
  monthYear: '',
  grossTaxableIncomeAmount: '',
  pph21WithheldAmount: '',
  bpjsContributionAmount: '',
};

/** B12 — submit atau koreksi impor riwayat (maker). */
export function ImportFormModal({
  actor,
  open,
  correcting,
  firstMonth,
  onClose,
}: {
  actor: Actor;
  open: boolean;
  correcting: HistoryImport | null;
  firstMonth: string | null;
  onClose: () => void;
}) {
  const submit = useSubmitImport();
  const [draft, setDraft] = useState<ImportDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (!open) return;
    setDraft(
      correcting
        ? {
            employeeId: correcting.employeeId,
            monthYear: correcting.monthYear,
            grossTaxableIncomeAmount: String(correcting.grossTaxableIncomeAmount),
            pph21WithheldAmount: String(correcting.pph21WithheldAmount),
            bpjsContributionAmount: String(correcting.bpjsContributionAmount),
          }
        : EMPTY_DRAFT,
    );
  }, [open, correcting]);

  const set = (key: keyof ImportDraft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const ready =
    draft.employeeId &&
    draft.monthYear &&
    draft.grossTaxableIncomeAmount &&
    draft.pph21WithheldAmount &&
    draft.bpjsContributionAmount;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={correcting ? 'Correct payroll history import' : 'Submit payroll history import'}
      description={
        correcting
          ? 'Koreksi menulis baris baru dan menonaktifkan baris lama. Harus diajukan maker yang berbeda dari pengimpor asal.'
          : `Ringkasan bulanan dari sistem lama untuk bulan sebelum periode gaji pertama${firstMonth ? ` (${firstMonth})` : ''}.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || submit.isPending}
            onClick={() => submit.mutate({ actor, draft }, { onSuccess: onClose })}
          >
            {submit.isPending ? 'Saving…' : correcting ? 'Submit correction' : 'Submit import'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label>
            Employee<em>*</em>
          </Label>
          <Select value={draft.employeeId} onValueChange={set('employeeId')} disabled={Boolean(correcting)}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMPLOYEES).map(([id, employee]) => (
                <SelectItem key={id} value={id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-month">
            Month<em>*</em>
          </Label>
          <Input
            id="import-month"
            value={draft.monthYear}
            maxLength={7}
            placeholder="YYYY-MM"
            disabled={Boolean(correcting)}
            onChange={(event) => set('monthYear')(event.target.value)}
          />
          <FieldHint>Contoh 2026-05</FieldHint>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-gross">
            Gross taxable income<em>*</em>
          </Label>
          <Input
            id="import-gross"
            inputMode="decimal"
            value={draft.grossTaxableIncomeAmount}
            onChange={(event) => set('grossTaxableIncomeAmount')(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-pph">
            PPh21 withheld<em>*</em>
          </Label>
          <Input
            id="import-pph"
            inputMode="decimal"
            value={draft.pph21WithheldAmount}
            onChange={(event) => set('pph21WithheldAmount')(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-bpjs">
            BPJS contribution<em>*</em>
          </Label>
          <Input
            id="import-bpjs"
            inputMode="decimal"
            value={draft.bpjsContributionAmount}
            onChange={(event) => set('bpjsContributionAmount')(event.target.value)}
          />
          <FieldHint>Ringkasan gabungan, bukan per program.</FieldHint>
        </div>
      </div>
    </Modal>
  );
}

/** B13 — detail + verifikasi impor (checker). */
export function ImportDetailModal({
  actor,
  row,
  onClose,
}: {
  actor: Actor;
  row: HistoryImport | null;
  onClose: () => void;
}) {
  const verify = useVerifyImport();
  const canVerify = Boolean(row) && actor.role === 'ROLE_HR_MANAGER' && !row?.verifiedBy;
  const ownRow = row?.submittedBy === actor.employeeId;

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title={row ? `History import ${row.monthYear}` : ''}
      description={row ? employeeName(row.employeeId) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canVerify && (
            <Button
              disabled={ownRow || verify.isPending}
              title={ownRow ? 'Pemeriksa tidak boleh memverifikasi impornya sendiri' : undefined}
              onClick={() => row && verify.mutate({ actor, id: row.id }, { onSuccess: onClose })}
            >
              {verify.isPending ? 'Verifying…' : 'Verify import'}
            </Button>
          )}
        </>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Employee">{employeeName(row.employeeId)}</KeyValueRow>
          <KeyValueRow label="Month">{row.monthYear}</KeyValueRow>
          <KeyValueRow label="Gross taxable income">
            <Money value={row.grossTaxableIncomeAmount} />
          </KeyValueRow>
          <KeyValueRow label="PPh21 withheld">
            <Money value={row.pph21WithheldAmount} />
          </KeyValueRow>
          <KeyValueRow label="BPJS contribution">
            <Money value={row.bpjsContributionAmount} />
          </KeyValueRow>
          <KeyValueRow label="Source">{row.sourceMarker}</KeyValueRow>
          <KeyValueRow label="Active">{row.isActive ? 'Yes' : 'No — superseded by a correction'}</KeyValueRow>
          <KeyValueRow label="Submitted">
            {employeeName(row.submittedBy)} · {formatDate(row.submittedAt)}
          </KeyValueRow>
          <KeyValueRow label="Verified">
            {row.verifiedBy ? `${employeeName(row.verifiedBy)} · ${formatDate(row.verifiedAt ?? '')}` : 'Not verified yet'}
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}
