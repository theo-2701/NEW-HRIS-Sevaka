import { Navigate, useLocation } from 'react-router-dom';

/** Tautan lama `/employees/transfer/dashboard?tr=` tetap membuka detail yang sama (§7.25 Clean-Replacement). */
export function LegacyTransitionDetail() {
  const { search } = useLocation();
  return <Navigate to={`/employees/transition/detail${search}`} replace />;
}
