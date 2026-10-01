import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { AddButton, RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AnswerModal, FormComposerModal, FormDetailModal } from '@/features/productivity/components/FormModals';
import { Note, ProdActorPicker } from '@/features/productivity/components/ProdBits';
import { useDistributions, useForms } from '@/features/productivity/hooks/useForms';
import { AUDIENCE_LABEL, FORM_STATE_META, IDENTITY_META, OBLIGATION_META } from '@/features/productivity/rules';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { Form, FormDistribution } from '@/features/productivity/types';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/services/api';

const CRUMBS = [{ label: 'Productivity' }, { label: 'Forms & Survey' }];

type SubmissionView = 'NAMED' | 'ANONYMOUS';

/**
 * Productivity › Forms & Survey › Forms — FSD-001-PRODUCTIVITY-0.2 §10. HR Manager menyusun; HR membaca jawaban
 * (menyempit ke HR Manager + Health Data Officer bila sensitif); atasan berjenjang hanya agregat. Satu aksi per baris.
 */
export function FormsPage() {
  const { actor } = useProdActor();
  const [keyword, setKeyword] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const forms = useForms(actor, keyword);
  const rows = forms.data ?? [];
  const paged = usePagedRows(rows);
  const forbidden = forms.error instanceof ApiError && forms.error.status === 403;
  const open = rows.find((row) => row.id === openId) ?? null;
  const manager = actor.role === 'ROLE_HR_MANAGER';

  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'Forms' }]}
      title="Forms"
      description="Forms and surveys sent to employees. Answers are read by HR; supervisors see numbers only."
      actions={<ProdActorPicker onChange={() => setOpenId(null)} />}
    >
      <div className="flex flex-col gap-5">
        {actor.role === 'ROLE_HEALTH_DATA_OFFICER' && <Note>You see forms marked as sensitive only.</Note>}
        {actor.role === 'ROLE_DEPT_MANAGER' && (
          <Note>Supervisors receive aggregates only — never individual answers.</Note>
        )}
        <Card>
          <CardHead title="Forms" sub="Newest first" />
          <div>
            {forbidden ? (
              <EmptyState title="Forms are managed by HR" description={forms.error?.message} />
            ) : (
              <>
                <TableToolbar
                  search={{
                    value: keyword,
                    onChange: (value) => {
                      setKeyword(value);
                      paged.resetPage();
                    },
                    placeholder: 'Search form…',
                  }}
                  actions={manager ? <AddButton onClick={() => setComposerOpen(true)}>New form</AddButton> : undefined}
                />
                <DataTable<Form>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={forms.isLoading}
                  empty="No form yet."
                  columns={[
                    {
                      key: 'code',
                      header: 'Code',
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                    },
                    {
                      key: 'title',
                      header: 'Form',
                      render: (row) => (
                        <span className="flex flex-col gap-0.5">
                          <span className="font-bold text-fg-1">{row.formTitle}</span>
                          {row.isSensitive && <span className="text-xs font-semibold text-error-700">Sensitive</span>}
                        </span>
                      ),
                    },
                    {
                      key: 'obligation',
                      header: 'Obligation',
                      render: (row) => (
                        <StatusBadge tone={OBLIGATION_META[row.obligation].tone}>
                          {OBLIGATION_META[row.obligation].label}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'identity',
                      header: 'Identity',
                      render: (row) => (
                        <StatusBadge tone={IDENTITY_META[row.identityMode].tone}>
                          {IDENTITY_META[row.identityMode].label}
                        </StatusBadge>
                      ),
                    },
                    { key: 'audience', header: 'Audience', render: (row) => AUDIENCE_LABEL[row.audienceScope] },
                    {
                      key: 'state',
                      header: 'Status',
                      render: (row) => (
                        <StatusBadge tone={FORM_STATE_META[row.state].tone}>
                          {FORM_STATE_META[row.state].label}
                        </StatusBadge>
                      ),
                    },
                    { key: 'count', header: 'Responses', align: 'right', render: (row) => row.submissionCount },
                    {
                      key: 'due',
                      header: 'Due',
                      nowrap: true,
                      muted: true,
                      render: (row) => formatDate(row.responseDueDate),
                    },
                  ]}
                  actions={(row) => (
                    <RowButton onClick={() => setOpenId(row.id)}>
                      {actor.role === 'ROLE_DEPT_MANAGER'
                        ? 'Aggregate'
                        : row.identityMode === 'ANONIM'
                          ? 'Anonymous'
                          : 'View Detail'}
                    </RowButton>
                  )}
                />
                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="forms"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </>
            )}
          </div>
        </Card>
      </div>
      <FormComposerModal actor={actor} open={composerOpen} onClose={() => setComposerOpen(false)} />
      <FormDetailModal actor={actor} form={open} onClose={() => setOpenId(null)} />
    </PageShell>
  );
}

