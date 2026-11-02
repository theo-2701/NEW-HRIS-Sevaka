import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Form, Formik, useFormikContext } from 'formik';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/form/TextField';
import { DateField } from '@/components/form/DateField';
import { DocumentField } from '@/components/form/DocumentField';
import { usePortalState, usePortalSubmit } from '@/features/new-joiner/hooks/useNewJoiner';
import { portalSchema } from '@/features/new-joiner/validation';
import type { CandidateProfile, Nationality } from '@/features/new-joiner/types';

const FIVE_MB = 5 * 1024 * 1024;
const TOKEN_KEY = 'sevaka-candidate-token';

/** Token dari fragmen `#t=` disimpan di sessionStorage tab ini lalu fragmen dihapus dari bilah alamat. */
function useCandidateToken() {
  const [token] = useState(() => {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get('t');
    try {
      if (fromHash) sessionStorage.setItem(TOKEN_KEY, fromHash);
      return fromHash ?? sessionStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return fromHash ?? '';
    }
  });
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  return token;
}

/** Naskah consent — tombol Agree aktif setelah digulir sampai akhir. */
function ConsentStep({ onAgree }: { onAgree: () => void }) {
  const [read, setRead] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div
        tabIndex={0}
        aria-label="Consent text — scroll to the end to continue"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setRead(true);
        }}
        className="max-h-[260px] overflow-y-auto rounded-md border border-border-1 bg-cloud p-4 font-body text-[13px] font-medium leading-[1.6] text-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500"
      >
        <p className="m-0 mb-3 font-bold text-fg-1">Personal data consent</p>
        {Array.from({ length: 6 }, (_, i) => (
          <p key={i} className="m-0 mb-3">
            {
              [
                'The company collects your name, identity number, contact details, CV, and ID photo only to process your hiring.',
                'Your identity number is checked for duplicates and stored masked; the full number is never shown to HR on screen.',
                'Documents are kept in the company document store and are visible only to the HR staff handling your hiring.',
                'If you are not hired, your data is kept for the period required by company policy and then deleted.',
                'You can ask HR to correct or delete your data at any time before you become an employee.',
                'By pressing Agree you confirm you have read this text and consent to this processing.',
              ][i]
            }
          </p>
        ))}
      </div>
      <Button disabled={!read} onClick={onAgree} className="self-end">
        Agree and continue
      </Button>
      {!read && <span className="self-end font-body text-xs font-medium text-fg-3">Scroll to the end to enable Agree.</span>}
    </div>
  );
}

function IdentityFields() {
  const { values, setFieldValue } = useFormikContext<CandidateProfile>();
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>
          Nationality<em>*</em>
        </Label>
        <Segmented<Nationality>
          value={values.nationality}
          onChange={(next) => void setFieldValue('nationality', next)}
          options={[
            { value: 'CITIZEN', label: 'Indonesian citizen' },
            { value: 'FOREIGNER', label: 'Foreign national' },
          ]}
        />
      </div>
      {values.nationality === 'CITIZEN' ? (
        <TextField name="idCardNumber" label="ID card number (NIK KTP)" required inputMode="numeric" maxLength={16} />
      ) : (
        <TextField name="passportNumber" label="Passport number" required maxLength={15} />
      )}
    </>
  );
}

/**
 * Portal kandidat publik `/candidate/:companyCode#t=<token>` (TSD-EMPLOYEE §7.4.11;
 * CATATAN 19 Okt 2026 T5). Tautan tak sah/kedaluwarsa ⇒ satu pesan seragam.
 */
export function CandidatePortalPage() {
  const { companyCode } = useParams();
  const token = useCandidateToken();
  const state = usePortalState(token);
  const submit = usePortalSubmit();
  const [step, setStep] = useState<'consent' | 'details' | 'done'>('consent');

  return (
    <main className="flex min-h-dvh items-start justify-center bg-mist px-4 py-10">
      <section className="flex w-full max-w-[640px] flex-col gap-5 rounded-2xl bg-white p-7 shadow-card">
        <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-fg-3">{companyCode}</span>

        {(!token || state.isError) && (
          <>
            <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Link not valid</h1>
            <p role="alert" className="m-0 font-body text-sm font-medium text-fg-2">
              This link is invalid or has expired. Ask HR to send a new one.
            </p>
          </>
        )}

        {state.data && step === 'consent' && (
          <>
            <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Welcome</h1>
            <p className="m-0 font-body text-sm font-medium text-fg-2">
              You were invited for <strong>{state.data.positionLabel}</strong> ({state.data.email}). Read and agree to
              the consent, then fill in your details.
            </p>
            <ConsentStep onAgree={() => setStep('details')} />
          </>
        )}

        {state.data && step === 'details' && (
          <Formik<CandidateProfile>
            initialValues={{
              name: '',
              nationality: 'CITIZEN',
              idCardNumber: '',
              passportNumber: '',
              phone: '',
              intendedJoinDate: '',
              cvFileName: '',
              idPhotoFileName: '',
            }}
            validationSchema={portalSchema}
            onSubmit={(values) => submit.mutate({ token, profile: values }, { onSuccess: () => setStep('done') })}
          >
            <Form className="flex flex-col gap-4">
              <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Your details</h1>
              <TextField name="name" label="Full name (as on ID)" required autoComplete="name" />
              <IdentityFields />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="phone" label="Phone number" required inputMode="tel" autoComplete="tel" placeholder="08…" />
                <DateField name="intendedJoinDate" label="Available start date" required placeholder="Select date" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <DocumentField name="cvFileName" label="CV" required accept=".pdf" maxBytes={FIVE_MB} hint="PDF, up to 5 MB." />
                <DocumentField
                  name="idPhotoFileName"
                  label="ID photo"
                  required
                  accept=".jpg,.jpeg,.png"
                  maxBytes={FIVE_MB}
                  hint="JPEG or PNG, up to 5 MB."
                />
              </div>
              {submit.error && (
                <p role="alert" className="m-0 font-body text-[13px] font-medium text-error-800">
                  {submit.error.message}
                </p>
              )}
              <Button type="submit" disabled={submit.isPending} className="self-end">
                {submit.isPending ? 'Sending…' : 'Send'}
              </Button>
            </Form>
          </Formik>
        )}

        {step === 'done' && (
          <>
            <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Thank you</h1>
            <p role="status" className="m-0 font-body text-sm font-medium text-fg-2">
              Your details were sent to HR. You can close this page; HR will contact you about the next step.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
