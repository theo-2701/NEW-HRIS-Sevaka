import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Checkbox — port `.checkbox__box`: 18px, radius 4px, rim Silver, isi Ocean saat checked. */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-[18px] shrink-0 rounded-sm bg-white shadow-[inset_0_0_0_1.5px_var(--color-silver)] outline-none transition-[background,box-shadow] duration-200 ease-standard',
        'data-[state=checked]:bg-secondary-500 data-[state=checked]:text-white data-[state=checked]:shadow-none',
        'data-[state=indeterminate]:bg-secondary-500 data-[state=indeterminate]:text-white data-[state=indeterminate]:shadow-none',
        'focus-visible:ring-4 focus-visible:ring-secondary-500/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
