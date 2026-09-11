import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { benefitService } from '@/features/benefit/services/benefit.service';
import { toast } from '@/store/ui.store';
import type { ClaimFilter, RejectInput } from '@/features/benefit/services/benefit.service';
import type { BenefitTypeDraft, ClaimDraft } from '@/features/benefit/types';
import type { ToastTone } from '@/store/ui.store';

export const benefitKeys = {
  all: ['benefit'] as const,
  claims: (filter: ClaimFilter) => ['benefit', 'claims', filter] as const,
  types: ['benefit', 'types'] as const,
  beneficiaries: ['benefit', 'beneficiaries'] as const,
  relatives: ['benefit', 'relatives'] as const,
  ledger: ['benefit', 'ledger'] as const,
  disbursements: ['benefit', 'disbursements'] as const,
};

export function useClaims(filter: ClaimFilter) {
  return useQuery({ queryKey: benefitKeys.claims(filter), queryFn: () => benefitService.claims(filter) });
}

export function useBenefitTypes() {
  return useQuery({ queryKey: benefitKeys.types, queryFn: () => benefitService.benefitTypes() });
}

export function useBeneficiaries() {
  return useQuery({ queryKey: benefitKeys.beneficiaries, queryFn: () => benefitService.beneficiaries() });
}

export function useSelectableRelatives() {
  return useQuery({ queryKey: benefitKeys.relatives, queryFn: () => benefitService.selectableRelatives() });
}

export function useBenefitLedger() {
  return useQuery({ queryKey: benefitKeys.ledger, queryFn: () => benefitService.ledger() });
}

export function useBenefitDisbursements() {
  return useQuery({ queryKey: benefitKeys.disbursements, queryFn: () => benefitService.disbursements() });
}

function useBenefitMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: benefitKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSubmitClaim = () =>
  useBenefitMutation<ClaimDraft, { requestNo: string; totalAmount: number }>(
    async (draft) => {
      const row = await benefitService.submitClaim(draft);
      return { requestNo: row.requestNo, totalAmount: row.totalAmount };
    },
    (result) => ({
      text: `201 Created — ${result.requestNo} terkirim; nominalnya ditahan dulu terhadap hak Anda sampai ada keputusan.`,
    }),
  );

export const useCancelClaim = () =>
  useBenefitMutation<{ id: string; requestNo: string }>(
    ({ id }) => benefitService.cancelClaim(id).then(() => undefined),
    (_result, { requestNo }) => ({
      text: `200 OK — ${requestNo} dibatalkan. Barisnya tetap ada; reservasinya dilepas.`,
      tone: 'warn',
    }),
  );

/** Keputusan approver kembali 202: statusnya ditulis saat workflow selesai. */
export const useApproveClaim = () =>
  useBenefitMutation<{ id: string }>(
    ({ id }) => benefitService.approveClaim(id).then(() => undefined),
    () => ({
      text: '202 Accepted — keputusan diteruskan ke proses approval. Statusnya ditulis saat peristiwa selesainya workflow dikonsumsi.',
      tone: 'info',
    }),
  );

export const useRejectClaim = () =>
  useBenefitMutation<RejectInput & { requestNo: string; reasonName: string }>(
    (input) => benefitService.rejectClaim(input).then(() => undefined),
    (_result, input) => ({
      text: `202 Accepted — ${input.requestNo} ditolak karena "${input.reasonName}". Reservasinya dilepas saat prosesnya selesai.`,
      tone: 'info',
    }),
  );

export const useSaveBenefitType = () =>
  useBenefitMutation<{ draft: BenefitTypeDraft; id?: string }, { name: string; healthChanged: boolean }>(
    async ({ draft, id }) => {
      const before = id ? (await benefitService.benefitTypes()).find((row) => row.id === id) : undefined;
      const healthChanged = Boolean(before && before.containsHealthData !== draft.containsHealthData);
      const row = await benefitService.saveBenefitType(draft, id);
      return { name: row.name, healthChanged };
    },
    (result, { id }) => ({
      text: id
        ? `200 OK — ${result.name} diperbarui${result.healthChanged ? ' · perubahan flag data kesehatan tercatat beserta alasannya.' : '.'}`
        : `201 Created — jenis manfaat ${result.name} ditambahkan.`,
    }),
  );

export const useAddBeneficiary = () =>
  useBenefitMutation<{ relativeId: string }, { name: string }>(
    async ({ relativeId }) => {
      const row = await benefitService.addBeneficiary(relativeId);
      return { name: row.name };
    },
    (result) => ({ text: `201 Created — ${result.name} ditambahkan sebagai beneficiary.` }),
  );

export const useDeactivateBeneficiary = () =>
  useBenefitMutation<{ id: string }>(
    ({ id }) => benefitService.deactivateBeneficiary(id).then(() => undefined),
    () => ({
      text: '200 OK — beneficiary dinonaktifkan dan tercatat di riwayatnya. Barisnya tidak pernah dihapus keras, dan menyalakannya kembali bukan wewenang peran Anda.',
      tone: 'warn',
    }),
  );
