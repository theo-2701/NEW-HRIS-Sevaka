import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { PanelActionButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { Button } from '@/components/ui/button';
import { useJobListing } from '@/features/recruitment/hooks/useRecruitment';
import { FIXED_STAGES, TEAM_ROLES } from '@/features/recruitment/jobForm';
import { closesAt } from '@/features/recruitment/services/recruitment.service';
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, type JobDetails, type JobListing } from '@/features/recruitment/types';
import { cn } from '@/lib/utils';

type Tab = 'job' | 'form' | 'stages' | 'team' | 'platform';
const TAB_STEP: Record<Tab, number> = { job: 1, form: 2, stages: 3, team: 4, platform: 5 };

const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmt = (value: string | Date | null | undefined) => (value ? date.format(new Date(value)) : '—');
const idr = new Intl.NumberFormat('id-ID');
const salary = (d: JobDetails) => (d.salaryMin || d.salaryMax ? `IDR ${idr.format(d.salaryMin)} – ${idr.format(d.salaryMax)}` : '—');

function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="font-body text-sm font-semibold text-fg-1">{children}</span>
      {note && <span className="font-body text-[11px] font-medium text-fg-4">{note}</span>}
    </div>
  );
}

/** Baris label–isi untuk teks panjang (`.jd-rows`). */
function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="m-0 grid gap-x-8 gap-y-4 md:grid-cols-[200px_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-body text-[13px] font-semibold text-fg-3">{label}</dt>
          <dd className="m-0 whitespace-pre-line font-body text-[13px] leading-[1.6] text-fg-1">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((name) => (
        <span key={name} className="rounded-md border border-border-1 bg-mist px-3 py-2 font-body text-[13px] font-semibold text-fg-2">
          {name}
        </span>
      ))}
    </div>
  );
}

function JobTab({ d }: { d: JobDetails }) {
  return (
    <Rows
      rows={[
        ['Job description', d.description],
        ['Job requirements', d.requirements],
        ['Benefits', d.benefits],
        ['Job summary', d.summary],
        ['Education', d.education],
        ['Experience level', d.experienceLevel],
        ['Minimum experience', d.minExperience === '' ? '' : `${d.minExperience} years`],
        ['Gender', d.gender],
        ['Age range', d.ageMin || d.ageMax ? `${d.ageMin} – ${d.ageMax} years` : ''],
      ]}
    />
  );
}

