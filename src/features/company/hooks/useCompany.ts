import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companyService } from '@/features/company/services/company.service';
import { toast } from '@/store/ui.store';
import type {
  BranchDraft,
  BranchGroupDraft,
  CompanyActor,
  CostCenterDraft,
  JobGradeDraft,
  ModuleCode,
  SbuDraft,
  VendorDraft,
} from '@/features/company/types';

export const companyKeys = {
  all: ['company'] as const,
  setup: ['company', 'setup'] as const,
  branchGroups: ['company', 'branch-groups'] as const,
  branches: (search: string) => ['company', 'branches', search] as const,
  structs: ['company', 'group-structs'] as const,
  levels: (structId: string) => ['company', 'group-levels', structId] as const,
  positions: (structId: string) => ['company', 'positions', structId] as const,
  positionHistory: (id: string) => ['company', 'position-history', id] as const,
  jobGrades: ['company', 'job-grades'] as const,
  costCenterCategories: ['company', 'cost-center-categories'] as const,
  costCenters: ['company', 'cost-centers'] as const,
  sbuGroups: ['company', 'sbu-groups'] as const,
  sbus: ['company', 'sbus'] as const,
  vendors: (search: string) => ['company', 'vendors', search] as const,
};

export const useCompanySetup = () =>
  useQuery({ queryKey: companyKeys.setup, queryFn: () => companyService.setup() });

export const useBranchGroups = (enabled = true) =>
  useQuery({ queryKey: companyKeys.branchGroups, queryFn: () => companyService.branchGroups(), enabled });

export const useBranches = (search = '') =>
  useQuery({ queryKey: companyKeys.branches(search), queryFn: () => companyService.branches(search) });

export const useGroupStructs = () =>
  useQuery({ queryKey: companyKeys.structs, queryFn: () => companyService.groupStructs() });

export const useGroupLevels = (structId: string) =>
  useQuery({
    queryKey: companyKeys.levels(structId),
    queryFn: () => companyService.groupLevels(structId),
    enabled: Boolean(structId),
  });

export const usePositions = (structId: string) =>
  useQuery({
    queryKey: companyKeys.positions(structId),
    queryFn: () => companyService.positions(structId),
    enabled: Boolean(structId),
  });

export const usePositionHistory = (positionId: string) =>
  useQuery({
    queryKey: companyKeys.positionHistory(positionId),
    queryFn: () => companyService.positionHistory(positionId),
    enabled: Boolean(positionId),
  });

export const useJobGrades = () =>
  useQuery({ queryKey: companyKeys.jobGrades, queryFn: () => companyService.jobGrades() });

export const useCostCenterCategories = (enabled = true) =>
  useQuery({ queryKey: companyKeys.costCenterCategories, queryFn: () => companyService.costCenterCategories(), enabled });

export const useCostCenters = (enabled = true) =>
  useQuery({ queryKey: companyKeys.costCenters, queryFn: () => companyService.costCenters(), enabled });

export const useSbuGroups = (enabled = true) =>
  useQuery({ queryKey: companyKeys.sbuGroups, queryFn: () => companyService.sbuGroups(), enabled });

export const useSbus = (enabled = true) =>
  useQuery({ queryKey: companyKeys.sbus, queryFn: () => companyService.sbus(), enabled });

export const useVendors = (search = '') =>
  useQuery({ queryKey: companyKeys.vendors(search), queryFn: () => companyService.vendors(search) });

/** Semua penyimpanan master data memakai umpan balik yang sama. */
function useCompanyMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      toast(message(result, vars), 'ok');
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSaveBranchGroup = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: BranchGroupDraft; id?: string }) => companyService.saveBranchGroup(draft, id),
    (row) => `Kategori cabang ${row.name} tersimpan.`,
  );

export const useDeleteBranchGroup = () =>
  useCompanyMutation((id: string) => companyService.deleteBranchGroup(id), () => 'Kategori cabang dihapus.');

export const useSaveBranch = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: BranchDraft; id?: string }) => companyService.saveBranch(draft, id),
    (row) => `Cabang ${row.branchName} tersimpan.`,
  );

export const useDeleteBranch = () =>
  useCompanyMutation((id: string) => companyService.deleteBranch(id), () => 'Cabang dihapus.');

export const useSavePosition = () =>
  useCompanyMutation(
    ({
      actor,
      draft,
      id,
    }: {
      actor: CompanyActor;
      draft: {
        positionName: string;
        groupStructLevelId: string;
        employeeId: string;
        parentId: string;
        canSignLetter: boolean;
        secondApproverEmployeeId: string;
      };
      id?: string;
    }) => companyService.savePosition(actor, draft, id),
    (row) => `Posisi ${row.positionName} tersimpan dan tercatat di riwayat.`,
  );

export const useDeletePosition = () =>
  useCompanyMutation((id: string) => companyService.deletePosition(id), () => 'Posisi dihapus.');

export const useModuleGroupStructMaps = (actor: CompanyActor) =>
  useQuery({
    queryKey: ['company', 'module-maps', actor.employeeId],
    queryFn: () => companyService.moduleGroupStructMaps(actor),
  });

export const useSaveModuleGroupStructMap = () =>
  useCompanyMutation(
    ({ actor, moduleCode, groupStructId }: { actor: CompanyActor; moduleCode: ModuleCode; groupStructId: string }) =>
      companyService.saveModuleGroupStructMap(actor, moduleCode, groupStructId),
    (row) => `Modul ${row.moduleCode} dipetakan.`,
  );

export const useClearModuleGroupStructMap = () =>
  useCompanyMutation(
    ({ actor, moduleCode }: { actor: CompanyActor; moduleCode: ModuleCode }) =>
      companyService.clearModuleGroupStructMap(actor, moduleCode),
    (row) => `Pemetaan modul ${row.moduleCode} dikosongkan.`,
  );

export const useSaveJobGrade = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: JobGradeDraft; id?: string }) => companyService.saveJobGrade(draft, id),
    (row) => `${row.name} (${row.gradeCode}) tersimpan.`,
  );

export const useDeleteJobGrade = () =>
  useCompanyMutation((id: string) => companyService.deleteJobGrade(id), () => 'Baris Grade/Class dihapus.');

export const useSaveCostCenterCategory = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: { name: string; description: string }; id?: string }) =>
      companyService.saveCostCenterCategory(draft, id),
    (row) => `Kategori ${row.name} tersimpan.`,
  );

export const useSaveCostCenter = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: CostCenterDraft; id?: string }) => companyService.saveCostCenter(draft, id),
    (row) => `Cost center ${row.code} tersimpan.`,
  );

export const useDeleteCostCenter = () =>
  useCompanyMutation((id: string) => companyService.deleteCostCenter(id), () => 'Cost center dihapus.');

export const useSaveSbuGroup = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: { name: string }; id?: string }) => companyService.saveSbuGroup(draft, id),
    (row) => `Grup SBU ${row.name} tersimpan.`,
  );

export const useSaveSbu = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: SbuDraft; id?: string }) => companyService.saveSbu(draft, id),
    (row) => `SBU ${row.code} tersimpan.`,
  );

export const useDeleteSbu = () =>
  useCompanyMutation((id: string) => companyService.deleteSbu(id), () => 'SBU dihapus.');

export const useSaveVendor = () =>
  useCompanyMutation(
    ({ draft, id }: { draft: VendorDraft; id?: string }) => companyService.saveVendor(draft, id),
    (row) => `Vendor ${row.vendorName} tersimpan.`,
  );

export const useDeleteVendor = () =>
  useCompanyMutation((id: string) => companyService.deleteVendor(id), () => 'Vendor dihapus.');
