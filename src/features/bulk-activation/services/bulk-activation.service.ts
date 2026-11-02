import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { PENDING_ACCOUNTS } from '@/features/bulk-activation/mock-data';
import { MAX_SEND, PHONE_PATTERN } from '@/features/bulk-activation/types';
import type { InvitationStatus, PendingAccount, SendSummary } from '@/features/bulk-activation/types';

/**
 * Endpoint kontrak (auth-service, TSD-001-AUTH 0.167 §14.2.1):
 *   GET  /employees/bulk-activation?search&invitation_status
 *   PUT  /employees/bulk-activation/{id}          (ubah email/HP lalu kirim ulang otomatis)
 *   POST /employees/bulk-activation/send          (Send / Resend, maks 500 id)
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const INVITE_TTL = 3 * 24 * 60 * 60 * 1000;
/** Mock: kabar `notification.delivered/failed` tiba sesudah jeda ini. */
const DELIVERY_MS = 2500;

let rows: PendingAccount[] = PENDING_ACCOUNTS.map((row) => ({ ...row }));

export function resetBulkActivationMocks() {
  rows = PENDING_ACCOUNTS.map((row) => ({ ...row }));
}

const normalizePhone = (value: string) => value.trim().replace(/^0/, '+62');
const looksDeliverable = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

/** Terbitkan undangan baru: SENDING dulu, lalu terkirim/gagal menurut kabar notifikasi. */
function issue(row: PendingAccount) {
  const now = Date.now();
  Object.assign(row, {
    invitationStatus: 'SENDING' as InvitationStatus,
    invitationSentAt: new Date(now).toISOString(),
    invitationExpiredAt: new Date(now + INVITE_TTL).toISOString(),
    failureReason: null,
  });
  setTimeout(() => {
    if (row.invitationStatus !== 'SENDING') return;
    const ok = looksDeliverable(row.email);
    row.invitationStatus = ok ? 'SENT' : 'FAILED';
    row.failureReason = ok ? null : 'Mailbox does not exist';
  }, DELIVERY_MS);
}

export const bulkActivationService = {
  async list(filter: { search?: string; status?: InvitationStatus } = {}): Promise<PendingAccount[]> {
    if (MOCK) {
      await delay(150);
      const q = filter.search?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !q || [row.name, row.email, row.username].some((value) => value.toLowerCase().includes(q)))
        .filter((row) => !filter.status || row.invitationStatus === filter.status)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ data: PendingAccount[] }>('/employees/bulk-activation', {
      params: { search: filter.search || undefined, invitation_status: filter.status, size: 100 },
    });
    return data.data;
  },

  /** Send (`force=false`) melewati undangan aktif yang masih berlaku; Resend membatalkannya. */
  async send(ids: string[], force: boolean): Promise<SendSummary> {
    if (!ids.length || ids.length > MAX_SEND) throw new Error(`422 — pilih 1 sampai ${MAX_SEND} akun.`);
    if (MOCK) {
      await delay(400);
      const results = ids.map((employeeId) => {
        const row = rows.find((item) => item.employeeId === employeeId);
        if (!row) return { employeeId, status: 'SKIPPED' as const, reason: 'Account not found' };
        const stillValid = row.invitationStatus === 'SENT' || row.invitationStatus === 'SENDING';
        if (!force && stillValid) {
          return { employeeId, status: 'SKIPPED' as const, reason: 'An active invitation is still valid — use Resend' };
        }
        issue(row);
        return { employeeId, status: 'SENT' as const, reason: null };
      });
      const sent = results.filter((row) => row.status === 'SENT').length;
      return { total: results.length, sent, skipped: results.length - sent, results };
    }
    const { data } = await api.post<SendSummary>(
      '/employees/bulk-activation/send',
      { employee_ids: ids, force_invalidate: force },
      { timeout: 60_000 },
    );
    return data;
  },

  /** Ubah email + nomor lalu kirim ulang otomatis; kembar milik pegawai lain ⇒ 409. */
  async update(employeeId: string, email: string, phoneNumber: string): Promise<PendingAccount> {
    const cleanEmail = email.trim().toLowerCase();
    const phone = phoneNumber.trim();
    if (!looksDeliverable(cleanEmail)) throw new Error('422 — format email tidak sah.');
    if (!PHONE_PATTERN.test(phone)) throw new Error('422 — nomor HP harus diawali +62 8 atau 08.');
    if (MOCK) {
      await delay(400);
      const row = rows.find((item) => item.employeeId === employeeId);
      if (!row) throw new Error('404 — akun tidak ditemukan.');
      const clash = rows.some(
        (item) => item.employeeId !== employeeId && (item.email === cleanEmail || item.phoneNumber === normalizePhone(phone)),
      );
      if (clash) throw new Error('409 — email atau nomor HP sudah dipakai pegawai lain.');
      row.email = cleanEmail;
      row.phoneNumber = normalizePhone(phone);
      issue(row);
      return { ...row };
    }
    const { data } = await api.put<PendingAccount>(
      `/employees/bulk-activation/${employeeId}`,
      { email: cleanEmail, phone_number: phone },
      { timeout: 60_000 },
    );
    return data;
  },
};
