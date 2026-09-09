import type { ReactNode } from 'react';
import { ArrowUpRight, CheckCircle2, Database, Flag, IdCard, ShieldCheck, User } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import type { ProfileActor } from '@/features/profile/types';
import { cn } from '@/lib/utils';

/**
 * Kerangka halaman profil — port `.ep-frame`: SATU kartu putih yang memuat
 * breadcrumb, kartu identitas, dan isi seksi, supaya tidak ada garis pemisah
 * bertumpuk seperti kalau tiap blok memakai kartu sendiri.
 */
export function ProfileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-border-1 bg-bg-surface px-5 py-[18px] shadow-card-sm">
      {children}
    </div>
  );
}

/** Chip endpoint kontrak — port `.ep-chip`. */
export function EndpointChip({ method, path, icon }: { method?: string; path: string; icon?: 'db' | 'call' }) {
  const Icon = icon === 'db' ? Database : ArrowUpRight;
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-pill bg-secondary-950 px-3 font-mono text-[11px] font-semibold text-[#cfe8f6]">
      <Icon className="size-3.5 text-[#7cc2e6]" />
      {method && <b className="font-bold text-white">{method}</b>}
      {path}
    </span>
  );
}

/** Kartu identitas + pemilih cakupan aktor — port `.ep-idcard`. */
export function IdentityCard({
  name,
  role,
  nik,
  nationality,
  status,
  actor,
  onActorChange,
}: {
  name: string;
  role: string;
  nik: string;
  nationality: string;
  status: string;
  actor: ProfileActor;
  onActorChange: (actor: ProfileActor) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-primary-200 bg-[linear-gradient(180deg,var(--color-primary-50),#fff)]">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-[18px]">
        <div className="flex items-center gap-4">
          <Avatar
            name={name}
            size="lg"
            className="bg-[linear-gradient(155deg,#7ab9d4,#026395)] shadow-[0_0_0_3px_#fff,0_2px_6px_rgba(2,99,149,.25)]"
          />
          <div>
            <h1 className="m-0 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-fg-1">{name}</h1>
            <p className="mt-0.5 font-body text-[13px] font-medium leading-normal text-fg-3">{role}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <IdPill icon={<IdCard className="size-3.5" />}>{nik}</IdPill>
              <IdPill icon={<Flag className="size-3.5" />}>{nationality}</IdPill>
              <span className="inline-flex h-6 items-center rounded-pill bg-success-50 px-2.5 font-body text-[11px] font-bold leading-none text-success-700">
                {status}
              </span>
            </div>
          </div>
        </div>

        <EndpointChip icon="db" path="schema employee_profile" />
      </div>

      {/* Scope bar — di produksi datang dari klaim JWT, bukan dipilih pengguna;
          dipertahankan sebagai alat verifikasi field terkunci HR. */}
      <div className="flex flex-wrap items-center gap-2.5 border-t border-primary-200 px-3.5 py-2.5">
        <span className="t-label text-secondary-700">Actor data-scope</span>

        <ScopePill active={actor === 'ESS'} onClick={() => onActorChange('ESS')} icon={<User className="size-3.5" />}>
          Employee · self
        </ScopePill>
        <ScopePill
          active={actor === 'HR'}
          onClick={() => onActorChange('HR')}
          icon={<ShieldCheck className="size-3.5" />}
        >
          HR Manager · restricted fields
        </ScopePill>

        <span className="ml-auto font-body text-[11.5px] font-medium leading-normal text-fg-3">
          <code className="rounded bg-vapor px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-fg-4">
            employee_id
          </code>{' '}
          diambil dari klaim JWT (anti-IDOR); id di body diabaikan.
        </span>
      </div>
    </section>
  );
}

function IdPill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-primary-50 px-2.5 font-body text-[11px] font-bold leading-none tracking-[0.02em] text-secondary-700">
      {icon}
      {children}
    </span>
  );
}

function ScopePill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-[26px] items-center gap-1.5 rounded-pill border px-3 font-body text-[11.5px] font-semibold leading-none transition-colors duration-200 ease-standard',
        active
          ? 'border-secondary-500 bg-secondary-500 text-white [&_svg]:text-white'
          : 'border-primary-200 bg-white text-fg-2 hover:border-secondary-500 [&_svg]:text-secondary-500',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Kartu seksi — port `.ep-card` versi di dalam `.ep-frame`: tanpa border dan
 * bayangan sendiri supaya tidak ada garis ganda dengan frame.
 */
