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
          ? 'Work point saved. It applies to the next taps in that branch.'
          : 'Work point updated. Recorded taps are untouched; the new rules apply from the next tap.',
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
          ? 'Work point reactivated. New taps use it again.'
          : 'Work point deactivated. New taps no longer use it; recorded taps stay as they are.',
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
      toast('Work point deleted. It had never been used by a tap.', 'ok');
      void queryClient.invalidateQueries({ queryKey: geofenceKeys.all });
    },
    onError: (error: Error) => {
      onRefused(error.message);
      toast("409 — This work point is still referenced by recorded taps, so it can't be deleted.", 'danger');
    },
  });
}
