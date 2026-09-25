import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CLASS_LABEL, ORIGIN_LABEL, SCAN_LABEL, STORAGE_LABEL, VERSION_STATE_LABEL } from '@/features/documents/types';
import type {
  ConfidentialityClass,
  DocActor,
  Origin,
  ScanState,
  StorageTier,
  TemplateVersionState,
} from '@/features/documents/types';

/** Kelas efektif — dua warna, menentukan penampil isi berkas. */
export function ClassBadge({ value }: { value: ConfidentialityClass }) {
  return <StatusBadge tone={value === 'SENSITIF' ? 'err' : 'mute'}>{CLASS_LABEL[value]}</StatusBadge>;
}

/** `scan_state` — 4 nilai, tidak diratakan (G3). */
export function ScanBadge({ value }: { value: ScanState }) {
  const tone =
    value === 'BERSIH' ? 'ok' : value === 'KOTOR' ? 'err' : value === 'MENUNGGU_PEMERIKSAAN' ? 'warn' : 'mute';
  return <StatusBadge tone={tone}>{SCAN_LABEL[value]}</StatusBadge>;
}

export function StorageBadge({ value }: { value: StorageTier }) {
  return <StatusBadge tone={value === 'PANAS' ? 'info' : 'mute'}>{STORAGE_LABEL[value]}</StatusBadge>;
}

export function OriginBadge({ value }: { value: Origin }) {
  return <StatusBadge tone={value === 'DIUNGGAH' ? 'mute' : 'brand'}>{ORIGIN_LABEL[value]}</StatusBadge>;
}

export function VersionStateBadge({ value }: { value: TemplateVersionState }) {
  const tone = value === 'DISETUJUI' ? 'ok' : value === 'DITOLAK' ? 'err' : 'warn';
  return <StatusBadge tone={tone}>{VERSION_STATE_LABEL[value]}</StatusBadge>;
}

/** Pemilih identitas untuk mencoba matriks peran per layar (pengganti login sungguhan). */
export function ActorSelect({
  actors,
  value,
  onChange,
}: {
  actors: DocActor[];
  value: DocActor;
  onChange: (next: DocActor) => void;
}) {
  return (
    <Select
      value={`${value.employeeId}|${value.role}`}
      onValueChange={(key) => {
        const next = actors.find((row) => `${row.employeeId}|${row.role}` === key);
        if (next) onChange(next);
      }}
    >
      <SelectTrigger className="h-10 w-[300px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {actors.map((row) => (
          <SelectItem key={`${row.employeeId}|${row.role}`} value={`${row.employeeId}|${row.role}`}>
            {row.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
