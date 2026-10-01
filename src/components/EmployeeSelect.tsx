import { useEffect, useId, useState, type KeyboardEvent, type UIEvent } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  readRecentEmployeeIds,
  rememberEmployeeIds,
  type EmployeeOption,
  type EmployeeSource,
} from '@/lib/employeeSource';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const DEBOUNCE_MS = 250;
/** "Beberapa" saran per bagian sebelum mengetik. */
const SUGGEST_LIMIT = 3;
/** Chip yang tampil di pemicu multi-pilih; sisanya diringkas "+N". */
const MAX_CHIPS = 4;
/** Jarak (px) dari dasar daftar yang memicu muat halaman berikutnya. */
const LOAD_MORE_EDGE = 48;

/** Satu bahasa per layar — teks bawaan mengikuti bahasa layar pemakainya. */
const TEXT = {
  id: {
    placeholder: 'Pilih karyawan',
    search: 'Cari nama, NIK, atau unit',
    recent: 'Terakhir dipilih',
    sameUnit: 'Satu unit dengan Anda',
    all: 'Semua karyawan',
    loading: 'Memuat…',
    empty: 'Tidak ada karyawan yang cocok.',
    more: 'Tampilkan lebih banyak',
    clear: 'Hapus pilihan',
    picked: (count: number) => `${count} dipilih`,
    remove: (name: string) => `Hapus ${name}`,
    rest: (count: number) => `+${count} lainnya`,
  },
  en: {
    placeholder: 'Select employee',
    search: 'Search name, NIK, or unit',
    recent: 'Recently selected',
    sameUnit: 'In your unit',
    all: 'All employees',
    loading: 'Loading…',
    empty: 'No matching employees.',
    more: 'Show more',
    clear: 'Clear',
    picked: (count: number) => `${count} selected`,
    remove: (name: string) => `Remove ${name}`,
    rest: (count: number) => `+${count} more`,
  },
} as const;

/** Kotak field — bentuknya sama dengan `<SelectTrigger>` supaya sejajar dropdown biasa. */
const FIELD =
  'flex w-full items-center gap-2 rounded-md border border-silver bg-cloud font-body text-xs font-medium leading-[1.4] outline-none transition-[border-color,box-shadow] duration-200 ease-standard';
const FOCUS = 'focus-visible:border-secondary-500 focus-visible:shadow-[0_0_0_4px_rgba(2,132,199,.16)]';

interface BaseProps {
  source: EmployeeSource;
  placeholder?: string;
  /** Bahasa teks bawaan (pencarian, judul bagian, status). Default Indonesia. */
  lang?: keyof typeof TEXT;
  /** ID yang disembunyikan dari daftar, mis. diri sendiri atau pemegang aset saat ini. */
  exclude?: string[];
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-label'?: string;
  /** Dipanggil saat popover ditutup — dipakai Formik untuk menandai field "touched". */
  onBlur?: () => void;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  /** ID terpilih; `''`/`null` = belum ada. */
  value: string | null | undefined;
  /** `id = ''` & `option = null` saat pilihan dihapus. */
  onChange: (id: string, option: EmployeeOption | null) => void;
  /** Tampilkan "Hapus pilihan" — untuk filter/field opsional. */
  clearable?: boolean;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
}

export type EmployeeSelectProps = SingleProps | MultiProps;

interface OptionGroup {
  key: string;
  label: string;
  items: EmployeeOption[];
}

const detailOf = (option: EmployeeOption) => [option.nik, option.unit].filter(Boolean).join(' · ');

/**
 * Pemilih karyawan rumah — satu komponen untuk semua modul (UI-STANDARDS §7 "Pilih karyawan").
 *
 * - Daftar diambil **per halaman** dari `source` dan halaman berikutnya dimuat saat daftar
 *   digulir ke bawah, jadi tetap ringan walau karyawannya ribuan.
 * - Sebelum mengetik: "Terakhir dipilih" dan "Satu unit dengan Anda" di atas, lalu semua karyawan.
 * - Tiap baris: nama, lalu NIK · unit.
 * - `multiple`: centang di tiap baris, pilihan tampil sebagai chip yang bisa dihapus satu per satu.
 */
