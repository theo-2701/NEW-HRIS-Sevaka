import { useEffect, useState } from 'react';
import { Clock, Info, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { DataTable } from '@/components/DataTable';
import { AddButton, RemoveRowButton } from '@/components/RowActions';
import { RadioBranch } from '@/components/RadioBranch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import {
  ItemStatusBadge,
  Money,
  SettlementStatusBadge,
  StageBadge,
} from '@/features/cash-advance/components/CashAdvanceBits';
import { REJECTION_REASONS, employeeOf } from '@/features/cash-advance/mock-data';
import { differenceOf, parseAmount, thousands, unflaggedTotal } from '@/features/cash-advance/rules';
import {
  useDecideSettlement,
  useReviewSettlement,
  useSetSurplusMethod,
  useSubmitSettlement,
} from '@/features/cash-advance/hooks/useCashAdvance';
import { SETTLEMENT_METHOD_LABEL } from '@/features/cash-advance/types';
import type {
  Actor,
  CashAdvance,
  Difference,
  SettlementItem,
  SettlementItemDraft,
  SettlementMethod,
  SettlementView,
} from '@/features/cash-advance/types';
import { formatCurrency, formatDate } from '@/lib/format';

const BLANK_ITEM: SettlementItemDraft = { expenseDate: '', amount: '', receiptNo: '', documentName: '' };

function projection(advanceAmount: number, total: number, isFinalStage: boolean): string {
  if (!isFinalStage) return 'Tidak dihitung — tahap parsial';
  const diff = differenceOf(advanceAmount, total);
  return diff ? `${diff.type} ${formatCurrency(diff.amount)}` : 'Tanpa selisih';
}

/**
 * Serahkan pertanggungjawaban (CA-B0 — frame tambahan, lihat
 * FINANCE-GAP-NOTES: 5.9 berkontrak penuh tapi tidak punya frame di FSD).
 */
