import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Field, SelectRow } from '@/features/company/components/CompanyBits';
import { ClassBadge, OriginBadge, ScanBadge, StorageBadge } from '@/features/documents/components/DocBits';
import { DocumentDetailModal } from '@/features/documents/components/DocumentDetailModal';
import { DocumentViewer } from '@/features/documents/components/DocumentViewer';
import type { ViewerTarget } from '@/features/documents/components/DocumentViewer';
import { useDocumentSearch, useSelectableCategories } from '@/features/documents/hooks/useDocuments';
import { formatBytes, isRetrievable } from '@/features/documents/rules';
import { OBJECT_KIND_LABEL, ORIGIN_LABEL } from '@/features/documents/types';
import type { DocActor, DocumentItem, DocumentSearch, Origin, OwnerType } from '@/features/documents/types';
import { formatDate, formatDateTime } from '@/lib/format';

interface Filters {
  categoryId: string;
  origin: '' | Origin;
  startDate: string;
  endDate: string;
}

const EMPTY: Filters = { categoryId: '', origin: '', startDate: '', endDate: '' };

/**
 * Grid katalog berkas bersama — Company/Employee/Other/ESS Files memakai SATU kontrak (`A3`/`A4`/`A2`);
 * yang berbeda hanya `owner_type`(+`owner_id`) dan kolom yang sengaja dikurangi per layar.
 * Nol tombol unggah dan nol hapus: unggah lewat service pemilik data, berkas lenyap lewat sapuan.
 */
export function DocumentCatalog({
  actor,
  ownerType,
  ownerId,
  extraQuery,
  extraFilters,
  extraActive = 0,
  onResetExtra,
  title,
  sub,
  showOrigin = false,
  showStorage = false,
  showObjectKind = false,
  ownerCaption,
  actions,
  newIds,
}: {
  actor: DocActor;
  ownerType: OwnerType;
  ownerId?: string;
  extraQuery?: Partial<DocumentSearch>;
  extraFilters?: ReactNode;
  extraActive?: number;
  onResetExtra?: () => void;
  title: string;
  sub: string;
  showOrigin?: boolean;
  showStorage?: boolean;
  showObjectKind?: boolean;
  ownerCaption?: (row: DocumentItem) => string;
  actions?: ReactNode;
  newIds?: Set<string>;
}) {
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ViewerTarget | null>(null);

  const categories = useSelectableCategories(actor);
  const query: DocumentSearch = {
    ownerType,
    ownerId,
    keyword: keyword.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    origin: filters.origin || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    ...extraQuery,
  };
  const search = useDocumentSearch(actor, query);
  const rows = useMemo(() => search.data ?? [], [search.data]);
  const paged = usePagedRows(rows);

  const active =
    extraActive + [filters.categoryId, filters.origin, filters.startDate || filters.endDate].filter(Boolean).length;
  const categoryName = categories.data?.find((row) => row.id === filters.categoryId)?.categoryName;
  const summary = [
    categoryName,
    filters.origin && ORIGIN_LABEL[filters.origin],
    (filters.startDate || filters.endDate) &&
      `${filters.startDate ? formatDate(filters.startDate) : '…'} – ${filters.endDate ? formatDate(filters.endDate) : '…'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    paged.resetPage();
  };

  const columns: Column<DocumentItem>[] = [
    {
      key: 'name',
      header: 'File name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.activeVersion.originalFilename}</span>
          <span className="text-xs text-fg-3">v{row.activeVersion.versionNo}</span>
          {newIds?.has(row.documentId) && <StatusBadge tone="brand">New</StatusBadge>}
        </div>
      ),
    },
    ...(showObjectKind
      ? [
          {
            key: 'kind',
            header: 'Object',
            render: (row: DocumentItem) =>
              `${row.ownerObjectKind ? OBJECT_KIND_LABEL[row.ownerObjectKind] : '—'}${ownerCaption ? ` · ${ownerCaption(row)}` : ''}`,
          },
        ]
      : []),
    { key: 'category', header: 'Category', render: (row) => row.categoryName },
    ...(showOrigin
      ? [{ key: 'origin', header: 'Origin', render: (row: DocumentItem) => <OriginBadge value={row.origin} /> }]
      : []),
    { key: 'class', header: 'Class', render: (row) => <ClassBadge value={row.confidentialityClassEffective} /> },
    { key: 'scan', header: 'Scan', render: (row) => <ScanBadge value={row.activeVersion.scanState} /> },
    ...(showStorage
      ? [
          {
            key: 'tier',
            header: 'Storage',
            render: (row: DocumentItem) => <StorageBadge value={row.activeVersion.storageTier} />,
          },
        ]
      : []),
    {
      key: 'size',
      header: 'Size',
      align: 'right',
      nowrap: true,
      render: (row) => formatBytes(row.activeVersion.sizeBytes),
    },
    { key: 'created', header: 'Created', muted: true, nowrap: true, render: (row) => formatDateTime(row.createdAt) },
  ];

  const open = (row: DocumentItem) =>
    setViewing({ documentId: row.documentId, filename: row.activeVersion.originalFilename });

  return (
    <>
      <Card>
        <CardHead title={title} sub={sub} />
        <div>
          <TableToolbar
            filters={
              <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                {active > 0 ? `Filter (${active})` : 'Filter'}
              </Button>
            }
            summary={summary || undefined}
            search={{
              value: keyword,
              onChange: (value) => {
                setKeyword(value);
                paged.resetPage();
              },
              placeholder: 'Search file name…',
            }}
            actions={actions}
          />
          <DataTable<DocumentItem>
            rows={paged.rows}
            rowKey={(row) => row.documentId}
            loading={search.isLoading}
            empty={search.error ? search.error.message : 'No files match this filter.'}
            columns={columns}
            actions={(row) =>
              isRetrievable(row.activeVersion.scanState) ? (
                <RowActions
                  actions={[
                    { label: 'Detail', onSelect: () => setDetailId(row.documentId) },
                    { label: 'Open file', onSelect: () => open(row) },
                  ]}
                />
              ) : (
                <RowButton onClick={() => setDetailId(row.documentId)}>Detail</RowButton>
              )
            }
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="files"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <FilterModal
        open={filterOpen}
        title="Filter files"
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilters(EMPTY);
          onResetExtra?.();
          paged.resetPage();
        }}
      >
        {extraFilters}
        <SelectRow
          label="Category"
          allowEmpty
          emptyLabel="All categories"
          value={filters.categoryId}
          onChange={(value) => setFilter('categoryId', value)}
          options={(categories.data ?? []).map((row) => ({ value: row.id, label: row.categoryName }))}
        />
        {showOrigin && (
          <SelectRow
            label="Origin"
            allowEmpty
            emptyLabel="All origins"
            value={filters.origin}
            onChange={(value) => setFilter('origin', value as Filters['origin'])}
            options={(Object.keys(ORIGIN_LABEL) as Origin[]).map((value) => ({ value, label: ORIGIN_LABEL[value] }))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Created from">
            <DatePicker value={filters.startDate} onChange={(value) => setFilter('startDate', value)} />
          </Field>
          <Field label="Created to">
            <DatePicker
              value={filters.endDate}
              min={filters.startDate || undefined}
              onChange={(value) => setFilter('endDate', value)}
            />
          </Field>
        </div>
      </FilterModal>

      <DocumentDetailModal
        actor={actor}
        documentId={detailId}
        onOpenContent={(target) => setViewing(target)}
        onClose={() => setDetailId(null)}
      />
      <DocumentViewer actor={actor} target={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
