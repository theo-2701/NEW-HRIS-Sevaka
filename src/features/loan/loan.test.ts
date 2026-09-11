import { beforeEach, describe, expect, it } from 'vitest';
import { loanService, resetLoanMocks, setLoanModuleEnabled } from '@/features/loan/services/loan.service';
import {
  activeHoldOn,
  activeLoans,
  approvalQueue,
  buildInstallments,
  offerTotal,
  parseAmount,
  reservationStateOf,
  roomOf,
  tenorOptions,
} from '@/features/loan/rules';
import { EXPOSURE, HOLDS, LOANS, LOAN_CFG, MAX_ACTIVE, MGR } from '@/features/loan/mock-data';
import type { LoanDraft } from '@/features/loan/types';

const draft: LoanDraft = { amount: '5.000.000', tenorMonths: 6 };

beforeEach(() => {
  resetLoanMocks();
});

describe('Aturan plafon dan reservasi', () => {
  it('ruang pinjam = limit grade − berjalan − ditahan', () => {
    expect(roomOf(EXPOSURE)).toBe(30_000_000);
    expect(roomOf({ ...EXPOSURE, outstandingAmount: 4_000_000, reservedAmount: 6_000_000 })).toBe(20_000_000);
  });

  it('status menentukan keadaan reservasi, bukan sebaliknya', () => {
    expect(reservationStateOf('SUBMITTED')).toBe('HELD');
    expect(reservationStateOf('AWAITING_ACKNOWLEDGEMENT')).toBe('HELD');
    expect(reservationStateOf('APPROVED')).toBe('CONSUMED');
    expect(reservationStateOf('CANCELLED')).toBe('RELEASED');
    expect(reservationStateOf('DECLINED_BY_EMPLOYEE')).toBe('RELEASED');
  });

  it('pinjaman aktif hanya yang reservasinya belum dilepas', () => {
    expect(activeLoans(LOANS, 'emp-budi').map((row) => row.id)).toEqual(['loan-12', 'loan-18']);
  });

  it('pilihan tenor mengikuti pola company — kelipatan tiga sampai batasnya', () => {
    expect(tenorOptions(LOAN_CFG)).toEqual([3, 6, 9, 12, 15, 18, 21, 24]);
    expect(tenorOptions({ ...LOAN_CFG, tenorChoicePattern: 'ANY', tenorMax: 4 })).toEqual([1, 2, 3, 4]);
  });

  it('nominal berpemisah ribuan dibaca sebagai angka', () => {
    expect(parseAmount('12.500.000')).toBe(12_500_000);
    expect(parseAmount('')).toBe(0);
  });

  it('jadwal angsuran membagi rata kewajiban ke setiap periode payroll', () => {
    const rows = buildInstallments(9_540_000, 9);
    expect(rows).toHaveLength(9);
    expect(rows[0].dueAmount).toBe(9_540_000 / 9);
    expect(rows[0].payrollPeriodRef).toBe('2026-09-25');
    expect(rows[4].payrollPeriodRef).toBe('2027-01-25');
    expect(rows.every((row) => row.status === 'PENDING')).toBe(true);
  });
});

