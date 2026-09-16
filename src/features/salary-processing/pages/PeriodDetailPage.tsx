import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { EmptyState } from '@/components/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PeriodDetailCard } from '@/features/salary-processing/components/PeriodDetailCard';
import { ReviewPeriodModal, RunPeriodModal } from '@/features/salary-processing/components/ProcessingModals';
import { usePeriods } from '@/features/salary-processing/hooks/useSalaryProcessing';
import { VIEWERS } from '@/features/salary-processing/mock-data';
import { periodLabel, periodName } from '@/features/salary-processing/rules';
import type { Actor } from '@/features/salary-processing/types';

const LIST_PATH = '/payroll/salary-processing';
const AUTHORIZATION_PATH = '/payroll/authorization';

/**
 * Payroll › Salary Processing › Period detail — layar tersendiri yang dibuka dari baris periode,
 * baik di menu Salary Processing maupun Authorization & Handover.
 *
 * Isinya terlalu panjang untuk modal: gerbang periode, sepuluh parameter beku, ringkasan temuan,
 * dan riwayat status. Aksi mengunci, membuka kembali, dan mengotorisasi penyerahan tetap tinggal
 * di menu Authorization & Handover sesuai pembagian wewenangnya.
 */
export function PeriodDetailPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const id = params.get('id') ?? '';
  const fromAuthorization = params.get('from') === 'authorization';

  const [actor, setActor] = useState<Actor>(() => {
    const requested = params.get('as');
    return VIEWERS.find((row) => row.employeeId === requested) ?? VIEWERS[0];
  });
  const [recalculating, setRecalculating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const periods = usePeriods();
  const periodList = periods.data ?? [];
  const period = periodList.find((row) => row.id === id) ?? null;

  const backPath = fromAuthorization ? AUTHORIZATION_PATH : LIST_PATH;
  const crumbs = [
    { label: 'Payroll' },
    fromAuthorization
      ? { label: 'Authorization & Handover', to: AUTHORIZATION_PATH }
      : { label: 'Salary Processing', to: LIST_PATH },
    { label: period ? periodLabel(period) : 'Period' },
  ];

  if (!periods.isLoading && !period) {
    return (
      <PageShell crumbs={crumbs} title="Period detail" description="Layar ini dibuka dari sebuah baris periode gaji.">
        <EmptyState
          title="Periode tidak ditemukan"
          description="Periode yang dijalankan selama sesi ini hanya hidup di memori aplikasi."
          action={
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="font-body text-[13px] font-bold text-secondary-600 hover:underline"
            >
              Kembali ke daftar periode
            </button>
          }
        />
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title={period ? `${periodLabel(period)} · ${periodName(period)}` : 'Period detail'}
        description="Rincian satu periode gaji: gerbang, parameter yang dibekukan saat dijalankan, ringkasan temuan, dan riwayat statusnya."
        actions={
          <Select
            value={actor.employeeId}
            onValueChange={(value) => {
              const next = VIEWERS.find((row) => row.employeeId === value);
              if (!next) return;
              setActor(next);
              const nextParams = new URLSearchParams(params);
              nextParams.set('as', next.employeeId);
              setParams(nextParams, { replace: true });
            }}
          >
            <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
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
        }
      >
        {period && (
          <PeriodDetailCard
            actor={actor}
            period={period}
            onRecalculate={() => setRecalculating(true)}
            onReview={() => setReviewing(true)}
            onOpenFindings={() => navigate(`${LIST_PATH}?tab=findings&period=${period.id}`)}
          />
        )}
      </PageShell>

      <RunPeriodModal
        actor={actor}
        open={recalculating}
        initial={period ? { year: period.periodYear, month: period.periodMonth } : null}
        periods={periodList}
        onClose={() => setRecalculating(false)}
        onDone={() => undefined}
      />
      <ReviewPeriodModal
        actor={actor}
        period={reviewing ? period : null}
        onClose={() => setReviewing(false)}
      />
    </>
  );
}
