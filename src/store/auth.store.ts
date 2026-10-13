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

/** Nama peran untuk manusia — kode `ROLE_*` tidak pernah tampil mentah di layar. */
export const ROLE_LABEL: Record<string, string> = {
  ROLE_SUPER_ADMIN: 'Super Admin',
  ROLE_SYSTEM_ADMIN: 'System Admin',
  ROLE_HR_MANAGER: 'HR Manager',
  ROLE_HR_STAFF: 'HR Staff',
  ROLE_DEPT_MANAGER: 'Department Manager',
  ROLE_DEPARTMENT_MANAGER: 'Department Manager',
  ROLE_FINANCE_OFFICER: 'Finance Officer',
  ROLE_PAYROLL_OFFICER: 'Payroll Officer',
  ROLE_HEALTH_DATA_OFFICER: 'Health Data Officer',
  ROLE_GA_STAFF: 'GA Staff',
  ROLE_EMPLOYEE: 'Employee',
};

export const roleLabel = (role?: string) => (role ? (ROLE_LABEL[role] ?? role) : '—');

/** Peran yang bisa dipilih di mode dummy untuk menguji tampilan per peran (maker ≠ checker, dsb.). */
export const DEMO_ROLES = [
  'ROLE_SUPER_ADMIN',
  'ROLE_HR_MANAGER',
  'ROLE_HR_STAFF',
  'ROLE_DEPT_MANAGER',
  'ROLE_FINANCE_OFFICER',
  'ROLE_PAYROLL_OFFICER',
  'ROLE_EMPLOYEE',
] as const;

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** Perusahaan aktif (multi-tenant: satu akun bisa memegang beberapa PT). */
  companyId: string | null;
  setSession: (payload: { token: string; user: AuthUser }) => void;
  setCompany: (companyId: string) => void;
  /** Mode dummy saja: ganti peran sesi tanpa login ulang. */
  setRole: (role: string) => void;
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
      setRole: (role) => set((state) => (state.user ? { user: { ...state.user, role } } : state)),
      clear: () => set({ token: null, user: null }),
    }),
    {
      name: 'sevaka-auth',
      version: 1,
      // Sesi lama bisa menyimpan peran berbentuk teks bebas (mis. "Administrator") yang tidak dikenali
      // aturan tampil mana pun — akibatnya layar jatuh ke tampilan karyawan. Normalkan ke Super Admin.
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState>;
        if (state.user && !String(state.user.role ?? '').startsWith('ROLE_')) {
          state.user = { ...state.user, role: 'ROLE_SUPER_ADMIN' };
        }
        return state as AuthState;
      },
    },
  ),
);

export const useIsAuthenticated = () => useAuthStore((s) => Boolean(s.token));
