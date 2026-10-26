import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CreatableSelect } from '@/components/CreatableSelect';
import { EmployeeRow, Field, FieldGrid, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { PEOPLE_SOURCE, personName } from '@/features/company/mock-data';
import { isCompanyAdmin } from '@/features/company/rules';
import {
  useSaveCostCenter,
  useSaveCostCenterCategory,
  useGroupLevels,
  useSaveGroupLevel,
  useSaveGroupStruct,
  useSavePosition,
  useSaveSbu,
  useSaveSbuGroup,
  useSaveVendor,
  usePositionHistory,
} from '@/features/company/hooks/useCompany';
import {
  ACTIVITY_LABEL,
  PIC_POSITIONS,
  PIC_POSITION_LABEL,
  VENDOR_TYPES,
  VENDOR_TYPE_LABEL,
} from '@/features/company/types';
import type {
  CompanyActor,
  CostCenter,
  CostCenterCategory,
  CostCenterDraft,
  GroupLevel,
  GroupLevelDraft,
  GroupPosition,
  GroupStruct,
  GroupStructDraft,
  PicPosition,
  PositionLog,
  Sbu,
  SbuDraft,
  SbuGroup,
  Vendor,
  VendorDraft,
  VendorType,
} from '@/features/company/types';
import { formatDateTime } from '@/lib/format';

function FooterButtons({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Batal
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </>
  );
}

// ---------- Group Structure — Group & Level (di luar dokumen, diminta pengguna) ----------

const EMPTY_GROUP_STRUCT: GroupStructDraft = { name: '', isDefault: false, finalApproverEmployeeId: '' };

export function GroupStructFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: GroupStruct | null;
  onClose: () => void;
}) {
  const save = useSaveGroupStruct();
  const [draft, setDraft] = useState<GroupStructDraft>(EMPTY_GROUP_STRUCT);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? { name: editing.name, isDefault: editing.isDefault, finalApproverEmployeeId: editing.finalApproverInfo?.employeeId ?? '' }
        : EMPTY_GROUP_STRUCT,
    );
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.name}` : 'Group baru'}
      description="Hanya boleh ada satu group utama per perusahaan; menyalakannya di sini mematikan group utama yang lama."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <TextRow label="Nama group" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <EmployeeRow
        label="Persetujuan akhir"
        emptyLabel="Belum ditunjuk"
        value={draft.finalApproverEmployeeId}
        onChange={(finalApproverEmployeeId) => setDraft({ ...draft, finalApproverEmployeeId })}
        source={PEOPLE_SOURCE}
      />
      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          checked={draft.isDefault}
          onCheckedChange={(value) => setDraft({ ...draft, isDefault: value === true })}
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-body text-[13px] font-semibold text-fg-1">Jadikan group utama</span>
          <span className="font-body text-xs font-medium text-fg-3">
            Group utama menampung posisi yang belum ditempatkan ke group lain.
          </span>
        </span>
      </label>
    </Modal>
  );
}

const EMPTY_GROUP_LEVEL: GroupLevelDraft = { groupStructId: '', levelName: '', levelOrder: '1' };

export function GroupLevelFormModal({
  open,
  editing,
  structs,
  defaultStructId,
  onClose,
}: {
  open: boolean;
  editing: GroupLevel | null;
  structs: GroupStruct[];
  defaultStructId: string;
  onClose: () => void;
}) {
  const save = useSaveGroupLevel();
  const allLevels = useGroupLevels('');
  const [draft, setDraft] = useState<GroupLevelDraft>(EMPTY_GROUP_LEVEL);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? { groupStructId: editing.groupStructId, levelName: editing.levelName, levelOrder: String(editing.levelOrder) }
        : { ...EMPTY_GROUP_LEVEL, groupStructId: defaultStructId },
    );
  }, [open, editing, defaultStructId]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.levelName}` : 'Level baru'}
      description="Urutan 1 = jenjang tertinggi pada group ini."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <SelectRow
        label="Group"
        required
        value={draft.groupStructId}
        onChange={(groupStructId) => setDraft({ ...draft, groupStructId })}
        options={structs.map((row) => ({ value: row.id, label: row.name }))}
      />
      {/* Notulen 12 Okt 2026 #1: pilih nama level yang sudah dipakai (semua group) atau tambah baru —
          supaya penulisan seragam; urutan tetap boleh berbeda per group (HQ vs cabang). */}
      <Field label="Job level" required hint="Pick an existing name to keep naming consistent across groups.">
        <CreatableSelect
          noun="job level"
          value={draft.levelName}
          onChange={(levelName) => setDraft({ ...draft, levelName })}
          options={(allLevels.data ?? []).map((row) => row.levelName)}
        />
      </Field>
      <TextRow
        label="Urutan"
        required
        hint="Harus unik antar level pada group yang sama."
        value={draft.levelOrder}
        onChange={(levelOrder) => setDraft({ ...draft, levelOrder })}
      />
    </Modal>
  );
}

