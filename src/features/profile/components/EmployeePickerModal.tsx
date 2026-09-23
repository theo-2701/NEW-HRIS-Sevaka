import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEmployeeLookup } from '@/features/profile/hooks/useProfile';
import type { EmployeeRow } from '@/features/employees/types';

const DEBOUNCE_MS = 300;

/** P1 — pintu masuk HR untuk memilih karyawan yang biodatanya dikelola (FSD-001-PROFILE §1.3). */
export function EmployeePickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (employee: EmployeeRow) => void;
}) {
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!open) {
      setInput('');
      setKeyword('');
    }
  }, [open]);

  const { data, isFetching } = useEmployeeLookup(keyword, open);
  const rows = data?.rows ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Pilih Karyawan"
      description="Cari karyawan berdasarkan nama atau NIK, lalu pilih untuk membuka biodatanya."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-4" />
          <Input
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nama atau NIK"
            aria-label="Cari nama atau NIK"
            className="pl-9"
          />
        </div>

        <div className="flex max-h-[320px] flex-col overflow-y-auto rounded-md border border-border-1">
          {isFetching && rows.length === 0 ? (
            <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">Mencari…</p>
          ) : rows.length === 0 ? (
            <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">Karyawan tidak ditemukan.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row)}
                className="flex items-center gap-3 border-b border-border-1 px-3.5 py-2.5 text-left transition-colors duration-150 ease-standard last:border-b-0 hover:bg-primary-50"
              >
                <Avatar name={row.name} size="sm" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-body text-[13px] font-bold text-fg-1">{row.name}</span>
                  <span className="truncate font-body text-xs font-medium text-fg-3">
                    {row.nik} · {row.branchName}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
