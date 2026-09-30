import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { TabMenu } from '@/components/TabMenu';
import { Button } from '@/components/ui/button';
import {
  AnswerObjectionModal,
  CreateObjectionModal,
  HolderCell,
  ObjectionDetailModal,
  ObjectionStatusBadge,
  ReopenWindowModal,
  SubjectBadge,
} from '@/features/performance/components/ObjectionModals';
import { NoAccess, PerfActorPicker, SheetStatusBadge } from '@/features/performance/components/PerfBits';
import { displayName } from '@/features/performance/format';
import { useApprovalRounds } from '@/features/performance/hooks/useApprovals';
import {
  useDeadlineDays,
  useMyObjections,
  useObjections,
  useReopenWindows,
} from '@/features/performance/hooks/useObjections';
import { useMySheetId, useSheet, useSheets } from '@/features/performance/hooks/useSheets';
import {
  canReopenWindow,
  canSearchObjections,
  canSeeHrObjections,
  hasOwnObjectionSurface,
} from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import type {
  ObjectionRow,
  ObjectionSearch,
  ObjectionSubject,
  PerfActor,
  PerfRole,
  ReopenWindow,
} from '@/features/performance/types';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'mine' | 'incoming' | 'hr' | 'windows';

const isSuper = (role: PerfRole) => role === 'ROLE_SUPER_ADMIN';

/** FSD Matriks B — tiap peran mulai di tab yang ia berhak, bukan tab pertama secara fisik. */
const defaultTab = (role: PerfRole): Tab =>
  role === 'ROLE_EMPLOYEE' ? 'mine' : role === 'ROLE_DEPT_MANAGER' ? 'incoming' : 'hr';

