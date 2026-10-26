import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { FieldGrid, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { useCreateGrade, useSaveClass, useUpdateGrade } from '@/features/company/hooks/useCompany';
import { compareGradeCode, gradeLabel, parseInteger, parseNumber, salaryRangeError } from '@/features/company/rules';
import type { ClassDraft, GradeDraft, GradeEditDraft, JobGrade } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type Step = 'grade' | 'class' | 'review';
const STEPS: { value: Step; label: string }[] = [
  { value: 'grade', label: 'Grade' },
  { value: 'class', label: 'Default Class' },
  { value: 'review', label: 'Review' },
];

const EMPTY_GRADE: GradeDraft = { name: '', level: '', defaultClass: { name: '', salaryRangeFrom: '', salaryRangeTo: '' } };

function StepMarker({ current }: { current: Step }) {
  const at = STEPS.findIndex((step) => step.value === current);
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0 font-body text-xs font-bold">
      {STEPS.map((step, index) => (
        <li key={step.value} className="flex items-center gap-2">
          {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-border-1" />}
          <span
            aria-current={index === at ? 'step' : undefined}
            className={cn(
              'grid size-5 place-items-center rounded-full text-[11px]',
              index <= at ? 'bg-secondary-500 text-white' : 'bg-vapor text-fg-3',
            )}
          >
            {index + 1}
          </span>
          <span className={index === at ? 'text-fg-1' : 'text-fg-3'}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Tangga yang sudah ada sebagai petunjuk isian Level. */
function LadderHint({ grades }: { grades: JobGrade[] }) {
  const levels = [...new Set(grades.map((row) => row.sortOrder))].sort((a, b) => a - b);
  if (levels.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 rounded-md border border-border-1 bg-cloud px-3 py-2 font-body text-xs font-medium text-fg-3">
      {levels.map((level) => (
        <li key={level}>
          <span className="font-semibold text-fg-2">Level {level}</span> —{' '}
          {grades
            .filter((row) => row.sortOrder === level)
            .sort((a, b) => compareGradeCode(a.gradeCode, b.gradeCode))
            .map(gradeLabel)
            .join(', ')}
        </li>
      ))}
    </ul>
  );
}

const amount = (value: string) => (value.trim() ? parseNumber(value) : null);

/**
 * Create Grade bertahap (`GC-3`, FSD-COMPANY 0.54 §3): Grade (Name, Level) → Default Class (Name, Salary From/To)
 * → Review → Save. Save membuat Grade dan Class default dalam satu transaksi; Next ditolak sampai langkahnya sah.
 */
export function GradeCreateModal({ open, grades, onClose }: { open: boolean; grades: JobGrade[]; onClose: () => void }) {
  const create = useCreateGrade();
  const [step, setStep] = useState<Step>('grade');
  const [draft, setDraft] = useState<GradeDraft>(EMPTY_GRADE);

  useEffect(() => {
    if (!open) return;
    setStep('grade');
    setDraft(EMPTY_GRADE);
  }, [open]);

  const level = parseInteger(draft.level);
  const gradeReady = draft.name.trim() !== '' && level !== null && level >= 1;
  const from = amount(draft.defaultClass.salaryRangeFrom);
  const to = amount(draft.defaultClass.salaryRangeTo);
  const salaryError = from !== null && to !== null ? salaryRangeError('class', from, to) : null;
  const classReady = draft.defaultClass.name.trim() !== '' && from !== null && to !== null && !salaryError;
  const patchClass = (next: Partial<GradeDraft['defaultClass']>) =>
    setDraft((prev) => ({ ...prev, defaultClass: { ...prev.defaultClass, ...next } }));
  const peers = grades.filter((row) => row.parentId === null && row.sortOrder === level);

  const footer =
    step === 'grade' ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!gradeReady} onClick={() => setStep('class')}>
          Next
        </Button>
      </>
    ) : step === 'class' ? (
      <>
        <Button variant="secondary" onClick={() => setStep('grade')}>
          Back
        </Button>
        <Button disabled={!classReady} onClick={() => setStep('review')}>
          Next
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={() => setStep('class')}>
          Back
        </Button>
        <Button disabled={create.isPending} onClick={() => create.mutate(draft, { onSuccess: onClose })}>
          {create.isPending ? 'Saving…' : 'Save'}
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Add Grade"
      description="A grade is a job level. Every grade starts with one default class that carries the salary range."
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <StepMarker current={step} />

        {step === 'grade' && (
          <>
            <TextRow label="Name" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <TextRow
              label="Level"
              required
              hint="1 is the top level. Use the same number as another grade to place them on the same level."
              value={draft.level}
              onChange={(next) => setDraft({ ...draft, level: next })}
            />
            <LadderHint grades={grades.filter((row) => row.parentId === null)} />
          </>
        )}

        {step === 'class' && (
          <>
            <TextRow label="Class Name" required value={draft.defaultClass.name} onChange={(name) => patchClass({ name })} />
            <FieldGrid>
              <TextRow
                label="Salary From"
                required
                value={draft.defaultClass.salaryRangeFrom}
                onChange={(salaryRangeFrom) => patchClass({ salaryRangeFrom })}
              />
              <TextRow
                label="Salary To"
                required
                hint={salaryError ?? undefined}
                value={draft.defaultClass.salaryRangeTo}
                onChange={(salaryRangeTo) => patchClass({ salaryRangeTo })}
              />
            </FieldGrid>
          </>
        )}

        {step === 'review' && (
          <KeyValueList>
            <KeyValueRow label="Grade">{draft.name.trim()}</KeyValueRow>
            <KeyValueRow label="Level">
              Level {level}
              {peers.length > 0 && <span className="text-fg-3"> · same level as {peers.map(gradeLabel).join(', ')}</span>}
            </KeyValueRow>
            <KeyValueRow label="Default class">{draft.defaultClass.name.trim()}</KeyValueRow>
            <KeyValueRow label="Salary range">
              {from !== null && to !== null ? `${formatCurrency(from)} – ${formatCurrency(to)}` : '—'}
            </KeyValueRow>
            <KeyValueRow label="Codes">Generated by the system when you save</KeyValueRow>
          </KeyValueList>
        )}
      </div>
    </Modal>
  );
}

/** Edit Grade (`GC-5`): Name, Level (pindah tingkat), aktif — tanpa rentang gaji. */
export function GradeEditModal({ grade, onClose }: { grade: JobGrade | null; onClose: () => void }) {
  const update = useUpdateGrade();
  const [draft, setDraft] = useState<GradeEditDraft>({ name: '', level: '', isActive: true });

  useEffect(() => {
    if (grade) setDraft({ name: grade.name, level: String(grade.sortOrder), isActive: grade.isActive });
  }, [grade]);

  const level = parseInteger(draft.level);
  const ready = draft.name.trim() !== '' && level !== null && level >= 1;

  return (
    <Modal
      open={Boolean(grade)}
      onOpenChange={(next) => !next && onClose()}
      title={grade ? `Edit ${grade.name}` : 'Edit Grade'}
      description={
        grade
          ? `Code ${grade.gradeCode} is generated by the system. Moving to another level renumbers the codes of this level and its classes.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || update.isPending}
            onClick={() => grade && update.mutate({ id: grade.id, draft }, { onSuccess: onClose })}
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextRow label="Name" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <TextRow
          label="Level"
          required
          hint="1 is the top level; the same number as another grade means the same level."
          value={draft.level}
          onChange={(next) => setDraft({ ...draft, level: next })}
        />
        <label className="flex cursor-pointer items-center gap-2.5 font-body text-[13px] font-medium text-fg-2">
          <Checkbox checked={draft.isActive} onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked === true })} />
          Active
        </label>
      </div>
    </Modal>
  );
}

/**
 * Form Class (`GC-4`): Grade wajib (tidak dapat dikosongkan; saat Edit boleh diganti), Name, Salary From/To wajib
 * `to ≥ from`. Class baru masuk di urutan akhir Grade-nya.
 */
export function ClassFormModal({
  open,
  editing,
  grades,
  gradeId,
  onClose,
}: {
  open: boolean;
  editing: JobGrade | null;
  grades: JobGrade[];
  gradeId: string;
  onClose: () => void;
}) {
  const save = useSaveClass();
  const [draft, setDraft] = useState<ClassDraft>({ name: '', parentId: '', salaryRangeFrom: '', salaryRangeTo: '', isActive: true });

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            name: editing.name,
            parentId: editing.parentId ?? '',
            salaryRangeFrom: editing.salaryRangeFrom === null ? '' : String(editing.salaryRangeFrom),
            salaryRangeTo: editing.salaryRangeTo === null ? '' : String(editing.salaryRangeTo),
            isActive: editing.isActive,
          }
        : { name: '', parentId: gradeId, salaryRangeFrom: '', salaryRangeTo: '', isActive: true },
    );
  }, [open, editing, gradeId]);

  const from = amount(draft.salaryRangeFrom);
  const to = amount(draft.salaryRangeTo);
  const salaryError = from !== null && to !== null ? salaryRangeError('class', from, to) : null;
  const ready = draft.name.trim() !== '' && Boolean(draft.parentId) && from !== null && to !== null && !salaryError;
  const options = grades
    .filter((row) => row.parentId === null && (row.isActive || row.id === draft.parentId))
    .sort((a, b) => compareGradeCode(a.gradeCode, b.gradeCode))
    .map((row) => ({ value: row.id, label: gradeLabel(row) }));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Edit ${editing.name}` : 'Add Class'}
      description="A class is a salary step inside a grade. Its code is generated by the system."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || save.isPending}
            onClick={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectRow
          label="Grade"
          required
          disabled={!editing}
          hint={editing ? 'Moving a class to another grade puts it last in that grade.' : undefined}
          value={draft.parentId}
          onChange={(parentId) => setDraft({ ...draft, parentId })}
          options={options}
          placeholder="Select a grade"
        />
        <TextRow label="Name" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <FieldGrid>
          <TextRow
            label="Salary From"
            required
            value={draft.salaryRangeFrom}
            onChange={(salaryRangeFrom) => setDraft({ ...draft, salaryRangeFrom })}
          />
          <TextRow
            label="Salary To"
            required
            hint={salaryError ?? undefined}
            value={draft.salaryRangeTo}
            onChange={(salaryRangeTo) => setDraft({ ...draft, salaryRangeTo })}
          />
        </FieldGrid>
        {editing && (
          <label className="flex cursor-pointer items-center gap-2.5 font-body text-[13px] font-medium text-fg-2">
            <Checkbox checked={draft.isActive} onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked === true })} />
            Active
          </label>
        )}
      </div>
    </Modal>
  );
}
