import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton } from '@/components/RowActions';
import { Field, FieldGrid, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { deriveZip } from '@/features/company/rules';
import {
  useDeleteBranchLogo,
  useSaveBranch,
  useSaveBranchGroup,
  useUploadBranchLogo,
} from '@/features/company/hooks/useCompany';
import { MAX_ALT_POINTS } from '@/features/company/types';
import type { Branch, BranchDraft, BranchGroup, BranchGroupDraft } from '@/features/company/types';

function FooterButtons({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border-1 pt-4 first:border-t-0 first:pt-0">
      <h4 className="m-0 font-display text-sm font-bold text-fg-1">{title}</h4>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={disabled ? 'flex items-start gap-2.5 opacity-60' : 'flex cursor-pointer items-start gap-2.5'}>
      <Checkbox className="mt-0.5" checked={checked} disabled={disabled} onCheckedChange={(value) => onChange(value === true)} />
      <span className="flex flex-col gap-0.5">
        <span className="font-body text-[13px] font-semibold text-fg-1">{label}</span>
        {hint && <span className="font-body text-xs font-medium text-fg-3">{hint}</span>}
      </span>
    </label>
  );
}

// ---------- Branch Group ----------

const EMPTY_BRANCH_GROUP: BranchGroupDraft = { name: '', levelOrder: '' };

/** Kategori cabang (`S10`): Name + Level Order. Toggle "Lihat Data Anak" dihapus FSD-COMPANY 0.56 (`KV-6`). */
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
    setDraft(editing ? { name: editing.name, levelOrder: String(editing.levelOrder) } : EMPTY_BRANCH_GROUP);
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? `Edit ${editing.name}` : 'Add Category'}
      description="The level order decides which branches can be a parent: a branch's parent must be at a higher level."
      footer={
        <FooterButtons
          onClose={onClose}
          saving={save.isPending}
          onSave={() => save.mutate({ draft, id: editing?.id }, { onSuccess: onClose })}
        />
      }
    >
      <TextRow label="Category Name" required value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <TextRow
        label="Level Order"
        required
        hint="A smaller number is a higher level. Each number can be used by one category only."
        value={draft.levelOrder}
        onChange={(levelOrder) => setDraft({ ...draft, levelOrder })}
      />
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
  taxNpwp: '',
  taxNitku: '',
  taxKlu: '',
  attendanceRadius: '',
  attendanceOnMobile: false,
  altPoints: [],
  isHeadOffice: false,
  useBranchLetterhead: false,
};

const toDraft = (branch: Branch): BranchDraft => ({
  branchName: branch.branchName,
  branchCode: branch.branchCode,
  branchGroupId: branch.branchGroupId,
  parentId: branch.parentId ?? '',
  address: branch.address,
  phone: branch.phone,
  zip: branch.zip.zip,
  regionalWage: String(branch.regionalWage),
  workDaysPerWeek: String(branch.workDaysPerWeek),
  workHoursPerDay: String(branch.workHoursPerDay),
  lateToleranceMinutes: String(branch.lateToleranceMinutes),
  latitude: branch.latitude === null ? '' : String(branch.latitude),
  longitude: branch.longitude === null ? '' : String(branch.longitude),
  taxNpwp: branch.taxNpwp ?? '',
  taxNitku: branch.taxNitku ?? '',
  taxKlu: branch.taxKlu ?? '',
  attendanceRadius: branch.attendanceRadius === null ? '' : String(branch.attendanceRadius),
  attendanceOnMobile: false,
  altPoints: branch.altPoints.map((point) => ({
    id: point.id,
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    radiusMeters: point.radiusMeters === null ? '' : String(point.radiusMeters),
  })),
  isHeadOffice: branch.isHeadOffice,
  useBranchLetterhead: branch.useBranchLetterhead,
});

