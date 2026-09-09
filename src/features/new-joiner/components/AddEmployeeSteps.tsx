import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { FieldArray, useFormikContext } from 'formik';
import { CircleCheckBig } from 'lucide-react';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { ToggleField } from '@/components/form/ToggleField';
import { AddButton, RemoveRowButton } from '@/components/RowActions';
import { Checkbox } from '@/components/ui/checkbox';
import {
  APPROVAL_LINE_OPTIONS,
  BANK_OPTIONS,
  BPJS_FAMILY_OPTIONS,
  BRANCH_OPTIONS,
  CLASS_OPTIONS,
  COST_BEARER_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_TAX_STATUS_OPTIONS,
  GRADE_OPTIONS,
  GROUP_STRUCTURE_OPTIONS,
  JOB_LEVEL_OPTIONS,
  JOB_POSITION_OPTIONS,
  MANAGER_OPTIONS,
  ORGANIZATION_OPTIONS,
  PAYMENT_SCHEDULE_OPTIONS,
  PRORATE_OPTIONS,
  PTKP_OPTIONS,
  SALARY_TYPE_OPTIONS,
  SBU_GROUP_OPTIONS,
  SBU_OPTIONS,
  SCHEDULE_OPTIONS,
  TAX_METHOD_OPTIONS,
  TAX_SALARY_OPTIONS,
  type AddEmployeeValues,
} from '@/features/new-joiner/addEmployee';
import { BLOOD_TYPE_OPTIONS, GENDER_OPTIONS, MARITAL_OPTIONS, RELIGION_OPTIONS } from '@/features/profile/types';

/** Judul + deskripsi satu blok field — port `.ae-section`. */
function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-1 pb-3">
      <h2 className="m-0 font-body text-sm font-bold text-fg-1">{title}</h2>
      <p className="m-0 font-body text-[13px] font-medium text-fg-3">{sub}</p>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function PersonalDataStep() {
  const { values, setFieldValue } = useFormikContext<AddEmployeeValues>();

  // Cermin alamat: domisili mengikuti alamat KTP selama sakelar menyala.
  useEffect(() => {
    if (values.residentialSameAsIdCard && values.residentialAddress !== values.idCardAddress) {
      void setFieldValue('residentialAddress', values.idCardAddress);
    }
  }, [values.residentialSameAsIdCard, values.idCardAddress, values.residentialAddress, setFieldValue]);

  return (
    <div className="flex flex-col gap-5">
      <SectionHead title="Personal Data" sub="Isi seluruh data pribadi dasar karyawan." />
      <Grid>
        <TextField name="fullName" label="Nama lengkap" required containerClassName="md:col-span-2" />
        <TextField name="email" type="email" label="Email" required placeholder="nama@perusahaan.com" />
        <TextField name="phone" label="Nomor telepon" placeholder="0812…" />
        <TextField name="additionalPhone" label="Nomor telepon tambahan" />
        <TextField name="placeOfBirth" label="Tempat lahir" />
        <TextField name="dateOfBirth" type="date" label="Tanggal lahir" required />
        <SelectField name="gender" label="Jenis kelamin" placeholder="Pilih jenis kelamin" options={GENDER_OPTIONS} />
        <SelectField name="maritalStatus" label="Status pernikahan" required options={MARITAL_OPTIONS} />
        <SelectField name="bloodType" label="Golongan darah" placeholder="Pilih golongan darah" options={BLOOD_TYPE_OPTIONS} />
        <SelectField name="religion" label="Agama" required options={RELIGION_OPTIONS} />
      </Grid>

      <SectionHead title="Identity & Address" sub="Data identitas dan alamat karyawan." />
      <Grid>
        <TextField name="nik" label="NIK (16 digit)" inputMode="numeric" maxLength={16} />
        <TextField name="passportNumber" label="Nomor paspor" className="uppercase" />
        <TextField name="passportExpiry" type="date" label="Masa berlaku paspor" />
        <TextField name="postalCode" label="Kode pos" required inputMode="numeric" maxLength={5} />
        <TextAreaField name="idCardAddress" label="Alamat sesuai KTP" containerClassName="md:col-span-2" />
        <ToggleField
          name="residentialSameAsIdCard"
          label="Alamat domisili sama dengan KTP"
          hint="Matikan bila karyawan tinggal di alamat yang berbeda."
          className="md:col-span-2"
        />
        {!values.residentialSameAsIdCard && (
          <TextAreaField name="residentialAddress" label="Alamat domisili" required containerClassName="md:col-span-2" />
        )}
      </Grid>
    </div>
  );
}

