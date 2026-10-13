import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Formik, useFormikContext } from 'formik';
import { Eye, IdCard, Lock, ShieldAlert, User } from 'lucide-react';
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
  Empty,
  KeyValueList,
  KeyValueRow,
  Note,
  PiiHidden,
  SectionCard,
  Watermark,
  monoClass,
} from '@/features/profile/components/ProfileBits';
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
  canManageBiodata,
  canRevealPii,
  revealFieldsFor,
  canUpdateRestricted,
  labelOf,
} from '@/features/profile/types';
import type { PersonalProfile, ProfileActor, ProfileReveal, RevealField } from '@/features/profile/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

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
  visaNumber: (value) => <span className={monoClass}>{`${value.slice(0, 2)}•••••${value.slice(-2)}`}</span>,
};

/** Field pribadi yang ikut disamarkan di kartu (Notulen 12 Okt 2026 §12) — nilainya sudah ada di klien. */
const MASKED_PERSONAL = ['Date & place of birth', 'Marital status', 'Blood type', 'Religion', 'KTP & domicile address'];

/** Nilai pribadi tersamar — semua field sensitif tampil seragam sampai kartu dibuka. */
function Masked() {
  return <span className={`${monoClass} text-fg-4`}>••••••••</span>;
}

/**
 * Satu field sensitif ber-kontrak reveal (FSD-001-PROFILE §1.4): bentuk mask resmi sampai kartu dibuka.
 * Tanpa scope reveal (R13) nilainya tetap bentuk mask walau kartu dibuka — server tidak memberi nilai penuh.
 */
function SensitiveValue({
  field,
  value,
  revealed,
  open,
  empty,
}: {
  field: RevealField;
  value: string;
  revealed: ProfileReveal | null;
  open: boolean;
  empty?: ReactNode;
}) {
  if (!value) return <Empty>{empty}</Empty>;
  if (open && revealed) return <span className={monoClass}>{revealed[field] || '—'}</span>;
  return <>{MASK[field](value)}</>;
}

/**
 * Konfirmasi sebelum membuka kartu (R1 + Notulen 12 Okt 2026 §12): data tampil penuh, watermark muncul,
 * dan akses tercatat. Daftar field mengikuti cabang bendera (R14).
 */
