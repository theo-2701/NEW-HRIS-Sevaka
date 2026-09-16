import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { EMPLOYEES, employeeName } from '@/features/salary-processing/mock-data';
import type { ChangeBatch, SalaryComponent } from '@/features/payroll-authorization/types';
import {
  useAddBatchItem,
  useCreateBatch,
  useCreateComponent,
  useProposeTrait,
  useProposeValue,
  useRenameComponent,
  useSubmitBatch,
} from '@/features/salary-settings/hooks/useSalarySettings';
import { useEmployeeValues } from '@/features/salary-settings/hooks/useSalarySettings';
import { BULK_ESCALATION_THRESHOLD } from '@/features/salary-settings/mock-data';
import {
  checkUmp,
  nextPeriodStart,
  parseAmount,
  regionalWageOf,
  salaryBaseAfter,
} from '@/features/salary-settings/rules';
import { UMP_REASONS, UMP_REASON_LABEL } from '@/features/salary-settings/types';
import type { Actor, ComponentDraft, TraitProposalInput, UmpReason } from '@/features/salary-settings/types';
import { formatCurrency, formatDate } from '@/lib/format';

const EMPTY_COMPONENT: ComponentDraft = {
  componentCode: '',
  componentName: '',
  isFixed: false,
  isOvertimeBasis: null,
  isTaxable: false,
  isBpjsDeductible: false,
};

function TraitToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span className="flex flex-col gap-0.5">
        <span className="font-body text-[13px] font-semibold text-fg-1">{label}</span>
        {hint && <span className="font-body text-xs font-medium text-fg-3">{hint}</span>}
      </span>
    </label>
  );
}

/** F2/F3 — buat komponen, atau ubah namanya saja. */
export function ComponentFormModal({
  actor,
  open,
  editing,
  onClose,
}: {
  actor: Actor;
  open: boolean;
  editing: SalaryComponent | null;
  onClose: () => void;
}) {
  const create = useCreateComponent();
  const rename = useRenameComponent();
  const [draft, setDraft] = useState<ComponentDraft>(EMPTY_COMPONENT);
  const [overtimeTouched, setOvertimeTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOvertimeTouched(false);
    setDraft(
      editing
        ? {
            componentCode: editing.componentCode,
            componentName: editing.name,
            isFixed: editing.isFixed,
            isOvertimeBasis: editing.isOvertimeBasis,
            isTaxable: editing.isTaxable,
            isBpjsDeductible: editing.isBpjsDeductible,
          }
        : EMPTY_COMPONENT,
    );
  }, [open, editing]);

  const set = <K extends keyof ComponentDraft>(key: K, value: ComponentDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const overtimeValue = overtimeTouched ? Boolean(draft.isOvertimeBasis) : draft.isFixed;
  const ready = editing ? draft.componentName.trim().length > 0 : draft.componentCode.trim() && draft.componentName.trim();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? 'Rename component' : 'New salary component'}
      description={
        editing
          ? 'Hanya nama yang bisa diubah langsung. Mengubah sifat komponen harus lewat pengajuan usulan.'
          : 'Komponen baru langsung aktif. Sifatnya bisa diubah kemudian lewat pengajuan usulan.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || create.isPending || rename.isPending}
            onClick={() =>
              editing
                ? rename.mutate({ actor, id: editing.id, name: draft.componentName }, { onSuccess: onClose })
                : create.mutate(
                    { actor, draft: { ...draft, isOvertimeBasis: overtimeTouched ? overtimeValue : null } },
                    { onSuccess: onClose },
                  )
            }
          >
            {create.isPending || rename.isPending ? 'Saving…' : editing ? 'Save name' : 'Create component'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="component-code">
            Code<em>*</em>
          </Label>
          <Input
            id="component-code"
            value={draft.componentCode}
            disabled={Boolean(editing)}
            placeholder="SC-009"
            onChange={(event) => set('componentCode', event.target.value.toUpperCase())}
          />
          <span className="font-body text-[11px] font-medium text-fg-3">
            Huruf kapital, angka, atau garis bawah. Tidak bisa diubah setelah dibuat.
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="component-name">
            Name<em>*</em>
          </Label>
          <Input
            id="component-name"
            value={draft.componentName}
            onChange={(event) => set('componentName', event.target.value)}
          />
        </div>
      </div>

      {!editing && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-1 bg-mist p-4">
          <TraitToggle label="Komponen tetap" checked={draft.isFixed} onChange={(value) => set('isFixed', value)} />
          <TraitToggle
            label="Dasar perhitungan lembur"
            hint={
              overtimeTouched
                ? 'Diatur manual.'
                : `Mengikuti komponen tetap (${draft.isFixed ? 'ya' : 'tidak'}) selama belum diubah.`
            }
            checked={overtimeValue}
            onChange={(value) => {
              setOvertimeTouched(true);
              set('isOvertimeBasis', value);
            }}
          />
          <TraitToggle label="Kena pajak" checked={draft.isTaxable} onChange={(value) => set('isTaxable', value)} />
          <TraitToggle
            label="Kena potongan BPJS"
            checked={draft.isBpjsDeductible}
            onChange={(value) => set('isBpjsDeductible', value)}
          />
        </div>
      )}
    </Modal>
  );
}

