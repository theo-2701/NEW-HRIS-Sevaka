import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, SelectRow } from '@/features/company/components/CompanyBits';
import { useSettingVersions } from '@/features/settings/hooks/useSettings';
import { LOCKED_CODES, SETTING_SEED, SETTINGS_VIEWERS } from '@/features/settings/mock-data';
import {
  canReadHistory,
  formatValue,
  HISTORY_MODULES,
  historyPrefixes,
  MENU_LABELS,
  moduleOf,
} from '@/features/settings/rules';
import type { HistoryModule, SettingsActor, SettingsMenuId, VersionRow } from '@/features/settings/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { ApiError } from '@/services/api';

type ActorClass = 'ALL' | 'HUMAN' | 'SYSTEM';

const ACTOR_CLASSES: Record<ActorClass, string> = {
  ALL: 'All actors',
  HUMAN: 'Hide system rows',
  SYSTEM: 'System rows only',
};

const ALL_CODES = [...SETTING_SEED.map((row) => row.setupCode), ...LOCKED_CODES].sort((a, b) => a.localeCompare(b));
/** Pemilih pelaku — dependensi lapis tampilan milik employee-service (UIC §3.4), di sini dari persona dataset. */
const PEOPLE = SETTINGS_VIEWERS.filter((viewer) => viewer.nik !== '-');

function ActorCell({ row }: { row: VersionRow }) {
  if (row.isSystemActor) return <StatusBadge tone="info">SYSTEM</StatusBadge>;
  if (row.isAnonymizedActor) return <StatusBadge tone="mute">ANONYMIZED</StatusBadge>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-bold text-fg-1">{row.createdBy.nama}</span>
      <span className="text-xs text-fg-3">NIK {row.createdBy.nik}</span>
    </span>
  );
}

/**
 * System › Settings › Change History — FSD-001-SETTINGS-0.21 §9 · UIC-001-SETTINGS-0.12 §3 (`A3`).
 *
 * Satu grid kronologis lintas-setelan (bukan tab per-Menu), tepat dua peran pembaca; peran ber-R‡ tetap 403 di
 * gerbang. NOL tombol tanpa pengecualian — layar ini tidak punya pintu tulis. Baris ANONIM tetap tampil saat baris
 * mesin dibuang (aturan pasangan), baris TERKUNCI tetap tampil berlencana. Masuk dari tombol "History" baris
 * setelan membawa `setup_code` (RIW-6); dari tombol "Menu history" membawa Modul.
 */
