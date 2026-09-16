import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { salaryProcessingService } from '@/features/salary-processing/services/salary-processing.service';
import {
  addPending,
  addReexport,
  listPending,
  listPickups,
  listReexports,
  pendingOf,
  resetHandoverStore,
} from '@/features/payroll-authorization/handover-store';
import { resetSalaryStore, salaryStore } from '@/features/salary-settings/salary-store';
import { canApproveBatch, isChecker, traitQueueOf } from '@/features/payroll-authorization/rules';
import type {
  Actor,
  ChangeBatch,
  HandoverPending,
  IndividualProposal,
  PickupLog,
  ReexportGateResult,
  ReexportLog,
  SalaryComponent,
} from '@/features/payroll-authorization/types';

/**
 * API service Otorisasi & Penyerahan (UIC-001-PAYROLL §3).
 *
 * Endpoint kontrak: `#7`/`#8` sifat komponen · `#11`/`#12`/`#13` usulan individual ·
 * `#19`/`#21`/`#22` kumpulan massal · `#46`/`#48`/`#49`/`#50` penyerahan.
 * Penguncian periode (`#27`–`#29`) memakai store periode milik Salary Processing.
 */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

export function resetPayrollAuthorizationMocks() {
  resetSalaryStore();
  resetHandoverStore();
}
resetPayrollAuthorizationMocks();

function requireChecker(actor: Actor, action: string) {
  if (!isChecker(actor)) throw new Error(`403 — ${action} hanya untuk HR Manager (Pemeriksa).`);
}

function findComponent(id: string): SalaryComponent {
  const row = salaryStore.components.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — komponen gaji tidak ditemukan.');
  return row;
}

function findProposal(id: string): IndividualProposal {
  const row = salaryStore.proposals.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — usulan tidak ditemukan.');
  return row;
}

function findBatch(id: string): ChangeBatch {
  const row = salaryStore.batches.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — kumpulan perubahan tidak ditemukan.');
  return row;
}