function FormTab({ d }: { d: JobDetails }) {
  const groups = [...new Set(d.formFields.map((item) => item.group))];
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-secondary-600">{group}</span>
          <div className="grid gap-2 md:grid-cols-2">
            {d.formFields
              .filter((item) => item.group === group)
              .map((item) => (
                <div key={item.name} className={cn('flex items-center justify-between gap-3 rounded-md border border-border-1 px-3.5 py-2.5', !item.on && 'opacity-60')}>
                  <span className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 font-body text-[13px] font-bold text-fg-1">
                      {item.name}
                      {item.locked && <Lock className="size-3.5 text-fg-4" aria-label="Always asked" />}
                    </span>
                    <span className="font-body text-xs font-medium text-fg-3">{item.type}</span>
                  </span>
                  <StatusBadge tone={!item.on ? 'mute' : item.mandatory ? 'info' : 'ok'}>{!item.on ? 'Off' : item.mandatory ? 'Mandatory' : 'Optional'}</StatusBadge>
                </div>
              ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-secondary-600">Custom questions</span>
        {d.questions.length === 0 ? (
          <span className="font-body text-[13px] text-fg-3">No custom question.</span>
        ) : (
          <Rows
            rows={d.questions.map((q, i) => [
              `${i + 1}. ${q.type}${q.required ? ' · required' : ''}`,
              [q.question, q.description, q.options.filter(Boolean).join(' / ')].filter(Boolean).join('\n'),
            ])}
          />
        )}
      </div>
    </div>
  );
}

function StagesTab({ d }: { d: JobDetails }) {
  return (
    <Rows
      rows={[
        [
          'New candidates',
          [
            d.screeningAssessment ? `Assessment: ${d.screeningAssessment}` : 'No assessment',
            d.autoReject && `Auto-reject when the score is below ${d.autoRejectBelow}%${d.autoRejectEmail ? ', with rejection email' : ''}`,
          ]
            .filter(Boolean)
            .join('\n'),
        ],
        [FIXED_STAGES.screening.title, <Pills key="s" items={FIXED_STAGES.screening.stages} />],
        ...d.processes.map(
          (process): [string, ReactNode] => [
            `In process · ${process.name}`,
            <Pills key={process.id} items={process.stages.map((stage) => (stage.assessment ? `${stage.name} (${stage.assessment})` : stage.name || 'Unnamed stage'))} />,
          ],
        ),
        [FIXED_STAGES.offer.title, <Pills key="o" items={FIXED_STAGES.offer.stages} />],
        [FIXED_STAGES.final.title, <Pills key="f" items={FIXED_STAGES.final.stages} />],
      ]}
    />
  );
}

function TeamTab({ d }: { d: JobDetails }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TEAM_ROLES.map((role) => (
        <div key={role.key} className="flex flex-col gap-2 rounded-xl border border-border-1 p-4">
          <span className="font-body text-[13px] font-bold text-fg-1" title={role.hint}>
            {role.label}
          </span>
          {d.team[role.key].length === 0 ? (
            <span className="font-body text-[13px] text-fg-3">Nobody assigned.</span>
          ) : (
            d.team[role.key].map((name) => (
              <span key={name} className="flex items-center gap-2 font-body text-[13px] font-medium text-fg-2">
                <Avatar name={name} size="sm" />
                {name}
              </span>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function PlatformTab({ d }: { d: JobDetails }) {
  return (
    <Rows
      rows={[
        ['Platforms', d.platforms.length ? <Pills items={d.platforms} /> : 'Not published anywhere'],
        ['Closing', d.noClosingDate ? 'No closing date' : fmt(d.closingDate)],
        ['Auto close', d.autoClose ? 'Closes once the headcount is fulfilled' : 'Off'],
        ['Applications', d.restrictOne ? `One per candidate; can apply again after ${d.reapplyMonths} months` : 'No limit'],
      ]}
    />
  );
}

/** Pratinjau sisi kandidat — hanya field yang diizinkan tampil ke publik. */
function PreviewModal({ open, onClose, listing, d }: { open: boolean; onClose: () => void; listing: JobListing; d: JobDetails }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Preview job listing"
      description="What candidates see on the career page."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="m-0 font-display text-xl font-bold text-fg-1">{listing.title}</h3>
          <p className="m-0 mt-1 font-body text-[13px] font-medium text-fg-3">
            {[d.city, d.employmentStatus, d.workplaceType, d.showHeadcount && `${d.headcount} openings`].filter(Boolean).join(' · ')}
          </p>
          {d.showSalary && <p className="m-0 mt-1 font-body text-[13px] font-semibold text-fg-1">{salary(d)}</p>}
        </div>
        <p className="m-0 font-body text-[13px] font-semibold text-fg-2">{d.summary}</p>
        <Rows
          rows={[
            ['About the role', d.description],
            ['Requirements', d.requirements],
            ['Benefits', d.benefits],
          ]}
        />
      </div>
    </Modal>
  );
}

/** Recruitment › Job Listings › Detail — port `_prototype/recruitment-job-listing-detail.html`. Edit membuka wizard di langkahnya. */
export function JobListingDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [tab, setTab] = useState<Tab>('job');
  const [preview, setPreview] = useState(false);
  const { data, isLoading } = useJobListing(id);
  const crumbs = [{ label: 'Recruitment' }, { label: 'Job Listings', to: '/recruitment/job-listings' }];

  if (!data) {
    return (
      <PageShell crumbs={[...crumbs, { label: 'Detail' }]} title="Job listing">
        {isLoading ? <p className="m-0 font-body text-[13px] text-fg-3">Loading job listing…</p> : <EmptyState title="Job listing not found" description="It may have been deleted." />}
      </PageShell>
    );
  }

  const { listing, details: d } = data;
  const editable = listing.status !== 'CLOSED';
  const edit = (step: number) => navigate(`/recruitment/job-listings/create?id=${listing.id}&step=${step}`);
  const editButton = (step: number) => editable && <PanelActionButton onClick={() => edit(step)}>Edit</PanelActionButton>;
  const all = listing.newCandidates + listing.inProcess + listing.hired;
  const TABS: Record<Tab, ReactNode> = {
    job: <JobTab d={d} />,
    form: <FormTab d={d} />,
    stages: <StagesTab d={d} />,
    team: <TeamTab d={d} />,
    platform: <PlatformTab d={d} />,
  };
  const tabs: { value: Tab; label: string }[] = [
    { value: 'job', label: 'Job Information' },
    { value: 'form', label: 'Application Form' },
    { value: 'stages', label: 'Hiring Stages' },
    { value: 'team', label: 'Hiring Team' },
    { value: 'platform', label: 'Publication Platform' },
  ];

  return (
    <PageShell
      crumbs={[...crumbs, { label: listing.title }]}
      title={listing.title}
      description={`${listing.id} · ${listing.branch} · ${listing.organization}`}
      actions={
        <>
          <Button variant="secondary" onClick={() => setPreview(true)}>
            Preview Job Listing
          </Button>
          <Button onClick={() => navigate(`/recruitment/candidates/add?job=${listing.id}`)}>Add Candidate</Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHead title="Job listing details" action={editButton(1)} />
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Status">
              <StatusBadge tone={JOB_STATUS_TONE[listing.status]}>{JOB_STATUS_LABEL[listing.status]}</StatusBadge>
            </Field>
            <Field label="Job listing ID">{listing.id}</Field>
            <Field label="Job position">{d.position || '—'}</Field>
            <Field label="Branch location">{d.branch || '—'}</Field>
            <Field label="Province">{d.province || '—'}</Field>
            <Field label="City">{d.city || '—'}</Field>
            <Field label="Organization">{d.organization || '—'}</Field>
            <Field label="Employment type">{d.employmentStatus || '—'}</Field>
            <Field label="Workplace type">{d.workplaceType || '—'}</Field>
            <Field label="Headcount needed" note={d.showHeadcount ? 'Candidates can see this' : 'Only the hiring team can see this'}>
              {listing.hired}/{d.headcount} filled
            </Field>
            <Field label="Salary range" note={d.showSalary ? 'Candidates can see this' : 'Only the hiring team can see this'}>
              {salary(d)}
            </Field>
            <Field label="Salary description">{d.salaryDescription || '—'}</Field>
            <Field label="Published date">{fmt(listing.publishedAt)}</Field>
            <Field label="Valid until">{listing.status === 'DRAFT' ? '—' : d.noClosingDate ? 'No closing date' : fmt(closesAt(listing) ?? d.closingDate)}</Field>
            <Field label="Created by">
              <span className="flex items-center gap-2">
                <Avatar name={listing.createdBy} size="sm" />
                {listing.createdBy}
              </span>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHead title="Candidates summary" />
          <dl className="m-0 flex flex-col">
            {(
              [
                ['All candidates', all],
                ['New candidates', listing.newCandidates],
                ['In process', listing.inProcess],
                ['In offering', 0],
                ['Hired', listing.hired],
                ['Rejected', 0],
                ['Withdrawn', 0],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-vapor py-2.5 last:border-b-0">
                <dt className="font-body text-[13px] font-medium text-fg-3">{label}</dt>
                <dd className="m-0 font-display text-base font-bold text-fg-1">{value}</dd>
              </div>
            ))}
          </dl>
          {/* ponytail: angka In offering/Rejected/Withdrawn menunggu data kandidat (menu Candidates). */}
        </Card>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <TabMenu<Tab> value={tab} onChange={setTab} items={tabs} />
        <Card>
          <CardHead title={tabs.find((item) => item.value === tab)!.label} action={editButton(TAB_STEP[tab])} />
          {TABS[tab]}
        </Card>
      </div>

      <PreviewModal open={preview} onClose={() => setPreview(false)} listing={listing} d={d} />
    </PageShell>
  );
}
