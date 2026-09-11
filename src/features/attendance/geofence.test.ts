import { beforeEach, describe, expect, it } from 'vitest';
import { geofenceService, resetGeofenceMocks } from '@/features/attendance/services/geofence.service';
import { ARRANGEMENTS } from '@/features/attendance/types';
import type { GeofenceDraft } from '@/features/attendance/types';

const rules = ARRANGEMENTS.reduce(
  (acc, key) => ({ ...acc, [key]: { radius: true, selfie: true } }),
  {} as GeofenceDraft['rules'],
);

const draft: GeofenceDraft = {
  geofenceName: 'Kantor Cabang Makassar — Gudang',
  scopeRef: 'br-4',
  centerLatitude: -5.1481,
  centerLongitude: 119.4331,
  radiusMeters: 120,
  isActive: true,
  rules,
};

beforeEach(() => {
  resetGeofenceMocks();
});

describe('Work point — validasi form', () => {
  it('menolak nama lebih pendek dari 3 karakter', async () => {
    await expect(geofenceService.save({ ...draft, geofenceName: 'AB' })).rejects.toThrow(/422/);
  });

  it('menolak koordinat di luar ±90/±180', async () => {
    await expect(geofenceService.save({ ...draft, centerLatitude: 91 })).rejects.toThrow(/±90/);
    await expect(geofenceService.save({ ...draft, centerLongitude: -181 })).rejects.toThrow(/±180/);
  });

  it('menolak radius nol atau pecahan', async () => {
    await expect(geofenceService.save({ ...draft, radiusMeters: 0 })).rejects.toThrow(/422/);
    await expect(geofenceService.save({ ...draft, radiusMeters: 12.5 })).rejects.toThrow(/bilangan bulat/);
  });

  it('radius kecil adalah peringatan, bukan penolakan', async () => {
    const result = await geofenceService.save({ ...draft, radiusMeters: 20 });
    expect(result.created).toBe(true);
    expect(result.row.radiusMeters).toBe(20);
    expect(result.warning).toMatch(/akurasi GPS/);
  });
});

describe('Work point — keunikan nama', () => {
  it('menolak nama yang sudah dipakai titik aktif di cabang yang sama', async () => {
    await expect(
      geofenceService.save({ ...draft, scopeRef: 'br-1', geofenceName: 'Kantor Pusat Jakarta — Gedung A' }),
    ).rejects.toThrow(/409/);
  });

  it('nama yang sama di cabang berbeda tetap diterima', async () => {
    const result = await geofenceService.save({
      ...draft,
      scopeRef: 'br-4',
      geofenceName: 'Kantor Pusat Jakarta — Gedung A',
    });
    expect(result.created).toBe(true);
  });

  it('Ubah sengaja tidak memeriksa bentrok nama', async () => {
    const result = await geofenceService.save(
      { ...draft, scopeRef: 'br-1', geofenceName: 'Kantor Pusat Jakarta — Gedung A' },
      'geo-2',
    );
    expect(result.created).toBe(false);
    expect(result.row.geofenceName).toBe('Kantor Pusat Jakarta — Gedung A');
  });
});

describe('Work point — matriks capture', () => {
  it('menyimpan empat baris eksplisit apa adanya', async () => {
    const mixed = {
      WFO: { radius: true, selfie: true },
      HYBRID: { radius: true, selfie: false },
      WFH: { radius: false, selfie: true },
      MOBILE: { radius: false, selfie: false },
    };
    const result = await geofenceService.save({ ...draft, rules: mixed });
    expect(Object.keys(result.row.rules)).toEqual(ARRANGEMENTS);
    expect(result.row.rules).toEqual(mixed);
  });

  it('mengubah matriks tidak menyentuh baris lain', async () => {
    await geofenceService.save({ ...draft, rules: { ...rules, MOBILE: { radius: true, selfie: false } } }, 'geo-3');
    const rows = await geofenceService.list();
    expect(rows.find((row) => row.id === 'geo-3')!.rules.MOBILE).toEqual({ radius: true, selfie: false });
    expect(rows.find((row) => row.id === 'geo-1')!.rules.MOBILE).toEqual({ radius: false, selfie: true });
  });
});

describe('Work point — nonaktifkan & hapus', () => {
  it('nonaktifkan tidak pernah ditolak dan bisa dibalik', async () => {
    const off = await geofenceService.toggleActive('geo-1');
    expect(off.isActive).toBe(false);
    const on = await geofenceService.toggleActive('geo-1');
    expect(on.isActive).toBe(true);
  });

  it('menolak hapus titik yang pernah dirujuk tap', async () => {
    await expect(geofenceService.remove('geo-1')).rejects.toThrow(/409/);
    const rows = await geofenceService.list();
    expect(rows.find((row) => row.id === 'geo-1')).toBeTruthy();
  });

  it('titik yang belum pernah memvalidasi tap boleh dihapus', async () => {
    await geofenceService.remove('geo-3');
    const rows = await geofenceService.list();
    expect(rows.find((row) => row.id === 'geo-3')).toBeUndefined();
  });

  it('nama yang tadinya bentrok bebas dipakai setelah titiknya dinonaktifkan', async () => {
    await geofenceService.toggleActive('geo-1');
    const result = await geofenceService.save({
      ...draft,
      scopeRef: 'br-1',
      geofenceName: 'Kantor Pusat Jakarta — Gedung A',
    });
    expect(result.created).toBe(true);
  });
});

describe('Work point — filter kontrak pencarian', () => {
  it('menyaring per cabang', async () => {
    const rows = await geofenceService.list({ scopeRef: 'br-4' });
    expect(rows.map((row) => row.id)).toEqual(['geo-3']);
  });

  it('mencari nama titik tanpa membedakan huruf besar-kecil', async () => {
    const rows = await geofenceService.list({ name: 'gedung b' });
    expect(rows.map((row) => row.id)).toEqual(['geo-2']);
  });

  it('menyaring per status aktif', async () => {
    await geofenceService.toggleActive('geo-2');
    expect((await geofenceService.list({ isActive: false })).map((row) => row.id)).toEqual(['geo-2']);
    expect((await geofenceService.list({ isActive: true })).map((row) => row.id)).toEqual(['geo-1', 'geo-3']);
  });
});
