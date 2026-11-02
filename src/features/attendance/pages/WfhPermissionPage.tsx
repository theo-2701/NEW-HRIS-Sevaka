import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WfhPermissionPanel } from '@/features/attendance/components/WfhPermissionPanel';
import { VIEWERS, employeeName } from '@/features/attendance/mock-data';
import type { AttendanceSession } from '@/features/attendance/types';

/**
 * Time › Attendance › WFH Permission (FSD-001-TIME 0.21 §11A · UIC-001-TIME §6.4).
 * Izin lahir otomatis dari tap; layar ini hanya membaca dan memutus.
 */
export function WfhPermissionPage() {
  const [session, setSession] = useState<AttendanceSession>(VIEWERS[3]);

  return (
    <PageShell
      crumbs={[{ label: 'Time Management' }, { label: 'Attendance' }, { label: 'WFH Permission' }]}
      title="WFH Permission"
      description="Opened automatically when a WFO-profile employee taps from home. One manager approving is enough; a rejection or a timeout only flags the tap — attendance stays valid."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select
            value={session.employeeId}
            onValueChange={(value) => setSession(VIEWERS.find((row) => row.employeeId === value) ?? VIEWERS[0])}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWERS.map((viewer) => (
                <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                  {employeeName(viewer.employeeId)} — {viewer.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <WfhPermissionPanel session={session} />
      </div>
    </PageShell>
  );
}
