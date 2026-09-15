import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import type { PayableSource } from '@/features/disbursement/types';
import {
  EXPOSURE,
  INSTALLMENTS,
  LOANS,
  LOAN_CFG,
  ME,
  MGR,
  REJECTION_REASONS,
} from '@/features/loan/mock-data';
import {
  activeLoans,
  buildInstallments,
  offerTotal,
  parseAmount,
  roomOf,
  tenorOptions,
} from '@/features/loan/rules';
import type {
  AcknowledgementOutcome,
  Installment,
  Loan,
  LoanConfig,
  LoanDraft,
  LoanExposure,
  LoanStatus,
} from '@/features/loan/types';

/**
 * API service Loan (FSD/UIC-001-FINANCE FT3).
 *
 * Endpoint kontrak:
 *   GET/POST /loans · POST …/{id}/cancel · …/{id}/withdraw
 *   POST …/{id}/decisions · POST …/{id}/schedule-acknowledgements
 *
 * Aturan yang ditegakkan di sini:
 *  • Modul yang dimatikan per company menolak pengajuan baru — **422
 *    FIN_MODULE_DISABLED** (UIC §4 / TSD §14.3).
 *  • Jumlah pinjaman aktif dibatasi `finance.loan.max_active_count` — **422
 *    FIN_ACTIVE_LOAN_COUNT_EXCEEDED**. Tenor di luar pola — **422 FIN_TENOR_INVALID**.
 *  • Pokok tidak boleh melewati ruang pinjam — **422 FIN_LOAN_LIMIT_EXCEEDED**.
 *  • Pengajuan menahan pokok (`HELD`) dan memulai instance workflow (201).
 *  • Keputusan atasan satu endpoint `POST /loans/{id}/decisions`
 *    (`APPROVE`|`REJECT`) → **202 Accepted**; status barisnya tidak ditulis di
 *    sini. Di luar `SUBMITTED` → **409 FIN_ALREADY_DECIDED**; atasan tidak
 *    memutus barisnya sendiri (403). Dispute hold **tidak** memblokir keputusan —
 *    kontraknya menggerbang penandaan pencairan (FT5, 422 FIN_DISPUTE_HOLD_ACTIVE).
 *  • Menolak wajib beralasan; alasan bertanda `requires_free_text` wajib
 *    disertai catatan (422).
 *  • Tiga pintu keluar yang berbeda dan tidak bisa saling menggantikan:
 *    **Cancel** (pengaju, hanya `SUBMITTED`, lewat ⇒ 409 FIN_ALREADY_DECIDED),
 *    **Withdraw** (pengaju, `AWAITING_CALCULATION` lewat ambang, selain itu 422
 *    FIN_LOAN_WITHDRAWAL_NOT_ELIGIBLE), dan **DECLINE** (cabang acknowledgement).
 *    Memanggil ACK/DECLINE di luar `AWAITING_ACKNOWLEDGEMENT` ditolak **422
 *    FIN_LOAN_NOT_AWAITING_ACKNOWLEDGEMENT**.
 *  • ACK mengisi bunga, total kewajiban dan jadwal angsuran dari tawaran pihak
 *    pemberi dana — HRIS tidak pernah menghitungnya sendiri.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let mockLoans: Loan[] = LOANS.map((row) => ({ ...row }));
let mockExposure: LoanExposure = { ...EXPOSURE };
let mockInstallments: Record<string, Installment[]> = Object.fromEntries(
  Object.entries(INSTALLMENTS).map(([id, rows]) => [id, rows.map((row) => ({ ...row }))]),
);
let mockConfig: LoanConfig = { ...LOAN_CFG };

export function resetLoanMocks() {
  mockLoans = LOANS.map((row) => ({ ...row }));
  mockExposure = { ...EXPOSURE };
  mockInstallments = Object.fromEntries(
    Object.entries(INSTALLMENTS).map(([id, rows]) => [id, rows.map((row) => ({ ...row }))]),
  );
  mockConfig = { ...LOAN_CFG };
}

/** Hanya untuk pengujian gerbang modul mati (422): mematikan modul per company. */
export function setLoanModuleEnabled(enabled: boolean) {
  mockConfig = { ...mockConfig, enabled };
}

export interface LoanFilter {
  statuses?: LoanStatus[];
  search?: string;
}

export interface LoanDecisionInput {
  id: string;
  decision: 'APPROVE' | 'REJECT';
  reasonId: string;
  reasonNote: string;
}

export interface LoanRejectInput {
  id: string;
  reasonId: string;
  note: string;
}

function findLoan(id: string): Loan {
  const row = mockLoans.find((item) => item.id === id);
  if (!row) throw new Error('404 — permintaan pinjaman tidak ditemukan.');
  return row;
}

/** Melepas pokok yang tadinya ditahan; tidak pernah membuat reserved negatif. */
function releaseReservation(loan: Loan) {
  if (loan.employeeId !== mockExposure.employeeId) return;
  mockExposure = {
    ...mockExposure,
    reservedAmount: Math.max(0, mockExposure.reservedAmount - loan.principalAmount),
  };
}

