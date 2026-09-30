import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { Button } from '@/components/ui/button';
import { Field, NoAccess, PerfActorPicker, PhaseBadge } from '@/features/performance/components/PerfBits';
import {
  useClosePeriod,
  useEligibilityGaps,
  usePeriod,
  useStartSigning,
} from '@/features/performance/hooks/usePeriods';
import { canManagePeriods, canViewEligibility, canViewPeriod } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  ELIGIBILITY_REASON_LABEL,
  PERF_PATHS,
  type EligibilityEntry,
  type NotAssessableReason,
  type OutOfAssessmentReason,
} from '@/features/performance/types';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'detail' | 'not-assessable' | 'out-of-assessment';
type Entry = EligibilityEntry<NotAssessableReason | OutOfAssessmentReason>;

function GapTable({ rows, empty }: { rows: Entry[]; empty: string }) {
  return (
    <DataTable<Entry>
      rows={rows}
      rowKey={(row) => row.employeeId}
      empty={empty}
      columns={[
        { key: 'name', header: 'Karyawan', strong: true, render: (row) => row.employeeNameSnapshot },
        {
          key: 'reason',
          header: 'Alasan',
          render: (row) => <StatusBadge tone="mute">{ELIGIBILITY_REASON_LABEL[row.reason]}</StatusBadge>,
        },
      ]}
    />
  );
}

/**
 * Detail periode (FSD-001-PERFORMANCE §1.3–§1.4, `B1`–`B5`). Tombol transisi hanya dirender bila
 * sah pada fase itu — bukan ditampilkan lalu dinonaktifkan. Dua daftar ketidaklayakan = dua tabel.
 */
export function CycleDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') ?? undefined;
  const { actor } = usePerfActor();
  const [tab, setTab] = useState<Tab>('detail');
  const [confirming, setConfirming] = useState<'start' | 'close' | null>(null);

  const allowed = canViewPeriod(actor.role);
  const { data: period, isLoading, isError } = usePeriod(actor, id, allowed);
  const showGaps = canViewEligibility(actor.role) && Boolean(period) && period?.phase !== 'CLOSED';
  const gaps = useEligibilityGaps(actor, id, showGaps);
  const startSigning = useStartSigning(actor);
  const closePeriod = useClosePeriod(actor);
  const manager = canManagePeriods(actor.role);

  const crumbs = [
    { label: 'Performance Management' },
    { label: 'Cycles & Settings', to: PERF_PATHS.cycles },
    { label: period?.periodName ?? 'Detail' },
  ];

  if (!allowed) {
    return (
      <PageShell crumbs={crumbs} title="Period detail" actions={<PerfActorPicker />}>
        <NoAccess description="Detail periode penilaian tidak tersedia untuk peran Employee." />
      </PageShell>
    );
  }

  if (!id || isError) {
    return (
      <PageShell crumbs={crumbs} title="Period detail" actions={<PerfActorPicker />}>
        <EmptyState
          title="Periode tidak ditemukan"
          description="Buka kembali periode ini dari daftar Cycles & Settings."
          action={<Button onClick={() => navigate(PERF_PATHS.cycles)}>Kembali ke daftar</Button>}
        />
      </PageShell>
    );
  }

  const phaseAction =
    manager && period?.phase === 'FILLING' ? (
      <Button onClick={() => setConfirming('start')}>Mulai pengesahan</Button>
    ) : manager && period?.phase === 'SIGNING' ? (
      <Button onClick={() => setConfirming('close')}>Tutup periode</Button>
    ) : null;

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title={period?.periodName ?? 'Period detail'}
        description="Skala nilai dan struktur penilaian periode ini beku sejak periode dibuka."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <PerfActorPicker onChange={() => setTab('detail')} />
            {phaseAction}
          </div>
        }
      >
        {isLoading || !period ? (
          <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat periode…</p>
        ) : (
          <div className="flex flex-col gap-5">
            {showGaps && (
              <TabMenu<Tab>
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'detail', label: 'Detail' },
                  { value: 'not-assessable', label: 'Belum bisa dinilai', count: gaps.data?.notAssessable.length },
                  { value: 'out-of-assessment', label: 'Di luar penilaian', count: gaps.data?.outOfAssessment.length },
                ]}
              />
            )}

            {tab === 'detail' && (
              <Card>
                <CardHead title="Periode" />
                <dl className="m-0 grid grid-cols-[180px_1fr] gap-x-4 gap-y-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3.5">
                  <Field label="Fase">
                    <PhaseBadge phase={period.phase} />
                  </Field>
                  <Field label="Skala nilai">{period.scaleLength} tingkat</Field>
                  <Field label="Struktur penilaian">{period.assessmentStructureNameSnapshot}</Field>
                  <Field label="Dibuka">
                    {formatDate(period.createdAt)} · {period.createdBy.nama}
                  </Field>
                  {period.updatedAt && (
                    <Field label="Transisi terakhir">
                      {formatDateTime(period.updatedAt)} · {period.updatedBy?.nama}
                    </Field>
                  )}
                  {period.closedAt && <Field label="Ditutup">{formatDateTime(period.closedAt)} WIB</Field>}
                </dl>
                {period.phase === 'CLOSED' && (
                  <p className="m-0 flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 font-body text-[12px] font-medium leading-normal text-secondary-900">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-secondary-700" />
                    Periode sudah ditutup dan tidak dapat dibuka kembali. Snapshot seluruh lembar penilaian sudah terbentuk.
                  </p>
                )}
              </Card>
            )}

            {tab === 'not-assessable' && (
              <Card>
                <CardHead title="Belum bisa dinilai" sub="Karyawan yang belum punya penilai di struktur penilaian — dihitung saat dibuka" />
                <GapTable rows={gaps.data?.notAssessable ?? []} empty="Semua karyawan sudah punya penilai." />
              </Card>
            )}

            {tab === 'out-of-assessment' && (
              <Card>
                <CardHead title="Di luar penilaian" sub="Ada di struktur tetapi tidak ikut periode ini — dihitung saat dibuka" />
                <GapTable rows={gaps.data?.outOfAssessment ?? []} empty="Tidak ada karyawan di luar penilaian." />
              </Card>
            )}
          </div>
        )}
      </PageShell>

      <ConfirmDialog
        open={confirming === 'start'}
        title="Mulai pengesahan?"
        description="Periode pindah ke fase Signing. Kelengkapan nilai awal tidak diperiksa, dan periode berikutnya boleh dibuka sesudah ini."
        confirmLabel="Mulai pengesahan"
        loading={startSigning.isPending}
        onOpenChange={(open) => !open && setConfirming(null)}
        onConfirm={() => id && startSigning.mutate(id, { onSuccess: () => setConfirming(null) })}
      />
      <ConfirmDialog
        open={confirming === 'close'}
        title="Tutup periode?"
        description="Periode yang ditutup tidak dapat dibuka kembali. Lembar yang belum selesai tetap tanpa nilai dan snapshot seluruh lembar dibentuk."
        confirmLabel="Tutup periode"
        tone="danger"
        loading={closePeriod.isPending}
        onOpenChange={(open) => !open && setConfirming(null)}
        onConfirm={() => id && closePeriod.mutate(id, { onSuccess: () => setConfirming(null) })}
      />
    </>
  );
}
