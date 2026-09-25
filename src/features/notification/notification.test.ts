import { beforeEach, describe, expect, it } from 'vitest';
import { notificationService, resetNotificationMocks } from '@/features/notification/services/notification.service';
import { referenceLink } from '@/features/notification/rules';

beforeEach(() => resetNotificationMocks());

describe('N1 — kotak masuk', () => {
  it('bawaan terbaru di atas; filter is_read menyaring', async () => {
    const all = await notificationService.inbox();
    expect(all.data.map((row) => row.createdAt)).toEqual([...all.data.map((row) => row.createdAt)].sort().reverse());
    const unread = await notificationService.inbox({ isRead: false });
    expect(unread.data.every((row) => !row.isRead)).toBe(true);
    expect(unread.totalData).toBe(3);
  });

  it('sort_by di luar whitelist ditolak 422', async () => {
    await expect(notificationService.inbox({ sortBy: 'notification_type' as 'created_at' })).rejects.toThrow(/422/);
  });

  it('is_read asc menaruh yang belum dibaca di atas', async () => {
    const page = await notificationService.inbox({ sortBy: 'is_read', sortDirection: 'asc' });
    expect(page.data[0].isRead).toBe(false);
    expect(page.data.at(-1)?.isRead).toBe(true);
  });
});

describe('N2 — tandai dibaca', () => {
  it('panggilan kedua idempoten: 200 apa adanya, read_at tidak bergeser', async () => {
    const id = '0198e2a0-0004-7c40-9b00-000000000004';
    const first = await notificationService.markRead(id);
    expect(first.changed).toBe(true);
    expect(first.row.isRead).toBe(true);
    const second = await notificationService.markRead(id);
    expect(second.changed).toBe(false);
    expect(second.row.readAt).toBe(first.row.readAt);
  });

  it('id tak dikenal → 404', async () => {
    await expect(notificationService.markRead('00000000-0000-7000-8000-000000000099')).rejects.toThrow(/404/);
  });
});

describe('Tautan "Lihat Perkara" (UIC §2.1)', () => {
  it('ANNOUNCEMENT ke ESS; NULL dan nilai tak dikenal tanpa tautan', () => {
    expect(referenceLink({ referenceType: 'ANNOUNCEMENT', referenceId: 'ann-1' })?.to).toBe(
      '/me/announcements?id=ann-1',
    );
    expect(referenceLink({ referenceType: null, referenceId: null })).toBeNull();
    expect(referenceLink({ referenceType: 'SOMETHING_NEW', referenceId: 'x' })).toBeNull();
  });

  it('kabar titipan modul lain masuk sebagai belum dibaca', async () => {
    notificationService.deliver({
      notificationType: 'ANNOUNCEMENT_PUBLISHED',
      referenceType: 'ANNOUNCEMENT',
      referenceId: 'ann-x',
    });
    const page = await notificationService.inbox();
    expect(page.data[0].referenceId).toBe('ann-x');
    expect(page.data[0].isRead).toBe(false);
  });
});
