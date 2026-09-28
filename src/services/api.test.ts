import { describe, expect, it } from 'vitest';
import { tenantPath } from '@/services/api';

describe('tenantPath — segmen penyewa (UIC-COMPANY §1.1, UIC-NOTIFICATION 0.3 §1.1)', () => {
  it('service tenant-scoped diberi prefix company_code', () => {
    expect(tenantPath('/company/my-announcements/ann-1', 'COMPANY001')).toBe(
      '/COMPANY001/company/my-announcements/ann-1',
    );
    expect(tenantPath('/assets/search', 'DIKA')).toBe('/DIKA/assets/search');
  });

  it('service global (auth, notifications) tanpa prefix', () => {
    expect(tenantPath('/auth/activate', 'DIKA')).toBe('/auth/activate');
    expect(tenantPath('/notifications/inbox', 'DIKA')).toBe('/notifications/inbox');
  });

  it('tanpa company_code atau URL absolut dibiarkan', () => {
    expect(tenantPath('/assets/search', null)).toBe('/assets/search');
    expect(tenantPath('https://example.test/x', 'DIKA')).toBe('https://example.test/x');
  });
});
