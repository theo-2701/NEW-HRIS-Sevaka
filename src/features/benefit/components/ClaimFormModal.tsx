import { useEffect, useState } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioBranch } from '@/components/RadioBranch';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { BalanceCard } from '@/features/benefit/components/BenefitBits';
import { balanceOf, draftComplete, draftTotal } from '@/features/benefit/rules';
import { useBeneficiaries, useBenefitTypes, useSubmitClaim } from '@/features/benefit/hooks/useBenefit';
import { RELATIONSHIP_LABEL } from '@/features/benefit/types';
import type { BeneficiaryKind, ClaimDraft, ClaimItemDraft } from '@/features/benefit/types';
import { formatCurrency } from '@/lib/format';

const BLANK_ITEM: ClaimItemDraft = {
  expenseDate: '',
  amount: '',
  beneficiaryKind: 'SELF',
  beneficiaryId: '',
  receiptNo: '',
  documentName: '',
};

/**
 * Form pengajuan klaim. Satu klaim membawa satu jenis manfaat dan satu atau
 * lebih nota; jenis manfaatnya yang menentukan apakah nota wajib dan apakah
 * klaim atas nama keluarga diterima.
 */
export function ClaimFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const submit = useSubmitClaim();
  const { data: types = [] } = useBenefitTypes();
  const { data: beneficiaries = [] } = useBeneficiaries();

  const [draft, setDraft] = useState<ClaimDraft>({ benefitTypeId: '', items: [{ ...BLANK_ITEM }] });

  useEffect(() => {
    if (open) setDraft({ benefitTypeId: '', items: [{ ...BLANK_ITEM }] });
  }, [open]);

  const type = types.find((row) => row.id === draft.benefitTypeId);
  const balance = type ? balanceOf('bp-2026', type.id) : undefined;
  const total = draftTotal(draft);
  const ready = draftComplete(draft, type);

  const patchItem = (index: number, patch: Partial<ClaimItemDraft>) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New claim"
      description="Nominalnya ditahan terhadap hak Anda begitu klaim terkirim, dan baru benar-benar terpakai setelah disetujui."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || submit.isPending}
            onClick={() => submit.mutate(draft, { onSuccess: onClose })}
          >
            {submit.isPending ? 'Mengirim…' : 'Submit claim'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>
            Benefit type<em>*</em>
          </Label>
          <Select
            value={draft.benefitTypeId}
            onValueChange={(benefitTypeId) =>
              setDraft((prev) => ({
                ...prev,
                benefitTypeId,
                // Ganti jenis manfaat mengosongkan pilihan keluarga yang mungkin
                // tak lagi sah pada jenis yang baru.
                items: prev.items.map((item) => ({ ...item, beneficiaryKind: 'SELF', beneficiaryId: '' })),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select benefit type" />
            </SelectTrigger>
            <SelectContent>
              {types
                .filter((row) => row.isActive)
                .map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {balance && <BalanceCard balance={balance} />}

        {type?.containsHealthData && (
          <Note tone="warn" icon={<ShieldAlert />}>
            <strong>Data kesehatan — aksesnya dibatasi begitu klaim tersimpan.</strong> Lampiran ini hanya bisa dibuka
            HR Manager / Health Data Officer / Super Admin, dan setiap pembukaan ditulis ke jejak akses medis.
          </Note>
        )}

        {draft.items.map((item, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-[10px] border border-border-1 bg-cloud p-4">
            <div className="flex items-center justify-between">
              <span className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-fg-3">
                Receipt {index + 1}
              </span>
              {index > 0 && (
                <button
                  type="button"
                  aria-label="Hapus nota"
                  onClick={() => setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                  className="inline-flex size-7 items-center justify-center rounded-md text-fg-4 transition-colors duration-200 ease-standard hover:bg-error-50 hover:text-error-600 [&_svg]:size-4"
                >
                  <Trash2 />
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>
                  Expense date<em>*</em>
                </Label>
                <DatePicker
                  value={item.expenseDate}
                  onChange={(expenseDate) => patchItem(index, { expenseDate })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>
                  Amount<em>*</em>
                </Label>
                <Input
                  inputMode="numeric"
                  value={item.amount}
                  placeholder="0"
                  onChange={(event) => patchItem(index, { amount: event.target.value.replace(/[^\d]/g, '') })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Claimed for<em>*</em>
              </Label>
              <RadioBranch<BeneficiaryKind>
              name={`kind-${index}`}
              value={item.beneficiaryKind}
              onChange={(beneficiaryKind) => patchItem(index, { beneficiaryKind, beneficiaryId: '' })}
              options={[
                { value: 'SELF', title: 'Myself', description: 'Nota atas nama Anda sendiri.' },
                {
                  value: 'FAMILY_MEMBER',
                  title: 'Family member',
                  description: type?.allowsFamilyClaim
                    ? 'Dari daftar beneficiary Anda — tambahkan lebih dulu di tab Beneficiaries.'
                    : 'Jenis manfaat ini tidak menerima klaim atas nama keluarga.',
                  disabled: !type?.allowsFamilyClaim,
                },
              ]}
              />
            </div>

            {item.beneficiaryKind === 'FAMILY_MEMBER' && (
              <div className="flex flex-col gap-1">
                <Label>
                  Family member<em>*</em>
                </Label>
                <Select
                  value={item.beneficiaryId}
                  onValueChange={(beneficiaryId) => patchItem(index, { beneficiaryId })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select beneficiary" />
                  </SelectTrigger>
                  <SelectContent>
                    {beneficiaries
                      .filter((row) => row.isActive)
                      .map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.name} — {RELATIONSHIP_LABEL[row.relationshipType]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type?.requiresReceipt ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label>
                    Receipt no.<em>*</em>
                  </Label>
                  <Input
                    maxLength={60}
                    value={item.receiptNo}
                    placeholder="RS-MELATI/2026/07/0231"
                    onChange={(event) => patchItem(index, { receiptNo: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>
                    Attachment<em>*</em>
                  </Label>
                  <Input
                    value={item.documentName}
                    placeholder="nota-rs-melati.pdf"
                    onChange={(event) => patchItem(index, { documentName: event.target.value })}
                  />
                  <span className="font-body text-xs font-normal text-fg-3">
                    Mekanisme unggah berkas masih menyusul di seluruh HRIS — field ini mencatat ketersediaannya.
                  </span>
                </div>
              </div>
            ) : (
              <span className="font-body text-xs font-normal text-fg-3">
                Jenis manfaat ini tidak menuntut bukti nota.
              </span>
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setDraft((prev) => ({ ...prev, items: [...prev.items, { ...BLANK_ITEM }] }))}
          >
            + Add receipt
          </Button>
          <span className="font-body text-[13px] font-medium text-fg-3">
            {draft.items.length} nota · total{' '}
            <strong className="font-bold text-fg-1">{formatCurrency(total)}</strong>
          </span>
        </div>
      </div>
    </Modal>
  );
}
