import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { AddButton, RemoveRowButton, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { materializationService } from '@/features/materialization/services/materialization.service';
import {
  INACTIVE_LABEL,
  SECTION_LABEL,
  SETUP_STATUS_LABEL,
  SETUP_STATUS_TONE,
  SETUP_TYPE_LABEL,
  branchLabel,
  canReadMaterialization,
  canWriteMaterialization,
  setupStatus,
} from '@/features/materialization/types';
import type { Assignee, Setup, SetupHistory, SetupSection, SetupTask, SetupType } from '@/features/materialization/types';
import { SUBTYPE_LABEL } from '@/features/transitions/types';
import type { TransferSubtype } from '@/features/transitions/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

type ListKey = 'handlers' | 'approvers';

/** MZ-ASSIGNEE-PICK — hanya karyawan yang layak (server menyaring); orang yang sudah dipilih tidak tampil. */
function AssigneePicker({
  setup,
  target,
  exclude,
  onAdd,
  onClose,
}: {
  setup: Setup;
  target: ListKey | null;
  exclude: string[];
  onAdd: (person: Assignee) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['materialization', 'eligible', setup.type, setup.branchId, keyword],
    queryFn: () => materializationService.eligible(setup, keyword),
    enabled: Boolean(target),
  });
  const rows = data.filter((person) => !exclude.includes(person.employeeId));
  return (
    <Modal
      open={Boolean(target)}
      onOpenChange={(next) => !next && onClose()}
      title={target === 'approvers' ? 'Add approver' : 'Add handler'}
      description="Active employees whose role is selected in Materialization Role Mapping and, for onboarding or offboarding, who work in this branch."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Input placeholder="Search employee name or NIK" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <DataTable<Assignee>
          rows={rows}
          rowKey={(row) => row.employeeId}
          loading={isLoading}
          empty="No eligible employee found."
          columns={[
            { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
            { key: 'nik', header: 'NIK', muted: true, render: (row) => row.nik },
            { key: 'branch', header: 'Branch', muted: true, render: (row) => row.branch },
          ]}
          actions={(row) => <RowButton onClick={() => onAdd(row)}>Add</RowButton>}
        />
      </div>
    </Modal>
  );
}

/** MZ-AUDIT — versi, penyimpan, aksi; klik baris membandingkan dengan versi sebelumnya. */
function HistoryModal({ setupId, open, onClose }: { setupId: string; open: boolean; onClose: () => void }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['materialization', 'history', setupId],
    queryFn: () => materializationService.history(setupId),
    enabled: open && Boolean(setupId),
  });
  const [picked, setPicked] = useState<number | null>(null);
  const index = data.findIndex((row) => row.version === picked);
  const after = index >= 0 ? data[index] : null;
  const before = index >= 0 ? data[index + 1] : null;
  const names = (row: SetupHistory | null | undefined, task: string, key: 'handlers' | 'approvers') =>
    row?.snapshot.find((item) => item.task === task)?.[key].join(', ') || '—';
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="History"
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <DataTable<SetupHistory>
          rows={data}
          rowKey={(row) => String(row.version)}
          loading={isLoading}
          empty={isError ? 'The history could not be loaded.' : 'No history yet.'}
          columns={[
            { key: 'version', header: 'Version', strong: true, render: (row) => `v${row.version}` },
            { key: 'at', header: 'Saved At', muted: true, nowrap: true, render: (row) => formatDateTime(row.savedAt) },
            { key: 'by', header: 'Saved By', render: (row) => row.savedBy },
            { key: 'action', header: 'Action', render: (row) => row.action },
          ]}
          actions={(row) => <RowButton onClick={() => setPicked(row.version === picked ? null : row.version)}>{row.version === picked ? 'Hide' : 'Compare'}</RowButton>}
        />
        {after && (
          <DataTable<SetupHistory['snapshot'][number]>
            rows={after.snapshot}
            rowKey={(row) => row.task}
            columns={[
              { key: 'task', header: 'Task', strong: true, render: (row) => row.task },
              { key: 'before', header: `Before (v${before?.version ?? '—'})`, muted: true, render: (row) => `${names(before, row.task, 'handlers')} · ${names(before, row.task, 'approvers')}` },
              { key: 'after', header: `After (v${after.version})`, render: (row) => `${row.handlers.join(', ') || '—'} · ${row.approvers.join(', ') || '—'}` },
            ]}
          />
        )}
      </div>
    </Modal>
  );
}

