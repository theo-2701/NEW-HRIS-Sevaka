import { useQuery } from '@tanstack/react-query';
import { essTimeService } from '@/features/ess-time/services/ess-time.service';
import type { EssActor } from '@/features/ess-time/types';

export const essTimeKeys = {
  leaveRequests: (id: string) => ['ess-time', 'leave-requests', id] as const,
  delegations: (id: string) => ['ess-time', 'delegations', id] as const,
  ledger: (id: string, year?: number) => ['ess-time', 'ledger', id, year] as const,
  balances: (id: string, year?: number) => ['ess-time', 'balances', id, year] as const,
  attendance: (id: string) => ['ess-time', 'attendance', id] as const,
  punches: (id: string) => ['ess-time', 'punches', id] as const,
  overtime: (id: string) => ['ess-time', 'overtime', id] as const,
};

export const useMyLeaveRequests = (actor: EssActor) =>
  useQuery({ queryKey: essTimeKeys.leaveRequests(actor.employeeId), queryFn: () => essTimeService.myLeaveRequests(actor) });

export const useMyDelegations = (actor: EssActor) =>
  useQuery({ queryKey: essTimeKeys.delegations(actor.employeeId), queryFn: () => essTimeService.myDelegations(actor) });

export const useMyLedger = (actor: EssActor, year?: number) =>
  useQuery({ queryKey: essTimeKeys.ledger(actor.employeeId, year), queryFn: () => essTimeService.myLedger(actor, year) });

export const useMyBalances = (actor: EssActor, year?: number) =>
  useQuery({ queryKey: essTimeKeys.balances(actor.employeeId, year), queryFn: () => essTimeService.myBalances(actor, year) });

export const useMyAttendanceDays = (actor: EssActor) =>
  useQuery({ queryKey: essTimeKeys.attendance(actor.employeeId), queryFn: () => essTimeService.myAttendanceDays(actor) });

export const useMyPunchesToday = (actor: EssActor) =>
  useQuery({ queryKey: essTimeKeys.punches(actor.employeeId), queryFn: () => essTimeService.myPunchesToday(actor) });

export const useMyOvertime = (actor: EssActor) =>
  useQuery({ queryKey: essTimeKeys.overtime(actor.employeeId), queryFn: () => essTimeService.myOvertime(actor) });
