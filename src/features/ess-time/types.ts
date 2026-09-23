import type { Session } from '@/features/time-off/types';

/**
 * Employee Self-Service › Time Management — lima layar milik-sendiri
 * (FSD-001-TIME · UIC-001-TIME §3.1/§3.2/§4.1.3 · TSD-001-TIME).
 *
 * Layar ESS tidak punya resource sendiri: ia membaca resource Time yang sama dengan layar HR,
 * tetapi **selalu** dalam cakupan pemanggil. Yang membedakannya bukan tampilan, melainkan
 * cakupan data — kriteria pencarian ESS nol memuat pemilih karyawan, dan service dipanggil
 * dengan peran `ROLE_EMPLOYEE` saja sehingga penyaringan milik-sendiri ditegakkan di sisi
 * service, bukan disaring belakangan di komponen.
 */
export interface EssActor {
  employeeId: string;
  label: string;
  /** Punya task approval yang bisa dititipkan saat cuti (UIC §3.2: hanya approver mengisi delegasi). */
  isApprover: boolean;
}

/**
 * Dua sesi dari satu identitas, sengaja dibedakan:
 *  • **baca** — selalu `ROLE_EMPLOYEE` saja, supaya service menyaring ke milik pemanggil.
 *    Menyertakan peran approver di sini akan membuat service memulangkan baris seluruh tim.
 *  • **tulis delegasi** — memakai peran asli, sebab UIC §3.2 hanya mengizinkan pemegang peran
 *    approver menitipkan task approval-nya.
 */
export const essReadSession = (actor: EssActor): Session => ({
  employeeId: actor.employeeId,
  roles: ['ROLE_EMPLOYEE'],
});

export const essDelegationSession = (actor: EssActor): Session => ({
  employeeId: actor.employeeId,
  roles: actor.isApprover ? ['ROLE_EMPLOYEE', 'ROLE_DEPT_MANAGER'] : ['ROLE_EMPLOYEE'],
});
