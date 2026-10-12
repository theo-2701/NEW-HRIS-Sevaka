import { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { DateField } from '@/components/form/DateField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import {
  KeyValueList,
  KeyValueRow,
  ReprimandStatusBadge,
  SnapshotPanel,
  SnapshotRow,
  StandingPill } from '@/features/reprimand/components/ReprimandBits';
import {
  useApproveReprimand,
  useCreateReprimand,
  useRevokeReprimand,
} from '@/features/reprimand/hooks/useReprimand';
import { reprimandSchema } from '@/features/reprimand/validation';
import { CURRENT_USER, EMPLOYEE_OPTIONS, deriveLevel } from '@/features/reprimand/types';
import type {
  PolicyMode,
  Reprimand,
  ReprimandCategory,
  ReprimandDraft,
  Standing,
} from '@/features/reprimand/types';
import { formatDate, toIsoDate } from '@/lib/format';
import { createLocalEmployeeSource, fromLabelOptions } from '@/lib/employeeSource';
import { EmployeeSelectField } from '@/components/form/EmployeeSelectField';

const EMPLOYEE_SOURCE = createLocalEmployeeSource('reprimand', fromLabelOptions(EMPLOYEE_OPTIONS));

const EMPTY: ReprimandDraft = {
  employeeId: '',
  categoryCode: '',
  issuedDate: '',
  reason: '',
  documentName: '',
};

/**
 * Blok snapshot — server-authoritative. FSD 0.24 §6.1: TIDAK tampil di form; baru tampil
 * read-only sesudah Simpan berhasil, terisi dari respons server.
 */
function IssuedSnapshot({ row }: { row: Reprimand }) {
  return (
    <SnapshotPanel>
      <SnapshotRow label="Poin demerit">{row.snapshot.point} poin</SnapshotRow>
      <SnapshotRow label="Urutan level">Level {row.snapshot.levelOrder}</SnapshotRow>
      <SnapshotRow label="Masa berlaku">
        {row.snapshot.validityMonths} bulan · s.d. {formatDate(row.expiryDate)}
      </SnapshotRow>
      <SnapshotRow label="Terminal">
        {row.snapshot.terminal ? <span className="text-error-700">Ya — terminal</span> : 'Tidak'}
      </SnapshotRow>
    </SnapshotPanel>
  );
}

/** RP-CREATE — maker menerbitkan; tidak boleh untuk diri sendiri. */
export function IssueReprimandModal({
  open,
  categories,
  onClose,
}: {
  open: boolean;
  categories: ReprimandCategory[];
  onClose: () => void;
}) {
  const create = useCreateReprimand();
  const [issued, setIssued] = useState<Reprimand | null>(null);
  const today = toIsoDate(new Date());

  const categoryOptions = categories
    .filter((row) => row.active)
    .sort((a, b) => a.levelOrder - b.levelOrder)
    .map((row) => ({ value: row.code, label: row.label }));

  return (
    <Formik<ReprimandDraft>
      initialValues={EMPTY}
      validationSchema={reprimandSchema}
      onSubmit={(values, helpers) =>
        create.mutate(values, {
          onSuccess: (row) => {
            helpers.resetForm();
            setIssued(row);
          },
        })
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          setIssued(null);
          onClose();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="Issue reprimand"
            description="Anda berperan sebagai maker. Reprimand untuk diri sendiri akan ditolak."
            footer={
              issued ? (
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={close}>
                    Cancel
                  </Button>
                  <Button onClick={submitForm} disabled={create.isPending}>
                    {create.isPending ? 'Mengirim…' : 'Submit for approval'}
                  </Button>
                </>
              )
            }
          >
            {issued ? (
              <div className="flex flex-col gap-3">
                <p className="m-0 font-body text-[13px] font-medium text-fg-2">
                  {issued.id} untuk {issued.employeeName} diajukan. Snapshot dibekukan server:
                </p>
                <IssuedSnapshot row={issued} />
              </div>
            ) : (
            <Form className="flex flex-col gap-4">
              <EmployeeSelectField
                name="employeeId"
                label="Karyawan"
                required
                source={EMPLOYEE_SOURCE}
                exclude={[CURRENT_USER.id]}
              />

              <div className="grid gap-4 md:grid-cols-[1fr_200px]">
                <SelectField
                  name="categoryCode"
                  label="Kategori"
                  required
                  placeholder="Pilih kategori SP"
                  options={categoryOptions}
                />
                <DateField name="issuedDate" label="Tanggal terbit" required max={today} />
              </div>

              <TextAreaField
                name="reason"
                label="Alasan"
                required
                rows={3}
                maxLength={150}
                placeholder="Uraikan kejadiannya (sensitif — disembunyikan di grid lintas-subjek)"
                hint="Maksimal 150 karakter · PII-sensitif."
              />

            </Form>
            )}
          </Modal>
        );
      }}
    </Formik>
  );
}

/**
 * RP-APPROVE — checker memutuskan, lengkap dengan proyeksi standing sebelum
 * dan sesudah persetujuan. Checker harus berbeda dari maker DAN dari subjek.
 */
