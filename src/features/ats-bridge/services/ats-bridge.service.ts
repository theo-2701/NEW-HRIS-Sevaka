import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { ATS_CANDIDATES } from '@/features/ats-bridge/mock-data';
import { canDelete, canMaterialize } from '@/features/ats-bridge/types';
import type {
  AtsCandidate,
  AtsRole,
  AtsSource,
  AtsStatus,
  MaterializeDraft,
  MaterializeResult,
} from '@/features/ats-bridge/types';
import { registerMaterializedEmployee } from '@/features/employees/services/employee.service';
import { registerContactVerification } from '@/features/contact-verification/services/contact-verification.service';
import { JOB_GRADE_OPTIONS, labelOf } from '@/features/new-joiner/types';

/**
 * Endpoint kontrak (prefiks `/employee`, §7.4.12):
 *   POST /ats-bridges · POST /ats-bridges/search · GET /ats-bridges/{id}
 *   POST /ats-bridges/{id}/resend-link · DELETE /ats-bridges/{id}
 *   POST /ats-bridges/{id}/materialize (Idempotency-Key)
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const DAY = 24 * 60 * 60 * 1000;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let rows: AtsCandidate[] = ATS_CANDIDATES.map((row) => ({ ...row }));

export function resetAtsMocks() {
  rows = ATS_CANDIDATES.map((row) => ({ ...row }));
}

export interface AtsFilter {
  keyword?: string;
  status?: AtsStatus;
  source?: AtsSource;
}

function find(id: string) {
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error('404 — kandidat ATS tidak ditemukan.');
  return row;
}

/** Bulk Import (§7.16.4) memakai pintu undangan yang sama, `source=BULK_IMPORT`. */
export function inviteAtsCandidate(source: AtsSource, email: string, requestorEmployeeId: string, emailDomain: string | null) {
  const now = Date.now();
  const row: AtsCandidate = {
    id: `ats-${crypto.randomUUID().slice(0, 6)}`,
    candidateEmail: email.trim().toLowerCase(),
    candidateName: null,
    source,
    atsStatus: 'WAITING_CANDIDATE',
    consentStatus: null,
    requestorEmployeeId,
    linkSentAt: new Date(now).toISOString(),
    linkSendCount: 1,
    tokenExpiresAt: new Date(now + DAY).toISOString(),
    completedAt: null,
    parentId: null,
    usedEmployeeId: null,
    emailDomain,
    createdAt: new Date(now).toISOString(),
  };
  rows = [row, ...rows];
  return row;
}

/** Pemilih "From ATS" (§7.4.12 `available_for_new_joiner`): COMPLETED, bukan Bulk Import, belum dipakai. */
export function availableForNewJoiner(heldIds: string[]): AtsCandidate[] {
  return rows
    .filter((row) => row.atsStatus === 'COMPLETED' && row.source !== 'BULK_IMPORT' && !heldIds.includes(row.id))
    .map((row) => ({ ...row }));
}

export const findAtsCandidate = (id: string) => {
  const row = rows.find((item) => item.id === id);
  return row ? { ...row } : undefined;
};

/** Portal kandidat selesai (§7.4.11 submit): ATS menjadi COMPLETED dengan consent AGREED. */
export function completeAtsCandidate(id: string, candidateName: string) {
  const row = rows.find((item) => item.id === id);
  if (!row) return;
  Object.assign(row, { atsStatus: 'COMPLETED', candidateName, consentStatus: 'AGREED', completedAt: new Date().toISOString(), tokenExpiresAt: null });
}

/** Baris NEW_JOINER dipakai saat materialisasi; batal ⇒ dihapus-lunak di backend (di sini dibuang). */
export function markAtsUsed(id: string, employeeId: string) {
  const row = rows.find((item) => item.id === id);
  if (row) Object.assign(row, { atsStatus: 'USED', usedEmployeeId: employeeId });
}

export function dropAtsCandidate(id: string) {
  rows = rows.filter((item) => item.id !== id);
}

export const hasWaitingInvite = (email: string) =>
  rows.some((row) => row.candidateEmail === email.trim().toLowerCase() && row.atsStatus === 'WAITING_CANDIDATE');

/** Sandi acak 20 karakter: besar, kecil, angka, simbol; tanpa 0 O o 1 l I; awal bukan simbol. */
function mailboxPassword(): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%^&*'];
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const all = sets.join('');
  const body = [pick(sets[0]), pick(sets[1]), pick(sets[2]), pick(sets[3])];
  while (body.length < 19) body.push(pick(all));
  return pick(sets[0] + sets[1]) + body.sort(() => crypto.getRandomValues(new Int8Array(1))[0]).join('');
}

