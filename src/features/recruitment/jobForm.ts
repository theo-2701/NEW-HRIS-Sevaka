import * as Yup from 'yup';
import type { CustomQuestion, FormFieldSetting, HiringProcess, JobDetails, JobListing } from '@/features/recruitment/types';

/**
 * Wizard Create Job Listing — opsi, nilai awal, dan validasi dari `_prototype/recruitment-create-job-listing.html`
 * + `js/recruitment-create.js`. Tanpa kontrak: batas panjang & minimum karakter diambil dari teks bantu prototype.
 */

const opts = (values: string[]) => values.map((value) => ({ value, label: value }));

export const OPTIONS = {
  position: opts(['Backend Engineer', 'Product Designer', 'Sales', 'Product Manager', 'DevOps Engineer', 'Finance Analyst', 'Supervisor', 'Content Writer', 'QA Engineer', 'CS Specialist', 'HR Generalist', 'Data Analyst', 'Graphic Designer', 'Recruiter']),
  branch: opts(['Jakarta HQ', 'Bandung', 'Surabaya', 'Bekasi', 'Remote']),
  province: opts(['DKI Jakarta', 'Jawa Barat', 'Jawa Timur']),
  city: opts(['Jakarta Selatan', 'Bandung', 'Surabaya', 'Bekasi']),
  organization: opts(['Engineering', 'Product', 'Commercial', 'Finance', 'Operations', 'Marketing', 'People']),
  employmentStatus: opts(['Permanent', 'Contract', 'Internship', 'Freelance']),
  workplaceType: opts(['On-site', 'Hybrid', 'Remote']),
  education: opts(['SMA / SMK', 'D3', 'S1', 'S2']),
  experienceLevel: opts(['Entry level', 'Associate', 'Mid-senior', 'Director']),
  gender: opts(['Any', 'Male', 'Female']),
  assessment: opts(['Cognitive ability test', 'English proficiency', 'Personality profile', 'Technical screening']),
  stageName: opts(['Assessment', 'Interview', 'Portfolio review', 'Reference check', 'Background check']),
  questionType: opts(['Short Answer', 'Paragraph', 'Yes/No', 'Dropdown', 'Multiple Choice', 'Checkbox', 'Date', 'Number', 'File Upload']),
  reapply: [1, 3, 6, 12].map((value) => ({ value: String(value), label: `${value} ${value === 1 ? 'month' : 'months'}` })),
};

export const STEPS = [
  { title: 'Job details' },
  { title: 'Application form' },
  { title: 'Hiring stage' },
  { title: 'Hiring team' },
  { title: 'Publication setting' },
];

export const CHOICE_TYPES = ['Dropdown', 'Multiple Choice', 'Checkbox'];
export const PLATFORMS = ['Career Page', 'LinkedIn', 'JobStreet', 'Indeed'];
export const TEAM_POOL = ['Tony Stark', 'Rina Dewi', 'Maya Lestari', 'Budi Hartono', 'Andi Pratama', 'Sari Kartika'];

export const TEAM_ROLES = [
  { key: 'recruiter', label: 'Recruiter', hint: 'Can move candidates, act as an assessor, and send offers.' },
  { key: 'manager', label: 'Hiring Manager', hint: 'Can be an assessor and takes part in the hiring decision.' },
  { key: 'interviewer', label: 'Interviewer', hint: 'Can be assigned to conduct interviews for this job.' },
] as const;

export const LIMITS = { title: 255, salaryDescription: 50, rich: 2500, summary: 150, description: 100, requirements: 200, benefits: 50 };

const field = (group: string, name: string, type: string, on: boolean, mandatory: boolean, locked = false): FormFieldSetting => ({
  group,
  name,
  type,
  on: locked || on,
  mandatory: locked || mandatory,
  locked,
});

/** Step 2 — field bawaan formulir lamaran (gembok = selalu aktif & wajib). */
export const defaultFormFields = (): FormFieldSetting[] => [
  field('Personal Information', 'First name', 'Short answer', true, true, true),
  field('Personal Information', 'Last name', 'Short answer', true, true, true),
  field('Personal Information', 'Email address', 'Short answer', true, true, true),
  field('Personal Information', 'Phone number', 'Short answer', true, true, true),
  field('Personal Information', 'Place of birth', 'Short answer', true, true),
  field('Personal Information', 'Date of birth', 'Short answer', true, true),
  field('Personal Information', 'Gender', 'Multiple choice', true, true),
  field('Personal Information', 'Marital status', 'Dropdown', true, true),
  field('Personal Information', 'Blood type', 'Dropdown', true, false),
  field('Personal Information', 'Religion', 'Dropdown', true, false),
  field('Identity & Address', 'NIK (16 digits)', 'Short answer', true, true),
  field('Identity & Address', 'Passport number', 'Short answer', false, false),
  field('Identity & Address', 'Passport expiration date', 'Date', false, false),
  field('Identity & Address', 'Postal code', 'Short answer', false, false),
  field('Identity & Address', 'Citizen ID address', 'Paragraph', true, true),
  field('Identity & Address', 'Residential address', 'Paragraph', true, true),
  field('Education & Work Experience', 'Formal education', 'More than one entry', true, false),
  field('Education & Work Experience', 'Informal education', 'More than one entry', true, false),
  field('Education & Work Experience', 'Work experience', 'More than one entry', true, false),
  field('Compensation', 'Current salary per month', 'Short answer', true, false),
  field('Compensation', 'Expected salary per month', 'Short answer', true, true),
  field('Attachment', 'Profile picture', 'File upload', true, true),
  field('Attachment', 'Portfolio', 'File upload', true, false),
  field('Attachment', 'Resume', 'File upload', true, true, true),
];

