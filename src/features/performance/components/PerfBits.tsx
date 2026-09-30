import { EmptyState } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERF_ACTORS } from '@/features/performance/mock-data';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import { PHASE_LABEL, ROLE_LABEL, type PeriodPhase } from '@/features/performance/types';

/** Peran dari token disimulasikan lewat pemilih — dibagi ke seluruh layar Performance. */
export function PerfActorPicker({ onChange }: { onChange?: () => void }) {
  const { actor, setActor } = usePerfActor();
  return (
    <Select
      value={actor.employeeId}
      onValueChange={(value) => {
        const next = PERF_ACTORS.find((row) => row.employeeId === value);
        if (next) {
          setActor(next);
          onChange?.();
        }
      }}
    >
      <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERF_ACTORS.map((row) => (
          <SelectItem key={row.employeeId} value={row.employeeId}>
            {row.name} — {ROLE_LABEL[row.role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const PHASE_TONE: Record<PeriodPhase, 'ok' | 'warn' | 'mute'> = {
  FILLING: 'ok',
  SIGNING: 'warn',
  CLOSED: 'mute',
};

/** Tiga fase, tiga warna — tidak ada dua fase yang berbagi warna (FSD §1.1). */
export function PhaseBadge({ phase }: { phase: PeriodPhase }) {
  return <StatusBadge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</StatusBadge>;
}

/** Peran tanpa hak atas layar ini — menu tetap dirender kosong, bukan error. */
export function NoAccess({ description }: { description: string }) {
  return <EmptyState title="Tidak tersedia untuk peran Anda" description={description} />;
}
