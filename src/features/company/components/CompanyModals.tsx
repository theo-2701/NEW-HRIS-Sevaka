import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Field, FieldGrid, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { PEOPLE, personName } from '@/features/company/mock-data';
import { deriveZip } from '@/features/company/rules';
import {
  useSaveBranch,
  useSaveBranchGroup,
  useSaveCostCenter,
  useSaveCostCenterCategory,
  useSaveJobGrade,
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
  Branch,
  BranchDraft,
  BranchGroup,
  BranchGroupDraft,
  CostCenter,
  CostCenterCategory,
  CostCenterDraft,
  GroupLevel,
  GroupPosition,
  JobGrade,
  JobGradeDraft,
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

const PEOPLE_OPTIONS = Object.entries(PEOPLE).map(([id, person]) => ({ value: id, label: `${person.nama} · ${person.nik}` }));

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

// ---------- Branch Group ----------

const EMPTY_BRANCH_GROUP: BranchGroupDraft = { name: '', levelOrder: '', canViewChildData: false };

export function BranchGroupFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: BranchGroup | null;
  onClose: () => void;
}) {
  const save = useSaveBranchGroup();
  const [draft, setDraft] = useState<BranchGroupDraft>(EMPTY_BRANCH_GROUP);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? { name: editing.name, levelOrder: String(editing.levelOrder), canViewChildData: editing.canViewChildData }
        : EMPTY_BRANCH_GROUP,
    );
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? 'Ubah kategori cabang' : 'Kategori cabang baru'}
      description="Kategori menentukan kedalaman cabang dalam hierarki dan siapa yang boleh melihat data cabang di bawahnya."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <TextRow label="Nama kategori" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <TextRow
        label="Urutan level"
        required
        hint="Angka kecil berarti lebih tinggi; satu urutan hanya boleh dipakai satu kategori."
        value={draft.levelOrder}
        onChange={(levelOrder) => setDraft({ ...draft, levelOrder })}
      />
      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          checked={draft.canViewChildData}
          onCheckedChange={(value) => setDraft({ ...draft, canViewChildData: value === true })}
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-body text-[13px] font-semibold text-fg-1">Boleh melihat data cabang di bawahnya</span>
          <span className="font-body text-xs font-medium text-fg-3">
            Pengguna pada kategori ini melihat data seluruh cabang turunannya, bukan hanya cabangnya sendiri.
          </span>
        </span>
      </label>
    </Modal>
  );
}

// ---------- Branch ----------

const EMPTY_BRANCH: BranchDraft = {
  branchName: '',
  branchCode: '',
  branchGroupId: '',
  parentId: '',
  address: '',
  phone: '',
  zip: '',
  regionalWage: '',
  workDaysPerWeek: '5',
  workHoursPerDay: '8',
  lateToleranceMinutes: '15',
  latitude: '',
  longitude: '',
};

