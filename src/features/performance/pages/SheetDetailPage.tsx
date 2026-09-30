import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { RowActions, RowButton, type RowAction } from '@/components/RowActions';
import { TabMenu } from '@/components/TabMenu';
import { Button } from '@/components/ui/button';
import {
  Banner,
  Field,
  OriginBadge,
  PerfActorPicker,
  PeriodLabel,
  SheetStatusBadge,
} from '@/features/performance/components/PerfBits';
import {
  AddAdditionalLineModal,
  AddMasterLineModal,
  DeleteLineDialog,
  EditLineModal,
  SubmitSheetDialog,
  ValueModal,
} from '@/features/performance/components/SheetModals';
import { formatWeight, shortId } from '@/features/performance/format';
import { RoundsTable } from '@/features/performance/components/ApprovalModals';
import { useApprovalRounds } from '@/features/performance/hooks/useApprovals';
import { useSelfAssessment, useSheet, useSupervisorHistory } from '@/features/performance/hooks/useSheets';
import { canReadHistoryAsHr, selfAssessmentOpen } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  PERF_PATHS,
  SHEET_EDITABLE,
  type SheetItem,
  type SupervisorHistoryRow,
} from '@/features/performance/types';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'lines' | 'history' | 'approvals';

const percent = (value: number) => `${formatWeight(value)}%`;

/**
 * Detail lembar (FSD-001-PERFORMANCE §3.2–§3.6, `E2`–`E6`). Satu layar untuk nilai awal buta,
 * isian terbuka + penyesuaian, CRUD baris, riwayat penilai, dan tombol Ajukan. Aksi tulis hanya
 * untuk penilai pemegang kursi; HR dan rantai di atas penilai membaca saja.
 */
