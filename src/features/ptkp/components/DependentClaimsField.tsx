import { useField } from 'formik';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Relative } from '@/features/profile/types';

/** `dependent_claims` maksimal 3 item (UIC-EMPLOYEE §8.1). */
export const MAX_DEPENDENT_CLAIMS = 3;

/**
 * Pemilih tanggungan yang diklaim menyertai kode PTKP. Kandidatnya dibaca dari
 * `mst_relative` karyawan subjek di Employee Profile — bukan diketik.
 */
export function DependentClaimsField({ relatives }: { relatives: Relative[] }) {
  const [field, meta, helpers] = useField<string[]>('dependentClaims');
  const picked = field.value ?? [];

  const toggle = (id: string) =>
    void helpers.setValue(picked.includes(id) ? picked.filter((item) => item !== id) : [...picked, id]);

  return (
    <div className="flex flex-col gap-2">
      <Label>Tanggungan yang diklaim</Label>
      {relatives.length === 0 ? (
        <span className="font-body text-xs font-medium text-fg-3">
          Karyawan ini belum punya data keluarga di Employee Profile — tidak ada tanggungan yang bisa diklaim.
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          {relatives.map((row) => {
            const checked = picked.includes(row.id);
            return (
              <label key={row.id} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={checked}
                  disabled={!checked && picked.length >= MAX_DEPENDENT_CLAIMS}
                  onCheckedChange={() => toggle(row.id)}
                />
                <span className="font-body text-[13px] font-medium text-fg-2">
                  {row.name} · {row.relationshipType}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <span className={meta.error ? 'font-body text-[11px] font-medium text-error-600' : 'font-body text-[11px] font-medium text-fg-3'}>
        {meta.error ?? `Opsional — maksimal ${MAX_DEPENDENT_CLAIMS} tanggungan.`}
      </span>
    </div>
  );
}
