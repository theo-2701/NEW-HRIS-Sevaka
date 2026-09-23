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
