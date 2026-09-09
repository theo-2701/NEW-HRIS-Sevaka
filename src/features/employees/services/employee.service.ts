import { api } from '@/services/api';
import { BRANCHES } from '@/features/employees/types';
import type {
  EmployeeDetail,
  EmployeeSearchRequest,
  EmployeeSearchResponse,
} from '@/features/employees/types';

/**
 * API service Employee Directory.
 *
 * Kontrak: pencarian memakai **POST** `/employees/search` dengan kriteria di
 * body (bukan query-string) — UIC §1.3. Detail memakai `GET /employees/{id}`
 * dan menulis satu baris read-audit append-only di backend (§12.2).
 *
 * Selama `VITE_API_BASE_URL` kosong, jalur MOCK dipakai: dataset contoh di
 * bawah memuat keenam `employment_status` dan keempat `work_arrangement`.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;

/** Aktor yang sedang masuk — dipakai untuk membedakan data diri vs subjek lain. */
export const CURRENT_EMPLOYEE_ID = 'emp-tony';

const branchName = (id: string) => BRANCHES.find((b) => b.id === id)?.name ?? '—';

const MOCK_EMPLOYEES: EmployeeDetail[] = [
  {
    id: 'emp-eka',
    nik: 'NIK-0005',
    name: 'Eka Saputra',
    employmentStatus: 'ACTIVE',
    workArrangement: 'WFO',
    branchId: 'br-papua',
    branchName: branchName('br-papua'),
    position: 'Staff Finance',
    createdAt: '2026-02-11',
    contractEndDate: '2027-02-10',
    costCenter: 'CC-FIN-PPA',
    sbu: 'SBU Timur',
    supervisor: 'Rahmat Hidayat · Manager Finance',
    jobGrade: 'Class III-B',
    formalPosition: 'Staff',
    joinDate: '2021-02-11',
    leaveDate: null,
    bank: { bankCode: 'BCA', accountNumber: '8830041562', accountHolderName: 'Eka Saputra' },
    email: 'eka.saputra@ptdika.co.id',
    phone: '+628123400051',
  },
  {
    id: 'emp-lia',
    nik: 'NIK-0012',
    name: 'Lia Permata',
    employmentStatus: 'ACTIVE',
    workArrangement: 'HYBRID',
    branchId: 'br-jkt',
    branchName: branchName('br-jkt'),
    position: 'HR Specialist',
    createdAt: '2025-11-03',
    contractEndDate: null,
    costCenter: 'CC-HR-HO',
    sbu: 'SBU Pusat',
    supervisor: 'Tony Stark · HR Manager',
    jobGrade: 'Class IV-A',
    formalPosition: 'Specialist',
    joinDate: '2019-11-04',
    leaveDate: null,
    bank: { bankCode: 'Mandiri', accountNumber: '1440026719', accountHolderName: 'Lia Permata' },
    email: 'lia.permata@ptdika.co.id',
    phone: '+628567712012',
  },
  {
    id: 'emp-tony',
    nik: 'NIK-0001',
    name: 'Tony Stark',
    employmentStatus: 'ACTIVE',
    workArrangement: 'WFO',
    branchId: 'br-jkt',
    branchName: branchName('br-jkt'),
    position: 'HR Manager',
    createdAt: '2024-05-20',
    contractEndDate: null,
    costCenter: 'CC-HR-HO',
    sbu: 'SBU Pusat',
    supervisor: null,
    jobGrade: 'Class VI-A',
    formalPosition: 'Manager',
    joinDate: '2018-05-21',
    leaveDate: null,
    bank: { bankCode: 'BNI', accountNumber: '0091553380', accountHolderName: 'Tony Stark' },
    email: 'tony.stark@ptdika.co.id',
    phone: '+628111000001',
  },
  {
    id: 'emp-bagus',
    nik: 'NIK-0021',
    name: 'Bagus Wicaksono',
    employmentStatus: 'WAITING',
    workArrangement: 'WFH',
    branchId: 'br-bdg',
    branchName: branchName('br-bdg'),
    position: 'Software Engineer',
    createdAt: '2026-07-01',
    contractEndDate: '2027-06-30',
    costCenter: 'CC-ENG-BDG',
    sbu: 'SBU Barat',
    supervisor: 'Dewi Lestari · Engineering Lead',
    jobGrade: 'Class III-A',
    formalPosition: 'Staff',
    joinDate: '2026-08-01',
    leaveDate: null,
    bank: { bankCode: 'BCA', accountNumber: '7720118834', accountHolderName: 'Bagus Wicaksono' },
    email: 'bagus.w@ptdika.co.id',
    phone: '+628223345021',
  },
  {
    id: 'emp-rina',
    nik: 'NIK-0018',
    name: 'Rina Marlina',
    employmentStatus: 'OFFBOARDING',
    workArrangement: 'WFO',
    branchId: 'br-sby',
    branchName: branchName('br-sby'),
    position: 'Accountant',
    createdAt: '2023-09-14',
    contractEndDate: '2026-09-13',
    costCenter: 'CC-FIN-SBY',
    sbu: 'SBU Timur',
    supervisor: 'Rahmat Hidayat · Manager Finance',
    jobGrade: 'Class IV-B',
    formalPosition: 'Specialist',
    joinDate: '2020-09-14',
    leaveDate: '2026-09-13',
    bank: { bankCode: 'Mandiri', accountNumber: '1330099471', accountHolderName: 'Rina Marlina' },
    email: 'rina.marlina@ptdika.co.id',
    phone: '+628345567018',
  },
  {
    id: 'emp-doni',
    nik: 'NIK-0027',
    name: 'Doni Prabowo',
    employmentStatus: 'ACTIVE',
    workArrangement: 'MOBILE',
    branchId: 'br-papua',
    branchName: branchName('br-papua'),
    position: 'Field Technician',
    createdAt: '2025-03-22',
    contractEndDate: '2027-03-21',
    costCenter: 'CC-OPS-PPA',
    sbu: 'SBU Timur',
    supervisor: 'Agus Setiawan · Warehouse Supervisor',
    jobGrade: 'Class II-C',
    formalPosition: 'Pelaksana',
    joinDate: '2022-03-22',
    leaveDate: null,
    bank: { bankCode: 'BRI', accountNumber: '3020117758', accountHolderName: 'Doni Prabowo' },
    email: 'doni.prabowo@ptdika.co.id',
    phone: '+628778890027',
  },
  {
    id: 'emp-sari',
    nik: 'NIK-0009',
    name: 'Sari Dewanti',
    employmentStatus: 'SUSPENDED',
    workArrangement: 'WFH',
    branchId: 'br-jkt',
    branchName: branchName('br-jkt'),
    position: 'Payroll Officer',
    createdAt: '2024-12-05',
    contractEndDate: null,
    costCenter: 'CC-HR-HO',
    sbu: 'SBU Pusat',
    supervisor: 'Tony Stark · HR Manager',
    jobGrade: 'Class III-C',
    formalPosition: 'Staff',
    joinDate: '2021-12-06',
    leaveDate: null,
    bank: { bankCode: 'BCA', accountNumber: '8811220049', accountHolderName: 'Sari Dewanti' },
    email: 'sari.dewanti@ptdika.co.id',
    phone: '+628990011009',
  },
  {
    id: 'emp-agus',
    nik: 'NIK-0031',
    name: 'Agus Setiawan',
    employmentStatus: 'RESIGNED',
    workArrangement: 'WFO',
    branchId: 'br-sby',
    branchName: branchName('br-sby'),
    position: 'Warehouse Supervisor',
    createdAt: '2022-08-30',
    contractEndDate: '2026-01-31',
    costCenter: 'CC-OPS-SBY',
    sbu: 'SBU Timur',
    supervisor: 'Budi Santoso · Ops Manager',
    jobGrade: 'Class V-A',
    formalPosition: 'Supervisor',
    joinDate: '2019-08-30',
    leaveDate: '2026-01-31',
    bank: { bankCode: 'BNI', accountNumber: '0071889923', accountHolderName: 'Agus Setiawan' },
    email: 'agus.setiawan@ptdika.co.id',
    phone: '+628112230031',
  },
  {
    id: 'emp-maya',
    nik: 'NIK-0014',
    name: 'Maya Anggraini',
    employmentStatus: 'TERMINATED',
    workArrangement: 'HYBRID',
    branchId: 'br-bdg',
    branchName: branchName('br-bdg'),
    position: 'Recruiter',
    createdAt: '2023-04-18',
    contractEndDate: '2025-12-31',
    costCenter: 'CC-HR-BDG',
    sbu: 'SBU Barat',
    supervisor: 'Tony Stark · HR Manager',
    jobGrade: 'Class III-B',
    formalPosition: 'Staff',
    joinDate: '2020-04-18',
    leaveDate: '2025-12-31',
    bank: { bankCode: 'Mandiri', accountNumber: '1660034418', accountHolderName: 'Maya Anggraini' },
    email: 'maya.anggraini@ptdika.co.id',
    phone: '+628334456014',
  },
  {
    id: 'emp-yoga',
    nik: 'NIK-0036',
    name: 'Yoga Pratama',
    employmentStatus: 'ACTIVE',
    workArrangement: 'HYBRID',
    branchId: 'br-jkt',
    branchName: branchName('br-jkt'),
    position: 'Data Analyst',
    createdAt: '2026-01-19',
    contractEndDate: '2027-01-18',
    costCenter: 'CC-DATA-HO',
    sbu: 'SBU Pusat',
    supervisor: 'Dewi Lestari · Engineering Lead',
    jobGrade: 'Class III-B',
    formalPosition: 'Staff',
    joinDate: '2023-01-19',
    leaveDate: null,
    bank: { bankCode: 'BCA', accountNumber: '8899003612', accountHolderName: 'Yoga Pratama' },
    email: 'yoga.pratama@ptdika.co.id',
    phone: '+628556678036',
  },
  {
    id: 'emp-nur',
    nik: 'NIK-0022',
    name: 'Nur Aisyah',
    employmentStatus: 'ACTIVE',
    workArrangement: 'WFO',
    branchId: 'br-jkt',
    branchName: branchName('br-jkt'),
    position: 'Legal Officer',
    createdAt: '2025-06-27',
    contractEndDate: null,
    costCenter: 'CC-LEG-HO',
    sbu: 'SBU Pusat',
    supervisor: 'Sinta Wijaya · Legal Manager',
    jobGrade: 'Class IV-A',
    formalPosition: 'Specialist',
    joinDate: '2022-06-27',
    leaveDate: null,
    bank: { bankCode: 'BNI', accountNumber: '0093312207', accountHolderName: 'Nur Aisyah' },
    email: 'nur.aisyah@ptdika.co.id',
    phone: '+628667789022',
  },
  {
    id: 'emp-fajar',
    nik: 'NIK-0040',
    name: 'Fajar Nugroho',
    employmentStatus: 'WAITING',
    workArrangement: 'MOBILE',
    branchId: 'br-papua',
    branchName: branchName('br-papua'),
    position: 'Site Engineer',
    createdAt: '2026-07-08',
    contractEndDate: '2027-07-07',
    costCenter: 'CC-OPS-PPA',
    sbu: 'SBU Timur',
    supervisor: 'Agus Setiawan · Warehouse Supervisor',
    jobGrade: 'Class III-A',
    formalPosition: 'Staff',
    joinDate: '2026-08-01',
    leaveDate: null,
    bank: { bankCode: 'BRI', accountNumber: '3021009985', accountHolderName: 'Fajar Nugroho' },
    email: 'fajar.nugroho@ptdika.co.id',
    phone: '+628778812040',
  },
];

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

