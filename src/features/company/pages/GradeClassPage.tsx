import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { AddButton, RowActions } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { GradeChart } from '@/features/company/components/GradeChart';
import { ClassFormModal, GradeCreateModal, GradeEditModal } from '@/features/company/components/GradeClassModals';
import { useDeleteJobGrade, useJobGrades } from '@/features/company/hooks/useCompany';
import { compareGradeCode, gradeLabel } from '@/features/company/rules';
import type { JobGrade } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';

type Tab = 'grade' | 'class';
type GradeView = 'chart' | 'table';

const ActiveBadge = ({ active }: { active: boolean }) =>
  active ? <StatusBadge tone="ok">Active</StatusBadge> : <StatusBadge tone="mute">Inactive</StatusBadge>;

/**
 * Settings › Company › Grade & Class — FSD-COMPANY 0.54/0.55/0.59 §3 · UIC-COMPANY 0.40/0.41/0.46 §2.4.
 *
 * **Grade** = tingkat jabatan berupa tangga (nomor tingkat 1 = puncak, nomor sama = setara, tanpa induk-anak
 * antar Grade, tanpa rentang gaji), tampil sebagai Chart View (bawaan) atau Table View. **Class** = kelas gaji di
 * dalam satu Grade, satu-satunya pemegang rentang gaji — tab Class wajib memilih Grade lebih dulu.
 * Kode server-generated: Grade `3A`, Class `3A.1`.
 */
