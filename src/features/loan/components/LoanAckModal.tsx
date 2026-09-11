import { GitBranch, Lock, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { LoanStatusBadge } from '@/features/loan/components/LoanBits';
import { offerTotal } from '@/features/loan/rules';
import { useAcknowledgeSchedule } from '@/features/loan/hooks/useLoan';
import { LOAN_STATES } from '@/features/loan/mock-data';
import type { Loan, LoanStateRef } from '@/features/loan/types';
import { formatCurrency } from '@/lib/format';

/**
 * Pengakuan jadwal (LN-C2). Satu endpoint dengan dua hasil: `ACK` menjadikan
 * permintaannya APPROVED beserta jadwal angsurannya, `DECLINE` melepas
 * reservasinya dan membuka jalan pengajuan baru. Keduanya diberikan dari dalam
 * aplikasi setelah login penuh — tidak pernah dari tautan notifikasi.
 */
export function LoanAckModal({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  const acknowledge = useAcknowledgeSchedule();
  const offer = loan?.acknowledgementOffer;
  const total = loan ? offerTotal(loan) : null;

  return (
    <Modal
      open={Boolean(loan)}
      onOpenChange={(next) => !next && onClose()}
      title="Acknowledge repayment schedule"
      description="Pokok, bunga dan tenor sebagaimana diterima dari pihak pemberi dana."
      size="wide"
      footer={
        <>
          <Button
            variant="secondary"
            disabled={acknowledge.isPending}
            onClick={() =>
              loan &&
              acknowledge.mutate(
                { id: loan.id, outcome: 'DECLINE', requestNo: loan.requestNo },
                { onSuccess: onClose },
              )
            }
          >
            Decline schedule
          </Button>
          <Button
            disabled={acknowledge.isPending}
            onClick={() =>
              loan &&
              acknowledge.mutate({ id: loan.id, outcome: 'ACK', requestNo: loan.requestNo }, { onSuccess: onClose })
            }
          >
            Acknowledge
          </Button>
        </>
      }
    >
      {loan && offer && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Request no.">{loan.requestNo}</KeyValueRow>
            <KeyValueRow label="Principal">{formatCurrency(offer.acknowledgedPrincipal)}</KeyValueRow>
            <KeyValueRow label="Interest">{formatCurrency(offer.acknowledgedInterest)}</KeyValueRow>
            <KeyValueRow label="Tenor">{offer.acknowledgedTenor} months</KeyValueRow>
            <KeyValueRow label="Total obligation">{formatCurrency(total ?? 0)}</KeyValueRow>
          </KeyValueList>

          <Note icon={<ShieldCheck />}>
            Dikirim dari dalam aplikasi setelah login penuh — permintaannya tidak pernah diterima dari tautan
            notifikasi.
          </Note>

          <Note icon={<GitBranch />}>
            <strong>Decline adalah hasil yang dikontrakkan, bukan pembatalan.</strong> DECLINE menulis{' '}
            <code>loan_status = DECLINED_BY_EMPLOYEE</code>, melepas reservasinya, dan Anda boleh mengajukan permintaan
            baru. <strong>Cancel</strong> hanya ada selagi masih SUBMITTED, dan <strong>Withdraw</strong> berlaku
            setelah AWAITING_CALCULATION — memanggil ACK/DECLINE di luar AWAITING_ACKNOWLEDGEMENT ditolak{' '}
            <strong>422 FIN_LOAN_NOT_AWAITING_ACKNOWLEDGEMENT</strong>.
          </Note>
        </div>
      )}
    </Modal>
  );
}

/** Tabel referensi sepuluh status pinjaman (legend LN-S1). */
export function LoanStatusReferenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Status reference"
      description="Sepuluh status yang bisa dipegang satu permintaan pinjaman, artinya, dan di layar mana ia muncul."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <DataTable<LoanStateRef>
          rows={LOAN_STATES}
          rowKey={(row) => row.status}
          columns={[
            { key: 'status', header: 'Status', render: (row) => <LoanStatusBadge status={row.status} /> },
            { key: 'meaning', header: 'Meaning', render: (row) => row.meaning },
            { key: 'where', header: 'Where It Appears', muted: true, render: (row) => row.appearsIn },
          ]}
        />

        <Note icon={<Lock />}>
          <strong>Siapa boleh mengubah apa.</strong> Finance officer tidak bisa mengubah pokok atau tenor, dan tidak
          bisa membatalkan atau menarik atas nama karyawan — cancel, withdraw dan pelunasan dipercepat tetap milik
          karyawan pemilik pinjaman.
        </Note>
      </div>
    </Modal>
  );
}
