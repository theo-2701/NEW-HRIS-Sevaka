import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { DateField } from '@/components/form/DateField';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import { BRANCHES, ME, UNITS, employeeName, scopeName } from '@/features/calendar/mock-data';
import { useDecideHoliday, useDeleteHoliday, useDeleteWorkCalendar, useSaveHoliday, useSaveWorkCalendar } from '@/features/calendar/hooks/useCalendar';
import {
  APPROVAL_STATUS_LABEL,
  HOLIDAY_TYPE_LABEL,
  SCOPE_LEVEL_LABEL,
  WEEKDAYS,
  WEEKDAY_LABEL,
} from '@/features/calendar/types';
import type {
  CalendarHoliday,
  HolidayDraft,
  ScopeLevel,
  WorkCalendar,
  WorkCalendarDraft,
  WorkingDays,
} from '@/features/calendar/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const APPROVAL_TONE = {
  DRAFT: 'mute',
  PENDING_APPROVAL: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
} as const;

export function ApprovalBadge({ status }: { status: CalendarHoliday['approvalStatus'] }) {
  return <StatusBadge tone={APPROVAL_TONE[status]}>{APPROVAL_STATUS_LABEL[status]}</StatusBadge>;
}

/** Layer nasional tidak pernah lahir dari form ini. */
const TYPE_OPTIONS = [
  { value: 'REGIONAL', label: HOLIDAY_TYPE_LABEL.REGIONAL },
  { value: 'COMPANY', label: HOLIDAY_TYPE_LABEL.COMPANY },
];

const SCOPE_LEVEL_OPTIONS = [
  { value: 'UNIT', label: SCOPE_LEVEL_LABEL.UNIT },
  { value: 'LOCATION', label: SCOPE_LEVEL_LABEL.LOCATION },
];

const holidaySchema = Yup.object({
  holidayDate: Yup.string().required('Tanggal libur wajib diisi.'),
  holidayName: Yup.string().trim().min(3, 'Nama libur minimal 3 karakter.').required('Nama libur wajib diisi.'),
  holidayType: Yup.string().required('Tipe libur wajib dipilih.'),
  scopeLevel: Yup.string().when('holidayType', {
    is: 'REGIONAL',
    then: (schema) => schema.required('Libur regional butuh scope level.'),
    otherwise: (schema) => schema,
  }),
  scopeRef: Yup.string().when('holidayType', {
    is: 'REGIONAL',
    then: (schema) => schema.required('Libur regional butuh scope-nya.'),
    otherwise: (schema) => schema,
  }),
});

