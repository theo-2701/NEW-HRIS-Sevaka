import * as Yup from 'yup';

/**
 * Skema validasi Employee Profile.
 * Aturan bersyarat yang mengikat kontrak:
 *  • `passportNumber` wajib bila `nationality = FOREIGNER` (MbV).
 *  • `domicileAddress` wajib bila domisili ≠ alamat KTP.
 *  • Kategori training divalidasi terhadap enum; field lain opsional.
 */

const optionalEmail = Yup.string().email('Format email tidak valid.');

export const basicInfoSchema = Yup.object({
  nationality: Yup.string().required('Kewarganegaraan wajib dipilih.'),
  maritalStatus: Yup.string().required('Status pernikahan wajib dipilih.'),
  npwp: Yup.string(),
  npwpName: Yup.string(),
  passportNumber: Yup.string().when('nationality', {
    is: 'FOREIGNER',
    then: (schema) => schema.required('Paspor wajib diisi untuk warga negara asing.'),
    otherwise: (schema) => schema,
  }),
  motherMaidenName: Yup.string(),
  dateOfBirth: Yup.string().required('Tanggal lahir wajib diisi.'),
  placeOfBirth: Yup.string().required('Tempat lahir wajib diisi.'),
  gender: Yup.string().required('Jenis kelamin wajib dipilih.'),
  lastEducation: Yup.string().required('Pendidikan terakhir wajib dipilih.'),
  bloodType: Yup.string().required('Golongan darah wajib dipilih.'),
  religion: Yup.string().required('Agama wajib dipilih.'),
  homeOwnershipStatus: Yup.string().required('Status kepemilikan rumah wajib dipilih.'),
  disabilityStatus: Yup.string().required('Status disabilitas wajib dipilih.'),
  idCardAddress: Yup.string().required('Alamat KTP wajib diisi.'),
  isDomicileSameAsIdCard: Yup.boolean(),
  domicileAddress: Yup.string().when('isDomicileSameAsIdCard', {
    is: false,
    then: (schema) => schema.required('Alamat domisili wajib diisi bila berbeda dari KTP.'),
    otherwise: (schema) => schema,
  }),
  personalPhone: Yup.string().matches(/^[0-9+\-\s]*$/, 'Nomor telepon hanya boleh angka.'),
  personalEmail: optionalEmail,
  otherNik: Yup.string(),
});

export const relativeSchema = Yup.object({
  name: Yup.string().required('Nama wajib diisi.'),
  relationshipType: Yup.string().required('Hubungan wajib dipilih.'),
  phoneNumber: Yup.string()
    .required('Nomor telepon wajib diisi.')
    .matches(/^[0-9+\-\s]+$/, 'Nomor telepon hanya boleh angka.'),
  email: optionalEmail,
  dateOfBirth: Yup.string(),
  jobId: Yup.string(),
  address: Yup.string(),
  isEmergencyContact: Yup.boolean(),
});

export const trainingSchema = Yup.object({
  trainingName: Yup.string().required('Nama pelatihan wajib diisi.'),
  trainingSponsor: Yup.string(),
  trainingActivity: Yup.string(),
  trainingCategory: Yup.string().required('Kategori wajib dipilih.'),
  graduationScore: Yup.string().matches(/^\d*([.,]\d+)?$/, 'Nilai harus berupa angka.'),
  graduationGrade: Yup.string(),
  trainingCost: Yup.string(),
  startYear: Yup.string().matches(/^(19|20)\d{2}$|^$/, 'Tahun harus 4 digit.'),
  endYear: Yup.string()
    .matches(/^(19|20)\d{2}$|^$/, 'Tahun harus 4 digit.')
    .test('after-start', 'Tahun selesai tidak boleh mendahului tahun mulai.', function (value) {
      const { startYear } = this.parent as { startYear?: string };
      if (!value || !startYear) return true;
      return Number(value) >= Number(startYear);
    }),
  certificateExpiryDate: Yup.string(),
});

export const workExperienceSchema = Yup.object({
  companyName: Yup.string().required('Nama perusahaan wajib diisi.'),
  position: Yup.string().required('Posisi wajib diisi.'),
  joinDate: Yup.string().required('Bulan & tahun masuk wajib diisi.'),
  leaveDate: Yup.string().test(
    'after-join',
    'Tanggal keluar tidak boleh mendahului tanggal masuk.',
    function (value) {
      const { joinDate } = this.parent as { joinDate?: string };
      if (!value || !joinDate) return true;
      return value >= joinDate;
    },
  ),
  jobDescription: Yup.string(),
});

export const formalEducationSchema = Yup.object({
  lastEducation: Yup.string().required('Jenjang pendidikan wajib dipilih.'),
});

export const additionalInfoSchema = Yup.object({
  otherNik: Yup.string(),
  bloodType: Yup.string().required('Golongan darah wajib dipilih.'),
  religion: Yup.string().required('Agama wajib dipilih.'),
  homeOwnershipStatus: Yup.string().required('Status kepemilikan rumah wajib dipilih.'),
  disabilityStatus: Yup.string().required('Status disabilitas wajib dipilih.'),
});
