import { useEffect, useMemo, useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { Money } from '@/features/cash-advance/components/CashAdvanceBits';
import {
  ClearanceStatusBadge,
  MarkSourceBadge,
  MarkStatusBadge,
  PayableTypeBadge,
  PaymentMethodBadge,
} from '@/features/disbursement/components/DisbursementBits';
import { employeeName, employeeOf } from '@/features/disbursement/mock-data';
import { NOTE_MAX, PAYMENT_METHODS, keyOf } from '@/features/disbursement/rules';
import {
  useDeclareSettled,
  useMarkPaid,
  useMarkPreview,
  usePayableDetail,
  useReverseMark,
} from '@/features/disbursement/hooks/useDisbursement';
import { PAYMENT_METHOD_LABEL } from '@/features/disbursement/types';
import type {
  Actor,
  MarkHistoryEntry,
  OutstandingClearance,
  PayableRow,
  PaymentMethod,
  UnresolvedItem,
} from '@/features/disbursement/types';
import { formatDate, formatDateTime } from '@/lib/format';

function SectionLabel({ children }: { children: string }) {
  return <span className="font-body text-[13px] font-bold text-fg-1">{children}</span>;
}

function NoteField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}
        <em>*</em>
      </Label>
      <Textarea
        id={id}
        rows={3}
        maxLength={NOTE_MAX}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="font-body text-[11px] font-medium text-fg-3">
        {hint} · {value.trim().length}/{NOTE_MAX}
      </span>
    </div>
  );
}

function employeeLine(id: string) {
  const employee = employeeOf(id);
  return employee ? `${employee.name} · ${employee.nik}` : id;
}

/** Detail payable (`GET /disbursements/{id}`) — baca saja, dengan jejak tanda & pembalik. */
export function PayableDetailModal({ actor, row, onClose }: { actor: Actor; row: PayableRow | null; onClose: () => void }) {
  const { data: detail, isLoading } = usePayableDetail(actor, row);

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Payable detail"
      description="Baca saja. Jejak tanda hanya ada setelah baris ditandai; sumber membedakan tanda manusia dari tanda sistem klien."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {row && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Request no.">
              <span className="font-mono text-xs">{row.requestNo}</span>
            </KeyValueRow>
            <KeyValueRow label="Payable type">
              <PayableTypeBadge type={row.payableType} />
            </KeyValueRow>
            <KeyValueRow label="Employee">{employeeLine(row.employeeId)}</KeyValueRow>
            <KeyValueRow label="Amount">
              <Money value={row.amount} />
            </KeyValueRow>
            <KeyValueRow label="Submitted">{formatDate(row.submittedAt)}</KeyValueRow>
            <KeyValueRow label="Mark status">
              <MarkStatusBadge status={row.markStatus} />
            </KeyValueRow>
          </KeyValueList>

          <SectionLabel>Mark history</SectionLabel>
          <DataTable<MarkHistoryEntry>
            rows={detail?.history ?? []}
            rowKey={(mark) => mark.id}
            loading={isLoading}
            empty="Belum ada tanda untuk payable ini."
            columns={[
              {
                key: 'id',
                header: 'Mark ID',
                nowrap: true,
                render: (mark) => (
                  <span className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs">{mark.id}</span>
                    <span className="font-body text-[11px] font-medium text-fg-3">action {mark.actionId}</span>
                  </span>
                ),
              },
              {
                key: 'state',
                header: 'State',
                render: (mark) =>
                  mark.reversalOfMarkId ? (
                    <StatusBadge tone="warn">Reversal</StatusBadge>
                  ) : mark.reversedBy ? (
                    <StatusBadge tone="mute">Reversed</StatusBadge>
                  ) : (
                    <StatusBadge tone="ok">Active</StatusBadge>
                  ),
              },
              { key: 'method', header: 'Method', render: (mark) => <PaymentMethodBadge method={mark.paymentMethod} /> },
              { key: 'source', header: 'Source', render: (mark) => <MarkSourceBadge source={mark.markSource} /> },
              { key: 'at', header: 'Marked At', nowrap: true, muted: true, render: (mark) => formatDateTime(mark.markedAt) },
              {
                key: 'note',
                header: 'Reason Note',
                render: (mark) => mark.reasonNote ?? <span className="text-fg-4">— tanda sistem klien, catatan tidak wajib</span>,
              },
            ]}
          />

          <Note icon={<Info />}>
            <code>actual_paid_at</code> hanya keterangan — tidak diterima endpoint mana pun dan tidak pernah dipakai
            menghitung. Waktu penandaan dan pelaku ditulis server, bukan diketik klien.
          </Note>
        </div>
      )}
    </Modal>
  );
}

/**
 * DP-A3 — preview dulu (`mark-paid/preview`), baris gagal gerbang ditampilkan
 * apa adanya. Yang dikirim hanya baris resolved; server tetap atomik.
 */
