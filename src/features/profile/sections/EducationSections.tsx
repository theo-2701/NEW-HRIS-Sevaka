import { useState } from 'react';
import { Form, Formik } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { PanelActionButton, RowActions } from '@/components/RowActions';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextField } from '@/components/form/TextField';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { BookOpen, GraduationCap } from 'lucide-react';
import {
  CertMark,
  Code,
  Empty,
  EndpointChip,
  GapLegend,
  SectionCard,
  SingleValue,
  Tag,
} from '@/features/profile/components/ProfileBits';
import {
  useDeleteTraining,
  useSaveTraining,
  useUpdateProfile,
} from '@/features/profile/hooks/useProfile';
import { formalEducationSchema, trainingSchema } from '@/features/profile/validation';
import { LAST_EDUCATION_OPTIONS, TRAINING_CATEGORY_OPTIONS, labelOf } from '@/features/profile/types';
import type { LastEducation, Training } from '@/features/profile/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePagedRows } from '@/hooks/usePagedRows';

/** Pendidikan formal: satu nilai jenjang tertinggi (bukan daftar). */
export function FormalEducationSection({ lastEducation }: { lastEducation: LastEducation }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateProfile();

  return (
    <>
      <SectionCard
        icon={<GraduationCap />}
        title="Formal Education"
        description={
          <>
            Field tunggal · <Code>mst_employee_personal.last_education</Code> · update-only
          </>
        }
        endpoint={<EndpointChip method="PUT" path="/employee-profiles/{id}" />}
        action={<PanelActionButton onClick={() => setOpen(true)}>Change Level</PanelActionButton>}
      >
        <SingleValue
          icon={<GraduationCap />}
          label="Highest education level"
          value={labelOf(LAST_EDUCATION_OPTIONS, lastEducation)}
        />

        <GapLegend tag="FINAL">
          <strong>Riwayat pendidikan formal</strong> yang rinci (institusi / jurusan / berkas ijazah){' '}
          <strong>dibatalkan</strong> — keputusan final (<Code>PROB-FRONTEND-006</Code> b, CLOSE); hanya jenjang
          tunggal <Code>last_education</Code> yang ada. Field ini <strong>bukan</strong> field khusus HR, jadi Anda
          bisa mengubahnya sendiri.
        </GapLegend>
      </SectionCard>

      <Formik
        initialValues={{ lastEducation }}
        validationSchema={formalEducationSchema}
        enableReinitialize
        onSubmit={(values) => update.mutate(values, { onSuccess: () => setOpen(false) })}
      >
        {({ submitForm }) => (
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Change Education Level"
            description="Pilih jenjang pendidikan formal tertinggi yang sudah Anda selesaikan."
            footer={
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={update.isPending}>
                  {update.isPending ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </>
            }
          >
            <Form>
              <SelectField name="lastEducation" label="Jenjang pendidikan" required options={LAST_EDUCATION_OPTIONS} />
            </Form>
          </Modal>
        )}
      </Formik>
    </>
  );
}

const EMPTY_TRAINING: Training = {
  id: '',
  trainingName: '',
  trainingSponsor: '',
  trainingActivity: '',
  trainingCategory: 'TECHNICAL',
  graduationScore: '',
  graduationGrade: '',
  trainingCost: '',
  startYear: '',
  endYear: '',
  certificateExpiryDate: '',
  trainingCertificate: '',
};

const isExpired = (iso: string) => Boolean(iso) && new Date(iso) < new Date();

function TrainingFormModal({ training, onClose }: { training: Training | null; onClose: () => void }) {
  const save = useSaveTraining();

  return (
    <Formik
      initialValues={training ?? EMPTY_TRAINING}
      validationSchema={trainingSchema}
      enableReinitialize
      onSubmit={(values) => save.mutate(values, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(training)}
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title={training?.id ? 'Edit Training' : 'Add Training'}
          description="Hanya kategori yang divalidasi terhadap enum; field lain opsional."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={save.isPending}>
                {save.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </>
          }
        >
          <Form className="grid gap-4 md:grid-cols-2">
            <TextField name="trainingName" label="Nama pelatihan" required containerClassName="md:col-span-2" />
            <TextField name="trainingSponsor" label="Penyelenggara" placeholder="mis. Kemnaker RI" />
            <SelectField name="trainingCategory" label="Kategori" required options={TRAINING_CATEGORY_OPTIONS} />
            <TextField name="trainingActivity" label="Aktivitas" containerClassName="md:col-span-2" />
            <TextField name="startYear" label="Tahun mulai" placeholder="2024" maxLength={4} inputMode="numeric" />
            <TextField name="endYear" label="Tahun selesai" placeholder="2024" maxLength={4} inputMode="numeric" />
            <TextField name="graduationScore" label="Nilai" placeholder="92.50" inputMode="decimal" />
            <TextField name="graduationGrade" label="Grade" placeholder="A" maxLength={2} />
            <TextField name="trainingCost" label="Biaya (Rp)" placeholder="5000000" inputMode="numeric" />
            <DateField name="certificateExpiryDate" label="Masa berlaku sertifikat" />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** Pendidikan informal (training) — daftar dengan tambah/ubah/hapus. */
export function TrainingSection({ trainings }: { trainings: Training[] }) {
  const [editing, setEditing] = useState<Training | null>(null);
  const [deleting, setDeleting] = useState<Training | null>(null);
  const remove = useDeleteTraining();
  const paged = usePagedRows(trainings);

  return (
    <>
      <SectionCard
        icon={<BookOpen />}
        title="Informal Education (Training)"
        description={
          <>
            Pelatihan &amp; sertifikasi · <Code>mst_training</Code> · CRUD soft-delete
          </>
        }
        endpoint={<EndpointChip method="POST" path="/trainings" />}
        action={<PanelActionButton onClick={() => setEditing(EMPTY_TRAINING)}>Add Training</PanelActionButton>}
      >
        <DataTable<Training>
          rows={paged.rows}
          rowKey={(row) => row.id}
          empty="Belum ada pelatihan. Pakai &quot;Add Training&quot; untuk mencatat sertifikasi atau kursus."
          columns={[
            { key: 'name', header: 'Pelatihan', strong: true, render: (row) => row.trainingName || <Empty /> },
            { key: 'sponsor', header: 'Penyelenggara', muted: true, render: (row) => row.trainingSponsor || <Empty /> },
            {
              key: 'category',
              header: 'Kategori',
              render: (row) => <Tag>{labelOf(TRAINING_CATEGORY_OPTIONS, row.trainingCategory)}</Tag>,
            },
            {
              key: 'year',
              header: 'Tahun',
              align: 'center',
              muted: true,
              render: (row) =>
                row.startYear
                  ? `${row.startYear}${row.endYear && row.endYear !== row.startYear ? `–${row.endYear}` : ''}`
                  : '—',
            },
            {
              key: 'grade',
              header: 'Nilai / Grade',
              muted: true,
              render: (row) => [row.graduationScore, row.graduationGrade].filter(Boolean).join(' · ') || '—',
            },
            {
              key: 'cost',
              header: 'Biaya',
              align: 'right',
              muted: true,
              render: (row) => (row.trainingCost ? formatCurrency(Number(row.trainingCost)) : '—'),
            },
            {
              key: 'expiry',
              header: 'Masa berlaku',
              render: (row) =>
                row.certificateExpiryDate ? (
                  <span className={isExpired(row.certificateExpiryDate) ? 'font-semibold text-error-700' : undefined}>
                    {formatDate(row.certificateExpiryDate)}
                    {isExpired(row.certificateExpiryDate) && ' · kedaluwarsa'}
                  </span>
                ) : (
                  <Empty />
                ),
            },
            {
              key: 'cert',
              header: 'Sertifikat',
              align: 'center',
              render: (row) => <CertMark present={Boolean(row.trainingCertificate)} />,
            },
          ]}
          actions={(row) => (
            <RowActions
              actions={[
                { label: 'Edit', onSelect: () => setEditing(row) },
                { label: 'Delete', danger: true, onSelect: () => setDeleting(row) },
              ]}
            />
          )}
        />

        <Pagination
          page={paged.page}
          pageSize={paged.pageSize}
          total={paged.total}
          noun="trainings"
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
        />

        <GapLegend tag="ACTIVE">
          <Code>training_activity</Code> sudah <strong>aktif di kontrak §7.4</strong> (TSD-PROFILE delta 0.4) dan kini
          dirender sebagai field opsional — bukan gap lagi. Masa berlaku (<Code>certificate_expiry_date</Code>)
          dipakai untuk deteksi "kedaluwarsa"; DELETE mengembalikan <strong>204 No Content</strong>.
        </GapLegend>
      </SectionCard>

      <TrainingFormModal training={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus data pelatihan?"
        description={`"${deleting?.trainingName ?? ''}" akan dihapus dari riwayat pelatihan Anda.`}
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
