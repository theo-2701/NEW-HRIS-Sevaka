import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { employeeService } from '@/features/employees/services/employee.service';
import type { EmployeeSearchRequest } from '@/features/employees/types';

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
  });
}
