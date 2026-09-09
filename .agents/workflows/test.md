# /test — pedoman pengujian (Vitest)

Gunakan saat membuat atau menjalankan test. Jangan pakai workflow ini kalau tidak
benar-benar membuat/menjalankan test.

## Perkakas

Vitest + Testing Library (`@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`), lingkungan `jsdom`. Setup global:
`src/test/setup.ts`.

```bash
npm run test         # sekali jalan
npm run test:watch   # mode watch
```

## Letak file

Test berdampingan dengan kode yang diuji:

```
features/payroll/validation.ts        → features/payroll/validation.test.ts
components/DataTable.tsx              → components/DataTable.test.tsx
```

## Apa yang diuji (prioritas)

1. **Skema Yup** — kasus valid, kasus wajib kosong, kasus format salah. Murni
   fungsi, paling murah, paling sering menangkap bug kontrak.
2. **Fungsi util** — `src/lib/format.ts` (rupiah, tanggal, masking, countdown).
3. **Komponen rumah** — `DataTable` (freeze aktif hanya saat ada `actions`, header
   Action kosong, empty state), `Pagination` (batas halaman, teks "Showing"),
   `Modal` (footer, tombol tutup).
4. **Alur fitur kritis** — submit form memanggil service dengan payload benar;
   status maker/checker (DRAFT → SUBMITTED) tidak melompat.

Yang **tidak** perlu diuji: styling, markup ShadCN bawaan, dan detail visual.

## Aturan penulisan

- Query berbasis peran/label (`getByRole`, `getByLabelText`), bukan class CSS.
- Interaksi memakai `userEvent`, bukan `fireEvent`.
- Mock di batas service (`vi.mock('@/features/x/services/x.service')`), jangan mock
  axios per-request.
- Komponen yang memakai React Query dibungkus `QueryClientProvider` dengan
  `retry: false`; komponen yang memakai router dibungkus `MemoryRouter`.
- Satu `expect` bermakna per perilaku; nama test menjelaskan perilaku, bukan
  implementasi.

## Contoh

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '@/components/Pagination';

it('menonaktifkan tombol sebelumnya di halaman pertama', async () => {
  const onPageChange = vi.fn();
  render(
    <Pagination page={1} pageSize={10} total={42} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />,
  );

  expect(screen.getByText('Showing 1–10 of 42 data')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Halaman sebelumnya' }));
  expect(onPageChange).not.toHaveBeenCalled();
});
```

## Sebelum selesai

```bash
npm run test
npm run lint
```
Test yang gagal tidak boleh di-skip untuk "diperbaiki nanti" — perbaiki atau hapus
dengan alasan yang jelas.
