/**
 * Unduhan slip gaji = berkas PDF (CATATAN 16 Okt 2026, estafet `2610141739-payroll`; UIC-PAYROLL 0.9 §5.3/§5.6):
 * `#41`/`#44` mengembalikan `application/pdf` + `Content-Disposition: attachment; filename="payslip-<month>-<year>.pdf"`.
 */
export interface DownloadedFile {
  fileName: string;
  blob: Blob;
}

/** Nama berkas dari header `Content-Disposition`; cadangan bila tak terbaca. */
export function fileNameFrom(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** `payslip-<english-month>-<year>.pdf` dari label periode «Oktober 2026» / «October 2026». */
export function payslipFileName(periodLabel: string): string {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const id = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const [word = '', year = ''] = periodLabel.toLowerCase().split(/\s+/);
  const index = Math.max(months.indexOf(word), id.indexOf(word));
  return `payslip-${index >= 0 ? months[index] : word || 'period'}-${year || 'unknown'}.pdf`;
}

/** Mode dummy: PDF satu halaman berisi baris teks — pengganti berkas dari payroll-service. */
export function textPdf(lines: string[]): Blob {
  const escape = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '?');
  const stream = ['BT', '/F1 11 Tf', '50 790 Td', '14 TL', ...lines.map((line) => `(${escape(line)}) Tj T*`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
}

/** Simpan berkas lewat tautan sementara (peramban). */
export function saveFile({ fileName, blob }: DownloadedFile) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
