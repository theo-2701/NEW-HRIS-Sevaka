import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recruitmentService } from '@/features/recruitment/services/recruitment.service';
import type { CandidateInput, ImportStatus, JobDetails, JobFilter, JobListing, JobStatus } from '@/features/recruitment/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['recruitment'] as const };

export const useJobListings = (filter: JobFilter) =>
  useQuery({ queryKey: [...keys.all, 'jobs', filter], queryFn: () => recruitmentService.jobs(filter) });

export const useRecruitmentOverview = () =>
  useQuery({ queryKey: [...keys.all, 'overview'], queryFn: () => recruitmentService.overview() });

export const useUpcomingInterviews = () =>
  useQuery({ queryKey: [...keys.all, 'interviews'], queryFn: () => recruitmentService.interviews() });

export const useJobListing = (id: string | null) =>
  useQuery({ queryKey: [...keys.all, 'job', id], queryFn: () => recruitmentService.get(id!), enabled: Boolean(id) });

/** Pesan sukses ditangani halaman (modal "Successfully published" / toast draft). */
export function useSaveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, details, publish }: { id: string | null; details: JobDetails; publish: boolean }) =>
      recruitmentService.save(id, details, publish),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.all }),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

function useJobMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, message: (result: TResult, vars: TVars) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      toast(message(result, vars), 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

const STATUS_DONE: Record<JobStatus, string> = {
  PUBLISHED: 'is now published',
  UNPUBLISHED: 'is unpublished',
  CLOSED: 'is closed',
  DRAFT: 'is back in draft',
};

export const useSetJobStatus = () =>
  useJobMutation(
    ({ id, status }: { id: string; status: JobStatus }) => recruitmentService.setStatus(id, status),
    (row: JobListing) => `${row.title} ${STATUS_DONE[row.status]}.`,
  );

export const useDuplicateJob = () =>
  useJobMutation((id: string) => recruitmentService.duplicate(id), (row) => `${row.title} was saved as a draft.`);

export const useDeleteJob = () => useJobMutation((id: string) => recruitmentService.remove(id), () => 'Job listing deleted.');

/** Hasil impor dibaca halaman (Completed → toast, Failed → buka log). */
export function useImportJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => recruitmentService.importJobs(file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.all }),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useImportLogs = (status?: ImportStatus) =>
  useQuery({ queryKey: [...keys.all, 'import-logs', status ?? 'ALL'], queryFn: () => recruitmentService.importLogs(status) });

export const useImportLog = (id: string | null) =>
  useQuery({ queryKey: [...keys.all, 'import-log', id], queryFn: () => recruitmentService.importLog(id!), enabled: Boolean(id) });

export function useAddCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CandidateInput) => recruitmentService.addCandidate(input),
    onSuccess: (row) => {
      toast(`${row.firstName} ${row.lastName} was added to ${row.stage}.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
