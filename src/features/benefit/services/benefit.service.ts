import { api } from '@/services/api';
import {
  BENEFICIARIES,
  BENEFIT_TYPES,
  CLAIMS,
  HOLDS,
  LEDGER,
  FAMILY_RELATIONSHIP_RULES,
  ME,
  PAYABLES,
  REJECTION_REASONS,
  RELATIVES,
  employeeName,
} from '@/features/benefit/mock-data';
import { activeHoldOn, draftTotal } from '@/features/benefit/rules';
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
 *  • Penahanan sengketa yang aktif memblokir persetujuan (409).
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
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const cloneClaim = (row: BenefitClaim): BenefitClaim => ({
  ...row,
  items: row.items.map((item) => ({ ...item })),
  similarityWarnings: row.similarityWarnings.map((item) => ({ ...item })),
});

let mockClaims: BenefitClaim[] = CLAIMS.map(cloneClaim);
let mockTypes: BenefitType[] = BENEFIT_TYPES.map((row) => ({ ...row }));
let mockBeneficiaries: Beneficiary[] = BENEFICIARIES.map((row) => ({ ...row }));
let mockLedger: LedgerEntry[] = LEDGER.map((row) => ({ ...row }));

export function resetBenefitMocks() {
  mockClaims = CLAIMS.map(cloneClaim);
  mockTypes = BENEFIT_TYPES.map((row) => ({ ...row }));
  mockBeneficiaries = BENEFICIARIES.map((row) => ({ ...row }));
  mockLedger = LEDGER.map((row) => ({ ...row }));
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
    const { data } = await api.get<{ rows: BenefitClaim[] }>('/benefit-claims', { params: filter });
    return data.rows;
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
        throw new Error('422 — hanya klaim yang masih menunggu keputusan yang bisa dibatalkan.');
      }
      row.status = 'CANCELLED';
      row.reservationState = 'RELEASED';
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
      if (row.status !== 'SUBMITTED') throw new Error('422 — hanya klaim yang menunggu keputusan yang bisa diputuskan.');
      if (activeHoldOn(HOLDS, row.id)) {
        throw new Error('409 — klaim ini sedang ditahan sengketa; persetujuan diblokir sampai penahanannya dilepas.');
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
      if (row.status !== 'SUBMITTED') throw new Error('422 — hanya klaim yang menunggu keputusan yang bisa diputuskan.');
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

  /** Payable hanya lahir setelah klaimnya disetujui. */
  async disbursements(): Promise<Payable[]> {
    if (MOCK) {
      await delay();
      return PAYABLES.filter((row) => {
        if (row.payableType !== 'BENEFIT_CLAIM') return false;
        const claim = mockClaims.find((item) => item.id === row.payableId);
        return !claim || claim.status === 'APPROVED';
      }).map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Payable[] }>('/payables', { params: { payableType: 'BENEFIT_CLAIM' } });
    return data.rows;
  },
};
