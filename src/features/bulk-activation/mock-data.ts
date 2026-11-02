import type { PendingAccount } from '@/features/bulk-activation/types';

export const PENDING_ACCOUNTS: PendingAccount[] = [
  { employeeId: 'emp-b1', name: 'Hana Prasetyo', username: 'hana.prasetyo', email: 'hana.prasetyo@ptdika.co.id', phoneNumber: '+6281211110001', createdAt: '2026-10-30T09:00:00+07:00', invitationStatus: 'NOT_SENT', invitationSentAt: null, invitationExpiredAt: null, failureReason: null },
  { employeeId: 'emp-b2', name: 'Irfan Maulana', username: 'irfan.maulana', email: 'irfan.maulana@ptdika.co.id', phoneNumber: '+6281211110002', createdAt: '2026-10-30T09:00:00+07:00', invitationStatus: 'NOT_SENT', invitationSentAt: null, invitationExpiredAt: null, failureReason: null },
  { employeeId: 'emp-b3', name: 'Joko Susilo', username: 'joko.susilo', email: 'joko.susilo@ptdika', phoneNumber: '+6281211110003', createdAt: '2026-10-29T10:00:00+07:00', invitationStatus: 'FAILED', invitationSentAt: '2026-10-29T10:05:00+07:00', invitationExpiredAt: '2026-11-01T10:05:00+07:00', failureReason: 'Mailbox does not exist' },
  { employeeId: 'emp-b4', name: 'Kartika Sari', username: 'kartika.sari', email: 'kartika.sari@ptdika.co.id', phoneNumber: '+6281211110004', createdAt: '2026-10-20T10:00:00+07:00', invitationStatus: 'EXPIRED', invitationSentAt: '2026-10-20T10:05:00+07:00', invitationExpiredAt: '2026-10-23T10:05:00+07:00', failureReason: null },
  { employeeId: 'emp-b5', name: 'Lukman Hakim', username: 'lukman.hakim', email: 'lukman.hakim@ptdika.co.id', phoneNumber: '+6281211110005', createdAt: '2026-10-31T08:00:00+07:00', invitationStatus: 'SENT', invitationSentAt: '2026-10-31T08:10:00+07:00', invitationExpiredAt: '2026-11-03T08:10:00+07:00', failureReason: null },
];
