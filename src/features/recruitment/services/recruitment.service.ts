import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { detailsFor, emptyDetails, listingPatch, OPTIONS, PLATFORMS } from '@/features/recruitment/jobForm';
import type {
  Candidate,
  CandidateInput,
  ImportLog,
  ImportRow,
  ImportStatus,
  Interview,
  JobDetails,
  JobFilter,
  JobListing,
  JobRecord,
  JobStatus,
  RecruitmentOverview,
} from '@/features/recruitment/types';

/**
 * Recruitment service — dataset dari `_prototype/recruitment-*.html`. Belum ada kontrak backend, jadi
 * alamat di cabang `api` hanya usulan (`/recruitment/...`, service code 313) dan wajib dicocokkan
 * dengan TSD saat terbit.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const TEAM = ['Tony Stark', 'Rina Dewi', 'Maya Lestari', 'Budi Hartono', 'Andi Pratama'];

const job = (input: Partial<JobListing> & Pick<JobListing, 'id' | 'title' | 'position' | 'organization' | 'branch' | 'status'>): JobListing => ({
  employmentStatus: 'Permanent',
  workplaceType: 'On-site',
  hired: 0,
  headcount: 1,
  newCandidates: 0,
  inProcess: 0,
  platform: null,
  publishedAt: null,
  durationDays: null,
  createdAt: daysAgo(30),
  createdBy: 'Sari Kartika',
  hiringTeam: TEAM.slice(0, 2),
  ...input,
});

const seed = (): JobListing[] => [
  job({ id: 'JL-1042', title: 'Senior Backend Engineer', position: 'Backend Engineer', organization: 'Engineering', branch: 'Jakarta HQ', status: 'PUBLISHED', headcount: 2, newCandidates: 12, inProcess: 5, platform: 'Career Page', publishedAt: daysAgo(16), durationDays: 30, createdAt: daysAgo(18), workplaceType: 'Hybrid', hiringTeam: ['Tony Stark', 'Rina Dewi', 'Andi Pratama'] }),
  job({ id: 'JL-1039', title: 'UI/UX Designer', position: 'Product Designer', organization: 'Product', branch: 'Bandung', status: 'PUBLISHED', newCandidates: 8, inProcess: 3, platform: 'Career Page', publishedAt: daysAgo(25), durationDays: 30, createdAt: daysAgo(27), hiringTeam: ['Maya Lestari'] }),
  job({ id: 'JL-1051', title: 'Sales Executive', position: 'Sales', organization: 'Commercial', branch: 'Surabaya', status: 'PUBLISHED', headcount: 4, newCandidates: 24, inProcess: 9, platform: 'LinkedIn', publishedAt: daysAgo(8), durationDays: 30, createdAt: daysAgo(9), employmentStatus: 'Contract' }),
  job({ id: 'JL-1033', title: 'Product Manager', position: 'Product Manager', organization: 'Product', branch: 'Jakarta HQ', status: 'PUBLISHED', newCandidates: 6, inProcess: 2, platform: 'Career Page', publishedAt: daysAgo(27), durationDays: 30, createdAt: daysAgo(29), hiringTeam: ['Tony Stark', 'Budi Hartono', 'Rina Dewi', 'Maya Lestari'] }),
  job({ id: 'JL-1047', title: 'DevOps Engineer', position: 'DevOps Engineer', organization: 'Engineering', branch: 'Remote', status: 'PUBLISHED', headcount: 2, newCandidates: 15, inProcess: 4, platform: 'JobStreet', publishedAt: daysAgo(14), durationDays: 30, createdAt: daysAgo(16), workplaceType: 'Remote' }),
  job({ id: 'JL-1058', title: 'Finance Analyst', position: 'Finance Analyst', organization: 'Finance', branch: 'Jakarta HQ', status: 'DRAFT', createdAt: daysAgo(3) }),
  job({ id: 'JL-1060', title: 'Warehouse Supervisor', position: 'Supervisor', organization: 'Operations', branch: 'Bekasi', status: 'DRAFT', headcount: 2, createdAt: daysAgo(2) }),
  job({ id: 'JL-1025', title: 'Content Writer', position: 'Content Writer', organization: 'Marketing', branch: 'Bandung', status: 'UNPUBLISHED', newCandidates: 4, inProcess: 1, platform: 'Career Page', createdAt: daysAgo(40), employmentStatus: 'Freelance' }),
  job({ id: 'JL-1029', title: 'QA Engineer', position: 'QA Engineer', organization: 'Engineering', branch: 'Remote', status: 'UNPUBLISHED', headcount: 2, newCandidates: 7, inProcess: 2, platform: 'Career Page', createdAt: daysAgo(38), workplaceType: 'Remote' }),
  job({ id: 'JL-1031', title: 'Customer Success', position: 'CS Specialist', organization: 'Commercial', branch: 'Surabaya', status: 'UNPUBLISHED', newCandidates: 5, platform: 'LinkedIn', createdAt: daysAgo(37) }),
  job({ id: 'JL-0998', title: 'HR Generalist', position: 'HR Generalist', organization: 'People', branch: 'Jakarta HQ', status: 'CLOSED', hired: 1, newCandidates: 31, platform: 'Career Page', publishedAt: daysAgo(66), durationDays: 30, createdAt: daysAgo(67) }),
  job({ id: 'JL-1003', title: 'Data Analyst', position: 'Data Analyst', organization: 'Engineering', branch: 'Jakarta HQ', status: 'CLOSED', hired: 2, headcount: 2, newCandidates: 44, platform: 'LinkedIn', publishedAt: daysAgo(63), durationDays: 28, createdAt: daysAgo(65) }),
  job({ id: 'JL-1010', title: 'Graphic Designer', position: 'Graphic Designer', organization: 'Marketing', branch: 'Bandung', status: 'CLOSED', hired: 1, newCandidates: 18, platform: 'Career Page', publishedAt: daysAgo(58), durationDays: 25, createdAt: daysAgo(60), employmentStatus: 'Internship' }),
  job({ id: 'JL-1014', title: 'Recruiter', position: 'Recruiter', organization: 'People', branch: 'Jakarta HQ', status: 'CLOSED', hired: 1, newCandidates: 22, platform: 'JobStreet', publishedAt: daysAgo(56), durationDays: 26, createdAt: daysAgo(58) }),
];

let store = seed();
/** Isi wizard per lowongan; baris dataset tanpa isi memakai `detailsFor()`. */
let detailStore = new Map<string, JobDetails>();

