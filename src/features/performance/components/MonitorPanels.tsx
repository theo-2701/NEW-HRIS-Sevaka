import { useState } from 'react';
import { Lock, Radio } from 'lucide-react';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banner, PhaseBadge } from '@/features/performance/components/PerfBits';
import { usePeriods } from '@/features/performance/hooks/usePeriods';
import { useReviewHistory, useRoster, useSignalBoard, useSnapshot } from '@/features/performance/hooks/useMonitor';
import { canListPeriods, hasOwnBoard } from '@/features/performance/rules';
import {
  OBJECTION_STATUS_LABEL,
  SIGNAL_GROUP_LABEL,
  type PerfActor,
  type SignalGroup,
  type SnapshotRow,
} from '@/features/performance/types';
import { formatDate, formatDateTime } from '@/lib/format';

const SELF = 'self';
const DEFAULT_PERIOD = 'default';

/** Pemilih "milik siapa": diri sendiri (SELF, EMP/SA) + roster rantai/HR. */
function useSubjectOptions(actor: PerfActor) {
  const roster = useRoster(actor);
  const own = hasOwnBoard(actor.role);
  const options = [
    ...(own ? [{ value: SELF, label: `Saya sendiri (${actor.name})` }] : []),
    ...(roster.data ?? []).map((row) => ({ value: row.employeeId, label: row.name })),
  ];
  return { options, loading: roster.isLoading, fallback: own ? SELF : (roster.data?.[0]?.employeeId ?? '') };
}

function SubjectSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex w-[280px] flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Pilih karyawan" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------- Papan pantau (H1/H2) ----------

const num = (value: number | undefined) => (value ?? 0).toLocaleString('id-ID');
const hours = (minutes: number | undefined) => ((minutes ?? 0) / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 });

/** Rekap ditulis sebagai kalimat hitungan murni — tanpa label baik/buruk (`PF-58`). */
function recapText(group: SignalGroup): string | null {
  const r = group.recap;
  if (!r) return null;
  switch (group.groupKey) {
    case 'ATTENDANCE':
      return `${num(r.late_occurrence_count)} keterlambatan · ${num(r.absent_occurrence_count)} ketidakhadiran`;
    case 'OVERTIME':
      return `${num(r.overtime_hours_total)} jam lembur dibayar · dalam ${num(r.overtime_days_count)} hari`;
    case 'TRANSITION':
      return `${num(r.transition_legal_late_count)} lewat tenggat legal · ${num(r.transition_operational_late_count)} lewat tenggat operasional`;
    case 'PRODUCTIVITY':
      return `${num(r.productivity_task_ontime_count)} dari ${num(r.productivity_task_assigned_count)} tugas tepat waktu`;
    case 'PENDING_DECISION':
      return `${num(r.approval_delay_count)} persetujuan tertunda (${hours(r.approval_delay_minutes_total)} jam) · ${num(
        r.finance_decision_delay_count,
      )} keputusan keuangan · ${num(r.finance_settlement_delay_count)} penyelesaian keuangan`;
    default:
      return null;
  }
}

/** Empat bentuk kosong, empat warna — tidak boleh disamakan (§4.7.1.1). */
function emptyBadge(group: SignalGroup): { tone: BadgeTone; label: string } | null {
  if (group.emptyState === 'NOT_AVAILABLE') return { tone: 'mute', label: 'Sumber tidak menjawab' };
  if (group.emptyState === 'NO_RECORD') return { tone: 'brand', label: 'Tidak ada catatan' };
  if (group.emptyState === 'NO_TASK_ASSIGNED') return { tone: 'info', label: 'Tanpa tugas' };
  const assigned = group.recap?.productivity_task_assigned_count ?? 0;
  if (group.groupKey === 'PRODUCTIVITY' && assigned > 0 && (group.recap?.productivity_task_ontime_count ?? 0) === 0) {
    return { tone: 'warn', label: `0 dari ${assigned}` };
  }
  return null;
}

const DETAIL_LABEL: Record<string, string> = {
  date: 'Tanggal',
  attendance_status: 'Status',
  payable_hours: 'Jam dibayar',
  deadline_class: 'Kelas tenggat',
  is_late: 'Terlambat',
  delay_minutes: 'Tertunda',
  resolution_state: 'Keadaan',
};

const DETAIL_VALUE: Record<string, string> = {
  LATE: 'Terlambat',
  ABSENT: 'Tidak hadir',
  LEGAL: 'Legal',
  OPERATIONAL: 'Operasional',
  RESOLVED: 'Selesai',
  PENDING: 'Masih berjalan',
};

function detailValue(key: string, value: string | number | boolean) {
  if (key === 'date') return formatDate(String(value));
  if (key === 'is_late') return value ? 'Ya' : 'Tidak';
  if (key === 'delay_minutes') return `${hours(Number(value))} jam`;
  if (key === 'payable_hours') return Number(value).toLocaleString('id-ID', { minimumFractionDigits: 1 });
  return DETAIL_VALUE[String(value)] ?? String(value);
}

