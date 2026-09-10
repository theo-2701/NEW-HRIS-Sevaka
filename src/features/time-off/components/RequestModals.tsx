import { useEffect, useState } from 'react';
import { Clock, FileLock2, Info, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Segmented } from '@/components/Segmented';
import { DataTable } from '@/components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  KeyValueList,
  KeyValueRow,
  Note,
  RequestStatusBadge,
  ExtraLayerTag,
} from '@/features/time-off/components/TimeOffBits';
import {
  useDecideRequest,
  useMedicalAccess,
  useOpenDoctorNote,
  useRejectSick,
  useWithdrawRequest,
} from '@/features/time-off/hooks/useTimeOff';
import { sickWindowOpen } from '@/features/time-off/services/time-off.service';
import { employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import {
  ACCESS_PURPOSE_LABEL,
  DEMO_NOW,
  SESSION_LABEL,
  canOpenMedical,
} from '@/features/time-off/types';
import type { AccessPurpose, LeaveRequest, MedicalAccessLog, Session } from '@/features/time-off/types';
import { formatDate, formatDateTime } from '@/lib/format';

type DetailTab = 'detail' | 'medical';

/**
 * Detail pengajuan. Sub-tab **Medical Document Access** hanya ada bila
 * pengajuannya membawa surat dokter (FSD §2.1 F3) — bukan tab tingkat halaman.
 */
export function RequestDetailModal({
  request,
  session,
  onClose,
}: {
  request: LeaveRequest | null;
  session: Session;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('detail');
  const [purpose, setPurpose] = useState<AccessPurpose | ''>('');
  const [revealed, setRevealed] = useState(false);
  const { data: accessLog = [] } = useMedicalAccess();
  const openNote = useOpenDoctorNote(session);

  useEffect(() => {
    if (request) {
      setTab('detail');
      setPurpose('');
      setRevealed(false);
    }
  }, [request]);

  if (!request) return null;

  const type = leaveTypeOf(request.leaveTypeId);
  const rows = accessLog.filter((row) => row.leaveRequestId === request.id);
  const windowOpen = sickWindowOpen(request, DEMO_NOW);
  const allowed = canOpenMedical(session);

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`Request detail — ${request.id}`}
      description="Read-only."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {request.hasDoctorNote && (
          <Segmented<DetailTab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'detail', label: 'Detail' },
              { value: 'medical', label: 'Medical document access' },
            ]}
          />
        )}

        {tab === 'detail' && (
          <>
            <KeyValueList>
              <KeyValueRow label="Karyawan">{employeeName(request.employeeId)}</KeyValueRow>
              <KeyValueRow label="Jenis cuti">{type?.name ?? request.leaveTypeId}</KeyValueRow>
              <KeyValueRow label="Tanggal">
                {formatDate(request.startDate)} – {formatDate(request.endDate)}
              </KeyValueRow>
              <KeyValueRow label="Sesi">{SESSION_LABEL[request.daySession]}</KeyValueRow>
              <KeyValueRow label="Total hari">{request.totalDays}</KeyValueRow>
              <KeyValueRow label="Alasan">{request.reason || '—'}</KeyValueRow>
              <KeyValueRow label="Lapis tambahan">
                <ExtraLayerTag reason={request.extraApprovalReason} />
              </KeyValueRow>
              <KeyValueRow label="Status">
                <RequestStatusBadge status={request.status} />
              </KeyValueRow>
              <KeyValueRow label="Diajukan">{formatDateTime(request.submittedAt)}</KeyValueRow>
              {request.rejectReason && <KeyValueRow label="Alasan penolakan">{request.rejectReason}</KeyValueRow>}
            </KeyValueList>

            {request.rejectDeadlineAt && (
              <Note tone={windowOpen ? 'warn' : 'info'} icon={<Clock />}>
                {windowOpen ? (
                  <>
                    Jendela tolak tertutup <strong>{formatDateTime(request.rejectDeadlineAt)}</strong> — dibekukan
                    saat pengajuan. Menolak di dalamnya membalik saldo dan status harinya.
                  </>
                ) : (
                  <>
                    Jendela tolak sudah tertutup pada <strong>{formatDateTime(request.rejectDeadlineAt)}</strong>.
                    Cuti sakit ini permanen — penolakan setelahnya ditolak <code>422</code>.
                  </>
                )}
              </Note>
            )}
          </>
        )}

        {tab === 'medical' && (
          <>
            <Note tone={allowed ? 'info' : 'warn'} icon={<ShieldAlert />}>
              {allowed ? (
                <>
                  Membuka surat dokter menulis <strong>jejak akses lebih dulu</strong>, baru isinya ditampilkan.
                  Tujuan akses wajib dipilih.
                </>
              ) : (
                <>
                  Peran Anda tidak berhak membuka surat dokter — permintaan dijawab <code>403</code> dan{' '}
                  <strong>tidak</strong> menghasilkan baris jejak.
                </>
              )}
            </Note>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                <Label htmlFor="access-purpose">Tujuan akses</Label>
                <Select value={purpose} onValueChange={(value) => setPurpose(value as AccessPurpose)}>
                  <SelectTrigger id="access-purpose" disabled={!allowed}>
                    <SelectValue placeholder="Pilih tujuan akses" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCESS_PURPOSE_LABEL) as AccessPurpose[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {ACCESS_PURPOSE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!allowed || !purpose || openNote.isPending}
                onClick={() =>
                  purpose &&
                  openNote.mutate(
                    { id: request.id, purpose },
                    { onSuccess: () => setRevealed(true) },
                  )
                }
              >
                {openNote.isPending ? 'Membuka…' : "Open doctor's note"}
              </Button>
            </div>

            {revealed && (
              <Note icon={<FileLock2 />}>
                Surat dokter dibuka. Isi berkas belum tersedia selama mekanisme unggah HRIS masih tertunda —
                yang berjalan penuh di sini adalah jejak aksesnya.
              </Note>
            )}

            <DataTable<MedicalAccessLog>
              rows={rows}
              rowKey={(row) => row.id}
              empty="Belum ada jejak akses untuk pengajuan ini."
              columns={[
                {
                  key: 'time',
                  header: 'Access time',
                  nowrap: true,
                  render: (row) => formatDateTime(row.createdAt),
                },
                { key: 'by', header: 'Opened by', render: (row) => employeeName(row.accessedBy) },
                { key: 'purpose', header: 'Purpose', muted: true, render: (row) => ACCESS_PURPOSE_LABEL[row.purpose] },
              ]}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

/** Keputusan approver — menyetujui boleh tanpa catatan, menolak wajib beralasan. */
export function DecisionModal({
  request,
  session,
  onClose,
}: {
  request: LeaveRequest | null;
  session: Session;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const decide = useDecideRequest(session);

  useEffect(() => {
    if (request) setNote('');
  }, [request]);

  if (!request) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`Leave approval — ${request.id}`}
      description="Menyetujui boleh membawa catatan; menolak wajib beralasan. Keduanya dijawab 200 diterima — status final ditulis setelah proses persetujuan selesai."
      footer={
        <>
          <Button
            variant="danger"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate({ id: request.id, decision: 'REJECTED', note }, { onSuccess: onClose })
            }
          >
            Reject
          </Button>
          <Button
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate({ id: request.id, decision: 'APPROVED', note }, { onSuccess: onClose })
            }
          >
            {decide.isPending ? 'Memproses…' : 'Approve'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Karyawan">{employeeName(request.employeeId)}</KeyValueRow>
          <KeyValueRow label="Jenis cuti">{leaveTypeOf(request.leaveTypeId)?.name}</KeyValueRow>
          <KeyValueRow label="Tanggal">
            {formatDate(request.startDate)} – {formatDate(request.endDate)}
          </KeyValueRow>
          <KeyValueRow label="Total hari">{request.totalDays}</KeyValueRow>
          <KeyValueRow label="Alasan">{request.reason || '—'}</KeyValueRow>
          <KeyValueRow label="Lapis tambahan">
            <ExtraLayerTag reason={request.extraApprovalReason} />
          </KeyValueRow>
          <KeyValueRow label="Pemisahan tugas">
            {employeeName(session.employeeId)} ≠ {employeeName(request.employeeId)} — keputusan tersedia
          </KeyValueRow>
        </KeyValueList>

        <div className="flex flex-col gap-1">
          <Label htmlFor="decision-note">Catatan keputusan</Label>
          <Textarea
            id="decision-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Wajib diisi bila menolak"
          />
        </div>
      </div>
    </Modal>
  );
}

/** Tolak cuti sakit — hanya selagi jendela beku masih terbuka. */
export function SickRejectModal({
  request,
  session,
  onClose,
}: {
  request: LeaveRequest | null;
  session: Session;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const reject = useRejectSick(session);

  useEffect(() => {
    if (request) setReason('');
  }, [request]);

  if (!request) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title="Reject sick leave"
      description="Hanya tersedia di dalam jendela tolak yang dibekukan. Menolak membalik apa yang sudah berlaku — saldo dikembalikan dan harinya jatuh jadi absen."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length === 0 || reject.isPending}
            onClick={() => reject.mutate({ id: request.id, reason }, { onSuccess: onClose })}
          >
            {reject.isPending ? 'Memproses…' : 'Reject sick leave'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Karyawan">{employeeName(request.employeeId)}</KeyValueRow>
          <KeyValueRow label="Tanggal">
            {formatDate(request.startDate)} – {formatDate(request.endDate)}
          </KeyValueRow>
          <KeyValueRow label="Surat dokter">{request.hasDoctorNote ? 'Tersedia' : '—'}</KeyValueRow>
          <KeyValueRow label="Jendela tertutup">
            {request.rejectDeadlineAt ? formatDateTime(request.rejectDeadlineAt) : '—'}
          </KeyValueRow>
        </KeyValueList>

        <div className="flex flex-col gap-1">
          <Label htmlFor="sick-reason">
            Alasan penolakan<em>*</em>
          </Label>
          <Textarea
            id="sick-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Wajib diisi"
          />
        </div>
      </div>
    </Modal>
  );
}

/** Penarikan pengajuan — status berubah ke CANCELLED, baris tetap ada. */
export function WithdrawModal({
  request,
  session,
  onClose,
}: {
  request: LeaveRequest | null;
  session: Session;
  onClose: () => void;
}) {
  const withdraw = useWithdrawRequest(session);

  if (!request) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title="Withdraw this request?"
      description="Boleh selagi menunggu atau otomatis disetujui, dan — setelah disetujui — hanya sebelum tanggal mulainya tiba."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep request
          </Button>
          <Button
            variant="danger"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate({ id: request.id }, { onSuccess: onClose })}
          >
            {withdraw.isPending ? 'Memproses…' : 'Withdraw request'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Pengajuan">{request.id}</KeyValueRow>
          <KeyValueRow label="Tanggal">
            {formatDate(request.startDate)} – {formatDate(request.endDate)}
          </KeyValueRow>
          <KeyValueRow label="Status">
            <RequestStatusBadge status={request.status} />
          </KeyValueRow>
        </KeyValueList>

        <Note icon={<Info />}>
          Penarikan adalah <strong>transisi status</strong>, bukan penghapusan: barisnya tetap ada dengan status
          CANCELLED, saldo dipulihkan, dan delegasi yang menempel ikut dibatalkan.
        </Note>
      </div>
    </Modal>
  );
}
