import { useEffect, useMemo, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Note, SettingCell, ValueControl } from '@/features/settings/components/SettingsBits';
import { useSaveSettings, useSettings } from '@/features/settings/hooks/useSettings';
import { ROD_CODES, SETTINGS_VIEWERS } from '@/features/settings/mock-data';
import {
  accessClass,
  belongsTo,
  deriveTabs,
  formatValue,
  KEADAAN_META,
  MENU_LABELS,
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

const COMMON =
  'Changes apply on the next request, without second-person approval; every change is kept in Change History.';

const TITLES: Record<SettingsMenuId, { title: string; description: string }> = {
  time: {
    title: 'Time Settings',
    description: `Operational settings of the Time module — 26 settings in 7 groups. ${COMMON}`,
  },
  finance: {
    title: 'Finance Settings',
    description: `Benefit, loan, and cash advance rules of the Finance module — 27 settings in 4 groups. ${COMMON}`,
  },
  payroll: {
    title: 'Payroll Settings',
    description: `Closing day, suspension pay, proration, and rounding rules of Payroll — 8 settings. ${COMMON}`,
  },
  performance: {
    title: 'Performance Settings',
    description: `Assessment cycle settings of the Performance module — 7 settings. ${COMMON}`,
  },
  productivity: {
    title: 'Productivity Settings',
    description: `Time entry window and task reminder of the Productivity module — 2 settings. ${COMMON}`,
  },
  document: {
    title: 'Document Settings',
    description: `Storage quota settings of the Document module — 2 settings. ${COMMON}`,
  },
  organization: {
    title: 'Organization Settings',
    description: `Branch hierarchy and assignment modes of the Company module — 3 settings. ${COMMON}`,
  },
  employee: { title: 'Employee Settings', description: `Settings owned by the Employee module. ${COMMON}` },
};

/** Catatan batas per Menu — dinyatakan di layar, bukan didiamkan (FSD §4–§7). */
const MENU_NOTES: Partial<Record<SettingsMenuId, string>> = {
  performance:
    'Badges such as "Frozen when a period opens" or "Temporary value" come from the Performance source documents, not from the server. Frozen settings do not change periods or scores that already exist.',
  document:
    'Both values and their offer type are not drawn up by the Document module yet, so there is no control to change them. This menu has no read-only role.',
  organization:
    'Cost center and SBU assignment follow the R/O/D pattern: OPTIONAL is always accepted, DISABLED needs an explicit confirmation (assignment history is kept), and REQUIRED is refused while active employees still lack an assignment.',
  finance: 'Descriptions are not filled by the Finance module yet. Rows inside a group are ordered by setup code.',
};

function boundsText(row: SettingRow) {
  const options = row.setupOptions;
  if (!options) return options === null ? 'Not drawn up yet' : '';
  if (options.jenis === 'DAFTAR') return options.pilihan.length ? options.pilihan.join(' · ') : 'Not drawn up yet';
  if (options.min === undefined && options.max === undefined) return options.satuan ?? '';
  return `${options.min ?? '…'}–${options.max ?? '…'}${options.satuan ? ` ${options.satuan}` : ''}`;
}

/**
 * System › Settings › {Time, Finance, Payroll, Performance, Productivity, Document, Organization, Employee}
 * (FSD-001-SETTINGS-0.21 §1–§8 · UIC-001-SETTINGS-0.12 §1–§2).
 *
 * `A1` membaca semua setelan yang boleh dilihat pemanggil; layar menyaring ke Menu ini dan menurunkan Sub Menu
 * secara mekanis. Kelas PENUH (HR Manager/Super Admin) mengubah nilai; kelas R‡ baca-saja tanpa kolom penawaran
 * dan tanpa tombol Simpan; peran nol akses ditolak 403. Tombol Simpan mengirim HANYA baris tersunting pada Menu
 * ini (Lingkup A, PROB-FRONTEND-035); meninggalkan Menu dengan suntingan tertinggal meminta konfirmasi.
 */
export function SettingsConfigurationPage({ menu }: { menu: SettingsMenuId }) {
  const navigate = useNavigate();
  const [actor, setActor] = useState<SettingsActor>(SETTINGS_VIEWERS[0]);
  const settings = useSettings(actor);
  const save = useSaveSettings();
  const [edits, setEdits] = useState<Record<string, SetupValue[]>>({});
  const [tab, setTab] = useState('');
  const [keyword, setKeyword] = useState('');
  const [confirmRod, setConfirmRod] = useState<SettingChange[] | null>(null);
  const [result, setResult] = useState<SettingWriteRow[] | null>(null);
  const [rejected, setRejected] = useState<{ status: number; message: string; errors: SettingRowError[] } | null>(null);

  const cls = accessClass(actor.role);
  const writable = cls === 'FULL';
  const rows = useMemo(
    () => (settings.data ?? []).filter((row) => belongsTo(menu, row.setupCode)),
    [settings.data, menu],
  );
  const tabs = useMemo(() => deriveTabs(rows.map((row) => row.setupCode)), [rows]);
  const activeTab = tabs.find((item) => item.prefix === tab) ?? tabs[0];
  const term = keyword.trim().toLowerCase();
  const visibleRows = rows
    .filter((row) => !activeTab || activeTab.codes.includes(row.setupCode))
    .filter((row) => !term || `${rowLabel(row)} ${row.setupCode}`.toLowerCase().includes(term));

  const dirtyCodes = Object.keys(edits).filter((code) => {
    const original = rows.find((row) => row.setupCode === code)?.setupValue ?? null;
    return JSON.stringify(original) !== JSON.stringify(edits[code]);
  });
  const dirty = dirtyCodes.length > 0;
  const editableCount = rows.filter((row) => row.setupOptions || ROD_CODES.includes(row.setupCode)).length;

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
    return value && dirtyCodes.includes(row.setupCode) ? valueOffered(row.setupOptions, value) : null;
  };

  const send = (changes: SettingChange[]) => {
    save.mutate(
      { actor, changes },
      {
        onSuccess: (rowsWritten) => {
          setConfirmRod(null);
          setEdits({});
          setResult(rowsWritten);
        },
        onError: (error) => {
          setConfirmRod(null);
          if (error instanceof SettingsWriteError)
            setRejected({ status: error.status, message: error.message, errors: error.errors });
          else setRejected({ status: 0, message: error.message, errors: [] });
        },
      },
    );
  };

  const submit = () => {
    const changes: SettingChange[] = dirtyCodes.map((code) => ({ setupCode: code, setupValue: edits[code] }));
    // Transisi R/O/D ke DISABLED menuntut konfirmasi eksplisit (UIC §2.4) — ditanyakan dulu, bukan dikirim buta.
    const toDisabled = changes.filter((row) => ROD_CODES.includes(row.setupCode) && row.setupValue[0] === 'DISABLED');
    if (toDisabled.length) setConfirmRod(changes);
    else send(changes);
  };

  // Kewajiban bersyarat yang masih kosong sesudah pasangannya diubah (GAP-5) — narasi layar.
  const partnerNote = (code: string) => {
    const partner = (settings.data ?? []).find((row) => row.pasanganKey === code);
    return partner && (!partner.setupValue || partner.setupValue.length === 0)
      ? `${partner.setupCode} is still empty — fill it in if this value needs it.`
      : null;
  };
  const resultHasPartner = (result ?? []).some((row) => partnerNote(row.setupCode));

  const forbidden = settings.error instanceof ApiError && settings.error.status === 403;
  const showStance = rows.some((row) => row.keadaanNilai && row.keadaanNilai !== 'BERLAKU');

  const columns: Column<SettingRow>[] = [
    {
      key: 'label',
      header: 'Setting',
      render: (row) => <SettingCell row={row} edited={dirtyCodes.includes(row.setupCode)} />,
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
        <span className="flex max-w-[340px] flex-col gap-0.5 whitespace-normal">
          <span>{row.description ?? 'Not filled by the daily sweep yet'}</span>
          {showStance && row.keadaanNilai && row.keadaanNilai !== 'BERLAKU' && (
            <span className="text-xs font-semibold text-fg-2">{KEADAAN_META[row.keadaanNilai].stance}</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      crumbs={[{ label: 'System' }, { label: 'Settings' }, { label: MENU_LABELS[menu] }]}
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
          {writable && (
            <Button variant="secondary" onClick={() => navigate(`/settings/change-history?menu=${menu}`)}>
              Menu history
            </Button>
          )}
          {writable && (
            <Button disabled={!dirty || save.isPending || editableCount === 0} onClick={submit}>
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
          <EmptyState
            title="No settings for this menu"
            description={
              menu === 'document'
                ? 'Only HR Manager and Super Admin can read Document settings.'
                : 'Your role reads settings of other modules only.'
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {MENU_NOTES[menu] && <Note icon={<Info />}>{MENU_NOTES[menu]}</Note>}
          {tabs.length > 0 && activeTab && (
            <TabMenu<string>
              value={activeTab.prefix}
              onChange={setTab}
              items={tabs.map((item) => ({
                value: item.prefix,
                label: tabLabel(item.prefix),
                count: item.codes.length,
              }))}
            />
          )}
          <Card>
            <CardHead
              title={activeTab ? `${tabLabel(activeTab.prefix)} · ${activeTab.prefix}` : 'Settings'}
              sub={
                writable
                  ? 'Rows are ordered by setup code. Locked platform rows never appear here.'
                  : 'Read-only — your role can view these settings but cannot change them.'
              }
            />
            <div>
              <TableToolbar
                summary={
                  settings.isLoading ? undefined : `${visibleRows.length} setting${visibleRows.length === 1 ? '' : 's'}`
                }
                search={{ value: keyword, onChange: setKeyword, placeholder: 'Search setting…' }}
              />
              <DataTable<SettingRow>
                rows={visibleRows}
                rowKey={(row) => row.setupCode}
                loading={settings.isLoading}
                empty={term ? 'No setting matches this search.' : 'No settings in this group.'}
                columns={columns}
                actions={
                  writable
                    ? (row) => (
                        <RowButton
                          onClick={() =>
                            navigate(`/settings/change-history?setup_code=${encodeURIComponent(row.setupCode)}`)
                          }
                        >
                          History
                        </RowButton>
                      )
                    : undefined
                }
              />
            </div>
          </Card>
        </div>
      )}

      {/* ORG — transisi R/O/D ke DISABLED: konfirmasi eksplisit ⇒ confirm_transition:true */}
      <ConfirmDialog
        open={Boolean(confirmRod)}
        onOpenChange={(open) => !open && setConfirmRod(null)}
        title="Turn off assignment?"
        description="Setting an assignment mode to DISABLED hides that assignment field for every employee. Assignment history is not deleted."
        confirmLabel="Confirm and save"
        loading={save.isPending}
        onConfirm={() =>
          confirmRod &&
          send(
            confirmRod.map((row) =>
              ROD_CODES.includes(row.setupCode) && row.setupValue[0] === 'DISABLED'
                ? { ...row, confirmTransition: true }
                : row,
            ),
          )
        }
      >
        <ul className="flex flex-col gap-1 font-body text-[13px] font-medium text-fg-2">
          {(confirmRod ?? [])
            .filter((row) => ROD_CODES.includes(row.setupCode) && row.setupValue[0] === 'DISABLED')
            .map((row) => (
              <li key={row.setupCode}>
                <span className="font-mono text-xs">{row.setupCode}</span> →{' '}
                <span className="font-bold text-fg-1">DISABLED</span>
              </li>
            ))}
        </ul>
      </ConfirmDialog>

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
            ...(resultHasPartner
              ? [
                  {
                    key: 'partner',
                    header: 'Partner state',
                    render: (row: SettingWriteRow) => (
                      <span className="block max-w-[260px] whitespace-normal text-xs font-semibold text-warning-800">
                        {partnerNote(row.setupCode) ?? '—'}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Modal>

      {/* WKT-7 — pintu tulis ditolak, seluruh baris dilaporkan sekaligus; ORG-6 — 500 keadaan hari ini */}
      <Modal
        open={Boolean(rejected)}
        onOpenChange={(open) => !open && setRejected(null)}
        title={rejected?.status === 500 ? 'Could not save' : 'Changes rejected'}
        description={
          rejected?.status === 500
            ? `${rejected.message} No setting was changed. The assignment completeness check is not available yet, so REQUIRED cannot be chosen today.`
            : rejected?.message
        }
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
