import { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import { SelectField } from '@/components/form/SelectField';
import { ToggleField } from '@/components/form/ToggleField';
import type { WorkPattern } from '@/features/new-joiner/newEmployee';

/**
 * Pola Kerja (TSD-EMPLOYEE 0.204–0.205 §6.2/§7.4.4/§7.2.5; CATATAN 27 Okt FRT-2610271835 T1):
 * `work_arrangement` WFO/WFH wajib, `radius_validation` (WFO aktif bawaan; WFH selalu mati dan
 * terkunci), `is_selfie` (aktif bawaan). Dipakai Process Candidate, ATS Create Employee, dan
 * Edit Work Data supaya ketiganya sama.
 */
export function WorkPatternFields() {
  const { values, setFieldValue } = useFormikContext<WorkPattern>();

  // WFH ⇒ radius tidak berlaku; kembali ke WFO ⇒ radius aktif lagi (0.205). Hanya saat pilihan BERUBAH,
  // supaya nilai tersimpan (mis. WFO tanpa radius) tidak tertimpa saat form dibuka.
  const previous = useRef(values.workArrangement);
  useEffect(() => {
    if (previous.current === values.workArrangement) return;
    previous.current = values.workArrangement;
    void setFieldValue('radiusValidation', values.workArrangement === 'WFO');
  }, [values.workArrangement, setFieldValue]);

  return (
    <>
      <SelectField
        name="workArrangement"
        label="Work Pattern"
        required
        options={[
          { value: 'WFO', label: 'Work from office (WFO)' },
          { value: 'WFH', label: 'Work from home (WFH)' },
        ]}
        hint="WFO employees who tap from home need their manager's approval."
      />
      <div className="flex flex-col gap-3 pt-1">
        <ToggleField
          name="radiusValidation"
          label="Radius validation"
          disabled={values.workArrangement === 'WFH'}
          hint={values.workArrangement === 'WFH' ? 'Not used for work from home.' : 'Taps must be within the work point radius.'}
        />
        <ToggleField name="isSelfie" label="Selfie on tap" hint="Off hides the selfie step on the punch screen." />
      </div>
    </>
  );
}