/** Tiga log contoh dari `_prototype/recruitment-import-logs.html`. */
const seedLogs = (): ImportLog[] => [
  {
    id: 'IMP-20261027-014',
    uploadedAt: daysAgo(1),
    uploadedBy: 'Maya Lestari',
    fileName: 'job-listings-batch-3.csv',
    sizeKb: 42,
    status: 'COMPLETED',
    rows: [{ title: 'Senior Backend Engineer', position: 'Backend Engineer', organization: 'Engineering', branch: 'Jakarta HQ', employmentStatus: 'Permanent', workplaceType: 'Hybrid', headcount: 2 }],
    errors: [],
  },
  {
    id: 'IMP-20261025-009',
    uploadedAt: daysAgo(3),
    uploadedBy: 'Rina Dewi',
    fileName: 'q3-openings.csv',
    sizeKb: 61,
    status: 'FAILED',
    rows: [],
    errors: ['Row 1: branch "Pusat" not found', 'Row 1: organization "Head Office" not found', 'Row 1: employment status "Full Time" not found', 'Row 2: branch "Pusat" not found', 'Row 2: organization "Technology Division" not found'],
  },
  {
    id: 'IMP-20261021-002',
    uploadedAt: daysAgo(7),
    uploadedBy: 'Sari Kartika',
    fileName: 'engineering-roles.csv',
    sizeKb: 38,
    status: 'FAILED',
    rows: [],
    errors: ['Row 3: headcount "two" must be a whole number of at least 1'],
  },
];

let logs = seedLogs();
let candidates: Candidate[] = [];

