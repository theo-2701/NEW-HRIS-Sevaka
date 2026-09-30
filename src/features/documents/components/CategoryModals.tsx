import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Segmented } from '@/components/Segmented';
import { Field, TextRow } from '@/features/company/components/CompanyBits';
import { GovError, GovNote } from '@/features/documents/components/GovBits';
import {
  useCreateCategory,
  useDecideCategory,
  useSetReaders,
  useUpdateCategory,
} from '@/features/documents/hooks/useGovernance';
import { CANONICAL_ROLES } from '@/features/documents/types';
import type {
  CategoryAdmin,
  CategoryAttributes,
  CategoryDraft,
  DocActor,
  RetentionRegime,
} from '@/features/documents/types';
import { formatDateTime } from '@/lib/format';

const MIME_OPTIONS = [
  { value: 'application/pdf', label: 'PDF' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' },
  { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'XLSX' },
];
const MB = 1024 * 1024;
const mimeLabel = (mime: string) => MIME_OPTIONS.find((row) => row.value === mime)?.label ?? mime;

function MimeChecks({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {MIME_OPTIONS.map((option) => (
        <label key={option.value} className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
          <Checkbox
            checked={value.includes(option.value)}
            onCheckedChange={(checked) =>
              onChange(checked === true ? [...value, option.value] : value.filter((item) => item !== option.value))
            }
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}

const EMPTY: CategoryDraft = {
  categoryCode: '',
  categoryName: '',
  retentionRegime: 'TEMPORARY',
  retentionDays: '',
  maxFileSizeMb: '5',
  allowedMimeTypes: ['application/pdf'],
  isReplaceable: false,
  isRegenerable: false,
  shownInSelfService: true,
};

/** `S2` — buat kategori perusahaan (`A6b`): asal PERUSAHAAN + kelas BIASA dipaksa; tanpa orang kedua. */
export function CreateCategoryModal({ actor, open, onClose }: { actor: DocActor; open: boolean; onClose: () => void }) {
  const create = useCreateCategory();
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY);
  const set = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const close = () => {
    setDraft(EMPTY);
    create.reset();
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="New category"
      description="A new category has no documents yet, so it needs no second-person approval."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={() => create.mutate({ actor, draft }, { onSuccess: close })}>
            {create.isPending ? 'Creating…' : 'Create category'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={create.error} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextRow
            label="Code"
            required
            value={draft.categoryCode}
            onChange={(value) => set('categoryCode', value)}
            placeholder="e.g. berkas_serah_terima_aset"
            hint="Lowercase letters, numbers, underscores. Cannot be changed later."
          />
          <TextRow label="Name" required value={draft.categoryName} onChange={(value) => set('categoryName', value)} />
          <Field label="Retention regime" required>
            <Segmented<RetentionRegime>
              value={draft.retentionRegime}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  retentionRegime: value,
                  retentionDays: value === 'PERMANENT' ? '' : prev.retentionDays,
                }))
              }
              options={[
                { value: 'TEMPORARY', label: 'Temporary' },
                { value: 'PERMANENT', label: 'Permanent' },
              ]}
            />
          </Field>
          {draft.retentionRegime === 'TEMPORARY' && (
            <Field label="Retention (days)" required>
              <Input
                type="number"
                min={1}
                value={draft.retentionDays}
                onChange={(event) => set('retentionDays', event.target.value)}
              />
            </Field>
          )}
          <Field label="Max file size (MB)" required hint="Up to 25 MB.">
            <Input
              type="number"
              min={1}
              max={25}
              value={draft.maxFileSizeMb}
              onChange={(event) => set('maxFileSizeMb', event.target.value)}
            />
          </Field>
          <Field label="Allowed file types" required hint="SVG and compressed archives are never allowed.">
            <MimeChecks value={draft.allowedMimeTypes} onChange={(value) => set('allowedMimeTypes', value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <Toggle
            label="Can be replaced"
            checked={draft.isReplaceable}
            onChange={(value) => set('isReplaceable', value)}
          />
          <Toggle
            label="Can be regenerated"
            checked={draft.isRegenerable}
            onChange={(value) => set('isRegenerable', value)}
          />
          <Toggle
            label="Shown in self-service"
            checked={draft.shownInSelfService}
            onChange={(value) => set('shownInSelfService', value)}
          />
        </div>
        <GovNote>
          Origin (company), confidentiality (regular), status, and approval flag are set by the server — not by this
          form.
        </GovNote>
      </div>
    </Modal>
  );
}

/** Arah perubahan di sisi layar — hanya untuk memberi tahu sebelum dikirim; server tetap yang memutuskan. */
function isLoosening(row: CategoryAdmin, patch: Partial<CategoryAttributes>) {
  return (
    (patch.retentionDays !== undefined &&
      row.retentionDays !== null &&
      patch.retentionDays !== null &&
      patch.retentionDays < row.retentionDays) ||
    (patch.maxFileSizeBytes !== undefined && patch.maxFileSizeBytes > row.maxFileSizeBytes) ||
    (patch.allowedMimeTypes?.some((mime) => !row.allowedMimeTypes.includes(mime)) ?? false) ||
    (['isReplaceable', 'isRegenerable', 'shownInSelfService', 'isActive'] as const).some(
      (key) => patch[key] === true && row[key] === false,
    )
  );
}

/**
 * `S3`/`S4` — ubah penanda (`A6c`). MENGETAT (menonaktifkan, memperpanjang simpan, mempersempit) berlaku seketika;
 * MELONGGARKAN melahirkan usulan yang wajib mengakui angka dokumen terdampak dan menunggu Super Admin.
 */
export function EditCategoryModal({
  actor,
  category,
  onClose,
}: {
  actor: DocActor;
  category: CategoryAdmin | null;
  onClose: () => void;
}) {
  const update = useUpdateCategory();
  const [form, setForm] = useState<CategoryAttributes | null>(null);
  const [ack, setAck] = useState(false);
  useEffect(() => {
    if (!category) return;
    setForm({
      categoryName: category.categoryName,
      retentionDays: category.retentionDays,
      maxFileSizeBytes: category.maxFileSizeBytes,
      allowedMimeTypes: [...category.allowedMimeTypes],
      isReplaceable: category.isReplaceable,
      isRegenerable: category.isRegenerable,
      shownInSelfService: category.shownInSelfService,
      isActive: category.isActive,
    });
    setAck(false);
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang saat kategori berganti
  }, [category?.id]);
  if (!category || !form) return null;
  const patch = Object.fromEntries(
    Object.entries(form).filter(
      ([key, value]) => JSON.stringify(category[key as keyof CategoryAttributes]) !== JSON.stringify(value),
    ),
  ) as Partial<CategoryAttributes>;
  const loosening = isLoosening(category, patch);
  const set = <K extends keyof CategoryAttributes>(key: K, value: CategoryAttributes[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Edit ${category.categoryName}`}
      description={`Code ${category.categoryCode} cannot be changed.`}
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!Object.keys(patch).length || (loosening && !ack) || update.isPending}
            onClick={() =>
              update.mutate(
                { actor, id: category.id, patch, ack: loosening ? category.impactCount : undefined },
                { onSuccess: onClose },
              )
            }
          >
            {update.isPending ? 'Saving…' : loosening ? 'Submit proposal' : 'Save now'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={update.error} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextRow label="Name" value={form.categoryName} onChange={(value) => set('categoryName', value)} />
          {category.retentionRegime === 'TEMPORARY' ? (
            <Field label="Retention (days)" hint="Shortening opens files to deletion sooner — it needs approval.">
              <Input
                type="number"
                min={1}
                value={form.retentionDays ?? ''}
                onChange={(event) =>
                  set('retentionDays', event.target.value === '' ? null : Number(event.target.value))
                }
              />
            </Field>
          ) : (
            <Field label="Retention">
              <span className="font-body text-[13px] font-semibold text-fg-2">Permanent — no retention days</span>
            </Field>
          )}
          <Field label="Max file size (MB)">
            <Input
              type="number"
              min={1}
              max={25}
              value={Math.round((form.maxFileSizeBytes / MB) * 10) / 10}
              onChange={(event) => set('maxFileSizeBytes', Math.round(Number(event.target.value) * MB))}
            />
          </Field>
          <Field label="Allowed file types">
            <MimeChecks value={form.allowedMimeTypes} onChange={(value) => set('allowedMimeTypes', value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <Toggle
            label="Can be replaced"
            checked={form.isReplaceable}
            onChange={(value) => set('isReplaceable', value)}
          />
          <Toggle
            label="Can be regenerated"
            checked={form.isRegenerable}
            onChange={(value) => set('isRegenerable', value)}
          />
          <Toggle
            label="Shown in self-service"
            checked={form.shownInSelfService}
            onChange={(value) => set('shownInSelfService', value)}
          />
          <Toggle label="Active" checked={form.isActive} onChange={(value) => set('isActive', value)} />
        </div>
        {Object.keys(patch).length > 0 &&
          (loosening ? (
            <GovNote tone="warn">
              <div className="flex flex-col gap-2">
                <span>
                  This change <strong>loosens</strong> the category. It becomes a proposal: current values keep applying
                  until the Super Admin approves. <strong>{category.impactCount}</strong> document
                  {category.impactCount === 1 ? '' : 's'} would be affected.
                </span>
                <Toggle
                  label={`I acknowledge ${category.impactCount} affected documents`}
                  checked={ack}
                  onChange={setAck}
                />
              </div>
            </GovNote>
          ) : (
            <GovNote>
              This change only tightens the category, so it applies immediately and is logged per attribute.
            </GovNote>
          ))}
      </div>
    </Modal>
  );
}

/** `S6` — tetapkan peran pembaca (`A7`): penggantian seluruh daftar; hanya kategori BIASA; menunggu Super Admin. */
export function ReadersModal({
  actor,
  category,
  onClose,
}: {
  actor: DocActor;
  category: CategoryAdmin | null;
  onClose: () => void;
}) {
  const setReaders = useSetReaders();
  const [roles, setRoles] = useState<string[]>([]);
  const [ack, setAck] = useState(false);
  useEffect(() => {
    if (!category) return;
    setRoles([...category.readerRoles]);
    setAck(false);
    setReaders.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang saat kategori berganti
  }, [category?.id]);
  if (!category) return null;
  const sensitive = category.confidentialityClass === 'SENSITIF';
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Reader roles · ${category.categoryName}`}
      description="Replaces the whole list. The current list keeps applying until the Super Admin approves."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={sensitive || !ack || setReaders.isPending}
            onClick={() =>
              setReaders.mutate({ actor, id: category.id, roles, ack: category.impactCount }, { onSuccess: onClose })
            }
          >
            Submit proposal
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={setReaders.error} />
        {sensitive && <GovNote tone="danger">403 — the reader list of a SENSITIVE category cannot be changed.</GovNote>}
        <div className="grid grid-cols-2 gap-2">
          {CANONICAL_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
              <Checkbox
                disabled={sensitive}
                checked={roles.includes(role)}
                onCheckedChange={(checked) =>
                  setRoles((prev) => (checked === true ? [...prev, role] : prev.filter((item) => item !== role)))
                }
              />
              {role.replace('ROLE_', '').replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        {!sensitive && (
          <GovNote tone="warn">
            <div className="flex flex-col gap-2">
              <span>
                <strong>{category.impactCount}</strong> document{category.impactCount === 1 ? '' : 's'} in this category
                would be affected.
              </span>
              <Toggle
                label={`I acknowledge ${category.impactCount} affected documents`}
                checked={ack}
                onChange={setAck}
              />
            </div>
          </GovNote>
        )}
      </div>
    </Modal>
  );
}

/** `S5` — putusan orang kedua (`A6d`): Super Admin, berbeda orang dari pengusul; angka dampak wajib sama. */
export function DecideCategoryModal({
  actor,
  category,
  onClose,
}: {
  actor: DocActor;
  category: CategoryAdmin | null;
  onClose: () => void;
}) {
  const decide = useDecideCategory();
  const [reason, setReason] = useState('');
  if (!category?.pending) return null;
  const pending = category.pending;
  const close = () => {
    setReason('');
    decide.reset();
    onClose();
  };
  const changes = Object.entries(pending.changes);
  return (
    <Modal
      open
      onOpenChange={(next) => !next && close()}
      title={`Decide · ${category.categoryName}`}
      description={`Proposed by ${pending.proposedBy.nama} on ${formatDateTime(pending.proposedAt)}`}
      size="wide"
      footer={
        <>
          <Button
            variant="danger"
            disabled={!reason.trim() || decide.isPending}
            onClick={() => decide.mutate({ actor, id: category.id, decision: 'TOLAK', reason }, { onSuccess: close })}
          >
            Reject
          </Button>
          <Button
            disabled={Boolean(reason.trim()) || decide.isPending}
            onClick={() =>
              decide.mutate(
                { actor, id: category.id, decision: 'SETUJU', ack: pending.acknowledgedImpactCount },
                { onSuccess: close },
              )
            }
          >
            Approve
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={decide.error} />
        <div className="flex flex-col gap-2 rounded-md border border-fog px-3 py-2 font-body text-[13px]">
          {pending.kind === 'READERS' ? (
            <span>
              Reader roles: <span className="text-fg-3">{category.readerRoles.join(', ') || '—'}</span> →{' '}
              <strong>{pending.readerRoles?.join(', ') || '—'}</strong>
            </span>
          ) : (
            changes.map(([key, value]) => (
              <span key={key}>
                {key}:{' '}
                <span className="text-fg-3">
                  {String(
                    Array.isArray(category[key as keyof CategoryAttributes])
                      ? (category[key as keyof CategoryAttributes] as string[]).map(mimeLabel).join(', ')
                      : category[key as keyof CategoryAttributes],
                  )}
                </span>{' '}
                →{' '}
                <strong>{String(Array.isArray(value) ? (value as string[]).map(mimeLabel).join(', ') : value)}</strong>
              </span>
            ))
          )}
        </div>
        <GovNote tone="warn">
          The proposer acknowledged <strong>{pending.acknowledgedImpactCount}</strong> affected documents. Approving
          sends the same number back — a mismatch is refused.
        </GovNote>
        <Field label="Reason for rejection" hint="Only when rejecting.">
          <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <StatusBadge tone="warn">Awaiting approval</StatusBadge>
      </div>
    </Modal>
  );
}
