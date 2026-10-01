import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { FilterModal } from '@/components/FilterModal';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { EmployeeRow, SelectRow } from '@/features/company/components/CompanyBits';
import { GovActorPicker, GovError, GovNote, NoMenuRowBanner } from '@/features/documents/components/GovBits';
import {
  BatchDecisionModal,
  BatchReportModal,
  BatchSubmitModal,
  IssueLetterModal,
  LetterDecisionModal,
} from '@/features/documents/components/LetterModals';
import { DOC_PEOPLE_SOURCE, GOV_VIEWERS } from '@/features/documents/governance-data';
import { useBatches, useOfficerTemplates, usePendingLetters } from '@/features/documents/hooks/useGovernance';
import { personName } from '@/features/documents/services/document.service';
import { BATCH_STATE_LABEL } from '@/features/documents/types';
import type { BatchState, DocActor, Letter, LetterBatch } from '@/features/documents/types';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/services/api';

type Tab = 'SINGLE' | 'BULK';

const BATCH_TONE: Record<BatchState, 'warn' | 'info' | 'brand' | 'ok' | 'err'> = {
  MENUNGGU_PERSETUJUAN: 'warn',
  DISETUJUI: 'info',
  BERJALAN: 'brand',
  SELESAI: 'ok',
  DITOLAK: 'err',
};

function SingleTab({ actor }: { actor: DocActor }) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [deciding, setDeciding] = useState<Letter | null>(null);
  const pending = usePendingLetters(actor);
  const canIssue = actor.role === 'ROLE_HR_STAFF' || actor.role === 'ROLE_HR_MANAGER';
  const canDecide = actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_SUPER_ADMIN';
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHead title="Issue a letter" sub="Individual letter or circular, from an approved template" />
          <div className="flex flex-col gap-3">
            <GovNote>
              Templates without an approval gate issue immediately with a number and verification code. Templates in a
              permanent category, or flagged for approval, wait for an HR Manager other than you.
            </GovNote>
            <div>
              {canIssue ? (
                <AddButton onClick={() => setIssueOpen(true)}>Issue letter</AddButton>
              ) : (
                <GovNote tone="warn">The Super Admin approves as backup but does not issue letters.</GovNote>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Cancelling a letter" sub="Done from the file, not here" />
          <GovNote>
            Open the letter’s file in Employee Files and use <strong>Cancel letter</strong>. The file stays; public
            verification shows the letter as cancelled without the reason.
          </GovNote>
        </Card>
      </div>
      <Card>
        <CardHead title="Waiting for approval" sub="Gated letters have no number or file until they are decided" />
        {pending.error ? (
          <GovError error={pending.error} />
        ) : (
          <DataTable<Letter>
            rows={pending.data ?? []}
            rowKey={(row) => row.letterId}
            loading={pending.isLoading}
            empty="No letter is waiting for approval."
            columns={[
              { key: 'template', header: 'Template', strong: true, render: (row) => row.templateName },
              { key: 'subject', header: 'Employee', render: (row) => personName(row.subjectEmployeeId) },
              { key: 'by', header: 'Requested by', render: (row) => row.createdBy.nama },
              {
                key: 'at',
                header: 'Requested at',
                nowrap: true,
                muted: true,
                render: (row) => formatDateTime(row.createdAt),
              },
            ]}
            actions={canDecide ? (row) => <RowButton onClick={() => setDeciding(row)}>Decide</RowButton> : undefined}
          />
        )}
      </Card>
      <IssueLetterModal actor={actor} open={issueOpen} onClose={() => setIssueOpen(false)} />
      <LetterDecisionModal actor={actor} letter={deciding} onClose={() => setDeciding(null)} />
    </div>
  );
}

