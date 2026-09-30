/** Utilitas mock bersama seluruh service Performance. */

export const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bentuk uuid v7: 48 bit awal = epoch ms, jadi potongan 8 karakter di grid berbeda antar baris. */
export function uuidV7() {
  const time = Date.now().toString(16).padStart(12, '0');
  const rand = crypto.randomUUID().replace(/-/g, '');
  return `${time.slice(0, 8)}-${time.slice(8)}-7${rand.slice(0, 3)}-8${rand.slice(3, 6)}-${rand.slice(6, 18)}`;
}
