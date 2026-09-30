import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { ASSESSOR_AVERAGE, type SheetSeed } from '@/features/performance/mock-data';
import { delay } from '@/features/performance/services/ids';
import { readPerfNumber } from '@/features/performance/services/setup';
import { sheetStore } from '@/features/performance/services/sheet.service';
import { snapshotStore } from '@/features/performance/services/snapshot-store';
import { canReadRoundsAsHr, canSeeApprovalQueue, returnsUsed } from '@/features/performance/rules';
import type {
  ApprovalRound,
  DecisionDraft,
  DecisionForwarded,
  PendingApproval,
  PerfActor,
  RoundOutcome,
} from '@/features/performance/types';

/**
 * Menu 4 — Persetujuan Nilai (UIC-001-PERFORMANCE §5, `P4.02`–`P4.04`; `P4.01` submit ada di
 * sheet.service karena tombolnya di Lembar Penilaian). Pola `K9`: keputusan dijawab `202 FORWARDED`,
 * outcome & status lembar baru ditulis saat pesan `workflow.process.completed` dikonsumsi — async.
 */

/** Jeda simulasi mesin alur kerja sebelum pesan selesai dikonsumsi. */
export const WORKFLOW_DELAY_MS = 1500;

type Completion = { sheetId: string; roundId: string; draft: DecisionDraft; timer: ReturnType<typeof setTimeout> };
let inFlight: Completion[] = [];

export function resetApprovalMocks() {
  for (const job of inFlight) clearTimeout(job.timer);
  inFlight = [];
}

/**
 * Konsumsi `workflow.process.completed`: tulis outcome putaran + status lembar. Pengesahan (APPROVED)
 * sekaligus membentuk revisi beku untuk Riwayat Beku (Menu 6).
 */
async function complete(job: Completion) {
  inFlight = inFlight.filter((row) => row !== job);
  const sheet = sheetStore.find(job.sheetId);
  const round = sheet?.rounds.find((row) => row.id === job.roundId);
  if (!sheet || !round || round.outcome) return;
  round.outcome = job.draft.decision;
  round.decisionReason = job.draft.decisionReason?.trim() || null;
  round.decidedAt = new Date().toISOString();
  sheet.status =
    job.draft.decision === 'APPROVED' ? 'APPROVED' : job.draft.decision === 'RETURNED' ? 'RETURNED_TO_ASSESSOR' : 'REJECTED_FINAL';
  if (job.draft.decision === 'APPROVED') {
    snapshotStore.add(sheet, await readPerfNumber('performance.objection_deadline_days', 14));
  }
}

/** Untuk pengujian — selesaikan seluruh proses alur kerja yang masih berjalan sekarang juga. */
export async function flushWorkflow() {
  const jobs = [...inFlight];
  for (const job of jobs) clearTimeout(job.timer);
  await Promise.all(jobs.map(complete));
}

const running = (sheet: SheetSeed) => {
  const last = sheet.rounds[sheet.rounds.length - 1];
  return last && !last.outcome ? last : null;
};

const DECISIONS: RoundOutcome[] = ['APPROVED', 'RETURNED', 'REJECTED_FINAL'];

type RawRound = {
  id: string;
  cycle_no: number;
  round_no: number;
  approver: { employee_id: string; name: string };
  outcome: RoundOutcome | null;
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
};

