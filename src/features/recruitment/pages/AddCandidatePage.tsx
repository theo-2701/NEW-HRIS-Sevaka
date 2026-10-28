import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Formik, useField, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Info, Pencil } from 'lucide-react';
import { Card, EmptyState } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { AddButton, RemoveRowButton } from '@/components/RowActions';
import { DateField } from '@/components/form/DateField';
import { FormField } from '@/components/form/FormField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { useAddCandidate, useJobListing } from '@/features/recruitment/hooks/useRecruitment';
import { newId } from '@/features/recruitment/jobForm';
import type { CandidateEntry, CandidateInput, FormFieldSetting, JobDetails } from '@/features/recruitment/types';

const opts = (values: string[]) => values.map((value) => ({ value, label: value }));
const OPT = {
  gender: opts(['Male', 'Female']),
  marital: opts(['Single', 'Married', 'Divorced', 'Widowed']),
  blood: opts(['A', 'B', 'AB', 'O', 'Other']),
  religion: opts(['Islam', 'Catholicism', 'Protestantism', 'Hinduism', 'Buddhism', 'Confucianism', 'Other']),
  degree: opts(['Senior High School', 'Diploma 3 (D3)', 'Diploma 4 (D4)', 'Bachelor Degree (S1)', 'Master Degree (S2)', 'Doctoral Degree (S3)']),
  year: opts(Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() + 4 - i))),
};

type Key = keyof CandidateInput;
type Kind = 'text' | 'email' | 'tel' | 'number' | 'date' | 'area' | 'file' | 'entries' | keyof typeof OPT;

/**
 * Nama field Step 2 (Application form) → field formulir kandidat. Field yang dimatikan di lowongan tidak tampil,
 * dan tanda wajib mengikuti centang Mandatory-nya.
 */
const FIELD_MAP: Record<string, { key: Key; kind: Kind; placeholder?: string }> = {
  'First name': { key: 'firstName', kind: 'text', placeholder: 'e.g. John' },
  'Last name': { key: 'lastName', kind: 'text', placeholder: 'e.g. Calvin' },
  'Email address': { key: 'email', kind: 'email', placeholder: 'you@example.com' },
  'Phone number': { key: 'phone', kind: 'tel', placeholder: '0812 3456 7890' },
  'Place of birth': { key: 'placeOfBirth', kind: 'text', placeholder: 'e.g. Jakarta' },
  'Date of birth': { key: 'dateOfBirth', kind: 'date' },
  Gender: { key: 'gender', kind: 'gender' },
  'Marital status': { key: 'maritalStatus', kind: 'marital' },
  'Blood type': { key: 'bloodType', kind: 'blood' },
  Religion: { key: 'religion', kind: 'religion' },
  'NIK (16 digits)': { key: 'nik', kind: 'text', placeholder: '16 digits' },
  'Passport number': { key: 'passportNumber', kind: 'text' },
  'Passport expiration date': { key: 'passportExpiry', kind: 'date' },
  'Postal code': { key: 'postalCode', kind: 'text' },
  'Citizen ID address': { key: 'citizenAddress', kind: 'area', placeholder: 'Input the citizen ID address here' },
  'Residential address': { key: 'residentialAddress', kind: 'area', placeholder: 'Input the residential address here' },
  'Formal education': { key: 'formalEducation', kind: 'entries' },
  'Informal education': { key: 'informalEducation', kind: 'entries' },
  'Work experience': { key: 'workExperience', kind: 'entries' },
  'Current salary per month': { key: 'currentSalary', kind: 'number', placeholder: '0' },
  'Expected salary per month': { key: 'expectedSalary', kind: 'number', placeholder: '0' },
  'Profile picture': { key: 'profilePicture', kind: 'file' },
  Portfolio: { key: 'portfolio', kind: 'file' },
  Resume: { key: 'resume', kind: 'file' },
};

const SECTION_TITLE: Record<string, string> = {
  'Personal Information': 'Personal information',
  'Identity & Address': 'Identity & address',
  'Education & Work Experience': 'Education & work experience',
  Compensation: 'Compensation',
  Attachment: 'Documents',
};

const empty = (jobId: string, stage: string): CandidateInput => ({
  jobId,
  stage,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  placeOfBirth: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  bloodType: '',
  religion: '',
  nik: '',
  passportNumber: '',
  passportExpiry: '',
  postalCode: '',
  citizenAddress: '',
  residentialAddress: '',
  sameAddress: false,
  formalEducation: [],
  informalEducation: [],
  workExperience: [],
  currentSalary: '',
  expectedSalary: '',
  profilePicture: '',
  portfolioMode: 'file',
  portfolio: '',
  resume: '',
  notes: '',
});

