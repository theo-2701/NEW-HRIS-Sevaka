import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Info, MapPin, Users, Video } from 'lucide-react';
import { Card, EmptyState } from '@/components/Card';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { AvatarStack } from '@/features/recruitment/components/AvatarStack';
import { useRecruitmentOverview, useUpcomingInterviews } from '@/features/recruitment/hooks/useRecruitment';
import { CLOSING_SOON_DAYS, LOW_PERFORMANCE_BELOW } from '@/features/recruitment/services/recruitment.service';
import { STAGE_LABEL, STAGE_TONE, type Interview } from '@/features/recruitment/types';
import { cn } from '@/lib/utils';

type Range = 'today' | 'week';

const dayKey = (iso: string) => new Date(iso).toDateString();
const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

function dayLabel(iso: string) {
  const offset = Math.round((new Date(dayKey(iso)).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
  return offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : weekday.format(new Date(iso));
}

const endOf = (row: Interview) => new Date(row.startAt).getTime() + row.durationMin * 60_000;

/** Wawancara yang sedang berjalan, atau yang berikutnya hari ini — disorot seperti `.rc-iv--now`. */
function focusId(rows: Interview[], now = Date.now()) {
  const today = new Date().toDateString();
  return rows.find((row) => dayKey(row.startAt) === today && endOf(row) > now)?.id ?? null;
}

function InterviewRow({ row, focus, onOpen }: { row: Interview; focus: boolean; onOpen: () => void }) {
  const live = Date.now() >= new Date(row.startAt).getTime() && Date.now() < endOf(row);
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border px-[18px] transition-[border-color,box-shadow] duration-200 hover:border-primary-500 hover:shadow-card',
        focus ? 'border-secondary-500 bg-secondary-50 py-5' : 'border-border-1 bg-white py-3.5',
      )}
    >
      <span className="flex flex-col gap-[3px] border-r border-vapor pr-[18px]">
        <span className={cn('font-display font-bold leading-none tracking-[-0.01em] text-fg-1', focus ? 'text-[22px]' : 'text-lg')}>
          {time.format(new Date(row.startAt))}
        </span>
        <span className="font-body text-[11px] font-medium text-fg-3">{row.durationMin} min</span>
      </span>
      <span className="flex min-w-40 flex-[1_1_200px] items-center gap-3">
        <Avatar name={row.candidateName} size="md" className={focus ? 'size-12 text-[15px]' : 'size-10 text-sm'} />
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className={cn('font-body font-bold text-fg-1', focus ? 'text-[15px]' : 'text-sm')}>{row.candidateName}</span>
          <span className="font-body text-xs font-medium text-fg-3">{row.jobTitle}</span>
        </span>
      </span>
      <StatusBadge tone={STAGE_TONE[row.stage]}>{STAGE_LABEL[row.stage]}</StatusBadge>
      <span className="flex items-center gap-[7px] font-body text-[12.5px] font-medium text-fg-2">
        {row.online ? <Video className="size-4 text-secondary-500" /> : <MapPin className="size-4 text-secondary-500" />}
        {row.place}
      </span>
      <span className="ml-auto flex items-center gap-3">
        <AvatarStack names={row.interviewers} />
        {focus && row.online && live && row.meetingUrl ? (
          <Button className="min-w-[104px]" onClick={() => window.open(row.meetingUrl!, '_blank', 'noopener')}>
            Join
          </Button>
        ) : (
          <Button variant="secondary" className="min-w-[104px]" onClick={onOpen}>
            View Detail
          </Button>
        )}
      </span>
    </div>
  );
}

function Stat({ label, hint, value, icon }: { label: string; hint: string; value?: number; icon: ReactNode }) {
  return (
    <div className="px-5 py-[18px] [&+&]:border-l [&+&]:border-vapor">
      <span className="flex items-center gap-1.5 font-body text-[13px] font-medium text-fg-3">
        {label}
        <span title={hint} aria-label={hint} className="inline-flex text-fg-4">
          <Info className="size-4" />
        </span>
      </span>
      <span className="mt-3.5 flex items-center gap-2.5 font-display text-[26px] font-bold leading-none tracking-[-0.01em] text-fg-1 [&_svg]:size-[22px] [&_svg]:text-secondary-400">
        {icon}
        {value ?? '…'}
      </span>
    </div>
  );
}

function Overview({ title, link, children }: { title: string; link?: string; children: ReactNode }) {
  return (
    <section className="mt-[22px] overflow-hidden rounded-xl border border-border-1">
      <header className="flex items-center justify-between border-b border-border-1 bg-mist px-5 py-[13px]">
        <span className="font-body text-[15px] font-bold text-fg-1">{title}</span>
        {link && (
          <Link to={link} className="font-body text-[13px] font-semibold text-fg-link hover:underline">
            View details
          </Link>
        )}
      </header>
      <div className="grid grid-cols-[repeat(3,minmax(190px,1fr))] overflow-x-auto">{children}</div>
    </section>
  );
}

