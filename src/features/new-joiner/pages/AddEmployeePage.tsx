import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Formik } from 'formik';
import type { FormikProps } from 'formik';
import { PageShell } from '@/components/PageShell';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { AddEmployeeStepper } from '@/features/new-joiner/components/AddEmployeeStepper';
import {
  EmploymentDataStep,
  InviteStep,
  PayrollStep,
  PersonalDataStep,
} from '@/features/new-joiner/components/AddEmployeeSteps';
import { useAddEmployee } from '@/features/new-joiner/hooks/useNewJoiner';
import { EMPTY_EMPLOYEE, STEP_SCHEMAS, STEP_TITLES } from '@/features/new-joiner/addEmployee';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';

const LAST_STEP = STEP_TITLES.length - 1;

/**
 * Add Employee — port `_prototype/add-employee.html`.
 *
 * Jalur manual di luar alur maker/checker New Joiner: HR mengisi empat langkah
 * sekaligus lalu mengonfirmasi. Setiap langkah divalidasi sendiri, jadi galat
 * muncul di langkah tempat datanya diisi, bukan menumpuk di akhir.
 */
export function AddEmployeePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [done, setDone] = useState(false);
  const add = useAddEmployee();

  const cancel = () => navigate('/employees/new-joiner');

  /** Next hanya lolos bila langkah sekarang valid. */
  const goNext = async (formik: FormikProps<AddEmployeeValues>) => {
    const errors = await formik.validateForm();
    const stepFields = Object.keys(STEP_SCHEMAS[step].fields);
    const blocking = stepFields.filter((field) => field in errors);
    if (blocking.length > 0) {
      formik.setTouched(
        { ...formik.touched, ...Object.fromEntries(blocking.map((field) => [field, true])) },
        false,
      );
      return;
    }
    setStep((current) => Math.min(current + 1, LAST_STEP));
  };

  return (
    <Formik<AddEmployeeValues>
      initialValues={EMPTY_EMPLOYEE}
      validationSchema={STEP_SCHEMAS[step]}
      validateOnBlur
      validateOnChange={false}
      onSubmit={(values, helpers) => {
        add.mutate(values, {
          onSuccess: () => {
            setConfirming(false);
            if (addAnother) {
              helpers.resetForm();
              setStep(0);
            } else {
              setDone(true);
            }
          },
        });
      }}
    >
      {(formik) => (
        <>
          <PageShell
            crumbs={[{ label: 'Employee Management' }, { label: 'New Joiner', to: '/employees/new-joiner' }, { label: 'Add Employee' }]}
            title="Add Employee"
            description="Daftarkan karyawan secara manual — dipakai untuk migrasi data dan kasus di luar alur pengajuan kandidat."
          >
            <div className="flex flex-col gap-6">
              <AddEmployeeStepper current={step} onSelect={setStep} />

              <Form className="flex flex-col gap-6">
                {step === 0 && <PersonalDataStep />}
                {step === 1 && <EmploymentDataStep />}
                {step === 2 && <PayrollStep />}
                {step === 3 && <InviteStep />}

                <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border-1 pt-4">
                  <Button variant="secondary" onClick={cancel}>
                    Cancel
                  </Button>
                  {step > 0 && (
                    <Button variant="secondary" onClick={() => setStep((current) => current - 1)}>
                      Back
                    </Button>
                  )}
                  {step < LAST_STEP ? (
                    <Button onClick={() => void goNext(formik)}>Next</Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setAddAnother(true);
                          setConfirming(true);
                        }}
                      >
                        Submit & add another
                      </Button>
                      <Button
                        onClick={() => {
                          setAddAnother(false);
                          setConfirming(true);
                        }}
                      >
                        Submit
                      </Button>
                    </>
                  )}
                </footer>
              </Form>
            </div>
          </PageShell>

          <Modal
            open={confirming}
            onOpenChange={setConfirming}
            title="Kirim data karyawan?"
            description="Pastikan seluruh informasi sudah benar sebelum dikirim."
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void formik.submitForm()} disabled={add.isPending}>
                  {add.isPending ? 'Mengirim…' : 'Submit'}
                </Button>
              </>
            }
          >
            <p className="m-0 font-body text-[13px] font-medium leading-[1.6] text-fg-2">
              Karyawan akan dibuat dengan status <strong>WAITING</strong>. Undangan akun dan email onboarding hanya
              dikirim bila opsinya Anda aktifkan di langkah terakhir.
            </p>
          </Modal>

          <Modal
            open={done}
            onOpenChange={(open) => {
              if (!open) {
                setDone(false);
                navigate('/employees/directory');
              }
            }}
            title="Karyawan ditambahkan"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDone(false);
                    formik.resetForm();
                    setStep(0);
                  }}
                >
                  Add another employee
                </Button>
                <Button onClick={() => navigate('/employees/directory')}>Go to Employee Directory</Button>
              </>
            }
          >
            <p className="m-0 font-body text-[13px] font-medium leading-[1.6] text-fg-2">
              Karyawan baru sudah masuk direktori. Undangan dan email onboarding dikirim sesuai pilihan Anda di
              langkah terakhir.
            </p>
          </Modal>
        </>
      )}
    </Formik>
  );
}
