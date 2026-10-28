import { beforeEach, describe, expect, it } from 'vitest';
import { __resetRecruitmentMock, IMPORT_COLUMNS, recruitmentService } from '@/features/recruitment/services/recruitment.service';
import { emptyDetails, publishSchema } from '@/features/recruitment/jobForm';
import type { CandidateInput } from '@/features/recruitment/types';

describe('recruitment service (mock)', () => {
  beforeEach(() => __resetRecruitmentMock());

  it('filters job listings by status, multi-select and keyword', async () => {
    expect(await recruitmentService.jobs({ status: 'DRAFT' })).toHaveLength(2);
    const remote = await recruitmentService.jobs({ branch: ['Remote'] });
    expect(remote.map((row) => row.id).sort()).toEqual(['JL-1029', 'JL-1047']);
    expect(await recruitmentService.jobs({ keyword: 'jl-1042' })).toHaveLength(1);
  });

  it('counts the job openings overview from the listings', async () => {
    const overview = await recruitmentService.overview();
    expect(overview.inDraft).toBe(2);
    // Published 25 & 27 hari lalu dengan masa tayang 30 hari → tutup ≤ 7 hari lagi.
    expect(overview.closingSoon).toBe(2);
    expect(overview.lowPerformance).toBe(2);
  });

  it('keeps published listings from being deleted and restarts a reopened one', async () => {
    await expect(recruitmentService.remove('JL-1042')).rejects.toThrow(/Unpublish/);
    const reopened = await recruitmentService.setStatus('JL-0998', 'PUBLISHED');
    expect(Date.now() - new Date(reopened.publishedAt!).getTime()).toBeLessThan(5_000);
    const copy = await recruitmentService.duplicate('JL-1042');
    expect(copy).toMatchObject({ status: 'DRAFT', newCandidates: 0, publishedAt: null });
  });

  it('saves the wizard as draft or published and keeps the details', async () => {
    const seeded = await recruitmentService.get('JL-1058');
    // Detail contoh harus lolos validasi Publish supaya baris dummy bisa langsung diterbitkan.
    await expect(publishSchema.validate({ ...seeded.details, publishedDate: '2026-11-01' })).resolves.toBeTruthy();

    const draft = await recruitmentService.save(null, { ...emptyDetails(), position: 'Recruiter', branch: 'Bandung' }, false);
    expect(draft).toMatchObject({ status: 'DRAFT', title: 'Recruiter', publishedAt: null });

    const details = { ...seeded.details, publishedDate: '2026-11-01', noClosingDate: false, closingDate: '2026-12-01', platforms: ['LinkedIn'] };
    const live = await recruitmentService.save('JL-1058', details, true);
    expect(live).toMatchObject({ status: 'PUBLISHED', durationDays: 30, platform: 'LinkedIn' });
    expect((await recruitmentService.get('JL-1058')).details.closingDate).toBe('2026-12-01');
  });

  it('blocks publishing an incomplete job listing', async () => {
    await expect(publishSchema.validate({ ...emptyDetails(), position: 'Recruiter' }, { abortEarly: false })).rejects.toThrow();
  });

  it('imports valid CSV rows as drafts and fails the whole file on any bad row', async () => {
    const header = IMPORT_COLUMNS.join(',');
    const ok = new File([`${header}\nQA Lead,QA Engineer,engineering,Bandung,Contract,remote,2\n`], 'ok.csv', { type: 'text/csv' });
    const log = await recruitmentService.importJobs(ok);
    expect(log).toMatchObject({ status: 'COMPLETED', errors: [] });
    expect(log.rows[0]).toMatchObject({ organization: 'Engineering', workplaceType: 'Remote', headcount: 2 });
    expect((await recruitmentService.jobs({ keyword: 'QA Lead' }))[0].status).toBe('DRAFT');

    const bad = new File([`${header}\nA,QA Engineer,Engineering,Pusat,Contract,,1\nB,QA Engineer,Engineering,Bandung,Full Time,,0\n`], 'bad.csv');
    const failed = await recruitmentService.importJobs(bad);
    expect(failed.status).toBe('FAILED');
    expect(failed.errors).toEqual([
      'Row 1: branch "Pusat" not found',
      'Row 2: employment status "Full Time" not found',
      'Row 2: headcount "0" must be a whole number of at least 1',
    ]);
    expect(await recruitmentService.jobs({ keyword: 'QA Engineer', status: 'DRAFT' })).toHaveLength(1);
    expect((await recruitmentService.importLogs('FAILED')).length).toBe(3);
  });

  it('adds a candidate and enforces one application per candidate', async () => {
    const id = 'JL-1039';
    const record = await recruitmentService.get(id);
    await recruitmentService.save(id, { ...record.details, restrictOne: true, reapplyMonths: '6' }, false);
    const input = { jobId: id, stage: 'New candidates', firstName: 'Ayu', lastName: 'Lestari', email: 'Ayu@mail.com' } as CandidateInput;
    await recruitmentService.addCandidate(input);
    expect((await recruitmentService.get(id)).listing.newCandidates).toBe(9);
    await expect(recruitmentService.addCandidate({ ...input, email: 'ayu@MAIL.com' })).rejects.toThrow(/already applied/);
  });
});