export function GradeClassPage() {
  const grades = useJobGrades();
  const remove = useDeleteJobGrade();

  const [tab, setTab] = useState<Tab>('grade');
  const [view, setView] = useState<GradeView>('chart');
  const [search, setSearch] = useState('');
  const [classGradeId, setClassGradeId] = useState('');

  const [creatingGrade, setCreatingGrade] = useState(false);
  const [editingGrade, setEditingGrade] = useState<JobGrade | null>(null);
  const [classForm, setClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<JobGrade | null>(null);
  const [deleting, setDeleting] = useState<JobGrade | null>(null);

  const rows = useMemo(() => grades.data ?? [], [grades.data]);
  const gradeRows = useMemo(
    () => rows.filter((row) => row.parentId === null).sort((a, b) => compareGradeCode(a.gradeCode, b.gradeCode)),
    [rows],
  );
  const classCount = (gradeId: string) => rows.filter((row) => row.parentId === gradeId && row.isActive).length;

  const query = search.trim().toLowerCase();
  const filteredGrades = useMemo(
    () =>
      query
        ? gradeRows.filter((row) => row.name.toLowerCase().includes(query) || row.gradeCode.toLowerCase().includes(query))
        : gradeRows,
    [gradeRows, query],
  );
  const classRows = useMemo(
    () =>
      rows
        .filter((row) => classGradeId && row.parentId === classGradeId)
        .filter((row) => !query || row.name.toLowerCase().includes(query) || row.gradeCode.toLowerCase().includes(query))
        .sort((a, b) => compareGradeCode(a.gradeCode, b.gradeCode)),
    [rows, classGradeId, query],
  );
  const pagedGrades = usePagedRows(filteredGrades);
  const pagedClasses = usePagedRows(classRows);
  const selectedGrade = gradeRows.find((row) => row.id === classGradeId);

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Grade & Class' }]}
      title="Grade & Class"
      description="Job levels as a ladder (Grades) and the salary classes inside each grade."
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={(next) => {
            setTab(next);
            setSearch('');
          }}
          items={[
            { value: 'grade', label: 'Grade', count: gradeRows.length },
            { value: 'class', label: 'Class', count: rows.length - gradeRows.length },
          ]}
        />

        {tab === 'grade' && (
          <Card>
            <CardHead title="Grade" sub="Level 1 is the top; grades with the same number are on the same level" />
            <div>
              <TableToolbar
                search={
                  view === 'table' ? { value: search, onChange: setSearch, placeholder: 'Search name or code' } : undefined
                }
                actions={<AddButton onClick={() => setCreatingGrade(true)}>Add Grade</AddButton>}
              />
              <TabMenu<GradeView>
                className="mb-3"
                value={view}
                onChange={setView}
                items={[
                  { value: 'chart', label: 'Chart View' },
                  { value: 'table', label: 'Table View' },
                ]}
              />

              {view === 'chart' ? (
                <GradeChart grades={rows} />
              ) : (
                <>
                  <DataTable<JobGrade>
                    rows={pagedGrades.rows}
                    rowKey={(row) => row.id}
                    loading={grades.isLoading}
                    empty={grades.error ? String(grades.error.message) : 'No grade yet.'}
                    columns={[
                      { key: 'level', header: 'Level', nowrap: true, render: (row) => `Level ${row.sortOrder}` },
                      { key: 'code', header: 'Code', nowrap: true, render: (row) => <span className="font-mono text-xs">{row.gradeCode}</span> },
                      { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                      { key: 'classes', header: 'Classes', align: 'center', muted: true, render: (row) => <span className="tabular-nums">{classCount(row.id)}</span> },
                      { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
                    ]}
                    actions={(row) => (
                      <RowActions
                        actions={[
                          { label: 'Edit', onSelect: () => setEditingGrade(row) },
                          { label: 'Delete', danger: true, onSelect: () => setDeleting(row) },
                        ]}
                      />
                    )}
                  />
                  <Pagination
                    page={pagedGrades.page}
                    pageSize={pagedGrades.pageSize}
                    total={pagedGrades.total}
                    noun="grades"
                    onPageChange={pagedGrades.setPage}
                    onPageSizeChange={pagedGrades.setPageSize}
                  />
                  <p className="mt-2 font-body text-xs font-medium text-fg-4">
                    To move a grade to another level, edit it and change its Level. Codes are renumbered by the system.
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {tab === 'class' && (
          <Card>
            <CardHead title="Class" sub="Salary steps inside one grade — the only place a salary range is kept" />
            <div>
              <TableToolbar
                filters={
                  <Select
                    value={classGradeId}
                    onValueChange={(value) => {
                      setClassGradeId(value);
                      pagedClasses.resetPage();
                    }}
                  >
                    <SelectTrigger className="h-10 w-[260px]" aria-label="Grade">
                      <SelectValue placeholder="Select a grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeRows.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {gradeLabel(row)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                search={classGradeId ? { value: search, onChange: setSearch, placeholder: 'Search name or code' } : undefined}
                actions={
                  <AddButton disabled={!selectedGrade?.isActive} onClick={() => setClassForm(true)}>
                    Add Class
                  </AddButton>
                }
              />
              {classGradeId ? (
                <>
                  <DataTable<JobGrade>
                    rows={pagedClasses.rows}
                    rowKey={(row) => row.id}
                    loading={grades.isLoading}
                    empty="This grade has no class matching the search."
                    columns={[
                      { key: 'code', header: 'Code', nowrap: true, render: (row) => <span className="font-mono text-xs">{row.gradeCode}</span> },
                      { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                      {
                        key: 'range',
                        header: 'Salary Range',
                        align: 'right',
                        render: (row) =>
                          row.salaryRangeFrom === null || row.salaryRangeTo === null ? (
                            <span className="text-fg-4">—</span>
                          ) : (
                            <span className="tabular-nums">
                              {formatCurrency(row.salaryRangeFrom)} – {formatCurrency(row.salaryRangeTo)}
                            </span>
                          ),
                      },
                      { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
                    ]}
                    actions={(row) => (
                      <RowActions
                        actions={[
                          {
                            label: 'Edit',
                            onSelect: () => {
                              setEditingClass(row);
                              setClassForm(true);
                            },
                          },
                          { label: 'Delete', danger: true, onSelect: () => setDeleting(row) },
                        ]}
                      />
                    )}
                  />
                  <Pagination
                    page={pagedClasses.page}
                    pageSize={pagedClasses.pageSize}
                    total={pagedClasses.total}
                    noun="classes"
                    onPageChange={pagedClasses.setPage}
                    onPageSizeChange={pagedClasses.setPageSize}
                  />
                </>
              ) : (
                <p className="m-0 rounded-lg border border-dashed border-border-1 py-10 text-center font-body text-[13px] font-medium text-fg-3">
                  Select a Grade to view its classes
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      <GradeCreateModal open={creatingGrade} grades={gradeRows} onClose={() => setCreatingGrade(false)} />
      <GradeEditModal grade={editingGrade} onClose={() => setEditingGrade(null)} />
      <ClassFormModal
        open={classForm}
        editing={editingClass}
        grades={gradeRows}
        gradeId={classGradeId}
        onClose={() => {
          setClassForm(false);
          setEditingClass(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.parentId === null ? 'this grade' : 'this class'}?`}
        description={
          deleting
            ? deleting.parentId === null
              ? `${deleting.name} and all ${classCount(deleting.id)} of its classes will no longer be selectable.`
              : `${deleting.name} will no longer be selectable. The last active class of a grade cannot be deleted.`
            : undefined
        }
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
