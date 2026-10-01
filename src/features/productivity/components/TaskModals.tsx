import { useEffect, useMemo, useState } from 'react';
import { DatePicker } from '@/components/DatePicker';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { EmployeeRow, Field, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { ErrorBanner, Note, TaskStatusBadge } from '@/features/productivity/components/ProdBits';
import {
  useCreateTask,
  useProjects,
  useSaveCategory,
  useTask,
  useTaskCategories,
  useTaskHistory,
  useUpdateTask,
} from '@/features/productivity/hooks/useProjects';
import { PROD_EMPLOYEES, prodEmployeeSource } from '@/features/productivity/mock-data';
import {
  canAssignTo,
  isSupervisorOf,
  nameOf,
  ORIGIN_LABEL,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  TASK_TRANSITIONS,
} from '@/features/productivity/rules';
import { projectService } from '@/features/productivity/services/project.service';
import type {
  ProdActor,
  TaskCategory,
  TaskChange,
  TaskDraft,
  TaskPatch,
  TaskPriority,
  TaskStatus,
} from '@/features/productivity/types';
import { formatDate, formatDateTime } from '@/lib/format';

const EMPTY_DRAFT: TaskDraft = {
  taskTitle: '',
  description: '',
  assigneeEmployeeId: '',
  projectId: '',
  taskCategoryId: '',
  priority: 'SEDANG',
  dueDate: '',
};

const projectLabel = (id: string | null) => {
  const project = projectService.projectRef(id);
  return project ? `${project.code} ${project.projectName}` : 'No project';
};
const categoryLabel = (id: string | null) => projectService.categoryRef(id)?.categoryName ?? 'Uncategorised';

/** Nilai `log_task_change` dirender manusiawi — nilainya tetap id/enum mentah di kontrak. */
function changeValue(change: TaskChange, value: string | null) {
  if (value === null) return '—';
  if (change.changedField === 'STATUS') return STATUS_META[value as TaskStatus]?.label ?? value;
  if (change.changedField === 'DUE_DATE') return formatDate(value);
  if (change.changedField === 'TASK_CATEGORY') return categoryLabel(value);
  if (change.changedField === 'PARENT_PROJECT') return projectLabel(value);
  return nameOf(value);
}

const FIELD_LABEL: Record<TaskChange['changedField'], string> = {
  STATUS: 'Status',
  DUE_DATE: 'Due date',
  TASK_CATEGORY: 'Category',
  PARENT_PROJECT: 'Project',
  ASSIGNEE: 'Assignee',
};

function usePickers(actor: ProdActor, projectId: string) {
  const projects = useProjects(actor, 'AKTIF', '');
  const categories = useTaskCategories();
  const owner = projects.data?.find((row) => row.id === projectId)?.ownerEmployeeId;
  const assignees = PROD_EMPLOYEES.filter((row) => canAssignTo(actor, row.employeeId, owner));
  return {
    projects: projects.data ?? [],
    categories: (categories.data ?? []).filter((row) => row.isActive),
    assignees,
  };
}

/** `A3` — pengerja menentukan `task_origin` di server; proyek arsip ditolak 422. */
export function CreateTaskModal({ actor, open, onClose }: { actor: ProdActor; open: boolean; onClose: () => void }) {
  const create = useCreateTask();
  const [draft, setDraft] = useState<TaskDraft>({ ...EMPTY_DRAFT, assigneeEmployeeId: actor.employeeId });
  const pickers = usePickers(actor, draft.projectId);
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const close = () => {
    setDraft({ ...EMPTY_DRAFT, assigneeEmployeeId: actor.employeeId });
    create.reset();
    onClose();
  };
  const valid = draft.taskTitle.trim() && draft.assigneeEmployeeId && draft.dueDate;
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="New task"
      description="Assigning to yourself creates a self-created task; assigning to someone else makes you the assigner."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() => create.mutate({ actor, draft }, { onSuccess: close })}
          >
            {create.isPending ? 'Creating…' : 'Create task'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={create.error} />
        <TextRow label="Task title" required value={draft.taskTitle} onChange={(value) => set('taskTitle', value)} />
        <Field label="Description">
          <Textarea rows={3} value={draft.description} onChange={(event) => set('description', event.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EmployeeRow
            label="Assignee"
            required
            lang="en"
            value={draft.assigneeEmployeeId}
            onChange={(value) => set('assigneeEmployeeId', value)}
            source={prodEmployeeSource(pickers.assignees, actor.employeeId)}
            hint="Yourself, people under you, or members of a project you own."
          />
          <Field label="Due date" required>
            <DatePicker value={draft.dueDate} onChange={(value) => set('dueDate', value)} />
          </Field>
          <SelectRow
            label="Project"
            allowEmpty
            emptyLabel="No project"
            value={draft.projectId}
            onChange={(value) => set('projectId', value)}
            options={pickers.projects.map((row) => ({ value: row.id, label: `${row.code} ${row.projectName}` }))}
          />
          <SelectRow
            label="Category"
            allowEmpty
            emptyLabel="Uncategorised"
            value={draft.taskCategoryId}
            onChange={(value) => set('taskCategoryId', value)}
            options={pickers.categories.map((row) => ({ value: row.id, label: row.categoryName }))}
            hint="Uncategorised work is never counted as paid work."
          />
          <SelectRow
            label="Priority"
            value={draft.priority}
            onChange={(value) => set('priority', value as TaskPriority)}
            options={PRIORITIES.map((value) => ({ value, label: PRIORITY_META[value].label }))}
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * `B3`/`B4` — ubah task + panel Riwayat (`log_task_change`, terbaru dulu). Tenggat mundur wajib beralasan;
 * status hanya menawarkan transisi sah (gerbang lain — jendela buka-kembali, wewenang — dijawab banner).
 */
export function TaskDetailModal({
  actor,
  taskId,
  onClose,
}: {
  actor: ProdActor;
  taskId: string | null;
  onClose: () => void;
}) {
  const task = useTask(actor, taskId);
  const history = useTaskHistory(actor, taskId);
  const update = useUpdateTask();
  const data = task.data;
  const [form, setForm] = useState<TaskDraft & { status: TaskStatus; changeReason: string }>({
    ...EMPTY_DRAFT,
    status: 'BELUM_DIKERJAKAN',
    changeReason: '',
  });
  const pickers = usePickers(actor, form.projectId);

  useEffect(() => {
    if (!data) return;
    setForm({
      taskTitle: data.taskTitle,
      description: data.description ?? '',
      assigneeEmployeeId: data.assigneeEmployeeId,
      projectId: data.projectId ?? '',
      taskCategoryId: data.taskCategoryId ?? '',
      priority: data.priority,
      dueDate: data.dueDate,
      status: data.status,
      changeReason: '',
    });
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang hanya saat task berganti/tersimpan
  }, [data?.id, data?.updatedAt]);

  const patch = useMemo<TaskPatch>(() => {
    if (!data) return {};
    const next: TaskPatch = {};
    if (form.taskTitle !== data.taskTitle) next.taskTitle = form.taskTitle;
    if (form.description !== (data.description ?? '')) next.description = form.description;
    if (form.priority !== data.priority) next.priority = form.priority;
    if (form.taskCategoryId !== (data.taskCategoryId ?? '')) next.taskCategoryId = form.taskCategoryId || null;
    if (form.projectId !== (data.projectId ?? '')) next.projectId = form.projectId || null;
    if (form.assigneeEmployeeId !== data.assigneeEmployeeId) next.assigneeEmployeeId = form.assigneeEmployeeId;
    if (form.dueDate !== data.dueDate) {
      next.dueDate = form.dueDate;
      if (form.changeReason.trim()) next.changeReason = form.changeReason;
    }
    if (form.status !== data.status) next.status = form.status;
    return next;
  }, [data, form]);

  if (!taskId) return null;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const isAssignee = data?.assigneeEmployeeId === actor.employeeId;
  const isAssigner = data?.assignerEmployeeId === actor.employeeId;
  const isChain = data ? isSupervisorOf(actor.employeeId, data.assigneeEmployeeId) : false;
  const editable = isAssignee || isAssigner || isChain;
  const dueEditable = data?.taskOrigin === 'DIBUAT_SENDIRI' ? isAssignee || isChain : isAssigner || isChain;
  const postponed = Boolean(data && form.dueDate > data.dueDate);
  const statusOptions = data ? [data.status, ...TASK_TRANSITIONS[data.status]] : [];
  const assigneeOptions = data
    ? PROD_EMPLOYEES.filter(
        (row) =>
          row.employeeId === data.assigneeEmployeeId || ((isAssigner || isChain) && canAssignTo(actor, row.employeeId)),
      )
    : [];
  const projectOptions = [
    ...pickers.projects.map((row) => ({ value: row.id, label: `${row.code} ${row.projectName}` })),
    ...(data?.projectId && !pickers.projects.some((row) => row.id === data.projectId)
      ? [{ value: data.projectId, label: projectLabel(data.projectId) }]
      : []),
  ];

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={data ? `${data.code} · ${data.taskTitle}` : 'Task'}
      description={
        data
          ? `${ORIGIN_LABEL[data.taskOrigin]} · created ${formatDateTime(data.createdAt)}${data.assignerEmployeeId ? ` · assigned by ${nameOf(data.assignerEmployeeId)}` : ''}`
          : undefined
      }
      size="wide"
      footer={
        editable ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!Object.keys(patch).length || update.isPending}
              onClick={() => data && update.mutate({ actor, id: data.id, patch })}
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      {!data ? (
        <p className="font-body text-[13px] font-medium text-fg-3">{task.error ? task.error.message : 'Loading…'}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <ErrorBanner error={update.error} />
          {!editable && (
            <Note>Read only — only the assignee, the assigner, or a supervisor in the chain can change this task.</Note>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextRow
                label="Task title"
                value={form.taskTitle}
                disabled={!editable}
                onChange={(value) => set('taskTitle', value)}
              />
            </div>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea
                  rows={3}
                  disabled={!editable}
                  value={form.description}
                  onChange={(event) => set('description', event.target.value)}
                />
              </Field>
            </div>
            <SelectRow
              label="Status"
              value={form.status}
              disabled={!editable}
              onChange={(value) => set('status', value as TaskStatus)}
              options={statusOptions.map((value) => ({ value, label: STATUS_META[value].label }))}
              hint={
                data.status === 'SELESAI' || data.status === 'DIBATALKAN'
                  ? 'A closed task can only switch between Done and Cancelled, within the entry window.'
                  : 'Only transitions allowed by the task status diagram are offered.'
              }
            />
            <SelectRow
              label="Priority"
              value={form.priority}
              disabled={!editable}
              onChange={(value) => set('priority', value as TaskPriority)}
              options={PRIORITIES.map((value) => ({ value, label: PRIORITY_META[value].label }))}
            />
            <Field
              label="Due date"
              hint={
                data.taskOrigin === 'DITUGASKAN'
                  ? `Original due date ${formatDate(data.originalDueDate)} · only the assigner or a supervisor can move it.`
                  : `Original due date ${formatDate(data.originalDueDate)}`
              }
            >
              <DatePicker
                value={form.dueDate}
                disabled={!dueEditable}
                clearable={false}
                onChange={(value) => set('dueDate', value)}
              />
            </Field>
            <EmployeeRow
              label="Assignee"
              lang="en"
              value={form.assigneeEmployeeId}
              disabled={!(isAssigner || isChain)}
              onChange={(value) => set('assigneeEmployeeId', value)}
              source={prodEmployeeSource(assigneeOptions)}
              hint="Changing the assignee does not change how the task was created."
            />
            <SelectRow
              label="Project"
              allowEmpty
              emptyLabel="No project"
              value={form.projectId}
              disabled={!editable}
              onChange={(value) => set('projectId', value)}
              options={projectOptions}
            />
            <SelectRow
              label="Category"
              allowEmpty
              emptyLabel="Uncategorised"
              value={form.taskCategoryId}
              disabled={!editable}
              onChange={(value) => set('taskCategoryId', value)}
              options={[
                ...pickers.categories.map((row) => ({ value: row.id, label: row.categoryName })),
                ...(data.taskCategoryId && !pickers.categories.some((row) => row.id === data.taskCategoryId)
                  ? [{ value: data.taskCategoryId, label: categoryLabel(data.taskCategoryId) }]
                  : []),
              ]}
            />
            {postponed && (
              <div className="md:col-span-2">
                <Field label="Reason for moving the due date" required hint="Required when the due date moves later.">
                  <Textarea
                    rows={2}
                    value={form.changeReason}
                    onChange={(event) => set('changeReason', event.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          <Field
            label="History"
            hint="Status (on hold, reopening), due date, category, project, and assignee changes — newest first."
          >
            {(history.data ?? []).length === 0 ? (
              <p className="m-0 font-body text-[13px] font-medium text-fg-3">No recorded change yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {(history.data ?? []).map((row) => (
                  <li key={row.id} className="rounded-md border border-fog px-3 py-2 font-body text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone="brand">{FIELD_LABEL[row.changedField]}</StatusBadge>
                      <span className="font-semibold text-fg-2">{changeValue(row, row.oldValue)}</span>
                      <span className="text-fg-3">→</span>
                      <span className="font-bold text-fg-1">{changeValue(row, row.newValue)}</span>
                    </div>
                    {row.changeReason && <p className="m-0 mt-1 text-xs font-medium text-fg-2">“{row.changeReason}”</p>}
                    <p className="m-0 mt-1 text-xs font-medium text-fg-3">
                      {row.createdBy.name} · {formatDateTime(row.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <div className="flex items-center gap-2 font-body text-xs font-medium text-fg-3">
            Current status <TaskStatusBadge value={data.status} />
          </div>
        </div>
      )}
    </Modal>
  );
}

/** `C3` — nama kategori (unik di antara yang aktif) + status aktif saat Ubah. */
export function CategoryModal({
  actor,
  category,
  open,
  onClose,
}: {
  actor: ProdActor;
  category: TaskCategory | null;
  open: boolean;
  onClose: () => void;
}) {
  const save = useSaveCategory();
  const [name, setName] = useState('');
  const [active, setActive] = useState('true');
  useEffect(() => {
    if (!open) return;
    setName(category?.categoryName ?? '');
    setActive(category?.isActive === false ? 'false' : 'true');
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang saat dibuka
  }, [open, category?.id]);
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={category ? 'Edit category' : 'New category'}
      description="Categories decide whether work can count as paid work (through Group for Payroll)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  actor,
                  id: category?.id,
                  input: { categoryName: name, ...(category ? { isActive: active === 'true' } : {}) },
                },
                { onSuccess: onClose },
              )
            }
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={save.error} />
        <TextRow label="Category name" required value={name} onChange={setName} />
        {category && (
          <SelectRow
            label="Status"
            value={active}
            onChange={setActive}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive — hidden from new tasks' },
            ]}
          />
        )}
      </div>
    </Modal>
  );
}
