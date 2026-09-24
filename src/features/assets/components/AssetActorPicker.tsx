import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSET_VIEWERS } from '@/features/assets/mock-data';
import { useAssetActor } from '@/features/assets/store/assetActor.store';

/** Pemilih identitas untuk mencoba matriks peran §7.0 — HR Manager hanya lihat. */
export function AssetActorPicker() {
  const { actor, setActor } = useAssetActor();
  return (
    <Select
      value={actor.employeeId}
      onValueChange={(value) => {
        const next = ASSET_VIEWERS.find((row) => row.employeeId === value);
        if (next) setActor(next);
      }}
    >
      <SelectTrigger className="h-10 w-[300px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSET_VIEWERS.map((viewer) => (
          <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
            {viewer.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
