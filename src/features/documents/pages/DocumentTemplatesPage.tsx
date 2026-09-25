import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Field, FieldGrid, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { ActorSelect, VersionStateBadge } from '@/features/documents/components/DocBits';
import {
  useAddTemplateVersion,
  useCreateTemplate,
  useDeactivateTemplate,
  useDecideTemplate,
  useManageableCategories,
  useTemplate,
  useTemplates,
} from '@/features/documents/hooks/useDocuments';
import { VIEWERS } from '@/features/documents/mock-data';
import { canApproveTemplates, canEditTemplates, canReadTemplates } from '@/features/documents/rules';
import { SCOPE_LABEL, TARGET_LABEL } from '@/features/documents/types';
import type {
  DocActor,
  LetterTarget,
  SignerScope,
  TemplateDraft,
  TemplateListItem,
  TemplateVersion,
} from '@/features/documents/types';
import { formatDateTime } from '@/lib/format';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-4">{label}</span>
      <span className="font-body text-[13px] font-medium text-fg-1">{children}</span>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
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

const EMPTY_DRAFT: TemplateDraft = {
  templateName: '',
  categoryId: '',
  letterTarget: 'PERORANGAN',
  signerScope: 'KANTOR_PUSAT',
  isSelfRequestable: false,
  requiresApproval: false,
  body: '',
};

/** `S3` Buat Templat (`A8b`) — naskah v1 lahir menunggu persetujuan orang kedua. */
function CreateTemplateModal({ actor, open, onClose }: { actor: DocActor; open: boolean; onClose: () => void }) {
  const create = useCreateTemplate();
  const categories = useManageableCategories(actor, open);
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_DRAFT);
  useEffect(() => {
    if (open) setDraft(EMPTY_DRAFT);
  }, [open]);
  const set = <K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New template"
      description="Target and signer scope belong to the template, not to whoever issues the letter."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={() => create.mutate({ actor, draft }, { onSuccess: onClose })}>
            {create.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <FieldGrid>
        <TextRow
          label="Template name"
          required
          value={draft.templateName}
          onChange={(value) => set('templateName', value)}
        />
        <SelectRow
          label="Category"
          required
          placeholder="Select a category"
          value={draft.categoryId}
          onChange={(value) => set('categoryId', value)}
          options={(categories.data ?? []).map((row) => ({
            value: row.id,
            label: `${row.categoryName} · ${row.retentionRegime === 'PERMANENT' ? 'Permanent' : 'Temporary'}`,
          }))}
        />
      </FieldGrid>
      <div className="flex flex-wrap gap-6">
        <Field label="Target" required>
          <Segmented<LetterTarget>
            value={draft.letterTarget}
            onChange={(value) => set('letterTarget', value)}
            options={(['PERORANGAN', 'EDARAN'] as LetterTarget[]).map((value) => ({
              value,
              label: TARGET_LABEL[value],
            }))}
          />
        </Field>
        <Field label="Signer scope" required>
          <Segmented<SignerScope>
            value={draft.signerScope}
            onChange={(value) => set('signerScope', value)}
            options={(['KANTOR_PUSAT', 'CABANG'] as SignerScope[]).map((value) => ({
              value,
              label: SCOPE_LABEL[value],
            }))}
          />
        </Field>
      </div>
      <Toggle
        checked={draft.isSelfRequestable}
        onChange={(value) =>
          setDraft((prev) => ({
            ...prev,
            isSelfRequestable: value,
            requiresApproval: value ? false : prev.requiresApproval,
          }))
        }
        label="Employees can request it themselves"
        hint="Cannot be combined with “Requires approval”."
      />
      <Toggle
        checked={draft.requiresApproval}
        onChange={(value) =>
          setDraft((prev) => ({
            ...prev,
            requiresApproval: value,
            isSelfRequestable: value ? false : prev.isSelfRequestable,
          }))
        }
        label="Requires approval before issuing"
        hint="Permanent categories always require approval, even when this is off."
      />
      <Field
        label="Letter body"
        required
        hint="Use %%placeholder%% markers, e.g. %%nama_karyawan%%. Max 100,000 characters."
      >
        <Textarea rows={8} value={draft.body} onChange={(event) => set('body', event.target.value)} />
      </Field>
    </Modal>
  );
}

