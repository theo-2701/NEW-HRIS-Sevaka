import { Form, Formik } from 'formik';
import { TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/Segmented';
import { TextAreaField } from '@/components/form/TextAreaField';
import { FormField } from '@/components/form/FormField';
import { Note } from '@/features/transitions/components/TransitionBits';
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
              <Note tone="warn" icon={<TriangleAlert />}>
                <strong>GAP · PROB-FRONTEND-003</strong> — endpoint waive task (kelas kontrol D3) belum dikonfirmasi
                di kontrak API. Aksi ini mengikuti model data yang terdokumentasi; penegakannya ditunda.
              </Note>

              <FormField
                name="control"
                label="Kelas kontrol"
                required
                hint="Elevated wajib untuk task yang clearance-blocking."
              >
                <Segmented<Control>
                  value={values.control}
                  onChange={(next) => void setFieldValue('control', next)}
                  options={[
                    { value: 'STANDARD', label: 'Standard' },
                    { value: 'ELEVATED', label: 'Elevated' },
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
