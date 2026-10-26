/**
 * Kode service untuk modal galat (Notulen 12 Okt 2026, keputusan #7): pesan galat wajib berupa modal
 * yang bisa di-screenshot, berisi kode per service dan kontak penanggung jawab — contoh `303` =
 * service employee directory. Service ditebak dari alamat halaman tempat galat muncul.
 *
 * Kode & kontak di sini masih DUMMY sampai tim backend menetapkan tabel resminya.
 */
export interface ServiceCode {
  code: string;
  name: string;
}

const SERVICE_BY_PREFIX: [prefix: string, service: ServiceCode][] = [
  ['/auth', { code: '301', name: 'Auth service' }],
  // Pembaca log sistem milik auth-service (UIC-AUTH 0.28 §8A).
  ['/company-management/system-log', { code: '301', name: 'Auth service' }],
  ['/company', { code: '302', name: 'Company service' }],
  ['/employees', { code: '303', name: 'Employee Directory service' }],
  ['/me/profile', { code: '304', name: 'Employee Profile service' }],
  ['/time', { code: '305', name: 'Time service' }],
  ['/me/time', { code: '305', name: 'Time service' }],
  ['/payroll', { code: '306', name: 'Payroll service' }],
  ['/me/payroll', { code: '306', name: 'Payroll service' }],
  ['/finance', { code: '307', name: 'Finance service' }],
  ['/performance', { code: '308', name: 'Performance service' }],
  ['/productivity', { code: '309', name: 'Productivity service' }],
  ['/documents', { code: '310', name: 'Document service' }],
  ['/settings', { code: '311', name: 'Settings service' }],
  ['/notifications', { code: '312', name: 'Notification service' }],
  ['/recruitment', { code: '313', name: 'Recruitment service' }],
];

const FALLBACK: ServiceCode = { code: '300', name: 'HRIS' };

export function serviceForPath(pathname: string): ServiceCode {
  const match = SERVICE_BY_PREFIX.filter(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)).sort(
    (a, b) => b[0].length - a[0].length,
  )[0];
  return match ? match[1] : FALLBACK;
}

/** Penanggung jawab yang dihubungi bila galat berulang (dummy). */
export const SUPPORT_CONTACT = { team: 'HRIS Support Team', channel: 'IT Helpdesk · ext. 1500' };
