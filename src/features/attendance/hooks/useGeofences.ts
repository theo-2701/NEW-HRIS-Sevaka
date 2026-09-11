import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { geofenceService } from '@/features/attendance/services/geofence.service';
import { toast } from '@/store/ui.store';
import type { GeofenceFilter } from '@/features/attendance/services/geofence.service';
import type { GeofenceDraft } from '@/features/attendance/types';

export const geofenceKeys = {
  all: ['attendance', 'geofences'] as const,
  list: (filter: GeofenceFilter) => ['attendance', 'geofences', filter] as const,
};

export function useGeofences(filter: GeofenceFilter) {
  return useQuery({ queryKey: geofenceKeys.list(filter), queryFn: () => geofenceService.list(filter) });
}

export function useSaveGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, id }: { draft: GeofenceDraft; id?: string }) => geofenceService.save(draft, id),
    onSuccess: (result) => {
      toast(
        result.created
          ? '201 — titik tersimpan dan langsung jadi kandidat tap berikutnya di cabang itu.'
          : '200 — titik diperbarui. Tap yang sudah dinilai tidak tersentuh; aturan baru mulai dari tap berikutnya.',
        'ok',
      );
      // Peringatan radius kecil datang menyusul: tersimpan, tapi patut diketahui.
      if (result.warning) toast(result.warning, 'warn');
      void queryClient.invalidateQueries({ queryKey: geofenceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useToggleGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => geofenceService.toggleActive(id),
    onSuccess: (row) => {
      toast(
        row.isActive
          ? '200 — titik diaktifkan kembali; ia jadi kandidat penilaian tap baru lagi.'
          : '200 — titik dinonaktifkan; ia keluar dari penilaian tap baru dan setiap tap yang terekam tetap apa adanya.',
        'ok',
      );
      void queryClient.invalidateQueries({ queryKey: geofenceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/**
 * Hapus. Penolakannya dipakai layar sebagai **banner di atas List**, bukan
 * dialog — jadi pesannya dikembalikan, tidak hanya dilempar ke toast.
 */
export function useDeleteGeofence(onRefused: (message: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => geofenceService.remove(id),
    onSuccess: () => {
      onRefused('');
      toast('200 — titik kerja dihapus; ia belum pernah memvalidasi satu tap pun.', 'ok');
      void queryClient.invalidateQueries({ queryKey: geofenceKeys.all });
    },
    onError: (error: Error) => {
      onRefused(error.message);
      toast('409 — ditolak; titik ini masih dirujuk tap yang terekam.', 'danger');
    },
  });
}
