import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import type { InboxPage, InboxQuery, InboxRow, MarkReadResult } from '@/features/notification/types';

/**
 * API service Notification — UIC-001-NOTIFICATION-0.2 §2.
 *
 *   N1  GET /api/v1/notifications/inbox?is_read&sort_by&sort_direction&page&size
 *   N2  PUT /api/v1/notifications/inbox/{notification-id}/read   (tanpa body, idempoten)
 *
 * Kotak masuk selalu milik pemanggil (klaim token) dan company aktif — tidak ada parameter
 * penerima. `N2` pada baris yang sudah dibaca mengembalikan 200 apa adanya; `read_at` tidak
 * bergeser dan tidak ada kode `ALREADY_READ`.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Dataset Skenario Positif (UIC §1.7) + satu kabar pengumuman yang bertaut ke ESS Announcement. */
const SEED: InboxRow[] = [
  {
    id: '0198e2a0-0006-7c40-9b00-000000000006',
    notificationType: 'ANNOUNCEMENT_PUBLISHED',
    title: 'New announcement for you',
    body: 'A new company announcement has been published for your role.',
    referenceType: 'ANNOUNCEMENT',
    referenceId: 'ann-libur-2027',
    isRead: false,
    readAt: null,
    readAtTimezone: null,
    createdAt: '2026-09-12T09:00:00+07:00',
  },
  {
    id: '0198e2a0-0004-7c40-9b00-000000000004',
    notificationType: 'PROD_RECAP_PENDING_APPROVAL',
    title: 'Your productivity recap is awaiting approval',
    body: 'The productivity recap for the July 2026 period is awaiting your approval.',
    referenceType: 'PRODUCTIVITY_RECAP',
    referenceId: '0198e2a0-0005-7c40-9b00-000000000005',
    isRead: false,
    readAt: null,
    readAtTimezone: null,
    createdAt: '2026-08-08T08:00:00+07:00',
  },
  {
    id: '0198e2a0-0003-7c40-9b00-000000000003',
    notificationType: 'LOGIN_OTP',
    title: 'Sign-in link sent',
    body: 'A single-use sign-in link was sent to your email address on 08 August 2026 at 07:40 WIB.',
    referenceType: null,
    referenceId: null,
    isRead: false,
    readAt: null,
    readAtTimezone: null,
    createdAt: '2026-08-08T07:40:00+07:00',
  },
  {
    id: '0198e2a0-0001-7c40-9b00-000000000001',
    notificationType: 'FINANCE_REQUEST_REJECTED',
    title: 'Your reimbursement request was rejected',
    body: 'Your reimbursement request dated 05 August 2026 was rejected by your approver.',
    referenceType: 'FINANCE_REQUEST',
    referenceId: '0198e2a0-0002-7c40-9b00-000000000002',
    isRead: true,
    readAt: '2026-08-07T09:15:00+07:00',
    readAtTimezone: 'Asia/Jakarta',
    createdAt: '2026-08-06T14:02:00+07:00',
  },
];

let rows: InboxRow[] = [];
let sequence = 0;

export function resetNotificationMocks() {
  rows = SEED.map((row) => ({ ...row }));
  sequence = 0;
}
resetNotificationMocks();

const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

interface ApiRow {
  id: string;
  notification_type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  read_at_timezone: string | null;
  created_at: string;
  title?: string;
  body?: string;
}

const fromApi = (row: ApiRow): InboxRow => ({
  id: row.id,
  notificationType: row.notification_type,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  isRead: row.is_read,
  readAt: row.read_at,
  readAtTimezone: row.read_at_timezone,
  createdAt: row.created_at,
  title: row.title,
  body: row.body,
});

export const notificationService = {
  /** `N1` — bawaan `sort_by=created_at`, `sort_direction=desc` (kabar terbaru di atas). */
  async inbox(query: InboxQuery = {}): Promise<InboxPage> {
    const sortBy = query.sortBy ?? 'created_at';
    const sortDirection = query.sortDirection ?? 'desc';
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    if (MOCK) {
      await delay();
      if (sortBy !== 'created_at' && sortBy !== 'is_read') {
        throw new Error('422 VALIDATION_ERROR — sort_by di luar whitelist (created_at, is_read).');
      }
      if (page < 1 || size < 1) throw new Error('422 VALIDATION_ERROR — page/size tidak valid.');
      const sign = sortDirection === 'asc' ? 1 : -1;
      const filtered = rows
        .filter((row) => query.isRead === undefined || row.isRead === query.isRead)
        .sort((a, b) => {
          if (sortBy === 'is_read' && a.isRead !== b.isRead) return (Number(a.isRead) - Number(b.isRead)) * sign;
          // Pengikat seri selalu kabar terbaru di atas.
          return sortBy === 'is_read'
            ? b.createdAt.localeCompare(a.createdAt)
            : a.createdAt.localeCompare(b.createdAt) * sign;
        });
      return {
        data: filtered.slice((page - 1) * size, page * size).map((row) => ({ ...row })),
        totalData: filtered.length,
        totalPage: Math.max(1, Math.ceil(filtered.length / size)),
        currentPage: page,
        size,
      };
    }
    const { data } = await api.get<{
      data: ApiRow[];
      total_data: number;
      total_page: number;
      current_page: number;
      size: number;
    }>('/notifications/inbox', {
      params: { is_read: query.isRead, sort_by: sortBy, sort_direction: sortDirection, page, size },
    });
    return {
      data: data.data.map(fromApi),
      totalData: data.total_data,
      totalPage: data.total_page,
      currentPage: data.current_page,
      size: data.size,
    };
  },

  /** Jumlah belum dibaca — hanya untuk titik indikator di bell (biner, bukan badge hitungan). */
  async hasUnread(): Promise<boolean> {
    if (MOCK) {
      await delay(100);
      return rows.some((row) => !row.isRead);
    }
    const page = await notificationService.inbox({ isRead: false, page: 1, size: 1 });
    return page.totalData > 0;
  },

  /** `N2` — `{notification-id}` DIBAWA dari kolom `id` baris yang diklik (CARRIED, bukan diketik). */
  async markRead(id: string): Promise<MarkReadResult> {
    if (MOCK) {
      await delay(200);
      const row = rows.find((item) => item.id === id);
      // Tak ada ATAU bukan milik pemanggil → satu kode yang sama (anti-enumerasi).
      if (!row) throw new Error('404 NOT_FOUND — notifikasi tidak ditemukan.');
      if (row.isRead) return { row: { ...row }, changed: false };
      Object.assign(row, { isRead: true, readAt: new Date().toISOString(), readAtTimezone: localTimezone() });
      return { row: { ...row }, changed: true };
    }
    const { data } = await api.put<ApiRow>(`/notifications/inbox/${id}/read`);
    return { row: fromApi(data), changed: true };
  },

  /**
   * Mode dummy saja: pengganti konsumsi event Kafka. Modul lain (mis. Announcement terbit) menitip
   * kabar ke sini lewat fungsi, bukan HTTP — di backend nyata baris lahir di notification-service.
   */
  deliver(row: Pick<InboxRow, 'notificationType' | 'referenceType' | 'referenceId' | 'title' | 'body'>) {
    sequence += 1;
    rows.push({
      ...row,
      id: `ntf-${sequence.toString(36)}${Date.now().toString(36).slice(-4)}`,
      isRead: false,
      readAt: null,
      readAtTimezone: null,
      createdAt: new Date().toISOString(),
    });
  },
};
