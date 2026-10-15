import type { LucideIcon } from 'lucide-react';

export interface QueueItem {
  key: string;
  count: number | null;
  title: string;
  detail: string;
  icon: LucideIcon;
  /** `decide` = menunggu keputusan saya sebagai approver/checker; `mine` = tugas pribadi saya. */
  group: 'decide' | 'mine';
  action?: { label: string; onClick: () => void };
}

export const GROUP_ORDER: QueueItem['group'][] = ['decide', 'mine'];

/** Jumlah jenis yang tampil di panel (2 kolom × 3 baris); sisanya lewat "Lihat semua". */
export const ACTION_QUEUE_PANEL_LIMIT = 6;

/**
 * Jenis bernilai 0 dibuang (tanpa catatan apa pun); urut kelompok (keputusan dulu, lalu tugas
 * pribadi), di dalamnya angka terbesar dulu, yang masih memuat ("…") di akhir kelompoknya.
 */
export function arrangeQueue(items: QueueItem[]): QueueItem[] {
  return items
    .filter((item) => item.count !== 0)
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || (b.count ?? -1) - (a.count ?? -1));
}
