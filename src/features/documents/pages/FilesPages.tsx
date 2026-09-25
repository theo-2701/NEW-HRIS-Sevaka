import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { SelectRow } from '@/features/company/components/CompanyBits';
import { ActorSelect } from '@/features/documents/components/DocBits';
import { DocumentCatalog } from '@/features/documents/components/DocumentCatalog';
import { RequestLetterModal } from '@/features/documents/components/RequestLetterModal';
import { EMPLOYEE_PICKER, OBJECT_OPTIONS, VIEWERS } from '@/features/documents/mock-data';
import { canReadCatalog, readableObjectKinds } from '@/features/documents/rules';
import { OBJECT_KIND_LABEL } from '@/features/documents/types';
import type { DocActor, OwnerObjectKind } from '@/features/documents/types';

const CRUMBS = [{ label: 'Company Management' }, { label: 'Files' }];

function NoAccess() {
  return (
    <Card>
      <EmptyState title="No access" description="This role cannot read files on this screen." />
    </Card>
  );
}

/** Company Management › Files › Company Files — FSD-DOCUMENT §1 (`owner_type=PERUSAHAAN`, baca saja). */
export function CompanyFilesPage() {
  const [actor, setActor] = useState<DocActor>(VIEWERS.company[0]);
  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'Company Files' }]}
      title="Company Files"
      description="Company-owned documents such as policies, circulars, and logos. Files are uploaded through the owning module, not here."
      actions={<ActorSelect actors={VIEWERS.company} value={actor} onChange={setActor} />}
    >
      {canReadCatalog(actor.role, 'PERUSAHAAN') ? (
        <DocumentCatalog
          key={actor.employeeId + actor.role}
          actor={actor}
          ownerType="PERUSAHAAN"
          title="Company documents"
          sub="Only files you are allowed to read are listed"
          showOrigin
          showStorage
        />
      ) : (
        <NoAccess />
      )}
    </PageShell>
  );
}

/**
 * Company Management › Files › Employee Files — FSD-DOCUMENT §2. Wajib pilih karyawan dulu (`EF-1`),
 * lalu grid berkas milik satu karyawan (`owner_type=KARYAWAN`+`owner_id`). Kolom Asal sengaja dikurangi.
 */
export function EmployeeFilesPage() {
  const [actor, setActor] = useState<DocActor>(VIEWERS.employee[0]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const person = EMPLOYEE_PICKER.find((row) => row.employeeId === employeeId);

  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'Employee Files' }]}
      title="Employee Files"
      description="Files owned by an employee. Pick an employee first; sensitive files open only inside the app."
      actions={<ActorSelect actors={VIEWERS.employee} value={actor} onChange={setActor} />}
    >
      {!person ? (
        <Card>
          <CardHead title="Select employee" sub="Employee files are always opened one employee at a time" />
          <DataTable
            rows={EMPLOYEE_PICKER}
            rowKey={(row) => row.employeeId}
            columns={[
              {
                key: 'nik',
                header: 'NIK',
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.nik}</span>,
              },
              { key: 'name', header: 'Name', strong: true, render: (row) => row.nama },
              { key: 'dept', header: 'Department', muted: true, render: (row) => row.department },
            ]}
            actions={(row) => <RowButton onClick={() => setEmployeeId(row.employeeId)}>Select</RowButton>}
          />
        </Card>
      ) : (
        <DocumentCatalog
          key={`${actor.employeeId}${actor.role}${person.employeeId}`}
          actor={actor}
          ownerType="KARYAWAN"
          ownerId={person.employeeId}
          title={`${person.nama} · ${person.nik}`}
          sub={person.department}
          showStorage
          actions={
            <Button variant="secondary" onClick={() => setEmployeeId(null)}>
              Change employee
            </Button>
          }
        />
      )}
    </PageShell>
  );
}

/** Company Management › Files › Other Files — FSD-DOCUMENT §3 (`owner_type=OBJEK_LAIN`: aset·vendor·cabang). */
export function OtherFilesPage() {
  const [actor, setActor] = useState<DocActor>(VIEWERS.other[0]);
  const [kind, setKind] = useState<'' | OwnerObjectKind>('');
  const [objectId, setObjectId] = useState('');
  const kinds = readableObjectKinds(actor.role);
  const objectName = (id: string | null) => OBJECT_OPTIONS.find((row) => row.id === id)?.name ?? '—';

  return (
    <PageShell
      crumbs={[...CRUMBS, { label: 'Other Files' }]}
      title="Other Files"
      description="Files attached to assets, vendors, and branches."
      actions={
        <ActorSelect
          actors={VIEWERS.other}
          value={actor}
          onChange={(next) => {
            setActor(next);
            setKind('');
            setObjectId('');
          }}
        />
      }
    >
      {canReadCatalog(actor.role, 'OBJEK_LAIN') ? (
        <DocumentCatalog
          key={actor.employeeId + actor.role}
          actor={actor}
          ownerType="OBJEK_LAIN"
          extraQuery={{ ownerObjectKind: kind || undefined, ownerId: objectId || undefined }}
          extraActive={[kind, objectId].filter(Boolean).length}
          onResetExtra={() => {
            setKind('');
            setObjectId('');
          }}
          extraFilters={
            <>
              <SelectRow
                label="Object kind"
                allowEmpty
                emptyLabel="All kinds"
                value={kind}
                onChange={(value) => {
                  setKind(value as '' | OwnerObjectKind);
                  setObjectId('');
                }}
                options={kinds.map((value) => ({ value, label: OBJECT_KIND_LABEL[value] }))}
              />
              <SelectRow
                label="Object"
                allowEmpty
                emptyLabel="All objects"
                value={objectId}
                onChange={setObjectId}
                options={OBJECT_OPTIONS.filter((row) => kinds.includes(row.kind) && (!kind || row.kind === kind)).map(
                  (row) => ({ value: row.id, label: row.name }),
                )}
              />
            </>
          }
          title="Object documents"
          sub="Asset → asset register · Vendor → vendor master · Branch → branch master"
          showObjectKind
          ownerCaption={(row) => objectName(row.ownerId)}
        />
      ) : (
        <NoAccess />
      )}
    </PageShell>
  );
}

/**
 * Employee Self-Service › Files — FSD-DOCUMENT §6. Berkas milik sendiri (`owner_id` dari token, tidak
 * dikirim layar) + Minta Surat jalur mandiri (`A15` + `A10`).
 */
export function EssFilesPage() {
  const [actor, setActor] = useState<DocActor>(VIEWERS.ess[0]);
  const [requesting, setRequesting] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Files' }]}
      title="My Files"
      description="Your own documents and letters. Request a letter for yourself from here."
      actions={
        <ActorSelect
          actors={VIEWERS.ess}
          value={actor}
          onChange={(next) => {
            setActor(next);
            setNewIds(new Set());
          }}
        />
      }
    >
      <DocumentCatalog
        key={actor.employeeId}
        actor={actor}
        ownerType="KARYAWAN"
        title="My files"
        sub="Files held back from you do not appear here"
        newIds={newIds}
        actions={<Button onClick={() => setRequesting(true)}>Request letter</Button>}
      />
      <RequestLetterModal
        actor={actor}
        open={requesting}
        onClose={() => setRequesting(false)}
        onIssued={(documentId) => setNewIds((prev) => new Set(prev).add(documentId))}
      />
    </PageShell>
  );
}