/** Jadwal wawancara relatif terhadap hari ini supaya demo "Today" selalu berisi. */
function seedInterviews(): Interview[] {
  const at = (dayOffset: number, hh: number, mm: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };
  return [
    { id: 'iv-1', candidateName: 'Arif Wibowo', jobTitle: 'Backend Engineer', stage: 'TECHNICAL', startAt: at(0, 9, 30), durationMin: 45, online: true, place: 'Google Meet', meetingUrl: 'https://meet.google.com/', interviewers: ['Tony Stark', 'Rina Dewi'] },
    { id: 'iv-2', candidateName: 'Salsabila Putri', jobTitle: 'UI/UX Designer', stage: 'HR_SCREENING', startAt: at(0, 11, 0), durationMin: 30, online: false, place: 'Meeting Room 3', meetingUrl: null, interviewers: ['Maya Lestari'] },
    { id: 'iv-3', candidateName: 'Reza Fahlevi', jobTitle: 'Sales Executive', stage: 'FINAL', startAt: at(0, 14, 0), durationMin: 60, online: true, place: 'Zoom', meetingUrl: 'https://zoom.us/', interviewers: ['Tony Stark', 'Budi Hartono', 'Andi Pratama'] },
    { id: 'iv-4', candidateName: 'Dinda Maharani', jobTitle: 'Product Manager', stage: 'PANEL', startAt: at(1, 10, 0), durationMin: 45, online: false, place: 'HQ · Level 8', meetingUrl: null, interviewers: ['Tony Stark', 'Rina Dewi', 'Maya Lestari', 'Budi Hartono'] },
    { id: 'iv-5', candidateName: 'Bagus Santoso', jobTitle: 'DevOps Engineer', stage: 'TECHNICAL', startAt: at(1, 13, 30), durationMin: 30, online: true, place: 'Google Meet', meetingUrl: 'https://meet.google.com/', interviewers: ['Andi Pratama', 'Maya Lestari'] },
    { id: 'iv-6', candidateName: 'Clara Wijaya', jobTitle: 'Content Writer', stage: 'HR_SCREENING', startAt: at(3, 9, 0), durationMin: 30, online: true, place: 'Google Meet', meetingUrl: 'https://meet.google.com/', interviewers: ['Rina Dewi'] },
  ];
}

const anyOf = (picked: string[] | undefined, value: string) => !picked?.length || picked.includes(value);

/** Lowongan tayang yang tutup dalam 7 hari ke depan. */
export const CLOSING_SOON_DAYS = 7;
/** Lowongan tayang dengan pelamar baru di bawah angka ini dianggap kurang diminati. */
export const LOW_PERFORMANCE_BELOW = 10;

export function closesAt(row: JobListing): Date | null {
  if (!row.publishedAt || row.durationDays == null) return null;
  return new Date(new Date(row.publishedAt).getTime() + row.durationDays * DAY);
}

export function filterJobs(rows: JobListing[], filter: JobFilter): JobListing[] {
  const keyword = (filter.keyword ?? '').trim().toLowerCase();
  return rows
    .filter(
      (row) =>
        (!filter.status || row.status === filter.status) &&
        anyOf(filter.branch, row.branch) &&
        anyOf(filter.organization, row.organization) &&
        anyOf(filter.employmentStatus, row.employmentStatus) &&
        anyOf(filter.workplaceType, row.workplaceType) &&
        (!filter.platform?.length || filter.platform.some((name) => (row.platform ?? '').split(', ').includes(name))) &&
        (!filter.hiringTeam?.length || row.hiringTeam.some((name) => filter.hiringTeam!.includes(name))) &&
        (!keyword || [row.title, row.id, row.position].some((value) => value.toLowerCase().includes(keyword))),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function overviewOf(rows: JobListing[], now = Date.now()): Pick<RecruitmentOverview, 'closingSoon' | 'inDraft' | 'lowPerformance'> {
  const live = rows.filter((row) => row.status === 'PUBLISHED');
  return {
    closingSoon: live.filter((row) => {
      const end = closesAt(row)?.getTime();
      return end != null && end >= now && end - now <= CLOSING_SOON_DAYS * DAY;
    }).length,
    inDraft: rows.filter((row) => row.status === 'DRAFT').length,
    lowPerformance: live.filter((row) => row.newCandidates < LOW_PERFORMANCE_BELOW).length,
  };
}

function find(id: string) {
  const row = store.find((item) => item.id === id);
  if (!row) throw new Error('Job listing not found.');
  return row;
}

const nextId = () => `JL-${Math.max(...store.map((row) => Number(row.id.slice(3)))) + 1}`;

/** `File.text()` belum ada di jsdom (tes); FileReader jalan di keduanya. */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsText(file);
  });

