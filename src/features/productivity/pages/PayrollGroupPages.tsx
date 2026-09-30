import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Field, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { ErrorBanner, Note, ProdActorPicker } from '@/features/productivity/components/ProdBits';
import { useTaskCategories } from '@/features/productivity/hooks/useProjects';
import {
  useCreateMapping,
  useDeactivateMapping,
  useMappings,
  usePaidGroups,
  useSaveGroup,
} from '@/features/productivity/hooks/useTimesheet';
import { isHr } from '@/features/productivity/rules';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { CategoryMapping, PaidWorkGroup } from '@/features/productivity/types';
import { formatDate, formatDateTime } from '@/lib/format';

const CRUMBS = [{ label: 'Productivity' }, { label: 'Project & Task' }, { label: 'Group for Payroll' }];

/**
 * Productivity › Group for Payroll › Task List — FSD-001-PRODUCTIVITY-0.2 §8. Memetakan kategori pekerjaan ke
 * kelompok berbayar (HR saja menulis). Nonaktifkan, bukan hapus; memindah kategori = nonaktifkan lama → petakan baru.
 */
export function TaskListPage() {
  const { actor } = useProdActor();
  const hr = isHr(actor.role);
  const [view, setView] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const mappings = useMappings(view === 'ACTIVE');
  const groups = usePaidGroups();
  const categories = useTaskCategories();
  const create = useCreateMapping();
  const deactivate = useDeactivateMapping();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ taskCategoryId: '', paidWorkGroupId: '' });
  const [target, setTarget] = useState<CategoryMapping | null>(null);
  const [reason, setReason] = useState('');

  const closeForm = () => {
    setFormOpen(false);
    setDraft({ taskCategoryId: '', paidWorkGroupId: '' });
    create.reset();
  };
  const closeDeactivate = () => {
    setTarget(null);
    setReason('');
    deactivate.reset();
  };

  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'Task List' }]}
      title="Task List"
      description="Which task categories count as paid work, and in which paid work group. Categories that are not mapped never count as paid."
      actions={<ProdActorPicker />}
    >
      <Card>
        <CardHead
          title="Category mappings"
          sub={
            hr
              ? 'To move a category to another group, deactivate its mapping first, then map it again.'
              : 'Read only — managed by HR.'
          }
        />
        <div>
          <TableToolbar
            filters={
              <Segmented<'ACTIVE' | 'ALL'>
                value={view}
                onChange={setView}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'ALL', label: 'All, incl. inactive' },
                ]}
              />
            }
            actions={hr ? <AddButton onClick={() => setFormOpen(true)}>Map category</AddButton> : undefined}
          />
          <DataTable<CategoryMapping>
            rows={mappings.data ?? []}
            rowKey={(row) => row.id}
            loading={mappings.isLoading}
            empty="No category is mapped to a paid work group."
            columns={[
              { key: 'category', header: 'Task category', strong: true, render: (row) => row.taskCategoryName },
              { key: 'group', header: 'Paid work group', render: (row) => row.paidWorkGroupName },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span className="flex flex-col gap-0.5">
                    <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                    {!row.isActive && row.deactivationReason && (
                      <span className="max-w-[260px] whitespace-normal text-xs text-fg-3">
                        {row.deactivationReason}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: 'since',
                header: 'Since',
                muted: true,
                nowrap: true,
                render: (row) => (row.isActive ? formatDate(row.createdAt) : `Until ${formatDate(row.deactivatedAt)}`),
              },
            ]}
            actions={
              hr
                ? (row) => (row.isActive ? <RowButton onClick={() => setTarget(row)}>Deactivate</RowButton> : null)
                : undefined
            }
          />
        </div>
      </Card>

      <Modal
        open={formOpen}
        onOpenChange={(next) => !next && closeForm()}
        title="Map category"
        description="Hours recorded on tasks of this category from now on count toward the chosen paid work group."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              disabled={!draft.taskCategoryId || !draft.paidWorkGroupId || create.isPending}
              onClick={() => create.mutate({ actor, ...draft }, { onSuccess: closeForm })}
            >
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ErrorBanner error={create.error} />
          <SelectRow
            label="Task category"
            required
            placeholder="Choose category…"
            value={draft.taskCategoryId}
            onChange={(value) => setDraft((prev) => ({ ...prev, taskCategoryId: value }))}
            options={(categories.data ?? []).map((row) => ({ value: row.id, label: row.categoryName }))}
          />
          <SelectRow
            label="Paid work group"
            required
            placeholder="Choose group…"
            value={draft.paidWorkGroupId}
            onChange={(value) => setDraft((prev) => ({ ...prev, paidWorkGroupId: value }))}
            options={(groups.data ?? [])
              .filter((row) => row.isActive)
              .map((row) => ({ value: row.id, label: row.groupName }))}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(target)}
        onOpenChange={(next) => !next && closeDeactivate()}
        title="Deactivate mapping"
        description={target ? `${target.taskCategoryName} → ${target.paidWorkGroupName}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={closeDeactivate}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deactivate.isPending}
              onClick={() =>
                target && deactivate.mutate({ actor, id: target.id, reason }, { onSuccess: closeDeactivate })
              }
            >
              {deactivate.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ErrorBanner error={deactivate.error} />
          <Note tone="warn">
            The mapping stays on record. Hours already recorded keep their paid group; new hours of this category count
            as unpaid until it is mapped again.
          </Note>
          <Field label="Reason">
            <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        </div>
      </Modal>
    </PageShell>
  );
}

/**
 * Productivity › Group for Payroll › Group List — FSD-001-PRODUCTIVITY-0.2 §9. Master kelompok berbayar; HR saja
 * menulis. Nol endpoint hapus — "Delete" dinonaktifkan dengan alasan, bukan disembunyikan.
 */
export function GroupListPage() {
  const { actor } = useProdActor();
  const hr = isHr(actor.role);
  const groups = usePaidGroups();
  const save = useSaveGroup();
  const [editing, setEditing] = useState<PaidWorkGroup | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [active, setActive] = useState('true');

  useEffect(() => {
    if (!open) return;
    setName(editing?.groupName ?? '');
    setActive(editing?.isActive === false ? 'false' : 'true');
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang saat dibuka
  }, [open, editing?.id]);

  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'Group List' }]}
      title="Group List"
      description="Groups of work whose hours are recognised as paid. Work outside every group is still recorded and reported, but never sent to payroll."
      actions={<ProdActorPicker />}
    >
      <Card>
        <CardHead
          title="Paid work groups"
          sub={hr ? 'Groups cannot be deleted — deactivate them instead.' : 'Read only — managed by HR.'}
        />
        <div>
          <TableToolbar
            actions={
              hr ? (
                <AddButton
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  New group
                </AddButton>
              ) : undefined
            }
          />
          <DataTable<PaidWorkGroup>
            rows={groups.data ?? []}
            rowKey={(row) => row.id}
            loading={groups.isLoading}
            columns={[
              {
                key: 'code',
                header: 'Code',
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.code}</span>,
              },
              { key: 'name', header: 'Group', strong: true, render: (row) => row.groupName },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                muted: true,
                nowrap: true,
                render: (row) => formatDateTime(row.createdAt),
              },
            ]}
            actions={
              hr
                ? (row) => (
                    <RowActions
                      actions={[
                        {
                          label: 'Edit',
                          onSelect: () => {
                            setEditing(row);
                            setOpen(true);
                          },
                        },
                        { label: 'Delete — not available, deactivate instead', disabled: true },
                      ]}
                    />
                  )
                : undefined
            }
          />
        </div>
      </Card>

      <Modal
        open={open}
        onOpenChange={(next) => !next && setOpen(false)}
        title={editing ? 'Edit group' : 'New group'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || save.isPending}
              onClick={() =>
                save.mutate(
                  {
                    actor,
                    id: editing?.id,
                    input: { groupName: name, ...(editing ? { isActive: active === 'true' } : {}) },
                  },
                  { onSuccess: () => setOpen(false) },
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
          <TextRow label="Group name" required value={name} onChange={setName} />
          {editing && (
            <SelectRow
              label="Status"
              value={active}
              onChange={setActive}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          )}
          {editing && active === 'false' && (
            <Note tone="warn">
              Deactivating a group does not deactivate the category mappings that point to it. Deactivate those in Task
              List if they should stop counting as paid.
            </Note>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
