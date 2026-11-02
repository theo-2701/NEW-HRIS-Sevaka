import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { saveReturnPath } from '@/lib/returnPath';

/** Route guard — mengarahkan ke layar masuk bila belum ada sesi. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    // Tautan surel yang dibuka tanpa sesi: setelah login pengguna kembali ke sini.
    saveReturnPath(`${location.pathname}${location.search}`);
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
