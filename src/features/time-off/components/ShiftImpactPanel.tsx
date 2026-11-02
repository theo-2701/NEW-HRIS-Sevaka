import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { employeeName } from '@/features/time-off/mock-data';
import { useAssignments, useSaveAssignment, useShifts } from '@/features/scheduler/hooks/useScheduler';
import type { LeaveRequest } from '@/features/time-off/types';
import type { Shift, ShiftAssignment } from '@/features/scheduler/types';
import { formatDate } from '@/lib/format';

const shiftLabel = (shift: Shift | undefined) =>
  shift ? `${shift.shiftName}${shift.startTime ? ` · ${shift.startTime}–${shift.endTime}` : ''}` : '—';

/**
 * Dampak pada roster shift (UIC-TIME §10.2a, 0.24). Untuk tanggal izin yang belum
 * lewat: shift pemohon dan sisa orangnya. Approver ber-`shift-assignment:update`
 * boleh memindahkan rekan dari shift lain lebih dulu. Persetujuan tidak pernah
 * diblok panel ini; pengajuan susulan (semua tanggal lewat) tanpa panel.
 */
export function ShiftImpactPanel({ request, today }: { request: LeaveRequest; today: string }) {
  const from = request.startDate > today ? request.startDate : today;
  const { data: rows = [] } = useAssignments({ from, to: request.endDate });
  const { data: shifts = [] } = useShifts();
  const move = useSaveAssignment();
  const [showOthers, setShowOthers] = useState<string | null>(null);

  if (request.endDate < today) return null;

  const mine = rows.filter((row) => row.employeeId === request.employeeId && row.shiftId && !row.isOffDay);
  if (!mine.length) {
    return (
      <Note icon={<CalendarClock />}>
        Dampak pada roster shift: pemohon tidak punya roster shift pada tanggal izin yang belum lewat.
      </Note>
    );
  }

  const moveHere = (row: ShiftAssignment, shiftId: string) =>
    move.mutate({ draft: { employeeId: row.employeeId, workDate: row.workDate, shiftId, isOffDay: false }, id: row.id });

  return (
    <section aria-label="Shift impact" className="flex flex-col gap-3 rounded-md border border-border-1 p-3.5">
      <span className="font-body text-[13px] font-bold text-fg-1">Dampak pada roster shift</span>
      {mine.map((own) => {
        const shift = shifts.find((item) => item.id === own.shiftId);
        const sameDay = rows.filter((row) => row.workDate === own.workDate && row.employeeId !== request.employeeId);
        const remaining = sameDay.filter((row) => row.shiftId === own.shiftId && !row.isOffDay);
        const others = sameDay.filter((row) => row.shiftId && row.shiftId !== own.shiftId && !row.isOffDay);
        const open = showOthers === own.id;
        return (
          <div key={own.id} className="flex flex-col gap-2 border-t border-border-1 pt-2.5 first:border-t-0 first:pt-0">
            <span className="font-body text-[13px] font-medium text-fg-2">
              {formatDate(own.workDate)} · {shiftLabel(shift)} — sisa {remaining.length} orang
              {remaining.length > 0 && (
                <span className="text-fg-4"> ({remaining.map((row) => employeeName(row.employeeId)).join(', ')})</span>
              )}
            </span>
            {others.length > 0 && !open && (
              <Button variant="ghost" className="self-start" onClick={() => setShowOthers(own.id)}>
                Show colleagues from other shifts
              </Button>
            )}
            {open && (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {others.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-body text-[13px] font-medium text-fg-2">
                      {employeeName(row.employeeId)}
                      <span className="ml-1.5 text-fg-4">{shiftLabel(shifts.find((item) => item.id === row.shiftId))}</span>
                    </span>
                    <Button variant="secondary" disabled={move.isPending} onClick={() => moveHere(row, own.shiftId!)}>
                      Move to this shift
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <span className="font-body text-xs font-normal text-fg-3">Panel ini tidak menahan persetujuan.</span>
    </section>
  );
}
