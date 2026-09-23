import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import type { EssActor } from '@/features/ess-time/types';

/** Pemilih identitas ESS — pola sama dengan modul lain supaya cakupan milik-sendiri bisa dicoba. */
export function EssActorPicker({ actor, onChange }: { actor: EssActor; onChange: (next: EssActor) => void }) {
  return (
    <Select
      value={actor.employeeId}
      onValueChange={(value) => {
        const next = ESS_VIEWERS.find((row) => row.employeeId === value);
        if (next) onChange(next);
      }}
    >
      <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ESS_VIEWERS.map((viewer) => (
          <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
            {viewer.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
