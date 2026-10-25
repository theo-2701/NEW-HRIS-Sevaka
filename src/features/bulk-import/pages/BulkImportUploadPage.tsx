import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Lock, MailCheck } from 'lucide-react';
import { Card, CardHead } from '@/components/Card';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { KeyValueList, KeyValueRow, Note } from '@/features/mass-resignation/components/BatchBits';
import { ImportStatusBadge } from '@/features/bulk-import/components/ImportModals';
import { useUploadImport } from '@/features/bulk-import/hooks/useBulkImport';
import { bulkImportService } from '@/features/bulk-import/services/bulk-import.service';
import { MAX_ROWS, type ImportBatch } from '@/features/bulk-import/types';
import { useAuthStore } from '@/store/auth.store';

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([bulkImportService.templateCsv()], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: 'employee-import-template.csv' }).click();
  URL.revokeObjectURL(url);
}

/**
 * BI-UPLOAD sebagai halaman (Theo, 26 Okt 2026): unduh templat → pilih CSV → unggah & periksa. Tiket VALIDATING
 * tampil di halaman yang sama sesudah 202; belum ada undangan yang terkirim sampai orang lain menyetujui.
 */
export function BulkImportUploadPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canSubmit = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_STAFF';
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState('');
  const [ticket, setTicket] = useState<ImportBatch | null>(null);
  const upload = useUploadImport();

  const pick = (next: File | null) => {
    setFile(next);
    // Kunci baru per berkas; klik ulang untuk berkas yang sama memakai kunci yang sama.
    setKey(crypto.randomUUID());
  };

  const crumbs = [
    { label: 'Employee Management' },
    { label: 'Employee Directory' },
    { label: 'Employee Bulk Import', to: '/employees/bulk-import' },
    { label: 'Import File' },
  ];

  return (
    <PageShell
      crumbs={crumbs}
      title="Import File"
      description="Upload a CSV file with one column: the email address of each candidate. The file is checked first; no invitation is sent until someone else approves it."
      actions={
        <Button variant="secondary" onClick={() => navigate('/employees/bulk-import')}>
          Back to Import History
        </Button>
      }
    >
      {!canSubmit ? (
        <Note tone="warn" icon={<Lock />}>
          This menu is available to HR Staff, HR Manager and Super Admin.
        </Note>
      ) : ticket ? (
        <Card className="gap-4">
          <CardHead title="File received" sub="The rows are being checked now" />
          <KeyValueList>
            <KeyValueRow label="Batch ID">{ticket.id}</KeyValueRow>
            <KeyValueRow label="File name">{ticket.fileName}</KeyValueRow>
            <KeyValueRow label="Status">
              <ImportStatusBadge status={ticket.importStatus} />
            </KeyValueRow>
            <KeyValueRow label="Rows">{ticket.totalRows}</KeyValueRow>
          </KeyValueList>
          <Note icon={<MailCheck />}>
            <strong>No invitation has been sent yet.</strong> Someone other than you must review and approve the batch;
            only then does each candidate receive an email to fill in their own data.
          </Note>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border-1 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setTicket(null);
                pick(null);
              }}
            >
              Import Another File
            </Button>
            <Button onClick={() => navigate(`/employees/bulk-import/detail?id=${ticket.id}`)}>View Batch</Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="gap-3">
            <CardHead title="1. Prepare the file" sub="One heading, one candidate email per row" />
            <Note icon={<Info />}>
              Plain-text CSV only, at most {MAX_ROWS.toLocaleString('en-US')} data rows and 5 MB. The single heading must be{' '}
              <code className="font-mono text-xs">email</code>. Candidates fill in the rest of their details themselves. Your
              file is not stored after it is checked.
            </Note>
            <div>
              <Button variant="secondary" onClick={downloadTemplate}>
                Download CSV Template
              </Button>
            </div>
          </Card>
          <Card className="gap-3">
            <CardHead title="2. Upload and check" />
            <div className="flex flex-col gap-1">
              <Label htmlFor="bi-file">
                CSV file<em>*</em>
              </Label>
              <input
                key={file ? 'filled' : 'empty'}
                id="bi-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => pick(event.target.files?.[0] ?? null)}
                className="rounded-md border border-silver bg-cloud px-3 py-2.5 font-body text-[13px] font-medium text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-vapor file:px-3 file:py-1.5 file:font-semibold file:text-fg-1"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border-1 pt-4">
              <Button variant="secondary" onClick={() => navigate('/employees/bulk-import')}>
                Cancel
              </Button>
              <Button
                disabled={!file || upload.isPending}
                onClick={() =>
                  file &&
                  upload.mutate(
                    { file, key },
                    {
                      onSuccess: setTicket,
                      // 422 → berkas dikosongkan, HR memilih berkas yang sudah dibetulkan (L5).
                      onError: (error) => error.message.startsWith('422') && pick(null),
                    },
                  )
                }
              >
                {upload.isPending ? 'Uploading…' : 'Upload & Check'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