/** `S4` Naskah versi baru (`A8c`) — penunjuk versi aktif tidak bergeser sampai disetujui. */
function NewVersionModal({
  actor,
  template,
  onClose,
}: {
  actor: DocActor;
  template: { id: string; templateName: string; body: string } | null;
  onClose: () => void;
}) {
  const add = useAddTemplateVersion();
  const [body, setBody] = useState('');
  useEffect(() => {
    if (template) setBody(template.body);
  }, [template]);
  if (!template) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`New body version — ${template.templateName}`}
      description="The current active version keeps being used until this version is approved."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={add.isPending}
            onClick={() => add.mutate({ actor, id: template.id, body }, { onSuccess: onClose })}
          >
            {add.isPending ? 'Submitting…' : 'Submit body'}
          </Button>
        </>
      }
    >
      <Field label="Letter body" required hint="Submit the full body, not only the changed part.">
        <Textarea rows={10} value={body} onChange={(event) => setBody(event.target.value)} />
      </Field>
    </Modal>
  );
}

/** `S5` Keputusan orang kedua (`A9`) — alasan wajib bila ditolak, dilarang bila disetujui. */
function DecideModal({
  actor,
  templateId,
  version,
  onClose,
}: {
  actor: DocActor;
  templateId: string;
  version: TemplateVersion | null;
  onClose: () => void;
}) {
  const decide = useDecideTemplate();
  const [decision, setDecision] = useState<'DISETUJUI' | 'DITOLAK'>('DISETUJUI');
  const [reason, setReason] = useState('');
  useEffect(() => {
    setDecision('DISETUJUI');
    setReason('');
  }, [version]);
  if (!version) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Decide version ${version.versionNo}`}
      description={`Written by ${version.createdBy.nama} (NIK ${version.createdBy.nik}). The reviewer must be a different person.`}
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                {
                  actor,
                  id: templateId,
                  versionNo: version.versionNo,
                  decision,
                  rejectReason: decision === 'DITOLAK' ? reason : undefined,
                },
                { onSuccess: onClose },
              )
            }
          >
            {decision === 'DISETUJUI' ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <pre className="m-0 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md border border-border-1 bg-vapor p-4 font-mono text-xs text-fg-1">
        {version.body}
      </pre>
      <Field label="Decision" required>
        <Segmented<'DISETUJUI' | 'DITOLAK'>
          value={decision}
          onChange={setDecision}
          options={[
            { value: 'DISETUJUI', label: 'Approve' },
            { value: 'DITOLAK', label: 'Reject' },
          ]}
        />
      </Field>
      {decision === 'DITOLAK' && (
        <Field label="Rejection reason" required>
          <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      )}
    </Modal>
  );
}

/** `S2` Detail + riwayat naskah (`A8e`) — seluruh versi, naskah utuh. */
function TemplateDetailModal({
  actor,
  templateId,
  onNewVersion,
  onClose,
}: {
  actor: DocActor;
  templateId: string | null;
  onNewVersion: (template: { id: string; templateName: string; body: string }) => void;
  onClose: () => void;
}) {
  const detail = useTemplate(actor, templateId);
  const [deciding, setDeciding] = useState<TemplateVersion | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const row = detail.data;
  if (!templateId) return null;

  const latestBody = row?.versions[0]?.body ?? '';

  return (
    <>
      <Modal
        open
        onOpenChange={(next) => !next && onClose()}
        title={row?.templateName ?? 'Template detail'}
        description="Every body version is kept. Letters can still be regenerated from older approved versions."
        size="wide"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {row && canEditTemplates(actor.role) && row.isActive && (
              <Button onClick={() => onNewVersion({ id: row.id, templateName: row.templateName, body: latestBody })}>
                New body version
              </Button>
            )}
          </>
        }
      >
        {!row ? (
          <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">
            {detail.error ? detail.error.message : 'Loading…'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              <Info label="Category">{row.categoryName}</Info>
              <Info label="Retention">{row.categoryRetentionRegime === 'PERMANENT' ? 'Permanent' : 'Temporary'}</Info>
              <Info label="Target">{TARGET_LABEL[row.letterTarget]}</Info>
              <Info label="Signer scope">{SCOPE_LABEL[row.signerScope]}</Info>
              <Info label="Self-requestable">{yesNo(row.isSelfRequestable)}</Info>
              <Info label="Requires approval">{yesNo(row.requiresApproval)}</Info>
              <Info label="Status">
                <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
              </Info>
              <Info label="Active version">{row.activeVersionNo ? `v${row.activeVersionNo}` : 'Cannot issue yet'}</Info>
            </div>

            <div className="flex flex-col gap-2">
              {row.versions.map((ver) => (
                <div key={ver.versionId} className="rounded-lg border border-border-1 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-body text-[13px] font-bold text-fg-1">v{ver.versionNo}</span>
                      <VersionStateBadge value={ver.templateVersionState} />
                      {ver.isActiveVersion && <StatusBadge tone="info">Active</StatusBadge>}
                      <span className="font-body text-xs font-medium text-fg-3">
                        {ver.createdBy.nama} · NIK {ver.createdBy.nik} · {formatDateTime(ver.createdAt)}
                        {ver.approvedBy ? ` · approved by ${ver.approvedBy.nama} (NIK ${ver.approvedBy.nik})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setExpanded(expanded === ver.versionNo ? null : ver.versionNo)}
                      >
                        {expanded === ver.versionNo ? 'Hide body' : 'Show body'}
                      </Button>
                      {canApproveTemplates(actor.role) && ver.templateVersionState === 'MENUNGGU_PERSETUJUAN' && (
                        <Button onClick={() => setDeciding(ver)}>Decide</Button>
                      )}
                    </div>
                  </div>
                  {expanded === ver.versionNo && (
                    <pre className="mb-0 mt-3 max-h-[240px] overflow-auto whitespace-pre-wrap rounded-md bg-vapor p-3 font-mono text-xs text-fg-1">
                      {ver.body}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
      {row && <DecideModal actor={actor} templateId={row.id} version={deciding} onClose={() => setDeciding(null)} />}
    </>
  );
}

