import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: '1', name: 'Budi Santoso' },
  { id: '2', name: 'Siti Rahayu' },
];

const columns = [{ key: 'name', header: 'Employee', render: (row: Row) => row.name }];

describe('DataTable', () => {
  it('membekukan kolom hanya ketika ada kolom aksi', () => {
    const { container, rerender } = render(
      <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} />,
    );
    expect(container.querySelectorAll('td.sticky')).toHaveLength(0);

    rerender(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        actions={() => <RowButton onClick={vi.fn()}>View Detail</RowButton>}
      />,
    );
    // 2 baris × (identifier kiri + sel aksi kanan)
    expect(container.querySelectorAll('td.sticky')).toHaveLength(4);
  });

  it('mengosongkan label header kolom aksi', () => {
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        actions={() => <RowButton>View Detail</RowButton>}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Aksi' }).textContent).toBe('Aksi');
    expect(screen.getAllByRole('button', { name: 'View Detail' })).toHaveLength(2);
  });

  it('menampilkan empty state ketika tidak ada baris', () => {
    render(<DataTable rows={[]} columns={columns} rowKey={(row: Row) => row.id} empty="Belum ada karyawan." />);
    expect(screen.getByText('Belum ada karyawan.')).toBeInTheDocument();
  });
});
