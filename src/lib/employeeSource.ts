/**
 * Kontrak data `<EmployeeSelect>` — daftar karyawan diambil **per halaman** dari sumbernya,
 * jadi pemilih tetap ringan walau karyawannya ribuan.
 *
 * Tiap modul memberi sumbernya sendiri karena dummy tiap modul memakai ID & bentuk data yang
 * berbeda. Selama mode dummy, `createLocalEmployeeSource` meniru server: menyaring, memotong
 * halaman, dan memberi jeda singkat. Saat backend siap, ganti `search` dengan endpoint
 * pencarian berhalaman modul tersebut — komponennya tidak berubah.
 */

export interface EmployeeOption {
  id: string;
  name: string;
  /** NIK / nomor induk. Sebagian dummy modul belum punya, jadi opsional. */
  nik?: string;
  /** Unit, cabang, atau jabatan — teks kedua di baris pilihan. */
  unit?: string;
}

export interface EmployeePage {
  items: EmployeeOption[];
  /** Masih ada halaman berikutnya (server: `page * size < total`). */
  hasMore: boolean;
}

export interface EmployeeSource {
  /** Identitas data = kunci cache. Dua sumber dengan isi berbeda wajib berbeda kunci. */
  key: string;
  /** Kunci riwayat "terakhir dipilih" (default `key`) — beberapa sumber satu modul boleh berbagi riwayat. */
  recentKey?: string;
  /** Satu halaman hasil cari, `page` mulai 1. Kata kunci kosong = semua karyawan. */
  search: (query: string, page: number) => Promise<EmployeePage>;
  /** ID tersimpan → baris tampilan, untuk label pemicu saat form dibuka ulang. ID yang tidak dikenal dibuang. */
  resolve: (ids: string[]) => Promise<EmployeeOption[]>;
  /** Saran sebelum mengetik: karyawan satu unit dengan pengguna. Tidak diisi = bagian ini tidak tampil. */
  sameUnit?: () => Promise<EmployeeOption[]>;
}

export interface LocalEmployeeSourceConfig {
  /** Unit pengguna yang sedang masuk — dasar saran "Satu unit". */
  sameUnitAs?: string;
  pageSize?: number;
  /** Jeda tiruan server dalam ms. */
  latency?: number;
}

/**
 * Dummy lama berbentuk `{ value, label: 'Nama — Jabatan, Cabang' }` → baris pemilih:
 * teks sebelum " — " jadi nama, sisanya jadi unit.
 */
export function fromLabelOptions(options: { value: string; label: string }[]): EmployeeOption[] {
  return options.map(({ value, label }) => {
    const [name, ...rest] = label.split(' — ');
    return { id: value, name, unit: rest.join(' — ') || undefined };
  });
}

/** Cocok bila kata kunci ada di nama, NIK, atau unit (tanpa peka huruf besar). */
export function matchesEmployee(option: EmployeeOption, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return [option.name, option.nik, option.unit].some((text) => text?.toLowerCase().includes(keyword));
}

/**
 * Sumber dummy dari daftar di memori. `rows` boleh berupa fungsi (juga async, mis. memanggil
 * service modul) supaya daftar yang berubah saat runtime — karyawan baru dari New Joiner,
 * subjek yang dimuat dari service — selalu terbaca terbaru.
 */
export function createLocalEmployeeSource(
  key: string,
  rows: EmployeeOption[] | (() => EmployeeOption[] | Promise<EmployeeOption[]>),
  { sameUnitAs, pageSize = 20, latency = 120 }: LocalEmployeeSourceConfig = {},
): EmployeeSource {
  const read = async () => (typeof rows === 'function' ? rows() : rows);
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latency));

  return {
    // Daftar potret (mis. kandidat yang sudah disaring di layar) ikut menandai kunci cache, supaya
    // daftar lain di modul yang sama tidak sempat menampilkan hasil cache yang salah.
    key: Array.isArray(rows) ? `${key}:${rows.map((row) => row.id).join(',')}` : key,
    recentKey: key,
    async search(query, page) {
      await wait();
      const matched = (await read()).filter((row) => matchesEmployee(row, query));
      const start = (page - 1) * pageSize;
      return { items: matched.slice(start, start + pageSize), hasMore: start + pageSize < matched.length };
    },
    async resolve(ids) {
      const byId = new Map((await read()).map((row) => [row.id, row]));
      return ids.flatMap((id) => byId.get(id) ?? []);
    },
    sameUnit: sameUnitAs
      ? async () => {
          await wait();
          return (await read()).filter((row) => row.unit === sameUnitAs);
        }
      : undefined,
  };
}

const RECENT_PREFIX = 'sevaka.employee-select.recent';
const RECENT_MAX = 5;

/**
 * Riwayat "terakhir dipilih" — hanya **ID** yang disimpan (bukan nama/NIK) supaya data pribadi
 * tidak tertinggal di peramban; tampilannya di-resolve ulang lewat sumbernya.
 * `scope` = kunci sumber + pengguna, jadi riwayat tidak bocor antar modul atau antar akun.
 */
export function readRecentEmployeeIds(scope: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(`${RECENT_PREFIX}:${scope}`) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string').slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

/** Taruh `ids` (terbaru dulu) di depan riwayat, buang duplikat, simpan maksimal 5. */
export function rememberEmployeeIds(scope: string, ids: string[]): string[] {
  const next = [...ids, ...readRecentEmployeeIds(scope).filter((id) => !ids.includes(id))].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(`${RECENT_PREFIX}:${scope}`, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir/penuh — riwayat hanya pelengkap, pemilih tetap jalan.
  }
  return next;
}
