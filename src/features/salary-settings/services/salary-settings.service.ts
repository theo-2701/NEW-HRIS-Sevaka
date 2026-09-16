import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { employeeName } from '@/features/salary-processing/mock-data';
import { ESCALATION_APPROVER_ID } from '@/features/salary-settings/mock-data';
import { resetSalaryStore, salaryStore } from '@/features/salary-settings/salary-store';
import {
  COMPONENT_CODE_PATTERN,
  buildImpactSummary,
  checkUmp,
  isMaker,
  needsEscalation,
  nextPeriodStart,
  parseAmount,
  regionalWageOf,
  salaryBaseAfter,
  traitsDiffer,
  withCurrentFlag,
} from '@/features/salary-settings/rules';
import type { ChangeBatch, IndividualProposal, SalaryComponent } from '@/features/payroll-authorization/types';
import type {
  Actor,
  BatchItemInput,
  ComponentDraft,
  ComponentFilter,
  EmployeeValueRow,
  TraitProposalInput,
  UmpAttestation,
  UmpFilter,
  ValueProposalInput,
} from '@/features/salary-settings/types';

/**
 * API service Setelan Gaji (UIC-001-PAYROLL §4).
 *
 * Endpoint kontrak: `#1`–`#6` katalog komponen · `#9`/`#10` nilai per karyawan ·
 * `#15`–`#18`/`#20`/`#23` siklus kumpulan massal · `#24` jejak pemeriksaan UMP.
 * Keputusan atas usulan ada di menu Authorization & Handover (`#7`/`#8`/`#12`/`#13`/`#21`/`#22`).
 */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

let sequence = 0;

/** Id dummy yang dijamin belum dipakai baris seed. */
function nextId(prefix: string): string {
  const taken = new Set<string>([
    ...salaryStore.batches.map((row) => row.id),
    ...salaryStore.proposals.map((row) => row.id),
    ...salaryStore.attestations.map((row) => row.id),
  ]);
  let candidate = '';
  do {
    candidate = `${prefix}-${String((sequence += 1)).padStart(4, '0')}`;
  } while (taken.has(candidate));
  return candidate;
}

export function resetSalarySettingsMocks() {
  resetSalaryStore();
  sequence = 0;
}

function requireMaker(actor: Actor, action: string) {
  if (!isMaker(actor)) throw new Error(`403 — ${action} hanya untuk Payroll Officer (Penjalan).`);
}

function findComponent(id: string): SalaryComponent {
  const row = salaryStore.components.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — komponen gaji tidak ditemukan.');
  return row;
}

function findBatch(id: string): ChangeBatch {
  const row = salaryStore.batches.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — kumpulan perubahan tidak ditemukan.');
  return row;
}

/** Baris jejak UMP lahir sebagai efek samping pengajuan, bukan lewat endpoint tulis sendiri. */
function writeAttestation(row: Omit<UmpAttestation, 'id'>): UmpAttestation {
  const saved: UmpAttestation = { ...row, id: nextId('ATT') };
  salaryStore.attestations.push(saved);
  return saved;
}