/**
 * Form cabang (`S3`/`S4`) — FSD-COMPANY 0.56–0.60 §1.2:
 * - kaskade Kategori → Parent Branch: level 1 tanpa induk (terkunci), level N ≥ 2 wajib induk ber-level < N;
 * - titik koordinat alternatif (maks. 10), saklar "Allow clock-in from a phone" disembunyikan (0.60);
 * - Main Branch (HQ) hanya level 1, memindah HQ minta konfirmasi; bagian Letterhead (logo + toggle) hanya di Edit.
 */
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
  const uploadLogo = useUploadBranchLogo();
  const removeLogo = useDeleteBranchLogo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_BRANCH);
  const [parentCleared, setParentCleared] = useState(false);
  const [confirmHq, setConfirmHq] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(editing ? toDraft(editing) : EMPTY_BRANCH);
    setParentCleared(false);
    setConfirmHq(false);
  }, [open, editing]);

  const derived = useMemo(() => deriveZip(draft.zip), [draft.zip]);
  const levelOf = (groupId: string) => groups.find((row) => row.id === groupId)?.levelOrder ?? Number.MAX_SAFE_INTEGER;
  const sortedGroups = [...groups].sort((a, b) => a.levelOrder - b.levelOrder);
  // DISABLED: kategori & induk disembunyikan; FE mengirim kategori bawaan (level teratas) dan induk kosong.
  const defaultGroupId = sortedGroups[0]?.id ?? '';
  const groupId = hierarchy ? draft.branchGroupId : draft.branchGroupId || defaultGroupId;
  const level = groupId ? levelOf(groupId) : null;
  const parentOptions = branches.filter((row) => row.id !== editing?.id && level !== null && levelOf(row.branchGroupId) < level);
  // Logo dibaca dari daftar terkini — unggah/hapus memuat ulang daftar, bukan prop `editing`.
  const live = editing ? (branches.find((row) => row.id === editing.id) ?? editing) : null;
  const hasLogo = Boolean(live?.logoDocumentId);
  const currentHq = branches.find((row) => row.isHeadOffice);
  const movesHq = draft.isHeadOffice && !editing?.isHeadOffice && Boolean(currentHq) && currentHq?.id !== editing?.id;

  const changeGroup = (branchGroupId: string) => {
    const nextLevel = levelOf(branchGroupId);
    const parent = branches.find((row) => row.id === draft.parentId);
    const parentValid = Boolean(parent) && nextLevel !== 1 && levelOf(parent?.branchGroupId ?? '') < nextLevel;
    setParentCleared(Boolean(draft.parentId) && !parentValid);
    setDraft({
      ...draft,
      branchGroupId,
      parentId: parentValid ? draft.parentId : '',
      // HQ hanya level 1 — pindah ke kategori lain mematikan toggle yang belum tersimpan.
      isHeadOffice: nextLevel === 1 ? draft.isHeadOffice : false,
    });
  };

  const payload: BranchDraft = hierarchy ? draft : { ...draft, branchGroupId: groupId, parentId: '' };
  const submit = () => save.mutate({ draft: payload, id: editing?.id }, { onSuccess: onClose });

  const patchPoint = (index: number, next: Partial<BranchDraft['altPoints'][number]>) =>
    setDraft({ ...draft, altPoints: draft.altPoints.map((point, at) => (at === index ? { ...point, ...next } : point)) });

  const pickLogo = (file: File | undefined) => {
    if (!file || !live) return;
    const reader = new FileReader();
    reader.onload = () =>
      uploadLogo.mutate({ id: live.id, file: { name: file.name, type: file.type, previewUrl: String(reader.result) } });
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(next) => !next && onClose()}
        title={editing ? `Edit ${editing.branchName}` : 'Add Branch'}
        description="Province, city, and time zone follow the zip code, so they are not typed in."
        size="wide"
        footer={<FooterButtons onClose={onClose} saving={save.isPending} onSave={() => (movesHq ? setConfirmHq(true) : submit())} />}
      >
        <div className="flex flex-col gap-4">
          <Section title="Branch">
            <FieldGrid>
              <TextRow label="Branch Name" required value={draft.branchName} onChange={(branchName) => setDraft({ ...draft, branchName })} />
              <TextRow
                label="Branch Code"
                required
                disabled={Boolean(editing)}
                hint={editing ? 'The branch code cannot be changed.' : 'Must be unique among active branches.'}
                value={draft.branchCode}
                onChange={(branchCode) => setDraft({ ...draft, branchCode })}
              />
              {hierarchy && (
                <SelectRow
                  label="Branch Category"
                  required
                  value={draft.branchGroupId}
                  onChange={changeGroup}
                  placeholder="Select a category"
                  options={sortedGroups.map((row) => ({ value: row.id, label: `${row.name} (level ${row.levelOrder})` }))}
                />
              )}
              {hierarchy && (
                <SelectRow
                  label="Parent Branch"
                  required={level !== null && level > 1}
                  disabled={!draft.branchGroupId || level === 1}
                  hint={
                    !draft.branchGroupId
                      ? 'Choose the branch category first.'
                      : level === 1
                        ? 'A level 1 branch has no parent.'
                        : parentCleared
                          ? 'The parent was cleared because it is not at a higher level than this category.'
                          : `Only branches above level ${level} can be the parent.`
                  }
                  value={draft.parentId}
                  onChange={(parentId) => {
                    setParentCleared(false);
                    setDraft({ ...draft, parentId });
                  }}
                  placeholder={parentOptions.length ? 'Select a parent branch' : 'No branch at a higher level yet'}
                  options={parentOptions.map((row) => ({ value: row.id, label: row.branchName }))}
                />
              )}
            </FieldGrid>
          </Section>

          <Section title="Contact and location">
            <FieldGrid>
              <TextRow label="Phone" required value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />
              <TextRow
                label="Zip Code"
                required
                hint={draft.zip && !derived.known ? 'This zip code is not in the area list.' : undefined}
                value={draft.zip}
                onChange={(zip) => setDraft({ ...draft, zip })}
              />
              {/* Snapshot kode pos diisi otomatis FE dan dikirim bersama kode pos; tidak dapat diketik (CMP-379). */}
              <TextRow label="Province" disabled value={derived.known ? derived.province : ''} onChange={() => undefined} />
              <TextRow label="City" disabled value={derived.known ? derived.city : ''} onChange={() => undefined} />
              <TextRow label="Time Zone" disabled value={derived.known ? derived.timezone : ''} onChange={() => undefined} />
            </FieldGrid>
            <Field label="Address" required>
              <Textarea rows={2} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
            </Field>
          </Section>

          <Section title="Work rules">
            <FieldGrid>
              <TextRow
                label="Regional Wage (UMP)"
                required
                value={draft.regionalWage}
                onChange={(regionalWage) => setDraft({ ...draft, regionalWage })}
              />
              <TextRow
                label="Late Tolerance (minutes)"
                required
                value={draft.lateToleranceMinutes}
                onChange={(lateToleranceMinutes) => setDraft({ ...draft, lateToleranceMinutes })}
              />
              <TextRow
                label="Work Days per Week"
                required
                value={draft.workDaysPerWeek}
                onChange={(workDaysPerWeek) => setDraft({ ...draft, workDaysPerWeek })}
              />
              <TextRow
                label="Work Hours per Day"
                required
                value={draft.workHoursPerDay}
                onChange={(workHoursPerDay) => setDraft({ ...draft, workHoursPerDay })}
              />
            </FieldGrid>
          </Section>

          <Section title="Clock-in points">
            <FieldGrid>
              <TextRow
                label="Latitude"
                hint="Main clock-in point of the branch."
                value={draft.latitude}
                onChange={(latitude) => setDraft({ ...draft, latitude })}
              />
              <TextRow label="Longitude" value={draft.longitude} onChange={(longitude) => setDraft({ ...draft, longitude })} />
              <TextRow
                label="Clock-in Radius (meters, optional)"
                hint="Leave empty if the clock-in distance is not limited."
                value={draft.attendanceRadius}
                onChange={(attendanceRadius) => setDraft({ ...draft, attendanceRadius })}
              />
            </FieldGrid>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-body text-[13px] font-semibold text-fg-1">
                  Alternative points <span className="font-medium text-fg-3">({draft.altPoints.length}/{MAX_ALT_POINTS})</span>
                </span>
                <AddButton
                  disabled={draft.altPoints.length >= MAX_ALT_POINTS}
                  onClick={() =>
                    setDraft({ ...draft, altPoints: [...draft.altPoints, { id: '', latitude: '', longitude: '', radiusMeters: '' }] })
                  }
                >
                  Add point
                </AddButton>
              </div>
              {draft.altPoints.length >= MAX_ALT_POINTS && (
                <span className="font-body text-xs font-medium text-fg-3">
                  A branch can have at most 10 alternative coordinate points.
                </span>
              )}
              {draft.altPoints.length === 0 && (
                <span className="font-body text-xs font-medium text-fg-3">
                  Add another place employees of this branch can clock in from, such as a back gate or a warehouse.
                </span>
              )}
              {draft.altPoints.map((point, index) => (
                <div key={point.id || `new-${index}`} className="flex flex-col gap-3 rounded-lg border border-border-1 bg-cloud p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-bold uppercase tracking-[0.04em] text-fg-3">Point {index + 1}</span>
                    <Button
                      variant="secondary"
                      onClick={() => setDraft({ ...draft, altPoints: draft.altPoints.filter((_, at) => at !== index) })}
                    >
                      Remove
                    </Button>
                  </div>
                  <FieldGrid>
                    <TextRow label="Latitude" required value={point.latitude} onChange={(latitude) => patchPoint(index, { latitude })} />
                    <TextRow label="Longitude" required value={point.longitude} onChange={(longitude) => patchPoint(index, { longitude })} />
                    <TextRow
                      label="Clock-in Radius (meters, optional)"
                      hint="Leave empty if the clock-in distance is not limited."
                      value={point.radiusMeters}
                      onChange={(radiusMeters) => patchPoint(index, { radiusMeters })}
                    />
                  </FieldGrid>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Tax">
            <FieldGrid>
              <TextRow label="Branch NPWP" value={draft.taxNpwp} onChange={(taxNpwp) => setDraft({ ...draft, taxNpwp })} />
              <TextRow label="Branch NITKU" value={draft.taxNitku} onChange={(taxNitku) => setDraft({ ...draft, taxNitku })} />
              <TextRow label="KLU Code" value={draft.taxKlu} onChange={(taxKlu) => setDraft({ ...draft, taxKlu })} />
            </FieldGrid>
          </Section>

          <Section title="Main branch and letterhead">
            <ToggleRow
              label="Main Branch (HQ)"
              checked={draft.isHeadOffice}
              disabled={level !== 1 || Boolean(editing?.isHeadOffice)}
              hint={
                editing?.isHeadOffice
                  ? 'To move the main branch, turn it on at another level 1 branch.'
                  : level !== 1
                    ? 'Only a level 1 branch can be the main branch.'
                    : currentHq
                      ? `The current main branch is ${currentHq.branchName}.`
                      : undefined
              }
              onChange={(isHeadOffice) => setDraft({ ...draft, isHeadOffice })}
            />

            {live ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-16 place-items-center overflow-hidden rounded-md border border-border-1 bg-cloud">
                    {live.logoPreviewUrl ? (
                      <img src={live.logoPreviewUrl} alt={`${live.branchName} logo`} className="size-full object-contain" />
                    ) : (
                      <span className="px-1 text-center font-body text-[11px] font-medium text-fg-4">No logo</span>
                    )}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-body text-[13px] font-semibold text-fg-1">Branch Logo</span>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" disabled={uploadLogo.isPending} onClick={() => fileRef.current?.click()}>
                        {hasLogo ? 'Replace logo' : 'Upload logo'}
                      </Button>
                      {hasLogo && (
                        <Button
                          variant="secondary"
                          disabled={removeLogo.isPending}
                          onClick={() =>
                            removeLogo.mutate(live.id, { onSuccess: () => setDraft((prev) => ({ ...prev, useBranchLetterhead: false })) })
                          }
                        >
                          Remove logo
                        </Button>
                      )}
                    </div>
                    <span className="font-body text-xs font-medium text-fg-3">JPEG or PNG.</span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => {
                      pickLogo(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </div>
                <ToggleRow
                  label="Use branch letterhead"
                  checked={draft.useBranchLetterhead}
                  disabled={!hasLogo}
                  hint={
                    hasLogo
                      ? "When on, letters for employees of this branch use this branch's letterhead and are signed by this branch's authorized signer. When off, letters use the head office letterhead and signer."
                      : 'Upload a branch logo first.'
                  }
                  onChange={(useBranchLetterhead) => setDraft({ ...draft, useBranchLetterhead })}
                />
              </div>
            ) : (
              <ToggleRow
                label="Use branch letterhead"
                checked={false}
                disabled
                hint="Save the branch first, then upload its logo."
                onChange={() => undefined}
              />
            )}
          </Section>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmHq}
        title="Make this the main branch?"
        description={`This branch will become the main branch. The current main branch, ${currentHq?.branchName ?? ''}, will no longer be the main branch.`}
        confirmLabel="Continue"
        tone="primary"
        loading={save.isPending}
        onOpenChange={(next) => !next && setConfirmHq(false)}
        onConfirm={() => {
          setConfirmHq(false);
          submit();
        }}
      />
    </>
  );
}
