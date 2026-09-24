import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, IdCard, Landmark, Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import { EmploymentStatusBadge, WorkArrangementTag } from '@/features/employees/components/EmployeeTags';
import { useEmployeeDetail } from '@/features/employees/hooks/useEmployees';
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
 * Halaman detail karyawan — profil gabungan read-only: work data, rekening, dan identitas.
 * Tiga tombol aksi membawa ke layar yang berwenang mengubah data: PTKP Adjustment, Reprimand,
 * dan profil karyawan (ubah hanya untuk HR).
 */
export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const employeeId = params.get('id');
  const scope = (params.get('scope') as ActorScope | null) ?? 'HR';
  const isHr = scope === 'HR';

  const { data, isLoading } = useEmployeeDetail(employeeId);
  const isSelf = data?.id === CURRENT_EMPLOYEE_ID;

  return (
    <PageShell
      crumbs={[
        { label: 'Employee Management' },
        { label: 'Employee Directory', to: '/employees/directory' },
        { label: data?.name ?? 'Detail' },
      ]}
      title={data?.name ?? 'Employee Detail'}
      description="Profil gabungan read-only — work data, rekening, serta identitas dan posisi."
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            disabled={!employeeId}
            onClick={() => navigate(`/employees/ptkp-adjustment?employee=${employeeId}`)}
          >
            PTKP Status Adjustment
          </Button>
          <Button
            variant="secondary"
            disabled={!employeeId}
            onClick={() => navigate(`/employees/reprimand?employee=${employeeId}`)}
          >
            Reprimand
          </Button>
          <Button
            disabled={!employeeId}
            onClick={() => navigate(`/me/profile?employee=${employeeId}${isHr ? '&as=HR_MANAGER' : ''}`)}
          >
            {isHr ? 'Biodata' : 'Lihat profil'}
          </Button>
        </div>
      }
    >
      <Card>
        {isLoading || !data ? (
          <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat data…</p>
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
              Halaman ini read-only. Rekening &amp; data pribadi disamarkan untuk karyawan lain; setiap pembukaan data
              ini tercatat. Perubahan data dilakukan lewat tombol aksi di atas.
            </p>

            <Group icon={<Briefcase className="size-[15px]" />} title="Work data">
              <Row label="NIK">
                <span className={mono}>{maskNik(data.nik, scope, Boolean(isSelf))}</span>
              </Row>
              <Row label="Employment status">
                <EmploymentStatusBadge status={data.employmentStatus} />
              </Row>
              <Row label="Work status">
                {data.contractEndDate ? 'Karyawan Kontrak (PKWT)' : 'Karyawan Tetap (permanent)'}
              </Row>
              <Row label="Work arrangement">
                <WorkArrangementTag arrangement={data.workArrangement} />
              </Row>
              <Row label="Supervisor (Atasan)">{data.supervisor ?? '— (puncak rantai)'}</Row>
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
                  <span className="text-success-800">Masih bekerja (NULL)</span>
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
    </PageShell>
  );
}
