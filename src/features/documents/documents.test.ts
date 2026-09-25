import { beforeEach, describe, expect, it } from 'vitest';
import { documentService, resetDocumentMocks } from '@/features/documents/services/document.service';
import { VIEWERS } from '@/features/documents/mock-data';
import type { DocActor, DocRole } from '@/features/documents/types';

const as = (list: DocActor[], role: DocRole) => list.find((row) => row.role === role)!;
const HR_MANAGER = as(VIEWERS.employee, 'ROLE_HR_MANAGER');
const HR_STAFF = as(VIEWERS.employee, 'ROLE_HR_STAFF');
const DEPT = as(VIEWERS.employee, 'ROLE_DEPARTMENT_MANAGER');
const FINANCE = as(VIEWERS.employee, 'ROLE_FINANCE_OFFICER');
const GA = as(VIEWERS.other, 'ROLE_GA_STAFF');
const SUPER = as(VIEWERS.templates, 'ROLE_SUPER_ADMIN');
const HESTI = as(VIEWERS.templates, 'ROLE_HR_MANAGER');
const YANTI = VIEWERS.ess[0];

beforeEach(() => resetDocumentMocks());

describe('Katalog A3 — satu kontrak, beda owner_type', () => {
  it('Company Files hanya berkas perusahaan; GA Staff tidak punya akses', async () => {
    const rows = await documentService.search(VIEWERS.company[0], { ownerType: 'PERUSAHAAN' });
    expect(rows.every((row) => row.ownerType === 'PERUSAHAAN')).toBe(true);
    expect(rows.some((row) => row.documentId === 'doc-sk-libur-2027')).toBe(true);
    await expect(
      documentService.search(as(VIEWERS.company, 'ROLE_GA_STAFF'), { ownerType: 'PERUSAHAAN' }),
    ).rejects.toThrow(/403/);
  });

  it('Employee Files wajib owner_id; HR Staff tidak melihat berkas SENSITIF', async () => {
    await expect(documentService.search(HR_MANAGER, { ownerType: 'KARYAWAN' })).rejects.toThrow(/422/);
    const full = await documentService.search(HR_MANAGER, { ownerType: 'KARYAWAN', ownerId: 'emp-yanti' });
    expect(full.map((row) => row.documentId).sort()).toEqual(['dok-2', 'dok-4']);
    const staff = await documentService.search(HR_STAFF, { ownerType: 'KARYAWAN', ownerId: 'emp-yanti' });
    expect(staff.map((row) => row.documentId)).toEqual(['dok-4']);
  });

  it('Dept Manager hanya unit yang dipimpin (fail-closed → grid kosong)', async () => {
    expect(await documentService.search(DEPT, { ownerType: 'KARYAWAN', ownerId: 'emp-rina' })).toEqual([]);
    expect((await documentService.search(DEPT, { ownerType: 'KARYAWAN', ownerId: 'emp-yanti' })).length).toBe(2);
  });

  it('GA Staff hanya berkas aset & vendor; owner_object_kind di luar OBJEK_LAIN ditolak', async () => {
    const rows = await documentService.search(GA, { ownerType: 'OBJEK_LAIN' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.ownerObjectKind !== 'CABANG')).toBe(true);
    await expect(
      documentService.search(VIEWERS.company[0], { ownerType: 'PERUSAHAAN', ownerObjectKind: 'ASET' }),
    ).rejects.toThrow(/422/);
  });

  it('ESS: owner dari token, owner_id dilarang dikirim', async () => {
    const mine = await documentService.search(YANTI, { ownerType: 'KARYAWAN' });
    expect(mine.every((row) => row.ownerId === 'emp-yanti')).toBe(true);
    await expect(documentService.search(YANTI, { ownerType: 'KARYAWAN', ownerId: 'emp-yanti' })).rejects.toThrow(/422/);
  });
});

