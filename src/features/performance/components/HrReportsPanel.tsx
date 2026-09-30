import { useState } from 'react';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HolderCell } from '@/features/performance/components/ObjectionModals';
import { displayName, shortId } from '@/features/performance/format';
import { useJobGrades } from '@/features/performance/hooks/useKpi';
import {
  useAdditionalRatio,
  useBlankInput,
  useInactiveKpi,
  usePendingObjectionReport,
  useReasonReport,
  useTargetMix,
  useTaskDistribution,
} from '@/features/performance/hooks/useMonitor';
import { usePeriods } from '@/features/performance/hooks/usePeriods';
import { useSheets } from '@/features/performance/hooks/useSheets';
import { canReadHrReports, canReadManagerReports } from '@/features/performance/rules';
import {
  ELIGIBILITY_REASON_LABEL,
  type PerfActor,
  type PerfRole,
  type ReportKey,
} from '@/features/performance/types';
import { cn } from '@/lib/utils';

type Audience = 'dm' | 'hr' | 'manager';

/** Delapan laporan, tiga himpunan peran (FSD Matriks C Menu 6). */
const REPORTS: { key: ReportKey; code: string; title: string; audience: Audience; needsPeriod: boolean }[] = [
  { key: 'task-distribution', code: 'I1', title: 'Sebaran penugasan per atasan', audience: 'dm', needsPeriod: true },
  { key: 'kpi-item-target-type-mix', code: 'I2', title: 'Sebaran jenis target', audience: 'hr', needsPeriod: true },
  { key: 'kpi-item-inactive', code: 'I3', title: 'Daftar induk tidak berlaku', audience: 'manager', needsPeriod: false },
  { key: 'additional-item-ratio', code: 'I4', title: 'Proporsi baris tambahan', audience: 'hr', needsPeriod: true },
  { key: 'not-yet-assessable', code: 'I5', title: 'Belum bisa dinilai', audience: 'manager', needsPeriod: true },
  { key: 'excluded-from-assessment', code: 'I6', title: 'Di luar penilaian', audience: 'hr', needsPeriod: true },
  { key: 'blank-input-ratio', code: 'I7', title: 'Isian & tanda baca kosong', audience: 'hr', needsPeriod: true },
  { key: 'pending-objections', code: 'I8', title: 'Sanggahan belum dijawab', audience: 'dm', needsPeriod: false },
];

const DESCRIPTION: Record<ReportKey, string> = {
  'task-distribution': 'Seluruh bawahan tampil, termasuk yang belum pernah diberi tugas — "Tanpa tugas" bukan angka nol.',
  'kpi-item-target-type-mix': 'Jumlah baris daftar induk per golongan menurut jenis target.',
  'kpi-item-inactive': 'Baris daftar induk yang berstatus nonaktif, per golongan.',
  'additional-item-ratio': 'Porsi BOBOT baris tambahan dari seluruh bobot lembar yang dinilai tiap atasan; batas hanya keterangan.',
  'not-yet-assessable': 'Karyawan aktif yang belum punya lembar karena tidak ada penilai di struktur.',
  'excluded-from-assessment': 'Karyawan tanpa lembar karena sebab struktural — tidak dapat disanggah.',
  'blank-input-ratio': 'Dua proporsi terpisah per atasan; netral, tidak menahan apa pun.',
  'pending-objections': 'Sanggahan yang belum dijawab beserta pemikul kewajibannya saat ini.',
};

const visible = (role: PerfRole, audience: Audience) => {
  if (role === 'ROLE_SUPER_ADMIN' || canReadManagerReports(role)) return true;
  if (canReadHrReports(role)) return audience !== 'manager';
  return role === 'ROLE_DEPT_MANAGER' && audience === 'dm';
};

