import { beforeEach, describe, expect, it } from 'vitest';
import { benefitService, resetBenefitMocks } from '@/features/benefit/services/benefit.service';
import { activeHoldOn, draftTotal, remainingOf, withRunningBalance } from '@/features/benefit/rules';
import { CLAIMS, HOLDS, LEDGER, PERIODS } from '@/features/benefit/mock-data';
import type { ClaimDraft } from '@/features/benefit/types';

const draft: ClaimDraft = {
  benefitTypeId: 'bt-rawat-jalan',
  items: [
    {
      expenseDate: '2026-08-01',
      amount: '300000',
      beneficiaryKind: 'SELF',
      beneficiaryId: '',
      receiptNo: 'RS-MELATI/2026/08/0001',
      documentName: 'nota.pdf',
    },
  ],
};

beforeEach(() => {
  resetBenefitMocks();
});

describe('Aturan saldo', () => {
  it('sisa hak = hak − terpakai − ditahan', () => {
    const balance = PERIODS[0].balances[0];
    expect(remainingOf(balance)).toBe(5_000_000 - 850_000 - 1_250_000);
  });

  it('saldo berjalan ledger: reservasi mengurangi, pelepasan mengembalikan, pemakaian netral', () => {
    const rows = withRunningBalance(LEDGER);
    // Kacamata: reservasi 900rb lalu dilepas → kembali ke 1,5jt.
    expect(rows[0].delta).toBe(-900_000);
    expect(rows[0].runningBalance).toBe(600_000);
    expect(rows[1].runningBalance).toBe(1_500_000);
    // Rawat jalan: reservasi 850rb, lalu USAGE tidak menggeser lagi.
    const usage = rows.find((row) => row.entry.entryType === 'USAGE')!;
    expect(usage.delta).toBe(0);
    expect(usage.runningBalance).toBe(5_000_000 - 850_000);
  });

  it('total draft dijumlahkan dari nominal yang diketik', () => {
    expect(draftTotal({ ...draft, items: [...draft.items, { ...draft.items[0], amount: '200000' }] })).toBe(500_000);
  });
});

describe('Pengajuan klaim', () => {
  it('menolak jenis manfaat yang tidak aktif', async () => {
    await expect(benefitService.submitClaim({ ...draft, benefitTypeId: 'bt-fitness' })).rejects.toThrow(/tidak aktif/);
  });

  it('menolak nota tanpa tanggal atau tanpa nominal', async () => {
    await expect(
      benefitService.submitClaim({ ...draft, items: [{ ...draft.items[0], expenseDate: '' }] }),
    ).rejects.toThrow(/422/);
    await expect(
      benefitService.submitClaim({ ...draft, items: [{ ...draft.items[0], amount: '0' }] }),
    ).rejects.toThrow(/lebih besar dari nol/);
  });

  it('menolak klaim keluarga pada jenis manfaat yang tidak menerimanya', async () => {
    await expect(
      benefitService.submitClaim({
        benefitTypeId: 'bt-kacamata',
        items: [{ ...draft.items[0], beneficiaryKind: 'FAMILY_MEMBER', beneficiaryId: 'ben-siti' }],
      }),
    ).rejects.toThrow(/atas nama keluarga/);
  });

  it('menolak nota tanpa bukti pada jenis manfaat yang mewajibkannya', async () => {
    await expect(
      benefitService.submitClaim({ ...draft, items: [{ ...draft.items[0], documentName: '' }] }),
    ).rejects.toThrow(/butuh nomor nota/);
  });

  it('klaim baru menahan saldo dan membekukan flag data kesehatan', async () => {
    const row = await benefitService.submitClaim(draft);
    expect(row.status).toBe('SUBMITTED');
    expect(row.reservationState).toBe('HELD');
    expect(row.containsHealthDataSnapshot).toBe(true);
    expect(row.totalAmount).toBe(300_000);
  });

  it('pengajuan menulis satu entri reservasi ke ledger', async () => {
    const before = (await benefitService.ledger()).length;
    await benefitService.submitClaim(draft);
    const after = await benefitService.ledger();
    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1].entryType).toBe('RESERVATION');
  });
});

describe('Pembatalan oleh pengaju', () => {
  it('hanya klaim yang menunggu keputusan yang bisa dibatalkan', async () => {
    await expect(benefitService.cancelClaim('clm-45')).rejects.toThrow(/422/);
  });

  it('hanya pengaju sendiri yang bisa membatalkan', async () => {
    // clm-41 milik Maya, sesi layar ini Budi.
    await expect(benefitService.cancelClaim('clm-41')).rejects.toThrow(/403/);
  });

  it('membatalkan menyisakan barisnya dan melepas reservasinya', async () => {
    const row = await benefitService.cancelClaim('clm-46');
    expect(row.status).toBe('CANCELLED');
    expect(row.reservationState).toBe('RELEASED');
    expect((await benefitService.claims()).find((item) => item.id === 'clm-46')).toBeTruthy();
  });
});

