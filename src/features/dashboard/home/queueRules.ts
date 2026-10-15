import type { LucideIcon } from 'lucide-react';

/** Satu jenis pekerjaan yang menunggu saya — keputusan approver/checker maupun tugas pribadi. */
export interface QueueItem {
  key: string;
  count: number | null;
  title: string;
  detail: string;
  icon: LucideIcon;
  action?: { label: string; onClick: () => void };
}

/** Jumlah jenis yang tampil di panel (2 kolom × 3 baris); sisanya lewat "Lihat semua". */
export const ACTION_QUEUE_PANEL_LIMIT = 6;

/** Jenis bernilai 0 dibuang; angka terbesar dulu, yang masih memuat ("…") di akhir. */
export function arrangeQueue(items: QueueItem[]): QueueItem[] {
  return items.filter((item) => item.count !== 0).sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
}

/**
 * Kelompok di modal "View all" — HANYA di modal (panel tetap satu daftar tanpa judul). Modal bisa
 * berisi 20+ jenis; judul kelompok per area kerja memberi peta "aku sedang di bagian mana".
 */
export const QUEUE_GROUPS = [
  { id: 'time', label: 'Time & attendance', keys: ['leave', 'overtime', 'corrections', 'swaps', 'oncall', 'holidays'] },
  { id: 'finance', label: 'Finance', keys: ['claims', 'loans', 'advances'] },
  {
    id: 'employee',
    label: 'Employees',
    keys: ['requisitions', 'candidates', 'resignations', 'imports', 'reprimands', 'contracts'],
  },
  { id: 'admin', label: 'Accounts & announcements', keys: ['locked', 'invitations', 'drafts'] },
  { id: 'personal', label: 'Your own tasks', keys: ['ack-loan', 'settle-advance', 'resubmit-claim'] },
] as const;

export interface QueueSection {
  id: string;
  label: string;
  items: QueueItem[];
  /** Jumlah pekerjaan (bukan jenis); `null` bila masih ada yang memuat. */
  total: number | null;
}

const sumCounts = (items: QueueItem[]) =>
  items.some((item) => item.count === null) ? null : items.reduce((sum, item) => sum + (item.count ?? 0), 0);

/** Kelompokkan daftar yang sudah diurutkan `arrangeQueue`; urutan kelompok tetap, kelompok kosong dibuang. */
export function groupQueue(items: QueueItem[]): QueueSection[] {
  const known = new Set<string>(QUEUE_GROUPS.flatMap((group) => group.keys));
  const sections: QueueSection[] = QUEUE_GROUPS.map((group) => {
    const keys: readonly string[] = group.keys;
    const inGroup = items.filter((item) => keys.includes(item.key));
    return { id: group.id, label: group.label, items: inGroup, total: sumCounts(inGroup) };
  });
  const other = items.filter((item) => !known.has(item.key));
  sections.push({ id: 'other', label: 'Other', items: other, total: sumCounts(other) });
  return sections.filter((section) => section.items.length > 0);
}

export const totalQueueCount = sumCounts;