const FORMAT: Partial<Record<Key, Yup.AnySchema>> = {
  email: Yup.string().trim().email('Enter a valid email address.'),
  phone: Yup.string().matches(/^\+?[\d\s-]{8,16}$/, { message: 'Enter a valid phone number.', excludeEmptyString: true }),
  nik: Yup.string().matches(/^\d{16}$/, { message: 'NIK must be 16 digits.', excludeEmptyString: true }),
  currentSalary: Yup.number().typeError('Enter a number.').min(0),
  expectedSalary: Yup.number().typeError('Enter a number.').min(0),
};

function schemaFor(fields: FormFieldSetting[]) {
  const shape: Record<string, Yup.AnySchema> = { stage: Yup.string().required('Choose the hiring stage.') };
  for (const item of fields) {
    const map = FIELD_MAP[item.name];
    if (!map || !item.on) continue;
    let rule: Yup.AnySchema = FORMAT[map.key] ?? (map.kind === 'entries' ? Yup.array() : Yup.string());
    if (item.mandatory) {
      rule =
        map.kind === 'entries'
          ? (rule as Yup.ArraySchema<CandidateEntry[] | undefined, Yup.AnyObject>).min(1, `Add at least one ${item.name.toLowerCase()}.`)
          : rule.required(`${item.name} is required.`);
    }
    shape[map.key] = rule;
  }
  return Yup.object(shape);
}

/** Pilihan berkas — hanya nama berkas yang disimpan di mode dummy; batas 10 MB per berkas. */
function FileInput({ name, label, required, accept }: { name: string; label: string; required: boolean; accept: string }) {
  const [field, meta, helpers] = useField<string>(name);
  const [tooBig, setTooBig] = useState(false);
  const error = tooBig ? 'The file is larger than 10 MB.' : meta.touched && meta.error ? meta.error : undefined;
  return (
    <FormField name={name} label={label} required={required} error={error} hint={field.value ? `Selected: ${field.value}` : 'PNG, JPG, JPEG or PDF, 10 MB at most.'}>
      <input
        id={name}
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setTooBig(Boolean(file && file.size > 10 * 1024 * 1024));
          void helpers.setTouched(true, false);
          void helpers.setValue(file && file.size <= 10 * 1024 * 1024 ? file.name : '');
        }}
        className="rounded-md border border-silver bg-cloud px-3 py-2.5 font-body text-[13px] font-medium text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-vapor file:px-3 file:py-1.5 file:font-semibold file:text-fg-1"
      />
    </FormField>
  );
}

type EntryKey = 'formalEducation' | 'informalEducation' | 'workExperience';
const ENTRY: Record<EntryKey, { noun: string; title: string; organization: string; detail: string; from: string; to: string; years?: boolean; degree?: boolean }> = {
  formalEducation: { noun: 'Formal Education', title: 'Institution name', organization: 'Degree', detail: 'Field of study', from: 'Start year', to: 'End year (or expected)', years: true, degree: true },
  informalEducation: { noun: 'Informal Education', title: 'Name', organization: 'Issuing organization', detail: 'Duration (e.g. 3 days)', from: 'Issue date', to: 'Expiration date' },
  workExperience: { noun: 'Work Experience', title: 'Job position', organization: 'Company name', detail: 'Main responsibilities', from: 'Start date', to: 'End date (empty if still working here)' },
};

const entrySchema = Yup.object({
  title: Yup.string().trim().required('Required.'),
  organization: Yup.string().trim().required('Required.'),
  from: Yup.string().required('Required.'),
  to: Yup.string().test('order', 'Must not be before the start.', function check(value) {
    return !value || !this.parent.from || value >= this.parent.from;
  }),
});