export function SettlementFormModal({
  advance,
  actor,
  onClose,
}: {
  advance: CashAdvance | null;
  actor: Actor;
  onClose: () => void;
}) {
  const submit = useSubmitSettlement();
  const [isFinalStage, setFinalStage] = useState(true);
  const [items, setItems] = useState<SettlementItemDraft[]>([{ ...BLANK_ITEM }]);

  useEffect(() => {
    if (advance) {
      setFinalStage(true);
      setItems([{ ...BLANK_ITEM }]);
    }
  }, [advance]);

  const patchItem = (index: number, patch: Partial<SettlementItemDraft>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const total = items.reduce((sum, item) => sum + parseAmount(item.amount), 0);
  const ready = items.length > 0 && items.every((item) => item.expenseDate && parseAmount(item.amount) > 0 && item.documentName.trim());

  return (
    <Modal
      open={Boolean(advance)}
      onOpenChange={(next) => !next && onClose()}
      title={advance ? `Submit settlement — ${advance.requestNo}` : ''}
      description="Nomor nota unik lintas modul finance; bentrok ditolak 409 FIN_DUPLICATE_RECEIPT."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || submit.isPending}
            onClick={() => advance && submit.mutate({ actor, advanceId: advance.id, draft: { isFinalStage, items } }, { onSuccess: onClose })}
          >
            {submit.isPending ? 'Mengirim…' : 'Submit settlement'}
          </Button>
        </>
      }
    >
      {advance && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Recipient">{employeeOf(advance.recipientEmployeeId)?.name ?? '—'}</KeyValueRow>
            <KeyValueRow label="Purpose">{advance.purposeTypeName}</KeyValueRow>
            <KeyValueRow label="Advance amount">{formatCurrency(advance.amount)}</KeyValueRow>
            <KeyValueRow label="Travel dates">
              {advance.travelStartDate ? `${formatDate(advance.travelStartDate)} – ${formatDate(advance.travelEndDate)}` : 'Bukan jenis dinas'}
            </KeyValueRow>
          </KeyValueList>

          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-[10px] border border-border-1 bg-cloud p-4">
              <div className="flex items-center justify-between">
                <span className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-fg-3">Receipt {index + 1}</span>
                {index > 0 && <RemoveRowButton onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} />}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label>
                    Expense date<em>*</em>
                  </Label>
                  <DatePicker value={item.expenseDate} onChange={(expenseDate) => patchItem(index, { expenseDate })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>
                    Amount<em>*</em>
                  </Label>
                  <Input inputMode="numeric" placeholder="0" value={item.amount} onChange={(event) => patchItem(index, { amount: thousands(event.target.value) })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Receipt no.</Label>
                  <Input maxLength={30} placeholder="HTL-CIWALK/2026/0098" value={item.receiptNo} onChange={(event) => patchItem(index, { receiptNo: event.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>
                    Attachment<em>*</em>
                  </Label>
                  <Input placeholder="nota.pdf" value={item.documentName} onChange={(event) => patchItem(index, { documentName: event.target.value })} />
                </div>
              </div>
            </div>
          ))}

          <div>
            <AddButton onClick={() => setItems((prev) => [...prev, { ...BLANK_ITEM }])}>Add receipt</AddButton>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Stage</Label>
            <RadioBranch<'FINAL' | 'PARTIAL'>
              name="stage"
              value={isFinalStage ? 'FINAL' : 'PARTIAL'}
              onChange={(value) => setFinalStage(value === 'FINAL')}
              options={[
                { value: 'FINAL', title: 'Closing stage', description: 'is_final_stage — selisih dihitung setelah atasan menerima.' },
                { value: 'PARTIAL', title: 'Partial stage', description: 'Nota susulan menyusul di tahap berikutnya; tanpa hitung selisih.' },
              ]}
            />
          </div>

          <KeyValueList>
            <KeyValueRow label="Receipts entered">
              {formatCurrency(total)} · {items.length} nota
            </KeyValueRow>
            <KeyValueRow label="Projected difference">{projection(advance.amount, total, isFinalStage)}</KeyValueRow>
          </KeyValueList>

          <Note icon={<Info />}>
            Setiap lampiran diperiksa keberadaannya di document-service <strong>sebelum</strong> transaksi domain dimulai,
            dan pengiriman membawa Idempotency-Key.
          </Note>
        </div>
      )}
    </Modal>
  );
}