export const salarySettingsService = {
  /** `#2` — grid katalog komponen. */
  async components(filter: ComponentFilter = {}): Promise<SalaryComponent[]> {
    if (MOCK) {
      await delay();
      const query = filter.search?.trim().toLowerCase();
      return salaryStore.components
        .filter((row) => {
          if (filter.proposalStates?.length && !filter.proposalStates.includes(row.proposalState)) return false;
          if (query && !`${row.componentCode} ${row.name}`.toLowerCase().includes(query)) return false;
          return true;
        })
        .sort((a, b) => a.componentCode.localeCompare(b.componentCode))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: SalaryComponent[] }>('/payroll/salary-components/search', filter);
    return data.data;
  },

  /** `#1` — buat komponen; baris baru selalu terbit AKTIF. */
  async createComponent(actor: Actor, draft: ComponentDraft): Promise<SalaryComponent> {
    if (MOCK) {
      await delay(260);
      requireMaker(actor, 'Membuat komponen gaji');
      const code = draft.componentCode.trim().toUpperCase();
      if (!COMPONENT_CODE_PATTERN.test(code)) {
        throw new Error('422 VALIDATION_ERROR — kode komponen harus huruf kapital, angka, atau garis bawah (3–50 karakter).');
      }
      if (salaryStore.components.some((row) => row.componentCode === code)) {
        throw new Error(`422 VALIDATION_ERROR — kode ${code} sudah dipakai komponen lain.`);
      }
      if (!draft.componentName.trim()) throw new Error('422 VALIDATION_ERROR — nama komponen wajib diisi.');
      const row: SalaryComponent = {
        id: code,
        componentCode: code,
        name: draft.componentName.trim(),
        isFixed: draft.isFixed,
        // Tidak dikirim berarti mengikuti sifat tetap.
        isOvertimeBasis: draft.isOvertimeBasis ?? draft.isFixed,
        isTaxable: draft.isTaxable,
        isBpjsDeductible: draft.isBpjsDeductible,
        proposalState: 'AKTIF',
        proposedIsOvertimeBasis: null,
        proposedEffectiveFrom: null,
        proposedBy: null,
        proposedAt: null,
        approvedBy: null,
        approvedAt: null,
        usedByEmployees: 0,
      };
      salaryStore.components.push(row);
      return { ...row };
    }
    const { data } = await api.post<SalaryComponent>('/payroll/salary-components', {
      component_code: draft.componentCode,
      component_name: draft.componentName,
      is_fixed: draft.isFixed,
      is_overtime_basis: draft.isOvertimeBasis ?? undefined,
      is_taxable: draft.isTaxable,
      is_bpjs_deductible: draft.isBpjsDeductible,
    });
    return data;
  },

  /** `#4` — satu-satunya field yang boleh diubah langsung adalah nama. */
  async renameComponent(actor: Actor, id: string, componentName: string): Promise<SalaryComponent> {
    if (MOCK) {
      await delay(220);
      requireMaker(actor, 'Mengubah nama komponen');
      if (!componentName.trim()) throw new Error('422 VALIDATION_ERROR — nama komponen wajib diisi.');
      const row = findComponent(id);
      row.name = componentName.trim();
      return { ...row };
    }
    const { data } = await api.patch<SalaryComponent>(`/payroll/salary-components/${id}`, {
      component_name: componentName,
    });
    return data;
  },

  /** `#5` — soft-delete bersyarat; komponen yang sudah dipakai ditolak. */
  async deleteComponent(actor: Actor, id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(240);
      requireMaker(actor, 'Menghapus komponen gaji');
      const row = findComponent(id);
      const referenced =
        salaryStore.values.some((value) => value.salaryComponentId === row.componentCode) ||
        salaryStore.proposals.some((proposal) => proposal.salaryComponentId === row.componentCode);
      if (referenced) {
        throw new Error('422 PAY_COMPONENT_IN_USE — komponen ini sudah dipakai nilai gaji karyawan.');
      }
      salaryStore.components = salaryStore.components.filter((item) => item.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/payroll/salary-components/${id}`);
    return data;
  },

  /**
   * `#6` — ajukan usulan sifat. Minimal satu sifat wajib berbeda, dan tanggal berlakunya dihitung
   * sistem. Sifat aktif tidak berubah sampai Pemeriksa memutuskan.
   */
  async proposeTraitChange(actor: Actor, id: string, input: TraitProposalInput): Promise<SalaryComponent> {
    if (MOCK) {
      await delay(280);
      requireMaker(actor, 'Mengajukan usulan sifat komponen');
      const row = findComponent(id);
      if (row.proposalState === 'MENUNGGU_PERSETUJUAN') {
        throw new Error('422 VALIDATION_ERROR — komponen ini sudah punya usulan yang menunggu keputusan.');
      }
      if (!traitsDiffer(row, input)) {
        throw new Error('422 VALIDATION_ERROR — minimal satu sifat harus berbeda dari sifat yang berlaku.');
      }
      row.proposalState = 'MENUNGGU_PERSETUJUAN';
      row.proposedIsOvertimeBasis = input.isOvertimeBasis;
      row.proposedEffectiveFrom = nextPeriodStart();
      row.proposedBy = actor.employeeId;
      row.proposedAt = now();
      row.approvedBy = null;
      row.approvedAt = null;
      return { ...row };
    }
    const { data } = await api.post<SalaryComponent>(`/payroll/salary-components/${id}/propose-trait-change`, {
      proposed_is_overtime_basis: input.isOvertimeBasis,
    });
    return data;
  },

  /** `#9` — nilai berlaku + riwayatnya untuk satu karyawan, termasuk usulan yang menunggu. */
  async employeeValues(employeeId: string): Promise<EmployeeValueRow[]> {
    if (MOCK) {
      await delay();
      const approved = salaryStore.values.filter((row) => row.employeeId === employeeId);
      const pending = salaryStore.proposals
        .filter((row) => row.employeeId === employeeId && row.approvalState === 'MENUNGGU_PERSETUJUAN')
        .map((row) => ({
          id: row.id,
          employeeId: row.employeeId,
          salaryComponentId: row.salaryComponentId,
          amount: row.amount,
          effectiveFrom: row.effectiveFrom,
          effectiveUntil: null,
          approvalState: row.approvalState,
          sourceChannel: row.sourceChannel,
        }));
      return withCurrentFlag([...approved, ...pending]);
    }
    const { data } = await api.get<EmployeeValueRow[]>(`/payroll/employees/${employeeId}/salary-components`);
    return data;
  },

  /**
   * `#10` — ajukan perubahan nilai. Satu usulan menunggu per (karyawan, komponen). Bila gaji dasar
   * setelah perubahan jatuh di bawah UMP cabang, alasan pemeriksaan UMP wajib dijawab lebih dulu
   * dan jawabannya ditulis ke jejak.
   */
  async proposeValueChange(actor: Actor, input: ValueProposalInput): Promise<IndividualProposal> {
    if (MOCK) {
      await delay(300);
      requireMaker(actor, 'Mengajukan perubahan nilai gaji');
      if (!input.employeeId) throw new Error('422 VALIDATION_ERROR — karyawan wajib dipilih.');
      const component = salaryStore.components.find((row) => row.componentCode === input.salaryComponentId);
      if (!component) throw new Error('422 VALIDATION_ERROR — komponen gaji tidak dikenal.');
      const amount = parseAmount(input.amount);
      if (amount === null) throw new Error('422 VALIDATION_ERROR — nominal wajib berupa angka.');
      const stacked = salaryStore.proposals.some(
        (row) =>
          row.employeeId === input.employeeId &&
          row.salaryComponentId === input.salaryComponentId &&
          row.approvalState === 'MENUNGGU_PERSETUJUAN',
      );
      if (stacked) {
        throw new Error('422 VALIDATION_ERROR — sudah ada usulan menunggu keputusan untuk karyawan dan komponen ini.');
      }

      const base = salaryBaseAfter(
        salaryStore.values,
        salaryStore.components,
        input.employeeId,
        input.salaryComponentId,
        amount,
      );
      const check = checkUmp(regionalWageOf(input.employeeId), base);
      if (check.isBelowUmp) {
        if (!input.umpReason) {
          throw new Error('422 — gaji dasar setelah perubahan di bawah UMP cabang; alasan pemeriksaan UMP wajib dipilih.');
        }
        if (input.umpReason === 'LAINNYA' && !input.umpNote.trim()) {
          throw new Error('422 — alasan "Lainnya" wajib disertai catatan.');
        }
      }

      const current = salaryStore.values.find(
        (row) =>
          row.employeeId === input.employeeId &&
          row.salaryComponentId === input.salaryComponentId &&
          row.effectiveUntil === null,
      );
      const row: IndividualProposal = {
        id: nextId('PRP'),
        employeeId: input.employeeId,
        salaryComponentId: input.salaryComponentId,
        amount,
        effectiveFrom: nextPeriodStart(),
        sourceChannel: 'CHANGE',
        approvalState: 'MENUNGGU_PERSETUJUAN',
        createdBy: actor.employeeId,
        createdAt: now(),
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        previousAmount: current?.amount ?? null,
      };
      salaryStore.proposals.push(row);

      if (check.isBelowUmp) {
        writeAttestation({
          employeeId: input.employeeId,
          checkPoint: 'PENETAPAN_ATAU_PERUBAHAN',
          regionalWageCompared: check.regionalWage,
          salaryBaseCompared: check.salaryBase,
          isBelowUmp: true,
          selectedReason: input.umpReason || null,
          reasonNote: input.umpNote.trim() || null,
          periodId: null,
          createdBy: actor.employeeId,
          createdAt: now(),
        });
      }
      return { ...row };
    }
    const { data } = await api.post<IndividualProposal>(
      `/payroll/employees/${input.employeeId}/salary-components/propose-change`,
      { salary_component_id: input.salaryComponentId, amount: input.amount },
    );
    return data;
  },

  /** `#20` — grid kumpulan, termasuk yang masih DRAFT (sisi penyusun). */
  async batches(): Promise<ChangeBatch[]> {
    if (MOCK) {
      await delay();
      return salaryStore.batches
        .map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) }))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.id.localeCompare(b.id));
    }
    const { data } = await api.post<{ data: ChangeBatch[] }>('/payroll/salary-change-batches/search', {});
    return data.data;
  },

  /** `#15` — buat kumpulan baru; lahir DRAFT tanpa ringkasan dampak. */
  async createBatch(actor: Actor, batchName: string): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(240);
      requireMaker(actor, 'Membuat kumpulan perubahan gaji');
      if (!batchName.trim()) throw new Error('422 VALIDATION_ERROR — nama kumpulan wajib diisi.');
      const row: ChangeBatch = {
        id: nextId('BATCH'),
        batchName: batchName.trim(),
        status: 'DRAFT',
        requiresEscalation: false,
        escalationApproverId: null,
        impactSummary: null,
        createdBy: actor.employeeId,
        createdAt: now(),
        decidedBy: null,
        decidedAt: null,
        rejectionReason: null,
        items: [],
      };
      salaryStore.batches.push(row);
      return { ...row, items: [] };
    }
    const { data } = await api.post<ChangeBatch>('/payroll/salary-change-batches', { batch_name: batchName });
    return data;
  },

  /** `#16` — tambah anggota; hanya selagi DRAFT. */
  async addBatchItem(actor: Actor, id: string, item: BatchItemInput): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(240);
      requireMaker(actor, 'Menambah anggota kumpulan');
      const batch = findBatch(id);
      if (batch.status !== 'DRAFT') throw new Error('422 VALIDATION_ERROR — anggota hanya bisa diubah selagi DRAFT.');
      if (!item.employeeId) throw new Error('422 VALIDATION_ERROR — karyawan wajib dipilih.');
      const amount = parseAmount(item.amount);
      if (amount === null) throw new Error('422 VALIDATION_ERROR — nominal wajib berupa angka.');
      if (batch.items.some((row) => row.employeeId === item.employeeId && row.salaryComponentId === item.salaryComponentId)) {
        throw new Error('422 VALIDATION_ERROR — karyawan ini sudah ada di kumpulan untuk komponen yang sama.');
      }
      batch.items.push({ employeeId: item.employeeId, salaryComponentId: item.salaryComponentId, amountDelta: amount });
      return { ...batch, items: batch.items.map((row) => ({ ...row })) };
    }
    const { data } = await api.post<ChangeBatch>(`/payroll/salary-change-batches/${id}/items`, [item]);
    return data;
  },

  /** `#17` — hapus anggota; selagi DRAFT boleh dihapus permanen. */
  async removeBatchItem(actor: Actor, id: string, employeeId: string, componentId: string): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(200);
      requireMaker(actor, 'Menghapus anggota kumpulan');
      const batch = findBatch(id);
      if (batch.status !== 'DRAFT') throw new Error('422 VALIDATION_ERROR — anggota hanya bisa diubah selagi DRAFT.');
      batch.items = batch.items.filter(
        (row) => !(row.employeeId === employeeId && row.salaryComponentId === componentId),
      );
      return { ...batch, items: batch.items.map((row) => ({ ...row })) };
    }
    const { data } = await api.delete<ChangeBatch>(
      `/payroll/salary-change-batches/${id}/items/${employeeId}-${componentId}`,
    );
    return data;
  },

  /**
   * `#18` — kunci dan ajukan. Ringkasan dampak dibekukan sekali, dan kebutuhan eskalasi dihitung
   * dari jumlah anggota terhadap ambangnya — bukan dipilih pengaju.
   */
  async submitBatch(actor: Actor, id: string): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(320);
      requireMaker(actor, 'Mengajukan kumpulan perubahan gaji');
      const batch = findBatch(id);
      if (batch.status !== 'DRAFT') throw new Error(`422 VALIDATION_ERROR — kumpulan ini sudah ${batch.status}.`);
      if (!batch.items.length) throw new Error('422 VALIDATION_ERROR — kumpulan tanpa anggota tidak bisa diajukan.');
      batch.impactSummary = buildImpactSummary(batch, salaryStore.values, salaryStore.components, employeeName);
      batch.requiresEscalation = needsEscalation(new Set(batch.items.map((item) => item.employeeId)).size);
      batch.escalationApproverId = batch.requiresEscalation ? ESCALATION_APPROVER_ID : null;
      batch.status = 'MENUNGGU_PERSETUJUAN';
      return { ...batch, items: batch.items.map((row) => ({ ...row })) };
    }
    const { data } = await api.post<ChangeBatch>(`/payroll/salary-change-batches/${id}/submit`, {});
    return data;
  },

  /** `#23` — batalkan kumpulan; hanya selagi DRAFT. */
  async deleteBatch(actor: Actor, id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(220);
      requireMaker(actor, 'Membatalkan kumpulan perubahan gaji');
      const batch = findBatch(id);
      if (batch.status !== 'DRAFT') throw new Error('422 VALIDATION_ERROR — hanya kumpulan DRAFT yang bisa dibatalkan.');
      salaryStore.batches = salaryStore.batches.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/payroll/salary-change-batches/${id}`);
    return data;
  },

  /** `#24` — jejak pemeriksaan UMP; baca saja. */
  async umpAttestations(filter: UmpFilter = {}): Promise<UmpAttestation[]> {
    if (MOCK) {
      await delay();
      return salaryStore.attestations
        .filter((row) => {
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          if (filter.checkPoint && row.checkPoint !== filter.checkPoint) return false;
          if (filter.belowOnly && !row.isBelowUmp) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: UmpAttestation[] }>('/payroll/ump-attestations/search', filter);
    return data.data;
  },
};
