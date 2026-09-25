/**
 * Company Management › Notification (Kotak Masuk) — FSD-001-NOTIFICATION-0.4 §1 ·
 * UIC-001-NOTIFICATION-0.2 §2 (`N1` GET inbox, `N2` PUT read).
 *
 * Read + update-lite saja: baris lahir dari event Kafka (backend-only), nol Create/Delete.
 */

export const NOTIFICATION_PATH = '/company-management/notifications';

/** Baris `notification_inbox` sesuai DTO `N1`/`N2`. */
export interface InboxRow {
  id: string;
  /** Katalog TERBUKA (~50 nilai) — bukan enum tertutup; struktur baris seragam (FSD §1.4). */
  notificationType: string;
  /** Katalog TERBUKA (UIC §2.1). Berpasangan dengan `referenceId`; keduanya `null` = tanpa tautan. */
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  readAtTimezone: string | null;
  createdAt: string;
  /**
   * Judul + isi dirangkai backend dari cetakan per `notification_type` (FSD §1.1). Contoh DTO `N1`
   * belum memuat medannya — dibuat opsional; bila kosong layar memakai label jenis.
   */
  title?: string;
  body?: string;
}

export type ReadFilter = 'ALL' | 'UNREAD' | 'READ';

/** Whitelist `sort_by` = `created_at` | `is_read` + `sort_direction` (UIC §2 `N1`). */
export type InboxSortBy = 'created_at' | 'is_read';
export type SortDirection = 'asc' | 'desc';

export interface InboxQuery {
  isRead?: boolean;
  sortBy?: InboxSortBy;
  sortDirection?: SortDirection;
  page?: number;
  size?: number;
}

export interface InboxPage {
  data: InboxRow[];
  totalData: number;
  totalPage: number;
  currentPage: number;
  size: number;
}

export interface MarkReadResult {
  row: InboxRow;
  /** `false` = panggilan kedua pada baris yang sudah dibaca — tetap 200 apa adanya (idempoten). */
  changed: boolean;
}
