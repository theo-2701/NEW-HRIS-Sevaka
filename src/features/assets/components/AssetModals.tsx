import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Segmented } from '@/components/Segmented';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { Field, FieldGrid, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { useBranches, useVendors } from '@/features/company/hooks/useCompany';
import { EMPLOYEE_OPTIONS } from '@/features/assets/mock-data';
import {
  useAssetCategories,
  useAssign,
  useDispose,
  useLease,
  useMaintain,
  useRegisterAsset,
  useResidual,
  useReturnAsset,
  useSaveCategory,
  useTransfer,
} from '@/features/assets/hooks/useAssets';
import { DISPOSAL_TYPE_LABEL } from '@/features/assets/types';
import type {
  Asset,
  AssetActor,
  AssetCategory,
  AssetDraft,
  DisposalDraft,
  DisposalType,
  MaintenanceType,
  OwnershipType,
  ReturnStatus,
} from '@/features/assets/types';

const PEOPLE = EMPLOYEE_OPTIONS.map((row) => ({ value: row.employeeId, label: `${row.nama} · ${row.nik}` }));

function Footer({
  onClose,
  onSave,
  saving,
  label = 'Simpan',
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  label?: string;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Batal
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving ? 'Menyimpan…' : label}
      </Button>
    </>
  );
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span className="flex flex-col gap-0.5">
        <span className="font-body text-[13px] font-semibold text-fg-1">{label}</span>
        <span className="font-body text-xs font-medium text-fg-3">{hint}</span>
      </span>
    </label>
  );
}

// ---------- Kategori ----------

