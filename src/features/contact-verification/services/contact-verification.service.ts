import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { startOffboardingForCancelledAccess } from '@/features/transitions/services/transition.service';
import { CANCEL_REASON_LABEL, MAX_PER_SEND, canSend } from '@/features/contact-verification/types';
import type {
  CancelReason,
  Channel,
  ContactVerification,
  SendResult,
  VerificationShow,
} from '@/features/contact-verification/types';

/**
 * API service Email and Phone Verification (TSD-001-EMPLOYEE 0.192 §7.20–7.21):
 *   POST /contact-verifications/search             — CV1, hanya baris terbuka, terbaru dulu
 *   POST /contact-verifications/send-email-links   — CV2, 1..50 karyawan; tautan lama mati
 *   POST /contact-verifications/send-phone-links   — CV3, WhatsApp, 1..50 karyawan
 *   POST /contact-verification-portal/confirm      — publik, header `X-Verification-Token`
 *   POST /employees/{id}/access-cancellation       — §7.21, offboarding CANCELLED_BEFORE_START
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const DAY = 24 * 60 * 60 * 1000;

interface Stored extends ContactVerification {
  emailToken: string | null;
  phoneToken: string | null;
}

const maskPhone = (phone: string) => (phone.length > 7 ? `${phone.slice(0, 4)}${'*'.repeat(phone.length - 7)}${phone.slice(-3)}` : phone);

const seed = (input: Partial<Stored> & Pick<Stored, 'id' | 'employeeId' | 'name' | 'nik' | 'username' | 'companyEmail'>): Stored => ({
  phoneMasked: '+628*******890',
  emailStatus: 'NOT_SENT',
  emailExpiresAt: null,
  phoneStatus: 'NOT_SENT',
  phoneExpiresAt: null,
  createdAt: '2026-10-22T09:00:00+07:00',
  emailToken: null,
  phoneToken: null,
  ...input,
});

let rows: Stored[] = [
  seed({ id: 'cv-1', employeeId: 'emp-fajar', name: 'Fajar Nugroho', nik: 'NIK-0040', username: 'fajar.nugroho', companyEmail: 'fajar.nugroho@ptdika.co.id', phoneMasked: '+628*******421', createdAt: '2026-10-23T10:00:00+07:00' }),
  seed({
    id: 'cv-2',
    employeeId: 'emp-bagus',
    name: 'Bagus Wicaksono',
    nik: 'NIK-0021',
    username: 'bagus.w',
    companyEmail: 'bagus.w@ptdika.co.id',
    emailStatus: 'SENT',
    emailExpiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    emailToken: 'demo-bagus-email',
    phoneStatus: 'VERIFIED',
    createdAt: '2026-10-22T13:00:00+07:00',
  }),
  seed({
    id: 'cv-3',
    employeeId: 'emp-nj-demo',
    name: 'Siti Rahayu',
    nik: 'NIK-0112',
    username: 'siti.rahayu',
    companyEmail: 'siti.rahayu@ptdika.co.id',
    emailStatus: 'VERIFIED',
    phoneStatus: 'EXPIRED',
    phoneExpiresAt: '2026-10-21T09:00:00+07:00',
    createdAt: '2026-10-20T09:00:00+07:00',
  }),
];

/** Baris hilang bila email DAN nomor HP sudah terbukti (atau nomor memang tidak ada). */
const open = (row: Stored) => canSend(row.emailStatus) || canSend(row.phoneStatus);
const strip = ({ emailToken: _e, phoneToken: _p, ...rest }: Stored): ContactVerification => ({ ...rest });

/** Tautan kedaluwarsa dibaca sebagai EXPIRED (server menghitungnya saat membaca). */
function expire(row: Stored) {
  const now = Date.now();
  if (row.emailStatus === 'SENT' && row.emailExpiresAt && Date.parse(row.emailExpiresAt) < now) row.emailStatus = 'EXPIRED';
  if (row.phoneStatus === 'SENT' && row.phoneExpiresAt && Date.parse(row.phoneExpiresAt) < now) row.phoneStatus = 'EXPIRED';
}

/**
 * Koneksi antar modul: materialisasi New Joiner / Create Employee ATS memasukkan karyawan ke antrean
 * dengan kedua saluran "Link not sent" (§14.2 langkah 1).
 */
export function queueContactVerification(input: {
  employeeId: string;
  name: string;
  nik: string;
  username: string;
  companyEmail: string;
  phone: string;
}) {
  rows = [
    seed({
      id: `cv-${input.employeeId}`,
      employeeId: input.employeeId,
      name: input.name,
      nik: input.nik,
      username: input.username,
      companyEmail: input.companyEmail,
      phoneMasked: input.phone ? maskPhone(input.phone) : '—',
      phoneStatus: input.phone ? 'NOT_SENT' : 'NOT_APPLICABLE',
      createdAt: new Date().toISOString(),
    }),
    ...rows.filter((row) => row.employeeId !== input.employeeId),
  ];
}

