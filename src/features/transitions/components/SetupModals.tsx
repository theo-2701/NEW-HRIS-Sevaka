import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveSetup, useSetupAudit } from '@/features/transitions/hooks/useTransitionHub';
import { setupService } from '@/features/transitions/services/setup.service';
import { MIN_ASSIGNEES } from '@/features/transitions/setup-types';
import type { MaterializationSetup, SetupAudit, SetupTask } from '@/features/transitions/setup-types';
import { setupTitle } from '@/features/transitions/setup-format';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Daftar orang berurutan — klik untuk menambah di urutan berikutnya, klik lagi untuk melepas. */
function AssigneePicker({
  label,
  value,
  exclude,
  onChange,
}: {
  label: string;
  value: string[];
  exclude: string[];
  onChange: (next: string[]) => void;
}) {
  const people = setupService.eligibleAssignees();
  const short = value.length < MIN_ASSIGNEES;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-body text-[13px] font-bold text-fg-1">
        {label} <span className={cn('font-medium', short ? 'text-error-800' : 'text-fg-3')}>({value.length}, min {MIN_ASSIGNEES})</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const order = value.indexOf(person.id);
          const blocked = exclude.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              disabled={blocked}
              aria-pressed={order >= 0}
              onClick={() => onChange(order >= 0 ? value.filter((id) => id !== person.id) : [...value, person.id])}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-body text-xs font-semibold transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500',
                order >= 0 ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-silver bg-white text-fg-2 hover:bg-mist',
                blocked && 'cursor-not-allowed opacity-50',
              )}
              title={blocked ? 'Already in the other list for this task' : undefined}
            >
              {order >= 0 && <span className="tabular-nums">{order + 1}.</span>}
              {person.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const blankTask = (n: number): SetupTask => ({
  code: `CUSTOM_${Date.now().toString(36)}_${n}`,
  name: '',
  side: 'PROVISION',
  durationDays: 3,
  approvalRequired: false,
  twoParty: false,
  locked: false,
  handlers: [],
  approvers: [],
});

/** Ubah setup — simpan menulis versi baru; transisi berjalan tetap memakai versi beku. */
export function EditSetupModal({
  setup,
  role,
  actor,
  onClose,
}: {
  setup: MaterializationSetup | null;
  role: 'HR_MANAGER' | 'HR_STAFF';
  actor: string;
  onClose: () => void;
}) {
  const save = useSaveSetup(role, actor);
  const [draft, setDraft] = useState<MaterializationSetup | null>(null);

  useEffect(() => {
    setDraft(setup ? { ...setup, tasks: setup.tasks.map((t) => ({ ...t, handlers: [...t.handlers], approvers: [...t.approvers] })) } : null);
  }, [setup]);

  if (!setup || !draft) return null;
  const update = (index: number, patch: Partial<SetupTask>) =>
    setDraft({ ...draft, tasks: draft.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  const twoSided = draft.type !== 'ONBOARDING';

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`Edit setup — ${setupTitle(setup)}`}
      description={`Version ${setup.version}. Saving creates version ${setup.version + 1}; running transitions keep the version they started with.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate(draft, { onSuccess: onClose })}>
            {save.isPending ? 'Saving…' : 'Save new version'}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1">
        {twoSided && (
          <label className="flex items-center gap-3">
            <Checkbox checked={draft.outFirstGate} onCheckedChange={(next) => setDraft({ ...draft, outFirstGate: next === true })} />
            <span className="font-body text-[13px] font-medium text-fg-2">Open the In part only after every Out task is done and approved</span>
          </label>
        )}
        {draft.tasks.map((item, index) => (
          <div key={item.code} className="flex flex-col gap-3 rounded-md border border-border-1 p-3.5">
            {item.locked ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-[13px] font-bold text-fg-1">{item.name}</span>
                <StatusBadge tone="mute">System — completed by materialization</StatusBadge>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_auto] md:items-end">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`task-name-${index}`}>
                      Task name<em>*</em>
                    </Label>
                    <Input id={`task-name-${index}`} value={item.name} maxLength={120} onChange={(e) => update(index, { name: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Part</Label>
                    <Select value={item.side} onValueChange={(value) => update(index, { side: value as SetupTask['side'] })} disabled={!twoSided}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RELINQUISH">Out</SelectItem>
                        <SelectItem value="PROVISION">In</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`task-days-${index}`}>Days</Label>
                    <Input
                      id={`task-days-${index}`}
                      type="number"
                      min={0}
                      value={item.durationDays}
                      onChange={(e) => update(index, { durationDays: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                  <Button variant="ghost" onClick={() => setDraft({ ...draft, tasks: draft.tasks.filter((_, i) => i !== index) })}>
                    Remove
                  </Button>
                </div>
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={item.approvalRequired}
                      onCheckedChange={(next) => update(index, { approvalRequired: next === true, approvers: next === true ? item.approvers : [] })}
                    />
                    <span className="font-body text-[13px] font-medium text-fg-2">Needs approval</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={item.twoParty} onCheckedChange={(next) => update(index, { twoParty: next === true })} />
                    <span className="font-body text-[13px] font-medium text-fg-2">Employee confirms (two-party)</span>
                  </label>
                </div>
                <AssigneePicker label="Handlers, in order" value={item.handlers} exclude={item.approvers} onChange={(handlers) => update(index, { handlers })} />
                {item.approvalRequired && (
                  <AssigneePicker label="Approvers, in order" value={item.approvers} exclude={item.handlers} onChange={(approvers) => update(index, { approvers })} />
                )}
              </>
            )}
          </div>
        ))}
        <Button variant="secondary" className="self-start" onClick={() => setDraft({ ...draft, tasks: [...draft.tasks, blankTask(draft.tasks.length)] })}>
          <Plus />
          Add task
        </Button>
      </div>
    </Modal>
  );
}

export function SetupHistoryModal({ setup, onClose }: { setup: MaterializationSetup | null; onClose: () => void }) {
  const audit = useSetupAudit(setup?.setupId ?? null);
  if (!setup) return null;
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`History — ${setupTitle(setup)}`}
      description="Every save is a new version. Older versions stay readable for transitions that still use them."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<SetupAudit>
        rows={audit.data ?? []}
        rowKey={(row) => `${row.version}-${row.at}`}
        loading={audit.isLoading}
        empty="No history."
        columns={[
          { key: 'version', header: 'Version', align: 'right', render: (row) => <span className="tabular-nums">{row.version}</span> },
          { key: 'by', header: 'Saved By', strong: true, render: (row) => row.by },
          { key: 'at', header: 'Saved At', nowrap: true, muted: true, render: (row) => formatDateTime(row.at) },
          { key: 'summary', header: 'Change', muted: true, render: (row) => row.summary },
        ]}
      />
    </Modal>
  );
}
