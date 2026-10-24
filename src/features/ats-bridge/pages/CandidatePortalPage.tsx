import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Form, Formik, useFormikContext } from 'formik';
import { Check, FileText, IdCard, Link2Off, ShieldCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SevakaLogo } from '@/components/brand/SevakaLogo';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { CheckboxField } from '@/components/form/CheckboxField';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { candidatePortalService } from '@/features/ats-bridge/services/ats-bridge.service';
import type { CandidateProfile, PortalState, PortalStep, ZipArea } from '@/features/ats-bridge/types';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

/**
 * Portal Kandidat — FSD-001-EMPLOYEE 0.46 §4B, UIC §4B. PUBLIK tanpa login: tautan
 * `/candidate/{COMPANY_CODE}#t=<token>`. Token dipindah ke sessionStorage lalu dibuang dari alamat;
 * tiap panggilan membawa header `X-Candidate-Token`. Nol sidebar, nol menu HRIS.
 */
const TOKEN_KEY = 'sevaka.candidate-token';

function readToken(): string {
  const match = window.location.hash.match(/t=([^&]+)/);
  if (match) {
    try {
      sessionStorage.setItem(TOKEN_KEY, match[1]);
    } catch {
      // sessionStorage bisa tidak tersedia (mode privat) — token tetap dipakai di memori.
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return match[1];
  }
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

const maskEmail = (email: string) => {
  const [name, domain = ''] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
};

const STEPS: { step: PortalStep[]; label: string }[] = [
  { step: ['CONSENT'], label: 'Consent' },
  { step: ['PROFILE'], label: 'Your data' },
  { step: ['DOCUMENTS', 'READY'], label: 'Documents' },
  { step: ['DONE'], label: 'Done' },
];

function Stepper({ current }: { current: PortalStep }) {
  const index = STEPS.findIndex((item) => item.step.includes(current));
  return (
    <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
      {STEPS.map((item, i) => (
        <li key={item.label} className="flex flex-col gap-2">
          <span className={cn('h-1 rounded-full', i <= index ? 'bg-secondary-500' : 'bg-fog')} />
          <span className={cn('flex items-center gap-1.5 font-body text-xs font-semibold', i === index ? 'text-fg-1' : 'text-fg-3')}>
            {i < index ? <Check className="size-3.5 text-secondary-600" /> : <span className="tabular-nums">{i + 1}.</span>}
            {item.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-fog pt-5 first:border-t-0 first:pt-0">
      <header>
        <h3 className="m-0 font-display text-base font-bold text-fg-1">{title}</h3>
        {sub && <p className="m-0 mt-0.5 font-body text-xs font-medium text-fg-3">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

const opts = (values: string[]) => values.map((value) => ({ value, label: value }));
const GENDER = opts(['Male', 'Female']);
const MARITAL = opts(['Single', 'Married', 'Divorced', 'Widowed']);
const EDUCATION = opts(['High school', 'Diploma (D3)', "Bachelor's degree (S1)", "Master's degree (S2)", 'Doctorate (S3)']);
const RELIGION = opts(['Islam', 'Protestant', 'Catholic', 'Hindu', 'Buddhist', 'Confucian', 'Other']);
const BLOOD = opts(['A', 'B', 'AB', 'O', 'Unknown']);
const HOME = opts(['Own', 'Rent', 'Family home', 'Other']);
const DISABILITY = opts(['None', 'Physical', 'Sensory', 'Intellectual', 'Mental', 'Prefer not to say']);

/** Kode pos → wilayah; provinsi s.d. kelurahan terisi otomatis dan tidak dapat diketik. */
function ZipPicker({ token, name, label }: { token: string; name: 'idCardZip' | 'domicileZip'; label: string }) {
  const { values, setFieldValue, errors, submitCount } = useFormikContext<CandidateProfile>();
  const area = values[name];
  const [zip, setZip] = useState(area?.zip ?? '');
  const [choices, setChoices] = useState<ZipArea[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setError('');
    setBusy(true);
    try {
      const found = await candidatePortalService.zips(token, zip.trim());
      if (!found.length) setError('No area found for this postal code.');
      else if (found.length === 1) void setFieldValue(name, found[0]);
      else setChoices(found);
    } catch (err) {
      setError((err as Error).message.replace(/^\d{3} — /, ''));
    } finally {
      setBusy(false);
    }
  };

  const fieldError = submitCount > 0 ? (errors[name] as string | undefined) : undefined;
  const readOnly = (text: string, value?: string) => (
    <div className="flex flex-col gap-1">
      <span className="font-body text-xs font-semibold text-fg-3">{text}</span>
      <span className="flex h-9 items-center rounded-md border border-fog bg-vapor px-3 font-body text-xs font-medium text-fg-2">
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm font-bold text-fg-1">
            {label} <span className="text-error-500">*</span>
          </span>
          <input
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 12950"
            className="h-9 w-[160px] rounded-md border border-silver bg-cloud px-3 font-body text-xs font-medium text-fg-2 outline-none focus:border-secondary-500 focus:shadow-[0_0_0_4px_rgba(2,132,199,.16)]"
          />
        </label>
        <Button variant="secondary" type="button" onClick={search} disabled={busy || zip.length !== 5}>
          {busy ? 'Searching…' : 'Search postal code'}
        </Button>
      </div>
      {(error || fieldError) && <span className="font-body text-xs font-medium text-error-700">{error || fieldError}</span>}
      <div className="grid gap-3 sm:grid-cols-2">
        {readOnly('Province', area?.provinceName)}
        {readOnly('City / regency', area?.regencyName)}
        {readOnly('District', area?.districtName)}
        {readOnly('Village', area?.villageName)}
      </div>
      <Modal
        open={choices.length > 0}
        onOpenChange={(next) => !next && setChoices([])}
        title="Choose your area"
        description={`Several areas use postal code ${zip}.`}
        footer={
          <Button variant="secondary" onClick={() => setChoices([])}>
            Cancel
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          {choices.map((choice) => (
            <button
              key={choice.zipId}
              type="button"
              onClick={() => {
                void setFieldValue(name, choice);
                setChoices([]);
              }}
              className="flex flex-col items-start gap-0.5 rounded-md border border-border-1 px-3.5 py-2.5 text-left transition-colors duration-200 ease-standard hover:border-secondary-500 hover:bg-primary-50"
            >
              <span className="font-body text-[13px] font-semibold text-fg-1">{choice.villageName}</span>
              <span className="font-body text-xs font-medium text-fg-3">
                {choice.districtName} · {choice.regencyName} · {choice.provinceName}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function ProfileForm({ token, state, onSaved }: { token: string; state: PortalState; onSaved: (next: PortalState) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Formik<CandidateProfile>
      initialValues={state.profile}
      onSubmit={async (values, helpers) => {
        setBusy(true);
        try {
          onSaved(await candidatePortalService.saveProfile(token, state.companyCode, values));
        } catch (err) {
          const fields = (err as Error & { fields?: Record<string, string> }).fields;
          if (fields) helpers.setErrors(fields);
          helpers.setTouched(Object.fromEntries(Object.keys(fields ?? {}).map((key) => [key, true])));
        } finally {
          setBusy(false);
        }
      }}
    >
      {({ values }) => (
        <Form className="flex flex-col gap-6">
          <Section title="Identity">
            <TextField name="candidateName" label="Full name" required placeholder="As written on your ID" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="nationality"
                label="Nationality"
                required
                placeholder="Select nationality"
                options={[
                  { value: 'CITIZEN', label: 'Indonesian citizen' },
                  { value: 'FOREIGNER', label: 'Foreign national' },
                ]}
              />
              <TextField name="candidatePhone" label="Mobile phone number" required placeholder="0812 3456 7890" />
            </div>
            {values.nationality === 'CITIZEN' && (
              <TextField name="idCardNumber" label="ID card (KTP) number" required maxLength={16} hint="16 digits." />
            )}
            {values.nationality === 'FOREIGNER' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="passportNumber" label="Passport number" required />
                <TextField name="visaNumber" label="Visa number" required />
              </div>
            )}
          </Section>

          <Section title="Personal details">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="placeOfBirth" label="Place of birth" required />
              <DateField name="dateOfBirth" label="Date of birth" required placeholder="Select a date" />
              <SelectField name="gender" label="Gender" required placeholder="Select" options={GENDER} />
              <SelectField name="maritalStatus" label="Marital status" required placeholder="Select" options={MARITAL} />
              <SelectField name="lastEducation" label="Last education" required placeholder="Select" options={EDUCATION} />
              <SelectField name="religion" label="Religion" required placeholder="Select" options={RELIGION} />
              <SelectField name="bloodType" label="Blood type" placeholder="Select" options={BLOOD} />
              <SelectField name="homeOwnershipStatus" label="Home ownership" placeholder="Select" options={HOME} />
              <SelectField name="disabilityStatus" label="Disability" placeholder="Select" options={DISABILITY} />
              <TextField name="motherMaidenName" label="Mother's maiden name" />
            </div>
          </Section>

          <Section title="Tax and insurance" sub="Optional — leave empty if you don't have them yet.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="npwp" label="NPWP" />
              <TextField name="npwpName" label="Name on NPWP" />
              <TextField name="bpjsTenagaKerjaNumber" label="BPJS Ketenagakerjaan" />
              <TextField name="bpjsKesehatanNumber" label="BPJS Kesehatan" />
            </div>
          </Section>

          <Section title="Address">
            <TextAreaField name="idCardAddress" label="Address on your ID card" required rows={2} />
            <ZipPicker token={token} name="idCardZip" label="Postal code" />
            <CheckboxField name="isDomicileSameAsIdCard">My domicile is the same as the address above</CheckboxField>
            {!values.isDomicileSameAsIdCard && (
              <>
                <TextAreaField name="domicileAddress" label="Domicile address" required rows={2} />
                <ZipPicker token={token} name="domicileZip" label="Domicile postal code" />
              </>
            )}
          </Section>

          <div className="flex justify-end border-t border-fog pt-5">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save and continue'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

function DocumentCard({
  icon,
  title,
  hint,
  accept,
  uploaded,
  onPick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  accept: string;
  uploaded: boolean;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-1 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-50 text-secondary-600 [&_svg]:size-5">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-body text-sm font-bold text-fg-1">{title}</span>
        <span className="font-body text-xs font-medium text-fg-3">{hint}</span>
      </div>
      <StatusBadge tone={uploaded ? 'ok' : 'mute'}>{uploaded ? 'Uploaded' : 'Not uploaded yet'}</StatusBadge>
      <Button variant="secondary" onClick={() => input.current?.click()}>
        {uploaded ? 'Replace file' : 'Choose file'}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

const wipe = (message: string) => message.replace(/^\d{3} — /, '');

export function CandidatePortalPage() {
  const { companyCode = 'DIKA' } = useParams();
  const [token] = useState(readToken);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['candidate-portal', token],
    queryFn: () => candidatePortalService.state(token, companyCode),
    enabled: Boolean(token),
    retry: false,
  });
  const [done, setDone] = useState<PortalState | null>(null);
  const state = done ?? query.data;
  /** Langkah yang sedang dilihat — kandidat boleh kembali ke langkah sebelumnya tanpa kehilangan isian. */
  const [view, setView] = useState<PortalStep | null>(null);
  const step = view ?? state?.step ?? 'CONSENT';
  const [declined, setDeclined] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [error, setError] = useState('');

  const apply = (next: PortalState) => {
    setError('');
    setView(null);
    queryClient.setQueryData(['candidate-portal', token], next);
  };

  const consent = useMutation({
    mutationFn: (accepted: boolean) => candidatePortalService.consent(token, companyCode, accepted),
    onSuccess: (next, accepted) => {
      setDeclined(!accepted);
      apply(next);
    },
    onError: (err: Error) => setError(wipe(err.message)),
  });
  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: 'cv' | 'id-card'; file: File }) =>
      candidatePortalService.upload(token, companyCode, kind, file),
    onSuccess: apply,
    onError: (err: Error) => setError(wipe(err.message)),
  });
  const submit = useMutation({
    mutationFn: () => candidatePortalService.submit(token, companyCode),
    onSuccess: (next) => {
      setDone(next);
      setView(null);
    },
    onError: (err: Error) => setError(wipe(err.message)),
  });

  useEffect(() => {
    document.title = 'Candidate data · SEVAKA';
  }, []);

  const invalid = !token || query.isError;

  return (
    <div className="min-h-screen bg-bg-app px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <SevakaLogo size="sm" />
          <span className="font-body text-xs font-bold uppercase tracking-[0.08em] text-fg-3">
            {companyCode} · Candidate data
          </span>
        </header>

        <main className="flex flex-col gap-5 rounded-2xl border border-border-1 bg-white p-6 shadow-card-sm">
          {invalid ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Link2Off className="size-8 text-fg-3" />
              <h1 className="m-0 font-display text-xl font-bold text-fg-1">This link cannot be used</h1>
              <p className="m-0 max-w-md font-body text-[13px] font-medium leading-[1.5] text-fg-3">
                The link may have expired, been used already, or replaced by a newer one. Ask the HR team that invited
                you to send a new link.
              </p>
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          ) : !state ? (
            <p className="m-0 py-10 text-center font-body text-[13px] text-fg-3">Loading…</p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="m-0 font-display text-xl font-bold text-fg-1">Complete your candidate data</h1>
                <p className="m-0 font-body text-[13px] font-medium text-fg-3">
                  Invitation sent to {maskEmail(state.candidateEmail)}
                  {step !== 'DONE' && ` · This link is valid until ${formatDateTime(state.expiresAt)}`}
                </p>
              </div>
              <Stepper current={step} />

              {error && (
                <Note tone="danger" icon={<Link2Off />}>
                  {error}
                </Note>
              )}

              {step === 'CONSENT' && state.consent && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="m-0 font-display text-base font-bold text-fg-1">Consent to process your data</h2>
                    <p className="m-0 mt-0.5 font-body text-xs font-medium text-fg-3">
                      Read until the end to continue · version {state.consent.versionNo}
                    </p>
                  </div>
                  <div
                    onScroll={(event) => {
                      const el = event.currentTarget;
                      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setScrolledToEnd(true);
                    }}
                    ref={(el) => {
                      // Naskah pendek yang tak perlu digulir langsung dianggap terbaca.
                      if (el && el.scrollHeight <= el.clientHeight + 4 && !scrolledToEnd) setScrolledToEnd(true);
                    }}
                    className="max-h-[260px] overflow-y-auto whitespace-pre-line rounded-lg border border-border-1 bg-cloud p-4 font-body text-[13px] leading-[1.6] text-fg-2"
                  >
                    {state.consent.content}
                  </div>
                  {declined && (
                    <Note tone="warn" icon={<ShieldCheck />}>
                      You did not agree. Without your consent we cannot continue your hiring through this form — you can
                      still change your mind below.
                    </Note>
                  )}
                  <div className="flex flex-wrap justify-end gap-2.5">
                    <Button variant="secondary" disabled={consent.isPending} onClick={() => consent.mutate(false)}>
                      I do not agree
                    </Button>
                    <Button disabled={!scrolledToEnd || consent.isPending} onClick={() => consent.mutate(true)}>
                      I agree
                    </Button>
                  </div>
                </div>
              )}

              {step === 'PROFILE' && <ProfileForm token={token} state={state} onSaved={apply} />}

              {(step === 'DOCUMENTS' || step === 'READY') && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="m-0 font-display text-base font-bold text-fg-1">Documents</h2>
                    <p className="m-0 mt-0.5 font-body text-xs font-medium text-fg-3">Each file at most 5 MB.</p>
                  </div>
                  <DocumentCard
                    icon={<FileText />}
                    title="CV (PDF)"
                    hint="Your latest CV as a PDF file."
                    accept="application/pdf"
                    uploaded={state.cvUploaded}
                    onPick={(file) => upload.mutate({ kind: 'cv', file })}
                  />
                  <DocumentCard
                    icon={<IdCard />}
                    title="ID card photo (JPEG or PNG)"
                    hint="A clear photo of your KTP or passport."
                    accept="image/jpeg,image/png"
                    uploaded={state.idPhotoUploaded}
                    onPick={(file) => upload.mutate({ kind: 'id-card', file })}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fog pt-5">
                    <Button variant="ghost" onClick={() => setView('PROFILE')}>
                      Back to my data
                    </Button>
                    {state.step === 'READY' && (
                      <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
                        {submit.isPending ? 'Submitting…' : 'Submit my data'}
                      </Button>
                    )}
                  </div>
                  {state.step === 'READY' && (
                    <p className="m-0 text-right font-body text-xs font-medium text-fg-3">
                      After you submit, this link can no longer be used.
                    </p>
                  )}
                </div>
              )}

              {step === 'DONE' && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-success-100 text-success-700">
                    <Check className="size-6" />
                  </span>
                  <h2 className="m-0 font-display text-xl font-bold text-fg-1">Thank you!</h2>
                  <p className="m-0 max-w-md font-body text-[13px] font-medium leading-[1.5] text-fg-3">
                    Your data has been sent to the HR team. They will contact you about the next steps. You can close this
                    page.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
