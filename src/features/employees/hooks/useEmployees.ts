import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/store/ui.store';
import { ApiError } from '@/services/api';
import { employeeService } from '@/features/employees/services/employee.service';
import type { EmployeeSearchRequest, WorkDataPatch } from '@/features/employees/types';

export const employeeKeys = {
  all: ['employees'] as const,
  search: (request: EmployeeSearchRequest) => ['employees', 'search', request] as const,
  detail: (id: string) => ['employees', 'detail', id] as const,
};

/**
 * Hasil `POST /employees/search`.
 * `keepPreviousData` menahan baris lama saat pindah halaman/urutan sehingga
 * tabel tidak berkedip kosong.
 */
export function useEmployeeSearch(request: EmployeeSearchRequest) {
  return useQuery({
    queryKey: employeeKeys.search(request),
    queryFn: () => employeeService.search(request),
    placeholderData: keepPreviousData,
  });
}

/** `GET /employees/{id}` — hanya dijalankan saat modal detail terbuka. */
export function useEmployeeDetail(id: string | null) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ''),
    queryFn: () => employeeService.getById(id as string),
    enabled: Boolean(id),
    // 404/403 final; hanya 503/putus jaringan yang layak dicoba ulang.
    retry: (count, error) => count < 1 && error instanceof ApiError && (error.status === 503 || error.status === 0),
  });
}

/** Edit Work Data (T31): sukses = invalidasi cache direktori + detail, lalu pesan sukses. */
export function useUpdateWorkData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, role }: { id: string; patch: WorkDataPatch; role: string }) =>
      employeeService.updateWorkData(id, patch, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast('Work data updated.', 'ok');
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