// ---------- Group Structure ----------

interface PositionDraft {
  positionName: string;
  groupStructLevelId: string;
  employeeId: string;
  parentId: string;
  canSignLetter: boolean;
  secondApproverEmployeeId: string;
}

const EMPTY_POSITION: PositionDraft = {
  positionName: '',
  groupStructLevelId: '',
  employeeId: '',
  parentId: '',
  canSignLetter: false,
  secondApproverEmployeeId: '',
};

/**
 * `GS-6` + tambahan §2.1.2/§2.3.2 (baru `0.14`/`0.15`) — toggle `can_sign_letter` hanya bisa
 * digeser `ROLE_SUPER_ADMIN`/`ROLE_SYSTEM_ADMIN`; peran lain melihat badge baca-saja. Picker
 * Approver Kedua hanya muncul saat menggeser dari `false` ke `true` pada sesi edit yang sama.
 */
export function PositionFormModal({
  open,
  editing,
  levels,
  positions,
  actor,
  onClose,
}: {
  open: boolean;
  editing: GroupPosition | null;
  levels: GroupLevel[];
  positions: GroupPosition[];
  actor: CompanyActor;
  onClose: () => void;
}) {
  const save = useSavePosition();
  const [draft, setDraft] = useState<PositionDraft>(EMPTY_POSITION);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const canWriteSignLetter = isCompanyAdmin(actor.role);
  const wasSigner = editing?.canSignLetter ?? false;
  const turningOn = canWriteSignLetter && !wasSigner && draft.canSignLetter;

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            positionName: editing.positionName,
            groupStructLevelId: editing.groupStructLevelId,
            employeeId: editing.employeeId ?? '',
            parentId: editing.parentId ?? '',
            canSignLetter: editing.canSignLetter,
            secondApproverEmployeeId: '',
          }
        : { ...EMPTY_POSITION, groupStructLevelId: levels[0]?.id ?? '' },
    );
    setConfirmReplace(false);
  }, [open, editing, levels]);

  const submit = () => save.mutate({ actor, draft, id: editing?.id }, { onSuccess: onClose });
  /** FSD-COMPANY 0.38 §2.3: posisi terisi → Ganti Pengisi lewat dialog konfirmasi yang menyebut pengisi lama. */
  const replacing = Boolean(editing?.employeeId && draft.employeeId && draft.employeeId !== editing.employeeId);

  return (
    <>
    <ConfirmDialog
      open={confirmReplace}
      onOpenChange={setConfirmReplace}
      title="Ganti pengisi posisi?"
      description={`${editing?.employeeInfo?.nama ?? personName(editing?.employeeId ?? '')} akan digantikan ${personName(draft.employeeId)}. Atasan seluruh posisi bawahan ikut diperbarui; jejak pengisi lama tetap di riwayat posisi.`}
      confirmLabel="Ganti pengisi"
      tone="primary"
      loading={save.isPending}
      onConfirm={submit}
    />
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.positionName}` : 'Posisi baru'}
      description="Atasan ditunjuk lewat posisi, bukan orang. Posisi tanpa pengisi tetap sah dan berstatus lowong."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => (replacing ? setConfirmReplace(true) : submit())}
        />
      }
    >
      <TextRow
        label="Nama posisi"
        required
        value={draft.positionName}
        onChange={(positionName) => setDraft({ ...draft, positionName })}
      />
      <SelectRow
        label="Level"
        required
        // Group dan Level terkunci setelah posisi dibuat (CMP-379).
        disabled={Boolean(editing)}
        hint={editing ? 'Level tidak dapat diubah setelah posisi dibuat.' : undefined}
        value={draft.groupStructLevelId}
        onChange={(groupStructLevelId) => setDraft({ ...draft, groupStructLevelId })}
        options={levels.map((level) => ({ value: level.id, label: `${level.levelOrder}. ${level.levelName}` }))}
      />
      <SelectRow
        label="Posisi atasan"
        allowEmpty
        emptyLabel="Puncak struktur"
        hint="Atasan tidak boleh berada pada level yang lebih dalam daripada posisi ini."
        value={draft.parentId}
        onChange={(parentId) => setDraft({ ...draft, parentId })}
        options={positions
          .filter((row) => row.id !== editing?.id)
          .map((row) => ({ value: row.id, label: row.positionName }))}
      />
      <EmployeeRow
        label="Pengisi posisi"
        emptyLabel="Lowong"
        hint="Mengosongkan pengisi tidak menghapus posisinya; rantai persetujuan tetap berdiri."
        value={draft.employeeId}
        onChange={(employeeId) => setDraft({ ...draft, employeeId })}
        source={PEOPLE_SOURCE}
      />

      {canWriteSignLetter ? (
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            className="mt-0.5"
            checked={draft.canSignLetter}
            onCheckedChange={(value) =>
              setDraft({ ...draft, canSignLetter: value === true, secondApproverEmployeeId: '' })
            }
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-body text-[13px] font-semibold text-fg-1">
              Berwenang menandatangani surat resmi
            </span>
            <span className="font-body text-xs font-medium text-fg-3">
              Menyalakan butuh persetujuan orang kedua; mematikan cukup satu tangan.
            </span>
          </span>
        </label>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-body text-[13px] font-semibold text-fg-1">Berwenang menandatangani surat:</span>
          <StatusBadge tone={wasSigner ? 'ok' : 'mute'}>{wasSigner ? 'Ya' : 'Tidak'}</StatusBadge>
          <span className="font-body text-xs font-medium text-fg-4">— hanya Super Admin/System Admin yang boleh mengubah ini.</span>
        </div>
      )}

      {turningOn && (
        <EmployeeRow
          label="Approver kedua"
          required
          hint="Wajib berperan admin dan bukan diri sendiri; tidak disimpan sebagai field posisi, hanya penegak saat ini."
          value={draft.secondApproverEmployeeId}
          onChange={(secondApproverEmployeeId) => setDraft({ ...draft, secondApproverEmployeeId })}
          source={PEOPLE_SOURCE}
          exclude={[actor.employeeId]}
        />
      )}
    </Modal>
    </>
  );
}

export function PositionHistoryModal({
  open,
  position,
  onClose,
}: {
  open: boolean;
  position: GroupPosition | null;
  onClose: () => void;
}) {
  const history = usePositionHistory(position?.id ?? '');

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={position ? `Riwayat ${position.positionName}` : 'Riwayat posisi'}
      description="Setiap pembuatan, perubahan, dan penghapusan posisi tercatat otomatis."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <DataTable<PositionLog>
        rows={history.data ?? []}
        rowKey={(row) => row.id}
        loading={history.isLoading}
        empty="Belum ada perubahan tercatat untuk posisi ini."
        columns={[
          {
            key: 'activity',
            header: 'Aktivitas',
            render: (row) => (
              <StatusBadge tone={row.activity === 'D' ? 'err' : row.activity === 'I' ? 'ok' : 'info'}>
                {ACTIVITY_LABEL[row.activity]}
              </StatusBadge>
            ),
          },
          { key: 'note', header: 'Catatan', strong: true, render: (row) => row.note },
          { key: 'by', header: 'Oleh', muted: true, render: (row) => personName(row.createdBy) },
          { key: 'at', header: 'Waktu', muted: true, nowrap: true, render: (row) => formatDateTime(row.createdAt) },
        ]}
      />
    </Modal>
  );
}

// ---------- Cost Center ----------

export function CostCenterCategoryFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: CostCenterCategory | null;
  onClose: () => void;
}) {
  const save = useSaveCostCenterCategory();
  const [draft, setDraft] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!open) return;
    setDraft(editing ? { name: editing.name, description: editing.description } : { name: '', description: '' });
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? 'Ubah kategori' : 'Kategori cost center baru'}
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <TextRow label="Nama kategori" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <Field label="Keterangan">
        <Textarea
          rows={2}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </Field>
    </Modal>
  );
}

const EMPTY_COST_CENTER: CostCenterDraft = {
  code: '',
  name: '',
  costCenterCategoryId: '',
  parentId: '',
  responsibleEmployeeId: '',
  annualBudget: '',
};

export function CostCenterFormModal({
  open,
  editing,
  categories,
  costCenters,
  onClose,
}: {
  open: boolean;
  editing: CostCenter | null;
  categories: CostCenterCategory[];
  costCenters: CostCenter[];
  onClose: () => void;
}) {
  const save = useSaveCostCenter();
  const [draft, setDraft] = useState<CostCenterDraft>(EMPTY_COST_CENTER);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            costCenterCategoryId: editing.costCenterCategoryId,
            parentId: editing.parentId ?? '',
            responsibleEmployeeId: editing.responsibleEmployeeId ?? '',
            annualBudget: editing.annualBudget === null ? '' : String(editing.annualBudget),
          }
        : EMPTY_COST_CENTER,
    );
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.name}` : 'Cost center baru'}
      size="wide"
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <FieldGrid>
        <TextRow
          label="Kode"
          required
          disabled={Boolean(editing)}
          hint={editing ? 'Kode cost center tidak bisa diubah.' : 'Harus unik antar cost center aktif.'}
          value={draft.code}
          onChange={(code) => setDraft({ ...draft, code })}
        />
        <TextRow label="Nama" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <SelectRow
          label="Kategori"
          required
          value={draft.costCenterCategoryId}
          onChange={(costCenterCategoryId) => setDraft({ ...draft, costCenterCategoryId })}
          options={categories.map((row) => ({ value: row.id, label: row.name }))}
        />
        <SelectRow
          label="Induk"
          allowEmpty
          emptyLabel="Tanpa induk"
          value={draft.parentId}
          onChange={(parentId) => setDraft({ ...draft, parentId })}
          options={costCenters
            .filter((row) => row.id !== editing?.id)
            .map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` }))}
        />
        <EmployeeRow
          label="Penanggung jawab"
          emptyLabel="Belum ditunjuk"
          value={draft.responsibleEmployeeId}
          onChange={(responsibleEmployeeId) => setDraft({ ...draft, responsibleEmployeeId })}
          source={PEOPLE_SOURCE}
        />
        <TextRow
          label="Anggaran tahunan"
          value={draft.annualBudget}
          onChange={(annualBudget) => setDraft({ ...draft, annualBudget })}
        />
      </FieldGrid>
    </Modal>
  );
}

// ---------- SBU ----------

export function SbuGroupFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: SbuGroup | null;
  onClose: () => void;
}) {
  const save = useSaveSbuGroup();
  const [draft, setDraft] = useState({ name: '' });

  useEffect(() => {
    if (!open) return;
    setDraft({ name: editing?.name ?? '' });
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? 'Ubah grup SBU' : 'Grup SBU baru'}
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <TextRow label="Nama grup" required value={draft.name} onChange={(name) => setDraft({ name })} />
    </Modal>
  );
}

const EMPTY_SBU: SbuDraft = { code: '', name: '', sbuGroupId: '', parentId: '', responsibleEmployeeId: '' };

export function SbuFormModal({
  open,
  editing,
  groups,
  sbus,
  onClose,
}: {
  open: boolean;
  editing: Sbu | null;
  groups: SbuGroup[];
  sbus: Sbu[];
  onClose: () => void;
}) {
  const save = useSaveSbu();
  const [draft, setDraft] = useState<SbuDraft>(EMPTY_SBU);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            sbuGroupId: editing.sbuGroupId,
            parentId: editing.parentId ?? '',
            responsibleEmployeeId: editing.responsibleEmployeeId ?? '',
          }
        : EMPTY_SBU,
    );
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.name}` : 'SBU baru'}
      size="wide"
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <FieldGrid>
        <TextRow
          label="Kode"
          required
          disabled={Boolean(editing)}
          hint={editing ? 'Kode SBU tidak bisa diubah.' : undefined}
          value={draft.code}
          onChange={(code) => setDraft({ ...draft, code })}
        />
        <TextRow label="Nama" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <SelectRow
          label="Grup SBU"
          required
          value={draft.sbuGroupId}
          onChange={(sbuGroupId) => setDraft({ ...draft, sbuGroupId })}
          options={groups.map((row) => ({ value: row.id, label: row.name }))}
        />
        <SelectRow
          label="Induk"
          allowEmpty
          emptyLabel="Tanpa induk"
          value={draft.parentId}
          onChange={(parentId) => setDraft({ ...draft, parentId })}
          options={sbus.filter((row) => row.id !== editing?.id).map((row) => ({ value: row.id, label: row.name }))}
        />
        <EmployeeRow
          label="Penanggung jawab"
          emptyLabel="Belum ditunjuk"
          value={draft.responsibleEmployeeId}
          onChange={(responsibleEmployeeId) => setDraft({ ...draft, responsibleEmployeeId })}
          source={PEOPLE_SOURCE}
        />
      </FieldGrid>
    </Modal>
  );
}