let seq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export const emptyQuestion = (): CustomQuestion => ({ id: newId('q'), question: '', type: 'Short Answer', description: '', required: true, options: ['', '', ''] });

/** Step 3 — proses "In process" bawaan; tahap New candidates, Screening, Job offer & Final status tetap. */
export const defaultProcesses = (): HiringProcess[] => [
  {
    id: newId('p'),
    name: 'Assessment',
    stages: [
      { id: newId('s'), name: 'Personality test', assessment: 'Personality profile' },
      { id: newId('s'), name: 'Skill test', assessment: 'Technical screening' },
      { id: newId('s'), name: 'Medical checkup', assessment: '' },
    ],
  },
  {
    id: newId('p'),
    name: 'Interview',
    stages: [
      { id: newId('s'), name: 'HR interview', assessment: '' },
      { id: newId('s'), name: 'User interview', assessment: '' },
      { id: newId('s'), name: 'Manager interview', assessment: '' },
    ],
  },
];

export const FIXED_STAGES = {
  screening: { title: 'Screening', description: 'Recent candidate profiles are reviewed.', stages: ['Candidate review'] },
  offer: { title: 'Job offer', description: 'Job offers are drafted, negotiated and finalized.', stages: ['Awaiting offer', 'Offer sent', 'Offer accepted'] },
  final: { title: 'Final status', description: 'The final decision on each candidate.', stages: ['Hired', 'Rejected', 'Archived', 'Spam', 'Blocked', 'Withdrawn'] },
};

export const emptyDetails = (): JobDetails => ({
  title: '',
  position: '',
  branch: '',
  province: '',
  city: '',
  organization: '',
  employmentStatus: '',
  workplaceType: '',
  headcount: 1,
  showHeadcount: false,
  salaryMin: 0,
  salaryMax: 0,
  showSalary: false,
  salaryDescription: '',
  description: '',
  requirements: '',
  benefits: '',
  summary: '',
  education: '',
  experienceLevel: '',
  minExperience: '',
  gender: 'Any',
  ageMin: 0,
  ageMax: 0,
  formFields: defaultFormFields(),
  questions: [],
  screeningAssessment: '',
  autoReject: false,
  autoRejectBelow: 70,
  autoRejectEmail: true,
  processes: defaultProcesses(),
  team: { recruiter: [], manager: [], interviewer: [] },
  publishedDate: '',
  noClosingDate: true,
  closingDate: '',
  autoClose: false,
  restrictOne: false,
  reapplyMonths: '6',
  platforms: [...PLATFORMS],
});

const PLACE: Record<string, [string, string]> = {
  'Jakarta HQ': ['DKI Jakarta', 'Jakarta Selatan'],
  Bandung: ['Jawa Barat', 'Bandung'],
  Surabaya: ['Jawa Timur', 'Surabaya'],
  Bekasi: ['Jawa Barat', 'Bekasi'],
  Remote: ['DKI Jakarta', 'Jakarta Selatan'],
};

