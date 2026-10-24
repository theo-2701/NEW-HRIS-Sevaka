import { Form, Formik } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { RadioBranch } from '@/components/RadioBranch';
import { TextAreaField } from '@/components/form/TextAreaField';
import { FormField } from '@/components/form/FormField';
import { useWaiveTask } from '@/features/transitions/hooks/useTransitions';
import { waiveSchema } from '@/features/transitions/validation';
import type { TransitionTask } from '@/features/transitions/types';

type Control = 'STANDARD' | 'ELEVATED';

/**
 * Waive task — kontrol D3 (STANDARD/ELEVATED) dengan alasan wajib yang ikut
 * tercatat di audit log. Ditandai **GAP `PROB-FRONTEND-003`**: endpoint-nya
 * belum ditegaskan di kontrak, jadi UI-nya siap tapi penegakannya ditunda.
 */
export function WaiveTaskModal({
  transitionId,
  task,
  onClose,
}: {
  transitionId: string;
  task: TransitionTask | null;
  onClose: () => void;
}) {
  const waive = useWaiveTask();

  return (
    <Formik<{ control: Control; reason: string }>
      initialValues={{ control: task?.clearanceBlocking ? 'ELEVATED' : 'STANDARD', reason: '' }}
      enableReinitialize
      validationSchema={waiveSchema}
      onSubmit={(values, helpers) => {
        if (!task) return;
        waive.mutate(
          { transitionId, taskId: task.id, control: values.control, reason: values.reason.trim() },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        );
      }}
    >
      {({ values, setFieldValue, submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };

        return (
          <Modal
            open={Boolean(task)}
            onOpenChange={(open) => !open && close()}
            title="Waive task"
            description={
              task
                ? `Waiving "${task.name}" marks it Waived so it no longer holds the transition. It is recorded in the audit log with your name.`
                : ''
            }
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={waive.isPending}>
                  {waive.isPending ? 'Waiving…' : 'Waive Task'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <FormField
                name="control"
                label="Control class"
                required
                hint="Elevated is required for clearance-blocking tasks."
              >
                <RadioBranch<Control>
                  name="waive-control"
                  value={values.control}
                  onChange={(next) => void setFieldValue('control', next)}
                  options={[
                    { value: 'STANDARD', title: 'Standard' },
                    { value: 'ELEVATED', title: 'Elevated' },
                  ]}
                />
              </FormField>

              <TextAreaField
                name="reason"
                label="Reason"
                required
                rows={2}
                maxLength={150}
                placeholder="Why is this task waived?"
              />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
