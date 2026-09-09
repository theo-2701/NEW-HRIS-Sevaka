---
name: scaffold-feature
description: Membuat kerangka modul fitur baru sesuai standar Sevaka UI. Aktif saat pengguna menulis "scaffold feature <nama-fitur>".
---

# Scaffold Feature

Membuat kerangka modul di `src/features/<nama-fitur>/` sesuai anatomi wajib repo.
Nama fitur memakai kebab-case (`leave-management`), folder lowercase, file di luar
`components/ui` PascalCase.

## Yang dibuat

```
src/features/<nama-fitur>/
├─ types.ts                              # entitas, enum status, payload
├─ validation.ts                         # skema Yup
├─ services/<nama-fitur>.service.ts      # API layer + blok MOCK
├─ hooks/use<NamaFitur>.ts               # React Query (keys, query, mutation)
├─ components/<NamaFitur>Table.tsx       # komponen modul (opsional saat scaffold)
└─ pages/<NamaFitur>Page.tsx             # halaman yang dipasang di router
```

## Template

**types.ts**
```ts
export type <NamaFitur>Status = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface <NamaFitur> {
  id: string;
  code: string;
  status: <NamaFitur>Status;
  createdAt: string;
}

export interface <NamaFitur>Payload {
  code: string;
}
```

**validation.ts**
```ts
import * as Yup from 'yup';

export const <namaFitur>Schema = Yup.object({
  code: Yup.string().required('Kode wajib diisi.'),
});
```

**services/<nama-fitur>.service.ts**
```ts
import { api } from '@/services/api';
import type { <NamaFitur>, <NamaFitur>Payload } from '@/features/<nama-fitur>/types';

const MOCK = !import.meta.env.VITE_API_BASE_URL;
const MOCK_ROWS: <NamaFitur>[] = [];

export const <namaFitur>Service = {
  async list(): Promise<<NamaFitur>[]> {
    if (MOCK) return MOCK_ROWS;
    const { data } = await api.get<<NamaFitur>[]>('/<nama-fitur>');
    return data;
  },
  async create(payload: <NamaFitur>Payload): Promise<void> {
    if (MOCK) return;
    await api.post('/<nama-fitur>', payload);
  },
};
```

**hooks/use<NamaFitur>.ts**
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { <namaFitur>Service } from '@/features/<nama-fitur>/services/<nama-fitur>.service';
import { toast } from '@/store/ui.store';

export const <namaFitur>Keys = { list: ['<nama-fitur>', 'list'] as const };

export function use<NamaFitur>List() {
  return useQuery({ queryKey: <namaFitur>Keys.list, queryFn: () => <namaFitur>Service.list() });
}

export function useCreate<NamaFitur>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: <namaFitur>Service.create,
    onSuccess: () => {
      toast('Data tersimpan.', 'ok');
      queryClient.invalidateQueries({ queryKey: <namaFitur>Keys.list });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
```

**pages/<NamaFitur>Page.tsx**
```tsx
import { PageShell } from '@/components/PageShell';
import { DataTable } from '@/components/DataTable';
import { use<NamaFitur>List } from '@/features/<nama-fitur>/hooks/use<NamaFitur>';

export function <NamaFitur>Page() {
  const { data = [], isLoading } = use<NamaFitur>List();

  return (
    <PageShell crumbs={[{ label: '<Modul>' }, { label: '<Nama Fitur>' }]} title="<Nama Fitur>">
      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(row) => row.id}
        columns={[{ key: 'code', header: 'Kode', render: (row) => row.code }]}
      />
    </PageShell>
  );
}
```

## Setelah scaffold

1. Daftarkan halaman di `src/app/routes.tsx` (`IMPLEMENTED` + `IMPLEMENTED_PATHS`).
2. Ubah `status` leaf terkait di `src/config/nav.ts` jadi `'done'`.
3. Regenerasi `docs/PAGE-INVENTORY.md`.
4. `npm run lint`.