/** Scope hanya muncul untuk libur regional, dan daftarnya ikut scope level. */
function ScopeFields({ locked }: { locked: boolean }) {
  const { values, setFieldValue } = useFormikContext<HolidayDraft>();
  if (values.holidayType !== 'REGIONAL') return null;

  const options = (values.scopeLevel === 'UNIT' ? UNITS : BRANCHES).map((row) => ({
    value: row.id,
    label: row.name,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField
        name="scopeLevel"
        label="Scope level"
        required
        placeholder="Select scope level"
        options={SCOPE_LEVEL_OPTIONS}
        disabled={locked}
      />
      <SelectField
        name="scopeRef"
        label="Scope"
        required
        placeholder={values.scopeLevel ? 'Select scope' : 'Select scope level first'}
        options={options}
        disabled={locked || !values.scopeLevel}
      />
      {/* Mengganti level membuang scope lama supaya tidak tertinggal nilai asing. */}
      <ScopeLevelSync onLevelChange={() => void setFieldValue('scopeRef', '')} />
    </div>
  );
}

function ScopeLevelSync({ onLevelChange }: { onLevelChange: () => void }) {
  const { values } = useFormikContext<HolidayDraft>();
  const [seen, setSeen] = useState(values.scopeLevel);
  useEffect(() => {
    if (values.scopeLevel !== seen) {
      setSeen(values.scopeLevel);
      onLevelChange();
    }
  }, [values.scopeLevel, seen, onLevelChange]);
  return null;
}

function JointLeaveToggle({ locked }: { locked: boolean }) {
  const { values, setFieldValue } = useFormikContext<HolidayDraft>();
  return (
    <label className={cn('flex items-center gap-3', locked ? 'cursor-not-allowed opacity-65' : 'cursor-pointer')}>
      <Checkbox
        id="isJointLeave"
        disabled={locked}
        checked={values.isJointLeave}
        onCheckedChange={(next) => void setFieldValue('isJointLeave', next === true)}
      />
      <span className="font-body text-[13px] font-medium text-fg-2">
        Cuti bersama — hari ini memotong saldo cuti tahunan
      </span>
    </label>
  );
}

export function HolidayFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: CalendarHoliday | null;
  onClose: () => void;
}) {
  const save = useSaveHoliday();
  const locked = Boolean(editing);
  const wasDraft = editing?.approvalStatus === 'DRAFT';

  const initial: HolidayDraft = editing
    ? {
        holidayDate: editing.holidayDate,
        holidayName: editing.holidayName,
        holidayType: editing.holidayType,
        scopeLevel: editing.scopeLevel ?? '',
        scopeRef: editing.scopeRef ?? '',
        isJointLeave: editing.isJointLeave,
        source: editing.source,
      }
    : {
        holidayDate: '',
        holidayName: '',
        holidayType: '',
        scopeLevel: '',
        scopeRef: '',
        isJointLeave: false,
        source: '',
      };

  return (
    <Formik<HolidayDraft>
      initialValues={initial}
      validationSchema={holidaySchema}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id, wasDraft },
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
            title={editing ? 'Edit holiday' : 'New holiday'}
            description={
              editing
                ? 'Hanya nama dan sumber yang terbuka. Menyimpan baris Draft sekaligus mengajukannya untuk approval.'
                : 'Libur regional dan company saja — layer nasional disemai sistem dan tidak bisa dibuat di sini.'
            }
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {editing ? (wasDraft ? 'Save & submit for approval' : 'Save changes') : 'Save as draft'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              {locked && (
                <Note icon={<Lock />}>
                  Tanggal, tipe, dan scope beku setelah baris tersimpan — mengubahnya berarti membuat baris baru,
                  supaya slot yang sudah dipegang tidak berpindah diam-diam.
                </Note>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="holidayDate" label="Holiday date" required disabled={locked} />
                <SelectField
                  name="holidayType"
                  label="Holiday type"
                  required
                  placeholder="Select type"
                  options={TYPE_OPTIONS}
                  disabled={locked}
                />
              </div>

              <ScopeFields locked={locked} />

              <TextField name="holidayName" label="Holiday name" required maxLength={150} placeholder="Input text here" />
              <TextAreaField
                name="source"
                label="Source"
                rows={2}
                maxLength={300}
                placeholder="mis. SE Direksi No. 08/2026"
                hint="Rujukan dokumen yang mendasarinya — dibaca checker saat memutuskan."
              />
              <JointLeaveToggle locked={locked} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

export function HolidayDecisionModal({
  row,
  onClose,
}: {
  row: CalendarHoliday | null;
  onClose: () => void;
}) {
  const decide = useDecideHoliday();
  const [note, setNote] = useState('');
  const sod = Boolean(row && row.createdBy === ME);

  useEffect(() => {
    if (row) setNote('');
  }, [row]);

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Review holiday"
      description="Menyetujui membuat tanggal itu jadi libur yang berlaku; menolak membiarkan barisnya tetap memegang slotnya."
      size="wide"
      footer={
        <>
          <Button
            variant="danger"
            disabled={sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'REJECTED', note }, { onSuccess: onClose })}
          >
            Reject
          </Button>
          <Button
            disabled={sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'APPROVED', note }, { onSuccess: onClose })}
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
              403 — pemisahan tugas: pengaju tidak pernah memutuskan barisnya sendiri.
            </Note>
          )}
          <KeyValueList>
            <KeyValueRow label="Date">{formatDate(row.holidayDate)}</KeyValueRow>
            <KeyValueRow label="Holiday">{row.holidayName}</KeyValueRow>
            <KeyValueRow label="Type">{HOLIDAY_TYPE_LABEL[row.holidayType]}</KeyValueRow>
            <KeyValueRow label="Scope">{scopeName(row.scopeLevel, row.scopeRef)}</KeyValueRow>
            <KeyValueRow label="Source">{row.source || '—'}</KeyValueRow>
            <KeyValueRow label="Submitted by">{employeeName(row.createdBy)}</KeyValueRow>
          </KeyValueList>
          <div className="flex flex-col gap-1">
            <Label htmlFor="decisionNote">Catatan keputusan</Label>
            <textarea
              id="decisionNote"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Input text here"
              className="min-h-9 w-full rounded-md border border-silver bg-cloud px-3 py-[9px] font-body text-xs font-medium leading-[1.4] text-fg-2 outline-none transition-[border-color,box-shadow] duration-200 ease-standard focus:border-secondary-500 focus:shadow-[0_0_0_4px_rgba(2,132,199,.16)]"
            />
            <span className="font-body text-xs font-normal text-fg-3">Wajib diisi bila menolak.</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function HolidayDetailModal({ row, onClose }: { row: CalendarHoliday | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Holiday detail"
      description="Read-only — layar ini tidak mengubah apa pun."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Date">{formatDate(row.holidayDate)}</KeyValueRow>
          <KeyValueRow label="Holiday">{row.holidayName}</KeyValueRow>
          <KeyValueRow label="Type">{HOLIDAY_TYPE_LABEL[row.holidayType]}</KeyValueRow>
          <KeyValueRow label="Scope">{scopeName(row.scopeLevel, row.scopeRef)}</KeyValueRow>
          <KeyValueRow label="Joint leave">{row.isJointLeave ? 'Yes' : 'No'}</KeyValueRow>
          <KeyValueRow label="System row">{row.isSystem ? 'Yes — disemai sistem, terkunci' : 'No'}</KeyValueRow>
          <KeyValueRow label="Source">{row.source || '—'}</KeyValueRow>
          <KeyValueRow label="Status">
            <ApprovalBadge status={row.approvalStatus} />
          </KeyValueRow>
          <KeyValueRow label="Created by">{employeeName(row.createdBy)}</KeyValueRow>
          <KeyValueRow label="Decided by">{row.approvedBy ? employeeName(row.approvedBy) : '—'}</KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

export function HolidayDeleteModal({ row, onClose }: { row: CalendarHoliday | null; onClose: () => void }) {
  const remove = useDeleteHoliday();
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Delete holiday"
      description="Menghapus membebaskan slot tanggal × tipe × scope yang dipegang baris ini."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => row && remove.mutate({ id: row.id }, { onSuccess: onClose })}
          >
            Delete
          </Button>
        </>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Date">{formatDate(row.holidayDate)}</KeyValueRow>
          <KeyValueRow label="Holiday">{row.holidayName}</KeyValueRow>
          <KeyValueRow label="Status">
            <ApprovalBadge status={row.approvalStatus} />
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

/** Tujuh sakelar hari — beku setelah pola tersimpan. */
function DayToggles({
  value,
  locked,
  onToggle,
}: {
  value: WorkingDays;
  locked: boolean;
  onToggle: (key: (typeof WEEKDAYS)[number], next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>
        Working days<em>*</em>
      </Label>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((key) => {
          const on = value[key];
          return (
            <button
              key={key}
              type="button"
              disabled={locked}
              onClick={() => onToggle(key, !on)}
              className={cn(
                'flex min-w-[74px] flex-col items-center gap-0.5 rounded-md border px-3 py-2 font-body transition-[background,border-color] duration-200 ease-standard',
                on ? 'border-secondary-500 bg-primary-50 text-secondary-800' : 'border-silver bg-cloud text-fg-3',
                locked && 'cursor-not-allowed opacity-65',
              )}
            >
              <span className="text-[13px] font-bold">{WEEKDAY_LABEL[key]}</span>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.04em]">{on ? 'Working' : 'Rest'}</span>
            </button>
          );
        })}
      </div>
      <span className="font-body text-xs font-normal text-fg-3">
        Beku setelah tersimpan — mengubah cara satu minggu bekerja berarti baris baru yang berlaku dari tanggal ke
        depan, sehingga penilaian lampau tidak pernah ditulis ulang.
      </span>
    </div>
  );
}

const BLANK_DAYS: WorkingDays = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };

