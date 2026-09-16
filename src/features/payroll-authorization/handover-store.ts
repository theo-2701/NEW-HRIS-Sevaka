import type { HandoverPending, PickupLog, ReexportLog } from '@/features/payroll-authorization/types';

/**
 * Tabel jembatan penyerahan (`map_payroll_handover` + dua log-nya) sebagai satu sumber dummy.
 *
 * Modul daun: tidak mengimpor service mana pun, supaya Salary Processing boleh menulis baris
 * pending saat mengotorisasi penyerahan tanpa impor melingkar.
 */

const at = (date: string, time: string) => `${date}T${time}:00+07:00`;

const PENDING_SEED: HandoverPending[] = [{ periodId: 'per-2026-07', employeeCount: 10, createdAt: at('2026-07-29', '00:00') }];

const PICKUP_SEED: PickupLog[] = [
  {
    id: 'pick-0001',
    periodId: 'per-2026-06',
    clientMachineIdentity: 'CLIENT-PAYROLL-SYS-01',
    employeeCountPicked: 10,
    createdBy: null,
    createdAt: at('2026-07-01', '09:10'),
  },
  {
    id: 'pick-0002',
    periodId: 'per-2026-06',
    clientMachineIdentity: 'CLIENT-PAYROLL-SYS-01',
    employeeCountPicked: 10,
    createdBy: null,
    createdAt: at('2026-07-06', '08:45'),
  },
];

const REEXPORT_SEED: ReexportLog[] = [
  {
    id: 'RX-0001',
    periodId: 'per-2026-06',
    gateResult: 'DISETUJUI',
    reasonText: 'Klien melaporkan file rusak, memerlukan pengiriman ulang.',
    createdBy: 'emp-maya',
    createdAt: at('2026-07-05', '14:20'),
  },
];

let pending: HandoverPending[] = PENDING_SEED.map((row) => ({ ...row }));
let pickups: PickupLog[] = PICKUP_SEED.map((row) => ({ ...row }));
let reexports: ReexportLog[] = REEXPORT_SEED.map((row) => ({ ...row }));
let sequence = 0;

export function resetHandoverStore() {
  pending = PENDING_SEED.map((row) => ({ ...row }));
  pickups = PICKUP_SEED.map((row) => ({ ...row }));
  reexports = REEXPORT_SEED.map((row) => ({ ...row }));
  sequence = 0;
}

export function listPending(): HandoverPending[] {
  return pending.map((row) => ({ ...row })).sort((a, b) => a.periodId.localeCompare(b.periodId));
}

export function pendingOf(periodId: string): HandoverPending | null {
  return pending.find((row) => row.periodId === periodId) ?? null;
}

/** Dipanggil saat penyerahan diotorisasi dan saat ekspor ulang menyalin baris jembatan. */
export function addPending(periodId: string, employeeCount = 10, createdAt = new Date().toISOString()) {
  if (pending.some((row) => row.periodId === periodId)) return;
  pending.push({ periodId, employeeCount, createdAt });
}

export function listPickups(periodId?: string): PickupLog[] {
  return pickups
    .filter((row) => !periodId || row.periodId === periodId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((row) => ({ ...row }));
}

export function listReexports(): ReexportLog[] {
  return reexports.map((row) => ({ ...row })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addReexport(row: Omit<ReexportLog, 'id'>): ReexportLog {
  const saved: ReexportLog = { ...row, id: `RX-${String(reexports.length + 1).padStart(4, '0')}-${(sequence += 1)}` };
  reexports.push(saved);
  return { ...saved };
}
