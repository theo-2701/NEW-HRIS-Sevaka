import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoAccess, PerfActorPicker, PhaseBadge } from '@/features/performance/components/PerfBits';
import { useEligibilityPreview, useOpenPeriod, usePeriods } from '@/features/performance/hooks/usePeriods';
import { canListPeriods, canManagePeriods } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  PERF_PATHS,
  PHASE_LABEL,
  type EligibilitySummary,
  type PeriodPhase,
  type ReviewPeriod,
} from '@/features/performance/types';
import { formatDate } from '@/lib/format';

const ALL = 'ALL';

/** A2 — satu field; setelan skala & struktur dibaca sistem dan dibekukan, tidak diisi di sini. */
function OpenPeriodModal({
  open,
  onClose,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  onOpened: (name: string, summary: EligibilitySummary) => void;
}) {
  const { actor } = usePerfActor();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const preview = useEligibilityPreview(actor, open);
  const openPeriod = useOpenPeriod(actor);
  const error = touched && (!name.trim() ? 'Nama periode wajib diisi.' : name.trim().length > 100 ? 'Maksimal 100 karakter.' : '');

  const close = () => {
    setName('');
    setTouched(false);
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (!name.trim() || name.trim().length > 100) return;
    openPeriod.mutate(name, {
      onSuccess: (result) => {
        onOpened(result.period.periodName, result.summary);
        close();
      },
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Buka periode penilaian"
      description="Hanya satu periode boleh berada di fase Filling. Skala nilai dan struktur penilaian dibaca dari setelan Kinerja lalu dibekukan ke periode ini."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={openPeriod.isPending}>
            {openPeriod.isPending ? 'Membuka…' : 'Buka periode'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="period-name">
            Nama periode<em>*</em>
          </Label>
          <Input
            id="period-name"
            value={name}
            maxLength={100}
            placeholder="Semester 2 2026"
            aria-invalid={Boolean(error)}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          {error ? (
            <span className="font-body text-xs font-medium text-error-600">{error}</span>
          ) : (
            <span className="font-body text-xs font-medium text-fg-3">Label tampilan saja, maksimal 100 karakter.</span>
          )}
        </div>

        <p className="m-0 flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 font-body text-[12px] font-medium leading-normal text-secondary-900">
          <Info className="mt-0.5 size-3.5 shrink-0 text-secondary-700" />
          {preview.data
            ? `Pratinjau saat ini: ${preview.data.notAssessable.length} karyawan belum bisa dinilai dan ${preview.data.outOfAssessment.length} di luar penilaian. Periode tetap bisa dibuka.`
            : 'Menghitung pratinjau kelayakan…'}
        </p>
      </div>
    </Modal>
  );
}

/**
 * Performance › Cycles & Settings (FSD-001-PERFORMANCE §1 · UIC §2, `A1`–`A3`).
 * Periode tidak pernah dihapus atau disunting — hanya bertransisi fase lewat detail.
 */
export function CyclesPage() {
  const navigate = useNavigate();
  const { actor } = usePerfActor();
  const [phase, setPhase] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState<{ name: string; summary: EligibilitySummary } | null>(null);

  const listable = canListPeriods(actor.role);
  const query = useMemo(
    () => ({ phase: phase === ALL ? undefined : [phase as PeriodPhase], page, size }),
    [phase, page, size],
  );
  const { data, isLoading } = usePeriods(actor, query, listable);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Performance Management' }, { label: 'Cycles & Settings' }]}
        title="Cycles & Settings"
        description="Buka dan tutup periode penilaian kinerja. Skala nilai dan struktur penilaian dibekukan saat periode dibuka."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <PerfActorPicker onChange={() => setOpened(null)} />
            {canManagePeriods(actor.role) && <Button onClick={() => setOpening(true)}>Buka periode</Button>}
          </div>
        }
      >
        {!listable ? (
          <NoAccess
            description={
              actor.role === 'ROLE_DEPT_MANAGER'
                ? 'Detail periode dibuka dari lembar penilaian yang Anda nilai, bukan dari daftar ini.'
                : 'Menu Siklus & Setelan hanya untuk HR.'
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {opened && (
              <div className="grid gap-3 rounded-xl border border-success-200 bg-success-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <span className="font-body text-sm font-semibold text-success-900">
                  Periode “{opened.name}” dibuka pada fase Filling.
                </span>
                <span className="font-body text-xs font-medium text-fg-2">
                  Belum bisa dinilai{' '}
                  <b className="font-display text-lg text-fg-1 tabular-nums">{opened.summary.notAssessableCount}</b>
                </span>
                <span className="font-body text-xs font-medium text-fg-2">
                  Di luar penilaian{' '}
                  <b className="font-display text-lg text-fg-1 tabular-nums">{opened.summary.outOfAssessmentCount}</b>
                </span>
              </div>
            )}

            <Card>
              <CardHead title="Daftar periode" sub="Terbaru di atas" />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Select
                      value={phase}
                      onValueChange={(value) => {
                        setPhase(value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 w-[180px]" aria-label="Fase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Semua fase</SelectItem>
                        {(Object.keys(PHASE_LABEL) as PeriodPhase[]).map((value) => (
                          <SelectItem key={value} value={value}>
                            {PHASE_LABEL[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
                <DataTable<ReviewPeriod>
                  rows={data?.rows ?? []}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="Belum ada periode penilaian."
                  columns={[
                    { key: 'name', header: 'Nama Periode', strong: true, render: (row) => row.periodName },
                    { key: 'phase', header: 'Fase', render: (row) => <PhaseBadge phase={row.phase} /> },
                    { key: 'scale', header: 'Skala', align: 'center', render: (row) => row.scaleLength },
                    {
                      key: 'opened',
                      header: 'Dibuka',
                      muted: true,
                      nowrap: true,
                      render: (row) => `${formatDate(row.createdAt)} · ${row.createdBy.nama}`,
                    },
                  ]}
                  actions={(row) => (
                    <RowButton onClick={() => navigate(PERF_PATHS.cycleDetail(row.id))}>View Detail</RowButton>
                  )}
                />
                <Pagination
                  page={page}
                  pageSize={size}
                  total={data?.totalData ?? 0}
                  noun="periods"
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setSize(next);
                    setPage(1);
                  }}
                />
              </div>
            </Card>
          </div>
        )}
      </PageShell>

      <OpenPeriodModal
        open={opening}
        onClose={() => setOpening(false)}
        onOpened={(name, summary) => setOpened({ name, summary })}
      />
    </>
  );
}
