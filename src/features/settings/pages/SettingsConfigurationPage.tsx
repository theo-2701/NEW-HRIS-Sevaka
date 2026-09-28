import { useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveSettings, useSettings } from '@/features/settings/hooks/useSettings';
import { SETTINGS_VIEWERS } from '@/features/settings/mock-data';
import {
  accessClass,
  belongsTo,
  formatValue,
  MENU_PREFIXES,
  prefixOf,
  rowLabel,
  tabLabel,
  valueOffered,
} from '@/features/settings/rules';
import { SettingsWriteError } from '@/features/settings/types';
import type {
  SettingChange,
  SettingRow,
  SettingRowError,
  SettingsActor,
  SettingsMenuId,
  SettingWriteRow,
  SetupValue,
} from '@/features/settings/types';
import { ApiError } from '@/services/api';

const TITLES: Record<SettingsMenuId, { title: string; description: string }> = {
  time: {
    title: 'Time Settings',
    description:
      'Operational settings of the Time module — 26 settings in 7 groups. Changes apply on the next request, without second-person approval; every change is kept in Change History.',
  },
  employee: {
    title: 'Employee Settings',
    description:
      'Settings owned by the Employee module. Changes apply on the next request and are kept in Change History.',
  },
};

/** Satu isian per jenis penawaran — dua cabang enum = dua bentuk kontrol (G3). */
function ValueControl({
  row,
  value,
  onChange,
}: {
  row: SettingRow;
  value: SetupValue[] | null;
  onChange: (next: SetupValue[]) => void;
}) {
  const options = row.setupOptions;
  if (options?.jenis === 'DAFTAR') {
    return (
      <Select value={value?.[0] !== undefined ? String(value[0]) : ''} onValueChange={(next) => onChange([next])}>
        <SelectTrigger className="h-9 w-[220px]" aria-label={rowLabel(row)}>
          <SelectValue placeholder="Not set" />
        </SelectTrigger>
        <SelectContent>
          {options.pilihan.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  const unit = options?.jenis === 'INTERVAL' ? options.satuan : undefined;
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="decimal"
        className="h-9 w-28"
        aria-label={rowLabel(row)}
        min={options?.jenis === 'INTERVAL' ? options.min : undefined}
        max={options?.jenis === 'INTERVAL' ? options.max : undefined}
        value={value?.[0] ?? ''}
        placeholder="—"
        onChange={(event) => onChange(event.target.value === '' ? [] : [Number(event.target.value)])}
      />
      {unit && <span className="whitespace-nowrap font-body text-xs font-medium text-fg-3">{unit}</span>}
    </div>
  );
}

function boundsText(row: SettingRow) {
  const options = row.setupOptions;
  if (!options) return options === null ? 'Offer not drawn up yet' : '';
  if (options.jenis === 'DAFTAR') return options.pilihan.join(' · ');
  if (options.min === undefined && options.max === undefined) return options.satuan ?? '';
  return `${options.min ?? '…'}–${options.max ?? '…'}${options.satuan ? ` ${options.satuan}` : ''}`;
}

/**
 * System › Settings › Time / Employee (FSD-001-SETTINGS-0.21 §1 & §8 · UIC-001-SETTINGS-0.12 §1–§2).
 *
 * `A1` membaca semua setelan yang boleh dilihat pemanggil; layar menyaring ke Menu ini. Kelas PENUH
 * (HR Manager/Super Admin) mengubah nilai; kelas R‡ (HR Staff) baca-saja tanpa kolom penawaran dan tanpa
 * tombol Simpan; peran nol akses ditolak 403. Tombol Simpan mengirim HANYA baris tersunting pada Menu ini
 * (Lingkup A, PROB-FRONTEND-035); meninggalkan Menu dengan suntingan tertinggal meminta konfirmasi.
 */
export function SettingsConfigurationPage({ menu }: { menu: SettingsMenuId }) {
  const [actor, setActor] = useState<SettingsActor>(SETTINGS_VIEWERS[0]);
  const settings = useSettings(actor);
  const save = useSaveSettings();
  const [edits, setEdits] = useState<Record<string, SetupValue[]>>({});
  const [tab, setTab] = useState<string>(MENU_PREFIXES[menu][0]);
  const [result, setResult] = useState<SettingWriteRow[] | null>(null);
  const [rejected, setRejected] = useState<{ message: string; errors: SettingRowError[] } | null>(null);

  const cls = accessClass(actor.role);
  const writable = cls === 'FULL';
  const rows = useMemo(
    () => (settings.data ?? []).filter((row) => belongsTo(menu, row.setupCode)),
    [settings.data, menu],
  );
  const grouped = menu === 'time';
  const tabs = grouped
    ? MENU_PREFIXES[menu]
        .map((prefix) => ({ prefix, count: rows.filter((row) => prefixOf(row.setupCode) === prefix).length }))
        .filter((item) => item.count > 0)
    : [];
  const visibleRows = grouped ? rows.filter((row) => prefixOf(row.setupCode) === tab) : rows;

  const dirtyCodes = Object.keys(edits).filter((code) => {
    const original = rows.find((row) => row.setupCode === code)?.setupValue ?? null;
    return JSON.stringify(original) !== JSON.stringify(edits[code]);
  });
  const dirty = dirtyCodes.length > 0;

  // Meninggalkan Menu dengan suntingan tertinggal ⇒ konfirmasi (FSD Peta Menu butir 3).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved setting changes on this menu. Leave without saving?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    setEdits({});
  }, [actor, menu]);

  const valueOf = (row: SettingRow) => edits[row.setupCode] ?? row.setupValue;
  const localError = (row: SettingRow) => {
    const value = edits[row.setupCode];
    return value ? valueOffered(row.setupOptions, value) : null;
  };

  const submit = () => {
    const changes: SettingChange[] = dirtyCodes.map((code) => ({ setupCode: code, setupValue: edits[code] }));
    save.mutate(
      { actor, changes },
      {
        onSuccess: (rowsWritten) => {
          setEdits({});
          setResult(rowsWritten);
        },
        onError: (error) => {
          if (error instanceof SettingsWriteError) setRejected({ message: error.message, errors: error.errors });
          else setRejected({ message: error.message, errors: [] });
        },
      },
    );
  };

  const forbidden = settings.error instanceof ApiError && settings.error.status === 403;

  return (
    <PageShell
      crumbs={[{ label: 'System' }, { label: 'Settings' }, { label: menu === 'time' ? 'Time' : 'Employee' }]}
      title={TITLES[menu].title}
      description={TITLES[menu].description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={actor.id}
            onValueChange={(id) => {
              const next = SETTINGS_VIEWERS.find((row) => row.id === id);
              if (next && (!dirty || window.confirm('Discard unsaved changes?'))) setActor(next);
            }}
          >
            <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
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
          {writable && (
            <Button disabled={!dirty || save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : dirty ? `Save changes (${dirtyCodes.length})` : 'Save changes'}
            </Button>
          )}
        </div>
      }
    >
      {forbidden ? (
        <Card>
          <EmptyState
            title="403 — Forbidden"
            description="Your role does not hold any setting. Access is refused before any data is read."
          />
        </Card>
      ) : !settings.isLoading && rows.length === 0 ? (
        <Card>
          <EmptyState title="No settings for this menu" description="Your role reads settings of other modules only." />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped && tabs.length > 0 && (
            <TabMenu<string>
              value={tab}
              onChange={setTab}
              items={tabs.map((item) => ({
                value: item.prefix,
                label: tabLabel(item.prefix),
                count: item.count,
              }))}
            />
          )}
          <Card>
            <CardHead
              title={grouped ? `${tabLabel(tab)} · ${tab}` : 'Settings'}
              sub={
                writable
                  ? 'Rows are ordered by setup code. Locked platform rows never appear here.'
                  : 'Read-only — your role can view these settings but cannot change them.'
              }
            />
            <DataTable<SettingRow>
              rows={visibleRows}
              rowKey={(row) => row.setupCode}
              loading={settings.isLoading}
              empty="No settings in this group."
              columns={[
                {
                  key: 'label',
                  header: 'Setting',
                  render: (row) => (
                    <div className="flex max-w-[340px] flex-col gap-0.5 whitespace-normal">
                      <span className="flex items-center gap-2 font-bold text-fg-1">
                        {rowLabel(row)}
                        {edits[row.setupCode] && dirtyCodes.includes(row.setupCode) && (
                          <StatusBadge tone="warn">Edited</StatusBadge>
                        )}
                        {row.isRetired && <StatusBadge tone="mute">Retired</StatusBadge>}
                      </span>
                      <span className="font-mono text-[11px] text-fg-3">{row.setupCode}</span>
                    </div>
                  ),
                },
                {
                  key: 'value',
                  header: 'Value',
                  render: (row) =>
                    writable && !row.isRetired ? (
                      <div className="flex flex-col gap-1">
                        <ValueControl
                          row={row}
                          value={valueOf(row)}
                          onChange={(next) => setEdits((prev) => ({ ...prev, [row.setupCode]: next }))}
                        />
                        {localError(row) && (
                          <span className="font-body text-[11px] font-medium text-error-700">{localError(row)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="font-semibold text-fg-1">{formatValue(row.setupValue)}</span>
                    ),
                },
                ...(writable
                  ? [
                      {
                        key: 'offer',
                        header: 'Offered values',
                        render: (row: SettingRow) => <span className="text-fg-3">{boundsText(row) || '—'}</span>,
                      },
                    ]
                  : []),
                {
                  key: 'desc',
                  header: 'Description',
                  muted: true,
                  render: (row) => (
                    <span className="block max-w-[360px] whitespace-normal">{row.description ?? '—'}</span>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* WKT-6 — pintu tulis berhasil */}
      <Modal
        open={Boolean(result)}
        onOpenChange={(open) => !open && setResult(null)}
        title="Settings saved"
        description="All rows were accepted in one transaction. Rows sent with their current value create no new version."
        size="wide"
        footer={<Button onClick={() => setResult(null)}>Close</Button>}
      >
        <DataTable<SettingWriteRow>
          rows={result ?? []}
          rowKey={(row) => row.setupCode}
          columns={[
            {
              key: 'code',
              header: 'Setup code',
              render: (row) => <span className="font-mono text-xs">{row.setupCode}</span>,
            },
            { key: 'after', header: 'Value after', strong: true, render: (row) => formatValue(row.setupValue) },
            {
              key: 'changed',
              header: 'Changed?',
              render: (row) => (
                <StatusBadge tone={row.changed ? 'ok' : 'mute'}>{row.changed ? 'Yes' : 'No'}</StatusBadge>
              ),
            },
            { key: 'version', header: 'New version', align: 'right', render: (row) => row.versionNumber ?? '—' },
          ]}
        />
      </Modal>

      {/* WKT-7 — pintu tulis ditolak, seluruh baris dilaporkan sekaligus */}
      <Modal
        open={Boolean(rejected)}
        onOpenChange={(open) => !open && setRejected(null)}
        title="Changes rejected"
        description={rejected?.message}
        size="wide"
        footer={<Button onClick={() => setRejected(null)}>Fix values</Button>}
      >
        {rejected && rejected.errors.length > 0 && (
          <DataTable<SettingRowError>
            rows={rejected.errors}
            rowKey={(row) => row.field}
            columns={[
              {
                key: 'field',
                header: 'Rejected row',
                render: (row) => <span className="font-mono text-xs">{row.field}</span>,
              },
              { key: 'code', header: 'Code', render: (row) => <StatusBadge tone="err">{row.code}</StatusBadge> },
              {
                key: 'message',
                header: 'Message',
                muted: true,
                render: (row) => <span className="block max-w-[360px] whitespace-normal">{row.message}</span>,
              },
            ]}
          />
        )}
      </Modal>
    </PageShell>
  );
}
