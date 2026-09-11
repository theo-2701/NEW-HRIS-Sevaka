import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { parseAmount, roomOf, tenorOptions, thousands } from '@/features/loan/rules';
import { useSubmitLoan } from '@/features/loan/hooks/useLoan';
import type { LoanConfig, LoanExposure } from '@/features/loan/types';
import { formatCurrency } from '@/lib/format';

/**
 * Form permintaan pinjaman (LN-A3). Pokok diperiksa terhadap sisa ruang pinjam
 * dan jumlah pinjaman aktif sebelum barisnya ditulis; tenornya selalu dikirim
 * klien, sedangkan bunga tidak pernah dihitung di sini.
 */
export function LoanFormModal({
  open,
  config,
  exposure,
  onClose,
}: {
  open: boolean;
  config: LoanConfig;
  exposure: LoanExposure;
  onClose: () => void;
}) {
  const submit = useSubmitLoan();
  const [amount, setAmount] = useState('');
  const [tenor, setTenor] = useState('');

  useEffect(() => {
    if (open) {
      setAmount('');
      setTenor('');
    }
  }, [open]);

  const room = roomOf(exposure);
  const typed = parseAmount(amount);
  const overRoom = typed > room;
  const ready = typed > 0 && Boolean(tenor) && !overRoom;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New loan request"
      description="Pokok diperiksa terhadap sisa ruang pinjam dan jumlah pinjaman aktif sebelum barisnya ditulis."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || submit.isPending}
            onClick={() =>
              submit.mutate({ amount, tenorMonths: Number(tenor) }, { onSuccess: onClose })
            }
          >
            {submit.isPending ? 'Mengirim…' : 'Submit request'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Grade limit">{formatCurrency(exposure.limitAmount)}</KeyValueRow>
          <KeyValueRow label="Outstanding + reserved">
            {formatCurrency(exposure.outstandingAmount + exposure.reservedAmount)}
          </KeyValueRow>
          <KeyValueRow label="Available">{formatCurrency(room)}</KeyValueRow>
        </KeyValueList>

        <div className="flex flex-col gap-1">
          <Label htmlFor="loanAmount">
            Principal amount<em>*</em>
          </Label>
          <Input
            id="loanAmount"
            inputMode="numeric"
            value={amount}
            placeholder="0"
            onChange={(event) => setAmount(thousands(event.target.value))}
          />
          <span className="font-body text-xs font-normal text-fg-3">
            {overRoom
              ? `422 FIN_LOAN_LIMIT_EXCEEDED — pokok melewati ruang pinjam yang tersisa (${formatCurrency(room)}).`
              : 'Pokok di atas sisa ruang pinjam tidak bisa dikirim.'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <Label>
            Tenor<em>*</em>
          </Label>
          <Select value={tenor} onValueChange={setTenor}>
            <SelectTrigger>
              <SelectValue placeholder="Select tenor" />
            </SelectTrigger>
            <SelectContent>
              {tenorOptions(config).map((months) => (
                <SelectItem key={months} value={String(months)}>
                  {months} months
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-body text-xs font-normal text-fg-3">
            Pilihan tenor mengikuti setting company — kelipatan tiga sampai {config.tenorMax} bulan.
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="loanScheme">Loan scheme</Label>
          <Input
            id="loanScheme"
            disabled
            value={
              config.interestBearing
                ? 'Interest-bearing — schedule received from the funding party'
                : 'Interest-free — schedule calculated by HRIS'
            }
          />
          <span className="font-body text-xs font-normal text-fg-3">
            Ditetapkan company — tidak bisa diubah pada satu permintaan.
          </span>
        </div>

        <Note icon={<Info />}>
          Pada company berbunga, <strong>bunga tidak pernah dihitung HRIS</strong>. Ia datang dari pihak pemberi dana,
          lalu Anda mengakuinya di tab Schedule Acknowledgement sebelum pinjaman menjadi APPROVED.
        </Note>
      </div>
    </Modal>
  );
}
