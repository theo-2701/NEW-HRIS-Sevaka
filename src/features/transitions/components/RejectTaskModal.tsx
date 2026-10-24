import { Form, Formik } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextAreaField } from '@/components/form/TextAreaField';
import { useRejectTask } from '@/features/transitions/hooks/useTransitions';
import { rejectSchema } from '@/features/transitions/validation';
import type { TransitionTask } from '@/features/transitions/types';

/** MTT-REJECT (FSD 0.83 §18.2) — tugas kembali ke petugas dengan alasan wajib. */
export function RejectTaskModal({
  transitionId,
  task,
  onClose,
}: {
  transitionId: string;
  task: TransitionTask | null;
  onClose: () => void;
}) {
  const reject = useRejectTask();
  return (
    <Formik
      initialValues={{ reason: '' }}
      enableReinitialize
      validationSchema={rejectSchema}
      onSubmit={({ reason }, helpers) => {
        if (!task) return;
        reject.mutate(
          { transitionId, taskId: task.id, reason },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        );
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(task)}
          onOpenChange={(next) => !next && onClose()}
          title="Reject task"
          description={task ? `"${task.name}" goes back to the handler with your reason. Two-party tasks need the employee's confirmation again.` : ''}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="danger" onClick={submitForm} disabled={reject.isPending}>
                {reject.isPending ? 'Rejecting…' : 'Reject'}
              </Button>
            </>
          }
        >
          <Form>
            <TextAreaField name="reason" label="Reason" required rows={3} maxLength={500} placeholder="What needs to be fixed?" />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