/**
 * Productivity › Forms & Survey › My Submissions — FSD-001-PRODUCTIVITY-0.2 §11. Formulir berindentitas yang
 * menyasar saya (isi/sunting, pemilik saja); formulir anonim terpisah — dapat diisi, tak dapat disunting.
 */
export function MySubmissionsPage() {
  const { actor } = useProdActor();
  const distributions = useDistributions(actor);
  const [answering, setAnswering] = useState<{ formId: string; submissionId: string | null } | null>(null);
  const [view, setView] = useState<SubmissionView>('NAMED');
  const rows = distributions.data ?? [];
  const named = rows.filter((row) => row.identityMode === 'BER_IDENTITAS');
  const anonymous = rows.filter((row) => row.identityMode === 'ANONIM');

  const columns = [
    { key: 'title', header: 'Form', strong: true, render: (row: FormDistribution) => row.formTitle },
    {
      key: 'obligation',
      header: 'Obligation',
      render: (row: FormDistribution) => (
        <StatusBadge tone={OBLIGATION_META[row.obligation].tone}>{OBLIGATION_META[row.obligation].label}</StatusBadge>
      ),
    },
    { key: 'due', header: 'Due', nowrap: true, render: (row: FormDistribution) => formatDate(row.responseDueDate) },
  ];

  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'My Submissions' }]}
      title="My Submissions"
      description="Forms addressed to you. Only you can edit your answers — HR cannot edit them."
      actions={<ProdActorPicker onChange={() => setAnswering(null)} />}
    >
      <div className="flex flex-col gap-5">
        <Note>Forms targeted by position are not shown to employees without a structural position.</Note>
        {/* Dua daftar, satu tampil — dipisah segmented (UI review). */}
        <Segmented<SubmissionView>
          value={view}
          onChange={setView}
          options={[
            { value: 'NAMED', label: `Forms for me (${named.length})` },
            { value: 'ANONYMOUS', label: `Anonymous forms (${anonymous.length})` },
          ]}
        />
        {view === 'NAMED' ? (
        <Card>
          <CardHead title="Forms for me" sub="Soonest due first" />
          <DataTable<FormDistribution>
            rows={named}
            rowKey={(row) => row.formId}
            loading={distributions.isLoading}
            empty="No form is addressed to you right now."
            columns={[
              ...columns,
              {
                key: 'mine',
                header: 'My status',
                render: (row) => (
                  <span className="flex flex-wrap gap-1.5">
                    <StatusBadge tone={row.alreadySubmitted ? 'ok' : 'warn'}>
                      {row.alreadySubmitted ? 'Submitted' : 'Not yet'}
                    </StatusBadge>
                    {row.windowGranted && <StatusBadge tone="brand">Reopened for me</StatusBadge>}
                  </span>
                ),
              },
            ]}
            actions={(row) => (
              <RowButton onClick={() => setAnswering({ formId: row.formId, submissionId: row.submissionId })}>
                {row.alreadySubmitted ? 'Edit answers' : 'Fill in'}
              </RowButton>
            )}
          />
        </Card>
        ) : (
          <Card>
            <CardHead
              title="Anonymous forms"
              sub="Your name is not stored with the answers, so they cannot be listed as yours or edited after sending."
            />
            <DataTable<FormDistribution>
              rows={anonymous}
              rowKey={(row) => row.formId}
              loading={distributions.isLoading}
              empty="No anonymous form is open for you right now."
              columns={columns}
              actions={(row) => (
                <RowButton onClick={() => setAnswering({ formId: row.formId, submissionId: null })}>
                  Fill in anonymously
                </RowButton>
              )}
            />
          </Card>
        )}
      </div>
      <AnswerModal
        actor={actor}
        formId={answering?.formId ?? null}
        submissionId={answering?.submissionId ?? null}
        onClose={() => setAnswering(null)}
      />
    </PageShell>
  );
}
