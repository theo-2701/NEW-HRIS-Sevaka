/** Bobot `numeric(6,2)` selalu tampil dua desimal, format Indonesia. */
export const formatWeight = (value: number) =>
  value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ID uuid dipendekkan 8 karakter untuk chip grid; nilai penuh lewat tooltip. */
export const shortId = (id: string) => id.slice(0, 8);
