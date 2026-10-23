import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
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
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Di bawah ini akurasi GPS ponsel pada umumnya — memicu peringatan, bukan tolakan. */
export const SMALL_RADIUS_METERS = 50;

const clone = (row: Geofence): Geofence => ({ ...row, rules: structuredClone(row.rules) });

let mockGeofences: Geofence[] = GEOFENCES.map(clone);

export function resetGeofenceMocks() {
  mockGeofences = GEOFENCES.map(clone);
}

/** Titik + matriks yang berlaku SAAT INI — hasil setelan admin, dibaca layar tap. */
export function liveGeofences(): Geofence[] {
  return mockGeofences;
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
  if (!name || name.length > 150) {
    throw new Error('422 — Point name is required, 3–150 characters.');
  }
  if (!draft.scopeRef) throw new Error('422 — Choose the branch that owns this point.');
  if (
    !Number.isFinite(draft.centerLatitude) ||
    !Number.isFinite(draft.centerLongitude) ||
    draft.centerLatitude < -90 ||
    draft.centerLatitude > 90 ||
    draft.centerLongitude < -180 ||
    draft.centerLongitude > 180
  ) {
    throw new Error('422 — Latitude and longitude are required as a pair, within ±90 and ±180.');
  }
  if (!Number.isInteger(draft.radiusMeters) || draft.radiusMeters <= 0) {
    throw new Error('422 — Radius must be a positive whole number of metres.');
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
    const { data } = await api.post<{ data: Geofence[] }>('/attendance-geofences/search', { filters: filter });
    return data.data;
  },

  async save(draft: GeofenceDraft, id?: string): Promise<SaveGeofenceResult> {
    if (MOCK) {
      await delay(350);
      validate(draft);
      const name = draft.geofenceName.trim();

      const warning =
        draft.radiusMeters < SMALL_RADIUS_METERS
          ? 'Radius below typical phone GPS accuracy — still saved, but taps may read as outside the radius.'
          : null;

      if (id) {
        const row = mockGeofences.find((item) => item.id === id);
        if (!row) throw new Error('404 — Work point not found.');
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
        throw new Error('409 — An active point with the same name already exists in that branch.');
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
      ? await api.put<Geofence>(`/attendance-geofences/${id}`, draft)
      : await api.post<Geofence>('/attendance-geofences', draft);
    return { row: data, created: !id, warning: null };
  },

  /** Satu langkah dari baris — tidak pernah ditolak (§6.4). */
  async toggleActive(id: string): Promise<Geofence> {
    if (MOCK) {
      await delay(200);
      const row = mockGeofences.find((item) => item.id === id);
      if (!row) throw new Error('404 — Work point not found.');
      row.isActive = !row.isActive;
      return clone(row);
    }
    const { data } = await api.patch<Geofence>(`/attendance-geofences/${id}/toggle-active`);
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
      if (!row) throw new Error('404 — Work point not found.');
      if (row.usedByPunch) {
        throw new Error(
          `409 — "${row.geofenceName}" can't be deleted: recorded taps still reference it. Retire it with Deactivate — the row and its history stay as they are.`,
        );
      }
      mockGeofences = mockGeofences.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/attendance-geofences/${id}`);
  },
};
