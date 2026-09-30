import { beforeEach, describe, expect, it } from 'vitest';
import {
  accessTrailService,
  categoryAdminService,
  documentService,
  letterService,
  malwareService,
  resetDocumentMocks,
  verifyService,
} from '@/features/documents/services/document.service';
import { GOV_VIEWERS } from '@/features/documents/governance-data';
import type { DocActor, DocRole } from '@/features/documents/types';

const pick = (list: DocActor[], role: DocRole) => list.find((row) => row.role === role)!;
const DEDI = pick(GOV_VIEWERS.letters, 'ROLE_HR_STAFF');
const HESTI = pick(GOV_VIEWERS.letters, 'ROLE_HR_MANAGER');
const RINA = pick(GOV_VIEWERS.letters, 'ROLE_SUPER_ADMIN');
const PRASETYO = pick(GOV_VIEWERS.trail, 'ROLE_HEALTH_DATA_OFFICER');
const UPLOADER = pick(GOV_VIEWERS.malware, 'ROLE_EMPLOYEE');
const EMPTY = { subjectEmployeeId: '', branchId: '', reissueOfLetterId: '' };

beforeEach(() => resetDocumentMocks());

describe('Letter Issuance', () => {
  it('A10: tanpa gerbang terbit seketika (nomor + kode + berkas); bergerbang menunggu tanpa nomor', async () => {
    const issued = await letterService.issue(DEDI, { ...EMPTY, templateId: 'tpl-skk', subjectEmployeeId: 'emp-yanti' });
    expect(issued).toMatchObject({ letterIssuanceState: 'TERBIT', letterState: 'BERLAKU' });
    expect(issued.letterNo).toMatch(/^\d{3}\/HRD\/[IVX]+\/\d{4}$/);
    expect(issued.verificationCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect((await documentService.detail(HESTI, issued.documentId!)).letter?.letterNo).toBe(issued.letterNo);
    const gated = await letterService.issue(DEDI, {
      ...EMPTY,
      templateId: 'tpl-tugas',
      subjectEmployeeId: 'emp-yanti',
    });
    expect(gated).toMatchObject({ letterIssuanceState: 'MENUNGGU_PERSETUJUAN', letterNo: null, documentId: null });
  });

  it('A10: aturan target & data pokok; Super Admin tidak menerbitkan', async () => {
    await expect(letterService.issue(DEDI, { ...EMPTY, templateId: 'tpl-skk' })).rejects.toMatchObject({ status: 422 });
    await expect(
      letterService.issue(DEDI, { ...EMPTY, templateId: 'tpl-edaran', subjectEmployeeId: 'emp-yanti' }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      letterService.issue(DEDI, { ...EMPTY, templateId: 'tpl-skk', subjectEmployeeId: 'emp-budi' }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      letterService.issue(RINA, { ...EMPTY, templateId: 'tpl-skk', subjectEmployeeId: 'emp-yanti' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('A11: penyetuju ≠ pengaju; HR Manager menyetujui → terbit; tolak wajib beralasan', async () => {
    await expect(letterService.approve(DEDI, 'let-3', true)).rejects.toMatchObject({ status: 403 });
    await expect(letterService.approve(HESTI, 'let-3', false)).rejects.toMatchObject({ status: 422 });
    const approved = await letterService.approve(HESTI, 'let-3', true);
    expect(approved.letterIssuanceState).toBe('TERBIT');
    await expect(letterService.approve(HESTI, 'let-3', true)).rejects.toMatchObject({ status: 422 });
  });

  it('A12: batal hanya surat terbit & berlaku, beralasan; tercermin di A4', async () => {
    await expect(letterService.cancel(DEDI, 'let-2', 'lagi')).rejects.toMatchObject({ status: 422 });
    await expect(letterService.cancel(DEDI, 'let-1', ' ')).rejects.toMatchObject({ status: 422 });
    const cancelled = await letterService.cancel(DEDI, 'let-1', 'Salah penerima');
    expect(cancelled.letterState).toBe('DIBATALKAN');
    expect((await documentService.detail(HESTI, 'dok-4')).letter?.letterState).toBe('DIBATALKAN');
  });

  it('A13/A14: ≥2 penerima; penyetuju ≠ pengaju; setuju menjalankan tugas dengan gagal per orang', async () => {
    await expect(letterService.submitBatch(DEDI, 'tpl-skk', ['emp-yanti'])).rejects.toMatchObject({ status: 422 });
    await expect(letterService.submitBatch(DEDI, 'tpl-edaran', ['emp-yanti', 'emp-rina'])).rejects.toMatchObject({
      status: 422,
    });
    const batch = await letterService.submitBatch(DEDI, 'tpl-skk', ['emp-yanti', 'emp-rina', 'emp-budi']);
    expect(batch.batchState).toBe('MENUNGGU_PERSETUJUAN');
    await expect(letterService.decideBatch(DEDI, batch.id, 'DISETUJUI')).rejects.toMatchObject({ status: 403 });
    await letterService.decideBatch(HESTI, batch.id, 'DISETUJUI');
    const report = await letterService.batchReport(HESTI, batch.id);
    expect(report).toMatchObject({ batchState: 'SELESAI', summary: { waiting: 0, succeeded: 2, failed: 1 } });
    const rejected = await letterService.decideBatch(RINA, 'batch-3', 'DITOLAK');
    expect(rejected.batchState).toBe('DITOLAK');
  });
});

describe('Pengaturan Kategori', () => {
  it('mengetat berlaku seketika; melonggarkan jadi usulan (nilai lama tetap) dan 409 bila usulan lain menunggu', async () => {
    const tight = await categoryAdminService.update(HESTI, 'cat-aset', { isActive: false });
    expect(tight.mode).toBe('IMMEDIATE');
    await expect(categoryAdminService.update(HESTI, 'cat-skk', { retentionDays: 730 })).rejects.toMatchObject({
      status: 422,
    });
    const loose = await categoryAdminService.update(HESTI, 'cat-skk', { retentionDays: 730 }, 2);
    expect(loose).toMatchObject({ mode: 'PROPOSED', category: { retentionDays: 1095, hasPendingChange: true } });
    await expect(categoryAdminService.update(HESTI, 'cat-skk', { categoryName: 'X' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('A6d: Super Admin saja, angka dampak wajib sama; A7 kategori sensitif 403', async () => {
    await categoryAdminService.update(HESTI, 'cat-skk', { retentionDays: 730 }, 2);
    await expect(
      categoryAdminService.decide(HESTI, 'cat-skk', 'SETUJU', { acknowledgedImpactCount: 2 }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      categoryAdminService.decide(RINA, 'cat-skk', 'SETUJU', { acknowledgedImpactCount: 9 }),
    ).rejects.toMatchObject({ status: 422 });
    const done = await categoryAdminService.decide(RINA, 'cat-skk', 'SETUJU', { acknowledgedImpactCount: 2 });
    expect(done).toMatchObject({ retentionDays: 730, hasPendingChange: false });
    await expect(categoryAdminService.setReaders(HESTI, 'cat-dokter', ['ROLE_HR_MANAGER'], 1)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('A6b: kode unik (409), SVG ditolak, asal PERUSAHAAN + kelas BIASA dipaksa', async () => {
    const draft = {
      categoryCode: 'berkas_pelatihan',
      categoryName: 'Berkas Pelatihan',
      retentionRegime: 'TEMPORARY' as const,
      retentionDays: '365',
      maxFileSizeMb: '5',
      allowedMimeTypes: ['application/pdf'],
      isReplaceable: false,
      isRegenerable: false,
      shownInSelfService: true,
    };
    const row = await categoryAdminService.create(HESTI, draft);
    expect(row).toMatchObject({ categoryOrigin: 'PERUSAHAAN', confidentialityClass: 'BIASA' });
    await expect(categoryAdminService.create(HESTI, draft)).rejects.toMatchObject({ status: 409 });
    await expect(
      categoryAdminService.create(HESTI, { ...draft, categoryCode: 'logo', allowedMimeTypes: ['image/svg+xml'] }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('Jejak Akses & Malware', () => {
  it('A5: tepat dua pembaca; pembukaan berkas (A2) muncul di jejak; baris bertanda tersaring', async () => {
    await expect(accessTrailService.search(PRASETYO, {})).rejects.toMatchObject({ status: 403 });
    await documentService.content(HESTI, 'dok-4');
    const rows = await accessTrailService.search(HESTI, {});
    expect(rows.length).toBe(7);
    expect(await accessTrailService.search(HESTI, { flaggedUnreasonable: true })).toHaveLength(1);
  });

  it('A17/A18: pengunggah nol akses; catatan wajib; hapus dulu baru tandai; gagal hapus = tetap AKTIF; ulang = 200', async () => {
    await expect(malwareService.search(UPLOADER, {})).rejects.toMatchObject({ status: 403 });
    await expect(malwareService.handle(HESTI, 'mw-0001', '   ')).rejects.toMatchObject({ status: 422 });
    malwareService.failDeleteFor('ver-23');
    await expect(malwareService.handle(HESTI, 'mw-0002', 'dibersihkan')).rejects.toMatchObject({ status: 500 });
    expect((await malwareService.search(HESTI, { malwareAlertState: 'AKTIF' })).map((row) => row.id)).toContain(
      'mw-0002',
    );
    const handled = await malwareService.handle(HESTI, 'mw-0001', 'Perangkat dibersihkan, berkas diunggah ulang');
    expect(handled.malwareAlertState).toBe('DITANGANI');
    expect(malwareService.isDeleted('ver-62')).toBe(true);
    await expect(malwareService.handle(RINA, 'mw-0001', 'ulang')).resolves.toMatchObject({
      malwareAlertState: 'DITANGANI',
    });
  });
});

describe('Pemeriksaan keaslian publik', () => {
  it('C2b/C2c: cocok hanya bila nama cocok; satu bentuk untuk semua sebab gagal; dibatalkan tanpa alasan', async () => {
    expect(await verifyService.byCode('K7M2-P4QX-9WTB', 'yanti prasetya')).toMatchObject({
      matched: true,
      letterState: 'BERLAKU',
    });
    expect(await verifyService.byCode('K7M2-P4QX-9WTB', 'Orang Lain')).toEqual({ matched: false });
    expect(await verifyService.byCode('ZZZZ-ZZZZ-ZZZZ', 'Yanti Prasetya')).toEqual({ matched: false });
    const cancelled = await verifyService.byNumber('002/HRD/VI/2026', 'Rina Wulandari');
    expect(cancelled).toMatchObject({ matched: true, letterState: 'DIBATALKAN' });
    expect(JSON.stringify(cancelled)).not.toContain('keliru');
    await expect(verifyService.byCode('bukan-kode', 'Yanti')).rejects.toMatchObject({ status: 400 });
    await expect(verifyService.byNumber('001/HRD/VIII/2026', 'Y')).rejects.toMatchObject({ status: 422 });
  });
});
