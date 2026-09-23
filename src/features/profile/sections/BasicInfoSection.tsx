import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Formik, useFormikContext } from 'formik';
import { Eye, EyeOff, IdCard, Lock, ShieldAlert, User, UserRound } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { PanelActionButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TextField } from '@/components/form/TextField';
import { DateField } from '@/components/form/DateField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { ToggleField } from '@/components/form/ToggleField';
import {
  CertMark,
  DetailBlock,
  Empty,
  KeyValueList,
  KeyValueRow,
  Note,
  PiiHidden,
  SectionCard,
  TwoCol,
  monoClass } from '@/features/profile/components/ProfileBits';
import { EmployeePickerModal } from '@/features/profile/components/EmployeePickerModal';
import { useRevealProfile, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { basicInfoSchema } from '@/features/profile/validation';
import {
  BLOOD_TYPE_OPTIONS,
  DISABILITY_OPTIONS,
  GENDER_OPTIONS,
  HOME_OWNERSHIP_OPTIONS,
  LAST_EDUCATION_OPTIONS,
  MARITAL_OPTIONS,
  NATIONALITY_OPTIONS,
  RELIGION_OPTIONS,
  REVEAL_FIELDS,
  canManageBiodata,
  canUpdateRestricted,
  labelOf,
} from '@/features/profile/types';
import type { PersonalProfile, ProfileActor, ProfileReveal, RevealField } from '@/features/profile/types';
import { formatDate } from '@/lib/format';

/** Bentuk mask detail (UIC-001-PROFILE §2.2); nilai penuh hanya lewat Reveal. */
const MASK: Record<RevealField, (value: string) => ReactNode> = {
  idCardNumber: (value) => <span className={monoClass}>{`${value.slice(0, 4)}••••••••${value.slice(-4)}`}</span>,
  motherMaidenName: () => <PiiHidden>tersembunyi (rahasia KBA)</PiiHidden>,
  npwp: (value) => (
    <span className={monoClass}>
      {/-\d{3}\.\d{3}$/.test(value) ? value.replace(/-(\d{3})\.(\d{3})$/, '-••••-$2') : `${value.slice(0, 4)}••••`}
    </span>
  ),
  bpjsTenagaKerjaNumber: (value) => <span className={monoClass}>{`${value.slice(0, 4)}••••${value.slice(-2)}`}</span>,
  bpjsKesehatanNumber: (value) => <span className={monoClass}>{`${value.slice(0, 4)}••••${value.slice(-2)}`}</span>,
  passportNumber: (value) => <span className={monoClass}>{`${value.slice(0, 1)}•••••${value.slice(-2)}`}</span>,
};

const chipClass =
  'inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-fog bg-white px-2.5 font-body text-[11px] font-bold text-secondary-700 transition-colors hover:border-secondary-500 hover:bg-primary-50';

/** Satu field sensitif: ter-mask + Reveal, atau penuh + Sembunyikan (FSD-001-PROFILE §1.4, R1/R2). */
function SensitiveValue({
  field,
  value,
  revealed,
  shown,
  onReveal,
  onHide,
  empty,
}: {
  field: RevealField;
  value: string;
  revealed: ProfileReveal | null;
  shown: boolean;
  onReveal: () => void;
  onHide: () => void;
  empty?: ReactNode;
}) {
  if (!value) return <Empty>{empty}</Empty>;

  if (shown && revealed) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className={monoClass}>{revealed[field] || '—'}</span>
        <button type="button" onClick={onHide} className={chipClass}>
          <EyeOff className="size-3" />
          Sembunyikan
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {MASK[field](value)}
      <button type="button" onClick={onReveal} className={chipClass}>
        <Eye className="size-3" />
        Reveal
      </button>
    </span>
  );
}

