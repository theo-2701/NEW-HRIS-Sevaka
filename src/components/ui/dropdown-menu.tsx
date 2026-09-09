import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Dropdown menu (Radix). Dipakai untuk "Action ▾" pada baris tabel
 * (lihat `@/components/RowActions`) dan menu profil di topnav.
 * Item menu BOLEH memakai ikon di kiri — itu menu, bukan tombol.
 */
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSeparatorPrimitive = DropdownMenuPrimitive.Separator;

function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-[2600] min-w-[180px] overflow-hidden rounded-lg border border-border-1 bg-bg-surface p-1.5 shadow-overlay',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  danger,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { danger?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 font-body text-[13px] font-medium text-fg-1 outline-none',
        'focus:bg-mist focus:text-secondary-700 data-[disabled]:pointer-events-none data-[disabled]:text-fg-4',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-3',
        danger && 'text-error-700 focus:bg-error-50 focus:text-error-800 [&_svg]:text-error-700',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2.5 pb-1.5 pt-2 t-label text-fg-4', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuSeparatorPrimitive className={cn('my-1 h-px bg-border-1', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
