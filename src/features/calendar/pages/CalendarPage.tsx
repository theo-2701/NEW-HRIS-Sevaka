import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Segmented } from '@/components/Segmented';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  ApprovalBadge,
  HolidayDecisionModal,
  HolidayDeleteModal,
  HolidayDetailModal,
  HolidayFormModal,
  HolidayTags,
  WorkCalendarDeleteModal,
  WorkCalendarFormModal,
  WorkingDaysCell,
} from '@/features/calendar/components/CalendarModals';
import { HolidayFilterFields } from '@/features/calendar/components/HolidayFilters';
import { EffectiveCalendar } from '@/features/calendar/components/EffectiveCalendar';
import {
  EMPTY_HOLIDAY_FILTER,
  countActive,
  summarizeHolidayFilter,
  type HolidayFilterState,
} from '@/features/calendar/calendarFilters';
import { useHolidays, useWorkCalendars } from '@/features/calendar/hooks/useCalendar';
import { ME, scopeName } from '@/features/calendar/mock-data';
import { HOLIDAY_TYPE_LABEL, SCOPE_LEVEL_LABEL } from '@/features/calendar/types';
import type { CalendarHoliday, ScopeLevel, WorkCalendar } from '@/features/calendar/types';
import { formatDate } from '@/lib/format';

type Tab = 'holiday' | 'workcal';
type SubTab = 'patterns' | 'effective';

/**
 * Time › Calendar — port `_prototype/time-calendar.html`
 * (FSD-001-TIME §1 · UIC-001-TIME §2).
 *
 * Dua sumber daya menjawab satu pertanyaan: apakah tanggal ini hari kerja?
 * Libur punya dua lapis — nasional yang disemai sistem, dan regional/company
 * yang baru berlaku setelah maker–checker. Pola kerja menetapkan minggu kerja
 * dan selalu berlaku ke depan.
 */
