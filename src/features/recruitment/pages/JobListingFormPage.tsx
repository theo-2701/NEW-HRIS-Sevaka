import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Formik, setNestedObjectValues, yupToFormErrors, type FormikErrors } from 'formik';
import type { ValidationError } from 'yup';
import { Card, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import {
  ApplicationFormStep,
  HiringStageStep,
  HiringTeamStep,
  JobDetailsStep,
  PublicationStep,
  Stepper,
} from '@/features/recruitment/components/JobFormSteps';
import { useJobListing, useSaveJob } from '@/features/recruitment/hooks/useRecruitment';
import { STEPS, emptyDetails, publishSchema, step1Schema, step3Schema, step5Schema } from '@/features/recruitment/jobForm';
import type { JobDetails, JobListing } from '@/features/recruitment/types';
import { toast } from '@/store/ui.store';

const SCHEMA_FOR_STEP: Record<number, typeof step1Schema | typeof step3Schema | typeof step5Schema | undefined> = {
  1: step1Schema,
  3: step3Schema,
  5: step5Schema,
};

/** Langkah pertama yang memuat salah satu field bermasalah — dipakai saat Publish menolak. */
function stepOf(errors: FormikErrors<JobDetails>) {
  const keys = Object.keys(errors);
  if (keys.some((key) => key in step1Schema.fields)) return 1;
  if (keys.some((key) => key in step3Schema.fields)) return 3;
  return 5;
}

const BODY = [JobDetailsStep, ApplicationFormStep, HiringStageStep, HiringTeamStep, PublicationStep];

/**
 * Recruitment › Job Listings › Create / Edit Job Listing — wizard 5 langkah, port
 * `_prototype/recruitment-create-job-listing.html`. `?id=` membuka mode edit, `?step=` langsung ke langkahnya
 * (dipakai tombol Edit di Job Listing Detail).
 */
export function JobListingFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [step, setStep] = useState(() => Math.min(Math.max(Number(params.get('step')) || 1, 1), STEPS.length));
  const [leaving, setLeaving] = useState(false);
  const [published, setPublished] = useState<JobListing | null>(null);
  const { data, isLoading, isError } = useJobListing(id);
  const save = useSaveJob();

  const live = data?.listing.status === 'PUBLISHED';
  const title = id ? 'Edit Job Listing' : 'Create Job Listing';
  const back = () => navigate(id ? `/recruitment/job-listings/detail?id=${id}` : '/recruitment/job-listings');

  if (id && (isLoading || isError || !data)) {
    return (
      <PageShell crumbs={[{ label: 'Recruitment' }, { label: 'Job Listings', to: '/recruitment/job-listings' }, { label: title }]} title={title}>
        {isLoading ? <p className="m-0 font-body text-[13px] text-fg-3">Loading job listing…</p> : <EmptyState title="Job listing not found" description="It may have been deleted." />}
      </PageShell>
    );
  }

  return (
    <Formik<JobDetails>
      initialValues={data?.details ?? emptyDetails()}
      validationSchema={SCHEMA_FOR_STEP[step]}
      onSubmit={() => undefined}
    >
      {({ values, dirty, validateForm, setTouched, setErrors }) => {
        const showErrors = (errors: FormikErrors<JobDetails>) => {
          void setTouched(setNestedObjectValues(errors, true), false);
          setErrors(errors);
          toast('Some fields need your attention.', 'danger');
        };

        const next = async () => {
          const errors = await validateForm();
          if (Object.keys(errors).length) return showErrors(errors);
          setStep(step + 1);
          window.scrollTo({ top: 0 });
        };

        const publish = async () => {
          try {
            await publishSchema.validate(values, { abortEarly: false });
          } catch (error) {
            const errors = yupToFormErrors<JobDetails>(error as ValidationError);
            setStep(stepOf(errors));
            return showErrors(errors);
          }
          save.mutate({ id, details: values, publish: true }, { onSuccess: setPublished });
        };

        const draft = () => {
          if (!values.position) return showErrors({ position: 'Choose a job position before saving.' });
          save.mutate(
            { id, details: values, publish: false },
            {
              onSuccess: (row) => {
                toast(live ? `${row.title} was updated.` : `${row.title} was saved as a draft.`, 'ok');
                navigate(`/recruitment/job-listings/detail?id=${row.id}`);
              },
            },
          );
        };

        const Body = BODY[step - 1];
        return (
          <PageShell
            crumbs={[{ label: 'Recruitment' }, { label: 'Job Listings', to: '/recruitment/job-listings' }, { label: title }]}
            title={title}
            description={data ? `${data.listing.title} · #${data.listing.id}` : undefined}
          >
            <Card className="gap-6">
              <Stepper current={step} onPick={setStep} />
              <Form className="flex flex-col gap-6" noValidate>
                <Body />
              </Form>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-1 pt-4">
                <Button variant="secondary" onClick={() => (dirty ? setLeaving(true) : back())}>
                  Cancel
                </Button>
                <div className="flex flex-wrap gap-2">
                  {step > 1 && (
                    <Button variant="secondary" onClick={() => setStep(step - 1)}>
                      Back
                    </Button>
                  )}
                  <Button variant="secondary" disabled={save.isPending} onClick={draft}>
                    {live ? 'Save Changes' : 'Save As Draft'}
                  </Button>
                  {step < STEPS.length ? (
                    <Button onClick={() => void next()}>Continue</Button>
                  ) : (
                    <Button disabled={save.isPending} onClick={() => void publish()}>
                      {save.isPending ? 'Publishing…' : live ? 'Save & Publish' : 'Publish'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <ConfirmDialog
              open={leaving}
              title="Discard changes?"
              description="You have unsaved changes. If you leave now, all changes will be lost."
              confirmLabel="Discard"
              onConfirm={back}
              onOpenChange={setLeaving}
            />

            <Modal
              open={Boolean(published)}
              onOpenChange={(open) => !open && navigate('/recruitment/job-listings')}
              title="Successfully published"
              description={published ? `${published.title} is live on ${published.platform ?? 'your career page'}.` : undefined}
              footer={
                <>
                  <Button variant="secondary" onClick={() => navigate('/recruitment/job-listings')}>
                    Close
                  </Button>
                  <Button onClick={() => published && navigate(`/recruitment/job-listings/detail?id=${published.id}`)}>View Job Listing</Button>
                </>
              }
            >
              <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
                Candidates can apply from the published date on every platform you enabled. You can unpublish or close the job listing at any time.
              </p>
            </Modal>
          </PageShell>
        );
      }}
    </Formik>
  );
}