export function EmploymentDataStep() {
  const { values } = useFormikContext<AddEmployeeValues>();

  return (
    <div className="flex flex-col gap-5">
      <SectionHead title="Employment Data" sub="Isi data karyawan yang berhubungan dengan perusahaan." />
      <Grid>
        <TextField name="employeeId" label="Employee ID" required placeholder="mis. EMP-0123" />
        <TextField name="barcode" label="Barcode" hint="Dipakai mesin absensi; kosongkan bila belum ada." />
        <SelectField
          name="groupStructureId"
          label="Group structure"
          placeholder="Pilih struktur grup"
          options={GROUP_STRUCTURE_OPTIONS}
        />
        <SelectField name="employmentStatus" label="Status kepegawaian" required options={EMPLOYMENT_STATUS_OPTIONS} />
        <TextField name="joinDate" type="date" label="Tanggal masuk" required />
        <SelectField name="branchId" label="Cabang" placeholder="Pilih cabang" options={BRANCH_OPTIONS} />
        <SelectField name="organizationId" label="Organisasi" required options={ORGANIZATION_OPTIONS} />
        <SelectField name="jobPositionId" label="Jabatan" required options={JOB_POSITION_OPTIONS} />
        <SelectField name="jobLevelId" label="Job level" required options={JOB_LEVEL_OPTIONS} />
        <SelectField name="gradeId" label="Grade" placeholder="Pilih grade" options={GRADE_OPTIONS} />
        <SelectField name="classId" label="Class" placeholder="Pilih class" options={CLASS_OPTIONS} />
        <SelectField name="scheduleId" label="Jadwal kerja" required options={SCHEDULE_OPTIONS} />
        <SelectField
          name="approvalLineId"
          label="Approval line"
          placeholder="Pilih jalur persetujuan"
          options={APPROVAL_LINE_OPTIONS}
        />
        <SelectField name="managerId" label="Atasan" placeholder="Pilih atasan" options={MANAGER_OPTIONS} />
      </Grid>

      <SectionHead title="SBU" sub="Satu karyawan bisa terhubung ke lebih dari satu SBU." />
      <FieldArray name="sbus">
        {({ push, remove }) => (
          <div className="flex flex-col gap-3">
            {values.sbus.map((_row, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <SelectField
                  name={`sbus.${index}.groupId`}
                  label={index === 0 ? 'SBU group' : undefined}
                  placeholder="Pilih SBU group"
                  options={SBU_GROUP_OPTIONS}
                />
                <SelectField
                  name={`sbus.${index}.sbuId`}
                  label={index === 0 ? 'SBU' : undefined}
                  placeholder="Pilih SBU"
                  options={SBU_OPTIONS}
                />
                <RemoveRowButton
                  aria-label="Hapus baris SBU"
                  disabled={values.sbus.length === 1}
                  onClick={() => remove(index)}
                />
              </div>
            ))}
            {/* Tombol "Add …" DI DALAM form — satu-satunya tombol yang boleh berikon. */}
            <AddButton onClick={() => push({ groupId: '', sbuId: '' })}>Add other SBU</AddButton>
          </div>
        )}
      </FieldArray>
    </div>
  );
}

