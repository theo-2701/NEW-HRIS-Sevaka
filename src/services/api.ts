import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { MOCK } from '@/services/mock';
import { toast } from '@/store/ui.store';

/**
 * API service layer — SATU axios instance untuk seluruh aplikasi.
 * Aturan: komponen tidak pernah memanggil axios langsung. Setiap fitur
 * membuat `features/<fitur>/services/<nama>.service.ts` yang memakai `api`.
 */
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Mode dummy: tidak ada HTTP call yang boleh keluar (lihat `services/mock.ts`).
  if (MOCK) {
    return Promise.reject(new ApiError(`Mode dummy aktif — panggilan ${config.method?.toUpperCase()} ${config.url} diblokir.`, 0));
  }
  const { token, companyId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Multi-tenant: satu akun bisa memegang beberapa perusahaan.
  if (companyId) config.headers['X-Company-Id'] = companyId;
  return config;
});

/** Jeda sebelum dialihkan ke login supaya toast sesi berakhir sempat terbaca (FSD-001-AUTH §1). */
export const SESSION_EXPIRED_REDIRECT_DELAY_MS = 2_000;
let sessionExpiring = false;

/** Pesan sengaja generik — tidak menyebut sebab (dicabut/kedaluwarsa/batas sesi). */
export function expireSession() {
  if (sessionExpiring) return;
  sessionExpiring = true;
  toast('Sesi berakhir, silakan masuk lagi', 'danger');
  setTimeout(() => {
    useAuthStore.getState().clear();
    sessionExpiring = false;
  }, SESSION_EXPIRED_REDIRECT_DELAY_MS);
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) expireSession();
    return Promise.reject(toApiError(error));
  },
);

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  const message =
    body?.message ??
    (status === 0 ? 'Tidak dapat terhubung ke server.' : 'Terjadi kesalahan pada server.');
  return new ApiError(message, status, body?.code, body?.errors);
}

/** Bentuk envelope standar backend SEVAKA. */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Bentuk daftar berhalaman standar backend SEVAKA. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
