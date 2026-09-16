import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayslipView } from '@/features/ess-payroll/components/PayslipView';
import {
  useAccessLogs,
  useDownloadEmployeePayslip,
  useDownloadMyPayslip,
  useMyPayslip,
  usePayrollResults,
  useOpenEmployeePayslip,
  useSelectablePeriods,
} from '@/features/ess-payroll/hooks/useEssPayroll';
import { VIEWERS } from '@/features/ess-payroll/mock-data';
import { employeeName } from '@/features/salary-processing/mock-data';
import { ACCESS_CHANNEL_LABEL } from '@/features/ess-payroll/types';
import type { Actor, Payslip, PayrollResultRow, PayslipAccessLog } from '@/features/ess-payroll/types';
import { formatCurrency, formatDateTime } from '@/lib/format';

/**
 * Employee Self-Service › Payslip — port `_prototype/payroll-doc-payslip.html`
 * (FSD-001-PAYROLL §4.2–§4.3 · UIC-001-PAYROLL §5.2–§5.6).
 *
 * Dua aktor pada satu layar: karyawan membuka slipnya sendiri tanpa meninggalkan jejak, sedangkan
 * HR Manager mencari hasil hitung lalu membuka slip orang lain — dan setiap pembukaan maupun
 * unduhan itu menulis satu baris jejak akses.
 */
