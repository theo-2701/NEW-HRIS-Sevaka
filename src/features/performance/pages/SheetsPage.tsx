import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton, type RowAction } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banner, NoAccess, OriginBadge, PerfActorPicker, PeriodLabel, SheetStatusBadge } from '@/features/performance/components/PerfBits';
import { ObjectionNoteModal, ReadMarkDialog, SelfAssessmentModal } from '@/features/performance/components/SheetModals';
import { usePeriods } from '@/features/performance/hooks/usePeriods';
import { useMySheetId, useSelfAssessment, useSheet, useSheets } from '@/features/performance/hooks/useSheets';
import { canListSheets, canScopeAllSheets, hasOwnSheetSurface } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import { PERF_PATHS, type PerfActor, type SheetItem, type SheetRow, type SheetScope, type SheetSearch } from '@/features/performance/types';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'mine' | 'queue';
type SortBy = NonNullable<SheetSearch['sortBy']>;
const ALL_PERIODS = 'ALL';

/** D1 — permukaan `SELF`: isian diri + baris target TANPA nilai atasan (G5). */
function MySheetPanel({ actor, sheetId }: { actor: PerfActor; sheetId: string | null }) {
  const mine = useMySheetId(actor, !sheetId);
  const id = sheetId ?? mine.data ?? null;
  const sheet = useSheet(actor, id);
  const self = useSelfAssessment(actor, id ?? undefined, Boolean(id));
  const [writing, setWriting] = useState(false);
  const [reading, setReading] = useState<SheetItem | null>(null);
  const [noting, setNoting] = useState<SheetItem | null>(null);

  if (mine.isLoading || sheet.isLoading) {
    return <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat lembar…</p>;
  }
  if (!id || sheet.isError || !sheet.data) {
    return (
      <EmptyState
        title="Belum ada lembar penilaian"
        description="Lembar Anda muncul setelah periode penilaian dibuka dan Anda termasuk di dalamnya. Tautan lembar juga dikirim lewat notifikasi."
      />
    );
  }

  const data = sheet.data;
  const locked = data.items.some((row) => row.initialValueRecordedAt);
  const content = self.data?.content ?? null;
  const resetSeen = data.items.some((row) => row.employeeReadResetCount > 0 && !row.employeeReadAt);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHead
          title="Isian penilaian diri"
          sub={
            <span className="inline-flex items-center gap-2">
              Status lembar <SheetStatusBadge status={data.status} />
            </span>
          }
          action={
            <Button variant="secondary" disabled={locked} onClick={() => setWriting(true)}>
              {content ? 'Ubah isian' : 'Tulis isian'}
            </Button>
          }
        />
        {content ? (
          <p className="m-0 whitespace-pre-line font-body text-[13.5px] font-medium leading-relaxed text-fg-1">{content}</p>
        ) : (
          <p className="m-0 font-body text-[13px] font-medium text-fg-3">Belum ditulis.</p>
        )}
        <p className="m-0 font-body text-[12px] font-medium text-fg-3">
          {self.data ? `Dikirim ${formatDateTime(self.data.submittedAt)}. ` : ''}
          {locked
            ? 'Tidak dapat diubah lagi karena atasan sudah mencatat nilai awal pada lembar ini.'
            : 'Masih dapat diubah sampai atasan mencatat nilai awal pertama.'}
        </p>
      </Card>

      <Card>
        <CardHead title="Baris target" sub="Nilai dari atasan tidak ditampilkan di sini sebelum pengesahan." />
        {resetSeen && (
          <Banner tone="info">Sebagian tanda baca direset karena atasan mengubah baris setelah Anda membacanya.</Banner>
        )}
        <DataTable<SheetItem>
          rows={data.items}
          rowKey={(row) => row.id}
          empty="Belum ada baris target."
          columns={[
            { key: 'name', header: 'Item', strong: true, render: (row) => row.itemNameSnapshot },
            { key: 'origin', header: 'Asal', render: (row) => <OriginBadge origin={row.origin} /> },
            { key: 'target', header: 'Target', render: (row) => row.target },
            {
              key: 'read',
              header: 'Dibaca',
              nowrap: true,
              render: (row) =>
                row.employeeReadAt ? (
                  <StatusBadge tone="ok">Dibaca {formatDate(row.employeeReadAt)}</StatusBadge>
                ) : (
                  <StatusBadge tone="mute">Belum dibaca</StatusBadge>
                ),
            },
            {
              key: 'note',
              header: 'Catatan keberatan',
              muted: true,
              render: (row) => row.employeeObjectionNote ?? '—',
            },
          ]}
          actions={(row) => {
            const actions: RowAction[] = [];
            if (!row.employeeReadAt) actions.push({ label: 'Tandai dibaca', onSelect: () => setReading(row) });
            actions.push({
              label: row.employeeObjectionNote ? 'Ubah catatan keberatan' : 'Catat keberatan',
              onSelect: () => setNoting(row),
            });
            return actions.length === 1 ? (
              <RowButton onClick={actions[0].onSelect}>{actions[0].label}</RowButton>
            ) : (
              <RowActions actions={actions} />
            );
          }}
        />
      </Card>

      <SelfAssessmentModal open={writing} sheetId={data.id} current={content} onClose={() => setWriting(false)} />
      <ReadMarkDialog sheetId={data.id} item={reading} onClose={() => setReading(null)} />
      <ObjectionNoteModal sheetId={data.id} item={noting} onClose={() => setNoting(null)} />
    </div>
  );
}