export function PayrollStep() {
  return (
    <div className="flex flex-col gap-5">
      <SectionHead title="Salary" sub="Isi informasi gaji karyawan." />
      <Grid>
        <TextField
          name="basicSalary"
          label="Gaji pokok"
          required
          inputMode="numeric"
          placeholder="8000000"
          hint="Angka saja, tanpa titik atau koma."
        />
        <SelectField name="salaryType" label="Tipe gaji" options={SALARY_TYPE_OPTIONS} />
        <SelectField name="paymentSchedule" label="Jadwal pembayaran" options={PAYMENT_SCHEDULE_OPTIONS} />
        <SelectField name="prorateSetting" label="Pengaturan prorata" options={PRORATE_OPTIONS} />
        <ToggleField
          name="overtimeAllowed"
          label="Berhak lembur"
          hint="Menentukan apakah karyawan bisa mengajukan overtime."
          className="md:col-span-2"
        />
        <SelectField name="bankId" label="Nama bank" placeholder="Pilih bank" options={BANK_OPTIONS} />
        <TextField name="accountNumber" label="Nomor rekening" inputMode="numeric" />
        <TextField name="accountHolderName" label="Nama pemilik rekening" containerClassName="md:col-span-2" />
      </Grid>

      <SectionHead title="Tax Configuration" sub="Pilih jenis perhitungan pajak yang berlaku." />
      <Grid>
        <TextField name="npwp" label="NPWP" placeholder="00.000.000.0-000.000" />
        <SelectField name="ptkpStatus" label="Status PTKP" required options={PTKP_OPTIONS} />
        <SelectField name="taxMethod" label="Metode pajak" options={TAX_METHOD_OPTIONS} />
        <SelectField name="taxSalary" label="Tax salary" required options={TAX_SALARY_OPTIONS} />
        <TextField name="taxableDate" type="date" label="Taxable date" hint="Mulai kapan karyawan dihitung kena pajak." />
        <SelectField
          name="employmentTaxStatus"
          label="Status pajak kepegawaian"
          required
          options={EMPLOYMENT_TAX_STATUS_OPTIONS}
        />
        <TextField name="beginningNetto" label="Beginning netto" inputMode="numeric" hint="Akumulasi netto dari pemberi kerja sebelumnya di tahun berjalan." />
        <TextField name="pph21Paid" label="PPh21 sudah dibayar" inputMode="numeric" />
      </Grid>

      <SectionHead title="BPJS Configuration" sub="Pengaturan iuran BPJS karyawan." />
      <Grid>
        <TextField name="bpjsEmploymentNumber" label="Nomor BPJS Ketenagakerjaan" inputMode="numeric" />
        <TextField name="nppBpjsEmployment" label="NPP BPJS Ketenagakerjaan" />
        <TextField name="bpjsEmploymentDate" type="date" label="Tanggal BPJS Ketenagakerjaan" />
        <TextField name="bpjsHealthNumber" label="Nomor BPJS Kesehatan" inputMode="numeric" />
        <SelectField
          name="bpjsHealthFamily"
          label="Tanggungan BPJS Kesehatan"
          placeholder="Pilih tanggungan"
          options={BPJS_FAMILY_OPTIONS}
        />
        <TextField name="bpjsHealthDate" type="date" label="Tanggal BPJS Kesehatan" />
        <SelectField name="bpjsHealthCost" label="Iuran BPJS Kesehatan" options={COST_BEARER_OPTIONS} />
        <SelectField name="jhtCost" label="Iuran JHT" options={COST_BEARER_OPTIONS} />
        <SelectField name="pensionCost" label="Iuran jaminan pensiun" options={COST_BEARER_OPTIONS} />
        <TextField name="pensionDate" type="date" label="Tanggal jaminan pensiun" />
      </Grid>
    </div>
  );
}

/** Langkah 4 — undangan akun; keduanya opsional (port `.invite`). */
export function InviteStep() {
  const { values, setFieldValue } = useFormikContext<AddEmployeeValues>();

  const OPTIONS: { name: 'inviteNow' | 'startOnboarding'; title: string; description: string }[] = [
    {
      name: 'inviteNow',
      title: 'Undang ke SEVAKA sekarang',
      description: 'Email undangan dikirim supaya karyawan bisa langsung masuk.',
    },
    {
      name: 'startOnboarding',
      title: 'Mulai perjalanan onboarding',
      description: 'Karyawan dibantu menyesuaikan diri lewat panduan pengenalan produk.',
    },
  ];

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-primary-50 text-secondary-500">
        <CircleCheckBig className="size-10" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 font-display text-xl font-bold text-fg-1">Undang karyawan mengakses SEVAKA</h2>
        <p className="m-0 font-body text-[13px] font-medium text-fg-3">
          Tutup prosesnya dengan mengirim undangan supaya mereka bisa langsung mulai.
        </p>
      </div>

      <div className="flex w-full max-w-[560px] flex-col gap-3 text-left">
        {OPTIONS.map((option) => (
          <label
            key={option.name}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border-1 bg-cloud px-4 py-3.5"
          >
            <Checkbox
              checked={values[option.name]}
              onCheckedChange={(checked) => void setFieldValue(option.name, checked === true)}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-body text-[13px] font-bold text-fg-1">{option.title}</span>
              <span className="font-body text-xs font-medium text-fg-3">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