export function CalendarPage() {
  const [tab, setTab] = useState<Tab>('holiday');
  const [subTab, setSubTab] = useState<SubTab>('patterns');

  const [holidayFilter, setHolidayFilter] = useState<HolidayFilterState>(EMPTY_HOLIDAY_FILTER);
  const [holidayFilterOpen, setHolidayFilterOpen] = useState(false);
  const [holidaySearch, setHolidaySearch] = useState('');
  const [patternScope, setPatternScope] = useState('ALL');
  const [patternSearch, setPatternSearch] = useState('');

  const [holidayForm, setHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CalendarHoliday | null>(null);
  const [detail, setDetail] = useState<CalendarHoliday | null>(null);
  const [deciding, setDeciding] = useState<CalendarHoliday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<CalendarHoliday | null>(null);

  const [patternForm, setPatternForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<WorkCalendar | null>(null);
  const [deletingPattern, setDeletingPattern] = useState<WorkCalendar | null>(null);

  const holidayQuery = useMemo(
    () => ({
      approvalStatus: holidayFilter.approvalStatus === 'ALL' ? undefined : holidayFilter.approvalStatus,
      holidayType: holidayFilter.holidayType === 'ALL' ? undefined : holidayFilter.holidayType,
      from: holidayFilter.from || undefined,
      to: holidayFilter.to || undefined,
      name: holidaySearch.trim() || undefined,
    }),
    [holidayFilter, holidaySearch],
  );

  const patternQuery = useMemo(
    () => ({
      scopeLevel: patternScope === 'ALL' ? undefined : patternScope,
      name: patternSearch.trim() || undefined,
    }),
    [patternScope, patternSearch],
  );

  const { data: holidays = [], isLoading: holidaysLoading } = useHolidays(holidayQuery);
  const { data: patterns = [], isLoading: patternsLoading } = useWorkCalendars(patternQuery);
  const { data: allHolidays = [] } = useHolidays({});
  const { data: allPatterns = [] } = useWorkCalendars({});

  const pagedHolidays = usePagedRows(holidays);
  const pagedPatterns = usePagedRows(patterns);

  const liveCompanyPatterns = allPatterns.filter((row) => row.scopeLevel === 'COMPANY' && !row.effectiveUntil);

  const openHolidayForm = (row: CalendarHoliday | null) => {
    setEditingHoliday(row);
    setHolidayForm(true);
  };

  const openPatternForm = (row: WorkCalendar | null) => {
    setEditingPattern(row);
    setPatternForm(true);
  };

  /** Aksi baris libur mengikuti status + kepemilikan (maker ≠ checker). */
  const holidayActions = (row: CalendarHoliday) => {
    // Baris nasional disemai sistem: hanya jalur baca.
    if (row.isSystem) return <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>;

    if (row.approvalStatus === 'DRAFT') {
      return (
        <RowActions
          actions={[
            { label: 'Edit & submit', onSelect: () => openHolidayForm(row) },
            { label: 'View Detail', onSelect: () => setDetail(row) },
            { label: 'Delete', danger: true, onSelect: () => setDeletingHoliday(row) },
          ]}
        />
      );
    }

    if (row.approvalStatus === 'PENDING_APPROVAL') {
      // Baris yang Anda ajukan sendiri tidak punya aksi keputusan.
      if (row.createdBy === ME) return <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>;
      return (
        <RowActions
          actions={[
            { label: 'Review', onSelect: () => setDeciding(row) },
            { label: 'View Detail', onSelect: () => setDetail(row) },
          ]}
        />
      );
    }

    return (
      <RowActions
        actions={[
          { label: 'View Detail', onSelect: () => setDetail(row) },
          { label: 'Edit', onSelect: () => openHolidayForm(row) },
          { label: 'Delete', danger: true, onSelect: () => setDeletingHoliday(row) },
        ]}
      />
    );
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Calendar' }]}
        title="Calendar"
        description="Dua sumber daya menjawab satu pertanyaan — apakah tanggal ini hari kerja? Libur punya dua lapis: lapis nasional yang disemai otomatis dari keputusan pemerintah, dan lapis regional/company yang diisi HR dan baru berlaku setelah approval maker–checker. Pola kerja menetapkan minggu kerja dan selalu berlaku ke depan."
        actions={
          tab === 'holiday' ? (
            <Button onClick={() => openHolidayForm(null)}>New holiday</Button>
          ) : subTab === 'patterns' ? (
            <Button onClick={() => openPatternForm(null)}>New work pattern</Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'holiday', label: 'Holiday', count: holidays.length },
              { value: 'workcal', label: 'Work Calendar', count: patterns.length },
            ]}
          />

          {tab === 'holiday' && (
            <Card>
              <CardHead title="Holidays" sub="mst_holiday — dua lapis, satu slot per tanggal × tipe × scope" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Button variant="secondary" onClick={() => setHolidayFilterOpen(true)}>
                      {countActive(holidayFilter) > 0 ? `Filter (${countActive(holidayFilter)})` : 'Filter'}
                    </Button>
                  }
                  summary={summarizeHolidayFilter(holidayFilter)}
                  search={{
                    value: holidaySearch,
                    onChange: (value) => {
                      setHolidaySearch(value);
                      pagedHolidays.resetPage();
                    },
                    placeholder: 'Search holiday name',
                  }}
                />

                <DataTable<CalendarHoliday>
                  rows={pagedHolidays.rows}
                  rowKey={(row) => row.id}
                  loading={holidaysLoading}
                  empty="No holiday matches these filters."
                  columns={[
                    {
                      key: 'date',
                      header: 'Date',
                      strong: true,
                      nowrap: true,
                      render: (row) => formatDate(row.holidayDate),
                    },
                    { key: 'name', header: 'Holiday', render: (row) => <HolidayTags row={row} /> },
                    { key: 'type', header: 'Type', render: (row) => HOLIDAY_TYPE_LABEL[row.holidayType] },
                    {
                      key: 'scope',
                      header: 'Scope',
                      muted: true,
                      render: (row) => scopeName(row.scopeLevel, row.scopeRef),
                    },
                    { key: 'source', header: 'Source', muted: true, render: (row) => row.source || '—' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <ApprovalBadge status={row.approvalStatus} />,
                    },
                  ]}
                  actions={holidayActions}
                />

                <Pagination
                  page={pagedHolidays.page}
                  pageSize={pagedHolidays.pageSize}
                  total={pagedHolidays.total}
                  noun="holidays"
                  onPageChange={pagedHolidays.setPage}
                  onPageSizeChange={pagedHolidays.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'workcal' && (
            <div className="flex flex-col gap-5">
              <Segmented<SubTab>
                value={subTab}
                onChange={setSubTab}
                options={[
                  { value: 'patterns', label: 'Working patterns' },
                  { value: 'effective', label: 'Effective calendar' },
                ]}
              />

              {subTab === 'patterns' && (
                <Card>
                  <CardHead title="Working patterns" sub="cnf_work_calendar — selalu berlaku ke depan" />

                  <div className="flex flex-col">
                    <TableToolbar
                      filters={
                        <Select
                          value={patternScope}
                          onValueChange={(value) => {
                            setPatternScope(value);
                            pagedPatterns.resetPage();
                          }}
                        >
                          <SelectTrigger className="h-10 w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All scope levels</SelectItem>
                            {(Object.keys(SCOPE_LEVEL_LABEL) as ScopeLevel[]).map((level) => (
                              <SelectItem key={level} value={level}>
                                {SCOPE_LEVEL_LABEL[level]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                      search={{
                        value: patternSearch,
                        onChange: (value) => {
                          setPatternSearch(value);
                          pagedPatterns.resetPage();
                        },
                        placeholder: 'Search pattern name',
                      }}
                    />

                    <DataTable<WorkCalendar>
                      rows={pagedPatterns.rows}
                      rowKey={(row) => row.id}
                      loading={patternsLoading}
                      empty="No work pattern matches these filters."
                      columns={[
                        { key: 'name', header: 'Pattern', strong: true, render: (row) => row.calendarName },
                        {
                          key: 'scope',
                          header: 'Scope',
                          render: (row) =>
                            `${SCOPE_LEVEL_LABEL[row.scopeLevel]}${row.scopeRef ? ` · ${scopeName(row.scopeLevel, row.scopeRef)}` : ''}`,
                        },
                        {
                          key: 'days',
                          header: 'Working Days',
                          render: (row) => <WorkingDaysCell value={row.workingDays} />,
                        },
                        {
                          key: 'from',
                          header: 'Effective From',
                          nowrap: true,
                          render: (row) => formatDate(row.effectiveFrom),
                        },
                        {
                          key: 'until',
                          header: 'Effective Until',
                          nowrap: true,
                          muted: true,
                          render: (row) => (row.effectiveUntil ? formatDate(row.effectiveUntil) : 'Open-ended'),
                        },
                      ]}
                      actions={(row) => (
                        <RowActions
                          actions={[
                            { label: 'Edit', onSelect: () => openPatternForm(row) },
                            { label: 'Delete', danger: true, onSelect: () => setDeletingPattern(row) },
                          ]}
                        />
                      )}
                    />

                    <Pagination
                      page={pagedPatterns.page}
                      pageSize={pagedPatterns.pageSize}
                      total={pagedPatterns.total}
                      noun="patterns"
                      onPageChange={pagedPatterns.setPage}
                      onPageSizeChange={pagedPatterns.setPageSize}
                    />
                  </div>

                  <Note icon={<Info />}>
                    Hanya nama pola dan tanggal akhir yang bisa diubah setelah tersimpan. Scope, tujuh sakelar hari,
                    dan tanggal mulai beku — mengubah cara satu minggu bekerja berarti baris baru yang berlaku dari
                    tanggal ke depan, sehingga penilaian lampau tidak pernah ditulis ulang. Dua pola aktif pada scope
                    yang sama tidak boleh bertindih (<code>409</code>).
                  </Note>
                </Card>
              )}

              {subTab === 'effective' && (
                <Card>
                  <CardHead title="Effective calendar" sub="FC-01 — lapis mana yang memenangkan tiap hari" />
                  <EffectiveCalendar holidays={allHolidays} calendars={allPatterns} />
                </Card>
              )}
            </div>
          )}
        </div>
      </PageShell>

      <FilterModal
        open={holidayFilterOpen}
        title="Filter holidays"
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setHolidayFilterOpen}
        onReset={() => {
          setHolidayFilter(EMPTY_HOLIDAY_FILTER);
          pagedHolidays.resetPage();
        }}
      >
        <HolidayFilterFields
          value={holidayFilter}
          onChange={(next) => {
            setHolidayFilter(next);
            pagedHolidays.resetPage();
          }}
        />
      </FilterModal>

      <HolidayFormModal open={holidayForm} editing={editingHoliday} onClose={() => setHolidayForm(false)} />
      <HolidayDecisionModal row={deciding} onClose={() => setDeciding(null)} />
      <HolidayDetailModal row={detail} onClose={() => setDetail(null)} />
      <HolidayDeleteModal row={deletingHoliday} onClose={() => setDeletingHoliday(null)} />

      <WorkCalendarFormModal
        open={patternForm}
        editing={editingPattern}
        lastCompanyPattern={
          Boolean(editingPattern && editingPattern.scopeLevel === 'COMPANY') && liveCompanyPatterns.length === 1
        }
        onClose={() => setPatternForm(false)}
      />
      <WorkCalendarDeleteModal row={deletingPattern} onClose={() => setDeletingPattern(null)} />
    </>
  );
}