describe('Pengajuan pinjaman', () => {
  it('modul yang dimatikan menolak setiap pengajuan', async () => {
    setLoanModuleEnabled(false);
    await expect(loanService.submitLoan(draft)).rejects.toThrow(/403 FIN_MODULE_DISABLED/);
  });

  it('lebih dari dua pinjaman aktif ditolak', async () => {
    // Budi sudah memegang loan-12 (APPROVED) dan loan-18 (AWAITING_ACKNOWLEDGEMENT).
    expect(activeLoans(LOANS, 'emp-budi')).toHaveLength(MAX_ACTIVE);
    await expect(loanService.submitLoan(draft)).rejects.toThrow(/FIN_ACTIVE_LOAN_COUNT_EXCEEDED/);
  });

  it('pokok di atas ruang pinjam ditolak', async () => {
    // Lepaskan satu pinjaman dulu supaya gerbang jumlah aktif tidak menang lebih awal.
    await loanService.acknowledgeSchedule('loan-18', 'DECLINE');
    await expect(loanService.submitLoan({ amount: '40.000.000', tenorMonths: 6 })).rejects.toThrow(
      /FIN_LOAN_LIMIT_EXCEEDED/,
    );
  });

  it('tenor di luar pola company ditolak', async () => {
    await loanService.acknowledgeSchedule('loan-18', 'DECLINE');
    await expect(loanService.submitLoan({ amount: '5.000.000', tenorMonths: 7 })).rejects.toThrow(/pola tenor/);
  });

  it('pokok nol dan tenor kosong ditolak', async () => {
    await loanService.acknowledgeSchedule('loan-18', 'DECLINE');
    await expect(loanService.submitLoan({ amount: '0', tenorMonths: 6 })).rejects.toThrow(/lebih besar dari nol/);
    await expect(loanService.submitLoan({ amount: '5.000.000', tenorMonths: null })).rejects.toThrow(/pilih tenor/);
  });

  it('pengajuan menahan pokoknya dan tidak pernah membawa bunga', async () => {
    await loanService.acknowledgeSchedule('loan-18', 'DECLINE');
    const before = await loanService.exposure();
    const row = await loanService.submitLoan(draft);

    expect(row.status).toBe('SUBMITTED');
    expect(reservationStateOf(row.status)).toBe('HELD');
    expect(row.interestAmount).toBeNull();
    expect(row.totalObligation).toBeNull();
    expect(row.scheduleSource).toBeNull();
    expect(row.principalAmount).toBe(5_000_000);

    const after = await loanService.exposure();
    expect(after.reservedAmount).toBe(before.reservedAmount + 5_000_000);
  });
});

describe('Pintu keluar milik pengaju', () => {
  it('membatalkan hanya berlaku selagi masih SUBMITTED', async () => {
    await expect(loanService.cancelLoan('loan-18')).rejects.toThrow(/422/);
  });

  it('hanya pengaju sendiri yang bisa membatalkan', async () => {
    // loan-24 milik Maya, sesi layar ini Budi.
    await expect(loanService.cancelLoan('loan-24')).rejects.toThrow(/403/);
  });

  it('menarik hanya berlaku setelah AWAITING_CALCULATION', async () => {
    await expect(loanService.withdrawLoan('loan-18')).rejects.toThrow(/422/);
    // loan-21 memang AWAITING_CALCULATION, tapi milik Rahmat.
    await expect(loanService.withdrawLoan('loan-21')).rejects.toThrow(/403/);
  });

  it('membatalkan menyisakan barisnya dan melepas reservasinya', async () => {
    const submitted = await loanService.loans({ statuses: ['AWAITING_ACKNOWLEDGEMENT'] });
    expect(submitted).toHaveLength(1);

    await loanService.acknowledgeSchedule('loan-18', 'DECLINE');
    const fresh = await loanService.submitLoan(draft);
    const row = await loanService.cancelLoan(fresh.id);

    expect(row.status).toBe('CANCELLED');
    expect(reservationStateOf(row.status)).toBe('RELEASED');
    expect((await loanService.loans()).find((item) => item.id === fresh.id)).toBeTruthy();
    expect((await loanService.exposure()).reservedAmount).toBe(0);
  });
});

