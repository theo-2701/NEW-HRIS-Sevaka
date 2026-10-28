import { Avatar } from '@/components/Avatar';

/** Tumpukan avatar `.rc-stack` — dua wajah pertama, sisanya "+N"; nama lengkap di tooltip. */
export function AvatarStack({ names, max = 2 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="flex" title={names.join(', ')} aria-label={names.join(', ')}>
      {shown.map((name) => (
        <Avatar key={name} name={name} size="sm" className="-ml-2 ring-2 ring-white first:ml-0" />
      ))}
      {names.length > shown.length && (
        <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full bg-primary-200 font-body text-[11px] font-bold text-secondary-700 ring-2 ring-white">
          +{names.length - shown.length}
        </span>
      )}
    </span>
  );
}
