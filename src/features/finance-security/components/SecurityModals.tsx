import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { EXPORT_SCOPES, HOLD_TARGET_TYPES } from '@/features/finance-security/rules';
import { ROLE_OF, employeeName } from '@/features/finance-security/mock-data';
import {
  useHoldTargets,
  usePlaceHold,
  useReleaseHold,
  useRunExport,
} from '@/features/finance-security/hooks/useFinanceSecurity';
import { EXPORT_SCOPE_LABEL, HOLD_TARGET_LABEL, ROLE_LABEL } from '@/features/finance-security/types';
import type { Actor, DisputeHoldRow, ExportScope, HoldTargetType } from '@/features/finance-security/types';
import { formatDateTime } from '@/lib/format';

function Hint({ children }: { children: string }) {
  return <span className="font-body text-[11px] font-medium text-fg-3">{children}</span>;
}

const whoLabel = (id: string | null) => (id ? `${employeeName(id)} · ${ROLE_LABEL[ROLE_OF[id]] ?? '—'}` : '—');

/** KM-A3 — pasang hold; sengaja tanpa field alasan. */
export function PlaceHoldModal({ actor, open, onClose }: { actor: Actor; open: boolean; onClose: () => void }) {
  const place = usePlaceHold();
  const [targetType, setTargetType] = useState<HoldTargetType | ''>('');
  const [targetId, setTargetId] = useState('');
  const targets = useHoldTargets(actor, open ? targetType : '');

  useEffect(() => {
    if (open) {
      setTargetType('');
      setTargetId('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Place dispute hold"
      description="Pilih pengajuan yang disengketakan. Target divalidasi benar-benar ada di company Anda."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!targetType || !targetId || place.isPending}
            onClick={() => place.mutate({ actor, input: { targetType, targetId } }, { onSuccess: onClose })}
          >
            {place.isPending ? 'Memasang…' : 'Place hold'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>
            Target type<em>*</em>
          </Label>
          <Select
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value as HoldTargetType);
              setTargetId('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target type" />
            </SelectTrigger>
            <SelectContent>
              {HOLD_TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {HOLD_TARGET_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label>
            Target request<em>*</em>
          </Label>
          <Select value={targetId} onValueChange={setTargetId} disabled={!targetType}>
            <SelectTrigger>
              <SelectValue placeholder={targetType ? 'Select request' : 'Select target type first'} />
            </SelectTrigger>
            <SelectContent>
              {(targets.data ?? []).map((target) => (
                <SelectItem key={target.targetId} value={target.targetId} disabled={target.onHold}>
                  {target.requestNo} — {employeeName(target.employeeId)}
                  {target.onHold ? ' (on hold)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>Ditampilkan per nomor pengajuan; payload membawa id baris. Target yang sudah on hold ditolak 409.</Hint>
        </div>

        <Note icon={<Info />}>
          <strong>Tidak ada field alasan di sini — disengaja.</strong> Memasang hold tidak menuntut sebab; mencabutnya
          wajib bersebab. Kolom pelepasan tetap kosong pada baris baru.
        </Note>
      </div>
    </Modal>
  );
}

/** KM-B3 — cabut hold; satu medan teks bebas wajib. */
export function ReleaseHoldModal({ actor, hold, onClose }: { actor: Actor; hold: DisputeHoldRow | null; onClose: () => void }) {
  const release = useReleaseHold();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (hold) setNote('');
  }, [hold]);

  return (
    <Modal
      open={Boolean(hold)}
      onOpenChange={(next) => !next && onClose()}
      title="Release dispute hold"
      description="Alasan pelepasan wajib dan disimpan bersama identitas serta waktu pelepasan Anda."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!note.trim() || release.isPending}
            onClick={() => hold && release.mutate({ actor, hold, note }, { onSuccess: onClose })}
          >
            {release.isPending ? 'Melepas…' : 'Release hold'}
          </Button>
        </>
      }
    >
      {hold && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Target type">{HOLD_TARGET_LABEL[hold.targetType]}</KeyValueRow>
            <KeyValueRow label="Request no.">
              <span className="font-mono text-xs">{hold.targetRequestNo}</span>
            </KeyValueRow>
            <KeyValueRow label="Placed by">{`${whoLabel(hold.createdBy)} · ${formatDateTime(hold.createdAt)}`}</KeyValueRow>
            <KeyValueRow label="Releasing as">{whoLabel(actor.employeeId)}</KeyValueRow>
          </KeyValueList>
          <div className="flex flex-col gap-1">
            <Label htmlFor="release-note">
              Release reason<em>*</em>
            </Label>
            <Textarea
              id="release-note"
              rows={3}
              maxLength={2000}
              value={note}
              placeholder="Sudah diklarifikasi dengan karyawan — bukti nota asli ditemukan"
              onChange={(event) => setNote(event.target.value)}
            />
            <Hint>
              {actor.role === 'ROLE_FINANCE_OFFICER'
                ? 'Satu teks bebas, bukan sebab baku. Pelepas Finance Officer ⇒ HR Manager dikabari (bukan diminta persetujuan).'
                : 'Satu teks bebas, bukan sebab baku. Pelepas boleh berbeda peran dari pemasang.'}
            </Hint>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function HoldDetailModal({ hold, onClose }: { hold: DisputeHoldRow | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(hold)}
      onOpenChange={(next) => !next && onClose()}
      title="Dispute hold detail"
      description="Baca saja. Baris yang sudah dicabut tetap tersimpan sebagai riwayat."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {hold && (
        <KeyValueList>
          <KeyValueRow label="Target type">{HOLD_TARGET_LABEL[hold.targetType]}</KeyValueRow>
          <KeyValueRow label="Request no.">
            <span className="font-mono text-xs">{hold.targetRequestNo}</span>
          </KeyValueRow>
          <KeyValueRow label="Status">
            <StatusBadge tone={hold.isActive ? 'warn' : 'mute'}>{hold.isActive ? 'On hold' : 'Released'}</StatusBadge>
          </KeyValueRow>
          <KeyValueRow label="Placed by">{`${whoLabel(hold.createdBy)} · ${formatDateTime(hold.createdAt)}`}</KeyValueRow>
          <KeyValueRow label="Released by">
            {hold.releasedBy ? `${whoLabel(hold.releasedBy)} · ${formatDateTime(hold.releasedAt)}` : '—'}
          </KeyValueRow>
          <KeyValueRow label="Release reason">{hold.releasedReasonNote ?? '—'}</KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

/** F8.03 — ekspor manual; berkas turun langsung, jejak ditulis bersamaan. */
export function NewExportModal({ actor, open, onClose }: { actor: Actor; open: boolean; onClose: () => void }) {
  const run = useRunExport();
  const [scope, setScope] = useState<ExportScope | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open) {
      setScope('');
      setStartDate('');
      setEndDate('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New export"
      description="Berkas diunduh langsung; satu baris jejak unduhan ditulis dalam transaksi yang sama."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!scope || !startDate || !endDate || run.isPending}
            onClick={() => run.mutate({ actor, input: { scope, startDate, endDate } }, { onSuccess: onClose })}
          >
            {run.isPending ? 'Menyusun…' : 'Download export'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>
            Scope<em>*</em>
          </Label>
          <Select value={scope} onValueChange={(value) => setScope(value as ExportScope)}>
            <SelectTrigger>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_SCOPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {EXPORT_SCOPE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>Scope asing ditolak 422 FIN_EXPORT_SCOPE_INVALID. Request membawa Idempotency-Key.</Hint>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>
              Start date<em>*</em>
            </Label>
            <DatePicker value={startDate} max={endDate || undefined} onChange={setStartDate} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>
              End date<em>*</em>
            </Label>
            <DatePicker value={endDate} min={startDate || undefined} onChange={setEndDate} />
          </div>
        </div>
        <Note icon={<Info />}>
          Isi berkas dibaca dari data modul sumber (klaim, pinjaman, uang muka, atau penanda pencairan) dengan medan
          sesempit kebutuhan pembayaran — tanpa isi lampiran medis.
        </Note>
      </div>
    </Modal>
  );
}

type ReferenceKind = 'asymmetry' | 'duties';

interface ReferenceRow {
  aspect: string;
  left: string;
  right: string;
}

const REFERENCE: Record<ReferenceKind, { title: string; description: string; headers: [string, string, string]; rows: ReferenceRow[] }> = {
  asymmetry: {
    title: 'Place versus release — a deliberate asymmetry',
    description: 'Mengapa memasang hold tanpa sebab, sedangkan mencabutnya selalu bersebab (FSD §6 1.5).',
    headers: ['Aspect', 'Place', 'Release'],
    rows: [
      { aspect: 'Reason required', left: 'Tidak — tidak ada field alasan di form maupun payload', right: 'Ya — satu catatan pelepasan teks bebas, kosong ditolak' },
      { aspect: 'Who may act', left: 'Finance Officer · HR Manager · Super Admin', right: 'Sama persis, termasuk lintas peran' },
      { aspect: 'Notification', left: 'Tidak wajib', right: 'Pelepas Finance Officer ⇒ HR Manager dikabari, bukan diminta persetujuan' },
      { aspect: 'Why', left: 'Tindakan protektif berisiko rendah — sebab wajib hanya memperlambat respons', right: 'Membuka kembali baris ke sapuan retensi — keputusan berdampak, wajib berjejak' },
    ],
  },
  duties: {
    title: 'Separation of duties — opener is not auditor',
    description: 'Dua peran sengaja dipisah atas satu kelas data: lampiran nota yang memuat data kesehatan (FSD §6 1.6).',
    headers: ['Role', 'Capability', 'Explicit prohibition'],
    rows: [
      {
        aspect: 'Opener — Health Data Officer (juga HR Manager)',
        left: 'Membuka isi satu lampiran; setiap buka menulis jejak sebelum hasil dikembalikan, percobaan 403 tidak menulis apa pun',
        right: 'Tidak diberi endpoint peninjauan jejak — perannya membuka, bukan mengaudit',
      },
      {
        aspect: 'Auditor — HR Manager (juga Super Admin)',
        left: 'Meninjau siapa membuka apa, di layar ini',
        right: 'Tidak membuka isi lampiran dari sini — papan ini hanya metadata',
      },
    ],
  },
};

export function ReferenceModal({ kind, onClose }: { kind: ReferenceKind | null; onClose: () => void }) {
  const content = kind ? REFERENCE[kind] : null;
  return (
    <Modal
      open={Boolean(content)}
      onOpenChange={(next) => !next && onClose()}
      title={content?.title ?? ''}
      description={content?.description}
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {content && (
        <DataTable<ReferenceRow>
          rows={content.rows}
          rowKey={(row) => row.aspect}
          columns={[
            { key: 'aspect', header: content.headers[0], strong: true, render: (row) => row.aspect },
            { key: 'left', header: content.headers[1], render: (row) => row.left },
            { key: 'right', header: content.headers[2], render: (row) => row.right },
          ]}
        />
      )}
    </Modal>
  );
}

export type { ReferenceKind };