// ---------- Vendor ----------

const EMPTY_VENDOR: VendorDraft = {
  vendorName: '',
  address: '',
  phone: '',
  telephone: '',
  email: '',
  vendorType: 'COMPANY',
  picName: '',
  picPosition: '',
};

export function VendorFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Vendor | null;
  onClose: () => void;
}) {
  const save = useSaveVendor();
  const [draft, setDraft] = useState<VendorDraft>(EMPTY_VENDOR);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            vendorName: editing.vendorName,
            address: editing.address,
            phone: editing.phone,
            telephone: editing.telephone ?? '',
            email: editing.email ?? '',
            vendorType: editing.vendorType,
            picName: editing.picName ?? '',
            picPosition: editing.picPosition ?? '',
          }
        : EMPTY_VENDOR,
    );
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.vendorName}` : 'Vendor baru'}
      description="Kontak vendor: telepon, alamat, dan surel (opsional)."
      size="wide"
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <FieldGrid>
        <TextRow
          label="Nama vendor"
          required
          value={draft.vendorName}
          onChange={(vendorName) => setDraft({ ...draft, vendorName })}
        />
        <SelectRow
          label="Jenis vendor"
          required
          value={draft.vendorType}
          onChange={(value) => setDraft({ ...draft, vendorType: value as VendorType })}
          options={VENDOR_TYPES.map((type) => ({ value: type, label: VENDOR_TYPE_LABEL[type] }))}
        />
        <TextRow label="Telepon seluler" required value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />
        <TextRow
          label="Telepon kantor"
          value={draft.telephone}
          onChange={(telephone) => setDraft({ ...draft, telephone })}
        />
        <TextRow label="Surel" value={draft.email} onChange={(email) => setDraft({ ...draft, email })} />
        <TextRow label="Nama PIC" value={draft.picName} onChange={(picName) => setDraft({ ...draft, picName })} />
        <SelectRow
          label="Jabatan PIC"
          allowEmpty
          emptyLabel="Belum diisi"
          value={draft.picPosition}
          onChange={(value) => setDraft({ ...draft, picPosition: value as PicPosition | '' })}
          options={PIC_POSITIONS.map((position) => ({ value: position, label: PIC_POSITION_LABEL[position] }))}
        />
      </FieldGrid>
      <Field label="Alamat" required>
        <Textarea
          rows={2}
          value={draft.address}
          onChange={(event) => setDraft({ ...draft, address: event.target.value })}
        />
      </Field>
    </Modal>
  );
}
