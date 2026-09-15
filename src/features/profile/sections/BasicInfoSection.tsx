import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { Eye, IdCard, Lock, ShieldAlert, User, UserRound } from 'lucide-react';
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
  labelOf,
} from '@/features/profile/types';
import type { PersonalProfile, ProfileActor } from '@/features/profile/types';
import { formatDate } from '@/lib/format';

/** KTP disamarkan sampai pengguna menekan Reveal (menulis read-audit). */
function maskIdCard(value: string) {
  if (!value) return '—';
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

/** Nomor BPJS ter-mask sebagian (UIC-PROFILE §2.2); penuh hanya setelah reveal. */
function BpjsValue({ value, full }: { value: string; full?: string }) {
  if (!value) return <Empty />;
  return <span className={monoClass}>{full ?? `${value.slice(0, 4)}••••${value.slice(-2)}`}</span>;
}

/** Penanda field yang hanya boleh diubah HR — port `.ep-locked-note`. */
function LockedNote() {
  return (
    <span className="inline-flex items-center gap-1 font-body text-[10.5px] font-semibold uppercase tracking-[0.04em] text-warning-800">
      <Lock className="size-3" />
      HR only
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

export function BasicInfoSection({ profile, actor }: { profile: PersonalProfile; actor: ProfileActor }) {
  const [editing, setEditing] = useState(false);
  const reveal = useRevealProfile();
  const revealed = reveal.data ?? null;
  const update = useUpdateProfile(actor);
  const hrLocked = actor === 'ESS';

  return (
    <>
      <Note tone="warn" icon={<ShieldAlert />}>
        <strong>Field khusus HR.</strong> Kewarganegaraan dan status pernikahan hanya bisa diubah HR. Selebihnya bisa Anda ubah sendiri.
      </Note>

      <SectionCard
        icon={<User />}
        title="Basic Info"
        description="Biodata dan data pribadi"
        action={<PanelActionButton onClick={() => setEditing(true)}>Edit</PanelActionButton>}
      >
        <Note icon={<Lock />}>
          Data sensitif (nomor KTP, nama ibu kandung, nomor BPJS) disamarkan. Tekan <strong>Reveal</strong> untuk melihat nilai lengkap — setiap pembukaan tercatat.
        </Note>

        <TwoCol>
          <DetailBlock icon={<IdCard />} title="Identity &amp; Residence">
            <KeyValueList>
              <KeyValueRow label="Nationality">
                <StatusBadge tone="info">{labelOf(NATIONALITY_OPTIONS, profile.nationality)}</StatusBadge>
              </KeyValueRow>
              <KeyValueRow label="KTP number">
                {revealed ? (
                  <>
                    <span className={monoClass}>{revealed.idCardNumber}</span>{' '}
                    <span className="font-body text-[11px] font-semibold text-success-700">· revealed</span>
                  </>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className={monoClass}>{maskIdCard(profile.idCardNumber)}</span>
                    <button
                      type="button"
                      onClick={() => reveal.mutate()}
                      disabled={reveal.isPending}
                      className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-fog bg-white px-2.5 font-body text-[11px] font-bold text-secondary-700 transition-colors hover:border-secondary-500 hover:bg-primary-50"
                    >
                      <Eye className="size-3" />
                      Reveal
                    </button>
                  </span>
                )}
              </KeyValueRow>
              <KeyValueRow label="NPWP">
                {profile.npwp ? <span className={monoClass}>{profile.npwp}</span> : <Empty />}
              </KeyValueRow>
              <KeyValueRow label="NPWP name">{profile.npwpName || <Empty />}</KeyValueRow>
              <KeyValueRow label="BPJS Ketenagakerjaan">
                <BpjsValue value={profile.bpjsTenagaKerjaNumber} full={revealed?.bpjsTenagaKerjaNumber} />
              </KeyValueRow>
              <KeyValueRow label="BPJS Kesehatan">
                <BpjsValue value={profile.bpjsKesehatanNumber} full={revealed?.bpjsKesehatanNumber} />
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
                {profile.passportNumber ? (
                  <span className={monoClass}>{profile.passportNumber}</span>
                ) : (
                  <Empty>— (hanya untuk WNA)</Empty>
                )}
              </KeyValueRow>
              <KeyValueRow label="Mother's maiden name">
                {revealed ? (
                  <span className={monoClass}>{revealed.motherMaidenName}</span>
                ) : (
                  <PiiHidden>tersembunyi (rahasia KBA)</PiiHidden>
                )}
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
    </>
  );
}