/** Detail contoh untuk baris dataset dummy — teks memenuhi minimum karakter supaya bisa langsung diedit & diterbitkan. */
export function detailsFor(row: JobListing): JobDetails {
  const [province, city] = PLACE[row.branch] ?? ['DKI Jakarta', 'Jakarta Selatan'];
  const iso = (value: string | null) => (value ? value.slice(0, 10) : '');
  const closing = row.publishedAt && row.durationDays != null ? new Date(new Date(row.publishedAt).getTime() + row.durationDays * 86_400_000).toISOString() : null;
  return {
    ...emptyDetails(),
    title: row.title,
    position: row.position,
    branch: row.branch,
    province,
    city,
    organization: row.organization,
    employmentStatus: row.employmentStatus,
    workplaceType: row.workplaceType,
    headcount: row.headcount,
    salaryMin: 10_000_000,
    salaryMax: 18_000_000,
    salaryDescription: 'Gross monthly, excluding performance bonus',
    description: `As ${row.title} in our ${row.organization} team you own your work from planning to delivery, work closely with the people around you, and help the team ship reliable results every week.`,
    requirements: `At least two years of relevant experience as ${row.position}. You communicate clearly in Bahasa Indonesia and English, plan your own work, ask for help early, and are comfortable learning the tools and processes the ${row.organization} team already uses.`,
    benefits: 'BPJS Kesehatan and Ketenagakerjaan, private health insurance, yearly bonus, and 14 days of annual leave.',
    summary: `Join the ${row.organization} team in ${row.branch} as ${row.title}.`,
    education: 'S1',
    experienceLevel: 'Associate',
    minExperience: 2,
    ageMin: 21,
    ageMax: 35,
    team: { recruiter: row.hiringTeam.slice(0, 1), manager: row.hiringTeam.slice(1, 2), interviewer: row.hiringTeam.slice(2) },
    publishedDate: iso(row.publishedAt),
    noClosingDate: !closing,
    closingDate: iso(closing),
    platforms: row.platform ? row.platform.split(', ') : [...PLATFORMS],
  };
}

/** Bagian ringkasan daftar (tabel Job Listings) dari isi wizard. */
export function listingPatch(details: JobDetails): Partial<JobListing> {
  const days =
    !details.noClosingDate && details.publishedDate && details.closingDate
      ? Math.round((new Date(details.closingDate).getTime() - new Date(details.publishedDate).getTime()) / 86_400_000)
      : null;
  return {
    title: details.title.trim() || details.position,
    position: details.position,
    organization: details.organization,
    branch: details.branch,
    employmentStatus: details.employmentStatus,
    workplaceType: details.workplaceType || 'On-site',
    headcount: Number(details.headcount) || 1,
    platform: details.platforms.length ? details.platforms.join(', ') : null,
    durationDays: days,
    hiringTeam: [...new Set([...details.team.recruiter, ...details.team.manager, ...details.team.interviewer])],
  };
}

const text = (label: string, min: number, max: number) =>
  Yup.string()
    .trim()
    .required(`${label} is required.`)
    .min(min, `${label} needs at least ${min} characters.`)
    .max(max, `${label} can be at most ${max} characters.`);

export const step1Schema = Yup.object({
  title: Yup.string().max(LIMITS.title),
  position: Yup.string().required('Choose a job position.'),
  branch: Yup.string().required('Choose a branch location.'),
  province: Yup.string().required('Choose a province.'),
  city: Yup.string().required('Choose a city.'),
  organization: Yup.string().required('Choose an organization.'),
  employmentStatus: Yup.string().required('Choose an employment type.'),
  headcount: Yup.number().typeError('Enter a number.').min(1, 'At least 1 headcount.'),
  salaryMin: Yup.number().typeError('Enter a number.').min(1, 'Enter the lowest salary.'),
  salaryMax: Yup.number()
    .typeError('Enter a number.')
    .min(1, 'Enter the highest salary.')
    .test('range', 'Must be at least the lowest salary.', function check(value) {
      return value == null || value >= Number(this.parent.salaryMin);
    }),
  salaryDescription: Yup.string().trim().required('Salary description is required.').max(LIMITS.salaryDescription),
  description: text('Job description', LIMITS.description, LIMITS.rich),
  requirements: text('Job requirements', LIMITS.requirements, LIMITS.rich),
  benefits: text('Benefits', LIMITS.benefits, LIMITS.rich),
  summary: Yup.string().trim().required('Job summary is required.').max(LIMITS.summary),
  minExperience: Yup.number().typeError('Enter the minimum years.').required('Enter the minimum years.').min(0),
  ageMin: Yup.number().typeError('Enter a number.').min(15, 'At least 15 years.'),
  ageMax: Yup.number()
    .typeError('Enter a number.')
    .test('range', 'Must be at least the lowest age.', function check(value) {
      return value == null || value >= Number(this.parent.ageMin);
    }),
});

export const step3Schema = Yup.object({
  screeningAssessment: Yup.string().when('autoReject', {
    is: true,
    then: (schema) => schema.required('Choose the assessment used for auto-rejection.'),
  }),
});

export const step5Schema = Yup.object({
  publishedDate: Yup.string().required('Choose the published date.'),
  closingDate: Yup.string().when('noClosingDate', {
    is: false,
    then: (schema) =>
      schema.required('Choose the closing date.').test('after', 'Must be after the published date.', function check(value) {
        return !value || !this.parent.publishedDate || value > this.parent.publishedDate;
      }),
  }),
  platforms: Yup.array().min(1, 'Enable at least one platform.'),
});

export const publishSchema = step1Schema.concat(step3Schema).concat(step5Schema);
