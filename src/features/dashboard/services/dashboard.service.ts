import { api } from '@/services/api';
import type { DashboardSummary, LockedAccount } from '@/features/dashboard/types';

/**
 * Service dashboard. Sama seperti modul auth: memakai data contoh selama
 * `VITE_API_BASE_URL` belum diisi. Data contoh mengikuti aturan prototype —
 * nama Indonesia, ID `CP0xx`, tanggal `dd Mmm yyyy` — bukan `[...]`.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;

const MOCK_SUMMARY: DashboardSummary = {
  gender: [
    { label: 'Female', value: 52, color: 'var(--color-secondary-500)' },
    { label: 'Male', value: 36, color: 'var(--color-primary-500)' },
    { label: 'Not Filled', value: 12, color: 'var(--color-tertiary-500)' },
  ],
  staffActive: [
    { label: 'Jun', value: 220 },
    { label: 'Jul', value: 375 },
    { label: 'Agu', value: 330 },
    { label: 'Sep', value: 450 },
    { label: 'Okt', value: 330 },
    { label: 'Nov', value: 450 },
  ],
  /* Turnover dalam PERSEN — sumbu kartu berskala 0–10%. */
  turnover: [
    { label: 'Jun', value: 2.5 },
    { label: 'Jul', value: 5 },
    { label: 'Agu', value: 5 },
    { label: 'Sep', value: 6.5 },
    { label: 'Okt', value: 5 },
    { label: 'Nov', value: 5 },
  ],
  jobLevels: [
    { label: 'Staff', count: 400, percent: 40, color: '#bce0f3' },
    { label: 'Operator', count: 250, percent: 25, color: '#0e4a73' },
    { label: 'Manager', count: 150, percent: 15, color: '#fde68a' },
    { label: 'Supervisor', count: 100, percent: 10, color: '#7eb9d4' },
    { label: 'Intern', count: 60, percent: 6, color: '#0284c7' },
    { label: 'Specialist', count: 30, percent: 3, color: '#cfe6f2' },
    { label: 'VP', count: 9, percent: 0.9, color: '#0a3a5a' },
    { label: 'CEO', count: 1, percent: 0.1, color: '#062234' },
  ],
  totalEmployees: 1000,
  leave: { annualLeaveDays: 10, sickLeaveUsedDays: 4 },
  whosOff: [
    { id: 'CP012', name: 'Mitsui Tiga', reason: 'Cuti Tahunan' },
    { id: 'CP018', name: 'Mitsui Empat', reason: 'Cuti Tahunan' },
    { id: 'CP021', name: 'Mitsui Lima', reason: 'Cuti Tahunan' },
  ],
  lockedAccounts: [
    {
      id: 'CP007',
      name: 'Rina Kurniawati',
      username: 'rina.kurniawati',
      email: 'rina.kurniawati@ptdika.co.id',
      lockedAt: '2026-08-27T09:12:00+07:00',
      failedAttempts: 5,
    },
    {
      id: 'CP033',
      name: 'Agus Prasetyo',
      username: 'agus.prasetyo',
      email: 'agus.prasetyo@ptdika.co.id',
      lockedAt: '2026-08-27T10:41:00+07:00',
      failedAttempts: 5,
    },
  ],
  contracts: [
    {
      id: 'CT-0001',
      employee: 'Budi Santoso',
      employeeId: 'CP001',
      status: 'PROBATION',
      endDate: '2026-09-30',
      duration: '3 bulan',
    },
    {
      id: 'CT-0002',
      employee: 'Siti Rahayu',
      employeeId: 'CP004',
      status: 'CONTRACT',
      endDate: '2026-12-12',
      duration: '12 bulan',
    },
    {
      id: 'CT-0003',
      employee: 'Dimas Ardiansyah',
      employeeId: 'CP009',
      status: 'CONTRACT',
      endDate: '2027-01-31',
      duration: '24 bulan',
    },
    {
      id: 'CT-0004',
      employee: 'Nadia Puspita',
      employeeId: 'CP015',
      status: 'PROBATION',
      endDate: '2026-10-15',
      duration: '3 bulan',
    },
  ],
};

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    if (MOCK) {
      await delay();
      return MOCK_SUMMARY;
    }
    const { data } = await api.get<DashboardSummary>('/dashboard/summary');
    return data;
  },

  /** Akun terkunci otomatis setelah 5× gagal login (auto-unlock 15 menit). */
  async getLockedAccounts(): Promise<LockedAccount[]> {
    if (MOCK) {
      await delay(300);
      return MOCK_SUMMARY.lockedAccounts;
    }
    const { data } = await api.get<LockedAccount[]>('/security/locked-accounts');
    return data;
  },

  async unlockAccount(employeeId: string): Promise<void> {
    if (MOCK) {
      await delay(500);
      return;
    }
    await api.post(`/security/locked-accounts/${employeeId}/unlock`);
  },
};