export function MarkPaidModal({
  actor,
  rows,
  onClose,
  onMarked,
}: {
  actor: Actor;
  rows: PayableRow[] | null;
  onClose: () => void;
  onMarked: () => void;
}) {
  const items = useMemo(
    () => (rows ?? []).map((row) => ({ payableType: row.payableType, payableId: row.payableId })),
    [rows],
  );
  const { data: preview, isLoading, error } = useMarkPreview(actor, items, items.length > 0);
  const mark = useMarkPaid();
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (rows) {
      setMethod('');
      setNote('');
    }
  }, [rows]);

  const resolved = preview?.resolvedItems ?? [];
  const unresolved = preview?.unresolvedItems ?? [];
  const rowOf = (item: UnresolvedItem) => rows?.find((row) => keyOf(row) === keyOf(item));
  const ready = Boolean(method) && Boolean(note.trim()) && resolved.length > 0 && !mark.isPending;

  return (
    <Modal
      open={items.length > 0}
      onOpenChange={(next) => !next && onClose()}
      title="Mark as paid"
      description="Preview dulu: baris yang gagal gerbang ditampilkan, tidak disembunyikan. Satu metode pembayaran berlaku untuk seluruh tindakan."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready}
            onClick={() =>
              mark.mutate(
                {
                  actor,
                  input: {
                    items: resolved.map((row) => ({ payableType: row.payableType, payableId: row.payableId })),
                    paymentMethod: method,
                    reasonNote: note,
                  },
                },
                {
                  onSuccess: () => {
                    onMarked();
                    onClose();
                  },
                },
              )
            }
          >
            {mark.isPending ? 'Menandai…' : 'Confirm mark as paid'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <Note tone="danger" icon={<TriangleAlert />}>
            {error.message}
          </Note>
        )}

        <KeyValueList>
          <KeyValueRow label="Rows selected">{items.length}</KeyValueRow>
          <KeyValueRow label="Resolved">
            {isLoading ? '…' : `${preview?.totalCount ?? 0} · `}
            {!isLoading && <Money value={preview?.totalAmount ?? 0} />}
          </KeyValueRow>
          <KeyValueRow label="Unresolved">{isLoading ? '…' : unresolved.length}</KeyValueRow>
        </KeyValueList>

        <SectionLabel>Resolved rows</SectionLabel>
        <DataTable<PayableRow>
          rows={resolved}
          rowKey={(row) => keyOf(row)}
          loading={isLoading}
          empty="Setiap baris terpilih gagal gerbang — tidak ada yang bisa ditandai."
          columns={[
            { key: 'type', header: 'Type', render: (row) => <PayableTypeBadge type={row.payableType} /> },
            { key: 'no', header: 'Request No.', nowrap: true, render: (row) => <span className="font-mono text-xs">{row.requestNo}</span> },
            { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
            { key: 'amount', header: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
          ]}
        />

        {unresolved.length > 0 && (
          <>
            <SectionLabel>Unresolved rows — shown, not hidden</SectionLabel>
            <DataTable<UnresolvedItem>
              rows={unresolved}
              rowKey={(item) => keyOf(item)}
              columns={[
                {
                  key: 'no',
                  header: 'Request No.',
                  nowrap: true,
                  render: (item) => <span className="font-mono text-xs">{rowOf(item)?.requestNo ?? item.payableId}</span>,
                },
                { key: 'employee', header: 'Employee', render: (item) => employeeName(rowOf(item)?.employeeId) },
                { key: 'amount', header: 'Amount', align: 'right', render: (item) => <Money value={rowOf(item)?.amount ?? null} /> },
                {
                  key: 'gate',
                  header: 'Blocking Gate',
                  render: (item) => <StatusBadge tone="err">{item.rejectReason}</StatusBadge>,
                },
              ]}
            />
            <Note tone="warn" icon={<TriangleAlert />}>
              Baris gagal gerbang tidak ikut dikirim. Mark-paid satu transaksi atomik — satu baris gagal di server berarti
              tidak ada yang ditandai.
            </Note>
          </>
        )}

        <div className="flex flex-col gap-1">
          <Label>
            Payment method<em>*</em>
          </Label>
          <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((value) => (
                <SelectItem key={value} value={value}>
                  {PAYMENT_METHOD_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-body text-[11px] font-medium text-fg-3">
            Satu nilai untuk semua baris — metode berbeda wajib dipecah jadi dua tindakan. With payroll hanya sah untuk
            pinjaman yang potongannya sudah dikonfirmasi payroll; selain itu 422 FIN_PAYROLL_CONFIRMATION_REQUIRED.
          </span>
        </div>

        <NoteField
          id="mark-note"
          label="Reason note"
          value={note}
          onChange={setNote}
          placeholder="Transfer batch 13 Jul 2026"
          hint="Selalu wajib — pintu ini selalu mencatat tanda manual"
        />
      </div>
    </Modal>
  );
}

/** Reverse (UIC §6.2 op 5) — koreksi, bukan pembayaran. */
export function ReverseMarkModal({ actor, row, onClose }: { actor: Actor; row: PayableRow | null; onClose: () => void }) {
  const reverse = useReverseMark();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (row) setNote('');
  }, [row]);

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Reverse mark"
      description="Koreksi, bukan pembayaran: baris pembalik mewarisi payable type dan payable id dari tanda yang dibalik."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!note.trim() || reverse.isPending}
            onClick={() =>
              row?.mark &&
              reverse.mutate(
                { actor, markId: row.mark.disbursementMarkId, requestNo: row.requestNo, reasonNote: note },
                { onSuccess: onClose },
              )
            }
          >
            {reverse.isPending ? 'Membalik…' : 'Reverse mark'}
          </Button>
        </>
      }
    >
      {row?.mark && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Request no.">
              <span className="font-mono text-xs">{row.requestNo}</span>
            </KeyValueRow>
            <KeyValueRow label="Payable type">
              <PayableTypeBadge type={row.payableType} />
            </KeyValueRow>
            <KeyValueRow label="Amount">
              <Money value={row.amount} />
            </KeyValueRow>
            <KeyValueRow label="Mark ID">
              <span className="font-mono text-xs">{row.mark.disbursementMarkId}</span>
            </KeyValueRow>
            <KeyValueRow label="Method">
              <PaymentMethodBadge method={row.mark.paymentMethod} />
            </KeyValueRow>
          </KeyValueList>
          <NoteField
            id="reverse-note"
            label="Reason note"
            value={note}
            onChange={setNote}
            placeholder="Koreksi cara pembayaran, salah pilih tunai"
            hint="Wajib — pembalikan kedua atas tanda yang sama ditolak 409"
          />
        </div>
      )}
    </Modal>
  );
}