export function CategoryFormModal({
  actor,
  open,
  editing,
  onClose,
}: {
  actor: AssetActor;
  open: boolean;
  editing: AssetCategory | null;
  onClose: () => void;
}) {
  const save = useSaveCategory();
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setInterval(editing?.maintenanceIntervalDays ? String(editing.maintenanceIntervalDays) : '');
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.name}` : 'Kategori aset baru'}
      description="Interval maintenance dipakai untuk menggeser jadwal perawatan berikutnya setiap perawatan terjadwal."
      footer={
        <Footer
          onClose={onClose}
          saving={save.isPending}
          onSave={() =>
            save.mutate(
              { actor, draft: { name, maintenanceIntervalDays: interval }, id: editing?.id },
              { onSuccess: onClose },
            )
          }
        />
      }
    >
      <TextRow label="Nama kategori" required value={name} onChange={setName} />
      <TextRow
        label="Interval maintenance (hari)"
        hint="Kosongkan bila kategori ini tidak punya perawatan berkala."
        value={interval}
        onChange={setInterval}
      />
    </Modal>
  );
}

// ---------- Registrasi ----------

const EMPTY: AssetDraft = {
  assetCode: '',
  assetName: '',
  serialNumber: '',
  assetCategoryId: '',
  branchId: '',
  ownershipType: 'OWNED',
  photo1: '',
  purchaseDate: '',
  purchasePrice: '',
  purchaseInvoiceNumber: '',
  leaseAmount: '',
  leaseStartDate: '',
  leaseEndDate: '',
  leaseContractNumber: '',
  vendorId: '',
};

/**
 * Registrasi bercabang (§7.3): dua bentuk form OWNED vs LEASED, tidak diratakan. Foto boleh
 * dikosongkan — aset tetap lahir, berstatus Tidak tersedia sampai foto menyusul. Berkas kontrak
 * sewa sengaja tidak diminta di sini; ia diisi lewat aksi Sewa sesudah aset tersimpan.
 */
export function RegisterAssetModal({
  actor,
  open,
  onClose,
}: {
  actor: AssetActor;
  open: boolean;
  onClose: () => void;
}) {
  const register = useRegisterAsset();
  const categories = useAssetCategories();
  const branches = useBranches();
  const vendors = useVendors();
  const [draft, setDraft] = useState<AssetDraft>(EMPTY);

  useEffect(() => {
    if (open) setDraft(EMPTY);
  }, [open]);

  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const owned = draft.ownershipType === 'OWNED';
  const missing = [!draft.branchId && 'branch', !draft.assetCategoryId && 'kategori', !draft.photo1 && 'foto'].filter(
    Boolean,
  );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Daftarkan aset"
      description="Bentuk form mengikuti kepemilikan. Data umum boleh belum lengkap — aset tetap tersimpan, tetapi belum bisa diserahkan."
      size="wide"
      footer={
        <Footer
          onClose={onClose}
          saving={register.isPending}
          onSave={() => register.mutate({ actor, draft }, { onSuccess: onClose })}
        />
      }
    >
      <Segmented<OwnershipType>
        value={draft.ownershipType}
        onChange={(value) => set('ownershipType', value)}
        options={[
          { value: 'OWNED', label: 'Milik sendiri' },
          { value: 'LEASED', label: 'Sewa' },
        ]}
      />

      <FieldGrid>
        <TextRow label="Kode aset" required value={draft.assetCode} onChange={(value) => set('assetCode', value)} />
        <TextRow label="Nama aset" required value={draft.assetName} onChange={(value) => set('assetName', value)} />
        <TextRow
          label="Serial number"
          required
          value={draft.serialNumber}
          onChange={(value) => set('serialNumber', value)}
        />
        <SelectRow
          label="Kategori"
          allowEmpty
          emptyLabel="Belum dipilih"
          value={draft.assetCategoryId}
          onChange={(value) => set('assetCategoryId', value)}
          options={(categories.data ?? []).map((row) => ({ value: row.id, label: row.name }))}
        />
        <SelectRow
          label="Branch"
          allowEmpty
          emptyLabel="Belum dipilih"
          value={draft.branchId}
          onChange={(value) => set('branchId', value)}
          options={(branches.data ?? []).map((row) => ({ value: row.id, label: row.branchName }))}
        />
      </FieldGrid>

      <Check
        checked={Boolean(draft.photo1)}
        onChange={(value) => set('photo1', value ? 'doc-photo-baru' : '')}
        label="Foto aset sudah dipilih"
        hint="Boleh dikosongkan; foto bisa diunggah menyusul dari halaman detail aset."
      />

      {owned ? (
        <FieldGrid>
          <TextRow
            label="Tanggal beli"
            required
            placeholder="yyyy-mm-dd"
            value={draft.purchaseDate}
            onChange={(value) => set('purchaseDate', value)}
          />
          <TextRow
            label="Harga beli"
            required
            value={draft.purchasePrice}
            onChange={(value) => set('purchasePrice', value)}
          />
          <TextRow
            label="Nomor faktur"
            required
            value={draft.purchaseInvoiceNumber}
            onChange={(value) => set('purchaseInvoiceNumber', value)}
          />
        </FieldGrid>
      ) : (
        <FieldGrid>
          <TextRow
            label="Nilai sewa"
            required
            value={draft.leaseAmount}
            onChange={(value) => set('leaseAmount', value)}
          />
          <SelectRow
            label="Vendor"
            required
            value={draft.vendorId}
            onChange={(value) => set('vendorId', value)}
            options={(vendors.data ?? []).map((row) => ({ value: row.id, label: row.vendorName }))}
          />
          <TextRow
            label="Mulai sewa"
            required
            placeholder="yyyy-mm-dd"
            value={draft.leaseStartDate}
            onChange={(value) => set('leaseStartDate', value)}
          />
          <TextRow
            label="Akhir sewa"
            required
            placeholder="yyyy-mm-dd"
            value={draft.leaseEndDate}
            onChange={(value) => set('leaseEndDate', value)}
          />
          <TextRow
            label="Nomor kontrak sewa"
            required
            hint="Berkas kontraknya diunggah lewat aksi Sewa, bukan di sini."
            value={draft.leaseContractNumber}
            onChange={(value) => set('leaseContractNumber', value)}
          />
        </FieldGrid>
      )}

      {missing.length > 0 && (
        <p className="m-0 rounded-md border border-warning-200 bg-warning-50 px-3.5 py-2.5 font-body text-xs font-medium text-warning-800">
          Belum lengkap: {missing.join(', ')}. Aset tetap tersimpan, tetapi berstatus Tidak tersedia dan belum bisa
          diserahkan sampai datanya lengkap.
        </p>
      )}
    </Modal>
  );
}

// ---------- Lifecycle ----------

export type LifecycleAction = 'assign' | 'return' | 'transfer' | 'maintain' | 'lease' | 'residual';

export function LifecycleModal({
  actor,
  asset,
  action,
  onClose,
}: {
  actor: AssetActor;
  asset: Asset;
  action: LifecycleAction | null;
  onClose: () => void;
}) {
  const assign = useAssign();
  const giveBack = useReturnAsset();
  const transfer = useTransfer();
  const maintain = useMaintain();
  const lease = useLease();
  const residual = useResidual();
  const branches = useBranches();
  const vendors = useVendors();

  const [employeeId, setEmployeeId] = useState('');
  const [isComplete, setIsComplete] = useState(true);
  const [note, setNote] = useState('');
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>('AVAILABLE');
  const [location, setLocation] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [photo, setPhoto] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('SCHEDULED');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [cost, setCost] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [contract, setContract] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!action) return;
    setEmployeeId('');
    setIsComplete(true);
    setNote('');
    setReturnStatus('AVAILABLE');
    setLocation('');
    setToBranchId('');
    setReason('');
    setTransferDate('');
    setPhoto(false);
    setMaintenanceType('SCHEDULED');
    setMaintenanceDate('');
    setCost('');
    setVendorId(asset.vendorId ?? '');
    setContract(asset.leaseContractNumber ?? '');
    setValue(asset.currentResidualValue !== null ? String(asset.currentResidualValue) : '');
  }, [action, asset]);

  const done = { onSuccess: onClose };
  const config: Record<LifecycleAction, { title: string; description: string; saving: boolean; save: () => void }> = {
    assign: {
      title: 'Serahkan aset',
      description:
        'Kelengkapan yang kurang membuat aset berstatus "Dipegang — belum lengkap": tetap dipegang karyawan, bukan terblokir.',
      saving: assign.isPending,
      save: () => assign.mutate({ actor, id: asset.id, employeeId, isComplete, note }, done),
    },
    return: {
      title: 'Terima kembali aset',
      description: 'Kondisi saat diterima menentukan status aset — tiga hasil yang berbeda, dua di antaranya terminal.',
      saving: giveBack.isPending,
      save: () =>
        giveBack.mutate({ actor, id: asset.id, assetStatus: returnStatus, assetLocation: location, note }, done),
    },
    transfer: {
      title: 'Pindahkan aset',
      description: 'Memindahkan aset ke branch lain. Pemegang aset tidak berubah.',
      saving: transfer.isPending,
      save: () =>
        transfer.mutate(
          { actor, id: asset.id, toBranchId, transferReason: reason, transferDate, photoAttached: photo },
          done,
        ),
    },
    maintain: {
      title: 'Catat maintenance',
      description:
        'Perawatan terjadwal menggeser jadwal berikutnya sejauh interval kategori; perawatan tak terjadwal tidak.',
      saving: maintain.isPending,
      save: () => maintain.mutate({ actor, id: asset.id, maintenanceType, maintenanceDate, cost, note }, done),
    },
    lease: {
      title: 'Perbarui sewa',
      description:
        'Berkas kontrak sewa diunggah di sini, bukan saat registrasi. Setiap pembaruan tercatat di riwayat sewa.',
      saving: lease.isPending,
      save: () =>
        lease.mutate({ actor, id: asset.id, vendorId, leaseContractNumber: contract, photoAttached: photo }, done),
    },
    residual: {
      title: 'Perbarui nilai residu',
      description: 'Nilai terkini aset; riwayat perubahannya tetap tersimpan.',
      saving: residual.isPending,
      save: () => residual.mutate({ actor, id: asset.id, value }, done),
    },
  };

  if (!action) return null;
  const current = config[action];

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${current.title} — ${asset.assetCode}`}
      description={current.description}
      footer={<Footer onClose={onClose} saving={current.saving} onSave={current.save} />}
    >
      {action === 'assign' && (
        <SelectRow
          label="Karyawan penerima"
          required
          value={employeeId}
          onChange={setEmployeeId}
          options={PEOPLE.filter((row) => row.value !== asset.employeeId)}
        />
      )}
      {action === 'assign' && (
        <Check
          checked={isComplete}
          onChange={setIsComplete}
          label="Kelengkapan diserahkan lengkap"
          hint="Matikan bila ada kelengkapan yang menyusul (mis. STNK, charger)."
        />
      )}
      {action === 'transfer' && (
        <>
          <FieldGrid>
            <SelectRow
              label="Branch tujuan"
              required
              value={toBranchId}
              onChange={setToBranchId}
              options={(branches.data ?? [])
                .filter((row) => row.id !== asset.branchId)
                .map((row) => ({ value: row.id, label: row.branchName }))}
            />
            <TextRow
              label="Tanggal transfer"
              required
              placeholder="yyyy-mm-dd"
              value={transferDate}
              onChange={setTransferDate}
            />
          </FieldGrid>
          <Field label="Alasan transfer" required>
            <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        </>
      )}
      {(action === 'transfer' || action === 'lease') && (
        <Check
          checked={photo}
          onChange={setPhoto}
          label="Foto kondisi aset sudah dipilih"
          hint="Wajib — foto kondisi aset saat aksi ini dicatat."
        />
      )}
      {action === 'return' && (
        <Field label="Kondisi saat diterima" required>
          <Segmented<ReturnStatus>
            value={returnStatus}
            onChange={setReturnStatus}
            options={[
              { value: 'AVAILABLE', label: 'Baik' },
              { value: 'ACCIDENTALLY_LOST', label: 'Hilang (insiden)' },
              { value: 'EMPLOYEE_NEGLIGENCE', label: 'Kelalaian' },
            ]}
          />
        </Field>
      )}
      {action === 'return' && (
        <TextRow
          label="Lokasi aset"
          required
          placeholder="mis. Gudang IT lantai 3"
          value={location}
          onChange={setLocation}
        />
      )}
      {action === 'maintain' && (
        <>
          <Field label="Jenis maintenance" required>
            <Segmented<MaintenanceType>
              value={maintenanceType}
              onChange={setMaintenanceType}
              options={[
                { value: 'SCHEDULED', label: 'Terjadwal' },
                { value: 'UNSCHEDULED', label: 'Tak terjadwal' },
              ]}
            />
          </Field>
          <FieldGrid>
            <TextRow
              label="Tanggal"
              required
              placeholder="yyyy-mm-dd"
              value={maintenanceDate}
              onChange={setMaintenanceDate}
            />
            <TextRow label="Biaya" value={cost} onChange={setCost} />
          </FieldGrid>
        </>
      )}
      {action === 'lease' && (
        <FieldGrid>
          <SelectRow
            label="Vendor"
            required
            value={vendorId}
            onChange={setVendorId}
            options={(vendors.data ?? []).map((row) => ({ value: row.id, label: row.vendorName }))}
          />
          <TextRow label="Nomor kontrak" required value={contract} onChange={setContract} />
        </FieldGrid>
      )}
      {action === 'residual' && <TextRow label="Nilai residu" required value={value} onChange={setValue} />}
      {(action === 'assign' || action === 'return' || action === 'maintain') && (
        <Field label="Catatan">
          <Textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      )}
    </Modal>
  );
}

