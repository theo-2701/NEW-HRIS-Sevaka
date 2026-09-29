import { useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MULTI_VALUE_CODES, POINTER_CODES, ROD_CODES, SCREEN_NOTES } from '@/features/settings/mock-data';
import { KEADAAN_META, rowLabel } from '@/features/settings/rules';
import type { SettingRow, SetupValue } from '@/features/settings/types';
import { cn } from '@/lib/utils';

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
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

const Unit = ({ children }: { children?: string }) =>
  children ? <span className="whitespace-nowrap font-body text-xs font-medium text-fg-3">{children}</span> : null;

const Hint = ({ children }: { children: ReactNode }) => (
  <span className="font-body text-[11px] font-medium text-fg-3">{children}</span>
);

/** Deretan majemuk — chip berulang + "Add", bukan kotak tunggal (FSD §2.4 `KEU-1a`). */
function MultiValueControl({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: SetupValue[];
  unit?: string;
  onChange: (next: SetupValue[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (draft === '') return;
    onChange([...value, Number(draft)]);
    setDraft('');
  };
  return (
    <div className="flex max-w-[320px] flex-wrap items-center gap-1.5">
      {value.map((item, index) => (
        <span
          key={`${String(item)}-${index}`}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-secondary-50 pl-2.5 pr-1 font-body text-xs font-bold text-secondary-700"
        >
          {item}
          <button
            type="button"
            aria-label={`Remove ${String(item)}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="inline-flex size-5 items-center justify-center rounded-full text-fg-3 hover:bg-mist hover:text-error-600"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Input
        type="number"
        inputMode="numeric"
        className="h-8 w-20"
        aria-label={`Add value to ${label}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
      />
      <RowButton onClick={add} disabled={draft === ''}>
        Add
      </RowButton>
      <Unit>{unit}</Unit>
    </div>
  );
}

/**
 * Satu kontrol per bentuk penawaran (G3): DAFTAR → pilihan; INTERVAL → angka (+ satuan); deretan majemuk →
 * chip; penawaran `null` → tanpa kontrol (kecuali penunjuk, isian bebas — PROB-FRONTEND-038).
 */
export function ValueControl({
  row,
  value,
  onChange,
}: {
  row: SettingRow;
  value: SetupValue[] | null;
  onChange: (next: SetupValue[]) => void;
}) {
  const options = row.setupOptions;
  const label = rowLabel(row);
  if (!options) {
    if (POINTER_CODES.includes(row.setupCode)) {
      return (
        <div className="flex flex-col gap-1">
          <Input
            className="h-9 w-[300px] font-mono text-xs"
            aria-label={label}
            value={String(value?.[0] ?? '')}
            onChange={(event) => onChange(event.target.value === '' ? [] : [event.target.value])}
          />
          <Hint>Pointer id — the name is only readable in Manage Period.</Hint>
        </div>
      );
    }
    return <Hint>No control — the offer type is not drawn up by the module owner yet.</Hint>;
  }
  if (options.jenis === 'DAFTAR') {
    const current = value?.[0] !== undefined ? String(value[0]) : '';
    if (!options.pilihan.length) {
      return (
        <div className="flex flex-col gap-1">
          <Select value={current} disabled>
            <SelectTrigger className="h-9 w-[220px]" aria-label={label}>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>{current && <SelectItem value={current}>{current}</SelectItem>}</SelectContent>
          </Select>
          <Hint>Other choices are not drawn up by the module owner yet.</Hint>
        </div>
      );
    }
    return (
      <Select value={current} onValueChange={(next) => onChange([next])}>
        <SelectTrigger className="h-9 w-[220px]" aria-label={label}>
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
  if (MULTI_VALUE_CODES.includes(row.setupCode)) {
    return <MultiValueControl label={label} value={value ?? []} unit={options.satuan} onChange={onChange} />;
  }
  if (options.satuan === 'MM-DD') {
    return (
      <Input
        className="h-9 w-28"
        aria-label={label}
        placeholder="MM-DD"
        value={String(value?.[0] ?? '')}
        onChange={(event) => onChange(event.target.value === '' ? [] : [event.target.value])}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="decimal"
        className="h-9 w-28"
        aria-label={label}
        min={options.min}
        max={options.max}
        value={value?.[0] ?? ''}
        placeholder="—"
        onChange={(event) => onChange(event.target.value === '' ? [] : [Number(event.target.value)])}
      />
      <Unit>{options.satuan}</Unit>
    </div>
  );
}

/** Kolom Setelan: label, kode, dan lencana — kontrak (`keadaan_nilai`/`jangkauan`) dipisah dari turunan layar. */
export function SettingCell({ row, edited }: { row: SettingRow; edited: boolean }) {
  const keadaan = row.keadaanNilai ? KEADAAN_META[row.keadaanNilai] : null;
  const notes = SCREEN_NOTES[row.setupCode] ?? [];
  return (
    <div className="flex max-w-[360px] flex-col gap-1 whitespace-normal">
      <span className="font-bold text-fg-1">{rowLabel(row)}</span>
      <span className="font-mono text-[11px] text-fg-3">{row.setupCode}</span>
      {(edited || row.isRetired || keadaan?.badge || notes.length > 0 || ROD_CODES.includes(row.setupCode)) && (
        <span className="flex flex-wrap gap-1.5">
          {edited && <StatusBadge tone="warn">Edited</StatusBadge>}
          {row.isRetired && <StatusBadge tone="mute">Retired</StatusBadge>}
          {keadaan?.badge && <StatusBadge tone={keadaan.tone}>{keadaan.badge}</StatusBadge>}
          {ROD_CODES.includes(row.setupCode) && <StatusBadge tone="brand">R/O/D</StatusBadge>}
          {notes.map((note) => (
            <StatusBadge key={note.label} tone={note.tone}>
              {note.label}
            </StatusBadge>
          ))}
        </span>
      )}
      {row.keadaanNilai === 'WAJIB_BERSYARAT' && row.pasanganKey && (
        <span className="text-xs font-medium text-fg-3">
          Depends on <span className="font-mono">{row.pasanganKey}</span>
        </span>
      )}
      {row.jangkauan && row.jangkauan.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          <span className="text-xs font-bold text-fg-2">Drives {row.jangkauan.length} gates</span>
          {row.jangkauan.map((item) => (
            <span key={`${item.modul}-${item.gerbang}`} className="text-xs font-medium text-fg-3">
              {item.modul} · {item.gerbang}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
