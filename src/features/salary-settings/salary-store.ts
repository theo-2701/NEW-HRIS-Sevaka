import { BATCH_SEED, COMPONENT_SEED, PROPOSAL_SEED } from '@/features/payroll-authorization/mock-data';
import type { ChangeBatch, IndividualProposal, SalaryComponent } from '@/features/payroll-authorization/types';
import { ATTESTATION_SEED, VALUE_SEED } from '@/features/salary-settings/mock-data';
import type { EmployeeValue, UmpAttestation } from '@/features/salary-settings/types';

/**
 * Satu sumber dummy untuk katalog komponen, nilai per karyawan, usulan, kumpulan massal, dan
 * jejak pemeriksaan UMP.
 *
 * Modul daun (hanya mengimpor seed dan tipe): Setelan Gaji menulis usulan di sini, dan menu
 * Otorisasi & Penyerahan membaca antrean yang sama — jadi maker dan checker melihat baris yang
 * sama tanpa impor melingkar antar service.
 */

export interface SalaryStore {
  components: SalaryComponent[];
  values: EmployeeValue[];
  proposals: IndividualProposal[];
  batches: ChangeBatch[];
  attestations: UmpAttestation[];
}

const clone = <T,>(rows: T[]): T[] => rows.map((row) => ({ ...row }));

export const salaryStore: SalaryStore = {
  components: [],
  values: [],
  proposals: [],
  batches: [],
  attestations: [],
};

export function resetSalaryStore() {
  salaryStore.components = clone(COMPONENT_SEED);
  salaryStore.values = clone(VALUE_SEED);
  salaryStore.proposals = clone(PROPOSAL_SEED);
  salaryStore.batches = BATCH_SEED.map((row) => ({ ...row, items: clone(row.items) }));
  salaryStore.attestations = clone(ATTESTATION_SEED);
}
resetSalaryStore();