/** E1 — antrean; DM dipaksa cakupan `ASSESSOR`, HR memilih `ALL`/`ASSESSOR`. Nol pencarian teks (kontrak). */
function SheetQueue({ actor }: { actor: PerfActor }) {
  const navigate = useNavigate();
  const hr = canScopeAllSheets(actor.role);
  const [scope, setScope] = useState<SheetScope>(hr ? 'ALL' : 'ASSESSOR');
  const [period, setPeriod] = useState(ALL_PERIODS);
  const [sort, setSort] = useState<{ by: SortBy; dir: 'ASC' | 'DESC' }>({ by: 'created_at', dir: 'DESC' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const periods = usePeriods(actor, { page: 1, size: 50 }, hr);
  const query: SheetSearch = {
    dataScope: hr ? scope : 'ASSESSOR',
    reviewPeriodId: period === ALL_PERIODS ? undefined : period,
    page,
    size,
    sortBy: sort.by,
    sortDirection: sort.dir,
  };
  const { data, isLoading } = useSheets(actor, query, true);

  return (
    <Card>
      <CardHead
        title="Antrean lembar"
        sub={hr ? 'HR membaca seluruh lembar; lembar yang Anda nilai sendiri ada di pilihan kedua' : 'Lembar yang Anda nilai sebagai pemegang kursi'}
      />
      <div className="flex flex-col">
        <TableToolbar
          filters={
            hr ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <Segmented<SheetScope>
                  value={scope}
                  onChange={(next) => {
                    setScope(next);
                    setPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Semua lembar' },
                    { value: 'ASSESSOR', label: 'Yang saya nilai' },
                  ]}
                />
                <Select
                  value={period}
                  onValueChange={(next) => {
                    setPeriod(next);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-[220px]" aria-label="Periode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PERIODS}>Semua periode</SelectItem>
                    {(periods.data?.rows ?? []).map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.periodName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : undefined
          }
        />
        <DataTable<SheetRow>
          rows={data?.rows ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          empty="Tidak ada lembar pada cakupan ini."
          sort={sort}
          onSortChange={(key) =>
            setSort((prev) =>
              prev.by === key ? { by: key as SortBy, dir: prev.dir === 'ASC' ? 'DESC' : 'ASC' } : { by: key as SortBy, dir: 'DESC' },
            )
          }
          columns={[
            { key: 'employee', header: 'Karyawan', strong: true, render: (row) => row.employeeNameDisplay },
            { key: 'period', header: 'Periode', sortKey: 'review_period_id', render: (row) => <PeriodLabel id={row.reviewPeriodId} /> },
            { key: 'status', header: 'Status', sortKey: 'status', render: (row) => <SheetStatusBadge status={row.status} /> },
            {
              key: 'revision',
              header: 'Revisi',
              render: (row) => (row.hasRevision ? <StatusBadge tone="mute">Ada revisi</StatusBadge> : '—'),
            },
          ]}
          actions={(row) => <RowButton onClick={() => navigate(PERF_PATHS.sheetDetail(row.id))}>View Detail</RowButton>}
        />
        <Pagination
          page={page}
          pageSize={size}
          total={data?.totalData ?? 0}
          noun="sheets"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setSize(next);
            setPage(1);
          }}
        />
      </div>
    </Card>
  );
}

/**
 * Performance › Review Sheets (FSD-001-PERFORMANCE §3 · UIC §4). Karyawan membuka lembarnya sendiri
 * (`D1`); atasan dan HR membuka antrean (`E1`). Super Admin melihat keduanya — lembar "saya" tetap
 * terikat identitasnya sendiri.
 */
export function SheetsPage() {
  const [params] = useSearchParams();
  const linkedId = params.get('id');
  const { actor } = usePerfActor();
  const own = hasOwnSheetSurface(actor.role);
  const queue = canListSheets(actor.role);
  const tabs = [
    ...(own ? [{ value: 'mine' as const, label: 'Lembar saya' }] : []),
    ...(queue ? [{ value: 'queue' as const, label: 'Antrean lembar' }] : []),
  ];
  const fallback: Tab = actor.role === 'ROLE_EMPLOYEE' || (linkedId && own) ? 'mine' : 'queue';
  const [picked, setPicked] = useState<Tab>(fallback);
  const tab = tabs.some((row) => row.value === picked) ? picked : (tabs[0]?.value ?? 'queue');

  return (
    <PageShell
      crumbs={[{ label: 'Performance Management' }, { label: 'Review Sheets' }]}
      title="Review Sheets"
      description="Satu lembar untuk satu karyawan per periode: isian diri, nilai awal atasan tanpa melihat isian itu, lalu penyesuaian dan pengajuan."
      actions={<PerfActorPicker onChange={() => setPicked(usePerfActor.getState().actor.role === 'ROLE_EMPLOYEE' ? 'mine' : 'queue')} />}
    >
      {tabs.length === 0 ? (
        <NoAccess description="Lembar penilaian tidak tersedia untuk peran ini." />
      ) : (
        <div className="flex flex-col gap-5">
          {tabs.length > 1 && <TabMenu<Tab> value={tab} onChange={setPicked} items={tabs} />}
          {tab === 'mine' ? (
            <MySheetPanel key={actor.employeeId} actor={actor} sheetId={linkedId} />
          ) : (
            <SheetQueue key={actor.employeeId} actor={actor} />
          )}
        </div>
      )}
    </PageShell>
  );
}
