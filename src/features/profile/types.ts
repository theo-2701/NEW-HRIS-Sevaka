/**
 * Kontrak Employee Profile (ESS) — FSD/UIC/TSD-001-PROFILE.
 *
 * Dua tabel sumber:
 *  • HOT  `mst_employee_profile`  — identitas & alamat (KTP, NPWP, domisili)
 *  • COLD `mst_employee_personal` — biodata pribadi (lahir, gender, dsb.)
 * Satu form "Edit Basic Info" menulis keduanya dalam satu transaksi.
 */

export type Nationality = 'CITIZEN' | 'FOREIGNER';
export type Gender = 'MALE' | 'FEMALE';
export type LastEducation =
  | 'ELEMENTARY'
  | 'JUNIOR_HIGH'
  | 'SENIOR_HIGH'
  | 'DIPLOMA'
  | 'BACHELOR'
  | 'MASTER'
  | 'DOCTORATE'
  | 'PROFESSOR';
export type BloodType = 'A' | 'B' | 'AB' | 'O' | 'OTHER';
export type Religion = 'ISLAM' | 'CHRISTIAN' | 'CATHOLIC' | 'HINDU' | 'BUDDHA' | 'CONFUCIAN' | 'OTHER';
export type HomeOwnership = 'OWNED' | 'RENTED' | 'BOARDING_HOUSE' | 'WITH_PARENTS';
export type DisabilityStatus = 'NONE' | 'PHYSICAL' | 'SENSORY' | 'MENTAL' | 'INTELLECTUAL';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type RelationshipType = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
export type RelativeJob =
  | 'CIVIL_SERVANT'
  | 'PRIVATE_EMPLOYEE'
  | 'ENTREPRENEUR'
  | 'PROFESSIONAL'
  | 'STUDENT'
  | 'RETIRED'
  | 'HOMEMAKER'
  | 'OTHER';
export type TrainingCategory =
  | 'TECHNICAL'
  | 'SOFT_SKILL'
  | 'LEADERSHIP'
  | 'COMPLIANCE'
  | 'CERTIFICATION'
  | 'OTHER';

/** Aktor layar: ESS mengunci field yang hanya boleh diubah HR. */
export type ProfileActor = 'ESS' | 'HR';

/** Field yang terkunci untuk aktor ESS (hanya HR yang boleh mengubah). */
export const HR_RESTRICTED_FIELDS = ['nationality', 'maritalStatus'] as const;

export interface PostalCode {
  zip: string;
  timezone: string;
}

export interface PersonalProfile {
  // ---- HOT · mst_employee_profile ----
  nationality: Nationality;
  npwp: string;
  npwpName: string;
  isDomicileSameAsIdCard: boolean;
  idCardAddress: string;
  domicileAddress: string;
  idCardZip: PostalCode;
  domicileZip: PostalCode;
  photoRef: string;
  idCardNumber: string;

  // ---- COLD · mst_employee_personal ----
  passportNumber: string;
  motherMaidenName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: Gender;
  lastEducation: LastEducation;
  bloodType: BloodType;
  religion: Religion;
  homeOwnershipStatus: HomeOwnership;
  disabilityStatus: DisabilityStatus;
  maritalStatus: MaritalStatus;
  personalPhone: string;
  personalEmail: string;
  otherNik: string;
}

export interface Relative {
  id: string;
  name: string;
  relationshipType: RelationshipType;
  phoneNumber: string;
  email: string;
  dateOfBirth: string;
  jobId: RelativeJob | '';
  address: string;
  isEmergencyContact: boolean;
}

export interface Training {
  id: string;
  trainingName: string;
  trainingSponsor: string;
  trainingActivity: string;
  trainingCategory: TrainingCategory;
  graduationScore: string;
  graduationGrade: string;
  trainingCost: string;
  startYear: string;
  endYear: string;
  certificateExpiryDate: string;
  trainingCertificate: string;
}

