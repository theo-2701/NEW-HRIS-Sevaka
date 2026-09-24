import { useEffect, useState } from 'react';
import { Clock, Info, ShieldAlert } from 'lucide-react';
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
  REJECT_NOTE_MAX,
  REJECT_REASON_LABEL,
  SESSION_LABEL,
  canOpenMedical,
} from '@/features/time-off/types';
import type {
  AccessPurpose,
  LeaveRequest,
  MedicalAccessLog,
  RejectInput,
  RejectReasonCode,
  Session,
} from '@/features/time-off/types';
import { formatDate, formatDateTime } from '@/lib/format';

type DetailTab = 'detail' | 'medical';

const EMPTY_REJECT: RejectInput = { reason: '', note: '' };

/** Panel keputusan: alasan penolakan dari enum 15 nilai + catatan tambahan opsional (FSD-001-TIME §2.2). */
function RejectFields({
  value,
  onChange,
  reasonLabel,
}: {
  value: RejectInput;
  onChange: (next: RejectInput) => void;
  reasonLabel: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="reject-reason">{reasonLabel}</Label>
        <Select value={value.reason} onValueChange={(reason) => onChange({ ...value, reason: reason as RejectReasonCode })}>
          <SelectTrigger id="reject-reason">
            <SelectValue placeholder="Pilih alasan penolakan" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(REJECT_REASON_LABEL) as RejectReasonCode[]).map((code) => (
              <SelectItem key={code} value={code}>
                {REJECT_REASON_LABEL[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 md:col-span-2">
        <Label htmlFor="reject-note">Catatan tambahan (opsional)</Label>
        <Textarea
          id="reject-note"
          rows={3}
          maxLength={REJECT_NOTE_MAX}
          value={value.note}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
        />
        <span className="self-end font-body text-[11px] font-medium text-fg-4">
          {value.note.length}/{REJECT_NOTE_MAX}
        </span>
      </div>
    </div>
  );
}

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
  const { data: accessLog = [] } = useMedicalAccess();
  const openNote = useOpenDoctorNote(session);

  useEffect(() => {
    if (request) {
      setTab('detail');
      setPurpose('');
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
              {request.rejectReason && (
                <KeyValueRow label="Alasan penolakan">{REJECT_REASON_LABEL[request.rejectReason]}</KeyValueRow>
              )}
              {request.rejectNote && <KeyValueRow label="Catatan penolakan">{request.rejectNote}</KeyValueRow>}
            </KeyValueList>

            {request.rejectDeadlineAt && (
              <Note tone={windowOpen ? 'warn' : 'info'} icon={<Clock />}>
                {windowOpen ? (
                  <>
                    Cuti sakit ini masih bisa ditolak sampai <strong>{formatDateTime(request.rejectDeadlineAt)}</strong>. Menolak akan mengembalikan saldo dan status harinya.
                  </>
                ) : (
                  <>
                    Batas penolakan sudah lewat pada <strong>{formatDateTime(request.rejectDeadlineAt)}</strong>. Cuti sakit ini sudah permanen.
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
                  Peran Anda tidak berhak membuka surat dokter.
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
                  openNote.mutate({ id: request.id, purpose })
                }
              >
                {openNote.isPending ? 'Membuka…' : "Open doctor's note"}
              </Button>
            </div>


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

/** Keputusan approver (D3) — menyetujui boleh membawa catatan, menolak wajib memilih alasan dari daftar. */
export function DecisionModal({
  request,
  session,
  onClose,
}: {
  request: LeaveRequest | null;
  session: Session;
  onClose: () => void;
}) {
  const [reject, setReject] = useState<RejectInput>(EMPTY_REJECT);
  const decide = useDecideRequest(session);

  useEffect(() => {
    if (request) setReject(EMPTY_REJECT);
  }, [request]);

  if (!request) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`Leave approval — ${request.id}`}
      description="Menyetujui boleh membawa catatan. Menolak wajib memilih alasan penolakan."
      footer={
        <>
          <Button
            variant="danger"
            disabled={decide.isPending || !reject.reason}
            onClick={() =>
              decide.mutate({ id: request.id, decision: 'REJECTED', input: { reject } }, { onSuccess: onClose })
            }
          >
            Reject
          </Button>
          <Button
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: request.id, decision: 'APPROVED', input: { note: reject.note.trim() } },
                { onSuccess: onClose },
              )
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

        <RejectFields value={reject} onChange={setReject} reasonLabel="Alasan penolakan (wajib untuk tolak)" />
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
  const [input, setInput] = useState<RejectInput>(EMPTY_REJECT);
  const reject = useRejectSick(session);

  useEffect(() => {
    if (request) setInput(EMPTY_REJECT);
  }, [request]);

  if (!request) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Reject sick leave"
      description="Menolak membalik apa yang sudah berlaku — saldo dikembalikan dan harinya jatuh jadi absen."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!input.reason || reject.isPending}
            onClick={() => reject.mutate({ id: request.id, reject: input }, { onSuccess: onClose })}
          >
            {reject.isPending ? 'Memproses…' : 'Reject sick leave'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {request.rejectDeadlineAt && (
          <Note tone="info" icon={<Clock />}>
            Jendela tolak <strong>masih terbuka</strong> sampai {formatDateTime(request.rejectDeadlineAt)}. Cuti sakit
            ini sudah disetujui otomatis, jadi yang tersisa hanya pilihan menolak.
          </Note>
        )}
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

        <RejectFields value={input} onChange={setInput} reasonLabel="Alasan penolakan (wajib)" />
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