export function SectionCard({
  icon,
  title,
  description,
  endpoint,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  endpoint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-1 pb-3">
        <span className="shrink-0 text-secondary-500 [&_svg]:size-[18px]">{icon}</span>
        <div className="min-w-0">
          <h2 className="m-0 font-display text-base font-bold leading-tight text-fg-1">{title}</h2>
          {description && (
            <p className="mt-[3px] font-body text-xs font-medium leading-normal text-fg-3">{description}</p>
          )}
        </div>
        {(endpoint || action) && (
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            {endpoint}
            {action}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-4 pt-4">{children}</div>
    </section>
  );
}

/** Catatan kontekstual — port `.note--info` / `.note--warn`. */
export function Note({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn';
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'm-0 flex items-start gap-2.5 rounded-[10px] px-4 py-3 font-body text-[12.5px] font-medium leading-normal',
        tone === 'warn' ? 'bg-warning-100 text-warning-800' : 'bg-secondary-50 text-fg-2',
        '[&_svg]:mt-px [&_svg]:size-[17px] [&_svg]:shrink-0',
        tone === 'warn' ? '[&_svg]:text-warning-800' : '[&_svg]:text-secondary-500',
      )}
    >
      {icon}
      <span>{children}</span>
    </p>
  );
}

/**
 * Legend keputusan kontrak — port `.gap-legend`.
 * `open` = gap masih menunggu kontrak (amber); `closed` = keputusan final.
 */
export function GapLegend({
  state = 'closed',
  tag,
  children,
}: {
  state?: 'open' | 'closed';
  tag: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 font-body text-[11.5px] font-medium leading-normal',
        state === 'open'
          ? 'border-warning-200 bg-warning-50 text-warning-950 [&_svg]:text-warning-700'
          : 'border-border-1 bg-mist text-fg-2 [&_svg]:text-secondary-600',
      )}
    >
      <CheckCircle2 className="mt-px size-[15px] shrink-0" />
      <div>
        <span
          className={cn(
            'mr-1.5 inline-flex h-[18px] items-center rounded-[5px] px-1.5 font-body text-[8.5px] font-bold uppercase tracking-[0.04em] text-white',
            state === 'open' ? 'bg-warning-500' : 'bg-secondary-600',
          )}
        >
          {tag}
        </span>
        {children}
      </div>
    </div>
  );
}

/** Blok detail di dalam kartu (HOT / COLD) — port `.ep-block`. */
export function DetailBlock({
  icon,
  title,
  table,
  variant = 'hot',
  children,
}: {
  icon: ReactNode;
  title: string;
  table: string;
  variant?: 'hot' | 'cold';
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-1 px-[18px] py-4',
        variant === 'cold' ? 'bg-mist' : 'bg-bg-surface',
      )}
    >
      <h3 className="mb-3 flex flex-wrap items-center gap-2 font-body text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-fg-3">
        <span className="text-secondary-500 [&_svg]:size-[15px]">{icon}</span>
        {title}
        <span className="font-mono text-[10.5px] font-medium normal-case tracking-normal text-fg-4">· {table}</span>
      </h3>
      {children}
    </div>
  );
}

/** Dua blok berdampingan — port `.ep-twocol`. */
export function TwoCol({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-2">{children}</div>;
}

/** Daftar key–value — port `.kv.ep-kv` (kolom label 180px). */
export function KeyValueList({ children, cols = '180px 1fr' }: { children: ReactNode; cols?: string }) {
  return (
    <dl className="grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns: cols }}>
      {children}
    </dl>
  );
}

export function KeyValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-body text-[12.5px] font-medium text-fg-3">{label}</dt>
      <dd className="m-0 font-body text-[13px] font-medium text-fg-1">{children}</dd>
    </>
  );
}

/** Nilai kosong yang seragam. */
export function Empty({ children = '—' }: { children?: ReactNode }) {
  return <span className="text-fg-4">{children}</span>;
}

/** PII yang belum di-reveal — port `.pii-hidden`. */
export function PiiHidden({ children }: { children: ReactNode }) {
  return <span className="italic text-fg-4">{children}</span>;
}

export const monoClass = 'font-mono tracking-[0.03em]';

/** Kode inline dalam deskripsi kartu — port `.ep-code`. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-vapor px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-fg-4">{children}</code>
  );
}

/** Tag netral kecil — port `.ep-tag`. */
export function Tag({ children, tone }: { children: ReactNode; tone?: 'default' | 'emergency' }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2.5 font-body text-[10.5px] font-bold uppercase leading-none tracking-[0.03em]',
        tone === 'emergency' ? 'bg-error-100 text-error-800' : 'bg-vapor text-fg-2',
      )}
    >
      {children}
    </span>
  );
}

/** Penanda lampiran dokumen — port `.ep-cert`. */
export function CertMark({ present }: { present: boolean }) {
  return present ? (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-success-100 px-2.5 font-body text-[10.5px] font-bold uppercase leading-none text-success-900">
      ada
    </span>
  ) : (
    <Empty />
  );
}

/** Nilai tunggal besar — port `.ep-single`. */
export function SingleValue({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-1 bg-mist p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-100 text-secondary-600 [&_svg]:size-6">
        {icon}
      </span>
      <div>
        <div className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.05em] text-fg-3">
          {label}
        </div>
        <div className="mt-1.5 font-display text-[22px] font-bold leading-tight tracking-[-0.01em] text-fg-1">
          {value}
        </div>
      </div>
    </div>
  );
}