function BulkTab({ actor }: { actor: DocActor }) {
  const [state, setState] = useState<'' | BatchState>('');
  const [templateId, setTemplateId] = useState('');
  const [submitter, setSubmitter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<LetterBatch | null>(null);
  const templates = useOfficerTemplates(actor);
  const batches = useBatches(actor, {
    batchState: state || undefined,
    templateId: templateId || undefined,
    submittedByEmployeeId: submitter || undefined,
  });
  const canSubmit = actor.role === 'ROLE_HR_STAFF' || actor.role === 'ROLE_HR_MANAGER';
  const canDecide = actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_SUPER_ADMIN';
  const active = [state, templateId, submitter].filter(Boolean).length;
  const summary = [
    state && BATCH_STATE_LABEL[state],
    templateId && templates.data?.find((row) => row.id === templateId)?.templateName,
    submitter && personName(submitter),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <Card>
        <CardHead
          title="Bulk issuance"
          sub="Every batch of the company, newest first — rejected batches are only found here"
        />
        <div>
          <TableToolbar
            filters={
              <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                {active ? `Filter (${active})` : 'Filter'}
              </Button>
            }
            summary={summary || undefined}
            actions={
              canSubmit ? <AddButton onClick={() => setSubmitOpen(true)}>Submit bulk issuance</AddButton> : undefined
            }
          />
          {batches.error ? (
            <GovError error={batches.error} />
          ) : (
            <DataTable<LetterBatch>
              rows={batches.data ?? []}
              rowKey={(row) => row.id}
              loading={batches.isLoading}
              empty="No batch matches this filter."
              columns={[
                {
                  key: 'code',
                  header: 'Batch',
                  nowrap: true,
                  render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                },
                { key: 'template', header: 'Template', strong: true, render: (row) => row.templateName },
                { key: 'count', header: 'Recipients', align: 'right', render: (row) => row.recipientCount },
                {
                  key: 'state',
                  header: 'Status',
                  render: (row) => (
                    <StatusBadge tone={BATCH_TONE[row.batchState]}>{BATCH_STATE_LABEL[row.batchState]}</StatusBadge>
                  ),
                },
                {
                  key: 'submitted',
                  header: 'Submitted',
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span>{row.createdBy.nama}</span>
                      <span className="text-xs text-fg-3">{formatDateTime(row.submittedAt)}</span>
                    </span>
                  ),
                },
                { key: 'decided', header: 'Decided by', muted: true, render: (row) => row.approvedBy?.nama ?? '—' },
              ]}
              actions={(row) =>
                canDecide && row.batchState === 'MENUNGGU_PERSETUJUAN' ? (
                  <RowActions
                    actions={[
                      { label: 'Report', onSelect: () => setReportId(row.id) },
                      { label: 'Decide', onSelect: () => setDeciding(row) },
                    ]}
                  />
                ) : (
                  <RowButton onClick={() => setReportId(row.id)}>Report</RowButton>
                )
              }
            />
          )}
        </div>
      </Card>
      <FilterModal
        open={filterOpen}
        title="Filter batches"
        onOpenChange={setFilterOpen}
        onReset={() => {
          setState('');
          setTemplateId('');
          setSubmitter('');
        }}
      >
        <SelectRow
          label="Status"
          allowEmpty
          emptyLabel="All status"
          value={state}
          onChange={(value) => setState(value as '' | BatchState)}
          options={(Object.keys(BATCH_STATE_LABEL) as BatchState[]).map((value) => ({
            value,
            label: BATCH_STATE_LABEL[value],
          }))}
        />
        <SelectRow
          label="Template"
          allowEmpty
          emptyLabel="All templates"
          value={templateId}
          onChange={setTemplateId}
          options={(templates.data ?? []).map((row) => ({ value: row.id, label: row.templateName }))}
        />
        <EmployeeRow
          label="Submitted by"
          lang="en"
          emptyLabel="Anyone"
          value={submitter}
          onChange={setSubmitter}
          source={DOC_PEOPLE_SOURCE}
        />
      </FilterModal>
      <BatchSubmitModal actor={actor} open={submitOpen} onClose={() => setSubmitOpen(false)} />
      <BatchReportModal actor={actor} batchId={reportId} onClose={() => setReportId(null)} />
      <BatchDecisionModal actor={actor} batch={deciding} onClose={() => setDeciding(null)} />
    </>
  );
}

/**
 * Company Management › Files › Letter Issuance — FSD-001-DOCUMENT-0.8 §5 · UIC-001-DOCUMENT-0.6 §4.
 * Sub-modul ketiga, terpisah dari Pustaka Naskah. Belum punya baris menu (PROB-SERVICE-356).
 */
export function LetterIssuancePage() {
  const viewers = GOV_VIEWERS.letters;
  const [actor, setActor] = useState<DocActor>(viewers[0]);
  const [tab, setTab] = useState<Tab>('SINGLE');
  const templates = useOfficerTemplates(actor);
  const forbidden =
    templates.error instanceof ApiError && templates.error.status === 403 && actor.role !== 'ROLE_SUPER_ADMIN';
  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Files' }, { label: 'Letter Issuance' }]}
      title="Letter Issuance"
      description="Issue letters from approved templates, one at a time or in bulk."
      actions={<GovActorPicker viewers={viewers} actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <NoMenuRowBanner problem="PROB-SERVICE-356" />
        {forbidden ? (
          <Card>
            <EmptyState title="403 — not allowed" description={templates.error?.message} />
          </Card>
        ) : (
          <>
            <TabMenu<Tab>
              value={tab}
              onChange={setTab}
              items={[
                { value: 'SINGLE', label: 'Single letter' },
                { value: 'BULK', label: 'Bulk issuance' },
              ]}
            />
            {tab === 'SINGLE' ? (
              <SingleTab key={actor.employeeId} actor={actor} />
            ) : (
              <BulkTab key={actor.employeeId} actor={actor} />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