const patternSchema = Yup.object({
  calendarName: Yup.string().trim().min(3, 'Nama pola minimal 3 karakter.').required('Nama pola wajib diisi.'),
  scopeLevel: Yup.string().required('Scope level wajib dipilih.'),
  scopeRef: Yup.string().when('scopeLevel', {
    is: (value: string) => value === 'UNIT' || value === 'LOCATION',
    then: (schema) => schema.required('Pola unit atau lokasi butuh scope-nya.'),
    otherwise: (schema) => schema,
  }),
  effectiveFrom: Yup.string().required('Tanggal mulai wajib diisi.'),
});

function PatternScopeRef({ locked }: { locked: boolean }) {
  const { values } = useFormikContext<WorkCalendarDraft>();
  if (values.scopeLevel === 'COMPANY' || !values.scopeLevel) return null;
  const options = (values.scopeLevel === 'UNIT' ? UNITS : BRANCHES).map((row) => ({
    value: row.id,
    label: row.name,
  }));
  return <SelectField name="scopeRef" label="Scope" required placeholder="Select scope" options={options} disabled={locked} />;
}

export function WorkCalendarFormModal({
  open,
  editing,
  lastCompanyPattern,
  onClose,
}: {
  open: boolean;
  editing: WorkCalendar | null;
  lastCompanyPattern: boolean;
  onClose: () => void;
}) {
  const save = useSaveWorkCalendar();
  const locked = Boolean(editing);
  const [days, setDays] = useState<WorkingDays>(() => editing?.workingDays ?? BLANK_DAYS);

  useEffect(() => {
    if (open) setDays(editing ? { ...editing.workingDays } : { ...BLANK_DAYS });
  }, [open, editing]);

  const initial: WorkCalendarDraft = editing
    ? {
        calendarName: editing.calendarName,
        scopeLevel: editing.scopeLevel,
        scopeRef: editing.scopeRef ?? '',
        workingDays: editing.workingDays,
        effectiveFrom: editing.effectiveFrom,
        effectiveUntil: editing.effectiveUntil ?? '',
      }
    : {
        calendarName: '',
        scopeLevel: '',
        scopeRef: '',
        workingDays: BLANK_DAYS,
        effectiveFrom: '',
        effectiveUntil: '',
      };

  return (
    <Formik<WorkCalendarDraft>
      initialValues={initial}
      validationSchema={patternSchema}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: { ...values, workingDays: days }, id: editing?.id },
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
            title={editing ? 'Edit work pattern' : 'New work pattern'}
            description="Pola kerja selalu berlaku ke depan. Setelah tersimpan hanya nama dan tanggal akhir yang bisa diubah."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save work pattern'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              {locked && lastCompanyPattern && (
                <Note tone="warn" icon={<TriangleAlert />}>
                  Ini pola company aktif terakhir — ia tidak bisa diakhiri tanpa penggantinya, karena tidak akan ada
                  apa pun yang tersisa untuk menyelesaikan hari kerja.
                </Note>
              )}

              <TextField name="calendarName" label="Pattern name" required maxLength={150} placeholder="Input text here" />

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="scopeLevel"
                  label="Scope level"
                  required
                  placeholder="Select scope level"
                  options={[{ value: 'COMPANY', label: SCOPE_LEVEL_LABEL.COMPANY }, ...SCOPE_LEVEL_OPTIONS]}
                  disabled={locked}
                />
                <PatternScopeRef locked={locked} />
              </div>

              <DayToggles
                value={days}
                locked={locked}
                onToggle={(key, next) => setDays((prev) => ({ ...prev, [key]: next }))}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="effectiveFrom" label="Effective from" required disabled={locked} />
                <DateField
                  name="effectiveUntil"
                  label="Effective until"
                  hint="Kosongkan untuk pola terbuka yang berlaku sampai ada penggantinya."
                />
              </div>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