describe('A4 / A2 — 404 seragam dan jejak akses', () => {
  it('detail berkas orang lain = 404, detail tidak menulis jejak', async () => {
    await expect(documentService.detail(YANTI, 'dok-5')).rejects.toThrow(/404/);
    const detail = await documentService.detail(HR_MANAGER, 'dok-2');
    expect(detail.versions).toHaveLength(2);
    expect(detail.activeVersionId).toBe('ver-22');
    expect(documentService.accessLogFor('dok-2')).toHaveLength(0);
  });

  it('isi SENSITIF: HR Manager boleh (PER_PEMBUKAAN), Finance Officer 404', async () => {
    const content = await documentService.content(HR_MANAGER, 'dok-2');
    expect(content.confidentialityClass).toBe('SENSITIF');
    expect(documentService.accessLogFor('dok-2')[0].accessGranularity).toBe('PER_PEMBUKAAN');
    await expect(documentService.content(FINANCE, 'dok-2')).rejects.toThrow(/404/);
  });

  it('versi yang belum lulus pemeriksaan tidak dapat diambil', async () => {
    await expect(documentService.content(HR_MANAGER, 'dok-6')).rejects.toThrow(/404/);
  });
});

describe('Pustaka naskah A8/A9', () => {
  const draft = {
    templateName: 'Surat Keterangan Magang',
    categoryId: 'cat-skk',
    letterTarget: 'PERORANGAN' as const,
    signerScope: 'CABANG' as const,
    isSelfRequestable: false,
    requiresApproval: false,
    body: 'SURAT KETERANGAN MAGANG\nNama: %%nama_karyawan%%',
  };

  it('HR Staff nol akses; Super Admin tidak bisa membuat', async () => {
    await expect(documentService.templates(as(VIEWERS.templates, 'ROLE_HR_STAFF'))).rejects.toThrow(/403/);
    await expect(documentService.createTemplate(SUPER, draft)).rejects.toThrow(/403/);
  });

  it('toggle mandiri + wajib persetujuan ditolak; ungkapan mesin templat ditolak', async () => {
    await expect(
      documentService.createTemplate(HESTI, { ...draft, isSelfRequestable: true, requiresApproval: true }),
    ).rejects.toThrow(/422/);
    await expect(documentService.createTemplate(HESTI, { ...draft, body: 'Halo <% nama %>' })).rejects.toThrow(/422/);
  });

  it('v1 lahir menunggu; setuju menggeser penunjuk aktif; naskah baru tidak menggeser', async () => {
    const created = await documentService.createTemplate(HESTI, draft);
    expect(created.activeVersionNo).toBeNull();
    await documentService.decide(SUPER, created.id, 1, 'DISETUJUI');
    await documentService.addVersion(HESTI, created.id, 'SURAT KETERANGAN MAGANG v2\nNama: %%nama_karyawan%%');
    const detail = await documentService.template(SUPER, created.id);
    expect(detail.activeVersionNo).toBe(1);
    expect(detail.versions[0].templateVersionState).toBe('MENUNGGU_PERSETUJUAN');
  });

  it('tolak wajib alasan; versi yang sudah diputus tidak bisa diputus lagi', async () => {
    await expect(documentService.decide(SUPER, 'tpl-skk', 3, 'DITOLAK')).rejects.toThrow(/400/);
    await documentService.decide(SUPER, 'tpl-skk', 3, 'DITOLAK', 'Kop belum final');
    await expect(documentService.decide(SUPER, 'tpl-skk', 3, 'DISETUJUI')).rejects.toThrow(/422/);
  });

  it('nonaktifkan idempoten dan templat hilang dari daftar', async () => {
    expect((await documentService.deactivate(HESTI, 'tpl-sp')).changed).toBe(true);
    expect((await documentService.deactivate(HESTI, 'tpl-sp')).changed).toBe(false);
    expect((await documentService.templates(HESTI)).map((row) => row.id)).not.toContain('tpl-sp');
  });
});

describe('Minta surat mandiri A15/A10', () => {
  it('hanya templat mandiri berkategori TEMPORARY; SKK terbit seketika dan masuk katalog', async () => {
    const options = await documentService.issuableTemplates(YANTI);
    expect(options.map((row) => row.id)).toEqual(['tpl-skk']);
    const result = await documentService.requestLetter(YANTI, 'tpl-skk');
    expect(result.letterIssuanceState).toBe('TERBIT');
    const mine = await documentService.search(YANTI, { ownerType: 'KARYAWAN' });
    expect(mine.some((row) => row.documentId === result.documentId)).toBe(true);
    await expect(documentService.requestLetter(YANTI, 'tpl-sp')).rejects.toThrow(/422/);
  });
});
