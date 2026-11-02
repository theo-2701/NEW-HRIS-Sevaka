import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMPLOYEES } from '@/features/scheduler/mock-data';
import { pickableShifts } from '@/features/scheduler/rules';
import { useDaySetup, useSaveDaySetup } from '@/features/scheduler/hooks/useScheduler';
import { DAY_SETUP_MAX_SHIFTS } from '@/features/scheduler/types';
import type { DaySetupBlock, Shift } from '@/features/scheduler/types';

const cloneBlocks = (rows: DaySetupBlock[]) => rows.map((row) => ({ ...row, employeeIds: [...row.employeeIds] }));

/**
 * Setup Tanggal (UIC-TIME §10.2a): satu tanggal = 1 sampai 3 blok shift, tiap blok
 * shift katalog + jam masuk/pulang (boleh diubah untuk tanggal itu saja) + karyawannya.
 * Satu karyawan satu blok. Salin/Tempel hanya mengisi formulir; Save menggantikan
 * seluruh roster kerja tanggal itu.
 */
export function DaySetupModal({ open, shifts, onClose }: { open: boolean; shifts: Shift[]; onClose: () => void }) {
  const [workDate, setWorkDate] = useState('');
  const [blocks, setBlocks] = useState<DaySetupBlock[]>([]);
  // Bertahan antar buka-tutup modal supaya bisa ditempel ke tanggal lain.
  const [clipboard, setClipboard] = useState<DaySetupBlock[] | null>(null);
  const { data: loaded } = useDaySetup(open ? workDate : '');
  const save = useSaveDaySetup();
  const options = pickableShifts(shifts);

  useEffect(() => {
    if (open) {
      setWorkDate('');
      setBlocks([]);
    }
  }, [open]);

  useEffect(() => {
    if (loaded) setBlocks(cloneBlocks(loaded.shifts));
  }, [loaded]);

  const update = (index: number, patch: Partial<DaySetupBlock>) =>
    setBlocks((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const pickShift = (index: number, shiftId: string) => {
    const shift = shifts.find((row) => row.id === shiftId);
    update(index, { shiftId, startTime: shift?.startTime ?? '', endTime: shift?.endTime ?? '' });
  };

  const toggleEmployee = (index: number, employeeId: string, next: boolean) =>
    update(index, {
      employeeIds: next
        ? [...blocks[index].employeeIds, employeeId]
        : blocks[index].employeeIds.filter((id) => id !== employeeId),
    });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Set up date"
      description="One to three shifts for one date. Save replaces the working roster of that date; employees not listed are released."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!workDate || save.isPending}
            onClick={() => save.mutate({ workDate, shifts: blocks }, { onSuccess: onClose })}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <Label>
              Work date<em>*</em>
            </Label>
            <DatePicker value={workDate} onChange={setWorkDate} placeholder="Select date" />
          </div>
          <Button variant="secondary" disabled={!workDate} onClick={() => setClipboard(cloneBlocks(blocks))}>
            Copy
          </Button>
          <Button variant="secondary" disabled={!workDate || !clipboard} onClick={() => setBlocks(cloneBlocks(clipboard!))}>
            Paste
          </Button>
        </div>

        {workDate && !blocks.length && (
          <span className="font-body text-[13px] font-medium text-fg-3">
            No working roster on this date yet. Add a shift to fill it.
          </span>
        )}

        {blocks.map((block, index) => {
          const taken = new Set(blocks.flatMap((row, i) => (i === index ? [] : row.employeeIds)));
          return (
            <div key={index} className="flex flex-col gap-3 rounded-md border border-border-1 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-body text-[13px] font-bold text-fg-1">Shift {index + 1}</span>
                <Button variant="ghost" onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== index))}>
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Label>
                    Shift<em>*</em>
                  </Label>
                  <Select value={block.shiftId} onValueChange={(value) => pickShift(index, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((row) => (
                        <SelectItem
                          key={row.id}
                          value={row.id}
                          disabled={blocks.some((other, i) => i !== index && other.shiftId === row.id)}
                        >
                          {row.shiftName} ({row.shiftCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Start time</Label>
                  <Input type="time" value={block.startTime} onChange={(e) => update(index, { startTime: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>End time</Label>
                  <Input type="time" value={block.endTime} onChange={(e) => update(index, { endTime: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Employees</Label>
                <div className="flex max-h-[150px] flex-col gap-2 overflow-y-auto rounded-md border border-border-1 bg-cloud p-3">
                  {EMPLOYEES.map((row) => (
                    <label key={row.id} className="flex cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={block.employeeIds.includes(row.id)}
                        disabled={taken.has(row.id)}
                        onCheckedChange={(next) => toggleEmployee(index, row.id, next === true)}
                      />
                      <span className="font-body text-[13px] font-medium text-fg-2">
                        {row.name}
                        <span className="ml-1.5 text-fg-4">{taken.has(row.id) ? 'in another shift' : row.unit}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {workDate && blocks.length < DAY_SETUP_MAX_SHIFTS && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setBlocks((prev) => [...prev, { shiftId: '', startTime: '', endTime: '', employeeIds: [] }])}
          >
            <Plus />
            Add shift
          </Button>
        )}
      </div>
    </Modal>
  );
}