export const approvalService = {
  /** Setelan `performance.return_quota` — bahan pill jatah; batas sesungguhnya ditegakkan server. */
  async returnQuota(): Promise<number> {
    return readPerfNumber('performance.return_quota', 1);
  },

  /** `P4.04` — putaran berjalan yang penyetujunya = pemanggil. */
  async pending(
    actor: PerfActor,
    query: { page: number; size: number; sortDirection?: 'ASC' | 'DESC' },
  ): Promise<{ rows: PendingApproval[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!canSeeApprovalQueue(actor.role)) {
        throw new ApiError('Peran Anda tidak memiliki antrean persetujuan.', 403, 'FORBIDDEN');
      }
      const dir = query.sortDirection === 'DESC' ? -1 : 1;
      const rows = sheetStore
        .all()
        .map((sheet) => ({ sheet, round: running(sheet) }))
        .filter(({ round }) => round && round.approver.employeeId === actor.employeeId)
        .map(({ sheet, round }): PendingApproval => {
          const lines = sheet.items.filter((row) => !row.deletedAt);
          return {
            approvalRoundId: round!.id,
            reviewSheetId: sheet.id,
            employee: { employeeId: sheet.employeeId, name: sheet.employeeNameDisplay },
            cycleNo: round!.cycleNo,
            roundNo: round!.roundNo,
            assessorScoreDistribution: {
              ratedCount: lines.filter((row) => row.submittedValue ?? row.initialValue).length,
              totalCount: lines.length,
              averageScore: ASSESSOR_AVERAGE[sheet.id] ?? null,
            },
            submittedAt: round!.createdAt,
          };
        })
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) * dir);
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size), totalData: rows.length };
    }
    const { data } = await api.get<{
      data: {
        approval_round_id: string;
        review_sheet_id: string;
        employee: { employee_id: string; name: string };
        cycle_no: number;
        round_no: number;
        assessor_score_distribution: { rated_count: number; total_count: number; average_score: number | null };
        submitted_at: string;
      }[];
      total_data: number;
    }>('/performance/me/pending-approvals', {
      params: { page: query.page, size: query.size, sort_by: 'created_at', sort_direction: query.sortDirection },
    });
    return {
      rows: data.data.map((row) => ({
        approvalRoundId: row.approval_round_id,
        reviewSheetId: row.review_sheet_id,
        employee: { employeeId: row.employee.employee_id, name: row.employee.name },
        cycleNo: row.cycle_no,
        roundNo: row.round_no,
        assessorScoreDistribution: {
          ratedCount: row.assessor_score_distribution.rated_count,
          totalCount: row.assessor_score_distribution.total_count,
          averageScore: row.assessor_score_distribution.average_score,
        },
        submittedAt: row.submitted_at,
      })),
      totalData: data.total_data,
    };
  },

  /**
   * `P4.02` — tiga gerbang milik performance-service (alasan wajib, jatah, assignee = principal),
   * lalu diteruskan. `202` berarti status BELUM berubah.
   */
  async decide(actor: PerfActor, sheetId: string, draft: DecisionDraft): Promise<DecisionForwarded> {
    if (MOCK) {
      await delay(400);
      const sheet = sheetStore.find(sheetId);
      const round = sheet ? running(sheet) : null;
      if (!sheet || !round) throw new ApiError('Lembar tidak ditemukan atau putaran tidak berjalan.', 404, 'NOT_FOUND');
      if (round.approver.employeeId !== actor.employeeId) {
        throw new ApiError('Keputusan hanya dapat diberikan oleh penyetuju putaran ini.', 403, 'FORBIDDEN');
      }
      if (!DECISIONS.includes(draft.decision)) throw new ApiError('Keputusan tidak dikenal.', 422, 'VALIDATION_ERROR');
      if (draft.decision !== 'APPROVED' && !draft.decisionReason?.trim()) {
        throw new ApiError('Alasan keputusan wajib diisi untuk Kembalikan atau Tolak final.', 422, 'VALIDATION_ERROR');
      }
      if (draft.decision === 'RETURNED') {
        const quota = await approvalService.returnQuota();
        const used = returnsUsed(sheet.rounds, round.cycleNo);
        if (used >= quota) {
          throw new ApiError(
            `Jatah pengembalian sudah habis (${used} dari ${quota} terpakai).`,
            422,
            'RETURN_QUOTA_EXCEEDED',
          );
        }
      }
      if (inFlight.some((row) => row.roundId === round.id)) {
        throw new ApiError('Keputusan untuk putaran ini sedang diproses mesin alur kerja.', 422, 'VALIDATION_ERROR');
      }
      const job: Completion = { sheetId, roundId: round.id, draft, timer: setTimeout(() => void complete(job), WORKFLOW_DELAY_MS) };
      inFlight.push(job);
      return { status: 'FORWARDED', message: 'Keputusan diteruskan ke mesin alur kerja.' };
    }
    const { data } = await api.post<DecisionForwarded>(`/performance/review-sheets/${sheetId}/decisions`, {
      decision: draft.decision,
      decision_reason: draft.decisionReason,
    });
    return data;
  },

  /** `P4.03` — HR seluruh company; penilai/penyetuju terlibat; karyawan hanya lembarnya sendiri. */
  async rounds(actor: PerfActor, sheetId: string): Promise<ApprovalRound[]> {
    if (MOCK) {
      await delay(150);
      const sheet = sheetStore.find(sheetId);
      const involved =
        sheet &&
        (actor.role === 'ROLE_SUPER_ADMIN' ||
          canReadRoundsAsHr(actor.role) ||
          sheet.employeeId === actor.employeeId ||
          sheet.assessorId === actor.employeeId ||
          sheet.rounds.some((row) => row.approver.employeeId === actor.employeeId));
      if (!sheet || !involved) throw new ApiError('Lembar tidak ditemukan.', 404, 'NOT_FOUND');
      return [...sheet.rounds].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    const { data } = await api.get<{ data: RawRound[] }>(`/performance/review-sheets/${sheetId}/approval-rounds`, {
      params: { page: 1, size: 50, sort_by: 'created_at', sort_direction: 'ASC' },
    });
    return data.data.map((row) => ({
      id: row.id,
      cycleNo: row.cycle_no,
      roundNo: row.round_no,
      approver: { employeeId: row.approver.employee_id, name: row.approver.name },
      outcome: row.outcome,
      decisionReason: row.decision_reason,
      decidedAt: row.decided_at,
      createdAt: row.created_at,
    }));
  },
};
