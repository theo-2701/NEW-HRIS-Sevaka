import { EMPLOYEE_GRADE, PERIOD_SEED, SNAPSHOT_SEED, type SheetSeed, type SnapshotSeed } from '@/features/performance/mock-data';
import { uuidV7 } from '@/features/performance/services/ids';

/**
 * `review_sheet_snapshot` — dibentuk saat pengesahan (konsumsi `K9` APPROVED di Menu 4), dibaca Menu 6.
 * Immutable; `revision_no` naik tiap pengesahan ulang lembar yang sama.
 */

let snapshots: SnapshotSeed[] = [];

export function resetSnapshots() {
  snapshots = structuredClone(SNAPSHOT_SEED);
}
resetSnapshots();

export const snapshotStore = {
  all: () => snapshots,
  find: (id: string) => snapshots.find((row) => row.snapshotId === id),
  /** Nilai beku dibaca saat itu juga: golongan (Company), skala (periode), tenggat sanggah (setelan), teguran (Employee). */
  add(sheet: SheetSeed, objectionDeadlineDays: number): SnapshotSeed {
    const row: SnapshotSeed = {
      snapshotId: uuidV7(),
      reviewSheetId: sheet.id,
      reviewPeriodId: sheet.reviewPeriodId,
      revisionNo: snapshots.filter((item) => item.reviewSheetId === sheet.id).length + 1,
      employeeId: sheet.employeeId,
      jobGradeNameSnapshot: EMPLOYEE_GRADE[sheet.employeeId] ?? '—',
      scaleLength: PERIOD_SEED.find((period) => period.id === sheet.reviewPeriodId)?.scaleLength ?? 5,
      objectionDeadlineDaysFrozen: objectionDeadlineDays,
      reprimandStateSnapshot: { state: 'CLEAR', standingLevel: 'CLEAR', activePoints: 0 },
      approvedAt: new Date().toISOString(),
      approvedAtTimezone: 'Asia/Jakarta',
    };
    snapshots = [row, ...snapshots];
    return row;
  },
};
