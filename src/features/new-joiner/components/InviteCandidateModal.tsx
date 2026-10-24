import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Form, Formik, useFormikContext } from 'formik';
import { Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/FormField';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { RadioBranch } from '@/components/RadioBranch';
import { useRequisitions } from '@/features/manpower/hooks/useManpower';
import { UNIT_OPTIONS, labelOf } from '@/features/manpower/types';
import { Note } from '@/features/new-joiner/components/CandidateBits';
import { useAtsCandidatesForNewJoiner, useInviteCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { isPickableRequisition } from '@/features/new-joiner/services/new-joiner.service';
import { inviteSchema } from '@/features/new-joiner/validation';
import { positionsForRequisition } from '@/features/new-joiner/types';
import type { Candidate, CandidateSource, InviteDraft } from '@/features/new-joiner/types';

const EMPTY: InviteDraft = { requisitionId: '', positionId: '', source: 'EMAIL', email: '', atsBridgeId: '' };

const SOURCES = [
  {
    value: 'EMAIL' as const,
    title: 'Invite by email',
    description: 'The candidate gets a link to fill in their own data and upload their documents.',
  },
  {
    value: 'ATS' as const,
    title: 'From ATS',
    description: 'Use a candidate who already completed their data in ATS Bridge.',
  },
];

/**
 * Requisition → Organization Unit (terkunci, dari requisition) → Position (checklist requisition, atau
 * seluruh posisi unit). Ganti requisition saat posisi sudah dipilih = konfirmasi dulu (FSD 0.83 §4.1).
 */
function SeatFields() {
  const { data: requisitions = [] } = useRequisitions();
  const { values, setFieldValue } = useFormikContext<InviteDraft>();
  const [pendingRequisition, setPendingRequisition] = useState<{ from: string; to: string } | null>(null);
  const chosen = requisitions.find((row) => row.id === values.requisitionId);
  const positions = chosen ? positionsForRequisition(chosen) : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField
        name="requisitionId"
        label="Requisition"
        required
        placeholder="Select an approved requisition"
        options={requisitions
          .filter((row) => isPickableRequisition(row))
          .map((row) => ({ value: row.id, label: `${row.id} — ${row.title}` }))}
        hint={chosen ? `Requested by ${chosen.maker}` : 'Only approved requisitions that are still active.'}
        onValueChange={(next) => {
          // Nilai lama tetap utuh sampai dikonfirmasi; tanpa posisi terpilih langsung berganti.
          if (values.positionId && next !== values.requisitionId) {
            void setFieldValue('requisitionId', values.requisitionId);
            setPendingRequisition({ from: values.requisitionId, to: next });
          }
        }}
        containerClassName="md:col-span-2"
      />
      <ConfirmDialog
        open={Boolean(pendingRequisition)}
        tone="primary"
        title="Change the requisition?"
        description="The organization unit follows the new requisition and the chosen position is cleared."
        confirmLabel="Change Requisition"
        cancelLabel="Keep Current"
        onOpenChange={(open) => !open && setPendingRequisition(null)}
        onConfirm={() => {
          if (!pendingRequisition) return;
          void setFieldValue('requisitionId', pendingRequisition.to);
          void setFieldValue('positionId', '');
          setPendingRequisition(null);
        }}
      />
      <FormField name="unit" label="Organization Unit" hint="Follows the requisition.">
        <Input id="unit" value={chosen ? labelOf(UNIT_OPTIONS, chosen.unitId) : ''} placeholder="—" readOnly disabled />
      </FormField>
      <SelectField
        name="positionId"
        label="Position"
        required
        disabled={!chosen}
        placeholder={chosen ? 'Select a position' : 'Select a requisition first'}
        options={positions.map((item) => ({ value: item.value, label: `${item.code} - ${item.name}` }))}
      />
    </div>
  );
}

function SourceFields({ atsOptions, atsLoading }: { atsOptions: { value: string; label: string }[]; atsLoading: boolean }) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<InviteDraft>();

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <legend className="mb-1 select-none font-body text-base font-bold leading-[1.2] text-fg-2">
        Candidate Source <em className="ml-0.5 not-italic text-error-500">*</em>
      </legend>
      <RadioBranch<CandidateSource>
        name="source"
        value={values.source}
        onChange={(next) => {
          void setFieldValue('source', next);
          void setFieldTouched('email', false);
          void setFieldTouched('atsBridgeId', false);
        }}
        options={SOURCES}
      />
      {values.source === 'EMAIL' ? (
        <TextField
          name="email"
          type="email"
          label="Candidate Email"
          required
          placeholder="name@email.com"
          hint="The link is valid for 24 hours. You can resend it from the list."
        />
      ) : atsOptions.length === 0 && !atsLoading ? (
        <Note icon={<Info />}>No ATS candidate is available. Candidates must complete their data and agree to the consent first.</Note>
      ) : (
        <SelectField
          name="atsBridgeId"
          label="ATS Candidate"
          required
          placeholder={atsLoading ? 'Loading…' : 'Select a candidate'}
          options={atsOptions}
          hint="Candidates who completed the form, are not from Bulk Import, and are not held by another new joiner."
        />
      )}
    </fieldset>
  );
}

/**
 * NJ-CREATE (FSD-001-EMPLOYEE 0.46 §4.1). Invite by email melahirkan calon WAITING_CANDIDATE dan
 * mengirim tautan portal; From ATS langsung melahirkan DRAFT berisi data kandidat.
 */
export function InviteCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteCandidate();
  const [done, setDone] = useState<Candidate | null>(null);
  const { data: ats = [], isLoading: atsLoading } = useAtsCandidatesForNewJoiner(open);
  const atsOptions = ats.map((row) => ({ value: row.id, label: `${row.candidateName ?? '—'} - ${row.candidateEmail}` }));

  const finish = () => {
    setDone(null);
    onClose();
  };

  if (done) {
    const waiting = done.status === 'WAITING_CANDIDATE';
    return (
      <Modal
        open
        onOpenChange={(next) => !next && finish()}
        title={waiting ? 'Invitation sent' : 'Candidate added'}
        footer={<Button onClick={finish}>Done</Button>}
      >
        <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
          {waiting
            ? `We sent an invitation link to ${done.email}. The candidate shows as Waiting for Candidate until they submit their data, then becomes a draft for you to check.`
            : `${done.name} was added as a draft with their ATS data. Check the data, set the intended join date with Edit, then submit.`}
        </p>
      </Modal>
    );
  }

  return (
    <Formik<InviteDraft>
      initialValues={EMPTY}
      validationSchema={inviteSchema}
      onSubmit={(values, helpers) => {
        invite.mutate(values, {
          onSuccess: (row) => {
            helpers.resetForm();
            setDone(row);
          },
        });
      }}
    >
      {({ submitForm, resetForm, values }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="Add Candidate"
            description="Choose the seat, then how the candidate's data comes in. The candidate fills in their own identity data."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => void submitForm()} disabled={invite.isPending}>
                  {invite.isPending ? 'Sending…' : values.source === 'EMAIL' ? 'Send Invitation' : 'Add Candidate'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-5">
              <SeatFields />
              <SourceFields atsOptions={atsOptions} atsLoading={atsLoading} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
