import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CONTACT_VERIFICATIONS } from '@/features/contact-verification/mock-data';
import { MAX_SELECTION, isPending } from '@/features/contact-verification/types';
import type {
  CancelReason,
  ContactKind,
  ContactVerification,
  QueueFilter,
  SendResult,
  SkipReason,
} from '@/features/contact-verification/types';

/**
 * Endpoint kontrak (prefiks `/employee`):
 *   POST /contact-verifications/search · /send-email-links · /send-phone-links   (§7.20)
 *   POST /contact-verification-portal/confirm  (publik, header X-Verification-Token)
 *   POST /employees/{id}/access-cancellation                                      (§7.21)
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const DAY = 24 * 60 * 60 * 1000;

let rows: ContactVerification[] = CONTACT_VERIFICATIONS.map((row) => ({ ...row }));
/** Token → baris + saluran. Backend hanya menyimpan SHA-256-nya; kirim ulang mematikan token lama. */
let tokens = new Map<string, { id: string; kind: ContactKind; expiresAt: number }>();
/** Mock saja: tautan terakhir per baris × saluran, supaya alur publik bisa dicoba. */
let demoLinks = new Map<string, string>();

export function resetContactVerificationMocks() {
  rows = CONTACT_VERIFICATIONS.map((row) => ({ ...row }));
  tokens = new Map();
  demoLinks = new Map();
}

const field = (kind: ContactKind) => (kind === 'EMAIL' ? 'emailStatus' : 'phoneStatus');
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Koneksi antar modul (tanpa API): materialisasi (New Joiner / ATS Bridge) mendaftarkan
 * karyawan ke antrean verifikasi dalam transaksi yang sama (§7.20, `register`).
 */
export function registerContactVerification(input: {
  employeeId: string;
  employeeName: string;
  companyEmail: string | null;
  phoneMasked: string | null;
  joinDate: string;
}) {
  if (!input.companyEmail && !input.phoneMasked) return;
  rows = [
    {
      id: `cv-${crypto.randomUUID().slice(0, 6)}`,
      ...input,
      emailStatus: input.companyEmail ? 'NOT_SENT' : 'NOT_REQUIRED',
      phoneStatus: input.phoneMasked ? 'NOT_SENT' : 'NOT_REQUIRED',
    },
    ...rows,
  ];
}

