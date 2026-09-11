import { api } from '@/services/api';
import { GEOFENCES } from '@/features/attendance/mock-data';
import type { Geofence, GeofenceDraft } from '@/features/attendance/types';

/**
 * API service Attendance Settings — `cnf_attendance_geofence`
 * (FSD-001-TIME §6 · UIC-001-TIME §7).
 *
 * Satu sumber daya saja: titik kerja yang jadi acuan pengukuran tap — radius
 * toleransinya dan matriks capture yang menyatakan, per pengaturan kerja,
 * apakah berada di dalam radius dan apakah selfie diwajibkan.
 *
 * Aturan yang ditegakkan di sini:
 *  • Nama 3–150 karakter, unik hanya di antara baris **aktif pada cabang yang
 *    sama** (409). Cek bentrok itu sengaja **tidak** dijalankan saat Ubah
 *    (§6.3: "tanpa pengecekan nama-bentrok").
 *  • Koordinat wajib berpasangan, ±90/±180.
 *  • Radius bilangan bulat positif; radius kecil adalah **peringatan, bukan
 *    penolakan**.
 *  • Matriks terkunci empat baris × dua flag eksplisit — tanpa default tersirat
 *    dan tanpa baris kelima.
 *  • Nonaktifkan adalah aksi satu langkah dari baris: nol keputusan, nol cabang
 *    error — tidak pernah ditolak (§6.4).
 *  • Hapus memeriksa gerbang "masih dirujuk?" seketika; penolakannya banner di
 *    atas List, bukan dialog (§6.5).
 *  • Mengubah radius atau matriks tidak menyentuh tap yang sudah dinilai.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Di bawah ini akurasi GPS ponsel pada umumnya — memicu peringatan, bukan tolakan. */
export const SMALL_RADIUS_METERS = 50;

const clone = (row: Geofence): Geofence => ({ ...row, rules: structuredClone(row.rules) });

let mockGeofences: Geofence[] = GEOFENCES.map(clone);

export function resetGeofenceMocks() {
  mockGeofences = GEOFENCES.map(clone);
}

export interface GeofenceFilter {
  scopeRef?: string;
  name?: string;
  isActive?: boolean;
}

export interface SaveGeofenceResult {
  row: Geofence;
  created: boolean;
  /** Terisi bila radius di bawah akurasi GPS biasa — peringatan, bukan penolakan. */
  warning: string | null;
}

function validate(draft: GeofenceDraft) {
  const name = draft.geofenceName.trim();
  if (name.length < 3 || name.length > 150) {
    throw new Error('422 — nama titik harus 3–150 karakter.');
  }
  if (!draft.scopeRef) throw new Error('422 — pilih cabang pemilik titik ini.');
  if (
    !Number.isFinite(draft.centerLatitude) ||
    !Number.isFinite(draft.centerLongitude) ||
    draft.centerLatitude < -90 ||
    draft.centerLatitude > 90 ||
    draft.centerLongitude < -180 ||
    draft.centerLongitude > 180
  ) {
    throw new Error('422 — lintang dan bujur wajib berpasangan, dalam ±90 dan ±180.');
  }
  if (!Number.isInteger(draft.radiusMeters) || draft.radiusMeters <= 0) {
    throw new Error('422 — radius harus bilangan bulat meter yang positif.');
  }
}

export const geofenceService = {
  async list(filter: GeofenceFilter = {}): Promise<Geofence[]> {
    if (MOCK) {
      await delay();
      return mockGeofences
        .filter((row) => {
          if (filter.scopeRef && row.scopeRef !== filter.scopeRef) return false;
          if (filter.name && !row.geofenceName.toLowerCase().includes(filter.name.toLowerCase())) return false;
          if (filter.isActive !== undefined && row.isActive !== filter.isActive) return false;
          return true;
        })
        .map(clone);
    }
    const { data } = await api.get<{ rows: Geofence[] }>('/attendance/geofences', { params: filter });
    return data.rows;
  },

  async save(draft: GeofenceDraft, id?: string): Promise<SaveGeofenceResult> {
    if (MOCK) {
      await delay(350);
      validate(draft);
      const name = draft.geofenceName.trim();

      const warning =
        draft.radiusMeters < SMALL_RADIUS_METERS
          ? 'Radius di bawah akurasi GPS ponsel pada umumnya — tetap tersimpan, tapi tap bisa terbaca di luar radius.'
          : null;

      if (id) {
        const row = mockGeofences.find((item) => item.id === id);
        if (!row) throw new Error('404 — titik kerja tidak ditemukan.');
        // §6.3 — Ubah sengaja tidak memeriksa bentrok nama.
        Object.assign(row, {
          geofenceName: name,
          scopeRef: draft.scopeRef,
          centerLatitude: draft.centerLatitude,
          centerLongitude: draft.centerLongitude,
          radiusMeters: draft.radiusMeters,
          isActive: draft.isActive,
          rules: structuredClone(draft.rules),
        });
        return { row: clone(row), created: false, warning };
      }

      const clash = mockGeofences.some(
        (item) =>
          item.isActive &&
          item.scopeRef === draft.scopeRef &&
          item.geofenceName.toLowerCase() === name.toLowerCase(),
      );
      if (clash) {
        throw new Error('409 — sudah ada titik aktif di cabang itu dengan nama yang sama.');
      }

      const row: Geofence = {
        id: `geo-${mockGeofences.length + 10}`,
        geofenceName: name,
        scopeRef: draft.scopeRef,
        centerLatitude: draft.centerLatitude,
        centerLongitude: draft.centerLongitude,
        radiusMeters: draft.radiusMeters,
        isActive: draft.isActive,
        // Titik baru belum pernah memvalidasi tap, jadi masih boleh dihapus.
        usedByPunch: false,
        rules: structuredClone(draft.rules),
      };
      mockGeofences = [...mockGeofences, row];
      return { row: clone(row), created: true, warning };
    }

    const { data } = id
      ? await api.patch<Geofence>(`/attendance/geofences/${id}`, draft)
      : await api.post<Geofence>('/attendance/geofences', draft);
    return { row: data, created: !id, warning: null };
  },

  /** Satu langkah dari baris — tidak pernah ditolak (§6.4). */
  async toggleActive(id: string): Promise<Geofence> {
    if (MOCK) {
      await delay(200);
      const row = mockGeofences.find((item) => item.id === id);
      if (!row) throw new Error('404 — titik kerja tidak ditemukan.');
      row.isActive = !row.isActive;
      return clone(row);
    }
    const { data } = await api.patch<Geofence>(`/attendance/geofences/${id}/toggle-active`);
    return data;
  },

  /**
   * Hapus. Gerbang rujukan diperiksa seketika: satu tap saja yang pernah
   * merujuk titik ini sudah cukup untuk menolak. Jalur sah memensiunkan titik
   * yang sudah pernah menilai tap adalah Deactivate.
   */
  async remove(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = mockGeofences.find((item) => item.id === id);
      if (!row) throw new Error('404 — titik kerja tidak ditemukan.');
      if (row.usedByPunch) {
        throw new Error(
          `409 — "${row.geofenceName}" tidak bisa dihapus: tap yang sudah terekam masih merujuknya. Pensiunkan lewat Deactivate — barisnya dan riwayatnya tetap apa adanya.`,
        );
      }
      mockGeofences = mockGeofences.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/attendance/geofences/${id}`);
  },
};