/** G1/G2 + tabel "Milik saya" (`P5.04`). */
function MyObjections({ actor }: { actor: PerfActor }) {
  const mineId = useMySheetId(actor, true);
  const sheet = useSheet(actor, mineId.data ?? null);
  const rounds = useApprovalRounds(actor, sheet.data?.id, sheet.data?.status === 'REJECTED_FINAL');
  const days = useDeadlineDays(true);
  const list = useMyObjections(actor, true);
  const [subject, setSubject] = useState<ObjectionSubject | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const rejected = [...(rounds.data ?? [])].reverse().find((row) => row.outcome === 'REJECTED_FINAL') ?? null;
  const data = sheet.data;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHead
          title="Ajukan sanggahan"
          sub={
            days.data !== undefined
              ? `Diajukan paling lambat ${days.data} hari sejak keputusan; sesudahnya hanya bila HR membuka kembali jendela.`
              : undefined
          }
          action={
            data?.status === 'APPROVED' ? (
              <Button onClick={() => setSubject('VALUE')}>Sanggah nilai disahkan</Button>
            ) : data?.status === 'REJECTED_FINAL' && rejected ? (
              <Button onClick={() => setSubject('REJECTED_FINAL')}>Sanggah tolak final</Button>
            ) : undefined
          }
        />
        {!data ? (
          <p className="m-0 font-body text-[13px] font-medium text-fg-3">
            {mineId.isLoading || sheet.isLoading ? 'Memuat lembar…' : 'Anda belum memiliki lembar penilaian.'}
          </p>
        ) : (
          <p className="m-0 flex flex-wrap items-center gap-2 font-body text-[13px] font-medium text-fg-2">
            Status lembar Anda <SheetStatusBadge status={data.status} />
            {data.status !== 'APPROVED' && data.status !== 'REJECTED_FINAL' &&
              '— sanggahan dapat diajukan setelah lembar disetujui atau ditolak final.'}
          </p>
        )}
      </Card>

      <Card>
        <CardHead title="Milik saya" sub="Sanggahan yang pernah Anda ajukan" />
        <DataTable<ObjectionRow>
          rows={list.data ?? []}
          rowKey={(row) => row.id}
          loading={list.isLoading}
          empty="Anda belum pernah mengajukan sanggahan."
          columns={[
            { key: 'subject', header: 'Jenis', render: (row) => <SubjectBadge subject={row.subjectType} /> },
            { key: 'status', header: 'Status', render: (row) => <ObjectionStatusBadge status={row.status} /> },
            { key: 'holder', header: 'Pemikul aktif', render: (row) => <HolderCell holder={row.currentHolder} /> },
            { key: 'submitted', header: 'Diajukan', nowrap: true, render: (row) => formatDateTime(row.submittedAt) },
          ]}
          actions={(row) => <RowButton onClick={() => setViewing(row.id)}>View Detail</RowButton>}
        />
      </Card>

      {data && (
        <CreateObjectionModal subject={subject} sheetId={data.id} round={rejected} onClose={() => setSubject(null)} />
      )}
      <ObjectionDetailModal id={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/** Grid `P5.03` bersama G3 (holder = pemanggil) dan G5 (HR, company-wide, hanya belum dijawab). */
function ObjectionGrid({ actor, mode }: { actor: PerfActor; mode: 'incoming' | 'hr' }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<{ by: 'submitted_at' | 'status'; dir: 'ASC' | 'DESC' }>({ by: 'submitted_at', dir: 'DESC' });
  const [viewing, setViewing] = useState<string | null>(null);
  const [answering, setAnswering] = useState<ObjectionRow | null>(null);
  const [reopening, setReopening] = useState(false);
  const query: ObjectionSearch = {
    ...(mode === 'hr' ? { status: 'SUBMITTED' as const } : { holderEmployeeId: actor.employeeId }),
    page,
    size,
    sortBy: sort.by,
    sortDirection: sort.dir,
  };
  const { data, isLoading } = useObjections(actor, query, true);
  const hrWriter = isSuper(actor.role) || canReopenWindow(actor.role);

  return (
    <Card>
      <CardHead
        title={mode === 'hr' ? 'Sanggahan belum dijawab' : 'Sanggahan masuk'}
        sub={
          mode === 'hr'
            ? 'Seluruh company, hanya yang belum dijawab — HR memantau, tidak menjawab dari sini'
            : 'Sanggahan yang dibebankan kepada Anda sebagai pemikul kewajiban menjawab'
        }
        action={mode === 'hr' && hrWriter ? <Button onClick={() => setReopening(true)}>Buka kembali jendela</Button> : undefined}
      />
      <div className="flex flex-col">
        <DataTable<ObjectionRow>
          rows={data?.rows ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          empty={mode === 'hr' ? 'Tidak ada sanggahan yang belum dijawab.' : 'Tidak ada sanggahan untuk Anda.'}
          sort={sort}
          onSortChange={(key) =>
            setSort((prev) =>
              prev.by === key
                ? { by: prev.by, dir: prev.dir === 'ASC' ? 'DESC' : 'ASC' }
                : { by: key as 'submitted_at' | 'status', dir: 'DESC' },
            )
          }
          columns={[
            { key: 'subject', header: 'Jenis', render: (row) => <SubjectBadge subject={row.subjectType} /> },
            ...(mode === 'incoming'
              ? [{ key: 'status', header: 'Status', sortKey: 'status', render: (row: ObjectionRow) => <ObjectionStatusBadge status={row.status} /> }]
              : []),
            { key: 'by', header: 'Pengaju', strong: true, render: (row) => displayName(row.submittedByEmployeeId) },
            ...(mode === 'hr'
              ? [{ key: 'holder', header: 'Pemikul aktif', render: (row: ObjectionRow) => <HolderCell holder={row.currentHolder} /> }]
              : []),
            {
              key: 'submitted',
              header: 'Diajukan',
              sortKey: 'submitted_at',
              nowrap: true,
              render: (row) => formatDateTime(row.submittedAt),
            },
          ]}
          actions={(row) =>
            mode === 'hr' ? (
              <RowButton onClick={() => setViewing(row.id)}>View Detail</RowButton>
            ) : (
              <RowActions
                actions={[
                  { label: 'View Detail', onSelect: () => setViewing(row.id) },
                  { label: 'Jawab', disabled: row.status !== 'SUBMITTED', onSelect: () => setAnswering(row) },
                ]}
              />
            )
          }
        />
        <Pagination
          page={page}
          pageSize={size}
          total={data?.totalData ?? 0}
          noun="objections"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setSize(next);
            setPage(1);
          }}
        />
      </div>
      <ObjectionDetailModal id={viewing} onClose={() => setViewing(null)} />
      <AnswerObjectionModal row={answering} onClose={() => setAnswering(null)} />
      <ReopenWindowModal open={reopening} onClose={() => setReopening(false)} />
    </Card>
  );
}

/** G6 — riwayat pembukaan jendela (HR baca), form Create hanya HR Manager. */
function ReopenHistory({ actor }: { actor: PerfActor }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [reopening, setReopening] = useState(false);
  const { data, isLoading } = useReopenWindows(actor, { page, size }, true);
  const sheets = useSheets(actor, { dataScope: 'ALL', page: 1, size: 100 }, true);
  const nameOfSheet = (id: string) => sheets.data?.rows.find((row) => row.id === id)?.employeeNameDisplay ?? '—';
  const writer = isSuper(actor.role) || canReopenWindow(actor.role);

  return (
    <Card>
      <CardHead
        title="Riwayat pembukaan jendela"
        sub="Tanpa batas jumlah pembukaan — jejaknya yang menjadi penahan"
        action={writer ? <Button onClick={() => setReopening(true)}>Buka kembali jendela</Button> : undefined}
      />
      <div className="flex flex-col">
        <DataTable<ReopenWindow>
          rows={data?.rows ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          empty="Belum pernah ada jendela yang dibuka kembali."
          columns={[
            { key: 'employee', header: 'Karyawan', strong: true, render: (row) => nameOfSheet(row.reviewSheetId) },
            { key: 'by', header: 'Dibuka oleh', render: (row) => displayName(row.openedByEmployeeId) },
            { key: 'opened', header: 'Dibuka', nowrap: true, render: (row) => formatDateTime(row.openedAt) },
            { key: 'deadline', header: 'Tenggat baru', nowrap: true, render: (row) => formatDate(row.newDeadlineAt) },
            { key: 'reason', header: 'Alasan', muted: true, render: (row) => row.reason ?? '—' },
          ]}
        />
        <Pagination
          page={page}
          pageSize={size}
          total={data?.totalData ?? 0}
          noun="windows"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setSize(next);
            setPage(1);
          }}
        />
      </div>
      <ReopenWindowModal open={reopening} onClose={() => setReopening(false)} />
    </Card>
  );
}