function SignalCard({ index, group }: { index: number; group: SignalGroup }) {
  const badge = emptyBadge(group);
  const recap = recapText(group);
  const keys = group.details[0] ? Object.keys(group.details[0]) : [];
  return (
    <Card>
      <CardHead
        title={`${index}. ${SIGNAL_GROUP_LABEL[group.groupKey]}`}
        action={badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : undefined}
      />
      <p className="m-0 font-body text-[13.5px] font-semibold text-fg-1">
        {recap ??
          (group.groupKey === 'REPRIMAND'
            ? 'Dibaca langsung dari modul karyawan saat papan dibuka.'
            : group.emptyState === 'NO_TASK_ASSIGNED'
              ? 'Belum pernah diberi tugas pada periode ini — tidak ada pembagi, bukan angka nol.'
              : 'Belum ada rekap untuk periode ini.')}
      </p>
      {group.details.length > 0 && (
        <DataTable<Record<string, string | number | boolean>>
          rows={group.details}
          rowKey={(row, rowIndex) => `${String(row.date)}:${rowIndex}`}
          columns={keys.map((key) => ({
            key,
            header: DETAIL_LABEL[key] ?? key,
            render: (row) => detailValue(key, row[key]),
          }))}
        />
      )}
    </Card>
  );
}

