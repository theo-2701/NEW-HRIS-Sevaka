import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyPeriods } from '@/features/ess-payroll/hooks/useEssPayroll';
import { VIEWERS } from '@/features/ess-payroll/mock-data';
import type { Actor, PayslipPeriodRow } from '@/features/ess-payroll/types';
import { formatCurrency } from '@/lib/format';

const EMPLOYEE_VIEWERS = VIEWERS.filter((row) => row.role === 'ROLE_EMPLOYEE');

/**
 * Employee Self-Service › Payroll Info — port `_prototype/payroll-doc-ess.html`
 * (FSD-001-PAYROLL §4.1 · UIC-001-PAYROLL §5.1).
 *
 * Daftar sederhana periode yang slipnya sudah tersedia untuk pemanggil. Periode yang belum
 * diserahkan ke sistem klien tidak muncul karena angkanya memang belum final.
 */
export function PayrollInfoPage() {
  const navigate = useNavigate();
  const [actor, setActor] = useState<Actor>(EMPLOYEE_VIEWERS[0]);
  const periods = useMyPeriods(actor);
  const rows = periods.data ?? [];

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Payroll Info' }]}
      title="Payroll Info"
      description="Periode gaji yang slipnya sudah tersedia untuk Anda. Angkanya disiapkan payroll dan diambil sistem penggajian perusahaan."
      actions={
        <Select
          value={actor.employeeId}
          onValueChange={(value) => {
            const next = EMPLOYEE_VIEWERS.find((row) => row.employeeId === value);
            if (next) setActor(next);
          }}
        >
          <SelectTrigger className="h-10 w-[260px]" aria-label="Viewing as">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYEE_VIEWERS.map((viewer) => (
              <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                {viewer.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <Card>
        <CardHead title="Periode tersedia" sub="Hanya periode yang sudah diserahkan yang punya slip" />
        {!periods.isLoading && rows.length === 0 ? (
          <EmptyState
            title="Belum ada slip untuk Anda"
            description="Slip muncul di sini setelah periodenya diserahkan ke sistem penggajian perusahaan."
          />
        ) : (
          <DataTable<PayslipPeriodRow>
            rows={rows}
            rowKey={(row) => row.periodId}
            loading={periods.isLoading}
            empty="Belum ada slip untuk Anda."
            columns={[
              { key: 'period', header: 'Periode', strong: true, nowrap: true, render: (row) => row.periodLabel },
              {
                key: 'net',
                header: 'Net (disiapkan)',
                align: 'right',
                render: (row) => <span className="tabular-nums">{formatCurrency(row.netAmount)}</span>,
              },
            ]}
            actions={(row) => (
              <RowButton onClick={() => navigate(`/me/payslip?period=${row.periodId}&as=${actor.employeeId}`)}>
                Lihat Slip
              </RowButton>
            )}
          />
        )}
      </Card>
    </PageShell>
  );
}
