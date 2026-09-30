import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { usePagedRows } from '@/hooks/usePagedRows';
import { PersonCell, ProdActorPicker } from '@/features/productivity/components/ProdBits';
import {
  ArchivedProjectModal,
  CreateProjectModal,
  ProjectDetailModal,
} from '@/features/productivity/components/ProjectModals';
import { useDeleteProject, useProjects } from '@/features/productivity/hooks/useProjects';
import { isHr } from '@/features/productivity/rules';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { Project, ProjectState } from '@/features/productivity/types';
import { formatDate, formatDateTime } from '@/lib/format';

const PATHS: Record<ProjectState, string> = {
  AKTIF: '/productivity/projects',
  ARSIP: '/productivity/projects/archive',
};

/**
 * Productivity › Project & Task › Project — FSD-001-PRODUCTIVITY-0.2 §1 (Active) & §2 (Archive).
 *
 * `state` AKTIF dan ARSIP adalah dua halaman ber-URL sendiri (keputusan granularitas SAD §4.6), dihubungkan tab.
 * Proyek lahir AKTIF; arsip digerbangi task terbuka; Archive hanya bisa Restore (nol Create).
 */
export function ProjectsPage({ state }: { state: ProjectState }) {
  const navigate = useNavigate();
  const { actor } = useProdActor();
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const projects = useProjects(actor, state, keyword);
  const remove = useDeleteProject();
  const rows = projects.data ?? [];
  const paged = usePagedRows(rows);
  const open = rows.find((row) => row.id === openId) ?? null;
  const active = state === 'AKTIF';
  const canManage = (row: Project) => row.ownerEmployeeId === actor.employeeId || isHr(actor.role);

  return (
    <PageShell
      crumbs={[{ label: 'Productivity' }, { label: 'Project & Task' }, { label: 'Project' }]}
      title="Project"
      description="Projects you own, review, or oversee. Archived projects accept no new tasks until they are restored."
      actions={<ProdActorPicker onChange={() => setOpenId(null)} />}
    >
      <div className="flex flex-col gap-5">
        <TabMenu<ProjectState>
          value={state}
          onChange={(next) => navigate(PATHS[next])}
          items={[
            { value: 'AKTIF', label: 'Active' },
            { value: 'ARSIP', label: 'Archive' },
          ]}
        />
        <Card>
          <CardHead
            title={active ? 'Active projects' : 'Archived projects'}
            sub={active ? 'Newest first' : 'Open a project to restore it to Active'}
          />
          <div>
            <TableToolbar
              search={{
                value: keyword,
                onChange: (value) => {
                  setKeyword(value);
                  paged.resetPage();
                },
                placeholder: 'Search project…',
              }}
              actions={active ? <AddButton onClick={() => setCreateOpen(true)}>New project</AddButton> : undefined}
            />
            <DataTable<Project>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={projects.isLoading}
              empty={active ? 'No active project yet.' : 'No archived project.'}
              columns={[
                {
                  key: 'code',
                  header: 'Code',
                  nowrap: true,
                  render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                },
                { key: 'name', header: 'Project', strong: true, render: (row) => row.projectName },
                { key: 'owner', header: 'Owner', render: (row) => <PersonCell employeeId={row.ownerEmployeeId} /> },
                ...(active
                  ? [
                      {
                        key: 'members',
                        header: 'Members',
                        align: 'right' as const,
                        render: (row: Project) => row.memberCount,
                      },
                      {
                        key: 'open',
                        header: 'Open tasks',
                        align: 'right' as const,
                        render: (row: Project) => row.openTaskCount,
                      },
                      {
                        key: 'created',
                        header: 'Created',
                        muted: true,
                        nowrap: true,
                        render: (row: Project) => formatDate(row.createdAt),
                      },
                    ]
                  : [
                      {
                        key: 'archived',
                        header: 'Archived since',
                        nowrap: true,
                        render: (row: Project) => formatDateTime(row.archivedAt),
                      },
                    ]),
              ]}
              actions={(row) =>
                active && canManage(row) ? (
                  <RowActions
                    actions={[
                      { label: 'View Detail', onSelect: () => setOpenId(row.id) },
                      { label: 'Delete', danger: true, onSelect: () => setDeleting(row) },
                    ]}
                  />
                ) : (
                  <RowButton onClick={() => setOpenId(row.id)}>View Detail</RowButton>
                )
              }
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="projects"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <CreateProjectModal actor={actor} open={createOpen} onClose={() => setCreateOpen(false)} />
      {active ? (
        <ProjectDetailModal actor={actor} project={open} onClose={() => setOpenId(null)} />
      ) : (
        <ArchivedProjectModal actor={actor} project={open} onClose={() => setOpenId(null)} />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete project?"
        description={`${deleting?.code} ${deleting?.projectName} will be removed from the list. Tasks keep their data.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate({ actor, id: deleting.id, code: deleting.code }, { onSuccess: () => setDeleting(null) })
        }
      />
    </PageShell>
  );
}
