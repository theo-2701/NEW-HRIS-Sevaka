import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { FindingTypeTag, PeriodStatusBadge } from '@/features/salary-processing/components/ProcessingBits';
import { useFindings } from '@/features/salary-processing/hooks/useSalaryProcessing';
import { employeeName } from '@/features/salary-processing/mock-data';
import { periodLabel, periodName } from '@/features/salary-processing/rules';
import type { Finding, PayrollPeriod } from '@/features/salary-processing/types';
import { COMPONENT_NAME } from '@/features/payroll-authorization/mock-data';
import {
  blockingFindings,
  canApproveBatch,
  lockGates,
  lockMakerCheckerOk,
  batchTotalDelta,
} from '@/features/payroll-authorization/rules';
import {
  useApproveBatch,
  useApproveProposal,
  useApproveTrait,
  useAuthorizeHandover,
  useLockPeriod,
  useRejectBatch,
  useRejectProposal,
  useRejectTrait,
  useReopenPeriod,
  useRequestReexport,
} from '@/features/payroll-authorization/hooks/usePayrollAuthorization';
import type {
  Actor,
  BatchItem,
  ChangeBatch,
  IndividualProposal,
  SalaryComponent,
} from '@/features/payroll-authorization/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

function CheckRow({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full [&_svg]:size-3.5',
          ok ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-700',
        )}
      >
        {ok ? <Check /> : <X />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-body text-[13px] font-semibold text-fg-1">{label}</span>
        {hint && <span className="font-body text-xs font-medium text-fg-3">{hint}</span>}
      </span>
    </li>
  );
}