export function BranchFormModal({
  open,
  editing,
  groups,
  branches,
  hierarchy,
  onClose,
}: {
  open: boolean;
  editing: Branch | null;
  groups: BranchGroup[];
  branches: Branch[];
  hierarchy: boolean;
  onClose: () => void;
}) {
  const save = useSaveBranch();
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_BRANCH);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            branchName: editing.branchName,
            branchCode: editing.branchCode,
            branchGroupId: editing.branchGroupId,
            parentId: editing.parentId ?? '',
            address: editing.address,
            phone: editing.phone,
            zip: editing.zip.zip,
            regionalWage: String(editing.regionalWage),
            workDaysPerWeek: String(editing.workDaysPerWeek),
            workHoursPerDay: String(editing.workHoursPerDay),
            lateToleranceMinutes: String(editing.lateToleranceMinutes),
            latitude: editing.latitude === null ? '' : String(editing.latitude),
            longitude: editing.longitude === null ? '' : String(editing.longitude),
          }
        : EMPTY_BRANCH,
    );
  }, [open, editing]);

  const derived = useMemo(() => deriveZip(draft.zip), [draft.zip]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.branchName}` : 'Cabang baru'}
      description="Provinsi, kota, dan zona waktu mengikuti kode pos, jadi tidak diisi terpisah."
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
          label="Nama cabang"
          required
          value={draft.branchName}
          onChange={(branchName) => setDraft({ ...draft, branchName })}
        />
        <TextRow
          label="Kode cabang"
          required
          disabled={Boolean(editing)}
          hint={editing ? 'Kode cabang tidak bisa diubah setelah dibuat.' : 'Harus unik antar cabang aktif.'}
          value={draft.branchCode}
          onChange={(branchCode) => setDraft({ ...draft, branchCode })}
        />
        <SelectRow
          label="Kategori cabang"
          required
          value={draft.branchGroupId}
          onChange={(branchGroupId) => setDraft({ ...draft, branchGroupId })}
          options={groups.map((group) => ({ value: group.id, label: group.name }))}
        />
        {hierarchy && (
          <SelectRow
            label="Cabang induk"
            allowEmpty
            emptyLabel="Tanpa induk"
            value={draft.parentId}
            onChange={(parentId) => setDraft({ ...draft, parentId })}
            options={branches
              .filter((row) => row.id !== editing?.id)
              .map((row) => ({ value: row.id, label: row.branchName }))}
          />
        )}
        <TextRow label="Telepon" required value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />
        <TextRow
          label="Kode pos"
          required
          hint={derived.known ? `${derived.city}, ${derived.province} · ${derived.timezone}` : 'Kode pos belum dikenali.'}
          value={draft.zip}
          onChange={(zip) => setDraft({ ...draft, zip })}
        />
      </FieldGrid>

      <Field label="Alamat" required>
        <Textarea
          rows={2}
          value={draft.address}
          onChange={(event) => setDraft({ ...draft, address: event.target.value })}
        />
      </Field>

      <FieldGrid>
        <TextRow
          label="Upah minimum wilayah"
          required
          value={draft.regionalWage}
          onChange={(regionalWage) => setDraft({ ...draft, regionalWage })}
        />
        <TextRow
          label="Toleransi terlambat (menit)"
          required
          value={draft.lateToleranceMinutes}
          onChange={(lateToleranceMinutes) => setDraft({ ...draft, lateToleranceMinutes })}
        />
        <TextRow
          label="Hari kerja per minggu"
          required
          value={draft.workDaysPerWeek}
          onChange={(workDaysPerWeek) => setDraft({ ...draft, workDaysPerWeek })}
        />
        <TextRow
          label="Jam kerja per hari"
          required
          value={draft.workHoursPerDay}
          onChange={(workHoursPerDay) => setDraft({ ...draft, workHoursPerDay })}
        />
        <TextRow
          label="Lintang"
          hint="Titik acuan absensi berbasis lokasi."
          value={draft.latitude}
          onChange={(latitude) => setDraft({ ...draft, latitude })}
        />
        <TextRow label="Bujur" value={draft.longitude} onChange={(longitude) => setDraft({ ...draft, longitude })} />
      </FieldGrid>
    </Modal>
  );
}

// ---------- Group Structure ----------

interface PositionDraft {
  positionName: string;
  groupStructLevelId: string;
  employeeId: string;
  parentId: string;
}

const EMPTY_POSITION: PositionDraft = { positionName: '', groupStructLevelId: '', employeeId: '', parentId: '' };

export function PositionFormModal({
  open,
  editing,
  levels,
  positions,
  onClose,
}: {
  open: boolean;
  editing: GroupPosition | null;
  levels: GroupLevel[];
  positions: GroupPosition[];
  onClose: () => void;
}) {
  const save = useSavePosition();
  const [draft, setDraft] = useState<PositionDraft>(EMPTY_POSITION);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            positionName: editing.positionName,
            groupStructLevelId: editing.groupStructLevelId,
            employeeId: editing.employeeId ?? '',
            parentId: editing.parentId ?? '',
          }
        : { ...EMPTY_POSITION, groupStructLevelId: levels[0]?.id ?? '' },
    );
  }, [open, editing, levels]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.positionName}` : 'Posisi baru'}
      description="Atasan ditunjuk lewat posisi, bukan orang. Posisi tanpa pengisi tetap sah dan berstatus lowong."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
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
      <SelectRow
        label="Pengisi posisi"
        allowEmpty
        emptyLabel="Lowong"
        hint="Mengosongkan pengisi tidak menghapus posisinya; rantai persetujuan tetap berdiri."
        value={draft.employeeId}
        onChange={(employeeId) => setDraft({ ...draft, employeeId })}
        options={PEOPLE_OPTIONS}
      />
    </Modal>
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

