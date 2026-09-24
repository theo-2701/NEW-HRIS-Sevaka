import { StatusBadge } from '@/components/StatusBadge';
import { ASSET_STATUS_LABEL } from '@/features/assets/types';
import type { AssetStatus } from '@/features/assets/types';

type Tone = 'ok' | 'info' | 'warn' | 'err' | 'mute' | 'brand';

/** 9 nilai = 9 badge (§7.2). INCOMPLETE amber non-blocking, NOT_AVAILABLE merah blocker. */
const TONE: Record<AssetStatus, Tone> = {
  AVAILABLE: 'ok',
  ASSIGNED: 'info',
  INCOMPLETE: 'warn',
  NOT_AVAILABLE: 'err',
  AUCTION: 'brand',
  SOLD: 'mute',
  ACCIDENTALLY_LOST: 'warn',
  GRANTED: 'mute',
  EMPLOYEE_NEGLIGENCE: 'err',
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <StatusBadge tone={TONE[status]}>{ASSET_STATUS_LABEL[status]}</StatusBadge>;
}
