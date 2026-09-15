import { useEffect, useState } from 'react';
import { Info, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/DatePicker';
import { RadioBranch } from '@/components/RadioBranch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { AdvanceStatusBadge } from '@/features/cash-advance/components/CashAdvanceBits';
import { EMPLOYEES, employeeName, employeeOf } from '@/features/cash-advance/mock-data';
import { parseAmount, purposeSelectable, thousands } from '@/features/cash-advance/rules';
import {
  useCancelAdvance,
  useCancelTravel,
  usePurposeTypes,
  useRepudiateAdvance,
  useSubmitAdvance,
} from '@/features/cash-advance/hooks/useCashAdvance';
import type { Actor, AdvanceDraft, CashAdvance, Settlement } from '@/features/cash-advance/types';
import { formatCurrency, formatDate } from '@/lib/format';

type Door = 'SELF' | 'ON_BEHALF';

const BLANK: AdvanceDraft = { recipientEmployeeId: '', purposeTypeId: '', amount: '', travelStartDate: '', travelEndDate: '' };

/**
 * Form ajukan uang muka (CA-A3). Satu form untuk dua pintu — pintu atas nama
 * hanya ditawarkan kepada Finance Officer; server tetap menolak 403 bila
 * dipanggil peran lain.
 */
export function AdvanceFormModal({ open, actor, onClose }: { open: boolean; actor: Actor; onClose: () => void }) {
  const submit = useSubmitAdvance();
  const { data: purposes = [] } = usePurposeTypes();
  const [door, setDoor] = useState<Door>('SELF');
  const [draft, setDraft] = useState<AdvanceDraft>(BLANK);

  useEffect(() => {
    if (open) {
      setDoor('SELF');
      setDraft(BLANK);
    }
  }, [open]);

  const purpose = purposes.find((row) => row.id === draft.purposeTypeId);
  const amount = parseAmount(draft.amount);
  const overMax = Boolean(purpose && purpose.maxAmount !== null && amount > purpose.maxAmount);
  const officer = actor.role === 'ROLE_FINANCE_OFFICER';
  const ready =
    Boolean(purpose) &&
    amount > 0 &&
    !overMax &&
    (door === 'SELF' || Boolean(draft.recipientEmployeeId)) &&
    (!purpose?.isOfficialTravel || (Boolean(draft.travelStartDate) && Boolean(draft.travelEndDate)));

  const patch = (next: Partial<AdvanceDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New cash advance"
      description="Batas nominal jenis keperluan dibekukan ke baris saat dikirim sebagai max_amount_snapshot."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || submit.isPending}
            onClick={() =>
              submit.mutate(
                { actor, draft: { ...draft, recipientEmployeeId: door === 'SELF' ? '' : draft.recipientEmployeeId } },
                { onSuccess: onClose },
              )
            }
          >
            {submit.isPending ? 'Mengirim…' : 'Submit request'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {officer && (
          <div className="flex flex-col gap-1.5">
            <Label>Submission door</Label>
            <RadioBranch<Door>
              name="door"
              value={door}
              onChange={setDoor}
              options={[
                { value: 'SELF', title: 'For myself', description: 'Penerima dan pembuat adalah orang yang sama.' },
                {
                  value: 'ON_BEHALF',
                  title: 'On behalf of an employee',
                  description: 'Pintu kedua — penerima boleh membantah selama belum ditandai cair.',
                },
              ]}
            />
          </div>
        )}

        {door === 'ON_BEHALF' && (
          <div className="flex flex-col gap-1">
            <Label>
              Recipient<em>*</em>
            </Label>
            <Select value={draft.recipientEmployeeId} onValueChange={(recipientEmployeeId) => patch({ recipientEmployeeId })}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEES.filter((row) => row.id !== actor.employeeId).map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name} — {row.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>
              Purpose type<em>*</em>
            </Label>
            <Select
              value={draft.purposeTypeId}
              onValueChange={(purposeTypeId) => patch({ purposeTypeId, travelStartDate: '', travelEndDate: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {purposes
                  .filter((row) => row.isActive)
                  .map((row) => (
                    <SelectItem key={row.id} value={row.id} disabled={!purposeSelectable(row)}>
                      {row.name}
                      {purposeSelectable(row) ? '' : ' — tanpa batas nominal'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <span className="font-body text-xs font-normal text-fg-3">
              Jenis tanpa batas dan tanpa pengakuan tak berbatas tidak bisa dipilih.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="advMax">Maximum limit</Label>
            <Input
              id="advMax"
              disabled
              value={!purpose ? '—' : purpose.maxAmount === null ? 'No maximum (acknowledged)' : formatCurrency(purpose.maxAmount)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="advAmount">
            Amount<em>*</em>
          </Label>
          <Input
            id="advAmount"
            inputMode="numeric"
            placeholder="0"
            value={draft.amount}
            onChange={(event) => patch({ amount: thousands(event.target.value) })}
          />
          <span className="font-body text-xs font-normal text-fg-3">
            {overMax && purpose?.maxAmount !== null && purpose
              ? `422 FIN_CASH_ADVANCE_AMOUNT_EXCEEDED — melewati batas ${formatCurrency(purpose.maxAmount)}.`
              : 'Nominal di atas batas jenis ditolak server.'}
          </span>
        </div>

        {purpose?.isOfficialTravel && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>
                Travel start<em>*</em>
              </Label>
              <DatePicker value={draft.travelStartDate} onChange={(travelStartDate) => patch({ travelStartDate })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>
                Travel end<em>*</em>
              </Label>
              <DatePicker
                value={draft.travelEndDate}
                min={draft.travelStartDate || undefined}
                onChange={(travelEndDate) => patch({ travelEndDate })}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Detail uang muka (CA-A4 / 5.2) — seluruh snapshot dibekukan saat dikirim. */
export function AdvanceDetailModal({
  advance,
  settlements,
  onClose,
}: {
  advance: CashAdvance | null;
  settlements: Settlement[];
  onClose: () => void;
}) {
  const recipient = advance ? employeeOf(advance.recipientEmployeeId) : undefined;
  const stages = advance ? settlements.filter((row) => row.cashAdvanceId === advance.id) : [];

  return (
    <Modal
      open={Boolean(advance)}
      onOpenChange={(next) => !next && onClose()}
      title={advance?.requestNo ?? ''}
      description="Baca saja. Setiap snapshot di bawah dibekukan ke baris saat dikirim."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {advance && (
        <KeyValueList>
          <KeyValueRow label="Status">
            <AdvanceStatusBadge status={advance.status} />
          </KeyValueRow>
          <KeyValueRow label="Recipient">{recipient ? `${recipient.name} · ${recipient.unit}` : '—'}</KeyValueRow>
          <KeyValueRow label="Submission door">
            {advance.createdOnBehalfEmployeeId
              ? `Atas nama — dibuat ${employeeName(advance.createdOnBehalfEmployeeId)}`
              : 'Karyawan sendiri — penerima dan pembuat sama'}
          </KeyValueRow>
          <KeyValueRow label="Purpose type">
            {advance.purposeTypeName}
            {advance.isOfficialTravelSnapshot ? ' · official travel' : ''}
          </KeyValueRow>
          <KeyValueRow label="Amount">{formatCurrency(advance.amount)}</KeyValueRow>
          <KeyValueRow label="Maximum snapshot">
            {advance.maxAmountSnapshot === null ? 'Tanpa batas (diakui)' : formatCurrency(advance.maxAmountSnapshot)}
          </KeyValueRow>
          <KeyValueRow label="Travel dates">
            {advance.travelStartDate
              ? `${formatDate(advance.travelStartDate)} – ${formatDate(advance.travelEndDate)}`
              : 'Bukan jenis dinas'}
          </KeyValueRow>
          {advance.travelCancelledAt && (
            <KeyValueRow label="Travel cancelled">
              {formatDate(advance.travelCancelledAt)} · {advance.travelCancelReason}
            </KeyValueRow>
          )}
          <KeyValueRow label="Bank account">
            {advance.bankAccountSnapshot.bankCode} {advance.bankAccountSnapshot.accountNumber} ·{' '}
            {advance.bankAccountSnapshot.accountHolderName}
          </KeyValueRow>
          <KeyValueRow label="Cost center">
            {advance.costCenterIdSnapshot ?? <span className="font-normal text-fg-3">null (GAP-2)</span>}
          </KeyValueRow>
          <KeyValueRow label="Created">{formatDate(advance.createdAt)}</KeyValueRow>
          <KeyValueRow label="Settlement stages">
            {stages.length
              ? stages.map((row) => `${row.settlementNo} ${row.status}`).join(' · ')
              : 'Belum ada pertanggungjawaban'}
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

export type ExitMode = 'cancel' | 'repudiate' | 'travel';

const EXIT_COPY: Record<ExitMode, { title: string; description: string; confirm: string; reason: 'optional' | 'required' }> = {
  cancel: {
    title: 'Cancel request',
    description: 'Hanya bisa dibatalkan selagi masih SUBMITTED dan belum ada persetujuan yang selesai.',
    confirm: 'Cancel request',
    reason: 'optional',
  },
  repudiate: {
    title: 'Repudiate request',
    description: 'Pernyataan "saya tidak mengajukan ini" atas pengajuan yang dibuatkan orang lain, selama belum ditandai cair.',
    confirm: 'Repudiate',
    reason: 'optional',
  },
  travel: {
    title: 'Cancel travel',
    description: 'Dinas batal setelah disetujui — tanpa gerbang persetujuan. Seluruh nominal menjadi sisa di tahap penutup.',
    confirm: 'Cancel travel',
    reason: 'required',
  },
};

/** Tiga pintu keluar milik pengaju — beda status, beda aktor, beda akibat. */
export function AdvanceExitModal({
  advance,
  mode,
  actor,
  onClose,
}: {
  advance: CashAdvance | null;
  mode: ExitMode;
  actor: Actor;
  onClose: () => void;
}) {
  const cancel = useCancelAdvance();
  const repudiate = useRepudiateAdvance();
  const travel = useCancelTravel();
  const [note, setNote] = useState('');
  const copy = EXIT_COPY[mode];
  const pending = cancel.isPending || repudiate.isPending || travel.isPending;

  useEffect(() => {
    if (advance) setNote('');
  }, [advance]);

  const run = () => {
    if (!advance) return;
    const vars = { actor, id: advance.id, requestNo: advance.requestNo, reasonNote: note };
    if (mode === 'cancel') cancel.mutate(vars, { onSuccess: onClose });
    else if (mode === 'repudiate') repudiate.mutate(vars, { onSuccess: onClose });
    else travel.mutate(vars, { onSuccess: onClose });
  };

  return (
    <Modal
      open={Boolean(advance)}
      onOpenChange={(next) => !next && onClose()}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="danger" disabled={pending || (copy.reason === 'required' && !note.trim())} onClick={run}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      {advance && (
        <div className="flex flex-col gap-4">
          {mode === 'repudiate' ? (
            <Note tone="warn" icon={<ShieldCheck />}>
              Pernyataan ini hanya bisa dikirim dari dalam aplikasi setelah login.
            </Note>
          ) : mode === 'travel' ? (
            <Note tone="warn" icon={<TriangleAlert />}>
              Tenggat pertanggungjawaban berhenti bergantung pada tanggal pulang dan beralih ke tenggat pengembalian sisa.
            </Note>
          ) : (
            <Note icon={<Info />}>Reservasi jatah uang muka terbuka dilepas begitu pembatalan tersimpan.</Note>
          )}

          <KeyValueList>
            <KeyValueRow label="Request no.">{advance.requestNo}</KeyValueRow>
            <KeyValueRow label="Amount">{formatCurrency(advance.amount)}</KeyValueRow>
            <KeyValueRow label="Status">
              <AdvanceStatusBadge status={advance.status} />
            </KeyValueRow>
          </KeyValueList>

          <div className="flex flex-col gap-1">
            <Label htmlFor="exitNote">
              {mode === 'travel' ? 'Reason' : 'Note'}
              {copy.reason === 'required' ? <em>*</em> : <span className="ml-1.5 font-medium text-fg-4">(optional)</span>}
            </Label>
            <Textarea id="exitNote" rows={3} value={note} placeholder="Input text here" onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  );
}
