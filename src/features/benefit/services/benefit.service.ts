import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  BENEFICIARIES,
  BENEFIT_TYPES,
  CLAIMS,
  LEDGER,
  FAMILY_RELATIONSHIP_RULES,
  ME,
  REJECTION_REASONS,
  RELATIVES,
  employeeName,
} from '@/features/benefit/mock-data';
import { draftTotal } from '@/features/benefit/rules';
import { activeMarkOf } from '@/features/disbursement/marks-store';
import type { PayableSource } from '@/features/disbursement/types';
import type {
  Beneficiary,
  BenefitClaim,
  BenefitType,
  BenefitTypeDraft,
  ClaimDraft,
  LedgerEntry,
  Payable,
} from '@/features/benefit/types';

/**
 * API service Benefit Reimbursement (FSD-001-FINANCE FT1 · FT2).
 *
 * Endpoint kontrak:
 *   GET/POST /benefit-claims · POST …/{id}/cancel · …/{id}/approve · …/{id}/reject
 *   GET/POST/PATCH /benefit-types · GET/POST/PATCH /benefit-beneficiaries
 *
 * Aturan yang ditegakkan di sini:
 *  • Klaim baru menahan saldo: status `SUBMITTED`, reservasi `HELD`.
 *  • Membatalkan hanya oleh pengaju dan hanya selagi `SUBMITTED`; barisnya
 *    tetap ada, reservasinya dilepas (`RELEASED`).
 *  • Keputusan approver dikirim ke proses approval → **202 Accepted**; status
 *    ditulis saat peristiwa selesainya workflow dikonsumsi.
 *  • Keputusan/cancel di luar SUBMITTED → 409 FIN_ALREADY_DECIDED (UIC §3.6–§3.7).
 *    Penahanan sengketa **tidak** memblokir keputusan — kontraknya menggerbang
 *    penandaan pencairan (FT5, 422 FIN_DISPUTE_HOLD_ACTIVE).
 *  • Gerbang submit UIC §3.4: 422 FIN_MODULE_DISABLED, 422 FIN_CLAIM_WINDOW_EXPIRED
 *    (tanggal nota ≤ hari ini dan ≥ hari ini − 90 hari), 409 FIN_DUPLICATE_RECEIPT
 *    (kunci nota lintas klaim hidup), 422 FIN_BENEFICIARY_NOT_LISTED, dan
 *    422 FIN_FAMILY_BENEFICIARY_SLOT_FULL saat menunjuk penerima (maks 5).
 *  • `completeClaimWorkflow` (mock) = konsumsi `workflow.process.completed`:
 *    APPROVED → ledger USAGE, slot keluarga terkunci, payable lahir di daftar
 *    pencairan; REJECTED → ledger RELEASE.
 *  • Menolak wajib beralasan; alasan bertanda `requires_free_text` wajib
 *    disertai catatan, dan peringatan kemiripan wajib diakui lebih dulu (422).
 *  • Peringatan kemiripan **tidak pernah** ditampilkan ke pengaju.
 *  • Beneficiary: hanya kerabat yang lolos whitelist hubungan keluarga (422),
 *    satu baris per (karyawan, periode, kerabat) — kerabat yang sudah punya
 *    baris tidak ditawarkan lagi. Menonaktifkan ditolak bila masih dirujuk
 *    klaim yang menunggu keputusan (422); menyalakan kembali bukan wewenang
 *    karyawan.
 *  • Mengubah flag data kesehatan pada jenis manfaat wajib beralasan (422).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** `finance.benefit.claim_backdate_limit_days` (TSD §16, bawaan 90). */
export const CLAIM_BACKDATE_LIMIT_DAYS = 90;
/** `finance.benefit.max_family_beneficiaries` (TSD §16, bawaan 5). */
export const MAX_FAMILY_BENEFICIARIES = 5;
/** Regex anti-XSS nomor nota (FSD §2.3.1 / TSD §14.2.7). */
const RECEIPT_PATTERN = /^[A-Za-z0-9\-/. ]{1,60}$/;

const isoToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const receiptKey = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const cloneClaim = (row: BenefitClaim): BenefitClaim => ({
  ...row,
  items: row.items.map((item) => ({ ...item })),
  similarityWarnings: row.similarityWarnings.map((item) => ({ ...item })),
});

let mockClaims: BenefitClaim[] = CLAIMS.map(cloneClaim);
let mockTypes: BenefitType[] = BENEFIT_TYPES.map((row) => ({ ...row }));
let mockBeneficiaries: Beneficiary[] = BENEFICIARIES.map((row) => ({ ...row }));
let mockLedger: LedgerEntry[] = LEDGER.map((row) => ({ ...row }));
/** `finance.benefit.enabled` — bawaan TSD §16 menyala. */
let benefitEnabled = true;

/** Hanya untuk pengujian gerbang modul mati (422). */
export function setBenefitModuleEnabled(enabled: boolean) {
  benefitEnabled = enabled;
}

export function resetBenefitMocks() {
  mockClaims = CLAIMS.map(cloneClaim);
  mockTypes = BENEFIT_TYPES.map((row) => ({ ...row }));
  mockBeneficiaries = BENEFICIARIES.map((row) => ({ ...row }));
  mockLedger = LEDGER.map((row) => ({ ...row }));
  benefitEnabled = true;
}

export interface ClaimFilter {
  status?: string;
  benefitTypeId?: string;
  search?: string;
}

export interface RejectInput {
  id: string;
  reasonId: string;
  note: string;
  /** Wajib `true` bila klaimnya membawa peringatan kemiripan. */
  similarityAcknowledged: boolean;
}

function findClaim(id: string): BenefitClaim {
  const row = mockClaims.find((item) => item.id === id);
  if (!row) throw new Error('404 — klaim tidak ditemukan.');
  return row;
}

