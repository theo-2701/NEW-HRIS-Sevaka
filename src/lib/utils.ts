import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Penggabung className standar ShadCN — dipakai seluruh komponen UI. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
