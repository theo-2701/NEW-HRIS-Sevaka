import { useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Pemicu — bentuknya sama dengan `<SelectTrigger>` supaya sejajar dropdown biasa. */
const TRIGGER = cn(
  'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-silver bg-cloud px-3 text-left font-body text-xs font-medium leading-[1.4] outline-none transition-[border-color,box-shadow] duration-200 ease-standard',
  'focus-visible:border-secondary-500 focus-visible:shadow-[0_0_0_4px_rgba(2,132,199,.16)] data-[state=open]:border-secondary-500',
  'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
);

const FIELD =
  'h-9 w-full rounded-md border border-silver bg-white pl-9 pr-3 font-body text-[13px] font-medium text-fg-1 outline-none placeholder:text-fg-4 focus:border-secondary-500';

const norm = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Dropdown "pilih yang ada atau tambah baru" (Notulen 12 Okt 2026 keputusan #1): supaya penulisan
 * konsisten (mis. "Direktur" vs "Direksi"), pengguna memilih dari daftar dulu; baru bila tidak ada,
 * menambah nilai baru. Nilai yang diketik sama (abaikan besar/kecil & spasi) dengan yang sudah ada
 * otomatis memakai yang ada — tidak lahir duplikat.
 */
export function CreatableSelect({
  value,
  onChange,
  options,
  noun,
  placeholder,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Nilai yang sudah ada (teks). */
  options: string[];
  /** Kata benda untuk teks bantu, mis. "job level" → "+ Add new job level". */
  noun: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const unique = Array.from(new Map(options.map((option) => [norm(option), option.trim()])).values()).sort((a, b) =>
    a.localeCompare(b),
  );
  const shown = unique.filter((option) => norm(option).includes(norm(query)));
  const existing = (text: string) => unique.find((option) => norm(option) === norm(text));

  const close = () => {
    setOpen(false);
    setQuery('');
    setAdding(false);
    setDraft('');
  };
  const pick = (next: string) => {
    onChange(next);
    close();
  };
  const add = () => {
    const text = draft.trim().replace(/\s+/g, ' ');
    if (!text) return;
    pick(existing(text) ?? text);
  };

  return (
    <Popover modal open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <button id={id} type="button" disabled={disabled} className={cn(TRIGGER, value ? 'text-fg-2' : 'text-fg-4')}>
          <span className="min-w-0 flex-1 truncate">{value || placeholder || `Select ${noun}`}</span>
          <ChevronDown className="size-4 shrink-0 text-fg-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="flex w-[var(--radix-popover-trigger-width)] min-w-[240px] flex-col gap-1 p-2">
        {adding ? (
          <div className="flex flex-col gap-2 p-1">
            <div className="relative">
              <Plus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-4" />
              <input
                autoFocus
                value={draft}
                maxLength={100}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    add();
                  }
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setAdding(false);
                  }
                }}
                placeholder={`New ${noun} name`}
                className={FIELD}
              />
            </div>
            {draft.trim() && existing(draft) && (
              <span className="px-1 font-body text-xs font-medium text-warning-800">
                “{existing(draft)}” already exists — it will be used instead.
              </span>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md px-2.5 py-1.5 font-body text-xs font-bold text-fg-3 hover:bg-mist"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={add}
                className="rounded-md bg-secondary-500 px-3 py-1.5 font-body text-xs font-bold text-white hover:bg-secondary-600 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative p-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-4" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className={FIELD}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft(query);
                setAdding(true);
              }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-left font-body text-[13px] font-semibold text-secondary-600 transition-colors hover:bg-mist"
            >
              <Plus className="size-3.5" />
              Add new {noun}
              {query.trim() && !existing(query) ? ` “${query.trim()}”` : ''}
            </button>
            <div role="listbox" aria-label={noun} className="flex max-h-60 flex-col overflow-y-auto">
              {shown.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={norm(option) === norm(value)}
                  onClick={() => pick(option)}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left font-body text-[13px] font-medium text-fg-1 transition-colors hover:bg-mist hover:text-secondary-700"
                >
                  <span className="flex-1">{option}</span>
                  {norm(option) === norm(value) && <Check className="size-4 text-secondary-500" />}
                </button>
              ))}
              {shown.length === 0 && (
                <span className="px-2.5 py-2 font-body text-xs font-medium text-fg-4">
                  No {noun} matches “{query.trim()}”.
                </span>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