/** H1 (SELF) / H2 (orang lain) — data identik, bedanya endpoint dan jejak akses. */
export function SignalBoardPanel({ actor }: { actor: PerfActor }) {
  const subjects = useSubjectOptions(actor);
  const [picked, setPicked] = useState('');
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const hr = canListPeriods(actor.role);
  const periods = usePeriods(actor, { page: 1, size: 50 }, hr);
  const subject = picked || subjects.fallback;
  const board = useSignalBoard(
    actor,
    subject === SELF ? null : subject,
    period === DEFAULT_PERIOD ? undefined : period,
    Boolean(subject),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <SubjectSelect id="board-subject" label="Papan milik" value={subject} onChange={setPicked} options={subjects.options} />
        {hr && (
          <div className="flex w-[240px] flex-col gap-1">
            <Label htmlFor="board-period">Periode</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="board-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_PERIOD}>Periode berjalan</SelectItem>
                {(periods.data?.rows ?? []).map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.periodName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!subject ? (
        <EmptyState
          title={subjects.loading ? 'Memuat daftar karyawan…' : 'Belum ada papan yang dapat dibuka'}
          description="Papan orang lain hanya untuk atasan pada rantai penilaian dan HR."
        />
      ) : board.isError ? (
        <EmptyState title="Papan tidak ditemukan" description="Karyawan ini di luar rantai penilaian Anda." />
      ) : !board.data ? (
        <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat papan pantau…</p>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display text-[16px] font-bold text-fg-1">{board.data.reviewPeriodName}</span>
                <PhaseBadge phase={board.data.reviewPeriodPhase} />
              </div>
              <span className="font-body text-[12px] font-medium text-fg-3">
                Dihitung {formatDateTime(board.data.computedAt)} — dibaca dari rekap, tidak dihitung ulang di sini
              </span>
            </div>
            <Banner tone="info">{board.data.reprimandDisclaimer}</Banner>
            <div className="flex flex-wrap items-center gap-2 font-body text-[12px] font-medium text-fg-3">
              Arti tanda kosong:
              <StatusBadge tone="warn">0 dari N — temuan nyata</StatusBadge>
              <StatusBadge tone="brand">Tidak ada catatan</StatusBadge>
              <StatusBadge tone="mute">Sumber tidak menjawab</StatusBadge>
              <StatusBadge tone="info">Tanpa tugas</StatusBadge>
            </div>
          </Card>
          {/* Dua kolom bergaya masonry: kartu tanpa tabel tidak lagi melar setinggi kartu bertabel di
              sebelahnya. Urutan baca turun lalu ke kolom kanan; di layar sempit tetap satu kolom berurutan. */}
          <div className="-mb-5 gap-5 xl:columns-2">
            {board.data.groups.map((group, index) => (
              <div key={group.groupKey} className="mb-5 break-inside-avoid">
                <SignalCard index={index + 1} group={group} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Riwayat beku (H3/H4 + PL-05) ----------

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-body text-[13px] font-medium text-fg-3">{label}</dt>
      <dd className="m-0 font-body text-[13px] font-semibold text-fg-1">{children}</dd>
    </>
  );
}

/** Dua kelompok dipisah visual: BEKU (immutable sejak pengesahan) vs HIDUP (menempel, masih bergerak). */
function SnapshotModal({ actor, id, onClose }: { actor: PerfActor; id: string | null; onClose: () => void }) {
  const { data } = useSnapshot(actor, id);
  return (
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Detail revisi beku"
      description="Nilai beku dan catatan hidup yang menempel padanya, sengaja dipisah."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {!data ? (
        <p className="m-0 font-body text-[13px] font-medium text-fg-3">Memuat revisi…</p>
      ) : (
        <div className="grid gap-4">
          <section className="flex flex-col gap-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3.5">
            <div className="flex items-center gap-2">
              <StatusBadge tone="mute">
                <Lock className="size-3" /> Beku
              </StatusBadge>
              <span className="font-body text-[12px] font-medium text-fg-3">Tidak berubah sejak pengesahan</span>
            </div>
            <dl className="m-0 grid grid-cols-[190px_1fr] gap-x-4 gap-y-2">
              <FieldRow label="Revisi">Revisi {data.revisionNo}</FieldRow>
              <FieldRow label="Disahkan">
                {formatDateTime(data.approvedAt)} ({data.approvedAtTimezone})
              </FieldRow>
              <FieldRow label="Golongan">{data.jobGradeNameSnapshot}</FieldRow>
              <FieldRow label="Skala nilai">{data.scaleLength} tingkat</FieldRow>
              <FieldRow label="Tenggat sanggah">{data.objectionDeadlineDaysFrozen} hari — dibekukan saat pengesahan</FieldRow>
              <FieldRow label="Keadaan teguran">
                {data.reprimandStateSnapshot
                  ? `${data.reprimandStateSnapshot.state} · tingkat ${data.reprimandStateSnapshot.standingLevel} · ${data.reprimandStateSnapshot.activePoints} poin aktif — keadaan pada saat pengesahan ${formatDateTime(data.approvedAt)}`
                  : `Tidak tersedia saat pengesahan ${formatDateTime(data.approvedAt)}`}
              </FieldRow>
            </dl>
          </section>
          <section className="flex flex-col gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <StatusBadge tone="info">
                <Radio className="size-3" /> Hidup
              </StatusBadge>
              <span className="font-body text-[12px] font-medium text-fg-3">Menempel, tidak disalin — masih dapat berubah</span>
            </div>
            <dl className="m-0 grid grid-cols-[190px_1fr] gap-x-4 gap-y-2">
              <FieldRow label="Sanggahan">
                {data.objectionSummary ? OBJECTION_STATUS_LABEL[data.objectionSummary.status] : 'Tidak ada sanggahan'}
              </FieldRow>
              <FieldRow label="Rekap kejadian">
                {data.currentIncidentRecapAvailable
                  ? 'Periode ini masih dapat berubah — lihat papan pantau, jangan anggap revisi ini cermin hari ini.'
                  : 'Periode sudah ditutup.'}
              </FieldRow>
            </dl>
          </section>
        </div>
      )}
    </Modal>
  );
}

export function ReviewHistoryPanel({ actor }: { actor: PerfActor }) {
  const subjects = useSubjectOptions(actor);
  const [picked, setPicked] = useState('');
  const [revisions, setRevisions] = useState<'latest' | 'all'>('latest');
  const [viewing, setViewing] = useState<string | null>(null);
  const subject = picked || subjects.fallback;
  const self = subject === SELF;
  const history = useReviewHistory(actor, self ? null : subject, revisions === 'all', Boolean(subject));

  return (
    <Card>
      <CardHead
        title="Riwayat beku"
        sub="Satu baris per lembar yang sudah disahkan; revisi naik satu tiap pengesahan ulang setelah sanggahan"
      />
      {!self && subject && (
        <Banner tone="info">
          Hak baca mengikuti rantai atasan saat ini — atasan lama yang sudah keluar rantai tidak lagi melihat riwayat ini.
        </Banner>
      )}
      {/* Kontrol + tabel satu kelompok: jarak 8px seperti toolbar tabel lain. `self-end` menurunkan
          segmented sejajar kotak pilih, bukan sejajar labelnya. */}
      <div>
      <div className="mb-2 flex flex-wrap items-end gap-3">
        <SubjectSelect id="history-subject" label="Riwayat milik" value={subject} onChange={setPicked} options={subjects.options} />
        <Segmented<'latest' | 'all'>
          className="self-end"
          value={revisions}
          onChange={setRevisions}
          options={[
            { value: 'latest', label: 'Revisi terbaru' },
            { value: 'all', label: 'Semua revisi' },
          ]}
        />
      </div>
      {!subject ? (
        <EmptyState title="Belum ada riwayat yang dapat dibuka" description="Riwayat orang lain hanya untuk atasan pada rantai dan HR." />
      ) : history.isError ? (
        <EmptyState title="Riwayat tidak ditemukan" description="Karyawan ini di luar rantai penilaian Anda saat ini." />
      ) : (
        <DataTable<SnapshotRow>
          rows={history.data?.rows ?? []}
          rowKey={(row) => row.snapshotId}
          loading={history.isLoading}
          empty="Belum ada lembar yang disahkan."
          columns={[
            { key: 'revision', header: 'Revisi', nowrap: true, render: (row) => `Revisi ${row.revisionNo}` },
            self
              ? { key: 'grade', header: 'Golongan', render: (row: SnapshotRow) => row.jobGradeNameSnapshot ?? '—' }
              : { key: 'employee', header: 'Karyawan', strong: true, render: (row: SnapshotRow) => row.employeeName ?? '—' },
            { key: 'approved', header: 'Disahkan', nowrap: true, render: (row) => formatDateTime(row.approvedAt) },
          ]}
          actions={(row) => <RowButton onClick={() => setViewing(row.snapshotId)}>View Detail</RowButton>}
        />
      )}
      </div>
      <SnapshotModal actor={actor} id={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