describe('Keputusan atasan', () => {
  it('penahanan sengketa aktif memblokir keputusan', async () => {
    expect(activeHoldOn(HOLDS, 'loan-21')).toBeTruthy();
    await expect(loanService.approveLoan('loan-21')).rejects.toThrow(/409/);
  });

  it('antrean atasan tidak pernah memuat barisnya sendiri', async () => {
    const rows = await loanService.loans();
    expect(approvalQueue(rows, MGR).map((row) => row.id)).toEqual(['loan-24']);
    // Maya-lah pengaju loan-24, jadi baris itu hilang dari antreannya sendiri.
    expect(approvalQueue(rows, 'emp-maya').map((row) => row.id)).toEqual([]);
  });

  it('hanya permintaan yang menunggu keputusan yang bisa diputuskan', async () => {
    await expect(loanService.approveLoan('loan-18')).rejects.toThrow(/422/);
  });

  it('menyetujui kembali 202 dan tidak mengubah status barisnya', async () => {
    await expect(loanService.approveLoan('loan-24')).resolves.toEqual({ accepted: true });
    const row = await loanService.loan('loan-24');
    expect(row?.status).toBe('SUBMITTED');
  });

  it('menolak wajib beralasan, dan alasan bebas wajib bercatatan', async () => {
    await expect(loanService.rejectLoan({ id: 'loan-24', reasonId: '', note: '' })).rejects.toThrow(/wajib dipilih/);
    await expect(loanService.rejectLoan({ id: 'loan-24', reasonId: 'rr-5', note: '  ' })).rejects.toThrow(
      /wajib disertai catatan/,
    );
    await expect(loanService.rejectLoan({ id: 'loan-24', reasonId: 'rr-1', note: '' })).resolves.toEqual({
      accepted: true,
    });
    expect((await loanService.loan('loan-24'))?.status).toBe('SUBMITTED');
  });
});

describe('Pengakuan jadwal', () => {
  it('ACK/DECLINE di luar AWAITING_ACKNOWLEDGEMENT ditolak', async () => {
    await expect(loanService.acknowledgeSchedule('loan-12', 'ACK')).rejects.toThrow(
      /FIN_LOAN_NOT_AWAITING_ACKNOWLEDGEMENT/,
    );
  });

  it('jadwal hanya diakui oleh karyawan yang meminjam', async () => {
    await expect(loanService.acknowledgeSchedule('loan-21', 'ACK')).rejects.toThrow(/403/);
  });

  it('ACK menyalin tawaran pihak pemberi dana dan menerbitkan jadwal angsuran', async () => {
    const before = LOANS.find((row) => row.id === 'loan-18')!;
    expect(offerTotal(before)).toBe(9_540_000);

    const row = await loanService.acknowledgeSchedule('loan-18', 'ACK');
    expect(row.status).toBe('APPROVED');
    expect(row.interestAmount).toBe(540_000);
    expect(row.totalObligation).toBe(9_540_000);
    expect(row.scheduleSource).toBe('RECEIVED_FROM_EXTERNAL');

    const rows = await loanService.installments('loan-18');
    expect(rows).toHaveLength(9);
    expect(rows[0].dueAmount).toBe(9_540_000 / 9);
  });

  it('DECLINE melepas reservasinya dan menyisakan barisnya', async () => {
    const row = await loanService.acknowledgeSchedule('loan-18', 'DECLINE');
    expect(row.status).toBe('DECLINED_BY_EMPLOYEE');
    expect(reservationStateOf(row.status)).toBe('RELEASED');
    expect(row.interestAmount).toBeNull();
    expect((await loanService.loan('loan-18'))?.status).toBe('DECLINED_BY_EMPLOYEE');
  });

  it('jadwal angsuran belum ada selama pinjamannya belum APPROVED', async () => {
    expect(await loanService.installments('loan-24')).toHaveLength(0);
    expect(await loanService.installments('loan-12')).toHaveLength(12);
  });
});

describe('Daftar dan penyaringan', () => {
  it('status disaring sebagai daftar IN', async () => {
    const rows = await loanService.loans({ statuses: ['SUBMITTED', 'APPROVED'] });
    expect(rows.map((row) => row.id).sort()).toEqual(['loan-12', 'loan-24']);
  });

  it('pencarian membaca nomor permintaan', async () => {
    const rows = await loanService.loans({ search: '000018' });
    expect(rows.map((row) => row.id)).toEqual(['loan-18']);
  });
});
