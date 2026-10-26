import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { saveReturnPath } from '@/lib/returnPath';

/**
 * Route guard — mengarahkan ke layar masuk bila belum ada sesi. Alamat yang dibuka (tautan surel, atau
 * halaman saat sesi berakhir) disimpan supaya login mendarat kembali di sana (FSD-AUTH 0.21 §2).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const here = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!token) saveReturnPath(here);
  }, [token, here]);

  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
