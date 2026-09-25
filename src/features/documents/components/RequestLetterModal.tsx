import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Field, SelectRow } from '@/features/company/components/CompanyBits';
import { useIssuableTemplates, useRequestLetter } from '@/features/documents/hooks/useDocuments';
import type { DocActor } from '@/features/documents/types';

/**
 * Minta Surat, jalur mandiri (FSD-DOCUMENT §6 `S4`) — dua medan: jenis surat (`A15`, tersaring
 * bisa-diminta-sendiri + kategori TEMPORARY) dan pokok surat yang TERKUNCI ke diri sendiri.
 * `subject_employee_id` tidak pernah dikirim; server mengambilnya dari token.
 */
export function RequestLetterModal({
  actor,
  open,
  onClose,
  onIssued,
}: {
  actor: DocActor;
  open: boolean;
  onClose: () => void;
  onIssued: (documentId: string) => void;
}) {
  const issuable = useIssuableTemplates(actor, open);
  const request = useRequestLetter();
  const [templateId, setTemplateId] = useState('');

  useEffect(() => {
    if (open) setTemplateId('');
  }, [open]);

  const chosen = issuable.data?.find((row) => row.id === templateId);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Request letter"
      description="Letters you request are always about yourself."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!templateId || request.isPending}
            onClick={() =>
              request.mutate(
                { actor, templateId },
                {
                  onSuccess: (result) => {
                    if (result.documentId) onIssued(result.documentId);
                    onClose();
                  },
                },
              )
            }
          >
            {request.isPending ? 'Submitting…' : 'Request'}
          </Button>
        </>
      }
    >
      <SelectRow
        label="Letter type"
        required
        placeholder="Select a letter"
        value={templateId}
        onChange={setTemplateId}
        options={(issuable.data ?? []).map((row) => ({ value: row.id, label: row.templateName }))}
        hint={issuable.data && !issuable.data.length ? 'No letter can be requested by yourself right now.' : undefined}
      />
      {chosen && (
        <div>
          <StatusBadge tone={chosen.effectiveRequiresApproval ? 'warn' : 'ok'}>
            {chosen.effectiveRequiresApproval ? 'Needs approval' : 'Issued instantly'}
          </StatusBadge>
        </div>
      )}
      <Field label="Subject">
        <span className="flex h-9 items-center rounded-md border border-silver bg-vapor px-3 font-body text-xs font-medium text-fg-2">
          {actor.label} (yourself)
        </span>
      </Field>
    </Modal>
  );
}
