import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  MAX_PER_SEND,
  PHONE_PATTERN,
  canResend,
  type ActivationAccount,
  type ActivationFilter,
  type SendResult,
} from '@/features/bulk-activation/types';

/**
 * Service Bulk Account Activation (FSD-001-EMPLOYEE §9.1, kontrak TSD-001-AUTH):
 *   GET  /employees/bulk-activation?search=&invitation_status=&page=&size=
 *   POST /employees/bulk-activation/send   { employee_ids[], force_invalidate }
 *   PUT  /employees/bulk-activation/{id}   { email, phone_number } — simpan lalu kirim ulang
 *
 * Baris hilang hanya saat karyawan selesai membuat kata sandi pertama (`PENDING` → `ACTIVE`).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mock: undangan `SENDING` mendapat laporan kirim setelah jeda ini. */
const DELIVERY_MS = 4000;

const seed = (): (ActivationAccount & { sendingSince: number | null })[] => [
  { id: 'baa-01', name: 'Prasetyo Nugroho', username: 'prasetyo.nugroho', email: 'prasetyo.nugroho@ptdika.co.id', phoneNumber: '+628131000002', invitationStatus: 'NOT_SENT', failureReason: null, lastSentAt: null, sendingSince: null },
  { id: 'baa-02', name: 'Ayu Lestari', username: 'ayu.lestari', email: 'ayu.lestari@ptdika.co.id', phoneNumber: '+628131000003', invitationStatus: 'NOT_SENT', failureReason: null, lastSentAt: null, sendingSince: null },
  { id: 'baa-03', name: 'Bima Sakti', username: 'bima.sakti', email: 'bima.sakti@ptdika.co.id', phoneNumber: '+628131000004', invitationStatus: 'SENT', failureReason: null, lastSentAt: '2026-10-22T09:12:00+07:00', sendingSince: null },
  { id: 'baa-04', name: 'Citra Dewi', username: 'citra.dewi', email: 'citra.dewi@ptdika.co', phoneNumber: '+628131000005', invitationStatus: 'FAILED', failureReason: 'Mailbox does not exist (550).', lastSentAt: '2026-10-22T09:12:00+07:00', sendingSince: null },
  { id: 'baa-05', name: 'Dimas Pratama', username: 'dimas.pratama', email: 'dimas.pratama@ptdika.co.id', phoneNumber: '+628131000006', invitationStatus: 'EXPIRED', failureReason: null, lastSentAt: '2026-10-19T14:40:00+07:00', sendingSince: null },
  { id: 'baa-06', name: 'Eka Saputra', username: 'eka.saputra', email: 'eka.saputra@ptdika.co.id', phoneNumber: '+628131000007', invitationStatus: 'NOT_SENT', failureReason: null, lastSentAt: null, sendingSince: null },
  { id: 'baa-07', name: 'Fitri Handayani', username: 'fitri.handayani', email: 'fitri.handayani@ptdika.co.id', phoneNumber: '+628131000008', invitationStatus: 'SENT', failureReason: null, lastSentAt: '2026-10-23T08:05:00+07:00', sendingSince: null },
];

let mockRows = seed();

/** Dipakai pengujian supaya setiap berkas mulai dari dataset yang sama. */
export function resetBulkActivationMocks() {
  mockRows = seed();
}

/** Laporan kirim mock: email berakhiran domain tak dikenal gagal, sisanya terkirim. */
function settle(now = Date.now()) {
  for (const row of mockRows) {
    if (row.invitationStatus === 'SENDING' && row.sendingSince && now - row.sendingSince >= DELIVERY_MS) {
      const bounced = !row.email.endsWith('@ptdika.co.id');
      row.invitationStatus = bounced ? 'FAILED' : 'SENT';
      row.failureReason = bounced ? 'Mailbox does not exist (550).' : null;
      row.sendingSince = null;
    }
  }
}

function issue(row: (typeof mockRows)[number]) {
  row.invitationStatus = 'SENDING';
  row.failureReason = null;
  row.sendingSince = Date.now();
  row.lastSentAt = new Date().toISOString();
}

const strip = ({ sendingSince: _s, ...row }: (typeof mockRows)[number]): ActivationAccount => ({ ...row });

export const bulkActivationService = {
  async list(filter: ActivationFilter = {}): Promise<ActivationAccount[]> {
    if (MOCK) {
      await delay();
      settle();
      const words = (filter.search ?? '').trim().toLowerCase();
      return mockRows
        .filter((row) => {
          if (filter.status && row.invitationStatus !== filter.status) return false;
          if (!words) return true;
          return [row.name, row.email, row.username].some((value) => value.toLowerCase().includes(words));
        })
        .map(strip);
    }
    const { data } = await api.get<{ data: ActivationAccount[] }>('/employees/bulk-activation', {
      params: { search: filter.search || undefined, invitation_status: filter.status, page: 1, size: 100 },
    });
    return data.data;
  },

  /** Kirim (massal) atau kirim ulang (`force` = tautan lama dimatikan). */
  async send(ids: string[], force = false): Promise<SendResult> {
    if (ids.length > MAX_PER_SEND) {
      throw new Error(`422 — At most ${MAX_PER_SEND} accounts per send. Send the rest in the next round.`);
    }
    if (MOCK) {
      await delay(400);
      settle();
      const result: SendResult = { sent: 0, skipped: 0, results: [] };
      for (const id of ids) {
        const row = mockRows.find((item) => item.id === id);
        const skip = (reason: string) => {
          result.skipped += 1;
          result.results.push({ id, name: row?.name ?? id, reason });
        };
        if (!row) skip('This account is no longer waiting for activation.');
        else if (row.invitationStatus === 'SENDING') skip('An invitation is still being sent.');
        else if (!force && canResend(row.invitationStatus)) skip('An invitation was already sent. Use Resend.');
        else {
          issue(row);
          result.sent += 1;
        }
      }
      return result;
    }
    const { data } = await api.post<SendResult>('/employees/bulk-activation/send', {
      employee_ids: ids,
      force_invalidate: force,
    });
    return data;
  },

  /** Simpan email + HP undangan, lalu otomatis kirim ulang ke email baru. */
  async update(id: string, input: { email: string; phoneNumber: string }): Promise<ActivationAccount> {
    const email = input.email.trim();
    const phoneNumber = input.phoneNumber.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('422 — Enter a valid email address.');
    if (!PHONE_PATTERN.test(phoneNumber)) throw new Error('422 — Use +62 followed by 8–13 digits, without spaces.');
    if (MOCK) {
      await delay(400);
      const row = mockRows.find((item) => item.id === id);
      if (!row) throw new Error('422 — This account is no longer waiting for activation.');
      const taken = mockRows.some(
        (item) => item.id !== id && (item.email.toLowerCase() === email.toLowerCase() || item.phoneNumber === phoneNumber),
      );
      if (taken) throw new Error('409 — That email or phone number is already used by another employee.');
      row.email = email;
      row.phoneNumber = phoneNumber;
      issue(row);
      return strip(row);
    }
    const { data } = await api.put<ActivationAccount>(`/employees/bulk-activation/${id}`, {
      email,
      phone_number: phoneNumber,
    });
    return data;
  },
};