/** Mode dummy: tautan pratinjau halaman publik — di produksi hanya ada di email / WhatsApp pemiliknya. */
export function previewVerificationLink(id: string, channel: Channel, companyCode = 'DIKA'): string | null {
  const row = rows.find((item) => item.id === id);
  const token = channel === 'EMAIL' ? row?.emailToken : row?.phoneToken;
  return token ? `/contact-verification/${companyCode}#t=${token}` : null;
}

export const contactVerificationService = {
  async search(filter: { keyword?: string; show?: VerificationShow } = {}): Promise<ContactVerification[]> {
    if (MOCK) {
      await delay();
      rows.forEach(expire);
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter(open)
        .filter((row) => !keyword || `${row.name} ${row.nik} ${row.username} ${row.companyEmail}`.toLowerCase().includes(keyword))
        .filter((row) => filter.show !== 'EMAIL_PENDING' || row.emailStatus !== 'VERIFIED')
        .filter((row) => filter.show !== 'PHONE_PENDING' || canSend(row.phoneStatus))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(strip);
    }
    const { data } = await api.post<{ data: ContactVerification[] }>('/employee/contact-verifications/search', {
      keyword: filter.keyword || undefined,
      status: filter.show ?? 'ALL',
      page: 1,
      size: 100,
    });
    return data.data;
  },

  async send(channel: Channel, ids: string[]): Promise<SendResult> {
    if (ids.length < 1 || ids.length > MAX_PER_SEND) throw new Error(`422 — Send to 1–${MAX_PER_SEND} employees at a time.`);
    if (MOCK) {
      await delay(400);
      const result: SendResult = { sent: 0, skipped: [] };
      for (const id of ids) {
        const row = rows.find((item) => item.id === id);
        if (!row) continue;
        const status = channel === 'EMAIL' ? row.emailStatus : row.phoneStatus;
        if (!canSend(status)) {
          result.skipped.push({ id, name: row.name, reason: status === 'VERIFIED' ? 'Already verified.' : 'No address to verify.' });
          continue;
        }
        const token = crypto.randomUUID().replace(/-/g, '');
        const expiresAt = new Date(Date.now() + DAY).toISOString();
        if (channel === 'EMAIL') Object.assign(row, { emailStatus: 'SENT', emailExpiresAt: expiresAt, emailToken: token });
        else Object.assign(row, { phoneStatus: 'SENT', phoneExpiresAt: expiresAt, phoneToken: token });
        result.sent += 1;
      }
      return result;
    }
    const path = channel === 'EMAIL' ? 'send-email-links' : 'send-phone-links';
    const { data } = await api.post<SendResult>(`/employee/contact-verifications/${path}`, { ids });
    return data;
  },

  async cancelAccess(id: string, reason: CancelReason, details: string): Promise<void> {
    if (reason === 'OTHER' && !details.trim()) throw new Error('422 — Enter the details when the reason is Other.');
    if (details.length > 500) throw new Error('422 — The details are at most 500 characters.');
    if (MOCK) {
      await delay(400);
      const row = rows.find((item) => item.id === id);
      if (!row) throw new Error('404 — Employee not found in the verification queue.');
      startOffboardingForCancelledAccess({ name: row.name, reasonLabel: CANCEL_REASON_LABEL[reason] });
      rows = rows.filter((item) => item.id !== id);
      return;
    }
    await api.post(`/employee/employees/${id}/access-cancellation`, { reason_code: reason, reason_text: details.trim() || undefined });
  },

  /** Halaman publik: verifikasi hanya saat pemilik menekan "Verify now" (pemindai tautan tidak boleh memverifikasi). */
  async confirm(token: string): Promise<{ kind: Channel; value: string; allVerified: boolean }> {
    if (MOCK) {
      await delay(500);
      const row = rows.find((item) => item.emailToken === token || item.phoneToken === token);
      if (!row) throw new Error('404');
      const kind: Channel = row.emailToken === token ? 'EMAIL' : 'PHONE';
      const expiresAt = kind === 'EMAIL' ? row.emailExpiresAt : row.phoneExpiresAt;
      if (expiresAt && Date.parse(expiresAt) < Date.now()) throw new Error('410');
      if (kind === 'EMAIL') Object.assign(row, { emailStatus: 'VERIFIED', emailToken: null });
      else Object.assign(row, { phoneStatus: 'VERIFIED', phoneToken: null });
      return {
        kind,
        value: kind === 'EMAIL' ? row.companyEmail : row.phoneMasked,
        allVerified: row.emailStatus === 'VERIFIED' && !canSend(row.phoneStatus),
      };
    }
    const { data } = await api.post('/employee/contact-verification-portal/confirm', {}, { headers: { 'X-Verification-Token': token } });
    return data;
  },
};
