import { useEffect, useMemo, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DateField } from '@/components/form/DateField';
import { DatePicker } from '@/components/DatePicker';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { DerivedBox } from '@/features/attendance/components/AttendanceBits';
import { SwapStatusBadge } from '@/features/scheduler/components/SchedulerBits';
import { EMPLOYEES, ME, employeeName } from '@/features/scheduler/mock-data';
import { pickableShifts, rosterLabel } from '@/features/scheduler/rules';
import { schedulerService } from '@/features/scheduler/services/scheduler.service';
import {
  useCreateSwap,
  useDecideSwap,
  useDeleteAssignment,
  useDeleteShift,
  useRunBulk,
  useSaveAssignment,
  useSaveShift,
  useWithdrawSwap,
} from '@/features/scheduler/hooks/useScheduler';
import { SHIFT_TYPE_LABEL } from '@/features/scheduler/types';
import type {
  AssignmentDraft,
  BulkDraft,
  Shift,
  ShiftAssignment,
  ShiftDraft,
  ShiftSwap,
  ShiftType,
} from '@/features/scheduler/types';
import { formatDate, formatDateTime } from '@/lib/format';

const TYPE_OPTIONS = (Object.keys(SHIFT_TYPE_LABEL) as ShiftType[]).map((value) => ({
  value,
  label: SHIFT_TYPE_LABEL[value],
}));

const shiftSchema = Yup.object({
  shiftCode: Yup.string().trim().min(2, 'Kode shift minimal 2 karakter.').required('Kode shift wajib diisi.'),
  shiftName: Yup.string().trim().min(3, 'Nama shift minimal 3 karakter.').required('Nama shift wajib diisi.'),
  shiftType: Yup.string().required('Tipe shift wajib dipilih.'),
  breakMinutes: Yup.number()
    .typeError('Jeda wajib diisi.')
    .integer('Jeda harus bilangan bulat menit.')
    .min(0, 'Jeda tidak boleh negatif.')
    .required('Jeda wajib diisi.'),
});

/** Kotak turunan server — apa yang akan dihitung sistem dari isian form. */
function ShiftDerived() {
  const { values } = useFormikContext<ShiftDraft>();
  const fixed = values.shiftType === 'FIXED';
  const crosses = fixed && values.startTime && values.endTime && values.endTime < values.startTime;

  return (
    <DerivedBox
      heading="Server-derived"
      rows={[
        ['Crosses midnight', fixed ? (crosses ? 'Yes' : 'No') : 'Not applicable'],
        [
          'Selectable in the roster picker',
          values.shiftType === 'CYCLE' ? 'No — a cycle has no hours of its own' : 'Yes',
        ],
      ]}
    />
  );
}

/** Field yang muncul mengikuti tipe shift — kontrak memisahkan ketiganya. */
function ShiftTypeFields() {
  const { values, setFieldValue } = useFormikContext<ShiftDraft>();

  useEffect(() => {
    if (values.shiftType === 'CYCLE' && values.breakMinutes !== '0') void setFieldValue('breakMinutes', '0');
  }, [values.shiftType, values.breakMinutes, setFieldValue]);

  return (
    <>
      {values.shiftType === 'FIXED' && (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="startTime" type="time" label="Start time" required />
          <TextField name="endTime" type="time" label="End time" required hint="Selesai lebih awal dari mulai berarti pola ini melewati tengah malam." />
        </div>
      )}
      {values.shiftType === 'CYCLE' && (
        <TextAreaField
          name="cycleDef"
          label="Cycle definition"
          required
          rows={3}
          placeholder='mis. {"cycle":["PAGI","PAGI","OFF"]}'
          hint="Definisi siklus dalam JSON. Belum tergambar di frame mana pun — bentuk akhirnya menyusul."
        />
      )}
      {values.shiftType === 'FLEX' && (
        <TextAreaField
          name="flexBand"
          label="Flex band definition"
          required
          rows={3}
          placeholder='mis. {"core":"10:00-15:00","band":"07:00-19:00"}'
          hint="Definisi band dalam JSON. Belum tergambar di frame mana pun — bentuk akhirnya menyusul."
        />
      )}
    </>
  );
}

