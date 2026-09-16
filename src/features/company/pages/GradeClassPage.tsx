import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { JobGradeFormModal } from '@/features/company/components/CompanyModals';
import { useDeleteJobGrade, useJobGrades } from '@/features/company/hooks/useCompany';
import { isClass } from '@/features/company/rules';
import type { JobGrade } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';

/**
 * Settings › Company › Grade & Class — port `_prototype/company-grade-class.html`
 * (UIC-001-COMPANY-0.9 §2.4).
 *
 * Satu tabel berjenjang dua tingkat: baris tanpa induk adalah Grade, baris dengan induk adalah
 * Class. Rentang gaji wajib untuk Class dan tidak dipakai Grade.
 */
export function GradeClassPage() {
  const grades = useJobGrades();
  const remove = useDeleteJobGrade();

  const [search, setSearch] = useState('');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<JobGrade | null>(null);
  const [deleting, setDeleting] = useState<JobGrade | null>(null);

  const rows = useMemo(() => grades.data ?? [], [grades.data]);

  /** Grade tampil lebih dulu, Class menyusul tepat di bawah induknya. */
  const ordered = useMemo(() => {
    const parents = rows.filter((row) => row.parentId === null);
    return parents.flatMap((parent) => [parent, ...rows.filter((row) => row.parentId === parent.id)]);
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ordered;
    return ordered.filter(
      (row) => row.name.toLowerCase().includes(query) || row.gradeCode.toLowerCase().includes(query),
    );
  }, [ordered, search]);
  const paged = usePagedRows(filtered);

  const parentName = (row: JobGrade) =>
    row.parentId ? (rows.find((item) => item.id === row.parentId)?.name ?? '—') : '—';

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
      <Card>
        <CardHead title="Grade dan Class" sub="Class selalu berada di bawah sebuah Grade dan wajib membawa rentang gaji" />
        <div>
          <TableToolbar
            search={{ value: search, onChange: setSearch, placeholder: 'Cari nama atau kode' }}
            actions={<AddButton onClick={() => setForm(true)}>Add Grade / Class</AddButton>}
          />
          <DataTable<JobGrade>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={grades.isLoading}
            empty={grades.error ? String(grades.error.message) : 'Belum ada Grade maupun Class.'}
            columns={[
              {
                key: 'name',
                header: 'Nama',
                strong: true,
                render: (row) => (isClass(row) ? <span className="pl-4">{row.name}</span> : row.name),
              },
              {
                key: 'code',
                header: 'Kode',
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.gradeCode}</span>,
              },
              {
                key: 'type',
                header: 'Tingkat',
                render: (row) =>
                  isClass(row) ? <StatusBadge tone="info">Class</StatusBadge> : <StatusBadge tone="brand">Grade</StatusBadge>,
              },
              { key: 'parent', header: 'Induk', muted: true, render: parentName },
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
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="records"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <JobGradeFormModal open={form} editing={editing} grades={rows} onClose={closeForm} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus baris ini?"
        description={
          deleting
            ? `${deleting.name} tidak lagi bisa dipilih. Grade yang masih memayungi Class tidak bisa dihapus.`
            : undefined
        }
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
