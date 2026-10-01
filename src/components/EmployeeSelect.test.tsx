import { useState, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EmployeeSelect } from '@/components/EmployeeSelect';
import { createLocalEmployeeSource, type EmployeeOption } from '@/lib/employeeSource';

const ROWS: EmployeeOption[] = [
  { id: 'emp-a', name: 'Ayu Lestari', nik: 'NIK-01', unit: 'Finance' },
  { id: 'emp-b', name: 'Bima Sakti', nik: 'NIK-02', unit: 'Operations' },
  { id: 'emp-c', name: 'Citra Dewi', nik: 'NIK-03', unit: 'Finance' },
];
const WITH_UNIT = createLocalEmployeeSource('test-single', ROWS, { latency: 0, sameUnitAs: 'Finance' });
const PLAIN = createLocalEmployeeSource('test-multi', ROWS, { latency: 0 });

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function Single() {
  const [value, setValue] = useState('');
  return <EmployeeSelect source={WITH_UNIT} value={value} onChange={setValue} aria-label="Karyawan" />;
}

function Multi() {
  const [value, setValue] = useState<string[]>([]);
  return <EmployeeSelect multiple source={PLAIN} value={value} onChange={setValue} aria-label="Peserta" />;
}

beforeAll(() => {
  // Radix Popper mengukur jangkar lewat ResizeObserver, yang tidak ada di jsdom.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => window.localStorage.clear());

describe('<EmployeeSelect>', () => {
  it('menampilkan nama + NIK · unit, lalu memilih satu karyawan', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Single />);

    await user.click(screen.getByRole('button', { name: 'Karyawan' }));
    const option = await screen.findByRole('option', { name: /Bima Sakti/ });
    expect(option).toHaveTextContent('NIK-02 · Operations');

    await user.click(option);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Karyawan' })).toHaveTextContent('Bima Sakti');
  });

  it('sebelum mengetik menampilkan terakhir dipilih dan satu unit', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Single />);

    await user.click(screen.getByRole('button', { name: 'Karyawan' }));
    await user.click(await screen.findByRole('option', { name: /Bima Sakti/ }));
    await user.click(screen.getByRole('button', { name: 'Karyawan' }));

    const recent = await screen.findByRole('group', { name: 'Terakhir dipilih' });
    expect(within(recent).getByRole('option', { name: /Bima Sakti/ })).toBeInTheDocument();
    const unit = await screen.findByRole('group', { name: 'Satu unit dengan Anda' });
    expect(within(unit).getAllByRole('option').map((row) => row.textContent)).toEqual([
      'Ayu LestariNIK-01 · Finance',
      'Citra DewiNIK-03 · Finance',
    ]);
  });

  it('mencari lewat kata kunci dan memilih dengan Enter', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Single />);

    await user.click(screen.getByRole('button', { name: 'Karyawan' }));
    await user.type(screen.getByRole('combobox'), 'nik-03');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option')).toHaveTextContent('Citra Dewi');

    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Karyawan' })).toHaveTextContent('Citra Dewi');
  });

  it('multi-pilih: centang menambah chip, tombol × menghapusnya', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Multi />);

    await user.click(screen.getByRole('button', { name: 'Peserta' }));
    await user.click(await screen.findByRole('option', { name: /Ayu Lestari/ }));
    await user.click(screen.getByRole('option', { name: /Citra Dewi/ }));
    expect(screen.getByRole('option', { name: /Ayu Lestari/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('2 dipilih')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Hapus Ayu Lestari' }));
    expect(screen.queryByRole('button', { name: 'Hapus Ayu Lestari' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus Citra Dewi' })).toBeInTheDocument();
  });
});