/** F4 — ajukan usulan sifat; minimal satu sifat wajib berbeda. */
export function TraitProposalModal({
  actor,
  component,
  onClose,
}: {
  actor: Actor;
  component: SalaryComponent | null;
  onClose: () => void;
}) {
  const propose = useProposeTrait();
  const [input, setInput] = useState<TraitProposalInput>({
    isFixed: false,
    isOvertimeBasis: false,
    isTaxable: false,
    isBpjsDeductible: false,
  });

  useEffect(() => {
    if (!component) return;
    setInput({
      isFixed: component.isFixed,
      isOvertimeBasis: component.isOvertimeBasis,
      isTaxable: component.isTaxable,
      isBpjsDeductible: component.isBpjsDeductible,
    });
  }, [component]);

  const changed = component
    ? component.isFixed !== input.isFixed ||
      component.isOvertimeBasis !== input.isOvertimeBasis ||
      component.isTaxable !== input.isTaxable ||
      component.isBpjsDeductible !== input.isBpjsDeductible
    : false;

  const set = <K extends keyof TraitProposalInput>(key: K, value: boolean) =>
    setInput((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open={Boolean(component)}
      onOpenChange={(next) => !next && onClose()}
      title="Propose trait change"
      description="Sifat komponen tidak berubah langsung. Usulan ini menunggu keputusan HR Manager dan berlaku pada awal periode berikutnya."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!changed || propose.isPending}
            title={changed ? undefined : 'Ubah minimal satu sifat'}
            onClick={() => component && propose.mutate({ actor, id: component.id, input }, { onSuccess: onClose })}
          >
            {propose.isPending ? 'Submitting…' : 'Submit proposal'}
          </Button>
        </>
      }
    >
      {component && (
        <>
          <KeyValueList>
            <KeyValueRow label="Component">
              {component.componentCode} · {component.name}
            </KeyValueRow>
            <KeyValueRow label="Effective from">{formatDate(nextPeriodStart())} (dihitung sistem)</KeyValueRow>
          </KeyValueList>

          <div className="flex flex-col gap-3 rounded-lg border border-border-1 bg-mist p-4">
            <TraitToggle label="Komponen tetap" checked={input.isFixed} onChange={(value) => set('isFixed', value)} />
            <TraitToggle
              label="Dasar perhitungan lembur"
              checked={input.isOvertimeBasis}
              onChange={(value) => set('isOvertimeBasis', value)}
            />
            <TraitToggle label="Kena pajak" checked={input.isTaxable} onChange={(value) => set('isTaxable', value)} />
            <TraitToggle
              label="Kena potongan BPJS"
              checked={input.isBpjsDeductible}
              onChange={(value) => set('isBpjsDeductible', value)}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

/** G2 — ajukan perubahan nilai, dengan pemeriksaan UMP sebelum pengajuan diteruskan. */
export function ValueProposalModal({
  actor,
  open,
  employeeId,
  components,
  onClose,
}: {
  actor: Actor;
  open: boolean;
  employeeId: string;
  components: SalaryComponent[];
  onClose: () => void;
}) {
  const propose = useProposeValue();
  const values = useEmployeeValues(employeeId);
  const [componentId, setComponentId] = useState('');
  const [amount, setAmount] = useState('');
  const [umpReason, setUmpReason] = useState<UmpReason | ''>('');
  const [umpNote, setUmpNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setComponentId('');
    setAmount('');
    setUmpReason('');
    setUmpNote('');
  }, [open, employeeId]);

  const parsed = parseAmount(amount);
  const check = useMemo(() => {
    if (!componentId || parsed === null) return null;
    const base = salaryBaseAfter(
      (values.data ?? []).map((row) => ({ ...row })),
      components,
      employeeId,
      componentId,
      parsed,
    );
    return checkUmp(regionalWageOf(employeeId), base);
  }, [componentId, parsed, values.data, components, employeeId]);

  const belowUmp = check?.isBelowUmp ?? false;
  const ready =
    Boolean(componentId) &&
    parsed !== null &&
    (!belowUmp || (umpReason !== '' && (umpReason !== 'LAINNYA' || umpNote.trim().length > 0)));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Propose salary change"
      description="Satu usulan menunggu per karyawan dan komponen. Tanggal berlakunya dihitung sistem, bukan dipilih di sini."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || propose.isPending}
            onClick={() =>
              propose.mutate(
                { actor, input: { employeeId, salaryComponentId: componentId, amount, umpReason, umpNote } },
                { onSuccess: onClose },
              )
            }
          >
            {propose.isPending ? 'Submitting…' : 'Submit proposal'}
          </Button>
        </>
      }
    >
      <KeyValueList>
        <KeyValueRow label="Employee">{employeeName(employeeId)}</KeyValueRow>
        <KeyValueRow label="Branch minimum wage">{formatCurrency(regionalWageOf(employeeId))}</KeyValueRow>
        <KeyValueRow label="Effective from">{formatDate(nextPeriodStart())} (dihitung sistem)</KeyValueRow>
      </KeyValueList>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label>
            Component<em>*</em>
          </Label>
          <Select value={componentId} onValueChange={setComponentId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih komponen" />
            </SelectTrigger>
            <SelectContent>
              {components.map((row) => (
                <SelectItem key={row.id} value={row.componentCode}>
                  {row.componentCode} · {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="value-amount">
            New amount<em>*</em>
          </Label>
          <Input
            id="value-amount"
            inputMode="decimal"
            value={amount}
            placeholder="4500000"
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
      </div>

      {check && (
        <div
          className={
            belowUmp
              ? 'flex flex-col gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3'
              : 'rounded-lg border border-border-1 bg-mist px-4 py-3'
          }
        >
          <span className="font-body text-[13px] font-medium leading-normal text-fg-2">
            Gaji dasar setelah perubahan <strong>{formatCurrency(check.salaryBase)}</strong>
            {belowUmp
              ? ` — di bawah upah minimum cabang ${formatCurrency(check.regionalWage)}. Pilih alasannya sebelum mengirim.`
              : ' — di atas upah minimum cabang.'}
          </span>

          {belowUmp && (
            <>
              <div className="flex flex-col gap-1">
                <Label>
                  Reason<em>*</em>
                </Label>
                <Select value={umpReason} onValueChange={(value) => setUmpReason(value as UmpReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih alasan" />
                  </SelectTrigger>
                  <SelectContent>
                    {UMP_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {UMP_REASON_LABEL[reason]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {umpReason === 'LAINNYA' && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ump-note">
                    Note<em>*</em>
                  </Label>
                  <Textarea id="ump-note" rows={2} value={umpNote} onChange={(event) => setUmpNote(event.target.value)} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/** G5 — buat kumpulan baru; lahir sebagai draft kosong. */
export function BatchFormModal({ actor, open, onClose }: { actor: Actor; open: boolean; onClose: () => void }) {
  const create = useCreateBatch();
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New bulk change"
      description="Kumpulan dibuat sebagai draft. Anggotanya ditambahkan dulu, baru dikunci dan diajukan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate({ actor, name }, { onSuccess: onClose })}
          >
            {create.isPending ? 'Saving…' : 'Create draft'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="batch-name">
          Batch name<em>*</em>
        </Label>
        <Input
          id="batch-name"
          value={name}
          placeholder="Kenaikan Berkala Semester 2 2026"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
    </Modal>
  );
}

/** Tambah anggota kumpulan selagi masih draft. */
export function BatchItemModal({
  actor,
  batch,
  components,
  onClose,
}: {
  actor: Actor;
  batch: ChangeBatch | null;
  components: SalaryComponent[];
  onClose: () => void;
}) {
  const addItem = useAddBatchItem();
  const [employeeId, setEmployeeId] = useState('');
  const [componentId, setComponentId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!batch) return;
    setEmployeeId('');
    setComponentId('');
    setAmount('');
  }, [batch]);

  const ready = Boolean(employeeId && componentId) && parseAmount(amount) !== null;

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(next) => !next && onClose()}
      title="Add batch member"
      description="Nominal di sini adalah selisih perubahan per bulan untuk karyawan tersebut."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || addItem.isPending}
            onClick={() =>
              batch &&
              addItem.mutate(
                { actor, id: batch.id, item: { employeeId, salaryComponentId: componentId, amount } },
                { onSuccess: onClose },
              )
            }
          >
            {addItem.isPending ? 'Adding…' : 'Add member'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label>
            Employee<em>*</em>
          </Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih karyawan" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMPLOYEES).map(([id, employee]) => (
                <SelectItem key={id} value={id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>
            Component<em>*</em>
          </Label>
          <Select value={componentId} onValueChange={setComponentId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih komponen" />
            </SelectTrigger>
            <SelectContent>
              {components.map((row) => (
                <SelectItem key={row.id} value={row.componentCode}>
                  {row.componentCode} · {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <Label htmlFor="item-amount">
            Monthly change<em>*</em>
          </Label>
          <Input
            id="item-amount"
            inputMode="decimal"
            value={amount}
            placeholder="200000"
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

/** Kunci dan ajukan kumpulan; kebutuhan eskalasi dihitung di titik ini. */
export function SubmitBatchModal({
  actor,
  batch,
  onClose,
}: {
  actor: Actor;
  batch: ChangeBatch | null;
  onClose: () => void;
}) {
  const submit = useSubmitBatch();
  const members = batch ? new Set(batch.items.map((item) => item.employeeId)).size : 0;
  const willEscalate = members > BULK_ESCALATION_THRESHOLD;

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(next) => !next && onClose()}
      title="Lock & submit batch"
      description="Setelah dikunci, anggotanya tidak bisa diubah lagi dan ringkasan dampaknya dibekukan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!batch?.items.length || submit.isPending}
            onClick={() => batch && submit.mutate({ actor, id: batch.id }, { onSuccess: onClose })}
          >
            {submit.isPending ? 'Submitting…' : 'Lock & submit'}
          </Button>
        </>
      }
    >
      {batch && (
        <KeyValueList>
          <KeyValueRow label="Batch">{batch.batchName}</KeyValueRow>
          <KeyValueRow label="Members">{members} karyawan</KeyValueRow>
          <KeyValueRow label="Monthly change">
            {formatCurrency(batch.items.reduce((total, item) => total + item.amountDelta, 0))}
          </KeyValueRow>
          <KeyValueRow label="Escalation">
            {willEscalate
              ? `Perlu penyetuju eskalasi — anggotanya lebih dari ${BULK_ESCALATION_THRESHOLD}.`
              : `Cukup diputuskan HR Manager — ambangnya ${BULK_ESCALATION_THRESHOLD} karyawan.`}
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}
