/** Bobot `numeric(6,2)` selalu tampil dua desimal, format Indonesia. */
export const formatWeight = (value: number) =>
  value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ID uuid dipendekkan 8 karakter untuk chip grid; nilai penuh lewat tooltip. */
export const shortId = (id: string) => id.slice(0, 8);

export const cycleRound = (cycleNo: number, roundNo: number) => `Siklus ${cycleNo} · Putaran ${roundNo}`;

/** Sebaran nilai penilai dikutip dari Menu 6 — rata-rata kosong tampil "—", tidak dihitung ulang. */
export function formatDistribution(value: { ratedCount: number; totalCount: number; averageScore: number | null }) {
  const average =
    value.averageScore === null ? '—' : value.averageScore.toLocaleString('id-ID', { minimumFractionDigits: 1 });
  return `Rata-rata ${average} · ${value.ratedCount} dari ${value.totalCount} baris dinilai`;
}
