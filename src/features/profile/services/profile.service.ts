import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { HR_RESTRICTED_FIELDS } from '@/features/profile/types';
import type {
  EmployeeProfileData,
  PersonalProfile,
  ProfileActor,
  Relative,
  Training,
  TrainingCategory,
  WorkExperience,
} from '@/features/profile/types';

/**
 * API service Employee Profile (ESS).
 *
 * Endpoint kontrak (UIC-001-PROFILE-0.2):
 *   GET  /employee-profiles/{employee-id}         — detail HOT+COLD (PII ter-mask)
 *   PUT  /employee-profiles/{employee-id}         — HOT+COLD satu transaksi;
 *                                                   field HR-restricted via ESS → 403
 *   GET  /employee-profiles/{employee-id}/reveal  — PII penuh + read-audit
 *   POST/PUT/DELETE /employee-relatives{/id}      — Family & Emergency Contact (DELETE 200)
 *   POST/PUT/DELETE /trainings{/id}               — DELETE 204
 *   POST/PUT/DELETE /work-experiences{/id}        — DELETE 204
 *
 * Selama `VITE_API_BASE_URL` kosong, jalur MOCK dipakai dengan dataset
 * positive-flow "Budi Santoso" dari prototype. Perubahan disimpan di memori
 * modul supaya alur tambah/ubah/hapus bisa dicoba utuh.
 */
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

const PHONE = /^(\+62|62|0)8\d{7,12}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAINING_CATEGORIES: TrainingCategory[] = ['TECHNICAL', 'SOFT_SKILL', 'LEADERSHIP', 'COMPLIANCE', 'CERTIFICATION', 'OTHER'];

export const profileService = {
  async get(): Promise<EmployeeProfileData> {
    if (MOCK) {
      await delay();
      return structuredClone(mockData);
    }
    const { data } = await api.get<EmployeeProfileData>('/employee-profiles/me');
    return data;
  },

  /**
   * PUT HOT + COLD dalam satu transaksi (UIC §2.4). Server membaca baris terkini
   * lebih dulu; field HR-restricted yang diubah aktor ESS ditolak 403.
   */
  async updateProfile(patch: Partial<PersonalProfile>, actor: ProfileActor = 'ESS'): Promise<void> {
    if (MOCK) {
      await delay();
      const current = mockData.profile;
      if (actor === 'ESS') {
        const touched = HR_RESTRICTED_FIELDS.filter((field) => field in patch && patch[field] !== current[field]);
        if (touched.length) {
          throw new Error(`403 — ${touched.join(', ')} hanya boleh diubah HR (field HR-restricted).`);
        }
      }
      const next = { ...current, ...patch };
      if (next.nationality === 'FOREIGNER' && !next.passportNumber.trim()) {
        throw new Error('422 — passport_number wajib untuk FOREIGNER (MbV).');
      }
      if (!next.isDomicileSameAsIdCard && !next.domicileAddress.trim()) {
        throw new Error('422 — domicile_address wajib bila domisili berbeda dari alamat KTP.');
      }
      if (!next.idCardAddress.trim() || next.idCardAddress.length > 500) {
        throw new Error('422 — id_card_address wajib, maksimal 500 karakter.');
      }
      mockData = { ...mockData, profile: next };
      return;
    }
    await api.put('/employee-profiles/me', patch);
  },

  async saveRelative(relative: Relative): Promise<void> {
    if (MOCK) {
      await delay();
      // Wajib-minimal UIC §3.1: name + relationship_type + phone_number.
      if (!relative.name.trim() || relative.name.length > 100) throw new Error('422 — name wajib, maksimal 100 karakter.');
      if (!relative.relationshipType) throw new Error('422 — relationship_type wajib dipilih.');
      if (!PHONE.test(relative.phoneNumber.replace(/[\s-]/g, ''))) throw new Error('422 — phone_number tidak valid.');
      if (relative.email && !EMAIL.test(relative.email)) throw new Error('422 — email tidak valid.');
      const exists = mockData.relatives.some((r) => r.id === relative.id);
      mockData.relatives = exists
        ? mockData.relatives.map((r) => (r.id === relative.id ? relative : r))
        : [...mockData.relatives, { ...relative, id: relative.id || newId() }];
      return;
    }
    if (relative.id) await api.put(`/employee-relatives/${relative.id}`, relative);
    else await api.post('/employee-relatives', relative);
  },

  async deleteRelative(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockData.relatives = mockData.relatives.filter((r) => r.id !== id);
      return;
    }
    await api.delete(`/employee-relatives/${id}`);
  },

  async saveTraining(training: Training): Promise<void> {
    if (MOCK) {
      await delay();
      if (!TRAINING_CATEGORIES.includes(training.trainingCategory)) {
        throw new Error('422 — training_category di luar enum.');
      }
      if (training.startYear && training.endYear && Number(training.endYear) < Number(training.startYear)) {
        throw new Error('422 — end_year tidak boleh mendahului start_year.');
      }
      const exists = mockData.trainings.some((t) => t.id === training.id);
      mockData.trainings = exists
        ? mockData.trainings.map((t) => (t.id === training.id ? training : t))
        : [...mockData.trainings, { ...training, id: training.id || newId() }];
      return;
    }
    if (training.id) await api.put(`/trainings/${training.id}`, training);
    else await api.post('/trainings', training);
  },

  async deleteTraining(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockData.trainings = mockData.trainings.filter((t) => t.id !== id);
      return;
    }
    await api.delete(`/trainings/${id}`);
  },

  async saveWork(work: WorkExperience): Promise<void> {
    if (MOCK) {
      await delay();
      // CHECK ERD: presisi bulan-tahun (hari=01) + leave_date ≥ join_date.
      if (!work.companyName.trim() || !work.position.trim()) throw new Error('422 — company_name dan position wajib diisi.');
      if (!work.joinDate || !work.leaveDate) throw new Error('422 — join_date dan leave_date wajib diisi.');
      if (!work.joinDate.endsWith('-01') || !work.leaveDate.endsWith('-01')) {
        throw new Error('422 — tanggal kerja wajib presisi bulan-tahun (hari = 01).');
      }
      if (work.leaveDate < work.joinDate) throw new Error('422 — leave_date tidak boleh mendahului join_date.');
      const exists = mockData.works.some((w) => w.id === work.id);
      mockData.works = exists
        ? mockData.works.map((w) => (w.id === work.id ? work : w))
        : [...mockData.works, { ...work, id: work.id || newId() }];
      return;
    }
    if (work.id) await api.put(`/work-experiences/${work.id}`, work);
    else await api.post('/work-experiences', work);
  },

  async deleteWork(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      mockData.works = mockData.works.filter((w) => w.id !== id);
      return;
    }
    await api.delete(`/work-experiences/${id}`);
  },
};
