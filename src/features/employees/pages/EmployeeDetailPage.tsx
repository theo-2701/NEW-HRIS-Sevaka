import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, ChevronDown, IdCard, Landmark, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChangeRoleModal, EditWorkDataModal } from '@/features/employees/components/EmployeeAdminModals';
import { workStatusService } from '@/features/work-status/services/work-status.service';
import { useAuthStore } from '@/store/auth.store';
import { PageShell } from '@/components/PageShell';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import { EmploymentStatusBadge, WorkArrangementTag } from '@/features/employees/components/EmployeeTags';
import { useEmployeeDetail } from '@/features/employees/hooks/useEmployees';
import { DETAIL_ERROR_TEXT, detailErrorKind } from '@/features/employees/detailError';
import { CURRENT_EMPLOYEE_ID } from '@/features/employees/services/employee.service';
import { maskAccountHolder, maskAccountNumber, maskNik } from '@/features/employees/masking';
import type { ActorScope } from '@/features/employees/types';
import { formatDate } from '@/lib/format';

function Group({ icon, title, note, children }: { icon: ReactNode; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col border-t border-border-1 pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-3 flex items-center gap-2 font-body text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-fg-3">
        <span className="text-secondary-500">{icon}</span>
        {title}
        {note && <span className="font-medium normal-case tracking-normal text-fg-4">· {note}</span>}
      </h4>
      <dl className="grid grid-cols-[200px_1fr] gap-x-4 gap-y-2.5">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-body text-[12.5px] font-medium text-fg-3">{label}</dt>
      <dd className="m-0 font-body text-[13px] font-medium text-fg-1">{children}</dd>
    </>
  );
}

const mono = 'font-mono tracking-[0.03em]';

/**
 * Halaman detail karyawan — profil gabungan: work data, rekening, dan identitas. Ubah data kerja (EMP-WORKDATA)
 * dan peran (CR-DIALOG) hanya untuk Super Admin · HR Manager · HR Staff (FSD-001-EMPLOYEE 0.83 §1, §15); aksi lain
 * membawa ke layar yang berwenang (PTKP Adjustment, Reprimand, Biodata).
 */
