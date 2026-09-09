import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { TableToolbar } from '@/components/TableToolbar';
import { Avatar } from '@/components/Avatar';
import { RowButton } from '@/components/RowActions';
import { usePtkpSubjects } from '@/features/ptkp/hooks/usePtkp';
import type { PtkpSubject } from '@/features/ptkp/types';

/**
 * Pemilih karyawan yang PTKP-nya akan diatur. Read-only — memilih di sini
 * hanya mengganti subjek layar, belum mengubah data apa pun.
 */
export function ChangeSubjectModal({
  open,
  currentId,
  onClose,
  onSelect,
}: {
  open: boolean;
  currentId?: string;
  onClose: () => void;
  onSelect: (subject: PtkpSubject) => void;
}) {
  const [query, setQuery] = useState('');
  const { data: rows = [], isLoading } = usePtkpSubjects();

  const filtered = rows.filter((row) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    return `${row.name} ${row.nik} ${row.position} ${row.branch}`.toLowerCase().includes(keyword);
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Change employee"
      description="Pilih karyawan yang status PTKP-nya akan diatur."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col">
        <TableToolbar
          search={{ value: query, onChange: setQuery, placeholder: 'Cari nama, NIK, atau unit…' }}
        />

        <DataTable<PtkpSubject>
          rows={filtered}
          rowKey={(row) => row.id}
          loading={isLoading}
          empty="Tidak ada karyawan yang cocok dengan pencarian."
          columns={[
            {
              key: 'name',
              header: 'Karyawan',
              render: (row) => (
                <CellIdentity name={row.name} sub={row.nik} leading={<Avatar name={row.name} size="sm" />} />
              ),
            },
            { key: 'position', header: 'Jabatan', muted: true, render: (row) => row.position },
            { key: 'branch', header: 'Unit', muted: true, render: (row) => row.branch },
          ]}
          actions={(row) => (
            <RowButton
              disabled={row.id === currentId}
              onClick={() => {
                onSelect(row);
                onClose();
              }}
            >
              {row.id === currentId ? 'Dipilih' : 'Pilih'}
            </RowButton>
          )}
        />
      </div>
    </Modal>
  );
}