export const payrollAuthorizationService = {
  /** `#2` dengan filter klien `proposal_state=MENUNGGU_PERSETUJUAN` — antrean usulan sifat. */
  async traitQueue(): Promise<SalaryComponent[]> {
    if (MOCK) {
      await delay();
      return traitQueueOf(salaryStore.components).map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: SalaryComponent[] }>('/payroll/salary-components/search', {
      proposal_state: 'MENUNGGU_PERSETUJUAN',
    });
    return data.data;
  },

  /**
   * `#7` — menyetujui usulan sifat. Sifat aktif **belum** berubah di sini: promosi dijalankan
   * penjadwal harian tepat pada `proposedEffectiveFrom`.
   */
  async approveTrait(actor: Actor, id: string): Promise<SalaryComponent> {
    if (MOCK) {
      await delay(260);
      requireChecker(actor, 'Memutuskan usulan sifat komponen');
      const row = findComponent(id);
      if (row.proposalState !== 'MENUNGGU_PERSETUJUAN') {
        throw new Error('422 — tidak ada usulan sifat yang menunggu keputusan pada komponen ini.');
      }
      if (row.proposedBy === actor.employeeId) {
        throw new Error('403 PAY_MAKER_CHECKER_VIOLATION — pengaju usulan tidak boleh menyetujui usulannya sendiri.');
      }
      if (row.approvedBy) throw new Error('422 — usulan sifat ini sudah disetujui dan menunggu tanggal berlakunya.');
      row.approvedBy = actor.employeeId;
      row.approvedAt = now();
      return { ...row };
    }
    const { data } = await api.post<SalaryComponent>(`/payroll/salary-components/${id}/approve-trait-change`, {});
    return data;
  },

  /** `#8` — menolak usulan sifat; kontrak tidak menyediakan kolom alasan untuk jenis ini. */
  async rejectTrait(actor: Actor, id: string): Promise<SalaryComponent> {
    if (MOCK) {
      await delay(260);
      requireChecker(actor, 'Memutuskan usulan sifat komponen');
      const row = findComponent(id);
      if (row.proposalState !== 'MENUNGGU_PERSETUJUAN') {
        throw new Error('422 — tidak ada usulan sifat yang menunggu keputusan pada komponen ini.');
      }
      if (row.proposedBy === actor.employeeId) {
        throw new Error('403 PAY_MAKER_CHECKER_VIOLATION — pengaju usulan tidak boleh memutuskan usulannya sendiri.');
      }
      row.proposalState = 'AKTIF';
      row.proposedIsOvertimeBasis = null;
      row.proposedEffectiveFrom = null;
      row.proposedBy = null;
      row.proposedAt = null;
      row.approvedBy = null;
      row.approvedAt = null;
      return { ...row };
    }
    const { data } = await api.post<SalaryComponent>(`/payroll/salary-components/${id}/reject-trait-change`, {});
    return data;
  },

  /** `#11` — antrean usulan individual; filter `MENUNGGU_PERSETUJUAN` dipaksa server. */
  async proposalQueue(): Promise<IndividualProposal[]> {
    if (MOCK) {
      await delay();
      return salaryStore.proposals
        .filter((row) => row.approvalState === 'MENUNGGU_PERSETUJUAN')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: IndividualProposal[] }>('/payroll/salary-components/proposals/search', {});
    return data.data;
  },

  /**
   * Riwayat usulan yang sudah diputuskan (D6). Kontrak tidak punya grid lintas karyawan untuk
   * baris ini (`PROB-SERVICE-358`), jadi di mode dummy daftarnya dirakit dari data yang sama.
   */
  async decidedProposals(): Promise<IndividualProposal[]> {
    if (MOCK) {
      await delay();
      return salaryStore.proposals
        .filter((row) => row.approvalState !== 'MENUNGGU_PERSETUJUAN')
        .sort((a, b) => (b.approvedAt ?? '').localeCompare(a.approvedAt ?? ''))
        .map((row) => ({ ...row }));
    }
    return [];
  },

  /** `#12` — setujui usulan individual; baris lama ditutup pada transaksi yang sama. */
  async approveProposal(actor: Actor, id: string): Promise<IndividualProposal> {
    if (MOCK) {
      await delay(260);
      requireChecker(actor, 'Memutuskan usulan nilai gaji');
      const row = findProposal(id);
      if (row.approvalState !== 'MENUNGGU_PERSETUJUAN') {
        throw new Error(`422 — usulan ini sudah ${row.approvalState}.`);
      }
      if (row.createdBy === actor.employeeId) {
        throw new Error('403 PAY_MAKER_CHECKER_VIOLATION — pengaju tidak boleh menyetujui usulannya sendiri.');
      }
      row.approvalState = 'DISETUJUI';
      row.approvedBy = actor.employeeId;
      row.approvedAt = now();
      return { ...row };
    }
    const { data } = await api.post<IndividualProposal>(`/payroll/salary-components/proposals/${id}/approve`, {});
    return data;
  },

  /** `#13` — tolak usulan individual; alasan wajib (kontras dengan `#8`). */
  async rejectProposal(actor: Actor, id: string, rejectionReason: string): Promise<IndividualProposal> {
    if (MOCK) {
      await delay(260);
      requireChecker(actor, 'Memutuskan usulan nilai gaji');
      const row = findProposal(id);
      if (row.approvalState !== 'MENUNGGU_PERSETUJUAN') {
        throw new Error(`422 — usulan ini sudah ${row.approvalState}.`);
      }
      if (!rejectionReason.trim()) throw new Error('422 VALIDATION_ERROR — alasan penolakan wajib diisi.');
      row.approvalState = 'DITOLAK';
      row.rejectionReason = rejectionReason.trim();
      row.approvedBy = actor.employeeId;
      row.approvedAt = now();
      return { ...row };
    }
    const { data } = await api.post<IndividualProposal>(`/payroll/salary-components/proposals/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return data;
  },

  async batches(): Promise<ChangeBatch[]> {
    if (MOCK) {
      await delay();
      return salaryStore.batches
        .filter((row) => row.status !== 'DRAFT')
        .map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) }));
    }
    const { data } = await api.post<{ data: ChangeBatch[] }>('/payroll/salary-change-batches/search', {});
    return data.data;
  },

  /** `#19` — detail kumpulan; `impact_summary` dibekukan saat diajukan, bukan dihitung ulang. */
  async batch(id: string): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(150);
      const row = findBatch(id);
      return { ...row, items: row.items.map((item) => ({ ...item })) };
    }
    const { data } = await api.get<ChangeBatch>(`/payroll/salary-change-batches/${id}`);
    return data;
  },

  /** `#21` — setujui kumpulan; kumpulan tereskalasi hanya sah oleh penyetuju eskalasi. */
  async approveBatch(actor: Actor, id: string): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(280);
      const row = findBatch(id);
      if (row.status !== 'MENUNGGU_PERSETUJUAN') throw new Error(`422 — kumpulan ini sudah ${row.status}.`);
      if (!canApproveBatch(row, actor)) {
        throw new Error(
          row.requiresEscalation
            ? '403 PAY_MAKER_CHECKER_VIOLATION — kumpulan ini memerlukan penyetuju eskalasi; pemanggil bukan penyetuju yang sah.'
            : '403 PAY_MAKER_CHECKER_VIOLATION — pengaju tidak boleh menyetujui kumpulannya sendiri.',
        );
      }
      row.status = 'DISETUJUI';
      row.decidedBy = actor.employeeId;
      row.decidedAt = now();
      return { ...row, items: row.items.map((item) => ({ ...item })) };
    }
    const { data } = await api.post<ChangeBatch>(`/payroll/salary-change-batches/${id}/approve`, {});
    return data;
  },

  /** `#22` — tolak kumpulan; nol gerbang eskalasi tambahan, alasan wajib. */
  async rejectBatch(actor: Actor, id: string, rejectionReason: string): Promise<ChangeBatch> {
    if (MOCK) {
      await delay(280);
      requireChecker(actor, 'Menolak kumpulan perubahan gaji');
      const row = findBatch(id);
      if (row.status !== 'MENUNGGU_PERSETUJUAN') throw new Error(`422 — kumpulan ini sudah ${row.status}.`);
      if (row.createdBy === actor.employeeId) {
        throw new Error('403 PAY_MAKER_CHECKER_VIOLATION — pengaju tidak boleh memutuskan kumpulannya sendiri.');
      }
      if (!rejectionReason.trim()) throw new Error('422 VALIDATION_ERROR — alasan penolakan wajib diisi.');
      row.status = 'DITOLAK';
      row.rejectionReason = rejectionReason.trim();
      row.decidedBy = actor.employeeId;
      row.decidedAt = now();
      return { ...row, items: row.items.map((item) => ({ ...item })) };
    }
    const { data } = await api.post<ChangeBatch>(`/payroll/salary-change-batches/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return data;
  },

  /** `#46` — daftar pending; keberadaan barisnya adalah kriterianya, tanpa filter dan tanpa aksi. */
  async handoverPending(): Promise<HandoverPending[]> {
    if (MOCK) {
      await delay(150);
      return listPending();
    }
    const { data } = await api.get<HandoverPending[]>('/payroll/handover/pending');
    return data;
  },

  /** `#48` — riwayat pengambilan oleh sistem klien. */
  async pickupLog(periodId?: string): Promise<PickupLog[]> {
    if (MOCK) {
      await delay(150);
      return listPickups(periodId);
    }
    const { data } = await api.post<PickupLog[]>('/payroll/handover/pickup-log/search', { period_id: periodId });
    return data;
  },

  /** `#50` — riwayat ekspor ulang, termasuk baris yang ditolak gerbang. */
  async reexportLog(): Promise<ReexportLog[]> {
    if (MOCK) {
      await delay(150);
      return listReexports();
    }
    const { data } = await api.post<ReexportLog[]>('/payroll/handover/reexport-log/search', {});
    return data;
  },

  /**
   * `#49` — ekspor ulang dengan dua gerbang: periode wajib sudah diserahkan, dan baris jembatan
   * wajib sudah kosong (sudah diambil klien). Alasan tetap dicatat meski gerbangnya menolak.
   */
  async requestReexport(actor: Actor, periodId: string, reasonText: string): Promise<ReexportLog> {
    if (MOCK) {
      await delay(300);
      requireChecker(actor, 'Mengajukan ekspor ulang');
      if (!reasonText.trim()) throw new Error('422 VALIDATION_ERROR — alasan ekspor ulang wajib diisi.');
      const period = await salaryProcessingService.period(periodId);
      const write = (gateResult: ReexportGateResult) =>
        addReexport({
          periodId,
          gateResult,
          reasonText: reasonText.trim(),
          createdBy: actor.employeeId,
          createdAt: now(),
        });

      if (period.status !== 'HANDED_OVER') {
        write('DITOLAK_PERIODE_BELUM_DISERAHKAN');
        throw new Error('422 PAY_HANDOVER_NOT_YET_SUBMITTED — periode ini belum pernah diserahkan.');
      }
      if (pendingOf(periodId)) {
        write('DITOLAK_BARIS_BELUM_KOSONG');
        throw new Error('422 PAY_HANDOVER_ALREADY_DONE — baris jembatan periode ini masih ada, belum diambil klien.');
      }
      const row = write('DISETUJUI');
      addPending(periodId, 10, row.createdAt);
      return row;
    }
    const { data } = await api.post<ReexportLog>(`/payroll/handover/${periodId}/reexport`, { reason_text: reasonText });
    return data;
  },
};
