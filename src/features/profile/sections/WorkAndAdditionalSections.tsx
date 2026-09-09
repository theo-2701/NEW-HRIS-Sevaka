import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { PanelActionButton, RowActions } from '@/components/RowActions';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { Briefcase, CalendarCheck, ClipboardList } from 'lucide-react';
import {
  CertMark,
  Code,
  Empty,
  EndpointChip,
  GapLegend,
  KeyValueList,
  KeyValueRow,
  Note,
  SectionCard,
  monoClass,
} from '@/features/profile/components/ProfileBits';
import { useDeleteWork, useSaveWork, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { additionalInfoSchema, workExperienceSchema } from '@/features/profile/validation';
import {
  BLOOD_TYPE_OPTIONS,
  DISABILITY_OPTIONS,
  HOME_OWNERSHIP_OPTIONS,
  RELIGION_OPTIONS,
  labelOf,
} from '@/features/profile/types';
import type { PersonalProfile, WorkExperience } from '@/features/profile/types';
import { usePagedRows } from '@/hooks/usePagedRows';

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** Riwayat kerja hanya menampilkan bulan & tahun, sesuai kontrak. */
function formatMonthYear(iso: string): string {
  if (!iso) return '—';
  const [year, month] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

const EMPTY_WORK: WorkExperience = {
  id: '',
  companyName: '',
  position: '',
  joinDate: '',
  leaveDate: '',
  jobDescription: '',
  employmentCertificate: '',
};

function WorkFormModal({ work, onClose }: { work: WorkExperience | null; onClose: () => void }) {
  const save = useSaveWork();

  return (
    <Formik
      initialValues={work ?? EMPTY_WORK}
      validationSchema={workExperienceSchema}
      enableReinitialize
      onSubmit={(values) => save.mutate(values, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(work)}
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title={work?.id ? 'Edit Experience' : 'Add Experience'}
          description="Catat perusahaan sebelumnya beserta peran Anda di sana."
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
            <TextField
              name="companyName"
              label="Nama perusahaan"
              required
              placeholder="mis. PT Maju Jaya"
              containerClassName="md:col-span-2"
            />
            <TextField name="position" label="Posisi" required placeholder="mis. Backend Engineer" />
            <div />
            <TextField name="joinDate" type="month" label="Bulan & tahun masuk" required />
            <TextField name="leaveDate" type="month" label="Bulan & tahun keluar" />
            <TextAreaField
              name="jobDescription"
              label="Deskripsi pekerjaan"
              containerClassName="md:col-span-2"
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

export function WorkExperienceSection({ works }: { works: WorkExperience[] }) {
  const [editing, setEditing] = useState<WorkExperience | null>(null);
  const [deleting, setDeleting] = useState<WorkExperience | null>(null);
  const remove = useDeleteWork();

  /** Terbaru di atas. */
  const sorted = useMemo(() => [...works].sort((a, b) => b.joinDate.localeCompare(a.joinDate)), [works]);
  const paged = usePagedRows(sorted);

  return (
    <>
      <SectionCard
        icon={<Briefcase />}
        title="Working Experience"
        description={
          <>
            Riwayat kerja eksternal · <Code>mst_work_experience</Code> · presisi bulan-tahun
          </>
        }
        endpoint={<EndpointChip method="POST" path="/work-experiences" />}
        action={<PanelActionButton onClick={() => setEditing(EMPTY_WORK)}>Add Experience</PanelActionButton>}
      >
        <Note icon={<CalendarCheck />}>
          Tanggal disimpan sebagai <strong>bulan + tahun</strong> (hari = 01) dan tanggal keluar harus sama atau
          setelah tanggal masuk (<Code>leave_date ≥ join_date</Code>) — ditegakkan di form dan lewat DB CHECK.
        </Note>
        <DataTable<WorkExperience>
          rows={paged.rows}
          rowKey={(row) => row.id}
          empty="Belum ada riwayat. Tambahkan perusahaan sebelumnya dan peran Anda di sana."
          columns={[
            { key: 'company', header: 'Perusahaan', strong: true, render: (row) => row.companyName },
            { key: 'position', header: 'Posisi', render: (row) => row.position },
            {
              key: 'period',
              header: 'Periode (bulan-tahun)',
              muted: true,
              render: (row) => `${formatMonthYear(row.joinDate)} – ${formatMonthYear(row.leaveDate)}`,
            },
            {
              key: 'desc',
              header: 'Deskripsi',
              muted: true,
              render: (row) => row.jobDescription || <Empty />,
            },
            {
              key: 'cert',
              header: 'Paklaring',
              align: 'center',
              render: (row) => <CertMark present={Boolean(row.employmentCertificate)} />,
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
          noun="experiences"
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
        />
      </SectionCard>

      <WorkFormModal work={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus riwayat pekerjaan?"
        description={`Riwayat di ${deleting?.companyName ?? ''} akan dihapus.`}
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}

/** Info tambahan — sebagian field juga tampil di Basic Info (sumber sama). */
export function AdditionalInfoSection({ profile }: { profile: PersonalProfile }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateProfile();

  return (
    <>
      <SectionCard
        icon={<ClipboardList />}
        title="Additional Info"
        description={
          <>
            Sisa biodata COLD · <Code>mst_employee_personal</Code> · update-only
          </>
        }
        endpoint={<EndpointChip method="PUT" path="/employee-profiles/{id}" />}
        action={<PanelActionButton onClick={() => setOpen(true)}>Edit</PanelActionButton>}
      >
        <KeyValueList cols="220px 1fr">
          <KeyValueRow label="Other NIK">
            {profile.otherNik ? <span className={monoClass}>{profile.otherNik}</span> : <Empty />}
          </KeyValueRow>
          <KeyValueRow label="Blood type">{profile.bloodType}</KeyValueRow>
          <KeyValueRow label="Religion">{labelOf(RELIGION_OPTIONS, profile.religion)}</KeyValueRow>
          <KeyValueRow label="Home ownership">
            {labelOf(HOME_OWNERSHIP_OPTIONS, profile.homeOwnershipStatus)}
          </KeyValueRow>
          <KeyValueRow label="Disability status">{labelOf(DISABILITY_OPTIONS, profile.disabilityStatus)}</KeyValueRow>
        </KeyValueList>

        <GapLegend tag="FINAL">
          Field <strong>rhesus darah (+/−)</strong> terpisah <strong>tidak ditambahkan</strong> — keputusan final
          (<Code>PROB-FRONTEND-006</Code> a, CLOSE 04 Agu 2026); <Code>blood_type</Code> (A/B/AB/O/OTHER) sudah
          cukup. Tidak ada field khusus HR di sini; semuanya bisa Anda ubah sendiri.
        </GapLegend>
      </SectionCard>

      <Formik
        initialValues={{
          otherNik: profile.otherNik,
          bloodType: profile.bloodType,
          religion: profile.religion,
          homeOwnershipStatus: profile.homeOwnershipStatus,
          disabilityStatus: profile.disabilityStatus,
        }}
        validationSchema={additionalInfoSchema}
        enableReinitialize
        onSubmit={(values) => update.mutate(values, { onSuccess: () => setOpen(false) })}
      >
        {({ submitForm }) => (
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Edit Additional Info"
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
            <Form className="flex flex-col gap-4">
              <TextField name="otherNik" label="Other NIK" placeholder="Khusus kasus tertentu" />
              <SelectField name="bloodType" label="Blood type" required options={BLOOD_TYPE_OPTIONS} />
              <SelectField name="religion" label="Religion" required options={RELIGION_OPTIONS} />
              <SelectField
                name="homeOwnershipStatus"
                label="Home ownership"
                required
                options={HOME_OWNERSHIP_OPTIONS}
              />
              <SelectField name="disabilityStatus" label="Disability status" required options={DISABILITY_OPTIONS} />
            </Form>
          </Modal>
        )}
      </Formik>
    </>
  );
}