export const recruitmentService = {
  async jobs(filter: JobFilter = {}): Promise<JobListing[]> {
    if (MOCK) {
      await delay();
      return filterJobs(store, filter).map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: JobListing[] }>('/recruitment/job-listings/search', { ...filter, page: 1, size: 100 });
    return data.data;
  },

  async overview(): Promise<RecruitmentOverview> {
    if (MOCK) {
      await delay();
      // ponytail: tiga angka kandidat masih tetap — hitung dari data kandidat begitu menu Candidates dibangun.
      return { newCandidates: 10, unscheduledInterviews: 7, unresponsiveOffers: 3, ...overviewOf(store) };
    }
    const { data } = await api.get<{ data: RecruitmentOverview }>('/recruitment/overview');
    return data.data;
  },

  async interviews(): Promise<Interview[]> {
    if (MOCK) {
      await delay();
      return seedInterviews();
    }
    const { data } = await api.get<{ data: Interview[] }>('/recruitment/interviews/upcoming');
    return data.data;
  },

  /** Publish · Unpublish · Close · Reopen · Submit (draft → published). */
  async setStatus(id: string, status: JobStatus): Promise<JobListing> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (status === 'PUBLISHED' && (!row.publishedAt || row.status === 'CLOSED')) {
        row.publishedAt = new Date().toISOString();
        row.durationDays = row.durationDays ?? 30;
        row.platform = row.platform ?? 'Career Page';
      }
      row.status = status;
      return { ...row };
    }
    const { data } = await api.patch<{ data: JobListing }>(`/recruitment/job-listings/${id}/status`, { status });
    return data.data;
  },

  async get(id: string): Promise<JobRecord> {
    if (MOCK) {
      await delay();
      const listing = find(id);
      return { listing: { ...listing }, details: structuredClone(detailStore.get(id) ?? detailsFor(listing)) };
    }
    const { data } = await api.get<{ data: JobRecord }>(`/recruitment/job-listings/${id}`);
    return data.data;
  },

  /**
   * Simpan isi wizard. `publish=false` = Save As Draft (lowongan baru jadi DRAFT, lowongan lama tetap
   * statusnya); `publish=true` = terbitkan dengan tanggal tayang dari Step 5.
   */
  async save(id: string | null, details: JobDetails, publish: boolean): Promise<JobListing> {
    if (MOCK) {
      await delay();
      const patch = listingPatch(details);
      let row: JobListing;
      if (id) {
        row = find(id);
        Object.assign(row, patch);
      } else {
        row = {
          ...job({ id: nextId(), title: '', position: '', organization: '', branch: '', status: 'DRAFT', createdAt: new Date().toISOString() }),
          ...patch,
        };
        store = [row, ...store];
      }
      if (publish) {
        row.status = 'PUBLISHED';
        row.publishedAt = new Date(details.publishedDate).toISOString();
      } else if (row.status === 'PUBLISHED' && details.publishedDate) {
        row.publishedAt = new Date(details.publishedDate).toISOString();
      }
      detailStore.set(row.id, structuredClone(details));
      return { ...row };
    }
    const body = { ...details, publish };
    const { data } = id
      ? await api.put<{ data: JobListing }>(`/recruitment/job-listings/${id}`, body)
      : await api.post<{ data: JobListing }>('/recruitment/job-listings', body);
    return data.data;
  },

  async duplicate(id: string): Promise<JobListing> {
    if (MOCK) {
      await delay();
      const source = find(id);
      const copy: JobListing = {
        ...source,
        id: nextId(),
        title: `${source.title} (copy)`,
        status: 'DRAFT',
        hired: 0,
        newCandidates: 0,
        inProcess: 0,
        publishedAt: null,
        durationDays: null,
        platform: null,
        createdAt: new Date().toISOString(),
      };
      const details = structuredClone(detailStore.get(id) ?? detailsFor(source));
      detailStore.set(copy.id, { ...details, title: copy.title, publishedDate: '', closingDate: '', noClosingDate: true });
      store = [copy, ...store];
      return { ...copy };
    }
    const { data } = await api.post<{ data: JobListing }>(`/recruitment/job-listings/${id}/duplicate`);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      if (find(id).status === 'PUBLISHED') throw new Error('Unpublish the job listing before deleting it.');
      store = store.filter((row) => row.id !== id);
      return;
    }
    await api.delete(`/recruitment/job-listings/${id}`);
  },

  /**
   * Unggah CSV. Mode dummy membaca berkasnya sungguhan: semua baris valid → masing-masing jadi DRAFT dan log
   * Completed; satu saja baris salah → tidak ada yang disimpan dan log Failed berisi daftar galatnya.
   */
  async importJobs(file: File): Promise<ImportLog> {
    if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('The file must be a CSV file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('The file is larger than 5 MB.');
    if (MOCK) {
      await delay();
      const { rows, errors } = parseImport(await readText(file));
      const log: ImportLog = {
        id: `IMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(logs.length + 1).padStart(3, '0')}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Sari Kartika',
        fileName: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        status: errors.length ? 'FAILED' : 'COMPLETED',
        rows: errors.length ? [] : rows,
        errors,
      };
      if (!errors.length) {
        for (const row of rows) {
          const id = nextId();
          store = [job({ ...row, id, status: 'DRAFT', createdAt: new Date().toISOString() }), ...store];
          detailStore.set(id, { ...emptyDetails(), ...row, title: row.title });
        }
      }
      logs = [log, ...logs];
      return { ...log };
    }
    const body = new FormData();
    body.append('file', file);
    const { data } = await api.post<{ data: ImportLog }>('/recruitment/job-listings/import', body);
    return data.data;
  },

  async importLogs(status?: ImportStatus): Promise<ImportLog[]> {
    if (MOCK) {
      await delay();
      return logs.filter((log) => !status || log.status === status).map((log) => ({ ...log }));
    }
    const { data } = await api.get<{ data: ImportLog[] }>('/recruitment/job-listings/import-logs', { params: { status } });
    return data.data;
  },

  async importLog(id: string): Promise<ImportLog> {
    if (MOCK) {
      await delay();
      const log = logs.find((item) => item.id === id);
      if (!log) throw new Error('Import log not found.');
      return { ...log };
    }
    const { data } = await api.get<{ data: ImportLog }>(`/recruitment/job-listings/import-logs/${id}`);
    return data.data;
  },

  /**
   * Add Candidate (tambah manual oleh HR). Lowongan dengan "one application per candidate" menolak email yang
   * sama dalam masa tunggu `reapplyMonths`.
   */
  async addCandidate(input: CandidateInput): Promise<Candidate> {
    if (MOCK) {
      await delay();
      const listing = find(input.jobId);
      const details = detailStore.get(input.jobId) ?? detailsFor(listing);
      const email = input.email.trim().toLowerCase();
      if (details.restrictOne) {
        const since = new Date();
        since.setMonth(since.getMonth() - Number(details.reapplyMonths));
        const earlier = candidates.find((row) => row.jobId === input.jobId && row.email.toLowerCase() === email && new Date(row.createdAt) > since);
        if (earlier) throw new Error(`${input.email} already applied for this job. They can apply again after ${details.reapplyMonths} months.`);
      }
      const candidate: Candidate = { ...structuredClone(input), email, id: `cand-${candidates.length + 1}`, createdAt: new Date().toISOString() };
      candidates = [candidate, ...candidates];
      if (input.stage === 'New candidates') listing.newCandidates += 1;
      else listing.inProcess += 1;
      return candidate;
    }
    const { data } = await api.post<{ data: Candidate }>(`/recruitment/job-listings/${input.jobId}/candidates`, input);
    return data.data;
  },
};

/** Kolom templat CSV (urutan sama dengan tombol Download Template). */
export const IMPORT_COLUMNS = ['job_listing_title', 'job_position', 'organization', 'branch', 'employment_status', 'workplace_type', 'headcount'] as const;

/** Baca CSV impor dan periksa nilainya terhadap master data (opsi wizard). Nomor baris dihitung tanpa header. */
export function parseImport(text: string): { rows: ImportRow[]; errors: string[] } {
  // ponytail: pemisah koma sederhana tanpa tanda kutip — pakai parser CSV bila templat resmi butuh koma di dalam sel.
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = (lines.shift() ?? '').split(',').map((cell) => cell.trim().toLowerCase());
  const missing = IMPORT_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length) return { rows: [], errors: [`Missing column: ${missing.join(', ')}. Download the template and try again.`] };
  if (!lines.length) return { rows: [], errors: ['The file has no job listing rows.'] };

  const known = (list: { value: string }[], value: string) => list.some((item) => item.value.toLowerCase() === value.toLowerCase());
  const pick = (list: { value: string }[], value: string) => list.find((item) => item.value.toLowerCase() === value.toLowerCase())?.value ?? value;
  const errors: string[] = [];
  const rows = lines.map((line, i) => {
    const cells = line.split(',').map((cell) => cell.trim());
    const at = (column: (typeof IMPORT_COLUMNS)[number]) => cells[header.indexOf(column)] ?? '';
    const n = i + 1;
    const checks: [string, { value: string }[], string][] = [
      ['job position', OPTIONS.position, at('job_position')],
      ['organization', OPTIONS.organization, at('organization')],
      ['branch', OPTIONS.branch, at('branch')],
      ['employment status', OPTIONS.employmentStatus, at('employment_status')],
    ];
    for (const [label, list, value] of checks) {
      if (!value) errors.push(`Row ${n}: ${label} is empty`);
      else if (!known(list, value)) errors.push(`Row ${n}: ${label} "${value}" not found`);
    }
    const workplace = at('workplace_type');
    if (workplace && !known(OPTIONS.workplaceType, workplace)) errors.push(`Row ${n}: workplace type "${workplace}" not found`);
    const headcount = Number(at('headcount') || 1);
    if (!Number.isInteger(headcount) || headcount < 1) errors.push(`Row ${n}: headcount "${at('headcount')}" must be a whole number of at least 1`);
    return {
      title: at('job_listing_title') || pick(OPTIONS.position, at('job_position')),
      position: pick(OPTIONS.position, at('job_position')),
      organization: pick(OPTIONS.organization, at('organization')),
      branch: pick(OPTIONS.branch, at('branch')),
      employmentStatus: pick(OPTIONS.employmentStatus, at('employment_status')),
      workplaceType: workplace ? pick(OPTIONS.workplaceType, workplace) : 'On-site',
      headcount,
    };
  });
  return { rows, errors };
}

/** Opsi filter diambil dari data contoh (Hiring team memakai daftar tim tetap). */
export const FILTER_OPTIONS = {
  branch: ['Jakarta HQ', 'Bandung', 'Surabaya', 'Bekasi', 'Remote'],
  organization: ['Engineering', 'Product', 'Commercial', 'Finance', 'Operations', 'Marketing', 'People'],
  employmentStatus: ['Permanent', 'Contract', 'Internship', 'Freelance'],
  workplaceType: ['On-site', 'Hybrid', 'Remote'],
  platform: PLATFORMS,
  hiringTeam: TEAM,
};

export const __resetRecruitmentMock = () => {
  store = seed();
  detailStore = new Map();
  logs = seedLogs();
  candidates = [];
};
