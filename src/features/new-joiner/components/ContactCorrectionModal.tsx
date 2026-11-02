import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { useCorrectCandidateContact } from '@/features/new-joiner/hooks/useNewJoiner';
import { CANDIDATE_PHONE, normalizePhone } from '@/features/new-joiner/validation';
import type { Candidate } from '@/features/new-joiner/types';

const schema = Yup.object({
  phone: Yup.string()
    .trim()
    .test('phone', 'Use a mobile number that starts with 08 or +628.', (value) => !value || CANDIDATE_PHONE.test(normalizePhone(value))),
  email: Yup.string().trim().email('Enter a valid email address.'),
});

/**
 * Koreksi kontak calon APPROVED (TSD-EMPLOYEE 0.203 §7.4.15 B) — HR Manager / Super Admin. Kosong =
 * tidak diubah; bentrok dengan akun lain hanya menyebut nama medan.
 */
export function ContactCorrectionModal({
  candidate,
  role,
  onClose,
}: {
  candidate: Candidate | null;
  role?: string;
  onClose: () => void;
}) {
  const correct = useCorrectCandidateContact();
  if (!candidate) return null;

  return (
    <Formik
      initialValues={{ phone: '', email: '' }}
      validationSchema={schema}
      onSubmit={(values) =>
        correct.mutate({ id: candidate.id, phone: values.phone, email: values.email, role }, { onSuccess: onClose })
      }
    >
      {({ submitForm, values }) => (
        <Modal
          open
          onOpenChange={(next) => !next && onClose()}
          title="Correct contact"
          description={`${candidate.name} stays approved. Fill in at least one field; an empty field is kept.`}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={correct.isPending || !(values.phone.trim() || values.email.trim())}>
                {correct.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <TextField
              name="phone"
              label="Mobile phone"
              inputMode="tel"
              placeholder="08… or +628…"
              hint={`Current: ${candidate.phone || '—'}`}
            />
            <TextField name="email" type="email" label="Email" placeholder="name@example.com" hint={`Current: ${candidate.email}`} />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
