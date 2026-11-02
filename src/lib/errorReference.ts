/**
 * Galat terlacak (CATATAN-PERUBAHAN 18 Okt 2026 LNT-2610141244 T16): setiap galat
 * berkode meninggalkan rujukan "Error code" + "Trace ID" yang bisa disalin untuk tim
 * dukungan. Kode hanya ditampilkan/disalin — TIDAK pernah dipakai percabangan.
 */
export interface ErrorReference {
  errorCode?: string;
  traceId?: string;
}

const CODE = /\b([A-Z]{2,4}-[A-Z]{3}-\d{3})\b/;

/** 32 heksa — bentuk `x-b3-traceid` yang dikirim peramban di tiap permintaan. */
export const newTraceId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

let last: { ref: ErrorReference; at: number } | null = null;

/** Diisi interceptor API untuk galat yang membawa `error_code`/`trace_id`. */
export function rememberErrorReference(ref: ErrorReference) {
  last = { ref, at: Date.now() };
}

/** Rujukan untuk pesan galat: dari galat API terakhir (≤3 detik, sekali pakai), atau kode di pesan. */
export function referenceFor(message: string): ErrorReference | undefined {
  const recent = last && Date.now() - last.at <= 3000 ? last.ref : undefined;
  last = null;
  const errorCode = recent?.errorCode ?? message.match(CODE)?.[1];
  if (!errorCode && !recent?.traceId) return undefined;
  // Mode dummy tidak punya server: trace id dibangkitkan seperti header peramban.
  return { errorCode, traceId: recent?.traceId ?? newTraceId() };
}

export const referenceText = (ref: ErrorReference) =>
  [ref.errorCode && `Error code: ${ref.errorCode}`, ref.traceId && `Trace ID: ${ref.traceId}`].filter(Boolean).join('\n');
