import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { CircleCheckBig, Info, Lock, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateField } from '@/components/form/DateField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { ImpactBar, Note } from '@/features/mass-resignation/components/BatchBits';
import { useCreateBatch, useEmployeePool } from '@/features/mass-resignation/hooks/useMassResignation';
import { batchSchema } from '@/features/mass-resignation/validation';
import { BLAST_THRESHOLD, REASON_OPTIONS } from '@/features/mass-resignation/types';
import type { BatchDraft } from '@/features/mass-resignation/types';
import { cn } from '@/lib/utils';

interface DryRunResult {
  impacted: number;
  overThreshold: boolean;
}

/**
 * Tabel pilih karyawan. Baris diri sendiri dikunci — self-resign dilarang
 * (UIC §6.3), jadi checkbox-nya disabled, bukan sekadar disembunyikan.
 */
function SelectionTable({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const { data: pool = [], isLoading } = useEmployeePool(true);

  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 font-body text-[13px] font-bold text-fg-1">Pilih karyawan</h3>
        <span className="ml-auto inline-flex h-[22px] items-center rounded-pill bg-vapor px-2.5 font-body text-[11px] font-bold text-fg-2">
          {selected.length} dipilih
        </span>
      </header>

      <div className="scroll-thin max-h-[240px] overflow-y-auto rounded-md border border-border-1">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-mist">
            <tr>
              <th className="w-9 px-3 py-2.5" />
              <th className="px-3 py-2.5 text-left font-body text-xs font-bold text-fg-2">Karyawan</th>
              <th className="px-3 py-2.5 text-left font-body text-xs font-bold text-fg-2">Unit</th>
              <th className="px-3 py-2.5 text-left font-body text-xs font-bold text-fg-2">Posisi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center font-body text-[13px] font-medium text-fg-3">
                  Memuat karyawan…
                </td>
              </tr>
            )}
            {pool.map((row) => (
              <tr key={row.id} className={cn('border-t border-border-1', row.self && 'bg-vapor')}>
                <td className="px-3 py-2.5">
                  <Checkbox
                    checked={selected.includes(row.id)}
                    disabled={row.self}
                    onCheckedChange={(checked) => onToggle(row.id, checked === true)}
                    aria-label={`Pilih ${row.name}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-body text-[13px] font-semibold text-fg-1">
                  <span className="flex items-center gap-2">
                    {row.name}
                    {row.self && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-fog px-2 py-0.5 font-body text-[10.5px] font-bold uppercase tracking-[0.05em] text-fg-3 [&_svg]:size-3">
                        <Lock />
                        Anda
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-body text-[13px] font-medium text-fg-3">{row.unit}</td>
                <td className="px-3 py-2.5 font-body text-[13px] font-medium text-fg-3">{row.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Menjaga field Formik `employeeIds` selaras dengan state seleksi induk. */
function SelectionSync({ selected }: { selected: string[] }) {
  const { setFieldValue } = useFormikContext<BatchDraft>();

  useEffect(() => {
    void setFieldValue('employeeIds', selected);
  }, [selected, setFieldValue]);

  return null;
}

/**
 * Panel dry-run (FSD 0.24 §7.1). Sebelum Simpan hanya jumlah baris terpilih (klien);
 * `impacted`/`exceeds_threshold` dari respons server pada Simpan, tidak dihitung ulang.
 */
function DryRunPanel({ selectedCount, result }: { selectedCount: number; result: DryRunResult | null }) {
  const shown = result?.impacted ?? selectedCount;
  const pct = Math.min(100, Math.round((shown / BLAST_THRESHOLD) * 100));

  return (
    <section className="flex flex-col gap-3 rounded-md bg-mist p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 font-body text-[13px] font-bold text-fg-1">Dry-run — blast radius</h3>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[28px] font-bold leading-none text-fg-1">{shown}</span>
          <span className="font-body text-xs font-medium text-fg-3">{result ? 'terdampak' : 'dipilih'}</span>
        </span>
        <div className="flex min-w-[180px] flex-1 flex-col gap-1">
          <ImpactBar value={pct} over={result?.overThreshold} />
          <span className="flex justify-between font-body text-[11px] font-medium text-fg-3">
            <span>0</span>
            <span>Ambang: {BLAST_THRESHOLD}</span>
          </span>
        </div>
      </div>

      {!result && (
        <Note icon={<Info />}>Jumlah terdampak dan status ambang dihitung server saat Simpan.</Note>
      )}
      {result?.overThreshold && (
        <Note tone="danger" icon={<TriangleAlert />}>
          <strong>Melewati ambang ({BLAST_THRESHOLD}).</strong> Batch belum tersimpan — centang konfirmasi lalu
          Simpan lagi. Batch hanya dapat disetujui peran lebih tinggi.
        </Note>
      )}
      {result && !result.overThreshold && (
        <Note icon={<CircleCheckBig />}>Masih di dalam ambang aman {BLAST_THRESHOLD}.</Note>
      )}
    </section>
  );
}

/**
 * MR-CREATE — draft-first. Batch hanya bisa disimpan setelah dry-run
 * dijalankan pada seleksi yang sekarang; mengubah seleksi membatalkan hasil
 * dry-run supaya angka blast-radius tidak pernah basi.
 */
export function CreateBatchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dry, setDry] = useState<DryRunResult | null>(null);
  /** Langkah 2 konfirmasi dua langkah (CD-015) — dicentang sesudah pratinjau melewati ambang. */
  const [confirmed, setConfirmed] = useState(false);
  /** Seleksi disimpan di sini supaya klik beruntun tidak saling menimpa. */
  const [selected, setSelected] = useState<string[]>([]);
  const create = useCreateBatch();

  useEffect(() => {
    if (open) {
      setDry(null);
      setConfirmed(false);
      setSelected([]);
    }
  }, [open]);

  const toggle = (id: string, checked: boolean) => {
    // Seleksi berubah ⇒ pratinjau server basi; Simpan berikutnya menghitung ulang.
    setDry(null);
    setConfirmed(false);
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  };

  return (
    <Formik<BatchDraft>
      initialValues={{ reason: '', leaveDate: '', employeeIds: [], notes: '', batchTitle: '' }}
      validationSchema={batchSchema}
      onSubmit={(values, helpers) =>
        create.mutate(
          { draft: values, confirmed },
          {
            onSuccess: (result) => {
              setDry({ impacted: result.impacted, overThreshold: result.exceedsThreshold });
              if (!result.batch) return;
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          setSelected([]);
          onClose();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="New batch"
            description="Pilih karyawan, lalu jalankan dry-run untuk melihat blast-radius sebelum menyimpan."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending || (dry?.overThreshold && !confirmed)}>
                  {create.isPending ? 'Menyimpan…' : 'Save batch as draft'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField name="reason" label="Alasan" required placeholder="Pilih alasan" options={REASON_OPTIONS} />
                <DateField name="leaveDate" label="Tanggal efektif keluar" required />
              </div>

              <TextField
                name="batchTitle"
                label="Judul batch"
                maxLength={150}
                placeholder="mis. Batch PHK Cabang X"
                hint="Opsional — memudahkan mencari batch di daftar."
              />

              <SelectionSync selected={selected} />
              <SelectionTable selected={selected} onToggle={toggle} />

              <TextAreaField
                name="notes"
                label="Catatan"
                rows={2}
                maxLength={150}
                placeholder="Konteks untuk approver"
                hint="Opsional."
              />

              <DryRunPanel selectedCount={selected.length} result={dry} />

              {dry?.overThreshold && (
                <label className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox checked={confirmed} onCheckedChange={(next) => setConfirmed(next === true)} />
                  <span className="font-body text-[13px] font-medium text-fg-2">
                    Saya memahami dampak {dry.impacted} karyawan dan tetap menyimpan batch ini.
                  </span>
                </label>
              )}
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