/** Modal tambah/ubah satu riwayat (`#mAcFormal`, `#mAcInformal`, `#mAcWork`). */
function EntryModal({ kind, entry, onClose, onSave }: { kind: EntryKey; entry: CandidateEntry | null; onClose: () => void; onSave: (entry: CandidateEntry) => void }) {
  const cfg = ENTRY[kind];
  const initial = entry ?? { id: newId('e'), title: '', organization: '', detail: '', from: '', to: '' };
  return (
    <Formik initialValues={initial} validationSchema={entrySchema} onSubmit={(values) => onSave(values)}>
      {({ submitForm }) => (
        <Modal
          open
          onOpenChange={(next) => !next && onClose()}
          title={`${entry ? 'Edit' : 'Add'} ${cfg.noun}`}
          size="wide"
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => void submitForm()}>Save</Button>
            </>
          }
        >
          <Form className="grid gap-4 md:grid-cols-2" noValidate>
            <TextField name="title" label={cfg.title} required containerClassName="md:col-span-2" />
            {cfg.degree ? (
              <SelectField name="organization" label={cfg.organization} required placeholder="Select degree" options={OPT.degree} />
            ) : (
              <TextField name="organization" label={cfg.organization} required />
            )}
            <TextField name="detail" label={cfg.detail} />
            {cfg.years ? (
              <>
                <SelectField name="from" label={cfg.from} required placeholder="Select year" options={OPT.year} />
                <SelectField name="to" label={cfg.to} placeholder="Select year" options={OPT.year} />
              </>
            ) : (
              <>
                <DateField name="from" label={cfg.from} required placeholder="Select a date" />
                <DateField name="to" label={cfg.to} placeholder="Select a date" clearable />
              </>
            )}
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

function Entries({ kind, label, required }: { kind: EntryKey; label: string; required: boolean }) {
  const [field, meta, helpers] = useField<CandidateEntry[]>(kind);
  const [editing, setEditing] = useState<CandidateEntry | null | 'new'>(null);
  const cfg = ENTRY[kind];
  const save = (entry: CandidateEntry) => {
    const list = field.value.some((item) => item.id === entry.id) ? field.value.map((item) => (item.id === entry.id ? entry : item)) : [...field.value, entry];
    void helpers.setValue(list);
    setEditing(null);
  };
  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <span className="font-body text-[13px] font-semibold text-fg-1">
        {label}
        {required && <em className="not-italic text-error-600">*</em>}
      </span>
      {field.value.length === 0 ? (
        <span className="font-body text-[13px] text-fg-3">No {label.toLowerCase()} yet.</span>
      ) : (
        field.value.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border-1 px-3.5 py-2.5">
            <span className="flex flex-col gap-0.5">
              <span className="font-body text-[13px] font-bold text-fg-1">{item.title}</span>
              <span className="font-body text-xs font-medium text-fg-3">
                {[item.organization, item.detail, `${item.from} – ${item.to || (kind === 'workExperience' ? 'present' : '…')}`].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="flex">
              <button type="button" aria-label={`Edit ${item.title}`} onClick={() => setEditing(item)} className="inline-flex size-8 items-center justify-center rounded-md text-fg-3 hover:bg-vapor [&_svg]:size-4">
                <Pencil />
              </button>
              <RemoveRowButton aria-label={`Remove ${item.title}`} onClick={() => void helpers.setValue(field.value.filter((row) => row.id !== item.id))} />
            </span>
          </div>
        ))
      )}
      <div>
        <AddButton onClick={() => setEditing('new')}>Add {cfg.noun}</AddButton>
      </div>
      {meta.touched && typeof meta.error === 'string' && <span className="font-body text-xs font-medium text-error-600">{meta.error}</span>}
      {editing && <EntryModal kind={kind} entry={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function CandidateField({ item }: { item: FormFieldSetting }) {
  const { values, setFieldValue } = useFormikContext<CandidateInput>();
  const map = FIELD_MAP[item.name];
  if (!map) return null;
  const common = { name: map.key, label: item.name, required: item.mandatory };
  switch (map.kind) {
    case 'gender':
    case 'marital':
    case 'blood':
    case 'religion':
      return <SelectField {...common} placeholder={`Select ${item.name.toLowerCase()}`} options={OPT[map.kind]} />;
    case 'date':
      return <DateField {...common} placeholder="Select a date" max={map.key === 'dateOfBirth' ? new Date().toISOString().slice(0, 10) : undefined} />;
    case 'area':
      return (
        <div className="flex flex-col gap-2 md:col-span-2">
          <TextAreaField {...common} rows={3} placeholder={map.placeholder} disabled={map.key === 'residentialAddress' && values.sameAddress} />
          {map.key === 'residentialAddress' && (
            <label className="flex cursor-pointer items-center gap-2 font-body text-[13px] font-medium text-fg-2">
              <Checkbox
                checked={values.sameAddress}
                onCheckedChange={(next) => {
                  void setFieldValue('sameAddress', next === true);
                  if (next === true) void setFieldValue('residentialAddress', values.citizenAddress);
                }}
              />
              Same as citizen ID address
            </label>
          )}
        </div>
      );
    case 'entries':
      return <Entries kind={map.key as EntryKey} label={item.name} required={item.mandatory} />;
    case 'file':
      if (map.key !== 'portfolio') return <FileInput {...common} accept={map.key === 'profilePicture' ? '.png,.jpg,.jpeg' : '.png,.jpg,.jpeg,.pdf'} />;
      return (
        <div className="flex flex-col gap-2">
          <SelectField name="portfolioMode" label="Portfolio type" options={[{ value: 'file', label: 'File upload' }, { value: 'link', label: 'Online portfolio' }]} onValueChange={() => void setFieldValue('portfolio', '')} />
          {values.portfolioMode === 'link' ? (
            <TextField {...common} type="url" placeholder="https://" />
          ) : (
            <FileInput {...common} accept=".png,.jpg,.jpeg,.pdf" />
          )}
        </div>
      );
    default:
      return <TextField {...common} type={map.kind} inputMode={map.key === 'nik' ? 'numeric' : undefined} placeholder={map.placeholder} min={map.kind === 'number' ? 0 : undefined} />;
  }
}

/** Tahap yang bisa dipilih: New candidates, Screening, proses "In process" lowongan, lalu Offering. */
const stagesOf = (d: JobDetails) => opts(['New candidates', 'Screening', ...d.processes.map((process) => process.name), 'Offering']);

/** Recruitment › Job Listing › Add Candidate — port `_prototype/recruitment-add-candidate.html`. */
export function AddCandidatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const jobId = params.get('job');
  const { data, isLoading } = useJobListing(jobId);
  const add = useAddCandidate();
  const [another, setAnother] = useState(false);
  const schema = useMemo(() => (data ? schemaFor(data.details.formFields) : null), [data]);
  const crumbs = [{ label: 'Recruitment' }, { label: 'Job Listings', to: '/recruitment/job-listings' }];

  if (!data || !schema || !jobId) {
    return (
      <PageShell crumbs={[...crumbs, { label: 'Add Candidate' }]} title="Add Candidate">
        {isLoading ? <p className="m-0 font-body text-[13px] text-fg-3">Loading job listing…</p> : <EmptyState title="Choose a job listing first" description="Open a job listing and press Add Candidate." />}
      </PageShell>
    );
  }

  const { listing, details } = data;
  const detailUrl = `/recruitment/job-listings/detail?id=${listing.id}`;
  const fields = details.formFields.filter((item) => item.on && FIELD_MAP[item.name]);
  const groups = [...new Set(fields.map((item) => item.group))];

  return (
    <PageShell
      crumbs={[...crumbs, { label: listing.title, to: detailUrl }, { label: 'Add Candidate' }]}
      title="Add Candidate"
      description="Add an applicant on their behalf. The form follows the application form set on this job listing."
    >
      {/* ponytail: tombol Guidebook di prototype dilewati — belum ada buku panduannya. */}
      <Formik<CandidateInput>
        initialValues={empty(listing.id, 'New candidates')}
        validationSchema={schema}
        onSubmit={(values, helpers) =>
          add.mutate(
            { ...values, residentialAddress: values.sameAddress ? values.citizenAddress : values.residentialAddress },
            {
              onSuccess: () => {
                if (another) helpers.resetForm();
                else navigate(detailUrl);
              },
            },
          )
        }
      >
        {({ submitForm }) => (
          <Card className="gap-6">
            <Form className="flex flex-col gap-6" noValidate>
              <section className="flex flex-col gap-4">
                <h2 className="m-0 font-display text-base font-bold text-fg-1">Job application</h2>
                <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                  <FormField name="job" label="Applied job position" required>
                    <Input id="job" value={`${listing.title} · #${listing.id}`} disabled readOnly />
                  </FormField>
                  <SelectField name="stage" label="Hiring stage" required options={stagesOf(details)} />
                </div>
                {details.restrictOne && (
                  <Note icon={<Info />}>
                    One application per candidate for this job listing. A candidate who already applied can apply again after {details.reapplyMonths} months.
                  </Note>
                )}
              </section>

              {groups.map((group) => (
                <section key={group} className="flex flex-col gap-4 border-t border-border-1 pt-6">
                  <h2 className="m-0 font-display text-base font-bold text-fg-1">{SECTION_TITLE[group] ?? group}</h2>
                  <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                    {fields
                      .filter((item) => item.group === group)
                      .map((item) => (
                        <CandidateField key={item.name} item={item} />
                      ))}
                  </div>
                </section>
              ))}

              <section className="flex flex-col gap-4 border-t border-border-1 pt-6">
                <h2 className="m-0 font-display text-base font-bold text-fg-1">Additional notes</h2>
                <TextAreaField name="notes" rows={3} placeholder="Notes for the hiring team (optional)" />
              </section>
            </Form>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-1 pt-4">
              <label className="flex cursor-pointer items-center gap-2 font-body text-[13px] font-medium text-fg-2">
                <Checkbox checked={another} onCheckedChange={(next) => setAnother(next === true)} />
                Add another candidate after saving
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate(detailUrl)}>
                  Cancel
                </Button>
                <Button disabled={add.isPending} onClick={() => void submitForm()}>
                  {add.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </Formik>
    </PageShell>
  );
}