function PeopleList({
  title,
  people,
  readOnly,
  onRemove,
  onAdd,
  addLabel,
}: {
  title: string;
  people: Assignee[];
  readOnly: boolean;
  onRemove: (id: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-fg-3">
        {title} · {people.length}
      </span>
      {people.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {people.map((person, index) => (
            <li key={person.employeeId} className="flex items-center gap-2 rounded-md border border-border-1 bg-white px-3 py-1.5 font-body text-[13px]">
              <span className="w-5 text-fg-3">{index + 1}.</span>
              <span className="font-semibold text-fg-1">{person.name}</span>
              <span className="text-fg-3">
                {person.nik} · {person.branch}
              </span>
              {person.inactive && <StatusBadge tone="warn">Inactive · {INACTIVE_LABEL[person.inactive]}</StatusBadge>}
              {!readOnly && <RemoveRowButton className="ml-auto" aria-label={`Remove ${person.name}`} onClick={() => onRemove(person.employeeId)} />}
            </li>
          ))}
        </ol>
      )}
      {people.length < 2 && <span className="font-body text-xs font-medium text-error-700">At least 2 people are needed.</span>}
      {!readOnly && <AddButton onClick={onAdd}>{addLabel}</AddButton>}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-fg-3 transition-colors duration-200 ease-standard hover:bg-vapor hover:text-fg-1 disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

/**
 * Materialization › Setup — MZ-DETAIL (FSD-001-EMPLOYEE 0.83 §17.2). Save membuat versi baru; transisi yang
 * sudah berjalan tetap memakai versi bekunya, daftar petugas dibaca hidup.
 */
export function MaterializationDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const readOnly = !canWriteMaterialization(role);
  const id = params.get('id');
  const newType = params.get('new') as SetupType | null;

  const loaded = useQuery({ queryKey: ['materialization', 'setup', id], queryFn: () => materializationService.get(id!), enabled: Boolean(id) });
  const initial = useMemo(
    () =>
      id ? loaded.data : newType ? materializationService.blank(newType, (params.get('subtype') as TransferSubtype) || null, params.get('branch')) : undefined,
    [id, loaded.data, newType, params],
  );
  const [draft, setDraft] = useState<Setup | undefined>(initial);
  useEffect(() => setDraft(initial), [initial]);

  const [picking, setPicking] = useState<{ section: SetupSection; taskId: string; list: ListKey } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const save = useMutation({
    mutationFn: (setup: Setup) => materializationService.save(setup),
    onSuccess: (saved) => {
      toast(`Saved as version ${saved.version}. New transitions use this version.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: ['materialization'] });
      if (!id) navigate(`/employees/materialization/setup?id=${saved.id}`, { replace: true });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });

  const crumbs = [{ label: 'Employee Management' }, { label: 'Materialization', to: '/employees/materialization' }, { label: 'Setup' }];
  if (!canReadMaterialization(role)) {
    return (
      <PageShell crumbs={crumbs} title="Setup">
        <Note tone="warn" icon={<Lock />}>
          This menu is available to HR Manager, Super Admin, HR Staff and System Admin.
        </Note>
      </PageShell>
    );
  }
  if (!draft) {
    return (
      <PageShell crumbs={crumbs} title="Setup">
        {loaded.isError ? (
          <Note tone="warn" icon={<Lock />}>
            The setup could not be loaded.
          </Note>
        ) : (
          <p className="py-10 text-center font-body text-[13px] text-fg-3">Loading…</p>
        )}
      </PageShell>
    );
  }

  const updateTask = (section: SetupSection, taskId: string, patch: Partial<SetupTask>) =>
    setDraft({
      ...draft,
      sections: { ...draft.sections, [section]: draft.sections[section]!.map((task) => (task.id === taskId ? { ...task, ...patch } : task)) },
    });
  const moveTask = (section: SetupSection, index: number, by: number) => {
    const tasks = [...draft.sections[section]!];
    [tasks[index], tasks[index + by]] = [tasks[index + by], tasks[index]];
    setDraft({ ...draft, sections: { ...draft.sections, [section]: tasks } });
  };
  const removeTask = (section: SetupSection, taskId: string) =>
    setDraft({ ...draft, sections: { ...draft.sections, [section]: draft.sections[section]!.filter((task) => task.id !== taskId) } });
  const addTask = (section: SetupSection) =>
    setDraft({ ...draft, sections: { ...draft.sections, [section]: [...draft.sections[section]!, materializationService.newTask()] } });

  const pickingTask = picking ? draft.sections[picking.section]!.find((task) => task.id === picking.taskId) : undefined;
  const status = setupStatus(draft);

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title={`${SETUP_TYPE_LABEL[draft.type]} setup`}
        description="Tasks run in this order; a task waits for the ones above it. Each task needs at least 2 handlers, and at least 2 approvers when it requires approval."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/employees/materialization')}>
              Back
            </Button>
            {draft.id && (
              <Button variant="secondary" onClick={() => setHistoryOpen(true)}>
                History
              </Button>
            )}
            {!readOnly && (
              <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {readOnly && <Note icon={<Lock />}>View only. HR Manager or Super Admin can change this setup.</Note>}
          <KeyValueList>
            <KeyValueRow label="Type">{SETUP_TYPE_LABEL[draft.type]}</KeyValueRow>
            {draft.type === 'TRANSFER' && <KeyValueRow label="Subtype">{draft.subtype ? SUBTYPE_LABEL[draft.subtype] : 'All subtypes (used when no exact subtype setup exists)'}</KeyValueRow>}
            {draft.type !== 'TRANSFER' && <KeyValueRow label="Branch">{branchLabel(draft.branchId)}</KeyValueRow>}
            <KeyValueRow label="Version">{draft.version ? `v${draft.version}` : 'New'}</KeyValueRow>
            <KeyValueRow label="Status">
              <StatusBadge tone={SETUP_STATUS_TONE[status]}>{SETUP_STATUS_LABEL[status]}</StatusBadge>
            </KeyValueRow>
          </KeyValueList>

          {draft.type === 'TRANSFER' && (
            <label className="flex items-center gap-2.5 font-body text-[13px] font-medium text-fg-1">
              <Checkbox checked={draft.inOpensAfterOut} disabled={readOnly} onCheckedChange={(value) => setDraft({ ...draft, inOpensAfterOut: Boolean(value) })} />
              In opens after all Out tasks are completed and approved
            </label>
          )}

          {(Object.keys(draft.sections) as SetupSection[]).map((section) => {
            const tasks = draft.sections[section] ?? [];
            return (
              <Card key={section}>
                <CardHead
                  title={SECTION_LABEL[section]}
                  sub={section === 'OUT' ? 'Old branch — derived from the transition' : section === 'IN' ? 'New branch — derived from the target position' : `${tasks.length} tasks`}
                />
                <div className="flex flex-col gap-3">
                  {tasks.length === 0 && <p className="m-0 font-body text-[13px] text-fg-3">No task yet.</p>}
                  {tasks.map((task, index) =>
                    task.locked ? (
                      <div key={task.id} className="flex items-center gap-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3 font-body text-[13px]">
                        <Lock className="size-4 text-fg-3" />
                        <span className="font-semibold text-fg-1">{task.name}</span>
                        <span className="text-fg-3">Completed by the materialization itself. It cannot be changed or assigned.</span>
                      </div>
                    ) : (
                      <div key={task.id} className={cn('flex flex-col gap-3 rounded-md border border-border-1 bg-cloud p-4', task.facility && 'border-l-4', task.facility === 'PROVIDED' && 'border-l-success-500', task.facility === 'WITHDRAWN' && 'border-l-error-500')}>
                        <div className="grid items-end gap-3 md:grid-cols-[1fr_120px_160px_auto]">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`name-${task.id}`}>Task name</Label>
                            <Input id={`name-${task.id}`} value={task.name} disabled={readOnly || Boolean(task.facility)} onChange={(event) => updateTask(section, task.id, { name: event.target.value })} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`due-${task.id}`}>Due in (days)</Label>
                            <Input id={`due-${task.id}`} type="number" min={0} value={task.dueDays} disabled={readOnly} onChange={(event) => updateTask(section, task.id, { dueDays: Number(event.target.value) })} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label>Deadline class</Label>
                            <Select value={task.deadlineClass} disabled={readOnly} onValueChange={(value) => updateTask(section, task.id, { deadlineClass: value as SetupTask['deadlineClass'] })}>
                              <SelectTrigger aria-label="Deadline class">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                                <SelectItem value="LEGAL">Legal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {!readOnly && (
                            <div className="flex items-center">
                              <IconButton label="Move up" disabled={index === 0 || tasks[index - 1].locked} onClick={() => moveTask(section, index, -1)}>
                                <ArrowUp />
                              </IconButton>
                              <IconButton label="Move down" disabled={index === tasks.length - 1} onClick={() => moveTask(section, index, 1)}>
                                <ArrowDown />
                              </IconButton>
                              {!task.facility && <RemoveRowButton aria-label={`Remove ${task.name || 'task'}`} onClick={() => removeTask(section, task.id)} />}
                            </div>
                          )}
                        </div>
                        <label className="flex items-center gap-2.5 font-body text-[13px] font-medium text-fg-1">
                          <Checkbox
                            checked={task.requiresApproval}
                            disabled={readOnly || Boolean(task.facility)}
                            onCheckedChange={(value) => updateTask(section, task.id, { requiresApproval: Boolean(value) })}
                          />
                          Requires approval
                          {task.facility && <span className="text-fg-3">· Created only when the facility note is filled in. Two-party and approved.</span>}
                        </label>
                        <div className="grid gap-4 md:grid-cols-2">
                          <PeopleList
                            title="Handlers"
                            people={task.handlers}
                            readOnly={readOnly}
                            addLabel="Add handler"
                            onAdd={() => setPicking({ section, taskId: task.id, list: 'handlers' })}
                            onRemove={(personId) => updateTask(section, task.id, { handlers: task.handlers.filter((p) => p.employeeId !== personId) })}
                          />
                          {task.requiresApproval && (
                            <PeopleList
                              title="Approvers"
                              people={task.approvers}
                              readOnly={readOnly}
                              addLabel="Add approver"
                              onAdd={() => setPicking({ section, taskId: task.id, list: 'approvers' })}
                              onRemove={(personId) => updateTask(section, task.id, { approvers: task.approvers.filter((p) => p.employeeId !== personId) })}
                            />
                          )}
                        </div>
                      </div>
                    ),
                  )}
                  {!readOnly && (
                    <div>
                      <AddButton onClick={() => addTask(section)}>Add task</AddButton>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </PageShell>

      <AssigneePicker
        setup={draft}
        target={picking?.list ?? null}
        // Satu orang tidak boleh ada di Handlers dan Approvers tugas yang sama.
        exclude={pickingTask ? [...pickingTask.handlers, ...pickingTask.approvers].map((p) => p.employeeId) : []}
        onClose={() => setPicking(null)}
        onAdd={(person) => {
          if (!picking || !pickingTask) return;
          updateTask(picking.section, picking.taskId, { [picking.list]: [...pickingTask[picking.list], person] });
          setPicking(null);
        }}
      />
      <HistoryModal setupId={draft.id} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