export const atsBridgeService = {
  async search(filter: AtsFilter = {}): Promise<AtsCandidate[]> {
    if (MOCK) {
      await delay(150);
      const q = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !q || row.candidateEmail.includes(q) || row.candidateName?.toLowerCase().includes(q))
        .filter((row) => (!filter.status || row.atsStatus === filter.status) && (!filter.source || row.source === filter.source))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: AtsCandidate[] }>('/employee/ats-bridges/search', {
      keyword: filter.keyword || undefined,
      ats_status: filter.status,
      source: filter.source,
      sort_by: 'created_at',
      sort_direction: 'DESC',
    });
    return data.data;
  },

  async invite(email: string, requestorEmployeeId: string): Promise<AtsCandidate> {
    if (!EMAIL.test(email.trim())) throw new Error('422 EMP-VAL-242 — email kandidat tidak sah.');
    if (!requestorEmployeeId) throw new Error('422 EMP-VAL-005 — pemohon wajib dipilih.');
    if (MOCK) {
      await delay(350);
      if (hasWaitingInvite(email)) throw new Error('409 — email ini masih punya undangan yang menunggu; pakai Resend link.');
      return { ...inviteAtsCandidate('ATS', email, requestorEmployeeId, null) };
    }
    const { data } = await api.post<AtsCandidate>('/employee/ats-bridges', {
      candidate_email: email.trim(),
      requestor_employee_id: requestorEmployeeId,
    });
    return data;
  },

  async resendLink(id: string): Promise<AtsCandidate> {
    if (MOCK) {
      await delay(300);
      const row = find(id);
      if (row.atsStatus !== 'WAITING_CANDIDATE') throw new Error('409 — tautan hanya bisa dikirim ulang saat menunggu kandidat.');
      row.linkSentAt = new Date().toISOString();
      row.tokenExpiresAt = new Date(Date.now() + DAY).toISOString();
      row.linkSendCount += 1;
      return { ...row };
    }
    const { data } = await api.post<AtsCandidate>(`/employee/ats-bridges/${id}/resend-link`);
    return data;
  },

  async remove(role: AtsRole, id: string): Promise<void> {
    if (MOCK) {
      await delay(300);
      const row = find(id);
      if (role !== 'HR_MANAGER') throw new Error('403 — hanya HR Manager atau Super Admin yang boleh menghapus.');
      if (!canDelete(role, row)) throw new Error('409 — kandidat yang sudah menjadi karyawan tidak bisa dihapus.');
      rows = rows.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/employee/ats-bridges/${id}`);
  },

  /** Usulan isian materialisasi (`materialize_suggestion`) — username dari email. */
  suggestion(row: AtsCandidate, nikSequence: number) {
    const username = row.candidateEmail.split('@')[0].replace(/[^a-z0-9.]/g, '');
    return {
      username,
      nik: `NIK-${String(nikSequence).padStart(4, '0')}`,
      companyEmail: row.emailDomain ? `${username}@${row.emailDomain}` : '',
    };
  },

  async materialize(id: string, draft: MaterializeDraft, idempotencyKey: string): Promise<MaterializeResult> {
    if (MOCK) {
      await delay(500);
      const row = find(id);
      if (row.atsStatus === 'USED') throw new Error('409 — kandidat ini sudah menjadi karyawan.');
      if (!canMaterialize(row)) throw new Error('422 — hanya kandidat Bulk Import yang sudah Completed.');
      if (!draft.joinDate || !draft.jobGradeId || !draft.nik.trim() || !draft.companyEmail.trim()) {
        throw new Error('422 — lengkapi tanggal mulai, grade, NIK, dan email kantor.');
      }
      const employee = registerMaterializedEmployee({
        name: row.candidateName ?? row.candidateEmail,
        email: draft.companyEmail.trim().toLowerCase(),
        positionLabel: 'Staff — Kantor Pusat',
        jobGrade: labelOf(JOB_GRADE_OPTIONS, draft.jobGradeId),
        joinDate: draft.joinDate,
      });
      registerContactVerification({
        employeeId: employee.id,
        employeeName: employee.name,
        companyEmail: employee.email,
        phoneMasked: '+62 8**-****-****',
        joinDate: draft.joinDate,
      });
      row.atsStatus = 'USED';
      row.usedEmployeeId = employee.id;
      void idempotencyKey;
      return {
        employeeId: employee.id,
        username: draft.username.trim() || atsBridgeService.suggestion(row, 0).username,
        companyEmail: employee.email,
        mailboxInitialPassword: mailboxPassword(),
      };
    }
    const { data } = await api.post<MaterializeResult>(
      `/employee/ats-bridges/${id}/materialize`,
      {
        join_date: draft.joinDate,
        job_grade_id: draft.jobGradeId,
        nik: draft.nik.trim(),
        username: draft.username.trim() || undefined,
        company_email: draft.companyEmail.trim() || undefined,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data;
  },
};
