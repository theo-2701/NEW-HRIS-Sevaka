import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { Money } from '@/features/cash-advance/components/CashAdvanceBits';
import { parseAmount, thousands } from '@/features/cash-advance/rules';
import { JOB_GRADES, gradeName } from '@/features/finance-settings/mock-data';
import { formatDelta } from '@/features/finance-settings/rules';
import {
  useCreateLoanLimit,
  useDeleteLoanLimit,
  useUpdateLoanLimit,
} from '@/features/finance-settings/hooks/useFinanceSettings';
import type { Actor, LoanLimit } from '@/features/finance-settings/types';

function Hint({ children }: { children: string }) {
  return <span className="font-body text-[11px] font-medium text-fg-3">{children}</span>;
}

/**
 * SF-A3 (create) & SF-B3 (edit). Saat edit golongan read-only — identitas baris;
 * nominal baru hanya berlaku untuk pengajuan sesudahnya.
 */
export function LoanLimitFormModal({
  actor,
  open,
  limit,
  limits,
  onClose,
}: {
  actor: Actor;
  open: boolean;
  limit: LoanLimit | null;
  limits: LoanLimit[];
  onClose: () => void;
}) {
  const create = useCreateLoanLimit();
  const update = useUpdateLoanLimit();
  const [gradeId, setGradeId] = useState('');
  const [amount, setAmount] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setGradeId(limit?.jobGradeId ?? '');
      setAmount(limit ? thousands(String(limit.limitAmount)) : '');
      setActive(limit?.isActive ?? true);
    }
  }, [open, limit]);

  const freeGrades = JOB_GRADES.filter((grade) => !limits.some((row) => row.jobGradeId === grade.id));
  const pending = create.isPending || update.isPending;
  const ready = amount.trim() !== '' && (Boolean(limit) || Boolean(gradeId)) && !pending;
  const delta = limit && amount ? formatDelta(limit.limitAmount, parseAmount(amount)) : null;

  const save = () => {
    if (limit) {
      update.mutate({ actor, limit, patch: { limitAmount: amount, isActive: active } }, { onSuccess: onClose });
    } else {
      create.mutate({ actor, draft: { jobGradeId: gradeId, limitAmount: amount } }, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={limit ? 'Edit loan limit' : 'New loan limit'}
      description={
        limit
          ? 'Golongan adalah identitas baris dan tidak bisa diubah. Nominal baru hanya berlaku untuk pengajuan sesudahnya.'
          : 'Satu baris per golongan.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready} onClick={save}>
            {pending ? 'Menyimpan…' : limit ? 'Save changes' : 'Save loan limit'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>
            Job grade{!limit && <em>*</em>}
          </Label>
          {limit ? (
            <Input value={gradeName(limit.jobGradeId)} disabled />
          ) : (
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger>
                <SelectValue placeholder={freeGrades.length ? 'Select job grade' : 'Every job grade already has a limit'} />
              </SelectTrigger>
              <SelectContent>
                {freeGrades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Hint>
            {limit
              ? 'Golongan tidak bisa diubah saat edit.'
              : 'Golongan yang sudah punya plafon tidak muncul di daftar.'}
          </Hint>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="limit-amount">
            Limit amount<em>*</em>
          </Label>
          <Input
            id="limit-amount"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(thousands(event.target.value))}
          />
          <Hint>{delta ? `Delta ${delta} dibanding nominal saat ini.` : 'Dalam rupiah, minimal 0.'}</Hint>
        </div>

        {limit && (
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
            <span className="flex flex-col gap-0.5">
              <span className="font-body text-[13px] font-bold text-fg-1">Active</span>
              <Hint>Golongan nonaktif tidak memberi ruang pinjam untuk pengajuan baru.</Hint>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

export function DeleteLoanLimitModal({ actor, limit, onClose }: { actor: Actor; limit: LoanLimit | null; onClose: () => void }) {
  const remove = useDeleteLoanLimit();

  return (
    <Modal
      open={Boolean(limit)}
      onOpenChange={(next) => !next && onClose()}
      title="Delete loan limit"
      description="Soft delete — baris tetap tersimpan dan berhenti berlaku untuk pengajuan baru."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => limit && remove.mutate({ actor, limit }, { onSuccess: onClose })}
          >
            {remove.isPending ? 'Menghapus…' : 'Delete'}
          </Button>
        </>
      }
    >
      {limit && (
        <KeyValueList>
          <KeyValueRow label="Job grade">{gradeName(limit.jobGradeId)}</KeyValueRow>
          <KeyValueRow label="Limit amount">
            <Money value={limit.limitAmount} />
          </KeyValueRow>
          <KeyValueRow label="Status">
            <StatusBadge tone={limit.isActive ? 'ok' : 'mute'}>{limit.isActive ? 'Active' : 'Inactive'}</StatusBadge>
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}