export function SheetDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') ?? undefined;
  const { actor } = usePerfActor();
  const [tab, setTab] = useState<Tab>('lines');
  const [adding, setAdding] = useState<'master' | 'additional' | null>(null);
  const [valuing, setValuing] = useState<{ item: SheetItem; kind: 'initial' | 'submitted' } | null>(null);
  const [editing, setEditing] = useState<SheetItem | null>(null);
  const [deleting, setDeleting] = useState<SheetItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: sheet, isLoading, isError } = useSheet(actor, id);
  const holder = Boolean(sheet) && sheet!.assessorId === actor.employeeId;
  const canHistory = actor.role === 'ROLE_SUPER_ADMIN' || canReadHistoryAsHr(actor.role) || holder;
  const history = useSupervisorHistory(actor, id, canHistory && Boolean(sheet));
  /* `P4.03` menentukan sendiri siapa yang terlibat — tab tampil hanya bila server mengizinkan. */
  const rounds = useApprovalRounds(actor, id, Boolean(sheet) && sheet!.employeeId !== actor.employeeId);
  const open = sheet ? selfAssessmentOpen(sheet.items) : false;
  const self = useSelfAssessment(actor, id, holder && open);

  const crumbs = [
    { label: 'Performance Management' },
    { label: 'Review Sheets', to: PERF_PATHS.sheets },
    { label: sheet?.employeeNameDisplay ?? 'Detail' },
  ];

  if (!id || isError) {
    return (
      <PageShell crumbs={crumbs} title="Sheet detail" actions={<PerfActorPicker />}>
        <EmptyState
          title="Lembar tidak ditemukan"
          description="Lembar tidak ada atau di luar cakupan baca Anda."
          action={<Button onClick={() => navigate(PERF_PATHS.sheets)}>Kembali ke daftar</Button>}
        />
      </PageShell>
    );
  }
  if (isLoading || !sheet) {
    return (
      <PageShell crumbs={crumbs} title="Sheet detail" actions={<PerfActorPicker />}>
        <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat lembar…</p>
      </PageShell>
    );
  }
  /* Pemilik lembar memakai permukaan SELF (D1), bukan layar atasan. */
  if (sheet.employeeId === actor.employeeId) return <Navigate to={`${PERF_PATHS.sheets}?id=${sheet.id}`} replace />;

  const editable = SHEET_EDITABLE.includes(sheet.status);
  const inProgress = sheet.status === 'IN_PROGRESS';
  const filled = sheet.items.filter((row) => row.initialValueRecordedAt).length;
  const total = sheet.items.reduce((sum, row) => sum + row.rawWeight, 0);
  const extra = sheet.items.filter((row) => row.origin === 'ADDITIONAL').reduce((sum, row) => sum + row.rawWeight, 0);
  const share = percent(total ? (extra / total) * 100 : 0);
  const current = history.data?.find((row) => !row.validUntil);

  const lineActions = (row: SheetItem) => {
    const actions: RowAction[] = [];
    if (editable && !row.initialValueRecordedAt) {
      actions.push({ label: 'Isi nilai awal', onSelect: () => setValuing({ item: row, kind: 'initial' }) });
    }
    if (editable && open) actions.push({ label: 'Sesuaikan nilai', onSelect: () => setValuing({ item: row, kind: 'submitted' }) });
    if (inProgress) actions.push({ label: 'Ubah baris', onSelect: () => setEditing(row) });
    if (inProgress && row.origin === 'ADDITIONAL') {
      actions.push({ label: 'Hapus baris', danger: true, onSelect: () => setDeleting(row) });
    }
    if (actions.length === 0) return null;
    return actions.length === 1 ? (
      <RowButton onClick={actions[0].onSelect}>{actions[0].label}</RowButton>
    ) : (
      <RowActions actions={actions} />
    );
  };

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title={sheet.employeeNameDisplay}
        description="Lembar penilaian satu karyawan untuk satu periode."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <PerfActorPicker onChange={() => setTab('lines')} />
            {holder && editable && (
              <Button onClick={() => setSubmitting(true)}>
                {sheet.status === 'RETURNED_TO_ASSESSOR' ? 'Ajukan ulang' : 'Ajukan lembar'}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Card>
            <CardHead title="Ringkasan" />
            <dl className="m-0 grid grid-cols-[200px_1fr] gap-x-4 gap-y-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3.5">
              <Field label="Status">
                <SheetStatusBadge status={sheet.status} />
              </Field>
              <Field label="Periode">
                <PeriodLabel id={sheet.reviewPeriodId} />
              </Field>
              {current && (
                <Field label="Penilai pemegang kursi">
                  {current.supervisorNameDisplay}
                  {sheet.supervisorTransferred && <span className="ml-2 font-medium text-fg-3">(pernah berpindah)</span>}
                </Field>
              )}
              <Field label="Isian diri karyawan">{sheet.selfAssessmentFilled ? 'Sudah ditulis' : 'Belum ditulis'}</Field>
              <Field label="Instans alur kerja">
                {sheet.processInstanceId ? (
                  <span title={sheet.processInstanceId} className="font-mono text-[12px]">
                    {shortId(sheet.processInstanceId)}
                  </span>
                ) : (
                  <span className="font-medium text-fg-3">Belum diajukan</span>
                )}
              </Field>
              <Field label="Revisi">{sheet.hasRevision ? 'Ada revisi' : 'Tidak ada'}</Field>
            </dl>
          </Card>

          {holder && (
            <Card>
              <CardHead title="Isian penilaian diri karyawan" />
              {open ? (
                <Banner tone="ok">
                  Isian TERBUKA — seluruh baris sudah punya nilai awal, jadi isian karyawan terbuka otomatis. Sesuaikan nilai
                  bila perlu, lalu ajukan lembar.
                </Banner>
              ) : (
                <Banner tone="warn">
                  Isian TERKUNCI — {filled} dari {sheet.items.length} nilai awal terisi. Isian karyawan terbuka otomatis setelah
                  seluruh baris punya nilai awal.
                </Banner>
              )}
              {open ? (
                self.data ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="m-0 whitespace-pre-line font-body text-[13.5px] font-medium leading-relaxed text-fg-1">
                      {self.data.content}
                    </p>
                    <p className="m-0 font-body text-[12px] font-medium text-fg-3">Dikirim {formatDateTime(self.data.submittedAt)}</p>
                  </div>
                ) : (
                  <p className="m-0 font-body text-[13px] font-medium text-fg-3">
                    {self.isLoading ? 'Memuat isian…' : 'Karyawan belum menulis isian diri.'}
                  </p>
                )
              ) : (
                <p className="m-0 flex items-center gap-2 font-body text-[13px] font-medium text-fg-3">
                  <Lock className="size-3.5" />
                  Tersembunyi sampai seluruh nilai awal tercatat.
                </p>
              )}
            </Card>
          )}

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'lines', label: 'Baris nilai', count: sheet.items.length },
              ...(canHistory ? [{ value: 'history' as const, label: 'Riwayat penilai', count: history.data?.length }] : []),
              ...(rounds.data ? [{ value: 'approvals' as const, label: 'Riwayat persetujuan', count: rounds.data.length }] : []),
            ]}
          />

          {tab === 'lines' && (
            <Card>
              <CardHead
                title="Baris nilai"
                sub={`Porsi baris tambahan ${share} dari total bobot ${formatWeight(total)}`}
                action={
                  holder && inProgress ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setAdding('master')}>
                        Tambah dari daftar induk
                      </Button>
                      <Button variant="secondary" onClick={() => setAdding('additional')}>
                        Tambah baris tambahan
                      </Button>
                    </div>
                  ) : undefined
                }
              />
              <DataTable<SheetItem>
                rows={sheet.items}
                rowKey={(row) => row.id}
                empty="Belum ada baris nilai."
                columns={[
                  { key: 'name', header: 'Item', strong: true, render: (row) => row.itemNameSnapshot },
                  { key: 'origin', header: 'Asal', render: (row) => <OriginBadge origin={row.origin} /> },
                  { key: 'target', header: 'Target', render: (row) => row.target },
                  {
                    key: 'initial',
                    header: 'Nilai awal',
                    render: (row) =>
                      row.initialValue ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Lock className="size-3.5 shrink-0 text-fg-3" />
                          {row.initialValue}
                        </span>
                      ) : (
                        '—'
                      ),
                  },
                  { key: 'submitted', header: 'Penyesuaian', render: (row) => row.submittedValue ?? '—' },
                  {
                    key: 'read',
                    header: 'Dibaca karyawan',
                    muted: true,
                    render: (row) => (row.employeeReadAt ? formatDate(row.employeeReadAt) : 'Belum'),
                  },
                  { key: 'note', header: 'Catatan keberatan', muted: true, render: (row) => row.employeeObjectionNote ?? '—' },
                  {
                    key: 'weight',
                    header: 'Bobot mentah',
                    align: 'right',
                    render: (row) => (
                      <span className="inline-flex items-center justify-end gap-1.5 tabular-nums">
                        {row.origin === 'MASTER' && <Lock className="size-3.5 shrink-0 text-fg-3" aria-label="Dikunci HR" />}
                        {formatWeight(row.rawWeight)}
                      </span>
                    ),
                  },
                  {
                    key: 'frozen',
                    header: 'Porsi beku',
                    align: 'right',
                    render: (row) => (
                      <span className="tabular-nums">{row.frozenWeightRatio === null ? '—' : percent(row.frozenWeightRatio)}</span>
                    ),
                  },
                ]}
                actions={holder && editable ? lineActions : undefined}
              />
              {inProgress && (
                <p className="m-0 font-body text-[12px] font-medium text-fg-3">
                  Porsi beku terisi permanen saat lembar diajukan; sejak itu bobot tidak dapat diubah.
                </p>
              )}
            </Card>
          )}

          {tab === 'approvals' && rounds.data && (
            <Card>
              <CardHead title="Riwayat persetujuan" sub="Seluruh putaran persetujuan lembar ini, urut waktu pengajuan" />
              <RoundsTable rows={rounds.data} />
            </Card>
          )}

          {tab === 'history' && canHistory && (
            <Card>
              <CardHead title="Riwayat penilai" sub="Urut dari tanggal mulai berlaku" />
              {sheet.supervisorTransferred && (
                <Banner tone="info">Penilai lembar ini pernah berpindah — nilai yang ada ditulis oleh pemegang kursi saat itu.</Banner>
              )}
              <DataTable<SupervisorHistoryRow>
                rows={history.data ?? []}
                rowKey={(row) => `${row.supervisorEmployeeId}:${row.validFrom}`}
                loading={history.isLoading}
                empty="Belum ada riwayat penilai."
                columns={[
                  { key: 'name', header: 'Penilai', strong: true, render: (row) => row.supervisorNameDisplay },
                  { key: 'from', header: 'Berlaku dari', render: (row) => formatDate(row.validFrom) },
                  { key: 'until', header: 'Berlaku sampai', render: (row) => (row.validUntil ? formatDate(row.validUntil) : 'Sekarang') },
                  { key: 'note', header: 'Catatan serah terima', muted: true, render: (row) => row.handoverNote ?? '—' },
                ]}
              />
            </Card>
          )}
        </div>
      </PageShell>

      <AddMasterLineModal open={adding === 'master'} sheetId={sheet.id} onClose={() => setAdding(null)} />
      <AddAdditionalLineModal
        open={adding === 'additional'}
        sheetId={sheet.id}
        currentShare={share}
        onClose={() => setAdding(null)}
      />
      <ValueModal sheetId={sheet.id} target={valuing} onClose={() => setValuing(null)} />
      <EditLineModal sheetId={sheet.id} item={editing} onClose={() => setEditing(null)} />
      <DeleteLineDialog sheetId={sheet.id} item={deleting} onClose={() => setDeleting(null)} />
      <SubmitSheetDialog
        open={submitting}
        sheetId={sheet.id}
        resubmit={sheet.status === 'RETURNED_TO_ASSESSOR'}
        onClose={() => setSubmitting(false)}
      />
    </>
  );
}