function ItemsTable({
  settlement,
  flags,
  onToggle,
}: {
  settlement: SettlementView;
  flags?: Record<string, boolean>;
  onToggle?: (itemId: string, next: boolean) => void;
}) {
  const decided = settlement.status === 'ACCEPTED' || settlement.status === 'REJECTED';
  return (
    <DataTable<SettlementItem>
      rows={settlement.items}
      rowKey={(row) => row.id}
      columns={[
        ...(onToggle
          ? [
              {
                key: 'flag',
                header: 'Flag',
                align: 'center' as const,
                render: (row: SettlementItem) => (
                  <Checkbox checked={Boolean(flags?.[row.id])} onCheckedChange={(next) => onToggle(row.id, next === true)} />
                ),
              },
            ]
          : []),
        { key: 'date', header: 'Expense Date', nowrap: true, render: (row) => formatDate(row.expenseDate) },
        {
          key: 'no',
          header: 'Receipt No.',
          render: (row) => <span className="font-mono text-xs">{row.receiptNo || '—'}</span>,
        },
        { key: 'amount', header: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
        { key: 'status', header: 'Item Status', render: (row) => <ItemStatusBadge item={row} decided={decided} /> },
      ]}
    />
  );
}

/** CA-B2 — petugas keuangan menandai nota; penandaan, bukan keputusan (5.11). */
export function ReviewModal({ settlement, actor, onClose }: { settlement: SettlementView | null; actor: Actor; onClose: () => void }) {
  const review = useReviewSettlement();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [reasonId, setReasonId] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (settlement) {
      setFlags({});
      setReasonId('');
      setAcknowledged(false);
    }
  }, [settlement]);

  const flagged = Object.keys(flags).filter((key) => flags[key]);
  const warnings = settlement?.similarityWarnings ?? [];
  const ready = (!flagged.length || Boolean(reasonId)) && (!warnings.length || acknowledged);

  return (
    <Modal
      open={Boolean(settlement)}
      onOpenChange={(next) => !next && onClose()}
      title={settlement ? `Review receipts — ${settlement.settlementNo}` : ''}
      description="Menandai bukan memutus. Tanpa tanda sama sekali berarti seluruh nota dianggap sah."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || review.isPending}
            onClick={() =>
              settlement &&
              review.mutate(
                {
                  actor,
                  id: settlement.id,
                  settlementNo: settlement.settlementNo,
                  input: { flags: flagged.map((itemId) => ({ itemId, reasonId })), similarityAcknowledged: acknowledged },
                },
                { onSuccess: onClose },
              )
            }
          >
            Forward to decision
          </Button>
        </>
      }
    >
      {settlement && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Recipient">{employeeOf(settlement.recipientEmployeeId)?.name ?? '—'}</KeyValueRow>
            <KeyValueRow label="Advance amount">{formatCurrency(settlement.advanceAmount)}</KeyValueRow>
            <KeyValueRow label="Stage">
              <StageBadge isFinalStage={settlement.isFinalStage} isCorrection={settlement.isCorrection} />
            </KeyValueRow>
          </KeyValueList>

          {warnings.length > 0 && (
            <Note tone="warn" icon={<TriangleAlert />}>
              <strong>Similarity warning.</strong>{' '}
              {warnings.map((row) => (
                <span key={row.itemId}>
                  Nota {formatDate(row.matchedDate)} sebesar {formatCurrency(row.matchedAmount)} sama tanggal dan nominal dengan
                  nota lain bernomor beda atau kosong.{' '}
                </span>
              ))}
            </Note>
          )}

          <ItemsTable settlement={settlement} flags={flags} onToggle={(itemId, next) => setFlags((prev) => ({ ...prev, [itemId]: next }))} />

          {flagged.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label>
                Flag reason<em>*</em>
              </Label>
              <Select value={reasonId} onValueChange={setReasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.filter((row) => row.isActive).map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {warnings.length > 0 && (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={acknowledged} onCheckedChange={(next) => setAcknowledged(next === true)} />
              <span className="font-body text-[13px] font-medium leading-[1.5] text-fg-2">
                Saya sudah membaca peringatan kemiripan dan tetap meneruskan tahap ini (similarity_warning_acknowledged).
              </span>
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}

/** CA-B3 — atasan langsung penerima memutus (5.12, 202). Baca-saja di luar UNDER_REVIEW. */
export function DecisionModal({ settlement, actor, onClose }: { settlement: SettlementView | null; actor: Actor; onClose: () => void }) {
  const decide = useDecideSettlement();
  const decidable = settlement?.status === 'UNDER_REVIEW';
  const counted = settlement ? unflaggedTotal(settlement) : 0;

  return (
    <Modal
      open={Boolean(settlement)}
      onOpenChange={(next) => !next && onClose()}
      title={settlement ? `Settlement — ${settlement.settlementNo}` : ''}
      description="Hanya atasan langsung penerima yang memutus. Kedua cabang kembali 202 — status final dan selisih ditulis setelah prosesnya selesai."
      size="wide"
      footer={
        decidable && settlement ? (
          <>
            <Button
              variant="secondary"
              disabled={decide.isPending}
              onClick={() => decide.mutate({ actor, id: settlement.id, decision: 'REJECT', settlementNo: settlement.settlementNo }, { onSuccess: onClose })}
            >
              Reject
            </Button>
            <Button
              disabled={decide.isPending}
              onClick={() => decide.mutate({ actor, id: settlement.id, decision: 'APPROVE', settlementNo: settlement.settlementNo }, { onSuccess: onClose })}
            >
              Accept settlement
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {settlement && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Recipient">{employeeOf(settlement.recipientEmployeeId)?.name ?? '—'}</KeyValueRow>
            <KeyValueRow label="Advance received">{formatCurrency(settlement.advanceAmount)}</KeyValueRow>
            <KeyValueRow label="Receipts counted">{formatCurrency(counted)} (nota tak bertanda)</KeyValueRow>
            <KeyValueRow label="Projected difference">
              {projection(settlement.advanceAmount, counted, settlement.isFinalStage)}
            </KeyValueRow>
            <KeyValueRow label="Status">
              <SettlementStatusBadge status={settlement.status} />
            </KeyValueRow>
          </KeyValueList>

          <ItemsTable settlement={settlement} />

          <Note icon={<Clock />}>
            {decidable ? (
              <>
                <strong>Keputusan ≠ penulisan status.</strong> Endpoint kembali 202; status final ditulis saat
                workflow.process.completed dikonsumsi.
              </>
            ) : settlement.status === 'SUBMITTED' ? (
              <>
                <strong>Tahap 1 belum selesai.</strong> Nota belum ditandai Finance Officer — keputusan butuh UNDER_REVIEW.
              </>
            ) : (
              <>
                <strong>Sudah diputus.</strong> Keputusan kedua atas tahap yang sama ditolak 409 FIN_ALREADY_DECIDED.
              </>
            )}
          </Note>
        </div>
      )}
    </Modal>
  );
}

/** 5.14 — cara pengembalian sisa, khusus SURPLUS. */
export function SurplusMethodModal({ difference, actor, onClose }: { difference: Difference | null; actor: Actor; onClose: () => void }) {
  const save = useSetSurplusMethod();
  const [method, setMethod] = useState<SettlementMethod>('RETURNED_OUTSIDE_HRIS');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (difference) {
      setMethod('RETURNED_OUTSIDE_HRIS');
      setNote('');
    }
  }, [difference]);

  const ready = method === 'PAYROLL_DEDUCTION' || note.trim().length > 0;

  return (
    <Modal
      open={Boolean(difference)}
      onOpenChange={(next) => !next && onClose()}
      title="Surplus return method"
      description="Khusus SURPLUS — kekurangan diselesaikan lewat Pencairan & Piutang."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || save.isPending}
            onClick={() =>
              difference &&
              save.mutate({ actor, id: difference.id, method, reasonNote: note, requestNo: difference.requestNo }, { onSuccess: onClose })
            }
          >
            Save method
          </Button>
        </>
      }
    >
      {difference && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Request no.">{difference.requestNo}</KeyValueRow>
            <KeyValueRow label="Surplus">{formatCurrency(difference.amount)}</KeyValueRow>
            <KeyValueRow label="Due date">{formatDate(difference.dueDate)}</KeyValueRow>
          </KeyValueList>

          <RadioBranch<SettlementMethod>
            name="method"
            value={method}
            onChange={setMethod}
            options={[
              {
                value: 'RETURNED_OUTSIDE_HRIS',
                title: SETTLEMENT_METHOD_LABEL.RETURNED_OUTSIDE_HRIS,
                description: 'Fakta yang dilaporkan, bukan bukti — langsung tuntas setelah ditandai.',
              },
              {
                value: 'PAYROLL_DEDUCTION',
                title: SETTLEMENT_METHOD_LABEL.PAYROLL_DEDUCTION,
                description: 'Tuntas setelah payroll mengonfirmasi potongannya.',
              },
            ]}
          />

          {method === 'RETURNED_OUTSIDE_HRIS' && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="methodNote">
                Note<em>*</em>
              </Label>
              <Textarea id="methodNote" rows={3} value={note} placeholder="Input text here" onChange={(event) => setNote(event.target.value)} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