function RevealConfirmModal({
  open,
  pending,
  fields,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  fields: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onCancel()}
      title="Show sensitive data?"
      description="The fields below will be shown in full with a watermark of your name and the time. This access is recorded in the audit trail."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? 'Opening…' : 'Show data'}
          </Button>
        </>
      }
    >
      <ul className="m-0 grid list-none gap-1.5 rounded-md border border-border-1 bg-cloud p-3.5 font-body text-[13px] font-semibold text-fg-1 sm:grid-cols-2">
        {fields.map((label) => (
          <li key={label} className="flex items-center gap-2">
            <Lock className="size-3.5 shrink-0 text-fg-3" />
            {label}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** Sub-judul kelompok di dalam kartu gabungan. */
function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="m-0 mb-2.5 font-body text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-fg-3">
      {children}
    </h4>
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

/**
 * Identitas BACA-SAJA bertopeng di Edit (FSD-PROFILE 0.13 §1.5): tidak pernah ikut permintaan ubah.
 * Cabang mengikuti bendera di form (R2) — naturalisasi WNA → WNI menyembunyikan Paspor/Visa.
 */
function IdentityReadOnly({ values }: { values: PersonalProfile }) {
  const rows: [string, RevealField][] =
    values.nationality === 'CITIZEN'
      ? [['Nomor KTP (16 digit)', 'idCardNumber']]
      : [
          ['Nomor Paspor', 'passportNumber'],
          ['Nomor Visa', 'visaNumber'],
        ];
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-1 bg-cloud p-3.5 md:col-span-2">
      <KeyValueList>
        {rows.map(([label, field]) => (
          <KeyValueRow key={field} label={label}>
            {values[field] ? MASK[field](values[field]) : <Empty />}
          </KeyValueRow>
        ))}
      </KeyValueList>
      <span className="font-body text-xs font-medium text-fg-3">
        Tidak dapat diubah di profil. Koreksi dilakukan lewat New Joiner selagi calon masih Draf.
      </span>
    </div>
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
  /** Waktu kartu dibuka — terisi = data tampil penuh + watermark. Satu tombol untuk seluruh kartu. */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const viewer = useAuthStore((s) => s.user);
  const reveal = useRevealProfile(actor, employeeId);
  const revealed = reveal.data ?? null;
  const update = useUpdateProfile(actor);
  const hrLocked = !canUpdateRestricted(actor);
  const canReveal = canRevealPii(actor);
  const citizen = profile.nationality === 'CITIZEN';
  const revealFields = revealFieldsFor(profile.nationality);
  const open = Boolean(openedAt);
  const confirmFields = [...(canReveal ? revealFields.map((item) => item.label) : []), ...MASKED_PERSONAL];

  const sensitive = (field: RevealField, value: string, empty?: ReactNode) => (
    <SensitiveValue field={field} value={value} revealed={revealed} open={open} empty={empty} />
  );
  /** Field pribadi biasa: tersamar sampai kartu dibuka. */
  const personal = (value: ReactNode) => (open ? value : <Masked />);
  const openCard = () => setOpenedAt(new Date().toISOString());

  return (
    <>
      <Note tone="warn" icon={<ShieldAlert />}>
        <strong>Field khusus HR Manager.</strong> Kewarganegaraan dan status pernikahan hanya bisa diubah HR Manager.
        Selebihnya bisa Anda ubah sendiri.
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
        {/* Satu kartu Identitas + Data Pribadi (Notulen 12 Okt 2026 §12): disamarkan, satu tombol membuka
            seluruh kartu dan langsung memunculkan watermark pengguna login + waktu di latar kartu. */}
        <div className="relative overflow-hidden rounded-xl border border-border-1 bg-bg-surface px-[18px] py-4">
          {open && openedAt && <Watermark text={`${viewer?.name ?? 'User'} · ${formatDateTime(openedAt)}`} />}

          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 flex items-center gap-2 font-body text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-fg-3">
                <IdCard className="size-[15px] text-secondary-500" />
                Identity &amp; Personal Data
              </h3>
              <div className="ml-auto">
                <PanelActionButton onClick={() => (open ? setOpenedAt(null) : setConfirmingReveal(true))}>
                  {open ? 'Hide data' : 'Show data'}
                </PanelActionButton>
              </div>
            </div>

            {open ? (
              <Note tone="warn" icon={<Eye />}>
                Sensitive data is shown in full. This access has been recorded with your name and time — press{' '}
                <strong>Hide data</strong> to mask it again.
              </Note>
            ) : (
              <Note icon={<Lock />}>
                Personal data is masked. Press <strong>Show data</strong> to view it — every access is recorded.
                {!canReveal && ' Full ID numbers are only available to HR Manager and above.'}
              </Note>
            )}

            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
              <div>
                <GroupTitle>Identity</GroupTitle>
                <KeyValueList>
                  <KeyValueRow label="Nationality">
                    <StatusBadge tone="info">{labelOf(NATIONALITY_OPTIONS, profile.nationality)}</StatusBadge>
                  </KeyValueRow>
                  {/* R8: Detail hanya menampilkan cabang aktif. */}
                  {citizen ? (
                    <KeyValueRow label="KTP number">{sensitive('idCardNumber', profile.idCardNumber)}</KeyValueRow>
                  ) : (
                    <>
                      <KeyValueRow label="Passport number">
                        {sensitive('passportNumber', profile.passportNumber)}
                      </KeyValueRow>
                      <KeyValueRow label="Visa number">{sensitive('visaNumber', profile.visaNumber)}</KeyValueRow>
                    </>
                  )}
                  <KeyValueRow label="Tax number (NPWP)">{sensitive('npwp', profile.npwp)}</KeyValueRow>
                  <KeyValueRow label="NPWP name">{profile.npwpName || <Empty />}</KeyValueRow>
                  <KeyValueRow label="BPJS Ketenagakerjaan">
                    {sensitive('bpjsTenagaKerjaNumber', profile.bpjsTenagaKerjaNumber)}
                  </KeyValueRow>
                  <KeyValueRow label="BPJS Kesehatan">
                    {sensitive('bpjsKesehatanNumber', profile.bpjsKesehatanNumber)}
                  </KeyValueRow>
                  <KeyValueRow label="Mother's maiden name">
                    {sensitive('motherMaidenName', profile.motherMaidenName)}
                  </KeyValueRow>
                  <KeyValueRow label="Profile photo">
                    <CertMark present={Boolean(profile.photoRef)} />
                  </KeyValueRow>
                </KeyValueList>
              </div>

              <div>
                <GroupTitle>Personal</GroupTitle>
                <KeyValueList>
                  <KeyValueRow label="Place, date of birth">
                    {personal(`${profile.placeOfBirth}, ${formatDate(profile.dateOfBirth)}`)}
                  </KeyValueRow>
                  <KeyValueRow label="Gender">{labelOf(GENDER_OPTIONS, profile.gender)}</KeyValueRow>
                  <KeyValueRow label="Marital status">
                    {personal(<StatusBadge tone="info">{labelOf(MARITAL_OPTIONS, profile.maritalStatus)}</StatusBadge>)}
                  </KeyValueRow>
                  <KeyValueRow label="Blood type">{personal(profile.bloodType)}</KeyValueRow>
                  <KeyValueRow label="Religion">{personal(labelOf(RELIGION_OPTIONS, profile.religion))}</KeyValueRow>
                  <KeyValueRow label="Last education">
                    {labelOf(LAST_EDUCATION_OPTIONS, profile.lastEducation)}
                  </KeyValueRow>
                  <KeyValueRow label="Disability status">
                    {labelOf(DISABILITY_OPTIONS, profile.disabilityStatus)}
                  </KeyValueRow>
                  <KeyValueRow label="Home ownership">
                    {labelOf(HOME_OWNERSHIP_OPTIONS, profile.homeOwnershipStatus)}
                  </KeyValueRow>
                  <KeyValueRow label="Personal phone">
                    <span className={monoClass}>{profile.personalPhone}</span>
                  </KeyValueRow>
                  <KeyValueRow label="Personal email">{profile.personalEmail || <Empty />}</KeyValueRow>
                  <KeyValueRow label="Other NIK">
                    {profile.otherNik ? <span className={monoClass}>{profile.otherNik}</span> : <Empty />}
                  </KeyValueRow>
                </KeyValueList>
              </div>

              {/* Alamat KTP vs domisili dipisah tegas (Notulen §11) — domisili yang sama tidak diulang. */}
              <div>
                <GroupTitle>KTP address</GroupTitle>
                <KeyValueList>
                  <KeyValueRow label="Address">{personal(profile.idCardAddress)}</KeyValueRow>
                  <KeyValueRow label="Postal code">
                    {personal(
                      <>
                        <span className={monoClass}>{profile.idCardZip.zip}</span> · {profile.idCardZip.timezone}
                      </>,
                    )}
                  </KeyValueRow>
                </KeyValueList>
              </div>

              <div>
                <GroupTitle>Domicile address</GroupTitle>
                <KeyValueList>
                  {profile.isDomicileSameAsIdCard ? (
                    <KeyValueRow label="Address">Same as KTP address</KeyValueRow>
                  ) : (
                    <>
                      <KeyValueRow label="Address">{personal(profile.domicileAddress)}</KeyValueRow>
                      <KeyValueRow label="Postal code">
                        {personal(
                          <>
                            <span className={monoClass}>{profile.domicileZip.zip}</span> ·{' '}
                            {profile.domicileZip.timezone}
                          </>,
                        )}
                      </KeyValueRow>
                    </>
                  )}
                </KeyValueList>
              </div>
            </div>
          </div>
        </div>
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

              {/* R7/R11: bendera terkunci bagi ESS & HR Staff; HR Manager hanya boleh WNA → WNI. */}
              <SelectField
                name="nationality"
                label={<span className="inline-flex items-center gap-2">Nationality {hrLocked && <LockedNote />}</span>}
                required
                disabled={hrLocked || citizen}
                options={
                  citizen ? NATIONALITY_OPTIONS.filter((option) => option.value === 'CITIZEN') : NATIONALITY_OPTIONS
                }
                hint={citizen && !hrLocked ? 'WNI menjadi WNA ditempuh lewat New Joiner.' : undefined}
              />
              <SelectField
                name="maritalStatus"
                label={
                  <span className="inline-flex items-center gap-2">Marital status {hrLocked && <LockedNote />}</span>
                }
                required
                disabled={hrLocked}
                options={MARITAL_OPTIONS}
                hint={hrLocked ? 'Hanya HR Manager ke atas yang dapat mengubah' : undefined}
              />

              <IdentityReadOnly values={values} />

              <TextField name="npwp" label="Nomor Pajak (NPWP)" placeholder="01.234.567.8-901.000" />
              <TextField name="npwpName" label="Nama NPWP" />
              <TextField
                name="bpjsTenagaKerjaNumber"
                label="BPJS Ketenagakerjaan"
                maxLength={20}
                placeholder="Nomor kepesertaan"
              />
              <TextField
                name="bpjsKesehatanNumber"
                label="BPJS Kesehatan"
                maxLength={20}
                placeholder="Nomor kepesertaan"
              />

              <TextField name="motherMaidenName" label="Mother's maiden name" containerClassName="md:col-span-2" />

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
        fields={confirmFields}
        onCancel={() => setConfirmingReveal(false)}
        onConfirm={() => {
          // Tanpa scope reveal (R13) nomor identitas tetap bentuk mask; field pribadi lain tetap terbuka.
          if (!canReveal) {
            openCard();
            setConfirmingReveal(false);
            return;
          }
          reveal.mutate(undefined, { onSuccess: openCard, onSettled: () => setConfirmingReveal(false) });
        }}
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