/** R1 — konfirmasi sebelum membuka keenam field sensitif. */
function RevealConfirmModal({
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onCancel()}
      title="Buka data sensitif?"
      description="Keenam field berikut akan ditampilkan penuh. Akses ini tercatat di read-audit sistem."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? 'Membuka…' : 'Buka'}
          </Button>
        </>
      }
    >
      <ul className="m-0 grid list-none gap-1.5 rounded-md border border-border-1 bg-cloud p-3.5 font-body text-[13px] font-semibold text-fg-1 sm:grid-cols-2">
        {REVEAL_FIELDS.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <Lock className="size-3.5 shrink-0 text-fg-3" />
            {item.label}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** Penanda field yang hanya boleh diubah HR Manager — port `.ep-locked-note`. */
function LockedNote() {
  return (
    <span className="inline-flex items-center gap-1 font-body text-[10.5px] font-semibold uppercase tracking-[0.04em] text-warning-800">
      <Lock className="size-3" />
      HR Manager only
    </span>
  );
}

/** Alamat domisili mengikuti KTP selama sakelar menyala. */
function DomicileMirror() {
  const { values, setFieldValue } = useFormikContext<PersonalProfile>();
  const { isDomicileSameAsIdCard, idCardAddress } = values;

  useEffect(() => {
    if (isDomicileSameAsIdCard) void setFieldValue('domicileAddress', idCardAddress);
  }, [isDomicileSameAsIdCard, idCardAddress, setFieldValue]);

  return null;
}

export function BasicInfoSection({
  profile,
  actor,
  employeeId,
}: {
  profile: PersonalProfile;
  actor: ProfileActor;
  employeeId?: string;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  const [shown, setShown] = useState<Set<RevealField>>(new Set());
  const reveal = useRevealProfile(actor, employeeId);
  const revealed = reveal.data ?? null;
  const update = useUpdateProfile(actor);
  const hrLocked = !canUpdateRestricted(actor);

  const openReveal = () => setConfirmingReveal(true);
  const hide = (field: RevealField) =>
    setShown((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  const sensitive = (field: RevealField, value: string, empty?: ReactNode) => (
    <SensitiveValue
      field={field}
      value={value}
      revealed={revealed}
      shown={shown.has(field)}
      onReveal={openReveal}
      onHide={() => hide(field)}
      empty={empty}
    />
  );

  return (
    <>
      <Note tone="warn" icon={<ShieldAlert />}>
        <strong>Field khusus HR Manager.</strong> Kewarganegaraan dan status pernikahan hanya bisa diubah HR Manager. Selebihnya bisa Anda ubah sendiri.
      </Note>

      <SectionCard
        icon={<User />}
        title="Basic Info"
        description="Biodata dan data pribadi"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!employeeId && canManageBiodata(actor) && (
              <PanelActionButton onClick={() => setPicking(true)}>Kelola Biodata Karyawan</PanelActionButton>
            )}
            <PanelActionButton onClick={() => setEditing(true)}>Edit</PanelActionButton>
          </div>
        }
      >
        {revealed && shown.size > 0 ? (
          <Note tone="warn" icon={<Eye />}>
            Data sensitif sedang ditampilkan penuh. Pembukaan ini sudah tercatat di read-audit — tekan{' '}
            <strong>Sembunyikan</strong> untuk menyamarkannya kembali.
          </Note>
        ) : (
          <Note icon={<Lock />}>
            Data sensitif (nomor KTP, nama ibu kandung, NPWP, nomor BPJS, nomor paspor) disamarkan. Tekan{' '}
            <strong>Reveal</strong> untuk melihat nilai lengkap — setiap pembukaan tercatat.
          </Note>
        )}

        <TwoCol>
          <DetailBlock icon={<IdCard />} title="Identity &amp; Residence">
            <KeyValueList>
              <KeyValueRow label="Nationality">
                <StatusBadge tone="info">{labelOf(NATIONALITY_OPTIONS, profile.nationality)}</StatusBadge>
              </KeyValueRow>
              <KeyValueRow label="KTP number">{sensitive('idCardNumber', profile.idCardNumber)}</KeyValueRow>
              <KeyValueRow label="NPWP">{sensitive('npwp', profile.npwp)}</KeyValueRow>
              <KeyValueRow label="NPWP name">{profile.npwpName || <Empty />}</KeyValueRow>
              <KeyValueRow label="BPJS Ketenagakerjaan">
                {sensitive('bpjsTenagaKerjaNumber', profile.bpjsTenagaKerjaNumber)}
              </KeyValueRow>
              <KeyValueRow label="BPJS Kesehatan">
                {sensitive('bpjsKesehatanNumber', profile.bpjsKesehatanNumber)}
              </KeyValueRow>
              <KeyValueRow label="Domicile = KTP">{profile.isDomicileSameAsIdCard ? 'Ya' : 'Tidak'}</KeyValueRow>
              <KeyValueRow label="KTP address">{profile.idCardAddress}</KeyValueRow>
              <KeyValueRow label="Domicile address">{profile.domicileAddress}</KeyValueRow>
              <KeyValueRow label="KTP postal code">
                <span className={monoClass}>{profile.idCardZip.zip}</span> · {profile.idCardZip.timezone}
              </KeyValueRow>
              <KeyValueRow label="Domicile postal code">
                <span className={monoClass}>{profile.domicileZip.zip}</span> · {profile.domicileZip.timezone}
              </KeyValueRow>
              <KeyValueRow label="Profile photo">
                <CertMark present={Boolean(profile.photoRef)} />
              </KeyValueRow>
            </KeyValueList>
          </DetailBlock>

          <DetailBlock icon={<UserRound />} title="Personal Data" variant="cold">
            <KeyValueList>
              <KeyValueRow label="Passport number">
                {sensitive('passportNumber', profile.passportNumber, '— (hanya untuk WNA)')}
              </KeyValueRow>
              <KeyValueRow label="Mother's maiden name">
                {sensitive('motherMaidenName', profile.motherMaidenName)}
              </KeyValueRow>
              <KeyValueRow label="Date of birth">{formatDate(profile.dateOfBirth)}</KeyValueRow>
              <KeyValueRow label="Place of birth">{profile.placeOfBirth}</KeyValueRow>
              <KeyValueRow label="Gender">{labelOf(GENDER_OPTIONS, profile.gender)}</KeyValueRow>
              <KeyValueRow label="Last education">{labelOf(LAST_EDUCATION_OPTIONS, profile.lastEducation)}</KeyValueRow>
              <KeyValueRow label="Blood type">{profile.bloodType}</KeyValueRow>
              <KeyValueRow label="Religion">{labelOf(RELIGION_OPTIONS, profile.religion)}</KeyValueRow>
              <KeyValueRow label="Home ownership">
                {labelOf(HOME_OWNERSHIP_OPTIONS, profile.homeOwnershipStatus)}
              </KeyValueRow>
              <KeyValueRow label="Disability status">
                {labelOf(DISABILITY_OPTIONS, profile.disabilityStatus)}
              </KeyValueRow>
              <KeyValueRow label="Marital status">
                <StatusBadge tone="info">{labelOf(MARITAL_OPTIONS, profile.maritalStatus)}</StatusBadge>
              </KeyValueRow>
              <KeyValueRow label="Personal phone">
                <span className={monoClass}>{profile.personalPhone}</span>
              </KeyValueRow>
              <KeyValueRow label="Personal email">{profile.personalEmail || <Empty />}</KeyValueRow>
              <KeyValueRow label="Other NIK">
                {profile.otherNik ? <span className={monoClass}>{profile.otherNik}</span> : <Empty />}
              </KeyValueRow>
            </KeyValueList>
          </DetailBlock>
        </TwoCol>
      </SectionCard>

      <Formik
        initialValues={profile}
        validationSchema={basicInfoSchema}
        enableReinitialize
        onSubmit={(values) => update.mutate(values, { onSuccess: () => setEditing(false) })}
      >
        {({ submitForm, values, resetForm }) => (
          <Modal
            open={editing}
            onOpenChange={(open) => {
              if (!open) {
                resetForm();
                setEditing(false);
              }
            }}
            size="wide"
            title="Edit Basic Info"
            description="Memperbarui biodata HOT + COLD dalam satu transaksi. Field khusus HR terkunci."
            footer={
              <>
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={update.isPending}>
                  {update.isPending ? 'Menyimpan…' : 'Save changes'}
                </Button>
              </>
            }
          >
            <Form className="grid gap-4 md:grid-cols-2">
              <DomicileMirror />

              <SelectField
                name="nationality"
                label={
                  <span className="inline-flex items-center gap-2">Nationality {hrLocked && <LockedNote />}</span>
                }
                required
                disabled={hrLocked}
                options={NATIONALITY_OPTIONS}
              />
              <SelectField
                name="maritalStatus"
                label={
                  <span className="inline-flex items-center gap-2">Marital status {hrLocked && <LockedNote />}</span>
                }
                required
                disabled={hrLocked}
                options={MARITAL_OPTIONS}
              />

              <TextField name="npwp" label="NPWP" placeholder="01.234.567.8-901.000" />
              <TextField name="npwpName" label="NPWP name" />
              <TextField name="bpjsTenagaKerjaNumber" label="BPJS Ketenagakerjaan" maxLength={20} placeholder="Nomor kepesertaan" />
              <TextField name="bpjsKesehatanNumber" label="BPJS Kesehatan" maxLength={20} placeholder="Nomor kepesertaan" />

              <TextField
                name="passportNumber"
                label="Passport number"
                placeholder="A1234567"
                required={values.nationality === 'FOREIGNER'}
                hint="Wajib bila kewarganegaraan = Foreigner."
              />
              <TextField name="motherMaidenName" label="Mother's maiden name" />

              <DateField name="dateOfBirth" label="Date of birth" required />
              <TextField name="placeOfBirth" label="Place of birth" required />

              <SelectField name="gender" label="Gender" required options={GENDER_OPTIONS} />
              <SelectField name="lastEducation" label="Last education" required options={LAST_EDUCATION_OPTIONS} />
              <SelectField name="bloodType" label="Blood type" required options={BLOOD_TYPE_OPTIONS} />
              <SelectField name="religion" label="Religion" required options={RELIGION_OPTIONS} />
              <SelectField
                name="homeOwnershipStatus"
                label="Home ownership"
                required
                options={HOME_OWNERSHIP_OPTIONS}
              />
              <SelectField name="disabilityStatus" label="Disability status" required options={DISABILITY_OPTIONS} />

              <TextAreaField name="idCardAddress" label="KTP address" required containerClassName="md:col-span-2" />
              <ToggleField
                name="isDomicileSameAsIdCard"
                label="Domisili sama dengan alamat KTP"
                hint="Saat menyala, alamat domisili mengikuti alamat KTP."
                className="md:col-span-2"
              />
              <TextAreaField
                name="domicileAddress"
                label="Domicile address"
                required={!values.isDomicileSameAsIdCard}
                disabled={values.isDomicileSameAsIdCard}
                containerClassName="md:col-span-2"
              />

              <TextField
                name="personalPhone"
                label="Personal phone"
                placeholder="0812…"
                hint="Hanya kontak — bukan kanal auth/OTP."
              />
              <TextField name="personalEmail" type="email" label="Personal email" placeholder="nama@mail.com" />
              <TextField
                name="otherNik"
                label="Other NIK"
                placeholder="Khusus kasus tertentu"
                containerClassName="md:col-span-2"
              />
            </Form>
          </Modal>
        )}
      </Formik>

      <RevealConfirmModal
        open={confirmingReveal}
        pending={reveal.isPending}
        onCancel={() => setConfirmingReveal(false)}
        onConfirm={() =>
          reveal.mutate(undefined, {
            onSuccess: () => setShown(new Set(REVEAL_FIELDS.map((item) => item.key))),
            onSettled: () => setConfirmingReveal(false),
          })
        }
      />

      <EmployeePickerModal
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={(employee) => {
          setPicking(false);
          navigate(`/me/profile?employee=${employee.id}&as=${actor}`);
        }}
      />
    </>
  );
}