export const contactVerificationService = {
  /** Hanya baris terbuka; email kantor utuh, nomor selalu ter-mask. */
  async search(filter: { keyword?: string; status?: QueueFilter } = {}): Promise<ContactVerification[]> {
    if (MOCK) {
      await delay(150);
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !keyword || row.employeeName.toLowerCase().includes(keyword) || row.companyEmail?.includes(keyword))
        .filter((row) =>
          filter.status === 'EMAIL_PENDING'
            ? isPending(row.emailStatus)
            : filter.status === 'PHONE_PENDING'
              ? isPending(row.phoneStatus)
              : true,
        )
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: ContactVerification[] }>('/employee/contact-verifications/search', {
      keyword: filter.keyword || undefined,
      status: filter.status ?? 'ALL',
    });
    return data.data;
  },

  /** Kirim/kirim ulang tautan 24 jam ke 1..50 baris; yang tak memenuhi syarat dilewati dengan alasan. */
  async sendLinks(kind: ContactKind, ids: string[]): Promise<SendResult> {
    if (!ids.length || ids.length > MAX_SELECTION || new Set(ids).size !== ids.length) {
      throw new Error(`422 EMP-VAL-661 — pilih 1 sampai ${MAX_SELECTION} baris tanpa duplikat.`);
    }
    if (MOCK) {
      await delay(400);
      const results = ids.map((id) => {
        const row = rows.find((item) => item.id === id);
        const status = row?.[field(kind)];
        let reason: SkipReason | null = null;
        if (!row) reason = 'NOT_FOUND_OR_CLOSED';
        else if (status === 'NOT_REQUIRED') reason = kind === 'EMAIL' ? 'NO_COMPANY_EMAIL' : 'NO_PHONE';
        else if (status === 'VERIFIED') reason = 'ALREADY_VERIFIED';
        if (reason || !row) return { id, status: 'SKIPPED' as const, reason };
        // Token lama untuk saluran ini mati seketika.
        tokens.forEach((value, key) => value.id === id && value.kind === kind && tokens.delete(key));
        const token = randomToken();
        tokens.set(token, { id, kind, expiresAt: Date.now() + DAY });
        demoLinks.set(`${id}:${kind}`, `/contact-verification/PTDIKA#t=${token}`);
        row[field(kind)] = 'LINK_SENT';
        return { id, status: 'SENT' as const, reason: null };
      });
      const sent = results.filter((row) => row.status === 'SENT').length;
      return { results, sent, skipped: results.length - sent };
    }
    const path = kind === 'EMAIL' ? 'send-email-links' : 'send-phone-links';
    const { data } = await api.post<SendResult>(`/employee/contact-verifications/${path}`, { ids });
    return data;
  },

  demoLink(id: string, kind: ContactKind): string | undefined {
    return demoLinks.get(`${id}:${kind}`);
  },

  /** Halaman publik — token sekali pakai; galat seragam 404 (anti-enumerasi). */
  async confirm(token: string): Promise<{ kind: ContactKind; allVerified: boolean }> {
    if (MOCK) {
      await delay(400);
      const entry = tokens.get(token);
      const row = entry && rows.find((item) => item.id === entry.id);
      if (!entry || !row) throw new Error('404 EMP-NFD-546 — tautan tidak dikenali atau sudah dipakai.');
      if (entry.expiresAt < Date.now()) {
        row[field(entry.kind)] = 'LINK_EXPIRED';
        throw new Error('410 EMP-BIZ-668 — tautan sudah kedaluwarsa. Minta HR mengirim ulang.');
      }
      tokens.delete(token);
      row[field(entry.kind)] = 'VERIFIED';
      const allVerified = !isPending(row.emailStatus) && !isPending(row.phoneStatus);
      // Dua saluran tuntas ⇒ baris ditutup VERIFIED dan hilang dari antrean.
      if (allVerified) rows = rows.filter((item) => item.id !== row.id);
      return { kind: entry.kind, allVerified };
    }
    const { data } = await api.post<{ kind: ContactKind; all_verified: boolean }>(
      '/employee/contact-verification-portal/confirm',
      undefined,
      { headers: { 'X-Verification-Token': token } },
    );
    return { kind: data.kind, allVerified: data.all_verified };
  },

  /**
   * §7.21: cabut akses login seketika + transisi OFFBOARDING `CANCELLED_BEFORE_START`
   * lahir IN_APPROVAL; baris antrean ditutup ACCESS_CANCELLED dan tautannya mati.
   */
  async cancelAccess(row: ContactVerification, reasonCode: CancelReason | '', reasonText: string) {
    const text = reasonText.trim();
    if (!reasonCode) throw new Error('422 EMP-VAL-642 — pilih alasan pembatalan.');
    if (reasonCode === 'OTHER' && !text) throw new Error('422 EMP-VAL-643 — tulis alasannya bila memilih Other.');
    if (text.length > 500) throw new Error('422 EMP-VAL-643 — alasan maksimal 500 karakter.');
    if (MOCK) {
      await delay(400);
      if (!rows.some((item) => item.id === row.id)) throw new Error('404 EMP-NFD-641 — karyawan tidak ditemukan.');
      tokens.forEach((value, key) => value.id === row.id && tokens.delete(key));
      rows = rows.filter((item) => item.id !== row.id);
      const today = new Date().toISOString().slice(0, 10);
      return { transitionId: `tr-${crypto.randomUUID().slice(0, 6)}`, effectiveDate: row.joinDate > today ? row.joinDate : today };
    }
    const { data } = await api.post<{ transition_id: string; effective_date: string }>(
      `/employee/employees/${row.employeeId}/access-cancellation`,
      { reason_code: reasonCode, reason_text: text || undefined },
    );
    return { transitionId: data.transition_id, effectiveDate: data.effective_date };
  },
};
