import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { usePagedRows } from '@/hooks/usePagedRows';
import { SelectRow } from '@/features/company/components/CompanyBits';
import {
  ErrorBanner,
  PersonCell,
  PriorityBadge,
  ProdActorPicker,
  TaskStatusBadge,
} from '@/features/productivity/components/ProdBits';
import { CategoryModal, CreateTaskModal, TaskDetailModal } from '@/features/productivity/components/TaskModals';
import { useDeleteCategory, useProjects, useTaskCategories, useTasks } from '@/features/productivity/hooks/useProjects';
import {
  isHr,
  ORIGIN_LABEL,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  subordinatesOf,
} from '@/features/productivity/rules';
import { projectService } from '@/features/productivity/services/project.service';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { Task, TaskCategory, TaskPriority, TaskScope, TaskStatus } from '@/features/productivity/types';
import { formatDate } from '@/lib/format';

type Tab = 'TASKS' | 'CATEGORIES';

const SCOPE_LABEL: Record<TaskScope, string> = {
  MINE: 'My tasks',
  ASSIGNED_BY_ME: 'Assigned by me',
  TEAM: 'My team',
  ALL: 'All tasks',
};

interface Filters {
  status: '' | TaskStatus;
  priority: '' | TaskPriority;
  projectId: string;
  taskCategoryId: string;
}
const NO_FILTER: Filters = { status: '', priority: '', projectId: '', taskCategoryId: '' };

function TasksTab() {
  const { actor } = useProdActor();
  const scopes: TaskScope[] = [
    'MINE',
    'ASSIGNED_BY_ME',
    ...(subordinatesOf(actor.employeeId).length ? (['TEAM'] as const) : []),
    ...(isHr(actor.role) ? (['ALL'] as const) : []),
  ];
  const [scope, setScope] = useState<TaskScope>('MINE');
  const activeScope = scopes.includes(scope) ? scope : 'MINE';
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const categories = useTaskCategories();
  const projects = useProjects(actor, 'AKTIF', '');
  const tasks = useTasks(actor, {
    scope: activeScope,
    keyword,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    projectId: filters.projectId || undefined,
    taskCategoryId: filters.taskCategoryId || undefined,
  });
  const rows = tasks.data ?? [];
  const paged = usePagedRows(rows);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    paged.resetPage();
  };
  const active = Object.values(filters).filter(Boolean).length;
  const summary = [
    filters.status && STATUS_META[filters.status].label,
    filters.priority && PRIORITY_META[filters.priority].label,
    filters.projectId &&
      (filters.projectId === 'NONE' ? 'No project' : projectService.projectRef(filters.projectId)?.projectName),
    filters.taskCategoryId && categories.data?.find((row) => row.id === filters.taskCategoryId)?.categoryName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Card>
        <CardHead title={SCOPE_LABEL[activeScope]} sub="Newest first · open a task to update it or read its history" />
        <div>
          <TableToolbar
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Segmented<TaskScope>
                  value={activeScope}
                  onChange={(next) => {
                    setScope(next);
                    paged.resetPage();
                  }}
                  options={scopes.map((value) => ({ value, label: SCOPE_LABEL[value] }))}
                />
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {active ? `Filter (${active})` : 'Filter'}
                </Button>
              </div>
            }
            summary={summary || undefined}
            search={{
              value: keyword,
              onChange: (value) => {
                setKeyword(value);
                paged.resetPage();
              },
              placeholder: 'Search task…',
            }}
            actions={<AddButton onClick={() => setCreateOpen(true)}>New task</AddButton>}
          />
          <DataTable<Task>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={tasks.isLoading}
            empty={tasks.error ? tasks.error.message : 'No task matches this view.'}
            columns={[
              {
                key: 'code',
                header: 'Code',
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.code}</span>,
              },
              {
                key: 'title',
                header: 'Task',
                render: (row) => (
                  <span className="flex flex-col gap-0.5">
                    <span className="font-bold text-fg-1">{row.taskTitle}</span>
                    <span className="text-xs text-fg-3">{ORIGIN_LABEL[row.taskOrigin]}</span>
                  </span>
                ),
              },
              {
                key: 'project',
                header: 'Project',
                render: (row) =>
                  projectService.projectRef(row.projectId)?.projectName ?? (
                    <span className="text-fg-3">No project</span>
                  ),
              },
              {
                key: 'category',
                header: 'Category',
                muted: true,
                render: (row) => projectService.categoryRef(row.taskCategoryId)?.categoryName ?? 'Uncategorised',
              },
              {
                key: 'assignee',
                header: 'Assignee',
                render: (row) => <PersonCell employeeId={row.assigneeEmployeeId} />,
              },
              { key: 'status', header: 'Status', render: (row) => <TaskStatusBadge value={row.status} /> },
              { key: 'priority', header: 'Priority', render: (row) => <PriorityBadge value={row.priority} /> },
              { key: 'due', header: 'Due', nowrap: true, render: (row) => formatDate(row.dueDate) },
            ]}
            actions={(row) => <RowButton onClick={() => setOpenId(row.id)}>View Detail</RowButton>}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="tasks"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <FilterModal
        open={filterOpen}
        title="Filter tasks"
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilters(NO_FILTER);
          paged.resetPage();
        }}
      >
        <SelectRow
          label="Status"
          allowEmpty
          emptyLabel="All status"
          value={filters.status}
          onChange={(value) => set('status', value as Filters['status'])}
          options={(Object.keys(STATUS_META) as TaskStatus[]).map((value) => ({
            value,
            label: STATUS_META[value].label,
          }))}
        />
        <SelectRow
          label="Priority"
          allowEmpty
          emptyLabel="All priorities"
          value={filters.priority}
          onChange={(value) => set('priority', value as Filters['priority'])}
          options={PRIORITIES.map((value) => ({ value, label: PRIORITY_META[value].label }))}
        />
        <SelectRow
          label="Project"
          allowEmpty
          emptyLabel="All projects"
          value={filters.projectId}
          onChange={(value) => set('projectId', value)}
          options={[
            { value: 'NONE', label: 'No project' },
            ...(projects.data ?? []).map((row) => ({ value: row.id, label: `${row.code} ${row.projectName}` })),
          ]}
        />
        <SelectRow
          label="Category"
          allowEmpty
          emptyLabel="All categories"
          value={filters.taskCategoryId}
          onChange={(value) => set('taskCategoryId', value)}
          options={(categories.data ?? []).map((row) => ({ value: row.id, label: row.categoryName }))}
        />
      </FilterModal>

      <CreateTaskModal actor={actor} open={createOpen} onClose={() => setCreateOpen(false)} />
      <TaskDetailModal actor={actor} taskId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

