import { beforeEach, describe, expect, it } from 'vitest';
import { resetTempAssignmentMocks, tempAssignmentService } from '@/features/temp-assignment/services/temp-assignment.service';
import type { TaDraft, TaSession } from '@/features/temp-assignment/types';

const STAFF: TaSession = { employeeId: 'emp-sari', role: 'HR_STAFF' };
const HRM: TaSession = { employeeId: 'emp-hendra', role: 'HR_MANAGER' };
const draft: TaDraft = {
  employeeId: 'emp-sari',
  assignmentType: 'ROTATION',
  orgUnitId: 'ou-proj',
  assignedPosId: 'pos-proj-lead',
  startDate: '2026-11-02',
  returnDate: '2027-01-31',
  reason: '',
};

beforeEach(() => resetTempAssignmentMocks());

describe('Temporary Assignment (§7.18)', () => {
  it('menolak pegawai berpenugasan terbuka, kursi terisi, dan tanggal lampau', async () => {
    await expect(tempAssignmentService.create(STAFF, { ...draft, employeeId: 'emp-budi' }, 'k')).rejects.toThrow(/409/);
    await expect(tempAssignmentService.create(STAFF, { ...draft, assignedPosId: 'pos-fin-staff' }, 'k')).rejects.toThrow(/422/);
    await expect(tempAssignmentService.create(STAFF, { ...draft, startDate: '2026-10-01' }, 'k')).rejects.toThrow(/EMP-VAL-584/);
  });

  it('pembuat tidak bisa menyetujui; approve dengan start hari ini langsung aktif', async () => {
    const row = await tempAssignmentService.create(HRM, draft, 'k');
    await expect(tempAssignmentService.act(HRM, row.id, 'approve')).rejects.toThrow(/409/);
    const own = await tempAssignmentService.create(STAFF, { ...draft, employeeId: 'emp-hendra', assignedPosId: 'pos-fin-analyst', orgUnitId: 'ou-fin' }, 'k2');
    expect((await tempAssignmentService.act(HRM, own.id, 'approve')).status).toBe('ACTIVE');
  });

  it('pulang awal melepas kursi penugasan; extend menuntut tanggal lebih jauh', async () => {
    await expect(tempAssignmentService.extend(HRM, 'ta-1', '2026-12-01')).rejects.toThrow(/422/);
    expect((await tempAssignmentService.extend(HRM, 'ta-1', '2027-03-31')).returnDate).toBe('2027-03-31');
    const back = await tempAssignmentService.act(HRM, 'ta-1', 'return');
    expect(back).toMatchObject({ status: 'RETURNED', returnTrigger: 'EARLY' });
    expect((await tempAssignmentService.vacantSeats('ou-proj')).map((row) => row.id)).toContain('pos-proj-analyst');
  });

  it('HR Staff tidak bisa approve atau return', async () => {
    await expect(tempAssignmentService.act(STAFF, 'ta-1', 'return')).rejects.toThrow(/403/);
  });
});
