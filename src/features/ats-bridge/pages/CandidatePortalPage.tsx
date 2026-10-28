import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Form, Formik, useFormikContext } from 'formik';
import {
  ArrowDown,
  Check,
  Clock,
  FileText,
  IdCard,
  Link2Off,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SevakaWordmark } from '@/components/brand/SevakaLogo';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { candidatePortalService } from '@/features/ats-bridge/services/ats-bridge.service';
import type { CandidateProfile, PortalState, PortalStep, ZipArea } from '@/features/ats-bridge/types';
import { MOCK } from '@/services/mock';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/format';

/**
 * Portal Kandidat — FSD-001-EMPLOYEE §4B, UIC-EMPLOYEE 0.76 §4B. PUBLIK tanpa login: tautan
 * `/candidate/{COMPANY_CODE}#t=<token>`. Token dipindah ke sessionStorage lalu dibuang dari alamat;
 * tiap panggilan membawa header `X-Candidate-Token`. Nol sidebar, nol menu HRIS.
 *
 * Urutan server `CONSENT → PROFILE → DOCUMENTS → READY → DONE`; layar menampilkan empat langkah
 * (READY = langkah "Review and submit", DONE = semua langkah selesai).
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
    // Hanya potongan `t=` yang dibuang, supaya rute hash (pratinjau artifact) tetap utuh.
    window.history.replaceState(null, '', window.location.href.replace(/[#&]t=[^&]*/, ''));
    return match[1];
  }
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

const wipe = (message: string) => message.replace(/^\d{3} — /, '');

/* ─────────────────────────── Langkah ─────────────────────────── */

const STEPS: { step: PortalStep; label: string; sub: string }[] = [
  { step: 'CONSENT', label: 'Consent', sub: 'How we use your data' },
  { step: 'PROFILE', label: 'Your data', sub: 'Identity, contact, address' },
  { step: 'DOCUMENTS', label: 'Documents', sub: 'CV and ID card photo' },
  { step: 'READY', label: 'Review and submit', sub: 'Check once, then send' },
];
const ORDER: PortalStep[] = ['CONSENT', 'PROFILE', 'DOCUMENTS', 'READY', 'DONE'];
const indexOf = (step: PortalStep) => ORDER.indexOf(step);

/** Langkah yang sudah dilewati boleh dibuka lagi — kecuali Consent (sudah dijawab) dan setelah kirim. */
const canOpen = (target: PortalStep, progress: PortalStep) =>
  target !== 'CONSENT' && progress !== 'DONE' && indexOf(target) <= indexOf(progress);

