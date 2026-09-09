import { cn } from '@/lib/utils';

export interface RadioBranchOption<V extends string> {
  value: V;
  title: string;
  description?: string;
}

/**
 * Pilihan bercabang bergaya kartu — port `.radio-branch` / `.rb`.
 *
 * Dipakai saat setiap pilihan butuh penjelasan sendiri (mis. Resume vs Cancel
 * pada batch yang di-halt, atau cabang kewarganegaraan). Untuk pilihan pendek
 * tanpa penjelasan, pakai `<Segmented>`.
 */
export function RadioBranch<V extends string>({
  name,
  value,
  onChange,
  options,
  className,
}: {
  name: string;
  value: V;
  onChange: (value: V) => void;
  options: RadioBranchOption<V>[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label key={option.value} className="group flex cursor-pointer items-start gap-2.5">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2 bg-white transition-colors duration-200 ease-standard',
                active ? 'border-secondary-500' : 'border-silver group-hover:border-secondary-500',
                // Fokus keyboard tetap terlihat meski input-nya disembunyikan.
                'peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(2,132,199,.16)]',
              )}
            >
              {active && <span className="size-2 rounded-full bg-secondary-500" />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className={cn('font-body text-[13px] font-bold', active ? 'text-fg-1' : 'text-fg-2')}>
                {option.title}
              </span>
              {option.description && (
                <span className="font-body text-xs font-medium leading-[1.45] text-fg-3">{option.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
