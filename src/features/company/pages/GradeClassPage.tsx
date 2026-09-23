import { useMemo, useState } from 'react';
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
import { useDeleteJobGrade, useJobGrades } from '@/features/company/hooks/useCompany';
import type { JobGrade } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';

type Tab = 'grade' | 'class';

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

  const [tab, setTab] = useState<Tab>('grade');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<JobGrade | null>(null);
  const [deleting, setDeleting] = useState<JobGrade | null>(null);

  const rows = useMemo(() => grades.data ?? [], [grades.data]);
  const gradeRows = useMemo(() => rows.filter((row) => row.parentId === null), [rows]);
  const classRows = useMemo(() => rows.filter((row) => row.parentId !== null), [rows]);
  const gradeName = (id: string | null) => (id ? (rows.find((row) => row.id === id)?.name ?? '—') : '—');

  const filteredGrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return gradeRows;
    return gradeRows.filter((row) => row.name.toLowerCase().includes(query) || row.gradeCode.toLowerCase().includes(query));
  }, [gradeRows, search]);
  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return classRows;
    return classRows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.gradeCode.toLowerCase().includes(query) ||
        (rows.find((item) => item.id === row.parentId)?.name.toLowerCase() ?? '').includes(query),
    );
  }, [classRows, rows, search]);
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
            </div>
          </Card>
        )}

        {tab === 'class' && (
          <Card>
            <CardHead title="Class" sub="Selalu berada di bawah sebuah Grade dan wajib membawa rentang gaji" />
            <div>
              <TableToolbar
                search={{ value: search, onChange: setSearch, placeholder: 'Cari nama, kode, atau Grade' }}
                actions={<AddButton onClick={() => setForm(true)}>Add Class</AddButton>}
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

      <JobGradeFormModal open={form} editing={editing} grades={rows} mode={tab} onClose={closeForm} />

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
