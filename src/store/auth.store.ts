import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Jabatan yang tampil di hero dashboard & menu profil. */
  position?: string;
}

export interface Company {
  id: string;
  short: string;
  name: string;
  sub: string;
  color: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** Perusahaan aktif (multi-tenant: satu akun bisa memegang beberapa PT). */
  companyId: string | null;
  setSession: (payload: { token: string; user: AuthUser }) => void;
  setCompany: (companyId: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      companyId: 'DIKA',
      setSession: ({ token, user }) => set({ token, user }),
      setCompany: (companyId) => set({ companyId }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'sevaka-auth' },
  ),
);

export const useIsAuthenticated = () => useAuthStore((s) => Boolean(s.token));
