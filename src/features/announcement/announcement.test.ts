import { beforeEach, describe, expect, it } from 'vitest';
import { announcementService, resetAnnouncementMocks } from '@/features/announcement/services/announcement.service';
import { htmlToText, textToHtml } from '@/features/announcement/content';
import type { AnnouncementDraft } from '@/features/announcement/types';

const draft: AnnouncementDraft = {
  title: 'Jadwal Libur Natal 2026',
  content: textToHtml('Kantor libur 25 Desember 2026.'),
  category: 'HOLIDAY',
  recipientRole: '',
};

beforeEach(() => resetAnnouncementMocks());

describe('Susun & sunting rancangan (UIC-COMPANY §3C.3)', () => {
  it('rancangan baru berstatus DRAFT dan peran penerima boleh kosong', async () => {
    const created = await announcementService.create(draft);
    expect(created).toMatchObject({ status: 'DRAFT', recipientRole: null, lastPublishedAt: null });
  });

  it('kategori di luar daftar tertutup ditolak 422', async () => {
    await expect(
      announcementService.create({ ...draft, category: 'NEWS' as AnnouncementDraft['category'] }),
    ).rejects.toThrow(/^422/);
  });

  it('isi dengan sumber daya luar ditolak 422, bukan dibersihkan diam-diam', async () => {
    await expect(
      announcementService.create({ ...draft, content: '<p>Lihat <img src="https://x.test/a.png"></p>' }),
    ).rejects.toThrow(/^422/);
  });

  it('sesudah terbit keempat medan beku → 422 menyebut medannya', async () => {
    await expect(announcementService.update('ann-libur-2027', { title: 'Ubah judul' })).rejects.toThrow(
      /422 — .*beku: title/,
    );
  });
});

describe('Terbitkan (UIC-COMPANY §3C.4)', () => {
  it('peran penerima kosong → 422, status tetap DRAFT', async () => {
    await expect(announcementService.publish('ann-kebijakan-wfh')).rejects.toThrow(/^422/);
    expect((await announcementService.get('ann-kebijakan-wfh')).status).toBe('DRAFT');
  });

  it('terbit menulis jejak dengan sidik isi SHA-256, lalu tidak bisa terbit ulang', async () => {
    await announcementService.update('ann-kebijakan-wfh', { recipientRole: 'ROLE_EMPLOYEE' });
    await announcementService.publish('ann-kebijakan-wfh');
    const detail = await announcementService.get('ann-kebijakan-wfh');
    expect(detail.status).toBe('PUBLISHED');
    expect(detail.publishLog).toHaveLength(1);
    expect(detail.publishLog[0].contentHash).toMatch(/^[0-9a-f]{64}$/);
    await expect(announcementService.publish('ann-kebijakan-wfh')).rejects.toThrow(/^422/);
  });
});

describe('Lampiran (UIC-COMPANY §3C.5)', () => {
  it('menautkan berkas Company Files tetap boleh sesudah terbit; duplikat 409; tak dikenal 422', async () => {
    await announcementService.attach('ann-libur-2027', 'doc-denah-kantor');
    expect((await announcementService.get('ann-libur-2027')).attachments).toHaveLength(2);
    await expect(announcementService.attach('ann-libur-2027', 'doc-denah-kantor')).rejects.toThrow(/^409/);
    await expect(announcementService.attach('ann-libur-2027', 'doc-tidak-ada')).rejects.toThrow(/^422/);
  });

  it('cabut = soft-delete; berkas yang sama bisa ditautkan lagi', async () => {
    const [first] = (await announcementService.get('ann-libur-2027')).attachments;
    await announcementService.detach('ann-libur-2027', first.attachmentId);
    expect((await announcementService.get('ann-libur-2027')).attachments).toHaveLength(0);
    await expect(announcementService.attach('ann-libur-2027', first.documentId)).resolves.toBeUndefined();
  });
});

describe('Baca karyawan (UIC-COMPANY §3C.6)', () => {
  it('hanya terbit untuk peran pemanggil, terbaru di atas', async () => {
    const rows = await announcementService.myList('ROLE_EMPLOYEE');
    expect(rows.map((row) => row.id)).toEqual(['ann-libur-2027', 'ann-townhall-q3']);
    expect(await announcementService.myList('ROLE_PAYROLL_OFFICER')).toEqual([]);
  });

  it('salah sasaran atau rancangan dijawab 404, bukan 403', async () => {
    await expect(announcementService.myGet('ROLE_EMPLOYEE', 'ann-prosedur-klaim')).rejects.toThrow(/^404/);
    await expect(announcementService.myGet('ROLE_DEPT_MANAGER', 'ann-evaluasi-tengah-tahun')).rejects.toThrow(/^404/);
  });
});

describe('Isi pengumuman', () => {
  it('teks → HTML ter-escape → teks kembali utuh', () => {
    const text = 'Baris <satu> & "dua"\n\nParagraf kedua';
    const html = textToHtml(text);
    expect(html).toBe('<p>Baris &lt;satu&gt; &amp; &quot;dua&quot;</p><p>Paragraf kedua</p>');
    expect(htmlToText(html)).toBe(text);
  });
});