export function ShiftFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Shift | null;
  onClose: () => void;
}) {
  const save = useSaveShift();

  const initial: ShiftDraft = editing
    ? {
        shiftCode: editing.shiftCode,
        shiftName: editing.shiftName,
        shiftType: editing.shiftType,
        startTime: editing.startTime ?? '',
        endTime: editing.endTime ?? '',
        breakMinutes: String(editing.breakMinutes),
        cycleDef: '',
        flexBand: '',
      }
    : {
        shiftCode: '',
        shiftName: '',
        shiftType: '',
        startTime: '',
        endTime: '',
        breakMinutes: '0',
        cycleDef: '',
        flexBand: '',
      };

  return (
    <Formik<ShiftDraft>
      initialValues={initial}
      validationSchema={shiftSchema}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm, values }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            title={editing ? 'Edit shift pattern' : 'New shift pattern'}
            description="Katalog pola shift. Tipe menentukan field mana yang berlaku — dan apakah pola ini bisa dipilih di roster."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save shift pattern'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              {editing && (
                <Note icon={<Lock />}>
                  Tipe shift beku setelah tersimpan — mengubah sifat sebuah pola berarti pola baru, supaya baris
                  roster yang sudah menunjuknya tidak berubah makna diam-diam.
                </Note>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="shiftCode" label="Shift code" required maxLength={20} placeholder="mis. PAGI" />
                <TextField name="shiftName" label="Shift name" required maxLength={150} placeholder="Input text here" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="shiftType"
                  label="Shift type"
                  required
                  placeholder="Select shift type"
                  options={TYPE_OPTIONS}
                  disabled={Boolean(editing)}
                />
                <TextField
                  name="breakMinutes"
                  type="number"
                  min="0"
                  step="1"
                  label="Break (minutes)"
                  required
                  disabled={values.shiftType === 'CYCLE'}
                  hint={values.shiftType === 'CYCLE' ? 'Pola siklus selalu berjeda 0.' : undefined}
                />
              </div>

              <ShiftTypeFields />
              <ShiftDerived />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

const assignmentSchema = Yup.object({
  employeeId: Yup.string().required('Karyawan wajib dipilih.'),
  workDate: Yup.string().required('Tanggal kerja wajib diisi.'),
  shiftId: Yup.string().when('isOffDay', {
    is: false,
    then: (schema) => schema.required('Pilih pola shift, atau tandai sebagai hari libur terjadwal.'),
    otherwise: (schema) => schema,
  }),
});

function OffDayToggle() {
  const { values, setFieldValue } = useFormikContext<AssignmentDraft>();
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Checkbox
        id="isOffDay"
        checked={values.isOffDay}
        onCheckedChange={(next) => {
          void setFieldValue('isOffDay', next === true);
          if (next === true) void setFieldValue('shiftId', '');
        }}
      />
      <span className="font-body text-[13px] font-medium text-fg-2">
        Scheduled off day — barisnya tetap ada, dan menyatakan orangnya tidak bekerja
      </span>
    </label>
  );
}

function ShiftPicker({ shifts }: { shifts: Shift[] }) {
  const { values } = useFormikContext<AssignmentDraft>();
  if (values.isOffDay) return null;
  return (
    <SelectField
      name="shiftId"
      label="Shift pattern"
      required
      placeholder="Select shift pattern"
      options={pickableShifts(shifts).map((row) => ({
        value: row.id,
        label: `${row.shiftName} · ${row.shiftCode}`,
      }))}
      hint="Hanya pola aktif non-siklus yang bisa dipasang ke roster."
    />
  );
}

