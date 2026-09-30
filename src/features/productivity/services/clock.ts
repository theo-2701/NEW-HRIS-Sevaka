/**
 * Jam productivity — satu titik "sekarang" untuk gerbang jendela & penghitung, supaya pengujian dapat
 * membekukan waktu tanpa bergantung tanggal mesin.
 */
let frozen: Date | null = null;

export const prodClock = {
  now: () => (frozen ? new Date(frozen) : new Date()),
  set: (value: Date | string | null) => {
    frozen = value === null ? null : new Date(value);
  },
};

export const isoDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