export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const employeeId = params.get('id');
  const scope = (params.get('scope') as ActorScope | null) ?? 'HR';
  const isHr = scope === 'HR';

  const { data, isLoading, error, refetch, isFetching } = useEmployeeDetail(employeeId);
  // UIC-EMPLOYEE 0.76 §2.2 — tanpa id pun dijawab kalimat anti-enumeration, bukan "Loading…" abadi.
  const failure = !employeeId ? 'not-found' : error ? detailErrorKind(error) : null;
  const isSelf = data?.id === CURRENT_EMPLOYEE_ID;
  const role = useAuthStore((s) => s.user?.role);
  const hrWriter = role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF';
  const [editing, setEditing] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const { data: workStatuses = [] } = useQuery({ queryKey: ['work-status', {}], queryFn: () => workStatusService.search({}) });
  const employmentType = workStatuses.find((row) => row.id === data?.workStatusId)?.name;

  return (
    <PageShell
      crumbs={[
        { label: 'Employee Management' },
        { label: 'Employee Directory', to: '/employees/directory' },
        { label: data?.name ?? 'Detail' },
      ]}
      title={data?.name ?? 'Employee Detail'}
      description="Work data, bank account, position and identity of one employee."
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" disabled={!employeeId}>
                More Actions
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate(`/employees/ptkp-adjustment?employee=${employeeId}`)}>
                PTKP Status Adjustment
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`/employees/reprimand?employee=${employeeId}`)}>Reprimand</DropdownMenuItem>
              {hrWriter && <DropdownMenuItem onSelect={() => setChangingRole(true)}>Change Role</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          {hrWriter && (
            <Button variant="secondary" disabled={!data} onClick={() => setEditing(true)}>
              Edit Work Data
            </Button>
          )}
          <Button
            disabled={!employeeId}
            onClick={() => navigate(`/me/profile?employee=${employeeId}${isHr ? '&as=HR_MANAGER' : ''}`)}
          >
            {isHr ? 'Biodata' : 'View Profile'}
          </Button>
        </div>
      }
    >
      <Card>
        {failure ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="m-0 max-w-[520px] font-body text-[13px] font-medium leading-normal text-fg-2">{DETAIL_ERROR_TEXT[failure]}</p>
            {failure === 'unavailable' ? (
              <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
                {isFetching ? 'Trying…' : 'Try again'}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate('/employees/directory')}>
                Back to Employee Directory
              </Button>
            )}
          </div>
        ) : isLoading || !data ? (
          <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 border-b border-border-1 pb-[18px]">
              <Avatar name={data.name} size="lg" />
              <div>
                <h4 className="m-0 font-display text-[22px] font-bold leading-tight tracking-[-0.01em] text-fg-1">
                  {data.name}
                </h4>
                <p className="mt-1.5 flex flex-wrap items-center gap-2.5 font-body text-[13.5px] font-medium text-fg-3">
                  {data.position} · {data.branchName}
                  <EmploymentStatusBadge status={data.employmentStatus} />
                </p>
              </div>
            </div>

            <p className="m-0 flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 font-body text-[12px] font-medium leading-normal text-secondary-900">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-secondary-700" />
              Bank and personal data are masked for other employees, and every view of this page is logged. Use
              the buttons above to change data.
            </p>

            <Group icon={<Briefcase className="size-[15px]" />} title="Work data">
              <Row label="NIK">
                <span className={mono}>{maskNik(data.nik, scope, Boolean(isSelf))}</span>
              </Row>
              <Row label="Employment status">
                <EmploymentStatusBadge status={data.employmentStatus} />
              </Row>
              <Row label="Employment type">{employmentType ?? '—'}</Row>
              <Row label="Work arrangement">
                <WorkArrangementTag arrangement={data.workArrangement} />
              </Row>
              <Row label="Supervisor">{data.supervisor ?? '— (top of the chain)'}</Row>
              <Row label="Contract end date">{data.contractEndDate ? formatDate(data.contractEndDate) : '—'}</Row>
              <Row label="Cost center">
                <span className={mono}>{data.costCenter}</span>
              </Row>
              <Row label="SBU">{data.sbu}</Row>
              <Row label="Job grade & formal position">
                {data.jobGrade} <span className="text-fg-3">· {data.formalPosition}</span>
              </Row>
              <Row label="Join date">{formatDate(data.joinDate)}</Row>
              <Row label="Leave date">
                {data.leaveDate ? (
                  formatDate(data.leaveDate)
                ) : (
                  <span className="text-success-800">Still working</span>
                )}
              </Row>
              <Row label="Record created">{formatDate(data.createdAt)}</Row>
            </Group>

            <Group
              icon={<Landmark className="size-[15px]" />}
              title="Bank account"
            >
              <Row label="Bank">{data.bank.bankCode}</Row>
              <Row label="Account number">
                <span className={mono}>{maskAccountNumber(data.bank.accountNumber, Boolean(isSelf))}</span>
              </Row>
              <Row label="Account holder">{maskAccountHolder(data.bank.accountHolderName, Boolean(isSelf))}</Row>
            </Group>

            <Group
              icon={<IdCard className="size-[15px]" />}
              title="Position & identity"
            >
              <Row label="Name">{data.name}</Row>
              <Row label="Email">{data.email}</Row>
              <Row label="Phone">
                <span className={mono}>{data.phone}</span>
              </Row>
              <Row label="Job position">{data.position}</Row>
              <Row label="Unit / Branch">{data.branchName}</Row>
            </Group>
          </div>
        )}
      </Card>
      {data && editing && <EditWorkDataModal employee={data} open={editing} onClose={() => setEditing(false)} />}
      {data && changingRole && <ChangeRoleModal employee={data} open={changingRole} onClose={() => setChangingRole(false)} />}
    </PageShell>
  );
}
