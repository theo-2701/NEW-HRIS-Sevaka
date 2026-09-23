import { afterEach, describe, expect, it, vi } from 'vitest';
import { activityLogService } from '@/features/activity-log/services/activity-log.service';
import { SESSION_EXPIRED_REDIRECT_DELAY_MS, expireSession } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

describe('Activity Log — POST /audit/{family}/search', () => {
  it('default Login Attempts: terbaru di atas, halaman 1 ukuran 10, total_data utuh', async () => {
    const page = await activityLogService.search('login-attempts', { page: 1, size: 10 });
    expect(page.rows).toHaveLength(10);
    expect(page.totalData).toBe(14);
    const times = page.rows.map((row) => row.attemptedAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('halaman berikutnya membawa sisa baris', async () => {
    const page = await activityLogService.search('login-attempts', { page: 2, size: 10 });
    expect(page.rows).toHaveLength(4);
  });

  it('rentang tanggal inklusif pada start_date dan end_date', async () => {
    const page = await activityLogService.search('switch-company-logs', {
      startDate: '2026-09-19',
      endDate: '2026-09-22',
      page: 1,
      size: 10,
    });
    expect(page.rows.map((row) => row.switchedAt.slice(0, 10))).toEqual(['2026-09-22', '2026-09-19']);
  });

  it('rentang tanpa data menghasilkan total_data = 0', async () => {
    const page = await activityLogService.search('force-logout-logs', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      page: 1,
      size: 10,
    });
    expect(page).toEqual({ rows: [], totalData: 0 });
  });
});

describe('Sesi berakhir (FSD-001-AUTH §1)', () => {
  afterEach(() => vi.useRealTimers());

  it('toast generik dulu, sesi baru dibuang setelah jeda', () => {
    vi.useFakeTimers();
    useAuthStore.setState({ token: 'mock-token' });

    expireSession();
    expireSession();

    const toasts = useUiStore.getState().toasts.filter((t) => t.message === 'Sesi berakhir, silakan masuk lagi');
    expect(toasts).toHaveLength(1);
    expect(useAuthStore.getState().token).toBe('mock-token');

    vi.advanceTimersByTime(SESSION_EXPIRED_REDIRECT_DELAY_MS);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
