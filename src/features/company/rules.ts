import { ZIP_BOOK } from '@/features/company/mock-data';
import type { Branch, CostCenter, GroupLevel, GroupPosition, JobGrade, Sbu } from '@/features/company/types';

/** Provinsi, kota, dan zona waktu diturunkan dari snapshot kode pos. */
export function deriveZip(zip: string) {
  const row = ZIP_BOOK[zip.trim()];
  return {
    province: row?.province ?? '—',
    city: row?.city ?? '—',
    timezone: row?.timezone ?? 'Asia/Jakarta',
    known: Boolean(row),
  };
}

export const branchProvince = (branch: Branch) => deriveZip(branch.zip.zip).province;
export const branchCity = (branch: Branch) => deriveZip(branch.zip.zip).city;

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
