import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { BRANCHES } from '@/features/attendance/mock-data';
import { geofenceSchema } from '@/features/attendance/validation';
import { useSaveGeofence } from '@/features/attendance/hooks/useGeofences';
import { ARRANGEMENTS, ARRANGEMENT_LABEL } from '@/features/attendance/types';
import type { Geofence, GeofenceDraft, WorkArrangement } from '@/features/attendance/types';

const BRANCH_OPTIONS = BRANCHES.map((row) => ({ value: row.id, label: row.name }));

const BLANK_RULES = ARRANGEMENTS.reduce(
  (acc, key) => ({ ...acc, [key]: { radius: false, selfie: false } }),
  {} as GeofenceDraft['rules'],
);

function toDraft(row: Geofence | null): GeofenceDraft {
  if (!row) {
    return {
      geofenceName: '',
      scopeRef: '',
      centerLatitude: '' as unknown as number,
      centerLongitude: '' as unknown as number,
      radiusMeters: '' as unknown as number,
      // §7.1 — opsional dengan default true.
      isActive: true,
      rules: structuredClone(BLANK_RULES),
    };
  }
  return {
    geofenceName: row.geofenceName,
    scopeRef: row.scopeRef,
    centerLatitude: row.centerLatitude,
    centerLongitude: row.centerLongitude,
    radiusMeters: row.radiusMeters,
    isActive: row.isActive,
    rules: structuredClone(row.rules),
  };
}

/**
 * Matriks capture — empat baris terkunci sistem × dua flag eksplisit.
 * Tidak ada default tersirat dan tidak ada baris kelima yang bisa ditambahkan.
 */
function CaptureMatrix({
  rules,
  onToggle,
}: {
  rules: GeofenceDraft['rules'];
  onToggle: (arrangement: WorkArrangement, flag: 'radius' | 'selfie', next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>
        Capture matrix<em>*</em>
      </Label>
      <div className="overflow-hidden rounded-[10px] border border-border-1">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {['Work arrangement', 'Radius required', 'Selfie required'].map((header, index) => (
                <th
                  key={header}
                  className={`border-b border-border-1 bg-mist px-3 py-2.5 font-body text-[11px] font-bold uppercase tracking-[0.04em] text-fg-3 ${
                    index === 0 ? 'text-left' : 'text-center'
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ARRANGEMENTS.map((arrangement, index) => (
              <tr key={arrangement}>
                <td
                  className={`px-3 py-2.5 font-body text-xs font-medium text-fg-1 ${
                    index < ARRANGEMENTS.length - 1 ? 'border-b border-border-1' : ''
                  }`}
                >
                  {ARRANGEMENT_LABEL[arrangement]} <span className="text-fg-4">({arrangement})</span>
                </td>
                {(['radius', 'selfie'] as const).map((flag) => (
                  <td
                    key={flag}
                    className={`px-3 py-2.5 text-center ${
                      index < ARRANGEMENTS.length - 1 ? 'border-b border-border-1' : ''
                    }`}
                  >
                    <Checkbox
                      aria-label={`${arrangement} ${flag}`}
                      checked={rules[arrangement][flag]}
                      onCheckedChange={(next) => onToggle(arrangement, flag, next === true)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="font-body text-xs font-normal text-fg-3">
        All four rows, both checkboxes each — explicit by design, no implied defaults.
      </span>
    </div>
  );
}

function ActiveToggle() {
  const { values, setFieldValue } = useFormikContext<GeofenceDraft>();
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Checkbox
        id="isActive"
        checked={values.isActive}
        onCheckedChange={(next) => void setFieldValue('isActive', next === true)}
      />
      <span className="font-body text-[13px] font-medium text-fg-2">Active — evaluated for new taps</span>
    </label>
  );
}

export function GeofenceFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Geofence | null;
  onClose: () => void;
}) {
  const save = useSaveGeofence();

  /**
   * Matriks dipegang React state, bukan Formik: `setFieldValue` membaca
   * `values` dari closure, jadi dua centang beruntun saling menimpa. Updater
   * fungsional di sini tidak pernah kehilangan centang.
   */
  const [rules, setRules] = useState<GeofenceDraft['rules']>(() => toDraft(editing).rules);
  useEffect(() => {
    if (open) setRules(toDraft(editing).rules);
  }, [open, editing]);

  const toggleRule = (arrangement: WorkArrangement, flag: 'radius' | 'selfie', next: boolean) =>
    setRules((prev) => ({ ...prev, [arrangement]: { ...prev[arrangement], [flag]: next } }));

  return (
    <Formik<GeofenceDraft>
      initialValues={toDraft(editing)}
      validationSchema={geofenceSchema}
      enableReinitialize
      onSubmit={(values, helpers) =>
        // Penolakan gerbang (409) tetap membuka modal supaya isinya bisa diperbaiki.
        save.mutate(
          {
            draft: {
              ...values,
              rules,
              centerLatitude: Number(values.centerLatitude),
              centerLongitude: Number(values.centerLongitude),
              radiusMeters: Number(values.radiusMeters),
            },
            id: editing?.id,
          },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            title={editing ? 'Edit work point' : 'New work point'}
            description="A branch may legitimately own more than one point; the name only has to be unique among the active points of the same branch."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save work point'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="geofenceName"
                  label="Point name"
                  required
                  maxLength={150}
                  placeholder="Input text here"
                  hint="3–150 characters."
                />
                <SelectField
                  name="scopeRef"
                  label="Branch"
                  required
                  placeholder="Select branch"
                  options={BRANCH_OPTIONS}
                  hint="Read from the company service, not stored here."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="centerLatitude" type="number" step="0.000001" label="Latitude" required placeholder="-6.208763" />
                <TextField name="centerLongitude" type="number" step="0.000001" label="Longitude" required placeholder="106.845599" />
              </div>

              <TextField
                name="radiusMeters"
                type="number"
                step="1"
                label="Radius (metres)"
                required
                placeholder="e.g. 120"
                hint="A positive whole number. A radius under typical phone GPS accuracy raises a warning, not a refusal."
              />

              <CaptureMatrix rules={rules} onToggle={toggleRule} />
              <ActiveToggle />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
