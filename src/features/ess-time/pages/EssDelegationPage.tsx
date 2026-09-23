import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { useMyDelegations } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS, essName } from '@/features/ess-time/mock-data';
import { DELEGATION_STATUS_LABEL } from '@/features/time-off/types';
import type { Delegation, DelegationStatus } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

type Tab = 'received' | 'given';

const TONE: Record<DelegationStatus, 'ok' | 'warn' | 'err' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

/**
 * ESS › Time Management › Time Off › Delegation — penitipan kewenangan approval (UIC-TIME §3.2).
 *
 * Dua arah dipisah jadi dua tab: **dititipkan kepada saya** (menu ESS yang kontraknya sebut
 * "kewenangan apa saja yang sedang dititipkan kepada saya", §3.2.4) dan **saya titipkan** saat
 * cuti. Status di sini adalah status **persetujuan penunjukan**, bukan aktif-tidaknya: delegasi
 * dan cuti induknya diputuskan bersamaan, tanpa jalur menyetujui delegasi terpisah. Masa berlaku
 * mengikuti tanggal cuti induknya — resource ini memang tidak punya kolom periode sendiri.
 */
export function EssDelegationPage() {
  const [actor, setActor] = useState(ESS_VIEWERS[1]);
  const [tab, setTab] = useState<Tab>('received');
  const delegations = useMyDelegations(actor);

  const received = delegations.data?.received ?? [];
  const given = delegations.data?.given ?? [];
  const rows = tab === 'received' ? received : given;

  return (
    <PageShell
      crumbs={[
        { label: 'Employee Self-Service' },
        { label: 'Time Management' },
        { label: 'Time Off' },
        { label: 'Delegation' },
      ]}
      title="Delegation"
      description="Penitipan kewenangan approval selama pemberi delegasi cuti."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'received', label: 'Dititipkan ke saya', count: received.length },
            { value: 'given', label: 'Saya titipkan', count: given.length },
          ]}
        />

        <Card>
          <CardHead
            title={tab === 'received' ? 'Kewenangan yang dititipkan ke saya' : 'Kewenangan yang saya titipkan'}
            sub="Masa berlakunya mengikuti tanggal cuti induk; status di sini adalah status persetujuan penunjukan"
          />
          <DataTable<Delegation>
            rows={rows}
            rowKey={(row) => row.id}
            loading={delegations.isLoading}
            empty={
              tab === 'received'
                ? 'Belum ada kewenangan yang dititipkan kepada Anda.'
                : 'Anda belum menitipkan kewenangan approval.'
            }
            columns={[
              {
                key: 'counterpart',
                header: tab === 'received' ? 'Pemberi delegasi' : 'Pengganti',
                strong: true,
                render: (row) => essName(tab === 'received' ? row.delegatorId : row.substituteId),
              },
              {
                key: 'leave',
                header: 'Cuti induk',
                muted: true,
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.leaveRequestId}</span>,
              },
              { key: 'scope', header: 'Cakupan', render: () => 'Seluruh task approval' },
              {
                key: 'status',
                header: 'Status penunjukan',
                render: (row) => <StatusBadge tone={TONE[row.status]}>{DELEGATION_STATUS_LABEL[row.status]}</StatusBadge>,
              },
              { key: 'created', header: 'Diajukan', muted: true, nowrap: true, render: (row) => formatDate(row.createdAt) },
            ]}
          />
          {!actor.isApprover && (
            <p className="mt-2 font-body text-xs font-medium text-fg-4">
              Anda tidak memegang peran approver, jadi tidak pernah perlu menitipkan kewenangan — kolom "Saya titipkan"
              memang kosong untuk identitas ini.
            </p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
