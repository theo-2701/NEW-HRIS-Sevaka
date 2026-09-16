import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { essPayrollService } from '@/features/ess-payroll/services/ess-payroll.service';
import { toast } from '@/store/ui.store';
import type { Actor } from '@/features/ess-payroll/types';

export const essPayrollKeys = {
  all: ['ess-payroll'] as const,
  periods: (employeeId: string) => ['ess-payroll', 'periods', employeeId] as const,
  myPayslip: (employeeId: string, periodId: string) => ['ess-payroll', 'my-payslip', employeeId, periodId] as const,
  results: (periodId: string) => ['ess-payroll', 'results', periodId] as const,
  selectable: ['ess-payroll', 'selectable-periods'] as const,
  accessLogs: ['ess-payroll', 'access-logs'] as const,
};

export const useMyPeriods = (actor: Actor) =>
  useQuery({ queryKey: essPayrollKeys.periods(actor.employeeId), queryFn: () => essPayrollService.myPeriods(actor) });

export const useMyPayslip = (actor: Actor, periodId: string) =>
  useQuery({
    queryKey: essPayrollKeys.myPayslip(actor.employeeId, periodId),
    queryFn: () => essPayrollService.myPayslip(actor, periodId),
    enabled: Boolean(periodId) && actor.role === 'ROLE_EMPLOYEE',
    retry: false,
  });

export const usePayrollResults = (actor: Actor, periodId: string) =>
  useQuery({
    queryKey: essPayrollKeys.results(periodId),
    queryFn: () => essPayrollService.searchResults(actor, periodId),
    enabled: Boolean(periodId) && actor.role === 'ROLE_HR_MANAGER',
    retry: false,
  });

export const useSelectablePeriods = () =>
  useQuery({ queryKey: essPayrollKeys.selectable, queryFn: () => essPayrollService.selectablePeriods() });

export const useAccessLogs = () =>
  useQuery({ queryKey: essPayrollKeys.accessLogs, queryFn: () => essPayrollService.sessionAccessLogs() });

/** Membuka slip orang lain menulis jejak akses, jadi daftar jejaknya ikut disegarkan. */
function useEssMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast(message(result), 'ok');
      void queryClient.invalidateQueries({ queryKey: essPayrollKeys.accessLogs });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useOpenEmployeePayslip = () =>
  useEssMutation(
    ({ actor, periodId, employeeId }: { actor: Actor; periodId: string; employeeId: string }) =>
      essPayrollService.employeePayslip(actor, periodId, employeeId),
    (slip) => `Slip ${slip.employeeName} dibuka — satu baris jejak akses tertulis.`,
  );

export const useDownloadMyPayslip = () =>
  useEssMutation(
    ({ actor, periodId }: { actor: Actor; periodId: string }) => essPayrollService.myPayslipDownload(actor, periodId),
    (slip) => `Slip ${slip.periodLabel} siap diunduh.`,
  );

export const useDownloadEmployeePayslip = () =>
  useEssMutation(
    ({ actor, periodId, employeeId }: { actor: Actor; periodId: string; employeeId: string }) =>
      essPayrollService.employeePayslipDownload(actor, periodId, employeeId),
    (slip) => `Slip ${slip.employeeName} siap diunduh — jejak akses unduhan tertulis.`,
  );
