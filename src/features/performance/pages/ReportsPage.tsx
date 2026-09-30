import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { AccessLogPanel } from '@/features/performance/components/AccessLogPanel';
import { HrReportsPanel } from '@/features/performance/components/HrReportsPanel';
import { ReviewHistoryPanel, SignalBoardPanel } from '@/features/performance/components/MonitorPanels';
import { NoAccess, PerfActorPicker } from '@/features/performance/components/PerfBits';
import { canReadAccessLog, canReadHrReports, canReadOthersBoard, hasOwnBoard } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import type { PerfRole } from '@/features/performance/types';

type Face = 'board' | 'history' | 'reports' | 'access';

const isSuper = (role: PerfRole) => role === 'ROLE_SUPER_ADMIN';

/**
 * Performance › Monitor & Reports (FSD-001-PERFORMANCE §6 · UIC §7). Satu baris sidebar untuk tiga
 * Sub Menu: Papan Pantau + Riwayat Beku, Laporan HR, Jejak Akses. Lapis baca-dan-rakit — nol CRUD.
 */
export function ReportsPage() {
  const { actor } = usePerfActor();
  const role = actor.role;
  const readsBoards = hasOwnBoard(role) || canReadOthersBoard(role);
  const faces = [
    ...(readsBoards ? [{ value: 'board' as const, label: 'Papan pantau' }] : []),
    ...(readsBoards ? [{ value: 'history' as const, label: 'Riwayat beku' }] : []),
    ...(isSuper(role) || canReadHrReports(role) || role === 'ROLE_DEPT_MANAGER'
      ? [{ value: 'reports' as const, label: 'Laporan HR' }]
      : []),
    ...(isSuper(role) || canReadAccessLog(role) ? [{ value: 'access' as const, label: 'Jejak akses' }] : []),
  ];
  const [picked, setPicked] = useState<Face>('board');
  const face = faces.some((row) => row.value === picked) ? picked : (faces[0]?.value ?? 'board');

  return (
    <PageShell
      crumbs={[{ label: 'Performance Management' }, { label: 'Monitor & Reports' }]}
      title="Monitor & Reports"
      description="Rekap sinyal, riwayat lembar yang sudah disahkan, laporan HR, dan jejak siapa membaca data siapa. Semua baca saja."
      actions={<PerfActorPicker onChange={() => setPicked('board')} />}
    >
      {faces.length === 0 ? (
        <NoAccess description="Papan pantau dan laporan tidak tersedia untuk peran ini." />
      ) : (
        <div className="flex flex-col gap-5">
          <TabMenu<Face> value={face} onChange={setPicked} items={faces} />
          {face === 'board' && <SignalBoardPanel key={actor.employeeId} actor={actor} />}
          {face === 'history' && <ReviewHistoryPanel key={actor.employeeId} actor={actor} />}
          {face === 'reports' && <HrReportsPanel key={actor.employeeId} actor={actor} />}
          {face === 'access' && <AccessLogPanel key={actor.employeeId} actor={actor} />}
        </div>
      )}
    </PageShell>
  );
}