export function PayslipPage() {
  const [params, setParams] = useSearchParams();
  const [actor, setActor] = useState<Actor>(() => {
    const requested = params.get('as');
    return VIEWERS.find((row) => row.employeeId === requested) ?? VIEWERS[0];
  });
  const [periodId, setPeriodId] = useState(params.get('period') ?? '');
  const [otherSlip, setOtherSlip] = useState<Payslip | null>(null);

  const selectable = useSelectablePeriods();
  const myPayslip = useMyPayslip(actor, periodId);
  const results = usePayrollResults(actor, periodId);
  const accessLogs = useAccessLogs();
  const openOther = useOpenEmployeePayslip();
  const downloadMine = useDownloadMyPayslip();
  const downloadOther = useDownloadEmployeePayslip();

  const isEmployee = actor.role === 'ROLE_EMPLOYEE';
  const periodOptions = useMemo(() => selectable.data ?? [], [selectable.data]);

  useEffect(() => {
    if (!periodId && periodOptions.length) setPeriodId(periodOptions[0].id);
  }, [periodId, periodOptions]);

  useEffect(() => {
    setOtherSlip(null);
  }, [actor, periodId]);

  const chooseActor = (employeeId: string) => {
    const next = VIEWERS.find((row) => row.employeeId === employeeId);
    if (!next) return;
    setActor(next);
    const nextParams = new URLSearchParams(params);
    nextParams.set('as', next.employeeId);
    setParams(nextParams, { replace: true });
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Payslip' }]}
      title="Payslip"
      description={
        isEmployee
          ? 'Rincian slip gaji Anda untuk periode yang dipilih. Angkanya disiapkan payroll, bukan pernyataan bahwa uang sudah diterima.'
          : 'Cari hasil hitung satu periode, lalu buka slip karyawan. Setiap pembukaan dan unduhan slip orang lain tercatat di jejak akses.'
      }
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={actor.employeeId} onValueChange={chooseActor}>
            <SelectTrigger className="h-10 w-[260px]" aria-label="Viewing as">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWERS.map((viewer) => (
                <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                  {viewer.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="h-10 w-[240px]" aria-label="Period">
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {isEmployee && (
          <>
            {myPayslip.data ? (
              <PayslipView
                slip={myPayslip.data}
                actions={
                  <Button
                    variant="secondary"
                    disabled={downloadMine.isPending}
                    onClick={() => downloadMine.mutate({ actor, periodId })}
                  >
                    {downloadMine.isPending ? 'Menyiapkan…' : 'Unduh slip'}
                  </Button>
                }
              />
            ) : (
              <Card>
                <CardHead title="Slip" sub="Pilih periode yang slipnya sudah tersedia" />
                <EmptyState
                  title={myPayslip.isLoading ? 'Memuat slip…' : 'Slip periode ini belum tersedia untuk Anda'}
                  description="Slip hanya ada untuk periode yang sudah diserahkan ke sistem penggajian perusahaan."
                />
              </Card>
            )}
          </>
        )}

        {!isEmployee && (
          <>
            <Card>
              <CardHead
                title="Hasil hitung periode"
                sub="Grid internal HR — membuka daftar ini tidak menulis jejak akses"
              />
              <DataTable<PayrollResultRow>
                rows={results.data ?? []}
                rowKey={(row) => `${row.periodId}-${row.employeeId}`}
                loading={results.isLoading}
                empty={results.error ? String(results.error.message) : 'Belum ada hasil hitung pada periode ini.'}
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    strong: true,
                    render: (row) => row.employeeNameSnapshot,
                  },
                  {
                    key: 'id',
                    header: 'Employee ID',
                    muted: true,
                    nowrap: true,
                    render: (row) => <span className="font-mono text-xs">{row.employeeId}</span>,
                  },
                  {
                    key: 'net',
                    header: 'Net (disiapkan)',
                    align: 'right',
                    render: (row) => <span className="tabular-nums">{formatCurrency(row.netAmount)}</span>,
                  },
                  {
                    key: 'finding',
                    header: 'Temuan terbuka',
                    align: 'center',
                    render: (row) =>
                      row.hasOpenFinding ? (
                        <StatusBadge tone="warn">Ada</StatusBadge>
                      ) : (
                        <StatusBadge tone="ok">Nihil</StatusBadge>
                      ),
                  },
                ]}
                actions={(row) => (
                  <RowButton
                    disabled={openOther.isPending}
                    onClick={() =>
                      openOther.mutate(
                        { actor, periodId, employeeId: row.employeeId },
                        { onSuccess: (slip) => setOtherSlip(slip) },
                      )
                    }
                  >
                    Buka slip
                  </RowButton>
                )}
              />
            </Card>

            {otherSlip && (
              <PayslipView
                slip={otherSlip}
                actions={
                  <Button
                    variant="secondary"
                    disabled={downloadOther.isPending}
                    onClick={() => {
                      const target = (results.data ?? []).find((row) => row.employeeNameSnapshot === otherSlip.employeeName);
                      if (target) {
                        downloadOther.mutate({ actor, periodId, employeeId: target.employeeId });
                      }
                    }}
                  >
                    {downloadOther.isPending ? 'Menyiapkan…' : 'Unduh slip'}
                  </Button>
                }
              />
            )}

            <Card>
              <CardHead
                title="Jejak akses sesi ini"
                sub="Setiap pembukaan dan unduhan slip orang lain tercatat; peninjauan jejak seutuhnya adalah kewenangan Super Admin"
              />
              <DataTable<PayslipAccessLog>
                rows={accessLogs.data ?? []}
                rowKey={(row) => row.id}
                loading={accessLogs.isLoading}
                empty="Belum ada slip orang lain yang dibuka pada sesi ini."
                columns={[
                  { key: 'target', header: 'Karyawan', strong: true, render: (row) => employeeName(row.targetEmployeeId) },
                  {
                    key: 'channel',
                    header: 'Kanal',
                    render: (row) => (
                      <StatusBadge tone={row.accessChannel === 'UNDUHAN' ? 'info' : 'mute'}>
                        {ACCESS_CHANNEL_LABEL[row.accessChannel]}
                      </StatusBadge>
                    ),
                  },
                  { key: 'by', header: 'Dibuka oleh', muted: true, render: (row) => employeeName(row.createdBy) },
                  {
                    key: 'at',
                    header: 'Waktu',
                    muted: true,
                    nowrap: true,
                    render: (row) => formatDateTime(row.createdAt),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