const percent = (value: number) => `${value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function ReasonTable({ actor, periodId, kind }: { actor: PerfActor; periodId: string; kind: 'not-yet-assessable' | 'excluded-from-assessment' }) {
  const { data, isLoading } = useReasonReport(actor, kind, periodId, Boolean(periodId));
  return (
    <DataTable
      rows={data ?? []}
      rowKey={(row) => row.employeeId}
      loading={isLoading}
      empty="Tidak ada karyawan pada daftar ini."
      columns={[
        { key: 'name', header: 'Karyawan', strong: true, render: (row) => row.employeeName },
        { key: 'reason', header: 'Sebab', render: (row) => <StatusBadge tone="mute">{ELIGIBILITY_REASON_LABEL[row.reason]}</StatusBadge> },
      ]}
    />
  );
}

function ReportBody({ actor, report, periodId }: { actor: PerfActor; report: ReportKey; periodId: string }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [grade, setGrade] = useState('ALL');
  const grades = useJobGrades(actor, report === 'kpi-item-inactive');
  const enabled = Boolean(periodId);

  const tasks = useTaskDistribution(actor, periodId, enabled && report === 'task-distribution');
  const mix = useTargetMix(actor, periodId, enabled && report === 'kpi-item-target-type-mix');
  const inactive = useInactiveKpi(
    actor,
    { jobGradeId: grade === 'ALL' ? undefined : grade, page, size },
    report === 'kpi-item-inactive',
  );
  const ratio = useAdditionalRatio(actor, periodId, enabled && report === 'additional-item-ratio');
  const blank = useBlankInput(actor, periodId, enabled && report === 'blank-input-ratio');
  const pending = usePendingObjectionReport(actor, report === 'pending-objections');

  if (report === 'task-distribution') {
    const rows = (tasks.data ?? []).flatMap((group) =>
      group.subordinates.map((row) => ({ ...row, supervisorEmployeeId: group.supervisorEmployeeId })),
    );
    return (
      <DataTable
        rows={rows}
        rowKey={(row) => `${row.supervisorEmployeeId}:${row.employeeId}`}
        loading={tasks.isLoading}
        empty="Tidak ada bawahan pada periode ini."
        columns={[
          { key: 'supervisor', header: 'Atasan', strong: true, render: (row) => displayName(row.supervisorEmployeeId) },
          { key: 'employee', header: 'Bawahan', render: (row) => row.employeeName },
          {
            key: 'count',
            header: 'Tugas diberikan',
            align: 'right',
            render: (row) =>
              row.assignedTaskCount === null ? (
                <StatusBadge tone="info">Tanpa tugas</StatusBadge>
              ) : (
                <span className="tabular-nums">{row.assignedTaskCount}</span>
              ),
          },
        ]}
      />
    );
  }

  if (report === 'kpi-item-target-type-mix') {
    return (
      <DataTable
        rows={mix.data ?? []}
        rowKey={(row) => row.jobGradeNameSnapshot}
        loading={mix.isLoading}
        empty="Belum ada daftar induk."
        columns={[
          { key: 'grade', header: 'Golongan', strong: true, render: (row) => row.jobGradeNameSnapshot },
          { key: 'numeric', header: 'Numeric', align: 'right', render: (row) => <StatusBadge tone="info">{row.numericCount}</StatusBadge> },
          { key: 'narrative', header: 'Narrative', align: 'right', render: (row) => <StatusBadge tone="brand">{row.narrativeCount}</StatusBadge> },
        ]}
      />
    );
  }

  if (report === 'kpi-item-inactive') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex w-[240px] flex-col gap-1">
          <Label htmlFor="inactive-grade">Golongan jabatan</Label>
          <Select
            value={grade}
            onValueChange={(next) => {
              setGrade(next);
              setPage(1);
            }}
          >
            <SelectTrigger id="inactive-grade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua golongan</SelectItem>
              {(grades.data ?? []).map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <DataTable
            rows={inactive.data?.rows ?? []}
            rowKey={(row, index) => `${row.jobGradeNameSnapshot}:${index}`}
            loading={inactive.isLoading}
            empty="Tidak ada baris daftar induk yang nonaktif."
            columns={[
              { key: 'grade', header: 'Golongan', strong: true, render: (row) => row.jobGradeNameSnapshot },
              { key: 'status', header: 'Status', render: () => <StatusBadge tone="mute">Nonaktif</StatusBadge> },
            ]}
          />
          <Pagination
            page={page}
            pageSize={size}
            total={inactive.data?.totalData ?? 0}
            noun="items"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setSize(next);
              setPage(1);
            }}
          />
        </div>
      </div>
    );
  }

  if (report === 'additional-item-ratio') {
    return (
      <DataTable
        rows={ratio.data ?? []}
        rowKey={(row) => row.supervisorEmployeeId}
        loading={ratio.isLoading}
        empty="Belum ada lembar pada periode ini."
        columns={[
          { key: 'supervisor', header: 'Atasan', strong: true, render: (row) => displayName(row.supervisorEmployeeId) },
          { key: 'ratio', header: 'Porsi bobot tambahan', align: 'right', render: (row) => <span className="tabular-nums">{percent(row.additionalWeightRatio)}</span> },
          { key: 'threshold', header: 'Batas setelan', align: 'right', muted: true, render: (row) => percent(row.maxRatioThreshold) },
        ]}
      />
    );
  }

  if (report === 'not-yet-assessable' || report === 'excluded-from-assessment') {
    return <ReasonTable actor={actor} periodId={periodId} kind={report} />;
  }

  if (report === 'blank-input-ratio') {
    return (
      <DataTable
        rows={blank.data ?? []}
        rowKey={(row) => row.supervisorEmployeeId}
        loading={blank.isLoading}
        empty="Belum ada lembar pada periode ini."
        columns={[
          { key: 'supervisor', header: 'Atasan', strong: true, render: (row) => displayName(row.supervisorEmployeeId) },
          { key: 'blank', header: 'Lembar tanpa isian diri', align: 'right', render: (row) => <span className="tabular-nums">{percent(row.blankSelfAssessmentRatio)}</span> },
          { key: 'unread', header: 'Baris belum dibaca', align: 'right', render: (row) => <span className="tabular-nums">{percent(row.unreadItemRatio)}</span> },
        ]}
      />
    );
  }

  const pendingColumns: Column<NonNullable<typeof pending.data>[number]>[] = [
    {
      key: 'id',
      header: 'Sanggahan',
      nowrap: true,
      render: (row) => (
        <span title={row.objectionId} className="font-mono text-[12px] text-fg-2">
          {shortId(row.objectionId)}
        </span>
      ),
    },
    {
      key: 'holder',
      header: 'Pemikul aktif',
      render: (row) => (
        <HolderCell holder={{ holderEmployeeId: row.currentHolderEmployeeId, holderContext: row.currentHolderContext, assignedAt: null }} />
      ),
    },
    { key: 'days', header: 'Hari sejak diajukan', align: 'right', render: (row) => <span className="tabular-nums">{row.daysSinceSubmitted}</span> },
  ];
  return (
    <DataTable
      rows={pending.data ?? []}
      rowKey={(row) => row.objectionId}
      loading={pending.isLoading}
      empty="Tidak ada sanggahan yang belum dijawab."
      columns={pendingColumns}
    />
  );
}

/**
 * Sub Menu 2 — Laporan HR (`I1`–`I8`) dalam satu layar. Urutan baris ditetapkan tiap laporan; tidak ada
 * kontrol pengurutan (`PF-71`). DM hanya melihat dua laporan yang ter-scope ke dirinya.
 */
export function HrReportsPanel({ actor }: { actor: PerfActor }) {
  const list = REPORTS.filter((row) => visible(actor.role, row.audience));
  const [picked, setPicked] = useState<ReportKey>(list[0]?.key ?? 'task-distribution');
  const active = list.find((row) => row.key === picked) ?? list[0];
  const hr = canReadHrReports(actor.role) || actor.role === 'ROLE_SUPER_ADMIN';
  const periods = usePeriods(actor, { page: 1, size: 50 }, hr);
  /* DM tidak berhak grid periode (#3) — periodenya diambil dari lembar yang ia nilai (`P3.02`). */
  const ownSheets = useSheets(actor, { dataScope: 'ASSESSOR', page: 1, size: 1 }, !hr && actor.role === 'ROLE_DEPT_MANAGER');
  const [periodPick, setPeriodPick] = useState('');
  const periodId = hr
    ? periodPick || periods.data?.rows.find((row) => row.phase !== 'CLOSED')?.id || periods.data?.rows[0]?.id || ''
    : (ownSheets.data?.rows[0]?.reviewPeriodId ?? '');

  if (!active) {
    return <EmptyState title="Tidak ada laporan untuk peran ini" description="Laporan HR hanya untuk HR dan dua laporan untuk atasan." />;
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Daftar laporan" className="flex flex-col overflow-hidden rounded-lg border border-border-1 bg-white">
        {list.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => setPicked(row.key)}
            aria-current={row.key === active.key ? 'page' : undefined}
            className={cn(
              'flex items-start gap-2.5 border-b border-border-1 px-4 py-3 text-left font-body text-[13px] font-semibold transition-colors last:border-b-0',
              row.key === active.key ? 'bg-primary-50 text-secondary-700' : 'text-fg-2 hover:bg-cloud',
            )}
          >
            <span className="mt-px font-mono text-[11px] font-bold text-fg-3">{row.code}</span>
            {row.title}
          </button>
        ))}
      </nav>

      <Card>
        <CardHead
          title={`${active.code} · ${active.title}`}
          sub={DESCRIPTION[active.key]}
          action={
            active.needsPeriod && hr ? (
              <Select value={periodId} onValueChange={setPeriodPick}>
                <SelectTrigger className="h-10 w-[220px]" aria-label="Periode">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {(periods.data?.rows ?? []).map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.periodName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />
        <ReportBody key={`${active.key}:${periodId}`} actor={actor} report={active.key} periodId={periodId} />
      </Card>
    </div>
  );
}
