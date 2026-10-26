import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { financeOpenTarget } from '@/features/finance-link/rules';

/** Pendarat tautan surel kabar finance (UIC-FINANCE 0.32 §12) — langsung `replace` ke layar tujuan. */
export function FinanceOpenLinkPage() {
  const { kind, id } = useParams();
  const role = useAuthStore((state) => state.user?.role);
  const target = financeOpenTarget(kind, id, role);
  return <Navigate to={target.path} state={target.state} replace />;
}
