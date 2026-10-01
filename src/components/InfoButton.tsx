import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Ikon info telanjang (tanpa kontainer) yang membuka penjelasan — pengganti kartu/tombol "referensi"
 * yang memakan tempat. Hover menampilkan label pendek; klik membuka modal penjelasan milik halaman.
 * Area klik 36px supaya sejajar dengan kontrol toolbar, latar transparan, tint Mist saat hover.
 */
export function InfoButton({
  label,
  onClick,
  className,
}: {
  /** Teks tooltip sekaligus nama aksesibel, mis. "Status reference". */
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-transparent text-fg-3 transition-colors duration-200 ease-standard hover:bg-mist hover:text-secondary-700 [&_svg]:size-[18px]',
              className,
            )}
          >
            <Info />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-[2600] rounded-md bg-fg-1 px-2.5 py-1.5 font-body text-[11.5px] font-semibold text-white shadow-overlay"
          >
            {label}
            <Tooltip.Arrow className="fill-fg-1" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