export interface WorkExperience {
  id: string;
  companyName: string;
  position: string;
  /** Disimpan `yyyy-mm-01` — UI hanya menampilkan bulan & tahun. */
  joinDate: string;
  leaveDate: string;
  jobDescription: string;
  employmentCertificate: string;
}

/** Satu paket profil ESS. */
export interface EmployeeProfileData {
  profile: PersonalProfile;
  relatives: Relative[];
  trainings: Training[];
  works: WorkExperience[];
}

type Options<T extends string> = { value: T; label: string }[];

export const NATIONALITY_OPTIONS: Options<Nationality> = [
  { value: 'CITIZEN', label: 'Citizen (WNI)' },
  { value: 'FOREIGNER', label: 'Foreigner (WNA)' },
];

export const GENDER_OPTIONS: Options<Gender> = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

export const LAST_EDUCATION_OPTIONS: Options<LastEducation> = [
  { value: 'ELEMENTARY', label: 'Elementary (SD)' },
  { value: 'JUNIOR_HIGH', label: 'Junior High (SMP)' },
  { value: 'SENIOR_HIGH', label: 'Senior High (SMA/SMK)' },
  { value: 'DIPLOMA', label: 'Diploma (D1–D4)' },
  { value: 'BACHELOR', label: 'Bachelor (S1)' },
  { value: 'MASTER', label: 'Master (S2)' },
  { value: 'DOCTORATE', label: 'Doctorate (S3)' },
  { value: 'PROFESSOR', label: 'Professor' },
];

export const BLOOD_TYPE_OPTIONS: Options<BloodType> = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
  { value: 'O', label: 'O' },
  { value: 'OTHER', label: 'Other' },
];

export const RELIGION_OPTIONS: Options<Religion> = [
  { value: 'ISLAM', label: 'Islam' },
  { value: 'CHRISTIAN', label: 'Christian' },
  { value: 'CATHOLIC', label: 'Catholic' },
  { value: 'HINDU', label: 'Hindu' },
  { value: 'BUDDHA', label: 'Buddha' },
  { value: 'CONFUCIAN', label: 'Confucian' },
  { value: 'OTHER', label: 'Other' },
];

export const HOME_OWNERSHIP_OPTIONS: Options<HomeOwnership> = [
  { value: 'OWNED', label: 'Owned' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'BOARDING_HOUSE', label: 'Boarding house' },
  { value: 'WITH_PARENTS', label: 'With parents' },
];

export const DISABILITY_OPTIONS: Options<DisabilityStatus> = [
  { value: 'NONE', label: 'None' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'SENSORY', label: 'Sensory' },
  { value: 'MENTAL', label: 'Mental' },
  { value: 'INTELLECTUAL', label: 'Intellectual' },
];

export const MARITAL_OPTIONS: Options<MaritalStatus> = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
];

export const RELATIONSHIP_OPTIONS: Options<RelationshipType> = [
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'CHILD', label: 'Child' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other' },
];

export const RELATIVE_JOB_OPTIONS: Options<RelativeJob> = [
  { value: 'CIVIL_SERVANT', label: 'Pegawai Negeri (PNS)' },
  { value: 'PRIVATE_EMPLOYEE', label: 'Pegawai Swasta' },
  { value: 'ENTREPRENEUR', label: 'Wiraswasta' },
  { value: 'PROFESSIONAL', label: 'Profesional' },
  { value: 'STUDENT', label: 'Pelajar / Mahasiswa' },
  { value: 'RETIRED', label: 'Pensiunan' },
  { value: 'HOMEMAKER', label: 'Ibu Rumah Tangga' },
  { value: 'OTHER', label: 'Other' },
];

export const TRAINING_CATEGORY_OPTIONS: Options<TrainingCategory> = [
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'SOFT_SKILL', label: 'Soft Skill' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'OTHER', label: 'Other' },
];

/** Cari label enum dari daftar opsi; kembalikan em dash bila kosong. */
export function labelOf<T extends string>(options: Options<T>, value: T | '' | undefined): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}