export function EmployeeSelect(props: EmployeeSelectProps) {
  const { source, lang = 'id', exclude, id, disabled, invalid, className, onBlur } = props;
  const t = TEXT[lang];
  const placeholder = props.placeholder ?? t.placeholder;
  const selectedIds = props.multiple ? props.value : props.value ? [props.value] : [];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  /** Baris yang dipilih di sesi ini — label pemicu langsung tampil tanpa menunggu resolve. */
  const [picked, setPicked] = useState<ReadonlyMap<string, EmployeeOption>>(new Map());
  const listId = useId();
  const userId = useAuthStore((state) => state.user?.id ?? 'guest');
  const scope = `${source.recentKey ?? source.key}:${userId}`;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const results = useInfiniteQuery({
    queryKey: ['employee-select', source.key, query],
    queryFn: ({ pageParam }) => source.search(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    enabled: open,
    staleTime: 0,
    // Hasil kata kunci sebelumnya tetap tampil selama kata kunci baru dimuat — tidak berkedip.
    placeholderData: keepPreviousData,
  });

  const suggestions = useQuery({
    queryKey: ['employee-select-suggest', source.key, recentIds.join(',')],
    queryFn: async () => {
      const [recent, unit] = await Promise.all([source.resolve(recentIds), source.sameUnit?.() ?? []]);
      return { recent, unit: unit.filter((row) => !recent.some((item) => item.id === row.id)) };
    },
    enabled: open && !query,
    staleTime: 0,
  });

  const resolved = useQuery({
    queryKey: ['employee-select-resolve', source.key, selectedIds.join(',')],
    queryFn: () => source.resolve(selectedIds),
    enabled: selectedIds.length > 0,
    placeholderData: keepPreviousData,
  });

  const visible = (rows: EmployeeOption[] = []) =>
    exclude?.length ? rows.filter((row) => !exclude.includes(row.id)) : rows;
  const resultRows = visible(results.data?.pages.flatMap((page) => page.items));
  const candidates: OptionGroup[] = query
    ? [{ key: 'result', label: '', items: resultRows }]
    : [
        { key: 'recent', label: t.recent, items: visible(suggestions.data?.recent).slice(0, SUGGEST_LIMIT) },
        { key: 'unit', label: t.sameUnit, items: visible(suggestions.data?.unit).slice(0, SUGGEST_LIMIT) },
        { key: 'all', label: t.all, items: resultRows },
      ];
  const groups = candidates.filter((group) => group.items.length > 0);
  // Satu bagian saja tidak perlu judul.
  const showHeaders = groups.length > 1;
  const flat = groups.flatMap((group) => group.items);
  const activeIndex = Math.min(active, flat.length - 1);
  const optionId = (index: number) => `${listId}-option-${index}`;

  const lookup = (employeeId: string) =>
    picked.get(employeeId) ?? resolved.data?.find((row) => row.id === employeeId);
  const nameOf = (employeeId: string) => lookup(employeeId)?.name ?? (resolved.isFetching ? '…' : employeeId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setRecentIds(readRecentEmployeeIds(scope));
      setActive(0);
      return;
    }
    setInput('');
    setQuery('');
    onBlur?.();
  };

  const choose = (option: EmployeeOption) => {
    setPicked((prev) => new Map(prev).set(option.id, option));
    if (props.multiple) {
      const has = props.value.includes(option.id);
      if (!has) rememberEmployeeIds(scope, [option.id]);
      props.onChange(has ? props.value.filter((item) => item !== option.id) : [...props.value, option.id]);
      return;
    }
    // Riwayat hanya ditulis, tidak dibaca ulang selama terbuka — daftar tidak melompat di bawah kursor.
    rememberEmployeeIds(scope, [option.id]);
    props.onChange(option.id, option);
    handleOpenChange(false);
  };

  const clear = () => (props.multiple ? props.onChange([]) : props.onChange('', null));
  const removeChip = (employeeId: string) => {
    if (props.multiple) props.onChange(props.value.filter((item) => item !== employeeId));
  };

  const loadMore = () => {
    if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
  };

  const onListScroll = (event: UIEvent<HTMLDivElement>) => {
    const box = event.currentTarget;
    if (box.scrollHeight - box.scrollTop - box.clientHeight < LOAD_MORE_EDGE) loadMore();
  };

  const moveTo = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' });
    if (index === flat.length - 1) loadMore();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && flat.length) {
      event.preventDefault();
      moveTo(Math.min(activeIndex + 1, flat.length - 1));
    } else if (event.key === 'ArrowUp' && flat.length) {
      event.preventDefault();
      moveTo(Math.max(activeIndex - 1, 0));
    } else if (event.key === 'Enter') {
      // Enter di kotak cari tidak boleh mengirim form induknya.
      event.preventDefault();
      if (flat[activeIndex]) choose(flat[activeIndex]);
    }
  };

  const status = results.isPending
    ? t.loading
    : results.isFetchingNextPage
      ? t.loading
      : flat.length === 0
        ? t.empty
        : null;
  const canClear = (props.multiple || props.clearable) && selectedIds.length > 0;
  let optionIndex = -1;

  const content = (
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0">
      <div className="border-b border-border-1 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-4" strokeWidth={1.75} />
          <Input
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={flat.length ? optionId(activeIndex) : undefined}
            aria-label={t.search}
            placeholder={t.search}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setActive(0);
            }}
            onKeyDown={onSearchKeyDown}
            className="pl-9"
          />
        </div>
      </div>

      <div onScroll={onListScroll} className="max-h-72 overflow-y-auto p-1.5">
        <div
          id={listId}
          role="listbox"
          aria-label={placeholder}
          aria-multiselectable={props.multiple || undefined}
          className="flex flex-col"
        >
          {groups.map((group) => (
            <div key={group.key} role="group" aria-labelledby={showHeaders ? `${listId}-${group.key}` : undefined}>
              {showHeaders && (
                <div
                  id={`${listId}-${group.key}`}
                  className="px-2.5 pb-1 pt-2 font-body text-[11px] font-bold uppercase tracking-[0.04em] text-fg-3"
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                optionIndex += 1;
                const index = optionIndex;
                const selected = selectedIds.includes(item.id);
                const detail = detailOf(item);
                return (
                  <div
                    key={`${group.key}-${item.id}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={selected}
                    // Fokus tetap di kotak cari supaya bisa lanjut mengetik / memakai panah.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => index !== activeIndex && setActive(index)}
                    onClick={() => choose(item)}
                    className={cn(
                      'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors duration-150 ease-standard',
                      index === activeIndex && 'bg-mist',
                    )}
                  >
                    {props.multiple && (
                      <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span
                        className={cn(
                          'truncate font-body text-[13px] font-bold',
                          index === activeIndex ? 'text-secondary-700' : 'text-fg-1',
                        )}
                      >
                        {item.name}
                      </span>
                      {detail && <span className="truncate font-body text-xs font-medium text-fg-3">{detail}</span>}
                    </span>
                    {!props.multiple && selected && <Check className="size-4 shrink-0 text-secondary-500" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {status ? (
          <p className="m-0 px-2.5 py-3 text-center font-body text-xs font-medium text-fg-3" role="status">
            {status}
          </p>
        ) : (
          results.hasNextPage && (
            <button
              type="button"
              onClick={loadMore}
              className="mt-1 w-full rounded-md px-2.5 py-2 font-body text-xs font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
            >
              {t.more}
            </button>
          )
        )}
      </div>

      {canClear && (
        <div className="flex items-center justify-between gap-2 border-t border-border-1 px-2.5 py-1.5">
          <span className="font-body text-xs font-medium text-fg-3">
            {props.multiple ? t.picked(selectedIds.length) : ''}
          </span>
          <button
            type="button"
            onClick={clear}
            className="rounded-md px-2 py-1 font-body text-xs font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
          >
            {t.clear}
          </button>
        </div>
      )}
    </PopoverContent>
  );

  if (!props.multiple) {
    const current = props.value ? lookup(props.value) : undefined;
    const label = props.value ? nameOf(props.value) : '';
    return (
      <Popover modal open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-invalid={invalid || undefined}
            aria-label={props['aria-label']}
            title={current ? [current.name, detailOf(current)].filter(Boolean).join(' · ') : undefined}
            className={cn(
              FIELD,
              FOCUS,
              'h-9 justify-between px-3 text-left',
              'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
              label ? 'text-fg-2' : 'text-fg-4',
              invalid && 'border-error-500',
              className,
            )}
          >
            <span className="min-w-0 flex-1 truncate">{label || placeholder}</span>
            <ChevronDown className="size-4 shrink-0 text-fg-3" />
          </button>
        </PopoverTrigger>
        {content}
      </Popover>
    );
  }

  const chips = props.value.slice(0, MAX_CHIPS);
  const rest = props.value.length - chips.length;
  return (
    <Popover modal open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            FIELD,
            'min-h-9 flex-wrap gap-1 py-[3px] pl-1 pr-3',
            'focus-within:border-secondary-500 focus-within:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
            disabled && 'cursor-not-allowed bg-vapor',
            invalid && 'border-error-500',
            className,
          )}
        >
          {chips.map((employeeId) => {
            const name = nameOf(employeeId);
            return (
              <span
                key={employeeId}
                className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-secondary-50 pl-2.5 pr-1 font-body text-xs font-bold text-secondary-700"
              >
                <span className="truncate">{name}</span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label={t.remove(name)}
                    onClick={() => removeChip(employeeId)}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-mist hover:text-error-600"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
          {rest > 0 && (
            <span className="inline-flex h-7 items-center rounded-full bg-mist px-2.5 font-body text-xs font-bold text-fg-2">
              {t.rest(rest)}
            </span>
          )}
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-invalid={invalid || undefined}
              aria-label={props['aria-label']}
              className="flex h-7 min-w-[96px] flex-1 items-center justify-between gap-2 pl-2 text-left text-fg-4 outline-none disabled:cursor-not-allowed"
            >
              <span className="min-w-0 truncate">{props.value.length ? '' : placeholder}</span>
              <ChevronDown className="size-4 shrink-0 text-fg-3" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      {content}
    </Popover>
  );
}