export function WorkCalendarDeleteModal({
  row,
  onClose,
}: {
  row: WorkCalendar | null;
  onClose: () => void;
}) {
  const remove = useDeleteWorkCalendar();
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Delete work pattern"
      description="Pola company aktif terakhir tidak bisa dihapus — tanpa itu tidak ada apa pun yang menyelesaikan hari kerja."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => row && remove.mutate({ id: row.id }, { onSuccess: onClose })}
          >
            Delete
          </Button>
        </>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Pattern">{row.calendarName}</KeyValueRow>
          <KeyValueRow label="Scope">
            {SCOPE_LEVEL_LABEL[row.scopeLevel as ScopeLevel]}
            {row.scopeRef ? ` · ${scopeName(row.scopeLevel, row.scopeRef)}` : ''}
          </KeyValueRow>
          <KeyValueRow label="Effective from">{formatDate(row.effectiveFrom)}</KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

/** Deretan tujuh huruf hari untuk sel tabel. */
export function WorkingDaysCell({ value }: { value: WorkingDays }) {
  return (
    <span className="inline-flex gap-1">
      {WEEKDAYS.map((key) => (
        <span
          key={key}
          title={key}
          className={cn(
            'inline-flex size-5 items-center justify-center rounded-sm font-body text-[10.5px] font-bold',
            value[key] ? 'bg-primary-100 text-secondary-800' : 'bg-vapor text-fg-4',
          )}
        >
          {WEEKDAY_LABEL[key][0]}
        </span>
      ))}
    </span>
  );
}

export function HolidayTags({ row }: { row: CalendarHoliday }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {row.holidayName}
      {row.isSystem && <TmFlag>System</TmFlag>}
      {row.isJointLeave && <TmFlag>Joint leave</TmFlag>}
    </span>
  );
}