// ---------- Disposal ----------

const EMPTY_DISPOSAL: DisposalDraft = {
  assetStatus: 'SOLD',
  disposalNominal: '',
  disposalFileAttached: false,
  photoAttached: false,
  isEmployee: false,
  employeeId: '',
  fullName: '',
  idCardNumber: '',
  email: '',
  phone: '',
};

/**
 * Disposal (§9): hanya Dijual atau Dihibahkan (keduanya terminal). Nominal, berkas bukti, dan foto
 * wajib untuk keduanya. Penerima karyawan vs pihak luar = dua sub-form dengan field wajib berbeda.
 */
export function DisposalModal({
  actor,
  asset,
  onClose,
}: {
  actor: AssetActor;
  asset: Asset | null;
  onClose: () => void;
}) {
  const dispose = useDispose();
  const [draft, setDraft] = useState<DisposalDraft>(EMPTY_DISPOSAL);

  useEffect(() => {
    if (asset) setDraft(EMPTY_DISPOSAL);
  }, [asset]);

  if (!asset) return null;
  const set = <K extends keyof DisposalDraft>(key: K, value: DisposalDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Lepas aset — ${asset.assetCode}`}
      description="Pelepasan tidak bisa dibatalkan — aset keluar dari siklus dan tidak bisa diserahkan lagi."
      size="wide"
      footer={
        <Footer
          onClose={onClose}
          saving={dispose.isPending}
          label="Lepas aset"
          onSave={() => dispose.mutate({ actor, id: asset.id, draft }, { onSuccess: onClose })}
        />
      }
    >
      <Field label="Jenis pelepasan" required>
        <Segmented<DisposalType>
          value={draft.assetStatus}
          onChange={(value) => set('assetStatus', value)}
          options={(['SOLD', 'GRANTED'] as DisposalType[]).map((value) => ({
            value,
            label: DISPOSAL_TYPE_LABEL[value],
          }))}
        />
      </Field>
      <TextRow
        label="Nominal"
        required
        hint={draft.assetStatus === 'SOLD' ? 'Harga jual.' : 'Nilai aset yang dihibahkan.'}
        value={draft.disposalNominal}
        onChange={(value) => set('disposalNominal', value)}
      />
      <Check
        checked={draft.disposalFileAttached}
        onChange={(value) => set('disposalFileAttached', value)}
        label="Berkas bukti pelepasan sudah dipilih"
        hint="Wajib — kuitansi penjualan atau berita acara hibah."
      />
      <Check
        checked={draft.photoAttached}
        onChange={(value) => set('photoAttached', value)}
        label="Foto kondisi aset sudah dipilih"
        hint="Wajib — foto kondisi aset saat dilepas."
      />
      <Check
        checked={draft.isEmployee}
        onChange={(value) => set('isEmployee', value)}
        label="Penerimanya karyawan"
        hint="Matikan bila penerimanya pihak luar — data identitasnya wajib diisi."
      />
      {draft.isEmployee ? (
        <SelectRow
          label="Karyawan penerima"
          required
          value={draft.employeeId}
          onChange={(value) => set('employeeId', value)}
          options={PEOPLE}
        />
      ) : (
        <FieldGrid>
          <TextRow label="Nama lengkap" required value={draft.fullName} onChange={(value) => set('fullName', value)} />
          <TextRow
            label="Nomor KTP"
            required
            hint="16 digit."
            value={draft.idCardNumber}
            onChange={(value) => set('idCardNumber', value)}
          />
          <TextRow label="Surel" value={draft.email} onChange={(value) => set('email', value)} />
          <TextRow label="Telepon" required value={draft.phone} onChange={(value) => set('phone', value)} />
        </FieldGrid>
      )}
    </Modal>
  );
}