describe('Keputusan approver', () => {
  it('penahanan sengketa aktif memblokir persetujuan', async () => {
    expect(activeHoldOn(HOLDS, 'clm-46')).toBeTruthy();
    await expect(benefitService.approveClaim('clm-46')).rejects.toThrow(/409/);
  });

  it('klaim yang sudah diputuskan tidak bisa diputuskan lagi', async () => {
    await expect(benefitService.approveClaim('clm-45')).rejects.toThrow(/422/);
  });

  it('menolak wajib beralasan, dan alasan bebas wajib bercatatan', async () => {
    await expect(
      benefitService.rejectClaim({ id: 'clm-46', reasonId: '', note: '', similarityAcknowledged: true }),
    ).rejects.toThrow(/pilih alasan/);
    await expect(
      benefitService.rejectClaim({ id: 'clm-46', reasonId: 'rr-5', note: '   ', similarityAcknowledged: true }),
    ).rejects.toThrow(/wajib disertai catatan/);
  });

  it('peringatan kemiripan wajib diakui sebelum menolak', async () => {
    await expect(
      benefitService.rejectClaim({ id: 'clm-46', reasonId: 'rr-1', note: '', similarityAcknowledged: false }),
    ).rejects.toThrow(/akui dulu peringatan/);
    await expect(
      benefitService.rejectClaim({ id: 'clm-46', reasonId: 'rr-1', note: '', similarityAcknowledged: true }),
    ).resolves.toEqual({ accepted: true });
  });

  it('peringatan kemiripan tidak pernah ikut ke tampilan pengaju', () => {
    const claim = CLAIMS.find((row) => row.id === 'clm-46')!;
    expect(claim.similarityWarnings).toHaveLength(1);
    expect(benefitService.asApplicantView(claim).similarityWarnings).toHaveLength(0);
  });
});

describe('Beneficiary', () => {
  it('menolak hubungan keluarga di luar whitelist', async () => {
    await expect(benefitService.addBeneficiary('rel-yuni')).rejects.toThrow(/whitelist/);
  });

  it('menolak kerabat yang sudah punya baris di periode ini', async () => {
    await expect(benefitService.addBeneficiary('rel-siti')).rejects.toThrow(/409/);
  });

  it('kerabat yang sudah terdaftar tidak ditawarkan lagi', async () => {
    const rows = await benefitService.selectableRelatives();
    expect(rows.map((row) => row.id)).toEqual(['rel-yuni']);
  });

  it('menonaktifkan ditolak selama masih dirujuk klaim yang menunggu keputusan', async () => {
    // ben-aditya dipakai clm-46 yang masih SUBMITTED.
    await expect(benefitService.deactivateBeneficiary('ben-aditya')).rejects.toThrow(/masih dirujuk/);
  });

  it('menonaktifkan tidak menghapus baris, dan menyalakan kembali bukan wewenang karyawan', async () => {
    const row = await benefitService.deactivateBeneficiary('ben-siti');
    expect(row.isActive).toBe(false);
    expect((await benefitService.beneficiaries()).find((item) => item.id === 'ben-siti')).toBeTruthy();
    await expect(benefitService.deactivateBeneficiary('ben-sri')).rejects.toThrow(/403/);
  });
});

describe('Katalog jenis manfaat', () => {
  it('menolak nama terlalu pendek', async () => {
    await expect(
      benefitService.saveBenefitType({
        name: 'A',
        requiresReceipt: true,
        allowsFamilyClaim: false,
        containsHealthData: false,
        isActive: true,
        changeReason: '',
      }),
    ).rejects.toThrow(/422/);
  });

  it('mengubah flag data kesehatan wajib beralasan', async () => {
    const patch = {
      name: 'Kacamata',
      requiresReceipt: true,
      allowsFamilyClaim: false,
      containsHealthData: true,
      isActive: true,
      changeReason: '',
    };
    await expect(benefitService.saveBenefitType(patch, 'bt-kacamata')).rejects.toThrow(/flag data kesehatan/);
    const row = await benefitService.saveBenefitType(
      { ...patch, changeReason: 'Resep dokter ikut dilampirkan sejak Agustus.' },
      'bt-kacamata',
    );
    expect(row.containsHealthData).toBe(true);
  });
});

describe('Disbursement', () => {
  it('payable hanya muncul untuk klaim yang disetujui', async () => {
    const rows = await benefitService.disbursements();
    expect(rows.map((row) => row.payableId)).toEqual(['clm-45', 'clm-41']);
    expect(rows.every((row) => row.payableType === 'BENEFIT_CLAIM')).toBe(true);
  });
});