export const loanService = {
  async config(): Promise<LoanConfig> {
    if (MOCK) {
      await delay(120);
      return { ...mockConfig };
    }
    const { data } = await api.get<LoanConfig>('/loan-config');
    return data;
  },

  async exposure(): Promise<LoanExposure> {
    if (MOCK) {
      await delay(150);
      return { ...mockExposure };
    }
    const { data } = await api.get<LoanExposure>('/loan-exposures/me');
    return data;
  },

  async loans(filter: LoanFilter = {}): Promise<Loan[]> {
    if (MOCK) {
      await delay();
      const query = filter.search?.trim().toLowerCase();
      return mockLoans
        .filter((row) => {
          if (filter.statuses?.length && !filter.statuses.includes(row.status)) return false;
          if (query && !row.requestNo.toLowerCase().includes(query)) return false;
          return true;
        })
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ rows: Loan[] }>('/loans/search', filter);
    return data.rows;
  },

  async loan(id: string): Promise<Loan | undefined> {
    if (MOCK) {
      await delay(150);
      const row = mockLoans.find((item) => item.id === id);
      return row ? { ...row } : undefined;
    }
    const { data } = await api.get<Loan>(`/loans/${id}`);
    return data;
  },

  async installments(id: string): Promise<Installment[]> {
    if (MOCK) {
      await delay(150);
      return (mockInstallments[id] ?? []).map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Installment[] }>(`/loans/${id}/installments`);
    return data.rows;
  },

  async submitLoan(draft: LoanDraft): Promise<Loan> {
    if (MOCK) {
      await delay(400);
      if (!mockConfig.enabled) {
        throw new Error('422 FIN_MODULE_DISABLED — modul pinjaman dimatikan untuk company ini.');
      }

      const running = activeLoans(mockLoans, ME).length;
      if (running >= mockConfig.maxActiveCount) {
        throw new Error(
          `422 FIN_ACTIVE_LOAN_COUNT_EXCEEDED — ${running} dari ${mockConfig.maxActiveCount} pinjaman aktif yang diizinkan sudah berjalan.`,
        );
      }

      const amount = parseAmount(draft.amount);
      if (amount <= 0) throw new Error('422 — pokok pinjaman harus lebih besar dari nol.');
      if (!draft.tenorMonths) throw new Error('422 FIN_TENOR_INVALID — pilih tenor lebih dulu.');
      if (!tenorOptions(mockConfig).includes(draft.tenorMonths)) {
        throw new Error('422 FIN_TENOR_INVALID — tenor itu tidak ada di pola tenor company ini.');
      }

      const room = roomOf(mockExposure);
      if (amount > room) {
        throw new Error(
          `422 FIN_LOAN_LIMIT_EXCEEDED — pokok melewati ruang pinjam yang tersisa (Rp ${room.toLocaleString('id-ID')}).`,
        );
      }

      const sequence = 24 + mockLoans.length + 1;
      const row: Loan = {
        id: `loan-${sequence}`,
        requestNo: `LON-2026-${String(sequence).padStart(6, '0')}`,
        employeeId: ME,
        principalAmount: amount,
        tenorMonths: draft.tenorMonths,
        // Skema company dibekukan di sini, bukan dibaca ulang saat menampilkan.
        interestBearingSnapshot: mockConfig.interestBearing,
        scheduleSource: null,
        // Bunga tidak pernah dihitung HRIS pada company berbunga.
        interestAmount: null,
        totalObligation: null,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString().slice(0, 10),
        workflowInstanceId: `8b00…${Math.random().toString(16).slice(4, 7)}`,
        bankAccountSnapshot: { bankCode: 'BCA', accountNumber: '****4567', accountHolderName: 'Budi Santoso' },
        costCenterIdSnapshot: null,
      };

      mockLoans = [row, ...mockLoans];
      mockExposure = { ...mockExposure, reservedAmount: mockExposure.reservedAmount + amount };
      return { ...row };
    }
    const { data } = await api.post<Loan>('/loans', {
      principalAmount: parseAmount(draft.amount),
      tenorMonths: draft.tenorMonths,
    });
    return data;
  },

  /** Pembatalan oleh pengaju — hanya selagi permintaannya masih `SUBMITTED`. */
  async cancelLoan(id: string): Promise<Loan> {
    if (MOCK) {
      await delay(250);
      const row = findLoan(id);
      if (row.employeeId !== ME) throw new Error('403 — hanya pengaju yang bisa membatalkan permintaannya sendiri.');
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — pembatalan hanya berlaku selagi permintaannya masih SUBMITTED.');
      }
      row.status = 'CANCELLED';
      releaseReservation(row);
      return { ...row };
    }
    const { data } = await api.post<Loan>(`/loans/${id}/cancel`);
    return data;
  },

  /** Penarikan oleh pengaju — setelah ambang `AWAITING_CALCULATION` lewat. */
  async withdrawLoan(id: string): Promise<Loan> {
    if (MOCK) {
      await delay(250);
      const row = findLoan(id);
      if (row.employeeId !== ME) throw new Error('403 — hanya pengaju yang bisa menarik permintaannya sendiri.');
      if (row.status !== 'AWAITING_CALCULATION') {
        throw new Error(
          '422 FIN_LOAN_WITHDRAWAL_NOT_ELIGIBLE — penarikan hanya berlaku pada AWAITING_CALCULATION yang sudah melewati ambang.',
        );
      }
      row.status = 'WITHDRAWN';
      releaseReservation(row);
      return { ...row };
    }
    const { data } = await api.post<Loan>(`/loans/${id}/withdraw`);
    return data;
  },

  /**
   * Keputusan atasan — `POST /loans/{id}/decisions` (UIC F3.06, pola K9).
   * Server menerima (202) dan status barisnya ditulis saat workflow selesai,
   * jadi di sini pun barisnya tidak berubah.
   */
  async decideLoan(input: LoanDecisionInput): Promise<{ accepted: true }> {
    if (MOCK) {
      await delay(400);
      const row = findLoan(input.id);
      if (row.employeeId === MGR) throw new Error('403 — atasan tidak memutuskan permintaannya sendiri.');
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — hanya permintaan yang menunggu keputusan yang bisa diputuskan.');
      }
      if (input.decision === 'REJECT') {
        if (!input.reasonId) throw new Error('422 — alasan penolakan wajib dipilih.');
        const reason = REJECTION_REASONS.find((item) => item.id === input.reasonId);
        if (!reason) throw new Error('422 — alasan penolakan tidak dikenal.');
        if (reason.requiresFreeText && !input.reasonNote.trim()) {
          throw new Error('422 — alasan ini wajib disertai catatan.');
        }
      }
      return { accepted: true };
    }
    await api.post(`/loans/${input.id}/decisions`, {
      decision: input.decision,
      reason_id: input.reasonId || undefined,
      reason_note: input.reasonNote || undefined,
    });
    return { accepted: true };
  },

  approveLoan(id: string) {
    return loanService.decideLoan({ id, decision: 'APPROVE', reasonId: '', reasonNote: '' });
  },

  rejectLoan(input: LoanRejectInput) {
    return loanService.decideLoan({ id: input.id, decision: 'REJECT', reasonId: input.reasonId, reasonNote: input.note });
  },

  /**
   * Satu endpoint, dua hasil. `ACK` menyalin pokok/bunga/tenor dari tawaran
   * pihak pemberi dana ke barisnya dan menerbitkan jadwal angsuran; `DECLINE`
   * melepas reservasinya dan membuka jalan pengajuan baru.
   */
  async acknowledgeSchedule(id: string, outcome: AcknowledgementOutcome): Promise<Loan> {
    if (MOCK) {
      await delay(400);
      const row = findLoan(id);
      if (row.employeeId !== ME) throw new Error('403 — jadwal hanya diakui oleh karyawan yang meminjam.');
      if (row.status !== 'AWAITING_ACKNOWLEDGEMENT') {
        throw new Error(
          '422 FIN_LOAN_NOT_AWAITING_ACKNOWLEDGEMENT — ACK/DECLINE hanya berlaku saat permintaannya menunggu pengakuan jadwal.',
        );
      }

      if (outcome === 'DECLINE') {
        row.status = 'DECLINED_BY_EMPLOYEE';
        releaseReservation(row);
        return { ...row };
      }

      const offer = row.acknowledgementOffer;
      const total = offerTotal(row);
      if (!offer || total === null) throw new Error('422 — jadwal dari pihak pemberi dana belum lengkap.');

      row.status = 'APPROVED';
      row.interestAmount = offer.acknowledgedInterest;
      row.totalObligation = total;
      row.tenorMonths = offer.acknowledgedTenor;
      row.scheduleSource = 'RECEIVED_FROM_EXTERNAL';
      mockInstallments = {
        ...mockInstallments,
        [row.id]: buildInstallments(total, offer.acknowledgedTenor),
      };
      return { ...row };
    }
    const { data } = await api.post<Loan>(`/loans/${id}/schedule-acknowledgements`, { outcome });
    return data;
  },
};

/**
 * Mock lintas modul — FT5 membaca `emp_loan_request` read-only (TSD §3.1):
 * layak ditandai bila `status = APPROVED`, nominal `principal_amount`.
 */
export function loanPayableSources(): PayableSource[] {
  return mockLoans.map((loan): PayableSource => ({
    payableType: 'LOAN',
    payableId: loan.id,
    requestNo: loan.requestNo,
    employeeId: loan.employeeId,
    amount: loan.principalAmount,
    submittedAt: loan.submittedAt,
    eligible: loan.status === 'APPROVED',
  }));
}

/**
 * Gerbang `WITH_PAYROLL` (TSD §3.3 poin 2): payroll-proxy sudah mengonfirmasi
 * potongan — di mock, pinjaman sudah punya angsuran `CONFIRMED`.
 */
export function loanPayrollConfirmed(loanId: string): boolean {
  return (mockInstallments[loanId] ?? []).some((row) => row.status === 'CONFIRMED');
}