export function ClearanceDetailModal({ clearance, onClose }: { clearance: OutstandingClearance | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(clearance)}
      onOpenChange={(next) => !next && onClose()}
      title="Clearance detail"
      description="Baca saja. Nominal adalah snapshot saat peristiwa keluar diterima, bukan saldo hidup."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {clearance && (
        <KeyValueList>
          <KeyValueRow label="Clearance ID">
            <span className="font-mono text-xs">{clearance.id}</span>
          </KeyValueRow>
          <KeyValueRow label="Employee">{employeeLine(clearance.employeeId)}</KeyValueRow>
          <KeyValueRow label="Outstanding amount">
            <Money value={clearance.outstandingAmount} />
          </KeyValueRow>
          <KeyValueRow label="Status">
            <ClearanceStatusBadge status={clearance.status} />
          </KeyValueRow>
          <KeyValueRow label="Recorded">{formatDate(clearance.createdAt)}</KeyValueRow>
          <KeyValueRow label="Resolved">
            {clearance.resolvedAt ? `${formatDate(clearance.resolvedAt)} · ${clearance.resolvedAtTimezone}` : '—'}
          </KeyValueRow>
          <KeyValueRow label="Settlement note">
            {clearance.settledReasonNote ??
              (clearance.status === 'CLEARED_BY_REPAYMENT' ? '— tetap kosong: dituntaskan proses pengamat, bukan manusia' : '—')}
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

/** DP-B3 — pernyataan tuntas tanpa pelunasan nyata. */
export function DeclareSettledModal({
  actor,
  clearance,
  onClose,
}: {
  actor: Actor;
  clearance: OutstandingClearance | null;
  onClose: () => void;
}) {
  const declare = useDeclareSettled();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (clearance) setNote('');
  }, [clearance]);

  return (
    <Modal
      open={Boolean(clearance)}
      onOpenChange={(next) => !next && onClose()}
      title="Declare settled"
      description="Pernyataan manusia bahwa sisa tanggungan tidak ditagih lebih lanjut. Status terminal — tidak ada jalan kembali ke Outstanding."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!note.trim() || declare.isPending}
            onClick={() =>
              clearance &&
              declare.mutate(
                { actor, id: clearance.id, employee: employeeName(clearance.employeeId), note },
                { onSuccess: onClose },
              )
            }
          >
            {declare.isPending ? 'Menyimpan…' : 'Confirm declare settled'}
          </Button>
        </>
      }
    >
      {clearance && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Employee">{employeeLine(clearance.employeeId)}</KeyValueRow>
            <KeyValueRow label="Outstanding">
              <Money value={clearance.outstandingAmount} />
            </KeyValueRow>
            <KeyValueRow label="Status">
              <ClearanceStatusBadge status={clearance.status} />
            </KeyValueRow>
          </KeyValueList>
          <NoteField
            id="settle-note"
            label="Settlement note"
            value={note}
            onChange={setNote}
            placeholder="Dihapusbukukan, nominal di bawah ambang penagihan"
            hint="Selalu wajib. Baris yang sudah diresolusi sesi lain ditolak 409 FIN_OUTSTANDING_ALREADY_RESOLVED"
          />
        </div>
      )}
    </Modal>
  );
}