export function SettingsChangeHistoryPage() {
  const [params] = useSearchParams();
  const carriedCode = params.get('setup_code') ?? '';
  const carriedMenu = params.get('menu') as SettingsMenuId | null;

  const [actor, setActor] = useState<SettingsActor>(SETTINGS_VIEWERS[0]);
  const [modules, setModules] = useState<HistoryModule[]>(
    carriedMenu && HISTORY_MODULES.includes(carriedMenu) ? [carriedMenu] : [],
  );
  const [setupCode, setSetupCode] = useState(carriedCode);
  const [personId, setPersonId] = useState('');
  const [actorClass, setActorClass] = useState<ActorClass>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  const versions = useSettingVersions(actor, {
    setupCode: setupCode || undefined,
    setupCodePrefixes: historyPrefixes(modules),
    createdByEmployeeId: personId || undefined,
    isSystemActor: actorClass === 'ALL' ? undefined : actorClass === 'SYSTEM',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    size,
  });
  const forbidden = versions.error instanceof ApiError && versions.error.status === 403;

  const reset = () => {
    setModules([]);
    setSetupCode('');
    setPersonId('');
    setActorClass('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };
  const touch =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const moduleSummary =
    modules.length && modules.length < HISTORY_MODULES.length ? modules.map((m) => MENU_LABELS[m]).join(', ') : '';
  const summary = [
    moduleSummary,
    setupCode,
    PEOPLE.find((row) => row.id === personId)?.nama,
    actorClass !== 'ALL' && ACTOR_CLASSES[actorClass],
    (startDate || endDate) && `${startDate ? formatDate(startDate) : '…'} – ${endDate ? formatDate(endDate) : '…'}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const active = [moduleSummary, setupCode, personId, actorClass !== 'ALL', startDate || endDate].filter(
    Boolean,
  ).length;

  return (
    <PageShell
      crumbs={[{ label: 'System' }, { label: 'Settings' }, { label: 'Change History' }]}
      title="Change History"
      description="Every change to company settings across all modules, newest first. Read-only — there is no approval step, so this history is the control."
      actions={
        <Select
          value={actor.id}
          onValueChange={(id) => {
            const next = SETTINGS_VIEWERS.find((row) => row.id === id);
            if (next) {
              setActor(next);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="h-10 w-[300px]" aria-label="Viewing as">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_VIEWERS.map((viewer) => (
              <SelectItem key={viewer.id} value={viewer.id}>
                {viewer.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {forbidden || !canReadHistory(actor.role) ? (
        <Card>
          <EmptyState
            title="403 — Forbidden"
            description="Only HR Manager and Super Admin can read change history — including roles that can read their own module settings. Access is refused before any data is read."
          />
        </Card>
      ) : (
        <Card>
          <CardHead title="Setting versions" sub="Ordered by change time, newest first" />
          <div>
            <TableToolbar
              filters={
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {active > 0 ? `Filter (${active})` : 'Filter'}
                </Button>
              }
              summary={summary || undefined}
            />
            <DataTable<VersionRow>
              rows={versions.data?.data ?? []}
              rowKey={(row) => row.id}
              loading={versions.isLoading}
              empty={versions.error ? versions.error.message : 'No change matches this filter.'}
              columns={[
                {
                  key: 'code',
                  header: 'Setup code',
                  render: (row) => <span className="font-mono text-xs font-semibold text-fg-1">{row.setupCode}</span>,
                },
                { key: 'menu', header: 'Menu', nowrap: true, render: (row) => MENU_LABELS[moduleOf(row.setupCode)] },
                { key: 'ver', header: 'Ver.', align: 'right', render: (row) => row.versionNumber },
                {
                  key: 'before',
                  header: 'Before',
                  muted: true,
                  render: (row) => (row.previousSetupValue ? formatValue(row.previousSetupValue) : '—'),
                },
                { key: 'after', header: 'After', strong: true, render: (row) => formatValue(row.setupValue) },
                { key: 'actor', header: 'Actor', render: (row) => <ActorCell row={row} /> },
                { key: 'time', header: 'Time', nowrap: true, render: (row) => formatDateTime(row.createdAt) },
                {
                  key: 'note',
                  header: 'Note',
                  render: (row) => (row.isLocked ? <StatusBadge tone="warn">LOCKED</StatusBadge> : '—'),
                },
              ]}
            />
            <Pagination
              page={page}
              pageSize={size}
              total={versions.data?.totalData ?? 0}
              noun="versions"
              pageSizes={[25, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setSize(next);
                setPage(1);
              }}
            />
          </div>
        </Card>
      )}

      <FilterModal
        open={filterOpen}
        title="Filter change history"
        description="Ticking every module is the same as no module filter."
        onOpenChange={setFilterOpen}
        onReset={reset}
      >
        <Field label="Module">
          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
            {HISTORY_MODULES.map((module) => (
              <label key={module} className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
                <Checkbox
                  checked={modules.includes(module)}
                  onCheckedChange={(value) =>
                    touch(setModules)(value === true ? [...modules, module] : modules.filter((item) => item !== module))
                  }
                />
                {MENU_LABELS[module]}
              </label>
            ))}
          </div>
        </Field>
        <SelectRow
          label="Setting"
          allowEmpty
          emptyLabel="All settings"
          value={setupCode}
          onChange={touch(setSetupCode)}
          options={ALL_CODES.map((code) => ({ value: code, label: code }))}
        />
        <SelectRow
          label="Actor"
          allowEmpty
          emptyLabel="Anyone"
          value={personId}
          onChange={touch(setPersonId)}
          options={PEOPLE.map((row) => ({ value: row.id, label: `${row.nama} · ${row.nik}` }))}
        />
        <SelectRow
          label="Actor class"
          value={actorClass}
          onChange={(value) => touch(setActorClass)(value as ActorClass)}
          options={(Object.keys(ACTOR_CLASSES) as ActorClass[]).map((key) => ({
            value: key,
            label: ACTOR_CLASSES[key],
          }))}
        />
        <Field label="Changed on">
          <DateRangePicker
            value={{ from: startDate, to: endDate }}
            onChange={touch((range: { from: string; to: string }) => {
              setStartDate(range.from);
              setEndDate(range.to);
            })}
          />
        </Field>
      </FilterModal>
    </PageShell>
  );
}
