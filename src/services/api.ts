import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { MOCK } from '@/services/mock';
import { newTraceId, rememberErrorReference } from '@/lib/errorReference';

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
  // Pelacakan lintas service (gerbang mengizinkan header ini); VITE_SEND_TRACE_ID=false mematikannya.
  if (import.meta.env.VITE_SEND_TRACE_ID !== 'false') config.headers['x-b3-traceid'] = newTraceId();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(toApiError(error));
  },
);

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
  error_code?: string;
  trace_id?: string;
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
  const errorCode = body?.error_code ?? body?.code;
  const traceId = body?.trace_id ?? (error.config?.headers?.['x-b3-traceid'] as string | undefined);
  if (errorCode || traceId) rememberErrorReference({ errorCode, traceId });
  return new ApiError(message, status, errorCode, body?.errors);
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
