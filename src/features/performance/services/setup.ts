import { settingsService } from '@/features/settings/services/settings.service';
import { SETTINGS_VIEWERS } from '@/features/settings/mock-data';

/** Setelan angka `performance.*` dibaca terkini dari modul Settings (cross-schema `SELECT`, nol REST). */
export async function readPerfNumber(code: string, fallback: number): Promise<number> {
  const rows = await settingsService.read(SETTINGS_VIEWERS[0]);
  const value = rows.find((row) => row.setupCode === code)?.setupValue?.[0];
  const number = typeof value === 'number' ? value : Number(value);
  return value === undefined || value === null || Number.isNaN(number) ? fallback : number;
}