export const benefitService = {
  async claims(filter: ClaimFilter = {}): Promise<BenefitClaim[]> {
    if (MOCK) {
      await delay();
      const query = filter.search?.trim().toLowerCase();
      return mockClaims
        .filter((row) => {
          if (filter.status && row.status !== filter.status) return false;
          if (filter.benefitTypeId && row.benefitTypeId !== filter.benefitTypeId) return false;
          if (query) {
            const haystack = `${row.requestNo} ${employeeName(row.employeeId)}`.toLowerCase();
            if (!haystack.includes(query)) return false;
          }
          return true;
        })
        .map(cloneClaim);
    }
    const { data } = await api.post<{ data: BenefitClaim[] }>('/benefit-claims/search', { filters: filter });
    return data.data;
  },

  /**
   * Klaim dilihat pengaju: peringatan kemiripan dilucuti, karena itu isyarat
   * untuk approver dan tidak pernah diperlihatkan ke karyawan.
   */
  asApplicantView(row: BenefitClaim): BenefitClaim {
    return { ...cloneClaim(row), similarityWarnings: [] };
  },

  async submitClaim(draft: ClaimDraft): Promise<BenefitClaim> {
    if (MOCK) {
      await delay(400);
      if (!benefitEnabled) throw new Error('422 FIN_MODULE_DISABLED — modul benefit dimatikan untuk company ini.');
      const type = mockTypes.find((row) => row.id === draft.benefitTypeId);
      if (!type) throw new Error('422 — pilih jenis manfaat lebih dulu.');
      if (!type.isActive) throw new Error('422 — jenis manfaat itu sudah tidak aktif.');
      if (!draft.items.length) throw new Error('422 — minimal satu nota harus diisi.');

      draft.items.forEach((item, index) => {
        const at = `nota ${index + 1}`;
        if (!item.expenseDate) throw new Error(`422 — tanggal pengeluaran ${at} wajib diisi.`);
        if (!Number(item.amount)) throw new Error(`422 — nominal ${at} harus lebih besar dari nol.`);
        if (item.beneficiaryKind === 'FAMILY_MEMBER') {
          if (!type.allowsFamilyClaim) {
            throw new Error('422 — jenis manfaat ini tidak menerima klaim atas nama keluarga.');
          }
          if (!item.beneficiaryId) throw new Error(`422 — pilih anggota keluarga untuk ${at}.`);
        }
        if (type.requiresReceipt && (!item.receiptNo.trim() || !item.documentName)) {
          throw new Error(`422 — ${at} butuh nomor nota dan lampirannya.`);
        }
      });

      // Gerbang kontrak lanjutan (UIC §3.4) — dijalankan sesudah field wajib per nota.
      const today = isoToday();
      const earliest = isoDaysAgo(CLAIM_BACKDATE_LIMIT_DAYS);
      const liveKeys = new Set(
        mockClaims
          .filter((claim) => claim.status !== 'CANCELLED' && claim.status !== 'REJECTED')
          .flatMap((claim) => claim.items.map((item) => receiptKey(item.receiptNo)))
          .filter(Boolean),
      );
      draft.items.forEach((item, index) => {
        const at = `nota ${index + 1}`;
        if (item.expenseDate > today || item.expenseDate < earliest) {
          throw new Error(
            `422 FIN_CLAIM_WINDOW_EXPIRED — tanggal ${at} harus di antara ${earliest} dan hari ini (batas ${CLAIM_BACKDATE_LIMIT_DAYS} hari).`,
          );
        }
        if (item.beneficiaryKind === 'FAMILY_MEMBER') {
          const listed = mockBeneficiaries.find((row) => row.id === item.beneficiaryId && row.isActive);
          if (!listed) throw new Error(`422 FIN_BENEFICIARY_NOT_LISTED — penerima ${at} tidak terdaftar aktif.`);
        }
        if (item.receiptNo.trim()) {
          if (!RECEIPT_PATTERN.test(item.receiptNo.trim())) throw new Error(`422 — nomor ${at} memuat karakter tidak sah.`);
          const key = receiptKey(item.receiptNo);
          if (liveKeys.has(key)) {
            throw new Error(`409 FIN_DUPLICATE_RECEIPT — nota ${item.receiptNo.trim()} sudah dipakai klaim lain.`);
          }
          liveKeys.add(key);
        }
      });

      const total = draftTotal(draft);
      const sequence = 47 + mockClaims.filter((row) => row.requestNo.startsWith('CLM-2026')).length - 5;
      const requestNo = `CLM-2026-${String(sequence).padStart(6, '0')}`;

      const row: BenefitClaim = {
        id: `clm-${sequence}`,
        requestNo,
        employeeId: ME,
        benefitTypeId: type.id,
        benefitTypeName: type.name,
        periodId: 'bp-2026',
        totalAmount: total,
        // Menahan saldo lebih dulu; ia baru terpakai setelah disetujui.
        status: 'SUBMITTED',
        reservationState: 'HELD',
        // Dibekukan dari katalog saat submit, bukan dibaca ulang nanti.
        containsHealthDataSnapshot: type.containsHealthData,
        submittedAt: new Date().toISOString().slice(0, 10),
        decidedAt: null,
        decidedBy: null,
        bankAccountSnapshot: { bankCode: 'BCA', accountNumber: '****4567', accountHolderName: 'Budi Santoso' },
        costCenterIdSnapshot: null,
        items: draft.items.map((item, index) => ({
          id: `ci-${sequence}-${index + 1}`,
          expenseDate: item.expenseDate,
          amount: Number(item.amount),
          beneficiaryKind: item.beneficiaryKind,
          beneficiaryId: item.beneficiaryKind === 'FAMILY_MEMBER' ? item.beneficiaryId : null,
          beneficiaryRelationshipSnapshot:
            item.beneficiaryKind === 'FAMILY_MEMBER'
              ? (mockBeneficiaries.find((row) => row.id === item.beneficiaryId)?.relationshipType ?? null)
              : null,
          receiptNo: item.receiptNo.trim(),
          documentId: item.documentName ? `doc-${item.receiptNo.trim().toLowerCase()}` : null,
        })),
        similarityWarnings: [],
      };

      mockClaims = [row, ...mockClaims];
      mockLedger = [
        ...mockLedger,
        {
          id: `lg-${mockLedger.length + 1}`,
          createdAt: row.submittedAt,
          entryType: 'RESERVATION',
          amount: total,
          benefitTypeName: type.name,
          sourceClaimId: row.id,
          requestNo: row.requestNo,
        },
      ];
      return cloneClaim(row);
    }
    const { data } = await api.post<BenefitClaim>('/benefit-claims', draft);
    return data;
  },

  /** Pembatalan oleh pengaju: barisnya tetap, reservasinya dilepas. */
  async cancelClaim(id: string): Promise<BenefitClaim> {
    if (MOCK) {
      await delay(250);
      const row = findClaim(id);
      if (row.employeeId !== ME) throw new Error('403 — hanya pengaju yang bisa membatalkan klaimnya sendiri.');
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — hanya klaim yang masih menunggu keputusan yang bisa dibatalkan.');
      }
      row.status = 'CANCELLED';
      row.reservationState = 'RELEASED';
      mockLedger = [
        ...mockLedger,
        {
          id: `lg-${mockLedger.length + 1}`,
          createdAt: isoToday(),
          entryType: 'RELEASE',
          amount: row.totalAmount,
          benefitTypeName: row.benefitTypeName,
          sourceClaimId: row.id,
          requestNo: row.requestNo,
        },
      ];
      return cloneClaim(row);
    }
    const { data } = await api.post<BenefitClaim>(`/benefit-claims/${id}/cancel`);
    return data;
  },

  /**
   * Keputusan approver. Kontraknya asinkron: server menerima (202) dan status
   * barisnya ditulis saat workflow selesai — jadi di sini pun barisnya tidak
   * langsung berubah.
   */
  async approveClaim(id: string): Promise<{ accepted: true }> {
    if (MOCK) {
      await delay(400);
      const row = findClaim(id);
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — hanya klaim yang menunggu keputusan yang bisa diputuskan.');
      }
      return { accepted: true };
    }
    await api.post(`/benefit-claims/${id}/approve`);
    return { accepted: true };
  },

  async rejectClaim(input: RejectInput): Promise<{ accepted: true }> {
    if (MOCK) {
      await delay(400);
      const row = findClaim(input.id);
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — hanya klaim yang menunggu keputusan yang bisa diputuskan.');
      }
      if (!input.reasonId) throw new Error('422 — pilih alasan penolakan.');

      const reason = REJECTION_REASONS.find((item) => item.id === input.reasonId);
      if (!reason) throw new Error('422 — alasan penolakan tidak dikenal.');
      if (reason.requiresFreeText && !input.note.trim()) {
        throw new Error('422 — alasan ini wajib disertai catatan.');
      }
      if (row.similarityWarnings.length && !input.similarityAcknowledged) {
        throw new Error('422 — akui dulu peringatan kemiripan sebelum menolak.');
      }
      return { accepted: true };
    }
    await api.post(`/benefit-claims/${input.id}/reject`, input);
    return { accepted: true };
  },

  /**
   * Mock saja — pengganti konsumsi `workflow.process.completed` klaim (K9).
   * Koneksi antar modul: klaim disetujui melahirkan payable di daftar pencairan.
   */
  async completeClaimWorkflow(id: string, decision: 'APPROVED' | 'REJECTED'): Promise<BenefitClaim> {
    await delay(150);
    const row = findClaim(id);
    const today = isoToday();
    row.status = decision;
    row.decidedAt = today;
    row.reservationState = decision === 'APPROVED' ? 'CONSUMED' : 'RELEASED';
    mockLedger = [
      ...mockLedger,
      {
        id: `lg-${mockLedger.length + 1}`,
        createdAt: today,
        entryType: decision === 'APPROVED' ? 'USAGE' : 'RELEASE',
        amount: row.totalAmount,
        benefitTypeName: row.benefitTypeName,
        sourceClaimId: row.id,
        requestNo: row.requestNo,
      },
    ];
    if (decision === 'APPROVED') {
      // Tempat penerima keluarga yang sudah dipakai tidak pernah kembali (FD-81).
      row.items.forEach((item) => {
        const beneficiary = mockBeneficiaries.find((ben) => ben.id === item.beneficiaryId);
        if (beneficiary) beneficiary.slotConsumed = true;
      });
    }
    return cloneClaim(row);
  },

  async benefitTypes(): Promise<BenefitType[]> {
    if (MOCK) {
      await delay();
      return mockTypes.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: BenefitType[] }>('/benefit-types');
    return data.rows;
  },

  async saveBenefitType(draft: BenefitTypeDraft, id?: string): Promise<BenefitType> {
    if (MOCK) {
      await delay(350);
      const name = draft.name.trim();
      if (name.length < 2) throw new Error('422 — nama jenis manfaat minimal 2 karakter.');

      if (id) {
        const row = mockTypes.find((item) => item.id === id);
        if (!row) throw new Error('404 — jenis manfaat tidak ditemukan.');
        const healthChanged = row.containsHealthData !== draft.containsHealthData;
        if (healthChanged && !draft.changeReason.trim()) {
          throw new Error('422 — perubahan flag data kesehatan wajib disertai alasan.');
        }
        Object.assign(row, {
          name,
          requiresReceipt: draft.requiresReceipt,
          allowsFamilyClaim: draft.allowsFamilyClaim,
          containsHealthData: draft.containsHealthData,
          isActive: draft.isActive,
        });
        return { ...row };
      }

      const row: BenefitType = {
        id: `bt-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        requiresReceipt: draft.requiresReceipt,
        allowsFamilyClaim: draft.allowsFamilyClaim,
        containsHealthData: draft.containsHealthData,
        isActive: true,
      };
      mockTypes = [...mockTypes, row];
      return { ...row };
    }
    const { data } = id
      ? await api.patch<BenefitType>(`/benefit-types/${id}`, draft)
      : await api.post<BenefitType>('/benefit-types', draft);
    return data;
  },

  async beneficiaries(): Promise<Beneficiary[]> {
    if (MOCK) {
      await delay();
      return mockBeneficiaries.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Beneficiary[] }>('/benefit-beneficiaries');
    return data.rows;
  },

  /** Kerabat yang belum punya baris di periode ini — kunci uniknya melarang baris kedua. */
  async selectableRelatives() {
    if (MOCK) {
      await delay(150);
      const taken = mockBeneficiaries.map((row) => row.relativeId);
      return RELATIVES.filter((row) => !taken.includes(row.id));
    }
    const { data } = await api.get<{ rows: typeof RELATIVES }>('/benefit-beneficiaries/selectable-relatives');
    return data.rows;
  },

  async addBeneficiary(relativeId: string): Promise<Beneficiary> {
    if (MOCK) {
      await delay(350);
      const relative = RELATIVES.find((row) => row.id === relativeId);
      if (!relative) throw new Error('422 — kerabat tidak ditemukan.');
      if (mockBeneficiaries.some((row) => row.relativeId === relativeId)) {
        throw new Error('409 — kerabat itu sudah punya baris di periode ini.');
      }
      if (mockBeneficiaries.length >= MAX_FAMILY_BENEFICIARIES) {
        throw new Error(`422 FIN_FAMILY_BENEFICIARY_SLOT_FULL — maksimal ${MAX_FAMILY_BENEFICIARIES} penerima keluarga per periode.`);
      }
      const rule = FAMILY_RELATIONSHIP_RULES.find((row) => row.relationshipType === relative.relationshipType);
      if (!rule?.isEligible) {
        throw new Error(`422 — ${relative.relationshipType} tidak ada di whitelist hubungan keluarga perusahaan.`);
      }

      const row: Beneficiary = {
        id: `ben-${relative.id.replace('rel-', '')}`,
        relativeId: relative.id,
        name: relative.name,
        relationshipType: relative.relationshipType,
        isActive: true,
        slotConsumed: false,
      };
      mockBeneficiaries = [...mockBeneficiaries, row];
      return { ...row };
    }
    const { data } = await api.post<Beneficiary>('/benefit-beneficiaries', { relativeId });
    return data;
  },

  /**
   * Menonaktifkan saja — barisnya tidak pernah dihapus keras, dan menyalakannya
   * kembali adalah koreksi milik finance officer, bukan karyawan.
   */
  async deactivateBeneficiary(id: string): Promise<Beneficiary> {
    if (MOCK) {
      await delay(250);
      const row = mockBeneficiaries.find((item) => item.id === id);
      if (!row) throw new Error('404 — beneficiary tidak ditemukan.');
      if (!row.isActive) throw new Error('403 — menyalakan kembali adalah koreksi finance officer, bukan aksi karyawan.');
      const referenced = mockClaims.some(
        (claim) => claim.status === 'SUBMITTED' && claim.items.some((item) => item.beneficiaryId === id),
      );
      if (referenced) {
        throw new Error('422 — beneficiary ini masih dirujuk klaim yang menunggu keputusan.');
      }
      row.isActive = false;
      return { ...row };
    }
    const { data } = await api.patch<Beneficiary>(`/benefit-beneficiaries/${id}`, { isActive: false });
    return data;
  },

  async ledger(): Promise<LedgerEntry[]> {
    if (MOCK) {
      await delay();
      return mockLedger.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: LedgerEntry[] }>('/benefit-ledger');
    return data.rows;
  },

  /**
   * Payable hanya lahir setelah klaimnya disetujui. Status tandanya dibaca dari
   * penanda Pencairan & Piutang (FT5), jadi penandaan di layar itu langsung tampil di sini.
   */
  async disbursements(): Promise<Payable[]> {
    if (MOCK) {
      await delay();
      return mockClaims
        .filter((claim) => claim.status === 'APPROVED')
        .map((claim): Payable => {
          const mark = activeMarkOf({ payableType: 'BENEFIT_CLAIM', payableId: claim.id });
          return {
            payableType: 'BENEFIT_CLAIM',
            payableId: claim.id,
            requestNo: mark?.requestNoSnapshot ?? claim.requestNo,
            employeeId: claim.employeeId,
            amount: mark?.amount ?? claim.totalAmount,
            submittedAt: claim.submittedAt,
            markStatus: mark ? 'MARKED' : 'UNMARKED',
            mark: mark
              ? {
                  disbursementMarkId: mark.id,
                  markedAt: mark.markedAt,
                  markSource: mark.markSource,
                  paymentMethod: mark.paymentMethod,
                  actionId: mark.actionId,
                  reasonNote: mark.reasonNote,
                }
              : null,
          };
        });
    }
    // GAP PROB-FRONTEND-016 (FSD §2.5): nol endpoint pencairan untuk ROLE_EMPLOYEE —
    // POST /disbursements/search hanya untuk Finance Officer/HR Manager.
    const { data } = await api.get<{ rows: Payable[] }>('/payables', { params: { payableType: 'BENEFIT_CLAIM' } });
    return data.rows;
  },
};

/**
 * Mock lintas modul — FT5 membaca `emp_benefit_claim` read-only (TSD §3.1):
 * layak ditandai bila `status = APPROVED`, nominal `total_amount`.
 */
export function benefitPayableSources(): PayableSource[] {
  return mockClaims.map((claim): PayableSource => ({
    payableType: 'BENEFIT_CLAIM',
    payableId: claim.id,
    requestNo: claim.requestNo,
    employeeId: claim.employeeId,
    amount: claim.totalAmount,
    submittedAt: claim.submittedAt,
    eligible: claim.status === 'APPROVED',
  }));
}
