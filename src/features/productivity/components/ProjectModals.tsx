import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { RemoveRowButton, RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { EmployeeSelect } from '@/components/EmployeeSelect';
import { Field, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { ErrorBanner, Note, PersonCell } from '@/features/productivity/components/ProdBits';
import {
  useAddMember,
  useCreateProject,
  useProjectMembers,
  useRemoveMember,
  useUpdateProject,
} from '@/features/productivity/hooks/useProjects';
import { PROD_EMPLOYEES, prodEmployeeSource } from '@/features/productivity/mock-data';
import { isHr, nameOf } from '@/features/productivity/rules';
import type { ProdActor, Project, ProjectState } from '@/features/productivity/types';
import { formatDateTime } from '@/lib/format';

const canManage = (actor: ProdActor, project: Project) =>
  project.ownerEmployeeId === actor.employeeId || isHr(actor.role);

/** `A3` — satu field `project_name`; pemilik & status diisi sistem. */
export function CreateProjectModal({ actor, open, onClose }: { actor: ProdActor; open: boolean; onClose: () => void }) {
  const create = useCreateProject();
  const [name, setName] = useState('');
  const close = () => {
    setName('');
    create.reset();
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="New project"
      description="The project is created as Active with you as its owner."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate({ actor, name }, { onSuccess: close })}
          >
            {create.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={create.error} />
        <TextRow label="Project name" required value={name} onChange={setName} placeholder="e.g. Migrasi Server Q3" />
      </div>
    </Modal>
  );
}

/**
 * `B3` — ubah nama/status + keanggotaan. Status ARSIP digerbangi task terbuka (`B5`, banner 422). Hanya pemilik
 * atau HR yang dapat mengubah; lainnya melihat baca-saja.
 */
export function ProjectDetailModal({
  actor,
  project,
  onClose,
}: {
  actor: ProdActor;
  project: Project | null;
  onClose: () => void;
}) {
  const update = useUpdateProject();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const members = useProjectMembers(project?.id ?? null);
  const [name, setName] = useState('');
  const [state, setState] = useState<ProjectState>('AKTIF');
  const [candidate, setCandidate] = useState('');

  useEffect(() => {
    if (!project) return;
    setName(project.projectName);
    setState(project.state);
    setCandidate('');
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat modal dibuka untuk proyek lain
  }, [project?.id]);

  if (!project) return null;
  const editable = canManage(actor, project);
  const memberIds = new Set((members.data ?? []).map((row) => row.employeeId));
  const candidates = PROD_EMPLOYEES.filter(
    (row) => row.employeeId !== project.ownerEmployeeId && !memberIds.has(row.employeeId),
  );
  const dirty = name.trim() !== project.projectName || state !== project.state;

  const save = () => {
    const patch: { projectName?: string; state?: ProjectState } = {};
    if (name.trim() !== project.projectName) patch.projectName = name;
    if (state !== project.state) patch.state = state;
    update.mutate({ actor, id: project.id, patch }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${project.code} · ${project.projectName}`}
      description={`Owner ${nameOf(project.ownerEmployeeId)} · created ${formatDateTime(project.createdAt)}`}
      size="wide"
      footer={
        editable ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!dirty || update.isPending} onClick={save}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorBanner error={update.error} />
        {!editable && <Note>Only the project owner or HR can change this project.</Note>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextRow label="Project name" value={name} onChange={setName} disabled={!editable} />
          <SelectRow
            label="Status"
            value={state}
            disabled={!editable}
            onChange={(value) => setState(value as ProjectState)}
            options={[
              { value: 'AKTIF', label: 'Active' },
              { value: 'ARSIP', label: 'Archived' },
            ]}
            hint="Archiving is refused while the project still has open tasks."
          />
        </div>

        <Field
          label="Members"
          hint="Reviewers of this project. Removing a member deactivates them; adding them again restores the same row."
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-md border border-fog px-3 py-2">
              <PersonCell employeeId={project.ownerEmployeeId} caption="Owner" />
            </div>
            {(members.data ?? []).map((row) => (
              <div
                key={row.employeeId}
                className="flex items-center justify-between rounded-md border border-fog px-3 py-2"
              >
                <PersonCell employeeId={row.employeeId} caption={`Member since ${formatDateTime(row.createdAt)}`} />
                {editable && (
                  <RemoveRowButton
                    aria-label={`Remove ${nameOf(row.employeeId)}`}
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate({ actor, projectId: project.id, employeeId: row.employeeId })}
                  />
                )}
              </div>
            ))}
            {editable && candidates.length > 0 && (
              <div className="flex items-center gap-2">
                <EmployeeSelect
                  lang="en"
                  source={prodEmployeeSource(candidates)}
                  value={candidate}
                  onChange={setCandidate}
                  aria-label="Add member"
                  className="w-[280px]"
                />
                <RowButton
                  disabled={!candidate || addMember.isPending}
                  onClick={() =>
                    addMember.mutate(
                      { actor, projectId: project.id, employeeId: candidate },
                      { onSuccess: () => setCandidate('') },
                    )
                  }
                >
                  Add member
                </RowButton>
              </div>
            )}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/** Archive `A3` — detail beku + "Restore" (state→AKTIF, mengosongkan `archived_at`). */
export function ArchivedProjectModal({
  actor,
  project,
  onClose,
}: {
  actor: ProdActor;
  project: Project | null;
  onClose: () => void;
}) {
  const update = useUpdateProject();
  if (!project) return null;
  const editable = canManage(actor, project);
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${project.code} · ${project.projectName}`}
      description="Archived projects accept no new tasks. Old tasks keep their status when the project is restored."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {editable && (
            <Button
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ actor, id: project.id, patch: { state: 'AKTIF' } }, { onSuccess: onClose })
              }
            >
              {update.isPending ? 'Restoring…' : 'Restore'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={update.error} />
        <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2.5 font-body text-[13px]">
          <dt className="font-semibold text-fg-3">Owner</dt>
          <dd className="m-0 font-semibold text-fg-1">{nameOf(project.ownerEmployeeId)}</dd>
          <dt className="font-semibold text-fg-3">Archived since</dt>
          <dd className="m-0 font-semibold text-fg-1">
            {formatDateTime(project.archivedAt)}
            {project.archivedAtTimezone ? ` · ${project.archivedAtTimezone}` : ''}
          </dd>
          <dt className="font-semibold text-fg-3">Members</dt>
          <dd className="m-0 font-semibold text-fg-1">{project.memberCount}</dd>
        </dl>
        {!editable && <Note>Only the project owner or HR can restore this project.</Note>}
      </div>
    </Modal>
  );
}