export function AssignmentFormModal({
  open,
  editing,
  shifts,
  onClose,
}: {
  open: boolean;
  editing: ShiftAssignment | null;
  shifts: Shift[];
  onClose: () => void;
}) {
  const save = useSaveAssignment();

  const initial: AssignmentDraft = editing
    ? {
        employeeId: editing.employeeId,
        workDate: editing.workDate,
        shiftId: editing.shiftId ?? '',
        isOffDay: editing.isOffDay,
      }
    : { employeeId: '', workDate: '', shiftId: '', isOffDay: false };

  return (
    <Formik<AssignmentDraft>
      initialValues={initial}
      validationSchema={assignmentSchema}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            title={editing ? 'Override roster row' : 'Assign roster'}
            description="Sentuhan tangan selalu dicap penyesuaian individual — bulk berikutnya akan melangkahinya."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save roster row'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="employeeId"
                  label="Employee"
                  required
                  placeholder="Select employee"
                  options={EMPLOYEES.map((row) => ({ value: row.id, label: row.name }))}
                  disabled={Boolean(editing)}
                />
                <DateField name="workDate" label="Work date" required />
              </div>
              <OffDayToggle />
              <ShiftPicker shifts={shifts} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

/**
 * Bulk assignment. Pratinjaunya hitungan kering — barisnya belum bergerak, dan
 * baris yang dikunci penyesuaian individual atau swap akan dilangkahi.
 */
export function BulkAssignModal({
  open,
  shifts,
  onClose,
}: {
  open: boolean;
  shifts: Shift[];
  onClose: () => void;
}) {
  const run = useRunBulk();
  const [draft, setDraft] = useState<BulkDraft>({ employeeIds: [], from: '', to: '', shiftId: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setDraft({ employeeIds: [], from: '', to: '', shiftId: '' });
      setSearch('');
    }
  }, [open]);

  const preview = useMemo(() => schedulerService.previewBulk(draft), [draft]);
  const people = EMPLOYEES.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()));
  const allChecked = draft.employeeIds.length === EMPLOYEES.length;

  const toggle = (id: string, next: boolean) =>
    setDraft((prev) => ({
      ...prev,
      employeeIds: next ? [...prev.employeeIds, id] : prev.employeeIds.filter((item) => item !== id),
    }));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Bulk assign roster"
      description="Satu pola shift dipasang ke banyak karyawan sekaligus sepanjang rentang tanggal."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={run.isPending} onClick={() => run.mutate(draft, { onSuccess: onClose })}>
            {run.isPending ? 'Menjalankan…' : 'Run bulk assignment'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>
            Employees<em>*</em>
          </Label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee name"
          />
          <div className="mt-1 flex max-h-[180px] flex-col gap-2 overflow-y-auto rounded-md border border-border-1 bg-cloud p-3">
            <label className="flex cursor-pointer items-center gap-3 border-b border-border-1 pb-2">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(next) =>
                  setDraft((prev) => ({ ...prev, employeeIds: next === true ? EMPLOYEES.map((row) => row.id) : [] }))
                }
              />
              <span className="font-body text-[13px] font-semibold text-fg-2">All</span>
            </label>
            {people.map((row) => (
              <label key={row.id} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={draft.employeeIds.includes(row.id)}
                  onCheckedChange={(next) => toggle(row.id, next === true)}
                />
                <span className="font-body text-[13px] font-medium text-fg-2">
                  {row.name}
                  <span className="ml-1.5 text-fg-4">{row.unit}</span>
                </span>
              </label>
            ))}
            {!people.length && (
              <span className="font-body text-xs font-medium text-fg-4">No employee matches that search.</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>
              From<em>*</em>
            </Label>
            <DatePicker
              value={draft.from}
              max={draft.to || undefined}
              onChange={(from) => setDraft((prev) => ({ ...prev, from }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>
              To<em>*</em>
            </Label>
            <DatePicker
              value={draft.to}
              min={draft.from || undefined}
              onChange={(to) => setDraft((prev) => ({ ...prev, to }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label>
            Shift pattern<em>*</em>
          </Label>
          <Select value={draft.shiftId} onValueChange={(shiftId) => setDraft((prev) => ({ ...prev, shiftId }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select shift pattern" />
            </SelectTrigger>
            <SelectContent>
              {pickableShifts(shifts).map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.shiftName} · {row.shiftCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DerivedBox
          heading="Result preview"
          rows={[
            ['Rows that will be created', preview.created],
            ['Existing bulk / system rows that will be rewritten', preview.overwritten],
            ['Skipped — individual adjustment', preview.skippedIndividual],
            ['Skipped — swap', preview.skippedSwap],
            ['Employees affected', preview.employees],
          ]}
        />
        <span className="font-body text-xs font-normal leading-[1.45] text-fg-3">
          Baris yang sudah dikunci penyesuaian individual atau swap dilangkahi; baris yang cuma hasil bulk sebelumnya
          ditulis ulang.
        </span>
      </div>
    </Modal>
  );
}

export function SwapFormModal({
  open,
  assignments,
  shifts,
  onClose,
}: {
  open: boolean;
  assignments: ShiftAssignment[];
  shifts: Shift[];
  onClose: () => void;
}) {
  const create = useCreateSwap();
  const [mine, setMine] = useState('');
  const [other, setOther] = useState('');

  useEffect(() => {
    if (open) {
      setMine('');
      setOther('');
    }
  }, [open]);

  const myRows = assignments.filter((row) => row.employeeId === ME && !row.isOffDay);
  const picked = assignments.find((row) => row.id === mine);
  const candidates = assignments.filter(
    (row) => picked && row.workDate === picked.workDate && row.employeeId !== picked.employeeId,
  );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Request shift swap"
      description="Tukar hanya sah pada tanggal kerja yang sama, dan tidak ada roster yang bergerak sebelum keputusan turun."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={create.isPending}
            onClick={() =>
              create.mutate(
                { requesterAssignmentId: mine, counterpartAssignmentId: other },
                { onSuccess: onClose },
              )
            }
          >
            Submit swap request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>
            My rostered day<em>*</em>
          </Label>
          <Select
            value={mine}
            onValueChange={(value) => {
              setMine(value);
              setOther('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={myRows.length ? 'Select one of my rostered days' : 'Tidak ada hari yang bisa ditukar'} />
            </SelectTrigger>
            <SelectContent>
              {myRows.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {rosterLabel(row, shifts)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label>
            Counterpart<em>*</em>
          </Label>
          <Select value={other} onValueChange={setOther} disabled={!mine}>
            <SelectTrigger>
              <SelectValue
                placeholder={!mine ? 'Pick your row first' : candidates.length ? 'Select counterpart' : 'No eligible counterpart'}
              />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {rosterLabel(row, shifts)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-body text-xs font-normal text-fg-3">
            Hanya baris pada tanggal yang sama milik orang lain yang muncul di sini.
          </span>
        </div>
      </div>
    </Modal>
  );
}

export function SwapDecisionModal({
  row,
  assignments,
  shifts,
  onClose,
}: {
  row: ShiftSwap | null;
  assignments: ShiftAssignment[];
  shifts: Shift[];
  onClose: () => void;
}) {
  const decide = useDecideSwap();
  const requester = assignments.find((item) => item.id === row?.requesterAssignmentId);
  const counterpart = assignments.find((item) => item.id === row?.counterpartAssignmentId);
  const pending = row?.swapStatus === 'PENDING_APPROVAL';
  const sod = requester?.employeeId === ME;

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Review shift swap"
      description="Menyetujui menukar pola kedua baris sebagai satu paket; menolak tidak menyentuh roster sama sekali."
      size="wide"
      footer={
        <>
          <Button
            variant="danger"
            disabled={!pending || sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'REJECTED' }, { onSuccess: onClose })}
          >
            Reject
          </Button>
          <Button
            disabled={!pending || sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'APPROVED' }, { onSuccess: onClose })}
          >
            Approve
          </Button>
        </>
      }
    >
      {row && (
        <div className="flex flex-col gap-4">
          {sod && (
            <Note tone="danger" icon={<ShieldCheck />}>
              403 — pemisahan tugas: pengaju tidak pernah memutuskan tukarnya sendiri.
            </Note>
          )}
          <KeyValueList>
            <KeyValueRow label="Swap">{row.id}</KeyValueRow>
            <KeyValueRow label="Work date">{requester ? formatDate(requester.workDate) : '—'}</KeyValueRow>
            <KeyValueRow label="Requester">{requester ? employeeName(requester.employeeId) : '—'}</KeyValueRow>
            <KeyValueRow label="Requester row">{rosterLabel(requester, shifts)}</KeyValueRow>
            <KeyValueRow label="Counterpart">{counterpart ? employeeName(counterpart.employeeId) : '—'}</KeyValueRow>
            <KeyValueRow label="Counterpart row">{rosterLabel(counterpart, shifts)}</KeyValueRow>
            <KeyValueRow label="Status">
              <SwapStatusBadge status={row.swapStatus} />
            </KeyValueRow>
            <KeyValueRow label="Submitted">{formatDateTime(row.submittedAt)}</KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}

export function SwapWithdrawModal({ row, onClose }: { row: ShiftSwap | null; onClose: () => void }) {
  const withdraw = useWithdrawSwap();
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Withdraw swap request"
      description="Permintaannya tinggal sebagai jejak berstatus Cancelled; tidak ada roster yang tersentuh."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={withdraw.isPending}
            onClick={() => row && withdraw.mutate({ id: row.id }, { onSuccess: onClose })}
          >
            Withdraw
          </Button>
        </>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Swap">{row.id}</KeyValueRow>
          <KeyValueRow label="Status">
            <SwapStatusBadge status={row.swapStatus} />
          </KeyValueRow>
          <KeyValueRow label="Submitted">{formatDateTime(row.submittedAt)}</KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

/** Konfirmasi hapus yang dipakai katalog shift dan baris roster. */
export function SchedulerDeleteModal({
  target,
  onClose,
}: {
  target: { kind: 'shift'; row: Shift } | { kind: 'assignment'; row: ShiftAssignment } | null;
  onClose: () => void;
}) {
  const removeShift = useDeleteShift();
  const removeAssignment = useDeleteAssignment();
  const pending = removeShift.isPending || removeAssignment.isPending;

  return (
    <Modal
      open={Boolean(target)}
      onOpenChange={(next) => !next && onClose()}
      title={target?.kind === 'shift' ? 'Delete this shift pattern?' : 'Delete this roster row?'}
      description={
        target?.kind === 'shift'
          ? 'Hanya untuk pola yang tidak ditunjuk satu pun baris roster.'
          : 'Ditolak selama barisnya masih terikat tukar yang belum diputuskan.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!target) return;
              if (target.kind === 'shift') removeShift.mutate({ id: target.row.id }, { onSuccess: onClose });
              else removeAssignment.mutate({ id: target.row.id }, { onSuccess: onClose });
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      {target && (
        <div className="flex flex-col gap-4">
          <Note tone="warn" icon={<TriangleAlert />}>
            {target.kind === 'shift'
              ? 'Pola yang masih dirujuk roster ditolak dengan 409 — pensiunkan lewat Deactivate.'
              : 'Baris yang jadi bagian tukar yang belum diputuskan ditolak dengan 409.'}
          </Note>
          <KeyValueList>
            {target.kind === 'shift' ? (
              <>
                <KeyValueRow label="Code">{target.row.shiftCode}</KeyValueRow>
                <KeyValueRow label="Name">{target.row.shiftName}</KeyValueRow>
              </>
            ) : (
              <>
                <KeyValueRow label="Date">{formatDate(target.row.workDate)}</KeyValueRow>
                <KeyValueRow label="Employee">{employeeName(target.row.employeeId)}</KeyValueRow>
              </>
            )}
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}
