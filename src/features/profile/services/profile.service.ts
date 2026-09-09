import { api } from '@/services/api';
import type {
  EmployeeProfileData,
  PersonalProfile,
  Relative,
  Training,
  WorkExperience,
} from '@/features/profile/types';

/**
 * API service Employee Profile (ESS).
 *
 * Endpoint kontrak:
 *   GET   /me/profile                     — paket profil + relasi + riwayat
 *   PATCH /me/profile                     — HOT + COLD dalam satu transaksi
 *   POST/PATCH/DELETE /me/relatives{/id}  — mst_relative
 *   POST/PATCH/DELETE /me/trainings{/id}  — pendidikan informal
 *   POST/PATCH/DELETE /me/work-experiences{/id}
 *
 * Selama `VITE_API_BASE_URL` kosong, jalur MOCK dipakai dengan dataset
 * positive-flow "Budi Santoso" dari prototype. Perubahan disimpan di memori
 * modul supaya alur tambah/ubah/hapus bisa dicoba utuh.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

let mockData: EmployeeProfileData = {
  profile: {
    nationality: 'CITIZEN',
    npwp: '01.234.567.8-901.000',
    npwpName: 'Budi Santoso',
    isDomicileSameAsIdCard: true,
    idCardAddress: 'Jl. Merdeka No. 1, Bandung',
    domicileAddress: 'Jl. Merdeka No. 1, Bandung',
    idCardZip: { zip: '40111', timezone: 'Asia/Jakarta' },
    domicileZip: { zip: '40111', timezone: 'Asia/Jakarta' },
    photoRef: '7c1f9b6e-doc',
    idCardNumber: '3171021505900012',
    passportNumber: '',
    motherMaidenName: 'Siti Aminah',
    dateOfBirth: '1990-05-12',
    placeOfBirth: 'Bandung',
    gender: 'MALE',
    lastEducation: 'BACHELOR',
    bloodType: 'O',
    religion: 'ISLAM',
    homeOwnershipStatus: 'OWNED',
    disabilityStatus: 'NONE',
    maritalStatus: 'SINGLE',
    personalPhone: '081234567890',
    personalEmail: 'budi.santoso@mail.com',
    otherNik: '',
  },
  relatives: [
    {
      id: 'r1',
      name: 'Ani Santoso',
      relationshipType: 'SPOUSE',
      phoneNumber: '081299990000',
      email: 'ani.santoso@mail.com',
      dateOfBirth: '1992-03-04',
      jobId: 'PRIVATE_EMPLOYEE',
      address: 'Jl. Merdeka No. 1, Bandung',
      isEmergencyContact: true,
    },
    {
      id: 'r2',
      name: 'Suryadi Santoso',
      relationshipType: 'PARENT',
      phoneNumber: '081277778888',
      email: '',
      dateOfBirth: '1962-08-20',
      jobId: 'ENTREPRENEUR',
      address: 'Jl. Cihampelas No. 5, Bandung',
      isEmergencyContact: true,
    },
    {
      id: 'r3',
      name: 'Dedi Santoso',
      relationshipType: 'CHILD',
      phoneNumber: '081200003333',
      email: '',
      dateOfBirth: '2015-06-10',
      jobId: 'STUDENT',
      address: 'Jl. Merdeka No. 1, Bandung',
      isEmergencyContact: false,
    },
  ],
  trainings: [
    {
      id: 't1',
      trainingName: 'AWS Solutions Architect',
      trainingSponsor: 'Amazon Web Services',
      trainingActivity: '',
      trainingCategory: 'CERTIFICATION',
      graduationScore: '92.50',
      graduationGrade: 'A',
      trainingCost: '5000000',
      startYear: '2023',
      endYear: '2023',
      certificateExpiryDate: '2026-06-30',
      trainingCertificate: 'doc-aws',
    },
    {
      id: 't2',
      trainingName: 'K3 Dasar (Basic OHS)',
      trainingSponsor: 'Kemnaker RI',
      trainingActivity: '',
      trainingCategory: 'COMPLIANCE',
      graduationScore: '',
      graduationGrade: 'B',
      trainingCost: '1500000',
      startYear: '2024',
      endYear: '2024',
      certificateExpiryDate: '2028-06-30',
      trainingCertificate: 'doc-k3',
    },
    {
      id: 't3',
      trainingName: 'Leadership Dasar',
      trainingSponsor: 'LMA Indonesia',
      trainingActivity: '',
      trainingCategory: 'LEADERSHIP',
      graduationScore: '',
      graduationGrade: '',
      trainingCost: '',
      startYear: '2022',
      endYear: '2022',
      certificateExpiryDate: '',
      trainingCertificate: '',
    },
  ],
  works: [
    {
      id: 'w1',
      companyName: 'PT Maju Jaya',
      position: 'Backend Engineer',
      joinDate: '2018-03-01',
      leaveDate: '2020-06-01',
      jobDescription: 'Membangun dan memelihara REST API internal.',
      employmentCertificate: 'doc-mj',
    },
    {
      id: 'w2',
      companyName: 'PT Nusantara Digital',
      position: 'Staff Administrasi',
      joinDate: '2015-08-01',
      leaveDate: '2017-06-01',
      jobDescription: '',
      employmentCertificate: '',
    },
  ],
};

export const profileService = {
  async get(): Promise<EmployeeProfileData> {
    if (MOCK) {
      await delay();
      return structuredClone(mockData);
    }
    const { data } = await api.get<EmployeeProfileData>('/me/profile');
    return data;
  },

  /** PATCH HOT + COLD dalam satu transaksi. */
  async updateProfile(patch: Partial<PersonalProfile>): Promise<void> {
    if (MOCK) {
      await delay();
      mockData = { ...mockData, profile: { ...mockData.profile, ...patch } };
      return;
    }
    await api.patch('/me/profile', patch);
  },

  async saveRelative(relative: Relative): Promise<void> {
    if (MOCK) {
      await delay();
      const exists = mockData.relatives.some((r) => r.id === relative.id);
      mockData.relatives = exists
        ? mockData.relatives.map((r) => (r.id === relative.id ? relative : r))
        : [...mockData.relatives, { ...relative, id: relative.id || newId() }];
      return;
    }
    if (relative.id) await api.patch(`/me/relatives/${relative.id}`, relative);
    else await api.post('/me/relatives', relative);
  },

  async deleteRelative(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockData.relatives = mockData.relatives.filter((r) => r.id !== id);
      return;
    }
    await api.delete(`/me/relatives/${id}`);
  },

  async saveTraining(training: Training): Promise<void> {
    if (MOCK) {
      await delay();
      const exists = mockData.trainings.some((t) => t.id === training.id);
      mockData.trainings = exists
        ? mockData.trainings.map((t) => (t.id === training.id ? training : t))
        : [...mockData.trainings, { ...training, id: training.id || newId() }];
      return;
    }
    if (training.id) await api.patch(`/me/trainings/${training.id}`, training);
    else await api.post('/me/trainings', training);
  },

  async deleteTraining(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockData.trainings = mockData.trainings.filter((t) => t.id !== id);
      return;
    }
    await api.delete(`/me/trainings/${id}`);
  },

  async saveWork(work: WorkExperience): Promise<void> {
    if (MOCK) {
      await delay();
      const exists = mockData.works.some((w) => w.id === work.id);
      mockData.works = exists
        ? mockData.works.map((w) => (w.id === work.id ? work : w))
        : [...mockData.works, { ...work, id: work.id || newId() }];
      return;
    }
    if (work.id) await api.patch(`/me/work-experiences/${work.id}`, work);
    else await api.post('/me/work-experiences', work);
  },

  async deleteWork(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockData.works = mockData.works.filter((w) => w.id !== id);
      return;
    }
    await api.delete(`/me/work-experiences/${id}`);
  },
};