/**
 * Company Management › Files › Document Templates (Pustaka Naskah) — FSD-DOCUMENT §4 · UIC §3.
 * HR Manager menyunting (buat, naskah baru, nonaktifkan); Super Admin orang kedua. HR Staff nol akses.
 */
export function DocumentTemplatesPage() {
  const [actor, setActor] = useState<DocActor>(VIEWERS.templates[0]);
  const readable = canReadTemplates(actor.role);
  const editable = canEditTemplates(actor.role);
  const list = useTemplates(actor);
  const deactivate = useDeactivateTemplate();
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [versioning, setVersioning] = useState<{ id: string; templateName: string; body: string } | null>(null);
  const [deactivating, setDeactivating] = useState<TemplateListItem | null>(null);

  const rows = useMemo(() => (readable ? (list.data ?? []) : []), [list.data, readable]);
  const paged = usePagedRows(rows);

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Files' }, { label: 'Document Templates' }]}
      title="Document Templates"
      description="Letter templates and their body versions. Every new body needs a second person to approve it before letters can use it."
      actions={<ActorSelect actors={VIEWERS.templates} value={actor} onChange={setActor} />}
    >
      {!readable ? (
        <Card>
          <EmptyState
            title="No access"
            description="HR Staff choose templates while issuing letters, but cannot read or edit template bodies."
          />
        </Card>
      ) : (
        <Card>
          <CardHead title="Active templates" sub="Inactive templates are not listed and cannot be reactivated" />
          <div>
            <TableToolbar
              actions={editable ? <AddButton onClick={() => setCreating(true)}>New template</AddButton> : undefined}
            />
            <DataTable<TemplateListItem>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={list.isLoading}
              empty="No active templates."
              columns={[
                { key: 'name', header: 'Template name', strong: true, render: (row) => row.templateName },
                { key: 'target', header: 'Target', render: (row) => TARGET_LABEL[row.letterTarget] },
                { key: 'scope', header: 'Signer scope', render: (row) => SCOPE_LABEL[row.signerScope] },
                { key: 'self', header: 'Self-requestable', render: (row) => yesNo(row.isSelfRequestable) },
                { key: 'approval', header: 'Requires approval', render: (row) => yesNo(row.requiresApproval) },
                {
                  key: 'active',
                  header: 'Active version',
                  render: (row) =>
                    row.activeVersionNo ? (
                      <StatusBadge tone="ok">v{row.activeVersionNo}</StatusBadge>
                    ) : (
                      <StatusBadge tone="warn">Cannot issue yet</StatusBadge>
                    ),
                },
              ]}
              actions={(row) =>
                editable ? (
                  <RowActions
                    actions={[
                      { label: 'Detail', onSelect: () => setDetailId(row.id) },
                      { label: 'Deactivate', danger: true, onSelect: () => setDeactivating(row) },
                    ]}
                  />
                ) : (
                  <RowButton onClick={() => setDetailId(row.id)}>Detail</RowButton>
                )
              }
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="templates"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      )}

      <CreateTemplateModal actor={actor} open={creating} onClose={() => setCreating(false)} />
      <TemplateDetailModal
        actor={actor}
        templateId={detailId}
        onNewVersion={(template) => setVersioning(template)}
        onClose={() => setDetailId(null)}
      />
      <NewVersionModal actor={actor} template={versioning} onClose={() => setVersioning(null)} />
      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Deactivate this template?"
        description={
          deactivating
            ? `${deactivating.templateName} will no longer be listed or usable for new letters. There is no reactivation.`
            : undefined
        }
        confirmLabel="Deactivate"
        tone="danger"
        loading={deactivate.isPending}
        onOpenChange={(open) => !open && setDeactivating(null)}
        onConfirm={() =>
          deactivating && deactivate.mutate({ actor, id: deactivating.id }, { onSuccess: () => setDeactivating(null) })
        }
      />
    </PageShell>
  );
}