function StepRail({ progress, view, onOpen }: { progress: PortalStep; view: PortalStep; onOpen: (step: PortalStep) => void }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {STEPS.map((item, i) => {
        const done = indexOf(progress) > i;
        const current = item.step === view && progress !== 'DONE';
        const open = canOpen(item.step, progress) && !current;
        const body = (
          <>
            <span
              className={cn(
                'relative z-[1] grid size-7 shrink-0 place-items-center rounded-full font-body text-xs font-bold tabular-nums transition-colors duration-200 ease-standard',
                done && !current && 'bg-success-500 text-white',
                current && 'bg-secondary-600 text-white ring-4 ring-secondary-500/15',
                !done && !current && 'border border-silver bg-white text-fg-3',
              )}
            >
              {done && !current ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-1 text-left">
              <span className={cn('font-body text-[13px] font-bold group-hover:text-secondary-700', current || done ? 'text-fg-1' : 'text-fg-3')}>{item.label}</span>
              <span className="font-body text-xs font-medium text-fg-3">
                {item.step === 'CONSENT' && done ? 'Agreed' : item.sub}
              </span>
            </span>
          </>
        );
        return (
          <li key={item.step} className="relative pb-5 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn('absolute left-[13px] top-7 h-[calc(100%-28px)] w-0.5', done ? 'bg-success-500' : 'bg-fog')}
              />
            )}
            {open ? (
              <button
                type="button"
                onClick={() => onOpen(item.step)}
                className="group flex w-full cursor-pointer items-start gap-3 rounded-md outline-none focus-visible:ring-4 focus-visible:ring-secondary-500/20"
              >
                {body}
              </button>
            ) : (
              <div className="flex items-start gap-3" aria-current={current ? 'step' : undefined}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Pengganti rail di layar sempit: "Step 2 of 4" + batang kemajuan. */
function StepBar({ progress, view }: { progress: PortalStep; view: PortalStep }) {
  const at = progress === 'DONE' ? STEPS.length : Math.min(indexOf(view), STEPS.length - 1);
  return (
    <div className="flex flex-col gap-2 lg:hidden">
      <div className="flex items-baseline justify-between font-body text-xs font-semibold">
        <span className="text-fg-1">{progress === 'DONE' ? 'All steps done' : STEPS[at].label}</span>
        <span className="tabular-nums text-fg-3">
          {progress === 'DONE' ? `${STEPS.length} of ${STEPS.length}` : `Step ${at + 1} of ${STEPS.length}`}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {STEPS.map((item, i) => (
          <span key={item.step} className={cn('h-1 rounded-full', i <= at || progress === 'DONE' ? 'bg-secondary-500' : 'bg-fog')} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Bagian umum ─────────────────────────── */

function StepHeading({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="m-0 font-display text-xl font-bold leading-tight text-fg-1">{title}</h2>
        {sub && <p className="m-0 max-w-[62ch] font-body text-[13px] font-medium leading-[1.55] text-fg-3">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t border-fog pt-7 first-of-type:border-t-0 first-of-type:pt-0">
      {/* Judul section 18px — satu tingkat di atas label field (16/700) supaya terbaca sebagai pembatas. */}
      <header className="mb-1">
        <h3 className="m-0 font-display text-lg font-bold leading-tight text-fg-1">{title}</h3>
        {sub && <p className="m-0 mt-1 font-body text-xs font-medium text-fg-3">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

/** Pilihan pendek bergaya kartu (kewarganegaraan, jenis kelamin) — radio asli, fokus keyboard terlihat. */
function ChoiceCards({
  name,
  label,
  options,
}: {
  name: 'nationality' | 'gender';
  label: string;
  options: { value: string; title: string; description?: string }[];
}) {
  const { values, setFieldValue, errors, touched } = useFormikContext<CandidateProfile>();
  const error = touched[name] ? (errors[name] as string | undefined) : undefined;
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={label}>
      <Label>
        {label}
        <em>*</em>
      </Label>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((option) => {
          const active = values[name] === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-[border-color,background,box-shadow] duration-200 ease-standard',
                active ? 'border-secondary-500 bg-primary-50/60 shadow-[0_0_0_3px_rgba(2,132,199,.10)]' : 'border-silver bg-white hover:border-secondary-500',
                error && !active && 'border-error-500',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => void setFieldValue(name, option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2 bg-white peer-focus-visible:ring-4 peer-focus-visible:ring-secondary-500/20',
                  active ? 'border-secondary-500' : 'border-silver',
                )}
              >
                {active && <span className="size-2 rounded-full bg-secondary-500" />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-bold text-fg-1">{option.title}</span>
                {option.description && <span className="font-body text-xs font-medium text-fg-3">{option.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && <span className="font-body text-xs font-medium text-error-700">{error}</span>}
    </div>
  );
}

/**
 * Pilihan biasa, bukan pernyataan — jadi checkbox polos tanpa kotak `CheckboxField`
 * (kotak itu untuk atestasi), satu baris, sejajar tengah dengan labelnya.
 */
function SameAddressCheckbox() {
  const { values, setFieldValue } = useFormikContext<CandidateProfile>();
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2.5 py-1">
      <Checkbox
        id="isDomicileSameAsIdCard"
        checked={values.isDomicileSameAsIdCard}
        onCheckedChange={(next) => void setFieldValue('isDomicileSameAsIdCard', next === true)}
      />
      <span className="font-body text-[13px] font-medium text-fg-1">My domicile is the same as the address above</span>
    </label>
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

/* ─────────────────────────── Consent ─────────────────────────── */

/** Blok dipisah baris kosong; baris pertama bernomor ("1. …") dibaca sebagai subjudul. */
function ConsentText({ content }: { content: string }) {
  return (
    <>
      {content.split(/\n\s*\n/).map((block, i) => {
        const [first, ...rest] = block.split('\n');
        const heading = /^\d+(\.\d+)*\.?\s/.test(first);
        return (
          <div key={i} className="flex flex-col gap-1.5">
            {heading ? (
              <h3 className="m-0 font-display text-sm font-bold text-fg-1">{first}</h3>
            ) : (
              <p className="m-0">{first}</p>
            )}
            {rest.map((line, j) => (
              <p key={j} className="m-0">
                {line}
              </p>
            ))}
          </div>
        );
      })}
    </>
  );
}

function ConsentStep({
  state,
  declined,
  pending,
  onAnswer,
}: {
  state: PortalState;
  declined: boolean;
  pending: boolean;
  onAnswer: (accepted: boolean) => void;
}) {
  const [read, setRead] = useState(0);
  const [checked, setChecked] = useState(false);
  const atEnd = read >= 0.99;
  const measure = (el: HTMLDivElement) => {
    const room = el.scrollHeight - el.clientHeight;
    setRead(room <= 4 ? 1 : Math.max(read, el.scrollTop / room));
  };

  if (!state.consent) return null;
  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Personal data consent"
        sub="Before you fill in anything, please read how we will use your data. You can tick the box below once you reach the end of the text."
        aside={<StatusBadge tone="mute">Version {state.consent.versionNo}</StatusBadge>}
      />
      <div className="relative">
        <div
          tabIndex={0}
          aria-label="Consent text"
          onScroll={(event) => measure(event.currentTarget)}
          ref={(el) => {
            if (el && read === 0) measure(el);
          }}
          className="flex max-h-[340px] flex-col gap-4 overflow-y-auto rounded-xl border border-border-1 bg-bg-subtle px-5 py-4 font-body text-[13px] font-medium leading-[1.65] text-fg-2 outline-none focus-visible:ring-4 focus-visible:ring-secondary-500/20"
        >
          <ConsentText content={state.consent.content} />
        </div>
        {/* Bayangan bawah memberi tahu masih ada teks; hilang saat sudah di akhir. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-px bottom-px h-16 rounded-b-xl bg-gradient-to-t from-bg-subtle to-transparent transition-opacity duration-200',
            atEnd && 'opacity-0',
          )}
        />
        <span aria-hidden className="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full">
          <span className="block h-full origin-left bg-secondary-500 transition-transform duration-150" style={{ transform: `scaleX(${read})` }} />
        </span>
      </div>

      {declined && (
        <Note tone="warn" icon={<ShieldCheck />}>
          You chose not to agree, so we cannot continue your hiring through this form. Changed your mind? You can still
          agree below.
        </Note>
      )}

      <div className="flex flex-col gap-2">
        <label
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3.5 transition-[border-color,background,opacity] duration-200 ease-standard',
            !atEnd && 'cursor-not-allowed border-border-1 bg-white opacity-60',
            atEnd && !checked && 'cursor-pointer border-silver bg-white hover:border-secondary-500',
            checked && 'cursor-pointer border-secondary-500 bg-primary-50/60',
          )}
        >
          <Checkbox
            id="consent-agree"
            checked={checked}
            disabled={!atEnd}
            onCheckedChange={(next) => setChecked(next === true)}
            className="mt-0.5"
          />
          <span className="font-body text-[13px] font-semibold leading-[1.5] text-fg-1">
            I have read the whole consent text and agree to the processing of my personal data as described above.
          </span>
        </label>
        {/* Petunjuk hanya selama teks belum habis digulir; setelah itu centang sendiri yang jadi langkah berikutnya. */}
        {!atEnd && (
          <span className="flex items-center gap-1.5 font-body text-xs font-semibold text-fg-3">
            <ArrowDown className="size-3.5 motion-safe:animate-bounce" />
            Scroll to the end of the text to tick this box
          </span>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2.5 border-t border-fog pt-5">
        <Button variant="secondary" disabled={pending} onClick={() => onAnswer(false)}>
          I do not agree
        </Button>
        <Button disabled={!checked || pending} onClick={() => onAnswer(true)}>
          {pending ? 'Saving…' : 'Agree and continue'}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Data diri ─────────────────────────── */

/** Kode pos → wilayah; provinsi s.d. kelurahan terisi otomatis dan tidak dapat diketik. */
function ZipPicker({ token, name, label }: { token: string; name: 'idCardZip' | 'domicileZip'; label: string }) {
  const { values, setFieldValue, errors, submitCount } = useFormikContext<CandidateProfile>();
  const area = values[name];
  const [zip, setZip] = useState(area?.zip ?? '');
  const [choices, setChoices] = useState<ZipArea[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setZip(area?.zip ?? ''), [area?.zip]);

  const search = async () => {
    setError('');
    setBusy(true);
    try {
      const found = await candidatePortalService.zips(token, zip.trim());
      if (!found.length) setError('No area uses this postal code. Check the number and try again.');
      else if (found.length === 1) void setFieldValue(name, found[0]);
      else setChoices(found);
    } catch (err) {
      setError(wipe((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const fieldError = submitCount > 0 && !area ? (errors[name] as string | undefined) : undefined;

  const readOnly = (text: string, value?: string) => (
    <div className="flex flex-col gap-1">
      <Label>{text}</Label>
      <span
        aria-readonly="true"
        className={cn(
          'flex h-9 items-center truncate rounded-md border border-fog bg-vapor px-3 font-body text-xs font-medium',
          value ? 'text-fg-2' : 'text-fg-4',
        )}
      >
        {value || 'Fills in from postal code'}
      </span>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Kode pos = isian yang diketik, sebaris sendiri setengah lebar (pola Mobile phone / KTP);
          empat wilayah hasil pencarian menyusul rapi 2×2. */}
      <div className="flex flex-col gap-1 sm:col-span-2 sm:max-w-[calc(50%-8px)]">
        <Label htmlFor={`${name}-search`}>
          {label}
          <em>*</em>
        </Label>
        <div
          className={cn(
            'flex h-9 items-stretch overflow-hidden rounded-md border border-silver bg-white focus-within:border-secondary-500 focus-within:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
            (error || fieldError) && 'border-error-500',
          )}
        >
          <input
            id={`${name}-search`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={zip}
            aria-invalid={Boolean(error || fieldError)}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (zip.length === 5) void search();
              }
            }}
            placeholder="e.g. 12950"
            className="min-w-0 flex-1 bg-transparent px-3 font-body text-xs font-medium tabular-nums text-fg-2 outline-none"
          />
          <button
            type="button"
            aria-label="Search postal code"
            onClick={search}
            disabled={busy || zip.length !== 5}
            className="grid w-10 shrink-0 cursor-pointer place-items-center border-l border-silver text-fg-3 transition-colors duration-200 ease-standard hover:bg-vapor hover:text-secondary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-fog border-t-secondary-600" /> : <Search className="size-4" strokeWidth={1.75} />}
          </button>
        </div>
        {error || fieldError ? (
          <span className="font-body text-xs font-medium text-error-700">{error || fieldError}</span>
        ) : (
          <span className="font-body text-xs font-medium text-fg-3">
            Type the 5-digit postal code, then press search and choose the matching area.
          </span>
        )}
      </div>
      {readOnly('Province', area?.provinceName)}
      {readOnly('City / regency', area?.regencyName)}
      {readOnly('District', area?.districtName)}
      {readOnly('Village', area?.villageName)}

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

/** Isian contoh untuk pratinjau mode dummy — tidak pernah tampil saat tersambung backend. */
const SAMPLE: Partial<CandidateProfile> = {
  candidateName: 'Andi Wijaya',
  nationality: 'CITIZEN',
  idCardNumber: '3174012505980004',
  candidatePhone: '0812 3456 7890',
  placeOfBirth: 'Jakarta',
  dateOfBirth: '1998-05-25',
  gender: 'Male',
  maritalStatus: 'Single',
  lastEducation: "Bachelor's degree (S1)",
  religion: 'Islam',
  bloodType: 'O',
  homeOwnershipStatus: 'Family home',
  disabilityStatus: 'None',
  motherMaidenName: 'Sri Lestari',
  idCardAddress: 'Jl. Karet Pedurenan No. 12, RT 004 / RW 002',
  idCardZip: {
    zipId: 'z-12950',
    zip: '12950',
    provinceName: 'DKI Jakarta',
    regencyName: 'Jakarta Selatan',
    districtName: 'Setiabudi',
    villageName: 'Karet Kuningan',
  },
  isDomicileSameAsIdCard: true,
};

function ProfileStep({
  token,
  state,
  onSaved,
}: {
  token: string;
  state: PortalState;
  onSaved: (next: PortalState) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Formik<CandidateProfile>
      initialValues={state.profile}
      onSubmit={async (values, helpers) => {
        setBusy(true);
        setFailed(false);
        try {
          onSaved(await candidatePortalService.saveProfile(token, state.companyCode, values));
        } catch (err) {
          const fields = (err as Error & { fields?: Record<string, string> }).fields ?? {};
          // `false` = tanpa validasi ulang — form ini tak punya skema, jadi validasi ulang menghapus galat server.
          void helpers.setTouched(Object.fromEntries(Object.keys(fields).map((key) => [key, true])), false);
          helpers.setErrors(fields);
          setFailed(true);
          // Fokus ke isian salah pertama supaya kandidat tidak perlu mencari.
          setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        } finally {
          setBusy(false);
        }
      }}
    >
      {({ values, setValues, errors }) => (
        <Form ref={formRef} className="flex flex-col gap-6" noValidate>
          <StepHeading
            title="Your data"
            sub="Fill in your details exactly as they appear on your identity documents."
            aside={
              MOCK && (
                <Button variant="ghost" type="button" onClick={() => void setValues({ ...values, ...SAMPLE })} className="min-w-0 px-0">
                  Fill sample data
                </Button>
              )
            }
          />

          {failed && Object.keys(errors).length > 0 && (
            <Note tone="danger" icon={<Link2Off />}>
              {Object.keys(errors).length === 1 ? 'One field needs' : `${Object.keys(errors).length} fields need`} your
              attention. They are marked in red below.
            </Note>
          )}

          <Section title="Identity">
            <TextField name="candidateName" label="Full name" required autoComplete="name" placeholder="As written on your ID" />
            <ChoiceCards
              name="nationality"
              label="Nationality"
              options={[
                { value: 'CITIZEN', title: 'Indonesian citizen', description: 'I have an ID card (KTP)' },
                { value: 'FOREIGNER', title: 'Foreign national', description: 'I have a passport and visa' },
              ]}
            />
            {values.nationality === 'CITIZEN' && (
              <TextField
                name="idCardNumber"
                label="ID card (KTP) number"
                required
                inputMode="numeric"
                maxLength={16}
                hint={`16 digits · ${values.idCardNumber.length}/16`}
                containerClassName="sm:max-w-[50%]"
              />
            )}
            {values.nationality === 'FOREIGNER' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="passportNumber" label="Passport number" required />
                <TextField name="visaNumber" label="Visa number" required />
              </div>
            )}
          </Section>

          <Section title="Contact" sub={`Your email is ${state.candidateEmail}, the address this invitation was sent to.`}>
            <TextField
              name="candidatePhone"
              label="Mobile phone number"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0812 3456 7890"
              hint="We use it to contact you about your application."
              containerClassName="sm:max-w-[50%]"
            />
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
              <SelectField name="disabilityStatus" label="Disability status" placeholder="Select" options={DISABILITY} />
              <TextField name="motherMaidenName" label="Mother's maiden name" />
            </div>
          </Section>

          <Section title="Tax and insurance" sub="Optional. Leave empty if you do not have them yet.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="npwp" label="Tax ID (NPWP)" inputMode="numeric" />
              <TextField name="npwpName" label="Name on tax ID" />
              <TextField name="bpjsTenagaKerjaNumber" label="BPJS Employment number" inputMode="numeric" />
              <TextField name="bpjsKesehatanNumber" label="BPJS Health number" inputMode="numeric" />
            </div>
          </Section>

          <Section title="Address">
            <TextField name="idCardAddress" label="Address on identity document" required autoComplete="street-address" placeholder="Street, number, RT / RW" />
            <ZipPicker token={token} name="idCardZip" label="Postal code" />
            <SameAddressCheckbox />
            {!values.isDomicileSameAsIdCard && (
              <div className="flex flex-col gap-4 rounded-xl border border-border-1 bg-bg-subtle p-4">
                <TextField name="domicileAddress" label="Domicile address" required placeholder="Street, number, RT / RW" />
                <ZipPicker token={token} name="domicileZip" label="Postal code" />
              </div>
            )}
          </Section>

          {/* Bilah aksi menempel di bawah supaya tombol simpan selalu terjangkau di formulir panjang. */}
          <div className="sticky bottom-0 z-[2] -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-fog bg-white/95 px-5 py-3.5 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
            <span className="hidden items-center gap-1.5 font-body text-xs font-medium text-fg-3 sm:flex">
              <Clock className="size-3.5" />
              Saving keeps your answers on this link until {formatDateTime(state.expiresAt)}.
            </span>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? 'Saving…' : 'Save and continue'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

/* ─────────────────────────── Dokumen ─────────────────────────── */

type DocKind = 'cv' | 'id-card';

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function UploadTile({
  icon,
  title,
  hint,
  accept,
  uploaded,
  file,
  busy,
  error,
  onPick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  accept: string;
  uploaded: boolean;
  file?: { name: string; size: number };
  busy: boolean;
  error?: string;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) onPick(dropped);
      }}
      className={cn(
        'flex flex-col gap-3 rounded-xl border px-4 py-4 transition-[border-color,background] duration-200 ease-standard sm:flex-row sm:items-center sm:gap-4',
        uploaded ? 'border-success-200 bg-success-50/60' : 'border-dashed border-silver bg-white',
        over && 'border-solid border-secondary-500 bg-primary-50',
        error && 'border-error-500',
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-lg [&_svg]:size-5',
          uploaded ? 'bg-success-100 text-success-700' : 'bg-primary-50 text-secondary-600',
        )}
      >
        {uploaded ? <Check /> : icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-body text-sm font-bold text-fg-1">
          {title}
          {uploaded && <StatusBadge tone="ok">Uploaded</StatusBadge>}
        </span>
        {uploaded && file ? (
          <span className="truncate font-body text-xs font-medium text-fg-2" title={file.name}>
            {file.name} · {sizeLabel(file.size)}
          </span>
        ) : (
          <span className="font-body text-xs font-medium text-fg-3">{busy ? 'Uploading…' : hint}</span>
        )}
        {error && <span className="font-body text-xs font-medium text-error-700">{error}</span>}
      </div>
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Uploading…' : uploaded ? 'Replace file' : 'Choose file'}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) onPick(picked);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function DocumentsStep({
  state,
  files,
  pendingKind,
  errors,
  onPick,
  onBack,
  onNext,
}: {
  state: PortalState;
  files: Partial<Record<DocKind, { name: string; size: number }>>;
  pendingKind: DocKind | null;
  errors: Partial<Record<DocKind, string>>;
  onPick: (kind: DocKind, file: File) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const ready = state.cvUploaded && state.idPhotoUploaded;
  return (
    <div className="flex flex-col gap-5">
      <StepHeading title="Documents" sub="Upload your CV and a clear photo of your ID card. Each file can be up to 5 MB. You can also drag a file onto its box." />
      <UploadTile
        icon={<FileText />}
        title="CV"
        hint="PDF only, up to 5 MB."
        accept="application/pdf"
        uploaded={state.cvUploaded}
        file={files.cv}
        busy={pendingKind === 'cv'}
        error={errors.cv}
        onPick={(file) => onPick('cv', file)}
      />
      <UploadTile
        icon={<IdCard />}
        title="ID card photo"
        hint="JPEG or PNG, up to 5 MB. Make sure all text is readable."
        accept="image/jpeg,image/png"
        uploaded={state.idPhotoUploaded}
        file={files['id-card']}
        busy={pendingKind === 'id-card'}
        error={errors['id-card']}
        onPick={(file) => onPick('id-card', file)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fog pt-5">
        <Button variant="ghost" onClick={onBack} className="min-w-0 px-0">
          Back to my data
        </Button>
        <Button disabled={!ready} onClick={onNext}>
          Continue to review
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Review ─────────────────────────── */

function Facts({ title, onEdit, rows }: { title: string; onEdit?: () => void; rows: [string, ReactNode][] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-1 p-4">
      <header className="flex items-center justify-between gap-3">
        <h3 className="m-0 font-display text-[15px] font-bold text-fg-1">{title}</h3>
        {onEdit && (
          <Button variant="ghost" onClick={onEdit} className="h-auto min-w-0 px-0">
            Edit
          </Button>
        )}
      </header>
      <dl className="m-0 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="font-body text-xs font-medium text-fg-3">{label}</dt>
            <dd className="m-0 break-words font-body text-[13px] font-semibold text-fg-1">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const areaLine = (area: ZipArea | null) =>
  area ? `${area.villageName}, ${area.districtName}, ${area.regencyName}, ${area.provinceName} ${area.zip}` : '';

function ReviewStep({
  state,
  files,
  pending,
  onEditData,
  onEditDocuments,
  onSubmit,
}: {
  state: PortalState;
  files: Partial<Record<DocKind, { name: string; size: number }>>;
  pending: boolean;
  onEditData: () => void;
  onEditDocuments: () => void;
  onSubmit: () => void;
}) {
  const p = state.profile;
  const citizen = p.nationality === 'CITIZEN';
  return (
    <div className="flex flex-col gap-5">
      <StepHeading title="Review and submit" sub="Check your details once more. After you submit, the HR team receives your data and this link stops working." />
      <Facts
        title="Identity and contact"
        onEdit={onEditData}
        rows={[
          ['Full name', p.candidateName],
          ['Nationality', citizen ? 'Indonesian citizen' : 'Foreign national'],
          ...(citizen
            ? ([['ID card (KTP) number', <span className="tabular-nums">{p.idCardNumber}</span>]] as [string, ReactNode][])
            : ([
                ['Passport number', p.passportNumber],
                ['Visa number', p.visaNumber],
              ] as [string, ReactNode][])),
          ['Mobile phone number', <span className="tabular-nums">{p.candidatePhone}</span>],
        ]}
      />
      <Facts
        title="Personal details"
        onEdit={onEditData}
        rows={[
          ['Place and date of birth', `${p.placeOfBirth}${p.dateOfBirth ? `, ${formatDate(p.dateOfBirth)}` : ''}`],
          ['Gender', p.gender],
          ['Marital status', p.maritalStatus],
          ['Last education', p.lastEducation],
        ]}
      />
      <Facts
        title="Address"
        onEdit={onEditData}
        rows={[
          ['Address on ID card', `${p.idCardAddress}. ${areaLine(p.idCardZip)}`],
          ['Where you live now', p.isDomicileSameAsIdCard ? 'Same as ID card' : `${p.domicileAddress}. ${areaLine(p.domicileZip)}`],
        ]}
      />
      <Facts
        title="Documents"
        onEdit={onEditDocuments}
        rows={[
          ['CV', files.cv?.name ?? 'Uploaded'],
          ['ID card photo', files['id-card']?.name ?? 'Uploaded'],
        ]}
      />
      <div className="flex flex-col gap-3 rounded-xl bg-primary-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2 font-body text-[13px] font-medium leading-[1.5] text-secondary-800">
          <Lock className="mt-0.5 size-4 shrink-0" />
          Your data goes only to the HR team that invited you.
        </span>
        <Button disabled={pending} onClick={onSubmit} className="shrink-0">
          {pending ? 'Submitting…' : 'Submit my data'}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Selesai & tautan mati ─────────────────────────── */

function DoneStep({ name }: { name: string }) {
  const first = name.trim().split(/\s+/)[0];
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-success-100 text-success-700 ring-8 ring-success-50 motion-safe:animate-card-reveal">
        <Check className="size-8" strokeWidth={2.25} />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-bold text-fg-1">{first ? `Thank you, ${first}!` : 'Thank you!'}</h2>
        <p className="m-0 max-w-[46ch] font-body text-sm font-medium leading-[1.55] text-fg-3">
          Your data was sent to the HR team. This link no longer works, so you can close this page.
        </p>
      </div>
      <ol className="m-0 flex w-full max-w-md list-none flex-col gap-0 rounded-xl border border-border-1 p-0 text-left">
        {[
          ['The HR team checks your data', 'They make sure everything matches your documents.'],
          ['They contact you about the next step', 'By email or the phone number you gave us.'],
        ].map(([title, sub], i) => (
          <li key={title} className="flex items-start gap-3 border-t border-fog px-4 py-3.5 first:border-t-0">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-50 font-body text-xs font-bold tabular-nums text-secondary-700">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-body text-[13px] font-bold text-fg-1">{title}</span>
              <span className="font-body text-xs font-medium text-fg-3">{sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DeadLink({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-vapor text-fg-3">
        <Link2Off className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-xl font-bold text-fg-1">This link cannot be used</h2>
        <p className="m-0 max-w-[48ch] font-body text-[13px] font-medium leading-[1.55] text-fg-3">
          It may have expired, been used already, or been replaced by a newer link. Ask the HR team that invited you to send
          a new one.
        </p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/* ─────────────────────────── Halaman ─────────────────────────── */

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
  const progress = state?.step ?? 'CONSENT';
  const step = view ?? progress;
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<Partial<Record<DocKind, { name: string; size: number }>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<DocKind, string>>>({});
  const main = useRef<HTMLDivElement>(null);

  const open = (next: PortalStep | null) => {
    setView(next);
    main.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const apply = (next: PortalState) => {
    setError('');
    queryClient.setQueryData(['candidate-portal', token], next);
    open(null);
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
    mutationFn: ({ kind, file }: { kind: DocKind; file: File }) => candidatePortalService.upload(token, companyCode, kind, file),
    onMutate: ({ kind }) => setFileErrors((prev) => ({ ...prev, [kind]: undefined })),
    onSuccess: (next, { kind, file }) => {
      setFiles((prev) => ({ ...prev, [kind]: { name: file.name, size: file.size } }));
      // Tetap di layar Documents setelah unggah; kandidat sendiri yang lanjut ke Review.
      queryClient.setQueryData(['candidate-portal', token], next);
      setView('DOCUMENTS');
    },
    onError: (err: Error, { kind }) => setFileErrors((prev) => ({ ...prev, [kind]: wipe(err.message) })),
  });
  const submit = useMutation({
    mutationFn: () => candidatePortalService.submit(token, companyCode),
    onSuccess: (next) => {
      setDone(next);
      open(null);
    },
    onError: (err: Error) => setError(wipe(err.message)),
  });

  useEffect(() => {
    document.title = 'Candidate data · SEVAKA';
  }, []);

  const invalid = !token || query.isError;
  const urgent = state && progress !== 'DONE' && Date.parse(state.expiresAt) - Date.now() < 3 * 3_600_000;

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      {/* Pita merek — gradien yang sama dengan halaman masuk, supaya kandidat mengenali SEVAKA. */}
      <header className="bg-[linear-gradient(140deg,var(--color-secondary-600)_0%,var(--color-secondary-500)_42%,var(--color-primary-500)_100%)] px-4 pb-24 pt-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2" aria-label="SEVAKA">
              <SevakaWordmark className="text-[22px] text-white" />
            </span>
            {state && !invalid && progress !== 'DONE' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-body text-xs font-semibold',
                  urgent ? 'bg-warning-100 text-warning-800' : 'bg-white/15 text-white',
                )}
              >
                <Clock className="size-3.5" />
                Link valid until {formatDateTime(state.expiresAt)}
              </span>
            )}
          </div>
          <div className="flex max-w-2xl flex-col gap-2.5">
            <h1 className="m-0 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-[32px]">
              Complete your application data
            </h1>
            <p className={cn('m-0 font-body text-sm font-medium leading-[1.55] text-white/85', invalid && 'hidden')}>
              Four short steps, about 10 minutes. Each step is saved when you continue, so you can stop and come back with the
              same link.
            </p>
          </div>
        </div>
      </header>

      <div ref={main} className="mx-auto -mt-16 grid w-full max-w-5xl scroll-mt-4 gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
        {state && !invalid && (
          <aside className="hidden flex-col gap-4 lg:sticky lg:top-6 lg:flex">
            <div className="rounded-2xl border border-border-1 bg-white p-5 shadow-card-sm">
              <StepRail progress={progress} view={step} onOpen={open} />
            </div>
            <div className="flex items-start gap-2.5 rounded-xl px-1 font-body text-xs font-medium leading-[1.5] text-fg-3">
              <ShieldCheck className="mt-px size-4 shrink-0 text-secondary-600" />
              This link is personal. Do not forward it, because anyone with the link can fill in this form.
            </div>
          </aside>
        )}

        <main
          className={cn(
            'flex min-w-0 flex-col gap-5 rounded-2xl border border-border-1 bg-white p-5 shadow-card sm:p-8',
            (invalid || !state) && 'lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl',
          )}
        >
          {invalid ? (
            <DeadLink onRetry={() => void query.refetch()} />
          ) : !state ? (
            <div className="flex flex-col gap-3 py-2" aria-busy="true" aria-label="Loading">
              <span className="h-6 w-1/2 animate-pulse rounded-md bg-fog" />
              <span className="h-4 w-3/4 animate-pulse rounded-md bg-fog" />
              <span className="mt-2 h-48 animate-pulse rounded-xl bg-vapor" />
            </div>
          ) : (
            <>
              {state && <StepBar progress={progress} view={step} />}

              {error && (
                <Note tone="danger" icon={<Link2Off />}>
                  {error}
                </Note>
              )}

              <div key={step} className="flex flex-col motion-safe:animate-card-reveal">
                {step === 'CONSENT' && (
                  <ConsentStep state={state} declined={declined} pending={consent.isPending} onAnswer={(ok) => consent.mutate(ok)} />
                )}
                {step === 'PROFILE' && <ProfileStep token={token} state={state} onSaved={apply} />}
                {step === 'DOCUMENTS' && (
                  <DocumentsStep
                    state={state}
                    files={files}
                    pendingKind={upload.isPending ? (upload.variables?.kind ?? null) : null}
                    errors={fileErrors}
                    onPick={(kind, file) => upload.mutate({ kind, file })}
                    onBack={() => open('PROFILE')}
                    onNext={() => open('READY')}
                  />
                )}
                {step === 'READY' && (
                  <ReviewStep
                    state={state}
                    files={files}
                    pending={submit.isPending}
                    onEditData={() => open('PROFILE')}
                    onEditDocuments={() => open('DOCUMENTS')}
                    onSubmit={() => submit.mutate()}
                  />
                )}
                {step === 'DONE' && <DoneStep name={state.profile.candidateName} />}
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="mt-auto pb-6 text-center font-body text-[11px] font-medium text-fg-4">
        © 2025 PT Danamas Insan Kreasi Andalan · Powered by SEVAKA
      </footer>
    </div>
  );
}