/**
 * Performance › Objections (FSD-001-PERFORMANCE §5 · UIC §6). Sanggahan berbeda dari "catatan keberatan"
 * per baris di lembar: ia menunggu jawaban pemikul kewajiban dan punya tenggat.
 */
export function ObjectionsPage() {
  const { actor } = usePerfActor();
  const role = actor.role;
  const tabs = [
    ...(hasOwnObjectionSurface(role) ? [{ value: 'mine' as const, label: 'Sanggahan saya' }] : []),
    ...(canSearchObjections(role) ? [{ value: 'incoming' as const, label: 'Sanggahan masuk' }] : []),
    ...(isSuper(role) || canSeeHrObjections(role) ? [{ value: 'hr' as const, label: 'HR: Belum dijawab' }] : []),
    ...(isSuper(role) || canSeeHrObjections(role) ? [{ value: 'windows' as const, label: 'Buka kembali jendela' }] : []),
  ];
  const [picked, setPicked] = useState<Tab>(defaultTab(role));
  const tab = tabs.some((row) => row.value === picked) ? picked : (tabs[0]?.value ?? 'mine');

  return (
    <PageShell
      crumbs={[{ label: 'Performance Management' }, { label: 'Objections' }]}
      title="Objections"
      description="Sanggahan atas nilai yang sudah disahkan atau atas keputusan tolak final, dijawab oleh pemikul kewajiban yang ditentukan sistem."
      actions={<PerfActorPicker onChange={() => setPicked(defaultTab(usePerfActor.getState().actor.role))} />}
    >
      {tabs.length === 0 ? (
        <NoAccess description="Sanggahan tidak tersedia untuk peran ini." />
      ) : (
        <div className="flex flex-col gap-5">
          {tabs.length > 1 && <TabMenu<Tab> value={tab} onChange={setPicked} items={tabs} />}
          {tab === 'mine' && <MyObjections key={actor.employeeId} actor={actor} />}
          {tab === 'incoming' && <ObjectionGrid key={`in:${actor.employeeId}`} actor={actor} mode="incoming" />}
          {tab === 'hr' && <ObjectionGrid key={`hr:${actor.employeeId}`} actor={actor} mode="hr" />}
          {tab === 'windows' && <ReopenHistory key={actor.employeeId} actor={actor} />}
        </div>
      )}
    </PageShell>
  );
}
