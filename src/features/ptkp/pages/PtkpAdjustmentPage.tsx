import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { CheckboxField } from '@/components/form/CheckboxField';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  DocumentField,
  Note,
  PeriodRow,
  PeriodStatusBadge,
  PtkpCodeChip,
} from '@/features/ptkp/components/PtkpBits';
import { ChangeSubjectModal } from '@/features/ptkp/components/ChangeSubjectModal';
import { useAdjustPtkp, usePtkpPeriods, usePtkpSubjects } from '@/features/ptkp/hooks/usePtkp';
import { ptkpAdjustmentSchema } from '@/features/ptkp/validation';
import { CURRENT_USER, LOCKED_TAX_YEAR_UNTIL, PTKP_CODE_OPTIONS } from '@/features/ptkp/types';
import type { PtkpAdjustmentDraft, PtkpPeriod, PtkpSubject } from '@/features/ptkp/types';
import { formatDate, formatDateTime } from '@/lib/format';

/** Dua muka layar: form penyesuaian, atau riwayat periode. */
type Tab = 'adjust' | 'history';

const EMPTY_DRAFT: PtkpAdjustmentDraft = {
  code: '',
  effectiveFrom: '',
  eventDate: '',
  remarks: '',
  documentName: '',
  attestation: false,
};

/**
 * PTKP Adjustment — port `_prototype/ptkp-adjustment.html`
 * (FSD §2 · UIC §8). Menyimpan periode baru otomatis menutup periode berjalan
 * H-1; riwayatnya append-only, jadi tidak ada aksi ubah/hapus di tabel.
 */
