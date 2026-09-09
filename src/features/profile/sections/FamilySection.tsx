import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import { Info, PhoneCall, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { PanelActionButton, RowActions } from '@/components/RowActions';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { ToggleField } from '@/components/form/ToggleField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Code,
  Empty,
  EndpointChip,
  GapLegend,
  Note,
  SectionCard,
  Tag,
  monoClass,
} from '@/features/profile/components/ProfileBits';
import { useDeleteRelative, useSaveRelative } from '@/features/profile/hooks/useProfile';
import { relativeSchema } from '@/features/profile/validation';
import { RELATIONSHIP_OPTIONS, RELATIVE_JOB_OPTIONS, labelOf } from '@/features/profile/types';
import type { Relative, RelationshipType } from '@/features/profile/types';
import { formatDate } from '@/lib/format';
import { usePagedRows } from '@/hooks/usePagedRows';

const EMPTY_RELATIVE: Relative = {
  id: '',
  name: '',
  relationshipType: 'SPOUSE',
  phoneNumber: '',
  email: '',
  dateOfBirth: '',
  jobId: '',
  address: '',
  isEmergencyContact: false,
};

/** Form tambah/ubah anggota keluarga — `mst_relative`. Dipakai juga dari Emergency Contact. */
export function RelativeFormModal({ relative, onClose }: { relative: Relative | null; onClose: () => void }) {
  const save = useSaveRelative();
  const isEdit = Boolean(relative?.id);

  return (
    <Formik
      initialValues={relative ?? EMPTY_RELATIVE}
      validationSchema={relativeSchema}
      enableReinitialize
      onSubmit={(values) => save.mutate(values, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(relative)}
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title={isEdit ? 'Edit Family Member' : 'Add Family Member'}
          description="Nama, hubungan, dan nomor telepon adalah field minimum yang wajib diisi."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={save.isPending}>
                {save.isPending ? 'Menyimpan…' : 'Save'}
              </Button>
            </>
          }
        >
          <Form className="grid gap-4 md:grid-cols-2">
            <TextField name="name" label="Nama" required containerClassName="md:col-span-2" />
            <SelectField name="relationshipType" label="Hubungan" required options={RELATIONSHIP_OPTIONS} />
            <TextField name="phoneNumber" label="Nomor telepon" required placeholder="0812…" />
            <TextField name="email" type="email" label="Email" placeholder="nama@mail.com" />
            <TextField name="dateOfBirth" type="date" label="Tanggal lahir" />
            <SelectField
              name="jobId"
              label="Pekerjaan"
              placeholder="Pilih pekerjaan"
              options={RELATIVE_JOB_OPTIONS}
            />
            <TextAreaField
              name="address"
              label="Alamat"
              hint="Tanpa kolom padanan di mst_relative (tambahan yang ditandai)."
              containerClassName="md:col-span-2"
            />
            <ToggleField
              name="isEmergencyContact"
              label="Jadikan kontak darurat"
              hint="Anggota keluarga yang ditandai akan muncul di menu Emergency Contact."
              className="md:col-span-2"
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

export function FamilySection({ relatives }: { relatives: Relative[] }) {
  const [query, setQuery] = useState('');
  const [relFilter, setRelFilter] = useState<RelationshipType | 'ALL'>('ALL');
  const [editing, setEditing] = useState<Relative | null>(null);
  const [deleting, setDeleting] = useState<Relative | null>(null);
  const remove = useDeleteRelative();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return relatives.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q)) && (relFilter === 'ALL' || r.relationshipType === relFilter),
    );
  }, [relatives, query, relFilter]);

  const paged = usePagedRows(filtered);

  return (
    <>
      <SectionCard
        icon={<Users />}
        title="Family"
        description={
          <>
            Keluarga &amp; tanggungan · <Code>mst_relative</Code> · CRUD soft-delete
          </>
        }
        endpoint={<EndpointChip method="POST" path="/employee-relatives" />}
        action={
          <PanelActionButton onClick={() => setEditing(EMPTY_RELATIVE)}>Add Family Member</PanelActionButton>
        }
      >
        {/* Toolbar + tabel + paginasi = satu blok; gap induk tidak boleh menyisip. */}
        <div className="flex flex-col">
          {/* ≤ 2 filter → kontrol inline, tanpa modal filter (standar toolbar). */}
          <TableToolbar
            filters={
              <Select
                value={relFilter}
                onValueChange={(value) => {
                  setRelFilter(value as RelationshipType | 'ALL');
                  paged.resetPage();
                }}
              >
                <SelectTrigger className="h-10 w-[210px]">
                  <SelectValue placeholder="Semua hubungan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua hubungan</SelectItem>
                  {RELATIONSHIP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            search={{
              value: query,
              onChange: (value) => {
                setQuery(value);
                paged.resetPage();
              },
              placeholder: 'Cari nama…',
            }}
          />

          <DataTable<Relative>
            rows={paged.rows}
            rowKey={(row) => row.id}
            empty={
              query || relFilter !== 'ALL'
                ? 'Tidak ada anggota keluarga yang cocok dengan pencarian atau filter.'
                : 'Belum ada anggota keluarga. Pakai "Add Family Member" untuk mendaftarkan.'
            }
            columns={[
              {
                key: 'name',
                header: 'Nama',
                strong: true,
                render: (row) => row.name,
              },
              {
                key: 'relationship',
                header: 'Hubungan',
                render: (row) => <Tag>{labelOf(RELATIONSHIP_OPTIONS, row.relationshipType)}</Tag>,
              },
              {
                key: 'phone',
                header: 'Telepon',
                render: (row) => <span className={monoClass}>{row.phoneNumber}</span>,
              },
              {
                key: 'email',
                header: 'Email',
                muted: true,
                render: (row) => row.email || <Empty />,
              },
              {
                key: 'birth',
                header: 'Tanggal lahir',
                muted: true,
                render: (row) => (row.dateOfBirth ? formatDate(row.dateOfBirth) : <Empty />),
              },
              {
                key: 'emergency',
                header: 'Kontak darurat',
                align: 'center',
                render: (row) =>
                  row.isEmergencyContact ? <Tag tone="emergency">Ya</Tag> : <Empty>Tidak</Empty>,
              },
            ]}
            actions={(row) => (
              <RowActions
                actions={[
                  { label: 'Edit', onSelect: () => setEditing(row) },
                  {
                    label: 'Delete',
                    danger: true,
                    onSelect: () => setDeleting(row),
                  },
                ]}
              />
            )}
          />

          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="family members"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>

        <GapLegend tag="FINAL">
          <strong>Tanda tangan digital</strong> untuk anggota keluarga <strong>tidak ditambahkan</strong> —
          keputusan final (<Code>PROB-FRONTEND-006</Code> c, CLOSE 04 Agu 2026): tidak ada use case konkret,
          sehingga <Code>signature</Code> tetap hanya di <Code>mst_employee_personal</Code>. Field{' '}
          <strong>Address</strong> mengikuti form Figma tapi <strong>belum punya kolom padanan</strong> di{' '}
          <Code>mst_relative</Code>. Tanggungan <strong>tidak</strong> otomatis diklaim untuk PTKP; keputusan
          itu ada di payroll (CD-016).
        </GapLegend>
      </SectionCard>

      <RelativeFormModal relative={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus anggota keluarga?"
        description={`Data ${deleting?.name ?? ''} akan dihapus dari daftar keluarga Anda.`}
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}

/**
 * Kontak darurat = **proyeksi** dari Family (`is_emergency_contact = true`),
 * bukan resource terpisah. Di sini hanya bisa Edit atau Release; Release =
 * UPDATE `is_emergency_contact = false`, orangnya tetap ada di Family.
 */
export function EmergencyContactSection({ relatives }: { relatives: Relative[] }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Relative | null>(null);
  const [releasing, setReleasing] = useState<Relative | null>(null);
  const save = useSaveRelative();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return relatives.filter((r) => r.isEmergencyContact && (!q || r.name.toLowerCase().includes(q)));
  }, [relatives, query]);

  const paged = usePagedRows(filtered);

  return (
    <>
      <SectionCard
        icon={<PhoneCall />}
        title="Emergency Contact"
        description={
          <>
            Proyeksi Family yang <Code>is_emergency_contact = true</Code>
          </>
        }
        endpoint={<EndpointChip icon="call" path="search is_emergency_contact:true" />}
      >
        <Note icon={<Info />}>
          Menu ini adalah <strong>proyeksi, bukan resource terpisah</strong>. Tambah kontak dari{' '}
          <strong>Family</strong> (centang "Jadikan kontak darurat"). Di sini Anda hanya bisa{' '}
          <strong>Edit</strong> atau <strong>Release</strong> — melepas berarti mengubah{' '}
          <Code>is_emergency_contact = false</Code> (UPDATE, <strong>bukan</strong> delete); orangnya tetap
          ada di Family.
        </Note>

        <div className="flex flex-col">
          <TableToolbar
            search={{
              value: query,
              onChange: (value) => {
                setQuery(value);
                paged.resetPage();
              },
              placeholder: 'Cari nama…',
            }}
          />

          <DataTable<Relative>
            rows={paged.rows}
            rowKey={(row) => row.id}
            empty="Belum ada kontak darurat. Centang 'Jadikan kontak darurat' pada anggota keluarga."
            columns={[
              {
                key: 'name',
                header: 'Nama',
                strong: true,
                render: (row) => row.name,
              },
              {
                key: 'relationship',
                header: 'Hubungan',
                render: (row) => <Tag>{labelOf(RELATIONSHIP_OPTIONS, row.relationshipType)}</Tag>,
              },
              {
                key: 'phone',
                header: 'Telepon',
                render: (row) => <span className={monoClass}>{row.phoneNumber}</span>,
              },
              {
                key: 'email',
                header: 'Email',
                muted: true,
                render: (row) => row.email || <Empty />,
              },
              {
                key: 'address',
                header: 'Alamat',
                muted: true,
                render: (row) => row.address || <Empty />,
              },
            ]}
            actions={(row) => (
              <RowActions
                actions={[
                  { label: 'Edit', onSelect: () => setEditing(row) },
                  {
                    label: 'Release',
                    danger: true,
                    onSelect: () => setReleasing(row),
                  },
                ]}
              />
            )}
          />

          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="contacts"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </SectionCard>

      <RelativeFormModal relative={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(releasing)}
        title="Lepas dari kontak darurat?"
        description={`${releasing?.name ?? ''} tidak lagi terdaftar sebagai kontak darurat, tapi tetap ada di daftar keluarga.`}
        confirmLabel="Release"
        loading={save.isPending}
        onOpenChange={(open) => !open && setReleasing(null)}
        onConfirm={() =>
          releasing &&
          save.mutate({ ...releasing, isEmergencyContact: false }, { onSuccess: () => setReleasing(null) })
        }
      />
    </>
  );
}