function applyCriteria(request: EmployeeSearchRequest): EmployeeSearchResponse {
  const keyword = request.keyword.trim().toLowerCase();

  const filtered = MOCK_EMPLOYEES.filter((e) => {
    if (keyword && !e.name.toLowerCase().includes(keyword) && !e.nik.toLowerCase().includes(keyword)) {
      return false;
    }
    if (request.employmentStatus.length && !request.employmentStatus.includes(e.employmentStatus)) {
      return false;
    }
    if (request.branchId && e.branchId !== request.branchId) return false;
    if (request.createdFrom && e.createdAt < request.createdFrom) return false;
    if (request.createdTo && e.createdAt > request.createdTo) return false;
    return true;
  });

  const dir = request.sortDir === 'ASC' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    const key = request.sortBy as keyof typeof a;
    return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * dir;
  });

  const start = (request.page - 1) * request.size;
  return { rows: sorted.slice(start, start + request.size), total: sorted.length };
}

export const employeeService = {
  /** `POST /employees/search` — kriteria dikirim di body. */
  async search(request: EmployeeSearchRequest): Promise<EmployeeSearchResponse> {
    if (MOCK) {
      await delay();
      return applyCriteria(request);
    }
    const { data } = await api.post<EmployeeSearchResponse>('/employees/search', request);
    return data;
  },

  /** `GET /employees/{id}` — membuka detail menulis satu baris read-audit. */
  async getById(id: string): Promise<EmployeeDetail> {
    if (MOCK) {
      await delay(250);
      const found = MOCK_EMPLOYEES.find((e) => e.id === id);
      if (!found) throw new Error('Data karyawan tidak ditemukan.');
      return found;
    }
    const { data } = await api.get<EmployeeDetail>(`/employees/${id}`);
    return data;
  },
};
