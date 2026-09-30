import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/features/productivity/services/project.service';
import type { ProdActor, ProjectState, TaskDraft, TaskPatch, TaskSearch } from '@/features/productivity/types';
import { toast } from '@/store/ui.store';

export const projectKeys = {
  all: ['productivity', 'projects'] as const,
  list: (actor: ProdActor, state: ProjectState, keyword: string) =>
    ['productivity', 'projects', 'list', actor.employeeId, state, keyword] as const,
  members: (projectId: string) => ['productivity', 'projects', 'members', projectId] as const,
  tasks: ['productivity', 'tasks'] as const,
  taskList: (actor: ProdActor, search: TaskSearch) =>
    ['productivity', 'tasks', 'list', actor.employeeId, search] as const,
  task: (actor: ProdActor, id: string) => ['productivity', 'tasks', 'detail', actor.employeeId, id] as const,
  history: (actor: ProdActor, id: string) => ['productivity', 'tasks', 'history', actor.employeeId, id] as const,
  categories: ['productivity', 'task-categories'] as const,
};

export const useProjects = (actor: ProdActor, state: ProjectState, keyword: string) =>
  useQuery({
    queryKey: projectKeys.list(actor, state, keyword),
    queryFn: () => projectService.projects(actor, state, keyword),
  });

export const useProjectMembers = (projectId: string | null) =>
  useQuery({
    queryKey: projectKeys.members(projectId ?? ''),
    queryFn: () => projectService.members(projectId!),
    enabled: Boolean(projectId),
  });

export const useTasks = (actor: ProdActor, search: TaskSearch) =>
  useQuery({
    queryKey: projectKeys.taskList(actor, search),
    queryFn: () => projectService.tasks(actor, search),
    retry: false,
  });

export const useTask = (actor: ProdActor, id: string | null) =>
  useQuery({
    queryKey: projectKeys.task(actor, id ?? ''),
    queryFn: () => projectService.task(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useTaskHistory = (actor: ProdActor, id: string | null) =>
  useQuery({
    queryKey: projectKeys.history(actor, id ?? ''),
    queryFn: () => projectService.taskHistory(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useTaskCategories = () =>
  useQuery({ queryKey: projectKeys.categories, queryFn: () => projectService.categories() });

/** Galat gerbang (422/403/409) ditampilkan sebagai banner di modal — hanya sukses yang di-toast. */
function useProdMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  success: (result: TResult, vars: TVars) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      toast(success(result, vars));
      void queryClient.invalidateQueries({ queryKey: ['productivity'] });
    },
  });
}

export const useCreateProject = () =>
  useProdMutation(
    ({ actor, name }: { actor: ProdActor; name: string }) => projectService.createProject(actor, name),
    (row) => `201 Created — ${row.code} ${row.projectName}`,
  );

export const useUpdateProject = () =>
  useProdMutation(
    ({ actor, id, patch }: { actor: ProdActor; id: string; patch: { projectName?: string; state?: ProjectState } }) =>
      projectService.updateProject(actor, id, patch),
    (row, { patch }) =>
      patch.state === 'AKTIF' && !patch.projectName
        ? `200 OK — ${row.code} restored to Active`
        : patch.state === 'ARSIP'
          ? `200 OK — ${row.code} archived`
          : `200 OK — ${row.code} updated`,
  );

export const useDeleteProject = () =>
  useProdMutation(
    ({ actor, id }: { actor: ProdActor; id: string; code: string }) => projectService.deleteProject(actor, id),
    (_, { code }) => `${code} deleted`,
  );

export const useAddMember = () =>
  useProdMutation(
    ({ actor, projectId, employeeId }: { actor: ProdActor; projectId: string; employeeId: string }) =>
      projectService.addMember(actor, projectId, employeeId),
    (result) =>
      result === 'CREATED'
        ? '201 Created — member added'
        : result === 'RESTORED'
          ? '200 OK — member restored'
          : '200 OK — already a member',
  );

export const useRemoveMember = () =>
  useProdMutation(
    ({ actor, projectId, employeeId }: { actor: ProdActor; projectId: string; employeeId: string }) =>
      projectService.removeMember(actor, projectId, employeeId),
    () => 'Member removed from the project',
  );

export const useCreateTask = () =>
  useProdMutation(
    ({ actor, draft }: { actor: ProdActor; draft: TaskDraft }) => projectService.createTask(actor, draft),
    (row) => `201 Created — ${row.code} (${row.taskOrigin === 'DITUGASKAN' ? 'assigned' : 'self-created'})`,
  );

export const useUpdateTask = () =>
  useProdMutation(
    ({ actor, id, patch }: { actor: ProdActor; id: string; patch: TaskPatch }) =>
      projectService.updateTask(actor, id, patch),
    (row) => `200 OK — ${row.code} updated`,
  );

export const useSaveCategory = () =>
  useProdMutation(
    ({ actor, input, id }: { actor: ProdActor; input: { categoryName: string; isActive?: boolean }; id?: string }) =>
      projectService.saveCategory(actor, input, id),
    (row, { id }) => (id ? `200 OK — ${row.categoryName} updated` : `201 Created — ${row.categoryName}`),
  );

export const useDeleteCategory = () =>
  useProdMutation(
    ({ actor, id }: { actor: ProdActor; id: string; name: string }) => projectService.deleteCategory(actor, id),
    (_, { name }) => `${name} deleted`,
  );
