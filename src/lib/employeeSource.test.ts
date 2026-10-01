import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalEmployeeSource,
  matchesEmployee,
  readRecentEmployeeIds,
  rememberEmployeeIds,
  type EmployeeOption,
} from '@/lib/employeeSource';

const ROWS: EmployeeOption[] = Array.from({ length: 45 }, (_, index) => ({
  id: `emp-${index + 1}`,
  name: `Karyawan ${index + 1}`,
  nik: `NIK-${String(index + 1).padStart(4, '0')}`,
  unit: index % 3 === 0 ? 'Finance' : 'Operations',
}));

describe('createLocalEmployeeSource — meniru pencarian server berhalaman', () => {
  const source = createLocalEmployeeSource('test', ROWS, { pageSize: 20, latency: 0, sameUnitAs: 'Finance' });

  it('memotong per halaman dan memberi tahu masih ada halaman berikutnya', async () => {
    const first = await source.search('', 1);
    const last = await source.search('', 3);
    expect(first.items).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(last.items.map((row) => row.id)).toEqual(['emp-41', 'emp-42', 'emp-43', 'emp-44', 'emp-45']);
    expect(last.hasMore).toBe(false);
  });

  it('mencocokkan nama, NIK, atau unit tanpa peka huruf besar', async () => {
    expect(matchesEmployee(ROWS[0], '  karyawan 1 ')).toBe(true);
    expect(matchesEmployee(ROWS[0], 'nik-0001')).toBe(true);
    expect(matchesEmployee(ROWS[0], 'FINANCE')).toBe(true);
    expect(matchesEmployee(ROWS[1], 'finance')).toBe(false);
    expect((await source.search('NIK-0045', 1)).items.map((row) => row.id)).toEqual(['emp-45']);
  });

  it('resolve menjaga urutan ID dan membuang ID yang tidak dikenal', async () => {
    const rows = await source.resolve(['emp-3', 'emp-x', 'emp-1']);
    expect(rows.map((row) => row.id)).toEqual(['emp-3', 'emp-1']);
  });

  it('saran "Satu unit" hanya ada bila unit pengguna diberikan', async () => {
    expect((await source.sameUnit?.())?.every((row) => row.unit === 'Finance')).toBe(true);
    expect(createLocalEmployeeSource('plain', ROWS).sameUnit).toBeUndefined();
  });

  it('daftar potret menandai kunci cache, riwayat tetap per modul', () => {
    const snapshot = createLocalEmployeeSource('prod', ROWS.slice(0, 2));
    expect(snapshot.key).toBe('prod:emp-1,emp-2');
    expect(snapshot.recentKey).toBe('prod');
    expect(createLocalEmployeeSource('prod', () => ROWS).key).toBe('prod');
  });

  it('membaca daftar terbaru bila rows berupa fungsi', async () => {
    const live = [...ROWS.slice(0, 2)];
    const dynamic = createLocalEmployeeSource('live', () => live, { latency: 0 });
    live.push({ id: 'emp-new', name: 'Karyawan Baru' });
    expect((await dynamic.search('baru', 1)).items.map((row) => row.id)).toEqual(['emp-new']);
  });
});

describe('Riwayat "terakhir dipilih"', () => {
  beforeEach(() => window.localStorage.clear());

  it('yang terbaru di depan, tanpa duplikat, maksimal 5', () => {
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((id) => rememberEmployeeIds('scope', [id]));
    rememberEmployeeIds('scope', ['c']);
    expect(readRecentEmployeeIds('scope')).toEqual(['c', 'f', 'e', 'd', 'b']);
  });

  it('terpisah per scope dan hanya menyimpan ID', () => {
    rememberEmployeeIds('time-off:u1', ['emp-1']);
    expect(readRecentEmployeeIds('time-off:u2')).toEqual([]);
    expect(window.localStorage.getItem('sevaka.employee-select.recent:time-off:u1')).toBe('["emp-1"]');
  });

  it('isi penyimpanan yang rusak dianggap kosong', () => {
    window.localStorage.setItem('sevaka.employee-select.recent:bad', '{not json');
    expect(readRecentEmployeeIds('bad')).toEqual([]);
  });
});
