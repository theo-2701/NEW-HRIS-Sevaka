import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

/**
 * Label field — standar design system: **16px / 700 / Slate**, jarak ke kotak
 * input 4px (diatur `FormField`). Tanda wajib memakai `<em>` (Rose).
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'select-none font-body text-base font-bold leading-[1.2] text-fg-2',
        '[&>em]:ml-0.5 [&>em]:not-italic [&>em]:text-error-500',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
