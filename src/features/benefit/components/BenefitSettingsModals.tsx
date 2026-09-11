import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import { useAddBeneficiary, useSaveBenefitType, useSelectableRelatives } from '@/features/benefit/hooks/useBenefit';
import { RELATIONSHIP_LABEL } from '@/features/benefit/types';
import type { BenefitType, BenefitTypeDraft } from '@/features/benefit/types';

const BLANK: BenefitTypeDraft = {
  name: '',
  requiresReceipt: true,
  allowsFamilyClaim: false,
  containsHealthData: false,
  isActive: true,
  changeReason: '',
};

function Flag({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} />
      <span className="flex flex-col gap-0.5">
        <span className="font-body text-[13px] font-medium text-fg-2">{label}</span>
        {hint && <span className="font-body text-xs font-medium leading-[1.45] text-fg-3">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * Form jenis manfaat. Mengubah flag data kesehatan mengubah siapa yang boleh
 * membuka lampiran klaim berikutnya, jadi perubahannya wajib beralasan.
 */
export function BenefitTypeFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: BenefitType | null;
  onClose: () => void;
}) {
  const save = useSaveBenefitType();
  const [draft, setDraft] = useState<BenefitTypeDraft>(BLANK);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            name: editing.name,
            requiresReceipt: editing.requiresReceipt,
            allowsFamilyClaim: editing.allowsFamilyClaim,
            containsHealthData: editing.containsHealthData,
            isActive: editing.isActive,
            changeReason: '',
          }
        : BLANK,
    );
  }, [open, editing]);

  const healthChanged = Boolean(editing && editing.containsHealthData !== draft.containsHealthData);
  const ready = draft.name.trim().length >= 2 && (!healthChanged || draft.changeReason.trim().length > 0);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? 'Edit benefit type' : 'New benefit type'}
      description="Katalog jenis manfaat menentukan bukti apa yang diminta form klaim dan siapa yang boleh membuka lampirannya."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || save.isPending}
            onClick={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
          >
            {save.isPending ? 'Menyimpan…' : 'Save benefit type'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="typeName">
            Name<em>*</em>
          </Label>
          <Input
            id="typeName"
            value={draft.name}
            maxLength={120}
            placeholder="Input text here"
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>

        <Flag
          label="Requires receipt evidence"
          hint="Form klaim menuntut nomor nota dan lampirannya untuk setiap baris."
          checked={draft.requiresReceipt}
          onChange={(requiresReceipt) => setDraft((prev) => ({ ...prev, requiresReceipt }))}
        />
        <Flag
          label="Allows family claim"
          hint="Karyawan boleh mengklaim atas nama beneficiary yang lolos whitelist hubungan keluarga."
          checked={draft.allowsFamilyClaim}
          onChange={(allowsFamilyClaim) => setDraft((prev) => ({ ...prev, allowsFamilyClaim }))}
        />
        <Flag
          label="Contains health data"
          hint="Lampiran klaimnya jadi terbatas: HR Manager / Health Data Officer / Super Admin, dengan jejak akses medis."
          checked={draft.containsHealthData}
          onChange={(containsHealthData) => setDraft((prev) => ({ ...prev, containsHealthData }))}
        />
        {editing && (
          <Flag
            label="Active"
            hint="Jenis nonaktif tidak lagi muncul di form klaim, tapi klaim lamanya tetap terbaca."
            checked={draft.isActive}
            onChange={(isActive) => setDraft((prev) => ({ ...prev, isActive }))}
          />
        )}

        {healthChanged && (
          <div className="flex flex-col gap-2">
            <Note tone="warn" icon={<ShieldAlert />}>
              <TmFlag>
                CHANGED: {editing?.containsHealthData ? 'Yes → No' : 'No → Yes'}
              </TmFlag>{' '}
              Perubahan ini mengubah siapa yang boleh membuka lampiran klaim berikutnya, jadi alasannya ikut dicatat.
            </Note>
            <div className="flex flex-col gap-1">
              <Label htmlFor="changeReason">
                Reason for the health-data change<em>*</em>
              </Label>
              <Textarea
                id="changeReason"
                rows={3}
                value={draft.changeReason}
                placeholder="Input text here"
                onChange={(event) => setDraft((prev) => ({ ...prev, changeReason: event.target.value }))}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Menambah beneficiary. Kerabat yang sudah punya baris di periode ini tidak
 * ditawarkan — kunci uniknya melarang baris kedua untuk kerabat yang sama.
 */
export function BeneficiaryFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useAddBeneficiary();
  const { data: relatives = [] } = useSelectableRelatives();
  const [relativeId, setRelativeId] = useState('');

  useEffect(() => {
    if (open) setRelativeId('');
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Add beneficiary"
      description="Dibaca dari daftar kerabat di profil karyawan Anda. Hanya hubungan keluarga yang ada di whitelist perusahaan yang bisa didaftarkan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!relativeId || add.isPending}
            onClick={() => add.mutate({ relativeId }, { onSuccess: onClose })}
          >
            Add beneficiary
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <Label>
          Relative<em>*</em>
        </Label>
        <Select value={relativeId} onValueChange={setRelativeId} disabled={!relatives.length}>
          <SelectTrigger>
            <SelectValue
              placeholder={relatives.length ? 'Select relative' : 'Setiap kerabat sudah punya baris di periode ini'}
            />
          </SelectTrigger>
          <SelectContent>
            {relatives.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.name} — {RELATIONSHIP_LABEL[row.relationshipType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-body text-xs font-normal text-fg-3">
          Kerabat yang sudah terdaftar di periode ini — aktif maupun tidak — tidak muncul di sini.
        </span>
      </div>
    </Modal>
  );
}
