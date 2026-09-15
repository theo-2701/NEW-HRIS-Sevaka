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
                ? `Mem-waive "${task.name}" menandainya WAIVED sehingga berhenti memblokir transisi. Tercatat di audit log dengan identitas Anda.`
                : ''
            }
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={waive.isPending}>
                  {waive.isPending ? 'Memproses…' : 'Waive task'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <FormField
                name="control"
                label="Kelas kontrol"
                required
                hint="Elevated wajib untuk task yang clearance-blocking."
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
                label="Alasan waive"
                required
                rows={2}
                maxLength={150}
                placeholder="Kenapa task ini di-waive?"
              />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
