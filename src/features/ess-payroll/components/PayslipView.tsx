import { Card, CardHead } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { GROUP_LABEL } from '@/features/ess-payroll/types';
import type { LineGroup, Payslip, PayslipLine } from '@/features/ess-payroll/types';
import { formatCurrency } from '@/lib/format';

/** Urutan kelompok baris slip bersifat tetap. */
const GROUP_ORDER: LineGroup[] = [
  'group_penghasilan',
  'group_potongan',
  'group_urusan_lain',
  'group_koreksi_bulan_lain',
];

function LineRows({ lines }: { lines: PayslipLine[] }) {
  if (!lines.length) {
    return <span className="font-body text-[13px] font-medium text-fg-3">Tidak ada baris pada kelompok ini.</span>;
  }
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {lines.map((line) => (
        <li
          key={line.componentName}
          className="flex flex-wrap items-start justify-between gap-3 border-b border-vapor py-2.5 last:border-b-0"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-body text-[13px] font-semibold text-fg-1">{line.componentName}</span>
            {line.cause && (
              <span className="font-body text-xs font-medium leading-normal text-fg-3">{line.cause}</span>
            )}
            {line.originPeriodLabel && (
              <span className="font-body text-xs font-medium text-fg-3">Dari periode {line.originPeriodLabel}</span>
            )}
          </span>
          <span
            className={
              line.direction === 'MENGURANGI'
                ? 'shrink-0 font-body text-[13px] font-bold tabular-nums text-error-700'
                : 'shrink-0 font-body text-[13px] font-bold tabular-nums text-fg-1'
            }
          >
            {line.direction === 'MENGURANGI' ? '−' : '+'}
            {formatCurrency(line.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tampilan slip — bentuknya sama untuk slip sendiri maupun slip orang lain.
 *
 * Identitas karyawan hanya nama dan NIK; kontrak melarang id karyawan muncul di slip, dan jabatan
 * memang tidak disediakan kontraknya.
 */
export function PayslipView({ slip, actions }: { slip: Payslip; actions?: React.ReactNode }) {
  const groups: Record<LineGroup, PayslipLine[]> = {
    group_penghasilan: slip.groupPenghasilan,
    group_potongan: slip.groupPotongan,
    group_urusan_lain: slip.groupUrusanLain,
    group_koreksi_bulan_lain: slip.groupKoreksiBulanLain,
  };

  return (
    <Card>
      <CardHead title={`Slip ${slip.periodLabel}`} sub={`${slip.employeeName} · ${slip.employeeNik}`} action={actions} />

      <KeyValueList>
        <KeyValueRow label="Cabang">{slip.branchName}</KeyValueRow>
        <KeyValueRow label="Pusat biaya">{slip.costCenterName ?? '—'}</KeyValueRow>
        <KeyValueRow label="SBU">{slip.sbuName ?? '—'}</KeyValueRow>
      </KeyValueList>

      <div className="flex flex-col gap-4">
        {GROUP_ORDER.map((group) => {
          const lines = groups[group];
          // Potongan selalu tampil; kelompok lain disembunyikan saat kosong.
          if (!lines.length && group !== 'group_potongan') return null;
          return (
            <section key={group} className="flex flex-col gap-1.5">
              <h4 className="m-0 font-body text-xs font-bold uppercase tracking-[0.06em] text-fg-3">
                {GROUP_LABEL[group]}
              </h4>
              <LineRows lines={lines} />
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border-1 bg-mist px-4 py-3.5">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-body text-[13px] font-bold text-fg-1">Net (disiapkan)</span>
          <span className="font-display text-2xl font-bold tabular-nums text-fg-1">
            {formatCurrency(slip.netAmount)}
          </span>
        </span>
        <span className="font-body text-xs font-medium leading-normal text-fg-3">{slip.preparationStatement}</span>
        <StatusBadge tone="mute">{slip.paymentConfirmationLabel}</StatusBadge>
      </div>
    </Card>
  );
}