// ---------- Grade & Class ----------

const EMPTY_JOB_GRADE: JobGradeDraft = { name: '', gradeCode: '', parentId: '', salaryRangeFrom: '', salaryRangeTo: '' };

export function JobGradeFormModal({
  open,
  editing,
  grades,
  onClose,
}: {
  open: boolean;
  editing: JobGrade | null;
  grades: JobGrade[];
  onClose: () => void;
}) {
  const save = useSaveJobGrade();
  const [draft, setDraft] = useState<JobGradeDraft>(EMPTY_JOB_GRADE);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            name: editing.name,
            gradeCode: editing.gradeCode,
            parentId: editing.parentId ?? '',
            salaryRangeFrom: editing.salaryRangeFrom === null ? '' : String(editing.salaryRangeFrom),
            salaryRangeTo: editing.salaryRangeTo === null ? '' : String(editing.salaryRangeTo),
          }
        : EMPTY_JOB_GRADE,
    );
  }, [open, editing]);

  const isClassRow = Boolean(draft.parentId);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Ubah ${editing.name}` : 'Grade atau Class baru'}
      description="Baris tanpa induk adalah Grade; baris dengan induk adalah Class dan wajib membawa rentang gaji."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <FieldGrid>
        <TextRow label="Nama" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <TextRow label="Kode" required value={draft.gradeCode} onChange={(gradeCode) => setDraft({ ...draft, gradeCode })} />
      </FieldGrid>
      <SelectRow
        label="Induk (Grade)"
        allowEmpty
        emptyLabel="Tanpa induk — baris ini sebuah Grade"
        value={draft.parentId}
        onChange={(parentId) => setDraft({ ...draft, parentId })}
        options={grades
          .filter((row) => row.parentId === null && row.id !== editing?.id)
          .map((row) => ({ value: row.id, label: `${row.name} (${row.gradeCode})` }))}
      />
      {isClassRow && (
        <FieldGrid>
          <TextRow
            label="Rentang gaji dari"
            required
            value={draft.salaryRangeFrom}
            onChange={(salaryRangeFrom) => setDraft({ ...draft, salaryRangeFrom })}
          />
          <TextRow
            label="Rentang gaji sampai"
            required
            hint="Batas atas tidak boleh lebih kecil dari batas bawah."
            value={draft.salaryRangeTo}
            onChange={(salaryRangeTo) => setDraft({ ...draft, salaryRangeTo })}
          />
        </FieldGrid>
      )}
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
        <SelectRow
          label="Penanggung jawab"
          allowEmpty
          emptyLabel="Belum ditunjuk"
          value={draft.responsibleEmployeeId}
          onChange={(responsibleEmployeeId) => setDraft({ ...draft, responsibleEmployeeId })}
          options={PEOPLE_OPTIONS}
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
        <TextRow label="Kode" required value={draft.code} onChange={(code) => setDraft({ ...draft, code })} />
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
        <SelectRow
          label="Penanggung jawab"
          allowEmpty
          emptyLabel="Belum ditunjuk"
          value={draft.responsibleEmployeeId}
          onChange={(responsibleEmployeeId) => setDraft({ ...draft, responsibleEmployeeId })}
          options={PEOPLE_OPTIONS}
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
      description="Kontak vendor disimpan sebagai telepon dan alamat; kontrak belum menyediakan kolom surel."
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