/** C4 — kunci periode; daftar periksa hanya pratinjau, server memutuskan ulang saat submit. */
export function LockPeriodModal({
  actor,
  period,
  onClose,
}: {
  actor: Actor;
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const lock = useLockPeriod();
  const makerOk = period ? lockMakerCheckerOk(period, actor) : false;

  return (
    <Modal
      open={Boolean(period)}
      onOpenChange={(next) => !next && onClose()}
      title="Lock period"
      description="Mengunci membekukan angka periode ini. Setelah terkunci, perhitungan ulang hanya mungkin setelah dibuka kembali."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!makerOk || lock.isPending}
            onClick={() => period && lock.mutate({ actor, id: period.id }, { onSuccess: onClose })}
          >
            {lock.isPending ? 'Locking…' : 'Lock period'}
          </Button>
        </>
      }
    >
      {period && (
        <>
          <KeyValueList>
            <KeyValueRow label="Period">
              {periodLabel(period)} · {periodName(period)}
            </KeyValueRow>
            <KeyValueRow label="Calculated by">
              {employeeName(period.calculated.employeeId)} · {formatDate(period.calculated.at)}
            </KeyValueRow>
          </KeyValueList>

          <ul className="m-0 flex list-none flex-col gap-2.5 rounded-lg border border-border-1 bg-mist p-4">
            <CheckRow ok={period.status === 'REVIEWED'} label="Status sudah Reviewed" />
            <CheckRow
              ok={makerOk}
              label="Pengunci berbeda dari penghitung"
              hint={makerOk ? undefined : 'Anda menjalankan perhitungan periode ini, jadi tidak boleh menguncinya.'}
            />
            {lockGates(period).map((gate) => (
              <CheckRow
                key={gate.key}
                ok={gate.passed}
                label={gate.label}
                hint={
                  gate.key === 'param'
                    ? 'Sepuluh parameter periode sudah dibekukan.'
                    : gate.passed
                      ? undefined
                      : 'Ditarik dan diperiksa tepat saat penguncian.'
                }
              />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

/** C5 — buka kembali; alasan wajib dan hanya pemegang kunci baris ini yang boleh. */
export function ReopenPeriodModal({
  actor,
  period,
  onClose,
}: {
  actor: Actor;
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const reopen = useReopenPeriod();
  const [targetStatus, setTargetStatus] = useState<'REVIEWED' | 'CALCULATED' | ''>('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!period) return;
    setTargetStatus('REVIEWED');
    setReason('');
  }, [period]);

  const ready = targetStatus !== '' && reason.trim().length >= 10;

  return (
    <Modal
      open={Boolean(period)}
      onOpenChange={(next) => !next && onClose()}
      title="Reopen period"
      description="Membuka kembali mengembalikan periode ke status sebelumnya supaya angkanya bisa dikoreksi. Alasannya tercatat di riwayat status."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || reopen.isPending}
            onClick={() =>
              period &&
              reopen.mutate({ actor, id: period.id, input: { targetStatus, reason } }, { onSuccess: onClose })
            }
          >
            {reopen.isPending ? 'Reopening…' : 'Reopen period'}
          </Button>
        </>
      }
    >
      {period && (
        <>
          <KeyValueList>
            <KeyValueRow label="Period">
              {periodLabel(period)} · {periodName(period)}
            </KeyValueRow>
            <KeyValueRow label="Locked by">
              {employeeName(period.locked?.employeeId ?? null)} ·{' '}
              {period.locked ? formatDateTime(period.locked.at) : '—'}
            </KeyValueRow>
          </KeyValueList>

          <div className="flex flex-col gap-1">
            <Label>
              Target status<em>*</em>
            </Label>
            <Select value={targetStatus} onValueChange={(value) => setTargetStatus(value as 'REVIEWED' | 'CALCULATED')}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REVIEWED">Reviewed — cukup ditinjau ulang</SelectItem>
                <SelectItem value="CALCULATED">Calculated — perlu dihitung ulang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="reopen-reason">
              Reason<em>*</em>
            </Label>
            <Textarea
              id="reopen-reason"
              rows={3}
              maxLength={2000}
              value={reason}
              placeholder="Mis. ada fakta lembur susulan sebelum cutoff yang perlu dikoreksi"
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="font-body text-[11px] font-medium text-fg-3">Minimal 10 karakter.</span>
          </div>
        </>
      )}
    </Modal>
  );
}

/** C6 — otorisasi penyerahan; temuan terbuka bersubjek karyawan menahan tombolnya. */
export function AuthorizeHandoverModal({
  actor,
  period,
  onClose,
}: {
  actor: Actor;
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const authorize = useAuthorizeHandover();
  const findings = useFindings(period?.id ?? null, { finalStates: ['OPEN'] });
  const blocking = blockingFindings(findings.data ?? []);

  return (
    <Modal
      open={Boolean(period)}
      onOpenChange={(next) => !next && onClose()}
      title="Authorize handover"
      description="Menyerahkan periode bersifat permanen. Angkanya disiapkan untuk diambil sistem klien — pembayarannya sendiri tidak dilakukan di sini."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={blocking.length > 0 || findings.isLoading || authorize.isPending}
            onClick={() => period && authorize.mutate({ actor, id: period.id }, { onSuccess: onClose })}
          >
            {authorize.isPending ? 'Authorizing…' : 'Authorize handover'}
          </Button>
        </>
      }
    >
      {period && (
        <>
          <KeyValueList>
            <KeyValueRow label="Period">
              {periodLabel(period)} · {periodName(period)}
            </KeyValueRow>
            <KeyValueRow label="Status">
              <PeriodStatusBadge status={period.status} />
            </KeyValueRow>
            <KeyValueRow label="Open findings">
              {findings.isLoading ? '…' : blocking.length === 0 ? 'Tidak ada yang menahan' : `${blocking.length} menahan`}
            </KeyValueRow>
          </KeyValueList>

          <DataTable<Finding>
            rows={blocking}
            rowKey={(row) => row.id}
            loading={findings.isLoading}
            empty="Tidak ada temuan terbuka bersubjek karyawan — periode siap diserahkan."
            columns={[
              { key: 'id', header: 'ID', strong: true, nowrap: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: 'type', header: 'Finding Type', render: (row) => <FindingTypeTag type={row.findingType} /> },
              { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
            ]}
          />

          <span className="font-body text-xs font-medium text-fg-3">
            Temuan bersubjek periode seperti <span className="font-mono">PERIOD_NOT_PICKED_UP</span> tidak ikut menahan,
            karena subjeknya periode dan bukan karyawan.
          </span>
        </>
      )}
    </Modal>
  );
}

/** D2/D3 — keputusan usulan sifat komponen. Menolak tidak memakai field alasan. */
export function TraitDecisionModal({
  actor,
  component,
  onClose,
}: {
  actor: Actor;
  component: SalaryComponent | null;
  onClose: () => void;
}) {
  const approve = useApproveTrait();
  const reject = useRejectTrait();
  const busy = approve.isPending || reject.isPending;

  return (
    <Modal
      open={Boolean(component)}
      onOpenChange={(next) => !next && onClose()}
      title="Decide trait proposal"
      description="Menyetujui hanya mencatat keputusan; sifat barunya dipakai mulai tanggal berlaku. Menolak mengembalikan komponen ke sifat aktifnya."
      footer={
        <>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => component && reject.mutate({ actor, id: component.id }, { onSuccess: onClose })}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button
            disabled={busy}
            onClick={() => component && approve.mutate({ actor, id: component.id }, { onSuccess: onClose })}
          >
            {approve.isPending ? 'Approving…' : 'Approve'}
          </Button>
        </>
      }
    >
      {component && (
        <KeyValueList>
          <KeyValueRow label="Component">
            {component.componentCode} · {component.name}
          </KeyValueRow>
          <KeyValueRow label="Proposed change">
            Dasar lembur: {component.isOvertimeBasis ? 'Ya' : 'Tidak'} →{' '}
            <strong>{component.proposedIsOvertimeBasis ? 'Ya' : 'Tidak'}</strong>
          </KeyValueRow>
          <KeyValueRow label="Effective from">
            {component.proposedEffectiveFrom ? formatDate(component.proposedEffectiveFrom) : '—'}
          </KeyValueRow>
          <KeyValueRow label="Proposed by">
            {employeeName(component.proposedBy)} · {component.proposedAt ? formatDate(component.proposedAt) : '—'}
          </KeyValueRow>
          <KeyValueRow label="Used by">{component.usedByEmployees} karyawan</KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

/** D5 — keputusan usulan nilai individual; menolak wajib beralasan. */
export function ProposalDecisionModal({
  actor,
  proposal,
  onClose,
}: {
  actor: Actor;
  proposal: IndividualProposal | null;
  onClose: () => void;
}) {
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const [reason, setReason] = useState('');
  const busy = approve.isPending || reject.isPending;

  useEffect(() => {
    if (proposal) setReason('');
  }, [proposal]);

  return (
    <Modal
      open={Boolean(proposal)}
      onOpenChange={(next) => !next && onClose()}
      title="Decide salary proposal"
      description="Menyetujui menutup nilai lama dan memberlakukan nilai baru pada tanggal berlakunya."
      footer={
        <>
          <Button
            variant="secondary"
            disabled={busy || !reason.trim()}
            title={reason.trim() ? undefined : 'Alasan wajib diisi untuk menolak'}
            onClick={() => proposal && reject.mutate({ actor, id: proposal.id, reason }, { onSuccess: onClose })}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button
            disabled={busy}
            onClick={() => proposal && approve.mutate({ actor, id: proposal.id }, { onSuccess: onClose })}
          >
            {approve.isPending ? 'Approving…' : 'Approve'}
          </Button>
        </>
      }
    >
      {proposal && (
        <>
          <KeyValueList>
            <KeyValueRow label="Employee">{employeeName(proposal.employeeId)}</KeyValueRow>
            <KeyValueRow label="Component">
              {proposal.salaryComponentId} · {COMPONENT_NAME[proposal.salaryComponentId] ?? '—'}
            </KeyValueRow>
            <KeyValueRow label="Amount">
              {proposal.previousAmount ? `${formatCurrency(proposal.previousAmount)} → ` : ''}
              <strong>{formatCurrency(proposal.amount)}</strong>
            </KeyValueRow>
            <KeyValueRow label="Effective from">{formatDate(proposal.effectiveFrom)}</KeyValueRow>
            <KeyValueRow label="Proposed by">
              {employeeName(proposal.createdBy)} · {formatDate(proposal.createdAt)}
            </KeyValueRow>
          </KeyValueList>

          <div className="flex flex-col gap-1">
            <Label htmlFor="proposal-reason">Rejection reason</Label>
            <Textarea
              id="proposal-reason"
              rows={3}
              value={reason}
              placeholder="Wajib diisi bila menolak usulan ini"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

/** D8 — keputusan kumpulan massal; jalur setuju terkunci bagi selain penyetuju eskalasi. */
export function BatchDecisionModal({
  actor,
  batch,
  onClose,
}: {
  actor: Actor;
  batch: ChangeBatch | null;
  onClose: () => void;
}) {
  const approve = useApproveBatch();
  const reject = useRejectBatch();
  const [reason, setReason] = useState('');
  const busy = approve.isPending || reject.isPending;
  const mayApprove = batch ? canApproveBatch(batch, actor) : false;

  useEffect(() => {
    if (batch) setReason('');
  }, [batch]);

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(next) => !next && onClose()}
      title="Decide bulk salary change"
      description="Kumpulan yang melewati ambang eskalasi hanya bisa disetujui penyetuju eskalasinya. Menolak tetap bisa dilakukan HR Manager."
      size="wide"
      footer={
        <>
          <Button
            variant="secondary"
            disabled={busy || !reason.trim()}
            title={reason.trim() ? undefined : 'Alasan wajib diisi untuk menolak'}
            onClick={() => batch && reject.mutate({ actor, id: batch.id, reason }, { onSuccess: onClose })}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button
            disabled={!mayApprove || busy}
            title={mayApprove ? undefined : 'Kumpulan ini menunggu persetujuan penyetuju eskalasi'}
            onClick={() => batch && approve.mutate({ actor, id: batch.id }, { onSuccess: onClose })}
          >
            {approve.isPending ? 'Approving…' : 'Approve'}
          </Button>
        </>
      }
    >
      {batch && (
        <>
          <KeyValueList>
            <KeyValueRow label="Batch">{batch.batchName}</KeyValueRow>
            <KeyValueRow label="Proposed by">
              {employeeName(batch.createdBy)} · {batch.createdAt ? formatDate(batch.createdAt) : '—'}
            </KeyValueRow>
            <KeyValueRow label="Escalation">
              {batch.requiresEscalation ? (
                <StatusBadge tone="warn">Perlu penyetuju eskalasi</StatusBadge>
              ) : (
                <StatusBadge tone="mute">Tidak perlu</StatusBadge>
              )}
            </KeyValueRow>
            <KeyValueRow label="Affected">{batch.impactSummary?.affectedCount ?? 0} karyawan</KeyValueRow>
            <KeyValueRow label="Net cost shift">
              {formatCurrency(batch.impactSummary?.netCostShiftAmount ?? batchTotalDelta(batch))} / bulan
            </KeyValueRow>
          </KeyValueList>

          <DataTable<BatchItem>
            rows={batch.items}
            rowKey={(row) => `${row.employeeId}-${row.salaryComponentId}`}
            columns={[
              { key: 'employee', header: 'Employee', strong: true, render: (row) => employeeName(row.employeeId) },
              {
                key: 'component',
                header: 'Component',
                render: (row) => `${row.salaryComponentId} · ${COMPONENT_NAME[row.salaryComponentId] ?? '—'}`,
              },
              {
                key: 'delta',
                header: 'Increase',
                align: 'right',
                render: (row) => <span className="tabular-nums">+{formatCurrency(row.amountDelta)}</span>,
              },
            ]}
          />

          <div className="flex flex-col gap-1">
            <Label htmlFor="batch-reason">Rejection reason</Label>
            <Textarea
              id="batch-reason"
              rows={3}
              value={reason}
              placeholder="Wajib diisi bila menolak kumpulan ini"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

/** E4/E5 — ajukan ekspor ulang; tombol mati bila baris jembatannya belum diambil klien. */
export function ReexportModal({
  actor,
  open,
  periods,
  pendingPeriodIds,
  onClose,
}: {
  actor: Actor;
  open: boolean;
  periods: PayrollPeriod[];
  pendingPeriodIds: string[];
  onClose: () => void;
}) {
  const request = useRequestReexport();
  const [periodId, setPeriodId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setPeriodId('');
    setReason('');
  }, [open]);

  const handedOver = periods.filter((row) => row.status === 'HANDED_OVER');
  const stillPending = periodId ? pendingPeriodIds.includes(periodId) : false;
  const ready = Boolean(periodId) && reason.trim().length > 0 && !stillPending;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Request re-export"
      description="Ekspor ulang menyalin kembali baris jembatan periode yang sudah diserahkan — angkanya tidak dihitung ulang."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || request.isPending}
            onClick={() => request.mutate({ actor, periodId, reason }, { onSuccess: onClose })}
          >
            {request.isPending ? 'Submitting…' : 'Request re-export'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <Label>
          Period<em>*</em>
        </Label>
        <Select value={periodId} onValueChange={setPeriodId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih periode yang sudah diserahkan" />
          </SelectTrigger>
          <SelectContent>
            {handedOver.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {periodLabel(row)} · {periodName(row)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="reexport-reason">
          Reason<em>*</em>
        </Label>
        <Textarea
          id="reexport-reason"
          rows={3}
          value={reason}
          placeholder="Mis. klien melaporkan file rusak dan meminta pengiriman ulang"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      {stillPending && (
        <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 font-body text-[13px] font-medium leading-normal text-warning-900">
          Baris jembatan periode ini masih menunggu diambil sistem klien, jadi ekspor ulang belum bisa diajukan.
          Alasan yang Anda tulis tetap tercatat bila tetap dikirim.
        </div>
      )}
    </Modal>
  );
}