/** Tab Kategori (`C1`–`C4`) — master HR-only; peran lain baca-saja. */
function CategoriesTab() {
  const { actor } = useProdActor();
  const categories = useTaskCategories();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<TaskCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaskCategory | null>(null);
  const hr = isHr(actor.role);
  return (
    <>
      <Card>
        <CardHead
          title="Task categories"
          sub={
            hr
              ? 'A category that has ever been used can only be deactivated, not deleted.'
              : 'Read only — managed by HR.'
          }
        />
        <div>
          <TableToolbar
            summary={`${categories.data?.length ?? 0} categories`}
            actions={
              hr ? (
                <AddButton
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  New category
                </AddButton>
              ) : undefined
            }
          />
          <DataTable<TaskCategory>
            rows={categories.data ?? []}
            rowKey={(row) => row.id}
            loading={categories.isLoading}
            columns={[
              { key: 'name', header: 'Category', strong: true, render: (row) => row.categoryName },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                ),
              },
              { key: 'used', header: 'Used by tasks', render: (row) => (row.inUse ? 'Yes' : 'No') },
              {
                key: 'created',
                header: 'Created',
                muted: true,
                nowrap: true,
                render: (row) => formatDate(row.createdAt),
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
                            setFormOpen(true);
                          },
                        },
                        { label: 'Delete', danger: true, disabled: row.inUse, onSelect: () => setDeleting(row) },
                      ]}
                    />
                  )
                : undefined
            }
          />
        </div>
      </Card>
      <CategoryModal actor={actor} category={editing} open={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            remove.reset();
          }
        }}
        title="Delete category?"
        description={`"${deleting?.categoryName}" has never been used by a task, so it can be deleted.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate({ actor, id: deleting.id, name: deleting.categoryName }, { onSuccess: () => setDeleting(null) })
        }
      >
        <ErrorBanner error={remove.error} />
      </ConfirmDialog>
    </>
  );
}

/**
 * Productivity › Project & Task › Tasks — FSD-001-PRODUCTIVITY-0.2 §3 (+ Kategori Task sebagai tab, bukan page).
 */
export function TasksPage() {
  const [tab, setTab] = useState<Tab>('TASKS');
  const [pickerKey, setPickerKey] = useState(0);
  return (
    <PageShell
      crumbs={[{ label: 'Productivity' }, { label: 'Project & Task' }, { label: 'Tasks' }]}
      title="Tasks"
      description="Tasks you work on, assign, or supervise. Due-date moves, on-hold periods, and reopening are kept in each task’s history."
      actions={<ProdActorPicker onChange={() => setPickerKey((n) => n + 1)} />}
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'TASKS', label: 'Tasks' },
            { value: 'CATEGORIES', label: 'Categories' },
          ]}
        />
        {tab === 'TASKS' ? <TasksTab key={pickerKey} /> : <CategoriesTab key={pickerKey} />}
      </div>
    </PageShell>
  );
}