export function PtkpAdjustmentPage() {
  const { data: subjects = [] } = usePtkpSubjects();
  const [subjectId, setSubjectId] = useState<string>();
  const [changing, setChanging] = useState(false);
  const [tab, setTab] = useState<Tab>('adjust');

  const subject: PtkpSubject | undefined = useMemo(
    () => subjects.find((row) => row.id === subjectId) ?? subjects[0],
    [subjects, subjectId],
  );

  const { data: periods = [], isLoading } = usePtkpPeriods(subject?.id);
  const adjust = useAdjustPtkp(subject?.id);

  const running = periods.find((row) => row.status === 'ACTIVE');
  const paged = usePagedRows(periods);
  /** Pemohon tidak boleh memverifikasi PTKP-nya sendiri (SoD). */
  const isSelf = subject?.id === CURRENT_USER.id;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'PTKP Adjustment' }]}
        title="PTKP Adjustment"
        description="Atur status penghasilan tidak kena pajak (PTKP) seorang karyawan. Membuka periode baru otomatis menutup periode yang berjalan. Atestasi wajib dan basis pajaknya ditulis ke log yang tidak bisa diubah."
        actions={
          <Button variant="secondary" onClick={() => setChanging(true)}>
            Change employee
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          {subject && (
            <Card className="flex-row items-center gap-3.5">
              <Avatar name={subject.name} size="lg" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-base font-bold text-fg-1">{subject.name}</span>
                <span className="font-body text-xs font-medium text-fg-3">
                  NIK {subject.nik} · {subject.position} · {subject.branch} · {subject.companyId}
                </span>
              </div>
            </Card>
          )}

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'adjust', label: 'Adjust' },
              { value: 'history', label: 'History', count: periods.length },
            ]}
          />

          {tab === 'adjust' && (
            <div className="grid gap-5 xl:grid-cols-[1fr_380px] xl:items-start">
              <Card>
                <CardHead title="Adjust PTKP Status" />

                <Note icon={<ShieldCheck />}>
                  Segregation of duties — verifier harus berbeda dari pemohon. Aktor audit dicap server dari
                  token Anda, bukan dikirim dari layar ini.
                </Note>

                {isSelf && (
                  <Note tone="warn" icon={<ShieldCheck />}>
                    Anda sedang membuka data diri sendiri. Menyimpan akan ditolak <strong>403</strong> — minta
                    HR lain yang memverifikasi.
                  </Note>
                )}

                <Formik<PtkpAdjustmentDraft>
                  initialValues={EMPTY_DRAFT}
                  validationSchema={ptkpAdjustmentSchema}
                  onSubmit={(values, helpers) =>
                    adjust.mutate(values, { onSuccess: () => helpers.resetForm() })
                  }
                >
                  {({ submitForm, resetForm }) => (
                    <Form className="flex flex-col gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectField
                          name="code"
                          label="Kode PTKP"
                          required
                          placeholder="Pilih kode PTKP"
                          options={PTKP_CODE_OPTIONS}
                          hint="Harus ada di master PTKP (cnf_ptkp_effective)."
                        />
                        <TextField
                          name="effectiveFrom"
                          type="date"
                          label="Berlaku mulai"
                          required
                          min={LOCKED_TAX_YEAR_UNTIL}
                          hint={`Backdate melewati tahun pajak terkunci (s/d ${formatDate(LOCKED_TAX_YEAR_UNTIL)}) ditolak.`}
                        />
                      </div>

                      <TextField
                        name="eventDate"
                        type="date"
                        label="Tanggal kejadian"
                        hint="Opsional — tanggal peristiwa pemicunya (mis. kelahiran anak)."
                        containerClassName="max-w-[260px]"
                      />

                      <DocumentField
                        name="documentName"
                        label="Dokumen pendukung"
                        hint="Opsional. Dikirim sebagai id dokumen buram, bukan URL."
                      />

                      <TextAreaField
                        name="remarks"
                        label="Keterangan"
                        rows={3}
                        maxLength={300}
                        placeholder="mis. Anak kedua lahir — perubahan jumlah tanggungan."
                        hint="Opsional."
                      />

                      <CheckboxField name="attestation">
                        <strong>Atestasi.</strong> Saya menyatakan status PTKP di atas benar dan sesuai
                        dokumen pendukung karyawan yang sah. Pernyataan ini direkam di log perubahan yang
                        tidak bisa diubah.
                      </CheckboxField>

                      <div className="flex flex-wrap justify-end gap-2 border-t border-border-1 pt-4">
                        <Button variant="secondary" onClick={() => resetForm()}>
                          Cancel
                        </Button>
                        <Button onClick={submitForm} disabled={adjust.isPending}>
                          {adjust.isPending ? 'Menyimpan…' : 'Save Adjustment'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </Card>

              <Card>
                <CardHead
                  title="Running Period"
                  action={running ? <PeriodStatusBadge status={running.status} /> : undefined}
                />

                {running ? (
                  <div className="flex flex-col">
                    <PeriodRow label="Kode PTKP">
                      <PtkpCodeChip code={running.code} />
                    </PeriodRow>
                    <PeriodRow label="Berlaku mulai">{formatDate(running.effectiveFrom)}</PeriodRow>
                    <PeriodRow label="Berlaku sampai">
                      <span className="text-success-800">Terbuka — tanpa tanggal akhir</span>
                    </PeriodRow>
                    <PeriodRow label="Tanggal kejadian">
                      {running.eventDate ? (
                        <>
                          {formatDate(running.eventDate)}
                          {running.eventNote && (
                            <span className="font-medium text-fg-4"> · {running.eventNote}</span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </PeriodRow>
                    <PeriodRow label="Ditetapkan oleh">{running.changedBy}</PeriodRow>
                  </div>
                ) : (
                  <p className="m-0 font-body text-[13px] font-medium text-fg-3">
                    Belum ada periode berjalan untuk karyawan ini.
                  </p>
                )}

                <p className="m-0 font-body text-xs font-normal leading-[1.5] text-fg-3">
                  Basis pajak yang baru menjadi acuan perhitungan payroll berikutnya begitu disimpan.
                </p>
              </Card>
            </div>
          )}

          {tab === 'history' && (
            <Card>
              <CardHead title="Adjustment History" sub="Append-only · immutable" />

              <div className="flex flex-col">
                <DataTable<PtkpPeriod>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="Belum ada riwayat penyesuaian."
                  columns={[
                    {
                      key: 'code',
                      header: 'PTKP Code',
                      render: (row) => <PtkpCodeChip code={row.code} size="sm" />,
                    },
                    {
                      key: 'from',
                      header: 'Effective From',
                      nowrap: true,
                      render: (row) => formatDate(row.effectiveFrom),
                    },
                    {
                      key: 'until',
                      header: 'Effective Until',
                      muted: true,
                      nowrap: true,
                      render: (row) => (row.effectiveUntil ? formatDate(row.effectiveUntil) : '—'),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <PeriodStatusBadge status={row.status} />,
                    },
                    { key: 'by', header: 'Changed By', muted: true, render: (row) => row.changedBy },
                    {
                      key: 'recorded',
                      header: 'Recorded At',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDateTime(row.recordedAt),
                    },
                  ]}
                />

                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="periods"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <ChangeSubjectModal
        open={changing}
        currentId={subject?.id}
        onClose={() => setChanging(false)}
        onSelect={(next) => setSubjectId(next.id)}
      />
    </>
  );
}
