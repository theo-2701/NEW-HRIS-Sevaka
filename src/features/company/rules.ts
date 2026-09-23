import { ZIP_BOOK } from '@/features/company/mock-data';
import type { Branch, CompanyRole, CostCenter, GroupLevel, GroupPosition, JobGrade, Sbu } from '@/features/company/types';

/** `ROLE_SUPER_ADMIN`/`ROLE_SYSTEM_ADMIN` — satu-satunya peran yang boleh menulis GS-11 dan `can_sign_letter`. */
export const isCompanyAdmin = (role: CompanyRole) => role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_SYSTEM_ADMIN';

/** Peran yang boleh membaca GS-11 (§2.3.1) — lebih longgar dari yang boleh menulis. */
export const canReadModuleMap = (role: CompanyRole) =>
  role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_SYSTEM_ADMIN' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_DEPARTMENT_MANAGER';

/**
 * Provinsi, kota, dan zona waktu dari kode pos — dipakai untuk MENYUSUN snapshot zip saat
 * cabang dibuat/diubah. Sejak `PROB-SERVICE-787` (ERD 0.47/UIC 0.11), `province`/`city` adalah
 * kunci snapshot yang dibekukan saat itu, bukan lagi diturunkan ulang setiap dibaca — jangan
 * panggil fungsi ini untuk menampilkan cabang yang sudah tersimpan, baca `branch.zip` langsung.
 */
export function deriveZip(zip: string) {
  const row = ZIP_BOOK[zip.trim()];
  return {
    province: row?.province ?? '—',
    city: row?.city ?? '—',
    timezone: row?.timezone ?? 'Asia/Jakarta',
    known: Boolean(row),
  };
}

export const branchProvince = (branch: Branch) => branch.zip.province;
export const branchCity = (branch: Branch) => branch.zip.city;

/** Huruf peringkat basis-26: 1→A, 2→B, …, 26→Z, 27→AA, … (`ERD-001-COMPANY` §7.7.1). */
export function letterFromRank(rank: number): string {
  let n = rank;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out || 'A';
}

/** `grade_code` server-generated = `<level>.<huruf>` — level = kedalaman (root = 1). */
export const computeGradeCode = (level: number, rank: number) => `${level}.${letterFromRank(rank)}`;

/** Nominal dan bilangan bulat dari isian teks. */
export function parseNumber(value: string): number | null {
  const clean = value.trim().replace(/[.\s]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Number(clean);
}

export function parseInteger(value: string): number | null {
  const clean = value.trim();
  if (!/^\d+$/.test(clean)) return null;
  return Number(clean);
}

/** Grade berada di puncak (tanpa induk); Class selalu punya induk. */
export const isClass = (row: JobGrade) => row.parentId !== null;
export const isGrade = (row: JobGrade) => row.parentId === null;

/** Class wajib membawa rentang gaji, dan batas atas tidak boleh di bawah batas bawah. */
export function salaryRangeError(parentId: string, from: number | null, to: number | null): string | null {
  if (!parentId) return null;
  if (from === null || to === null) return 'Rentang gaji wajib diisi untuk Class.';
  if (to < from) return 'Batas atas rentang gaji tidak boleh lebih kecil dari batas bawahnya.';
  return null;
}

/** Induk posisi tidak boleh dirinya sendiri maupun keturunannya. */
export function isDescendantPosition(positions: GroupPosition[], candidateParentId: string, positionId: string): boolean {
  let cursor: string | null = candidateParentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === positionId) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    cursor = positions.find((row) => row.id === cursor)?.parentId ?? null;
  }
  return false;
}

/** Urutan level induk tidak boleh lebih dalam dari anaknya. */
export function levelOrderOf(levels: GroupLevel[], levelId: string): number {
  return levels.find((row) => row.id === levelId)?.levelOrder ?? 0;
}

export function parentLevelError(
  levels: GroupLevel[],
  parent: GroupPosition | undefined,
  childLevelId: string,
): string | null {
  if (!parent) return null;
  const parentOrder = levelOrderOf(levels, parent.groupStructLevelId);
  const childOrder = levelOrderOf(levels, childLevelId);
  if (parentOrder > childOrder) {
    return 'Posisi induk berada pada level yang lebih dalam daripada posisi ini.';
  }
  return null;
}

/** Hierarki cost center dan SBU memakai penjagaan siklus yang sama. */
export function isDescendantNode<T extends { id: string; parentId: string | null }>(
  rows: T[],
  candidateParentId: string,
  nodeId: string,
): boolean {
  let cursor: string | null = candidateParentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === nodeId) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    cursor = rows.find((row) => row.id === cursor)?.parentId ?? null;
  }
  return false;
}

export const costCenterPath = (rows: CostCenter[], row: CostCenter): string => {
  const parent = row.parentId ? rows.find((item) => item.id === row.parentId) : undefined;
  return parent ? `${parent.name} › ${row.name}` : row.name;
};

export const sbuPath = (rows: Sbu[], row: Sbu): string => {
  const parent = row.parentId ? rows.find((item) => item.id === row.parentId) : undefined;
  return parent ? `${parent.name} › ${row.name}` : row.name;
};
