import { useEffect, useMemo, useState } from 'react';
import { Segmented } from '@/components/Segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GradeLadderChart } from '@/features/company/components/GradeLadderChart';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { JobGradeFormModal } from '@/features/company/components/CompanyModals';
import { useDeleteJobGrade, useJobGrades, useReorderJobGrades } from '@/features/company/hooks/useCompany';
import type { JobGrade } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';

type Tab = 'grade' | 'class';
type GradeView = 'chart' | 'table';

/**
 * Settings › Company › Grade & Class — port `_prototype/company-grade-class.html`
 * (UIC-001-COMPANY-0.22 §2.4).
 *
 * Dua tab terpisah (permintaan pengguna 23 September 2026, supaya Grade dan Class tidak
 * bercampur dalam satu tabel): **Grade** — jenjang puncak, tanpa induk, tanpa rentang gaji.
 * **Class** — selalu berada di bawah sebuah Grade dan wajib membawa rentang gaji. Keduanya
 * tetap satu dataset `mst_job_grade`; kode tetap dibuat otomatis oleh sistem dari kedalaman +
 * urutan (server-generated sejak `T49`, lihat `rules.ts`).
 */
export function GradeClassPage() {
  const grades = useJobGrades();
  const remove = useDeleteJobGrade();
  const reorder = useReorderJobGrades();
  const [view, setView] = useState<GradeView>('chart');
  /** Daftar Class wajib Grade (TSD-COMPANY 0.109 §7.3): tab Class selalu memuat satu Grade. */
  const [classGrade, setClassGrade] = useState('');

  const [tab, setTab] = useState<Tab>('grade');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<JobGrade | null>(null);
  const [deleting, setDeleting] = useState<JobGrade | null>(null);

  const rows = useMemo(() => grades.data ?? [], [grades.data]);
  const gradeRows = useMemo(() => rows.filter((row) => row.parentId === null), [rows]);
  const classRows = useMemo(() => rows.filter((row) => row.parentId !== null), [rows]);

  useEffect(() => {
    if (!classGrade && gradeRows.length) setClassGrade(gradeRows[0].id);
  }, [classGrade, gradeRows]);

  /** Naik/turun satu langkah di antara saudara sekandung — alternatif tanpa seret (T4). */
  const moveActions = (row: JobGrade) => {
    const siblings = rows.filter((item) => item.parentId === row.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((item) => item.id === row.id);
    const move = (delta: number) => {
      const ids = siblings.map((item) => item.id);
      [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
      reorder.mutate({ parentId: row.parentId, orderedIds: ids });
    };
    return [
      ...(index > 0 ? [{ label: 'Naikkan urutan', onSelect: () => move(-1) }] : []),
      ...(index < siblings.length - 1 ? [{ label: 'Turunkan urutan', onSelect: () => move(1) }] : []),
    ];
  };
  const gradeName = (id: string | null) => (id ? (rows.find((row) => row.id === id)?.name ?? '—') : '—');

  const filteredGrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return gradeRows;
    return gradeRows.filter((row) => row.name.toLowerCase().includes(query) || row.gradeCode.toLowerCase().includes(query));
  }, [gradeRows, search]);
  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const inGrade = classRows.filter((row) => row.parentId === classGrade);
    if (!query) return inGrade;
    return inGrade.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.gradeCode.toLowerCase().includes(query),
    );
  }, [classRows, classGrade, search]);
  const pagedGrades = usePagedRows(filteredGrades);
  const pagedClasses = usePagedRows(filteredClasses);

  const closeForm = () => {
    setForm(false);
    setEditing(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Grade & Class' }]}
      title="Grade & Class"
      description="Jenjang jabatan dua tingkat beserta rentang gaji yang menjadi acuan penempatan karyawan."
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
            { value: 'class', label: 'Class', count: classRows.length },
          ]}
        />

        {tab === 'grade' && (
          <Card>
            <CardHead title="Grade" sub="Jenjang puncak — tanpa induk dan tanpa rentang gaji" />
            <div>
              <TableToolbar
                search={{ value: search, onChange: setSearch, placeholder: 'Cari nama atau kode' }}
                actions={<AddButton onClick={() => setForm(true)}>Add Grade</AddButton>}
              />
              <Segmented<GradeView>
                className="mb-4"
                value={view}
                onChange={setView}
                options={[
                  { value: 'chart', label: 'Chart View' },
                  { value: 'table', label: 'Table View' },
                ]}
              />
              {view === 'chart' ? (
                <GradeLadderChart
                  grades={gradeRows}
                  classCount={(id) => classRows.filter((item) => item.parentId === id).length}
                />
              ) : (
              <>
              <DataTable<JobGrade>
                rows={pagedGrades.rows}
                rowKey={(row) => row.id}
                loading={grades.isLoading}
                empty={grades.error ? String(grades.error.message) : 'Belum ada Grade.'}
                columns={[
                  { key: 'name', header: 'Nama', strong: true, render: (row) => row.name },
                  {
                    key: 'code',
                    header: 'Kode',
                    nowrap: true,
                    render: (row) => <span className="font-mono text-xs">{row.gradeCode}</span>,
                  },
                  {
                    key: 'classes',
                    header: 'Jumlah Class',
                    align: 'center',
                    muted: true,
                    render: (row) => (
                      <span className="tabular-nums">{classRows.filter((item) => item.parentId === row.id).length}</span>
                    ),
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Ubah',
                        onSelect: () => {
                          setEditing(row);
                          setForm(true);
                        },
                      },
                      ...moveActions(row),
                      { label: 'Hapus', danger: true, onSelect: () => setDeleting(row) },
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
              </>
              )}
            </div>
          </Card>
        )}

        {tab === 'class' && (
          <Card>
            <CardHead title="Class" sub="Selalu berada di bawah sebuah Grade dan wajib membawa rentang gaji" />
            <div>
              <TableToolbar
                filters={
                  <Select
                    value={classGrade}
                    onValueChange={(value) => {
                      setClassGrade(value);
                      pagedClasses.resetPage();
                    }}
                  >
                    <SelectTrigger className="w-[220px]" aria-label="Grade">
                      <SelectValue placeholder="Pilih Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeRows.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.name} ({row.gradeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                search={{ value: search, onChange: setSearch, placeholder: 'Cari nama atau kode' }}
                actions={
                  <AddButton disabled={!classGrade} onClick={() => setForm(true)}>
                    Add Class
                  </AddButton>
                }
              />
              <DataTable<JobGrade>
                rows={pagedClasses.rows}
                rowKey={(row) => row.id}
                loading={grades.isLoading}
                empty={grades.error ? String(grades.error.message) : 'Belum ada Class.'}
                columns={[
                  { key: 'name', header: 'Nama', strong: true, render: (row) => row.name },
                  {
                    key: 'code',
                    header: 'Kode',
                    nowrap: true,
                    render: (row) => <span className="font-mono text-xs">{row.gradeCode}</span>,
                  },
                  { key: 'parent', header: 'Grade', render: (row) => gradeName(row.parentId) },
                  {
                    key: 'range',
                    header: 'Rentang gaji',
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
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Ubah',
                        onSelect: () => {
                          setEditing(row);
                          setForm(true);
                        },
                      },
                      ...moveActions(row),
                      { label: 'Hapus', danger: true, onSelect: () => setDeleting(row) },
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
            </div>
          </Card>
        )}
      </div>

      <JobGradeFormModal
        open={form}
        editing={editing}
        grades={rows}
        mode={tab}
        parentGradeId={tab === 'class' ? classGrade : undefined}
        onClose={closeForm}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Hapus ${tab === 'grade' ? 'Grade' : 'Class'} ini?`}
        description={
          deleting
            ? `${deleting.name} tidak lagi bisa dipilih.${tab === 'grade' ? ' Grade yang masih memayungi Class tidak bisa dihapus.' : ''}`
            : undefined
        }
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
