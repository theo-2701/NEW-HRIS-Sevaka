import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useClearModuleGroupStructMap,
  useModuleGroupStructMaps,
  useSaveModuleGroupStructMap,
} from '@/features/company/hooks/useCompany';
import { isCompanyAdmin } from '@/features/company/rules';
import { MODULE_CODES, MODULE_CODE_LABEL } from '@/features/company/types';
import type { CompanyActor, GroupStruct, ModuleCode } from '@/features/company/types';

const NONE = '__kosong__';

/**
 * GS-11 — Pemetaan Modul → Struktur (UIC §2.3.1, baru `0.13`). Enam baris TETAP, nol tombol
 * tambah/hapus baris; baris kosong tetap terlihat karena justru itu yang memblokir struktur
 * kedua saat perusahaan berstruktur jamak (`TSD-001-WORKFLOW` §1, resolusi approver gagal-tertutup).
 */
export function ModuleMappingCard({ structs, actor }: { structs: GroupStruct[]; actor: CompanyActor }) {
  const maps = useModuleGroupStructMaps(actor);
  const save = useSaveModuleGroupStructMap();
  const clear = useClearModuleGroupStructMap();
  const canWrite = isCompanyAdmin(actor.role);

  const rows = maps.data ?? [];
  const structName = (id: string) => structs.find((row) => row.id === id)?.name ?? '—';

  return (
    <Card>
      <CardHead
        title="Pemetaan Modul → Struktur"
        sub="Menjawab struktur mana yang memerintah sebuah modul — hanya jadi pemutus saat perusahaan punya lebih dari satu struktur aktif; baris kosong tetap sah bila struktur tunggal"
      />
      <DataTable<{ moduleCode: ModuleCode }>
        rows={MODULE_CODES.map((moduleCode) => ({ moduleCode }))}
        rowKey={(row) => row.moduleCode}
        loading={maps.isLoading}
        empty={maps.error ? String(maps.error.message) : undefined}
        columns={[
          { key: 'module', header: 'Modul', strong: true, render: (row) => MODULE_CODE_LABEL[row.moduleCode] },
          {
            key: 'struct',
            header: 'Struktur yang berlaku',
            render: (row) => {
              const mapped = rows.find((item) => item.moduleCode === row.moduleCode);
              if (!canWrite) return mapped ? structName(mapped.groupStructId) : <span className="text-fg-4">Belum dipetakan</span>;
              return (
                <Select
                  value={mapped?.groupStructId ?? NONE}
                  onValueChange={(value) => {
                    if (value === NONE) {
                      clear.mutate({ actor, moduleCode: row.moduleCode });
                    } else {
                      save.mutate({ actor, moduleCode: row.moduleCode, groupStructId: value });
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-[240px]" aria-label={`Struktur untuk ${row.moduleCode}`}>
                    <SelectValue placeholder="Belum dipetakan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Belum dipetakan</SelectItem>
                    {structs.map((struct) => (
                      <SelectItem key={struct.id} value={struct.id}>
                        {struct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            },
          },
        ]}
      />
      {!canWrite && (
        <p className="mt-2 font-body text-xs font-medium text-fg-4">
          Hanya Super Admin/System Admin yang boleh mengubah pemetaan ini — Anda melihatnya baca-saja.
        </p>
      )}
    </Card>
  );
}