export function ReviewReprimandModal({
  reprimand,
  standing,
  policyMode,
  canCheck,
  onClose,
}: {
  reprimand: Reprimand | null;
  standing: Standing[];
  policyMode: PolicyMode;
  /** Peran checker (Super Admin · HR Manager). */
  canCheck: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const approve = useApproveReprimand();
  const revoke = useRevokeReprimand();

  useEffect(() => {
    if (reprimand) setNote('');
  }, [reprimand]);

  // Halaman hanya merender modal ini saat ada baris terpilih.
  if (!reprimand) return null;

  const current = standing.find((row) => row.employeeId === reprimand.employeeId);
  const before = current?.level ?? 'CLEAN';
  const after = deriveLevel(policyMode, {
    points: (current?.points ?? 0) + reprimand.snapshot.point,
    highestLevel: Math.max(current?.highestLevel ?? 0, reprimand.snapshot.levelOrder),
    terminal: reprimand.snapshot.terminal,
  });

  // FSD 0.24 §6.1 (L1): IN_APPROVAL ⇒ Approve; ACTIVE ⇒ Revoke; hanya SA/HRM, bukan bagi subjek sendiri.
  // Tidak ada Tolak/Batalkan. Pembuat = penyetuju dijawab server 409 (L4).
  const allowed = canCheck && reprimand.employeeId !== CURRENT_USER.id;
  const canApprove = allowed && reprimand.status === 'IN_APPROVAL';
  const canRevoke = allowed && reprimand.status === 'ACTIVE';
  const canDecide = canApprove || canRevoke;
  const pending = approve.isPending || revoke.isPending;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={canDecide ? 'Review reprimand' : 'Reprimand detail'}
      description={
        canDecide
          ? 'Checker harus berbeda dari maker dan dari subjek reprimand.'
          : 'Read-only — reprimand ini sudah tidak menunggu keputusan.'
      }
      footer={
        canDecide ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {canRevoke ? (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => revoke.mutate({ id: reprimand.id, note: note.trim() }, { onSuccess: onClose })}
              >
                {revoke.isPending ? 'Memproses…' : 'Revoke'}
              </Button>
            ) : (
              <Button
                disabled={pending}
                onClick={() => approve.mutate({ id: reprimand.id, note: note.trim() }, { onSuccess: onClose })}
              >
                {approve.isPending ? 'Memproses…' : 'Approve reprimand'}
              </Button>
            )}
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Karyawan">{reprimand.employeeName}</KeyValueRow>
          <KeyValueRow label="Unit">{reprimand.unit}</KeyValueRow>
          <KeyValueRow label="Kategori">{reprimand.snapshot.label}</KeyValueRow>
          <KeyValueRow label="Terbit">{formatDate(reprimand.issuedDate)}</KeyValueRow>
          <KeyValueRow label="Kedaluwarsa">{formatDate(reprimand.expiryDate)}</KeyValueRow>
          <KeyValueRow label="Maker">{reprimand.maker}</KeyValueRow>
          <KeyValueRow label="Status">
            <ReprimandStatusBadge status={reprimand.status} />
          </KeyValueRow>
          {/* Alasan hanya terbuka di layar detail, bukan di grid. */}
          <KeyValueRow label="Alasan">{reprimand.reason}</KeyValueRow>
        </KeyValueList>

        <SnapshotPanel>
          <SnapshotRow label="Poin demerit">{reprimand.snapshot.point}</SnapshotRow>
          <SnapshotRow label="Urutan level">Level {reprimand.snapshot.levelOrder}</SnapshotRow>
          <SnapshotRow label="Masa berlaku">{reprimand.snapshot.validityMonths} bulan</SnapshotRow>
          <SnapshotRow label="Terminal">
            {reprimand.snapshot.terminal ? <span className="text-error-700">Ya</span> : 'Tidak'}
          </SnapshotRow>
        </SnapshotPanel>

        <section className="flex flex-col gap-2">
          <h4 className="m-0 inline-flex items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.05em] text-fg-3 [&_svg]:size-3.5">
            <TrendingUp />
            Proyeksi standing
          </h4>
          <div className="flex flex-wrap items-center gap-3.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3.5">
            <span className="flex flex-col gap-1.5">
              <span className="font-body text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-3">
                Sekarang
              </span>
              <StandingPill level={before} />
            </span>
            <ArrowRight className="size-5 text-secondary-500" />
            <span className="flex flex-col gap-1.5">
              <span className="font-body text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-3">
                Setelah disetujui
              </span>
              <StandingPill level={after} />
            </span>
          </div>
        </section>

        {canDecide && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="rp-checker-note">Catatan checker</Label>
            <Textarea
              id="rp-checker-note"
              rows={2}
              maxLength={150}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tersimpan bersama keputusan"
            />
          </div>
        )}

        {!canDecide && reprimand.checkerNote && (
          <KeyValueList>
            <KeyValueRow label="Catatan checker">{reprimand.checkerNote}</KeyValueRow>
          </KeyValueList>
        )}
      </div>
    </Modal>
  );
}
