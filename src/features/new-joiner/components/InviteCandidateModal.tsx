import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Segmented } from '@/components/Segmented';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { useAtsOptions, useInviteCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { inviteSchema } from '@/features/new-joiner/validation';
import { POSITION_OPTIONS, REQUISITION_DETAIL, REQUISITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import type { CandidateSource, InviteDraft } from '@/features/new-joiner/types';

const EMPTY: InviteDraft = { source: 'INVITE', requisitionId: '', positionId: '', email: '', atsBridgeId: '' };

/**
 * Kaskade Requisition → Organization Unit (terkunci, terisi otomatis) → posisi checklist
 * requisition. Mengganti requisition saat posisi sudah dipilih meminta konfirmasi.
 */
function CascadeFields() {
  const { values, setFieldValue } = useFormikContext<InviteDraft>();
  const [pending, setPending] = useState<string | null>(null);
  const detail = REQUISITION_DETAIL[values.requisitionId];

  const apply = (requisitionId: string) => {
    void setFieldValue('requisitionId', requisitionId);
    void setFieldValue('positionId', '');
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <SelectField
            name="requisitionId"
            label="Requisition"
            required
            placeholder="Select requisition"
            options={REQUISITION_OPTIONS}
            onValueChange={(next) => {
              if (values.positionId && next !== values.requisitionId) {
                setPending(next);
                return false;
              }
              apply(next);
              return false;
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="org-unit">Organization unit</Label>
          <Input id="org-unit" readOnly tabIndex={-1} value={detail?.unit ?? ''} placeholder="Follows the requisition" />
        </div>
      </div>
      <SelectField
        name="positionId"
        label="Position applied for"
        required
        disabled={!detail}
        placeholder={detail ? 'Select position' : 'Select a requisition first'}
        options={(detail?.positions ?? []).map((value) => ({ value, label: labelOf(POSITION_OPTIONS, value) }))}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        title="Change requisition?"
        description="The organization unit follows the new requisition and the chosen position is cleared."
        confirmLabel="Change"
        cancelLabel="Keep current"
        tone="primary"
        onOpenChange={(next) => !next && setPending(null)}
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
      />
    </>
  );
}

function SourceFields() {
  const { values, setFieldValue } = useFormikContext<InviteDraft>();
  const ats = useAtsOptions(values.source === 'ATS');

  useEffect(() => {
    // Ganti sumber mengosongkan isian sumber lama.
    void setFieldValue(values.source === 'ATS' ? 'email' : 'atsBridgeId', '');
  }, [values.source, setFieldValue]);

  return values.source === 'INVITE' ? (
    <TextField
      name="email"
      label="Candidate email"
      required
      type="email"
      autoComplete="off"
      hint="The candidate receives a consent link and fills in their own name, ID, phone, and documents."
    />
  ) : (
    <SelectField
      name="atsBridgeId"
      label="ATS candidate"
      required
      placeholder={ats.data?.length ? 'Select candidate' : 'No available ATS candidate'}
      options={(ats.data ?? []).map((row) => ({ value: row.id, label: `${row.candidateName ?? '—'} - ${row.candidateEmail}` }))}
      hint="Only candidates who agreed and completed their data, and are not held by another submission."
    />
  );
}

/** Add Candidate (TSD-EMPLOYEE §7.4.1; CATATAN 18–19 Okt 2026 T3/T5/T7). */
export function InviteCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteCandidate();
  return (
    <Formik<InviteDraft>
      initialValues={EMPTY}
      validationSchema={inviteSchema}
      onSubmit={(values, helpers) =>
        invite.mutate(values, {
          onSuccess: () => {
            helpers.resetForm();
            onClose();
          },
        })
      }
    >
      {({ values, setFieldValue, submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="Add candidate"
            description="Pick the requisition and position, then invite by email or take a candidate who already completed their data in ATS."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={invite.isPending}>
                  {invite.isPending ? 'Saving…' : values.source === 'INVITE' ? 'Send invitation' : 'Save as draft'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label>Candidate source</Label>
                <Segmented<CandidateSource>
                  value={values.source}
                  onChange={(next) => void setFieldValue('source', next)}
                  options={[
                    { value: 'INVITE', label: 'Invite by email' },
                    { value: 'ATS', label: 'From ATS' },
                  ]}
                />
              </div>
              <CascadeFields />
              <SourceFields />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
