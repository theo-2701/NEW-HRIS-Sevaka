import type { EmailDomain, WorkStatus } from '@/features/employee-masters/types';

const T = '2026-10-21T09:00:00+07:00';

/** Contoh USER pada §7.19 — satu tenant boleh banyak domain. */
export const EMAIL_DOMAINS: EmailDomain[] = [
  { id: 'ed-1', domainName: 'ptdika.co.id', isActive: true, createdAt: T, updatedAt: T },
  { id: 'ed-2', domainName: 'ptdika.com', isActive: true, createdAt: T, updatedAt: T },
  { id: 'ed-3', domainName: 'juaracoding.co.id', isActive: false, createdAt: T, updatedAt: T },
];

/** Baris yang disebut §7.13.3 (Permanent, Contract, Freelancer, Intern, Probation). */
export const WORK_STATUSES: WorkStatus[] = [
  { id: 'ws-1', workStatusName: 'Permanent Employee', requiresEndDate: false, taxCategoryCode: 'PEGAWAI_TETAP', deductBpjsTk: true, deductBpjsKs: true, eligibleForLeave: true, eligibleForOvertime: true, isActive: true, activeEmployeeCount: 6 },
  { id: 'ws-2', workStatusName: 'Contract', requiresEndDate: true, taxCategoryCode: 'PEGAWAI_TETAP', deductBpjsTk: true, deductBpjsKs: true, eligibleForLeave: true, eligibleForOvertime: true, isActive: true, activeEmployeeCount: 3 },
  { id: 'ws-3', workStatusName: 'Probation', requiresEndDate: true, taxCategoryCode: 'PEGAWAI_TETAP', deductBpjsTk: true, deductBpjsKs: true, eligibleForLeave: false, eligibleForOvertime: true, isActive: true, activeEmployeeCount: 0 },
  { id: 'ws-4', workStatusName: 'Freelancer', requiresEndDate: true, taxCategoryCode: 'BUKAN_PEGAWAI', deductBpjsTk: false, deductBpjsKs: false, eligibleForLeave: false, eligibleForOvertime: false, isActive: true, activeEmployeeCount: 1 },
  { id: 'ws-5', workStatusName: 'Intern', requiresEndDate: true, taxCategoryCode: 'BUKAN_PEGAWAI', deductBpjsTk: false, deductBpjsKs: false, eligibleForLeave: false, eligibleForOvertime: false, isActive: false, activeEmployeeCount: 0 },
];
