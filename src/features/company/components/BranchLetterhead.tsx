import { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useDeleteBranchLogo, useUploadBranchLogo } from '@/features/company/hooks/useCompany';

/**
 * Bagian Letterhead form Edit cabang (UIC-COMPANY 0.45 §2.2, CMP-2610241547 T27). Logo
 * diunggah/dihapus langsung lewat endpoint sendiri; toggle kop nonaktif tanpa logo, dan hapus
 * logo mematikan toggle yang belum tersimpan.
 */
export function BranchLetterhead({
  branchId,
  initialLogo,
  checked,
  onCheckedChange,
}: {
  branchId: string;
  initialLogo: string | null;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  const [logo, setLogo] = useState(initialLogo);
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadBranchLogo();
  const remove = useDeleteBranchLogo();
  const busy = upload.isPending || remove.isPending;

  return (
    <section aria-label="Letterhead" className="flex flex-col gap-3 rounded-md border border-border-1 p-3.5">
      <span className="font-body text-[13px] font-bold text-fg-1">Kop surat cabang</span>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-md border border-border-1 bg-cloud text-fg-4">
          <ImageIcon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="flex-1 font-body text-xs font-medium text-fg-2">
          {logo ?? 'Belum ada logo. JPEG atau PNG, maksimal 2 MB.'}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          aria-label="Logo cabang"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) upload.mutate({ id: branchId, file }, { onSuccess: (row) => setLogo(row.logoDocumentId ?? null) });
          }}
        />
        <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {logo ? 'Ganti logo' : 'Unggah logo'}
        </Button>
        {logo && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              remove.mutate(branchId, {
                onSuccess: () => {
                  setLogo(null);
                  onCheckedChange(false);
                },
              })
            }
          >
            Hapus logo
          </Button>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          disabled={!logo}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-body text-[13px] font-semibold text-fg-1">Pakai kop surat cabang</span>
          <span className="font-body text-xs font-medium text-fg-3">
            {logo ? 'Surat dari cabang ini memakai logo dan alamat cabang.' : 'Unggah logo dulu untuk menyalakannya.'}
          </span>
        </span>
      </label>
    </section>
  );
}