/** Recruitment › Home — port `_prototype/recruitment-home.html` (tanpa dokumen kontrak). */
export function RecruitmentHomePage() {
  const [range, setRange] = useState<Range>('today');
  const [opened, setOpened] = useState<Interview | null>(null);
  const { data: interviews = [], isLoading } = useUpcomingInterviews();
  const { data: overview } = useRecruitmentOverview();

  const today = new Date().toDateString();
  const weekEnd = new Date(today).getTime() + 7 * 86_400_000;
  const shown = interviews.filter((row) =>
    range === 'today' ? dayKey(row.startAt) === today : new Date(row.startAt).getTime() < weekEnd,
  );
  const groups = [...new Set(shown.map((row) => dayKey(row.startAt)))].map((key) => shown.filter((row) => dayKey(row.startAt) === key));
  const focus = focusId(interviews);

  return (
    <PageShell crumbs={[{ label: 'Recruitment' }, { label: 'Home' }]} title="Home">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 font-display text-lg font-bold text-fg-1">
            Upcoming Interviews
            <span title="Interviews scheduled for you or your hiring teams." className="inline-flex text-fg-4">
              <Info className="size-4" />
            </span>
          </span>
          <Segmented<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
            ]}
          />
        </div>

        {isLoading ? (
          <p className="m-0 font-body text-[13px] text-fg-3">Loading interviews…</p>
        ) : groups.length === 0 ? (
          <EmptyState
            title={range === 'today' ? 'No interview today' : 'No interview this week'}
            description="Scheduled interviews will appear here."
          />
        ) : (
          groups.map((rows) => (
            <div key={rows[0].startAt} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-secondary-600">{dayLabel(rows[0].startAt)}</span>
                <span className="font-body text-xs font-medium text-fg-3">{day.format(new Date(rows[0].startAt))}</span>
                <span className="ml-auto rounded-full bg-mist px-2.5 py-[5px] font-body text-[11px] font-bold text-fg-3">
                  {rows.length} {rows.length === 1 ? 'interview' : 'interviews'}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {rows.map((row) => (
                  <InterviewRow key={row.id} row={row} focus={row.id === focus} onOpen={() => setOpened(row)} />
                ))}
              </div>
            </div>
          ))
        )}

        {/* ponytail: "View details" kandidat belum punya tujuan — tautan muncul begitu menu Candidates dibangun. */}
        <Overview title="Candidates Overview">
          <Stat label="New candidates" hint="Applications that nobody has reviewed yet." value={overview?.newCandidates} icon={<Users />} />
          <Stat label="Unscheduled interview" hint="Candidates moved to an interview stage without a schedule." value={overview?.unscheduledInterviews} icon={<Users />} />
          <Stat label="Unresponsive offering" hint="Offers sent that the candidate has not answered." value={overview?.unresponsiveOffers} icon={<Users />} />
        </Overview>

        <Overview title="Job Openings Overview" link="/recruitment/job-listings">
          <Stat label="Closing date" hint={`Published job listings that close within ${CLOSING_SOON_DAYS} days.`} value={overview?.closingSoon} icon={<Briefcase />} />
          <Stat label="In draft" hint="Job listings saved as draft and not published yet." value={overview?.inDraft} icon={<Briefcase />} />
          <Stat label="Low performance" hint={`Published job listings with fewer than ${LOW_PERFORMANCE_BELOW} new candidates.`} value={overview?.lowPerformance} icon={<Briefcase />} />
        </Overview>
      </Card>

      <Modal
        open={Boolean(opened)}
        onOpenChange={(next) => !next && setOpened(null)}
        title="Interview detail"
        description={opened ? `${opened.candidateName} · ${opened.jobTitle}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpened(null)}>
              Close
            </Button>
            {opened?.meetingUrl && <Button onClick={() => window.open(opened.meetingUrl!, '_blank', 'noopener')}>Open Meeting Link</Button>}
          </>
        }
      >
        {opened && (
          <KeyValueList>
            <KeyValueRow label="Stage">
              <StatusBadge tone={STAGE_TONE[opened.stage]}>{STAGE_LABEL[opened.stage]}</StatusBadge>
            </KeyValueRow>
            <KeyValueRow label="Schedule">
              {day.format(new Date(opened.startAt))} · {time.format(new Date(opened.startAt))} ({opened.durationMin} min)
            </KeyValueRow>
            <KeyValueRow label={opened.online ? 'Meeting' : 'Location'}>{opened.place}</KeyValueRow>
            <KeyValueRow label="Interviewers">{opened.interviewers.join(', ')}</KeyValueRow>
          </KeyValueList>
        )}
      </Modal>
    </PageShell>
  );
}
