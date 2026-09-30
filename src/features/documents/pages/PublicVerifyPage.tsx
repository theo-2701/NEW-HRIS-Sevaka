import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, CircleX } from 'lucide-react';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/features/company/components/CompanyBits';
import { GovError, GovNote } from '@/features/documents/components/GovBits';
import { useVerifyByCode, useVerifyByNumber } from '@/features/documents/hooks/useGovernance';
import type { VerifyResult } from '@/features/documents/types';
import { formatDate } from '@/lib/format';

type Path = 'CODE' | 'NUMBER';

function ResultCard({ result }: { result: VerifyResult }) {
  if (!result.matched) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-fog bg-white p-5">
        <div className="flex items-center gap-2 font-body text-[15px] font-bold text-fg-1">
          <CircleX className="size-5 text-fg-3" /> Not matched
        </div>
        <p className="m-0 font-body text-[13px] font-medium text-fg-2">
          The details you entered do not match a letter issued by this company.
        </p>
        <GovNote>
          The same answer is given whether the code or number does not exist, belongs to another company, has not been
          issued yet, is a circular, or the name does not match. No further detail is given, by design.
        </GovNote>
      </div>
    );
  }
  const cancelled = result.letterState === 'DIBATALKAN';
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-fog bg-white p-5">
      <div className="flex items-center gap-2 font-body text-[15px] font-bold text-fg-1">
        <BadgeCheck className="size-5 text-success-600" /> Matched
      </div>
      <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 font-body text-[13px]">
        <dt className="font-semibold text-fg-3">Letter type</dt>
        <dd className="m-0 font-semibold text-fg-1">{result.letterType}</dd>
        <dt className="font-semibold text-fg-3">Issued on</dt>
        <dd className="m-0 font-semibold text-fg-1">
          {formatDate(result.issuedAt)} · {result.issuedAtTimezone}
        </dd>
        <dt className="font-semibold text-fg-3">Status</dt>
        <dd className="m-0">
          <StatusBadge tone={cancelled ? 'err' : 'ok'}>{cancelled ? 'Cancelled' : 'Valid'}</StatusBadge>
        </dd>
        {cancelled && result.cancelledAt && (
          <>
            <dt className="font-semibold text-fg-3">Cancelled on</dt>
            <dd className="m-0 font-semibold text-fg-1">{formatDate(result.cancelledAt)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

/**
 * Halaman Pemeriksaan Keaslian — FSD-001-DOCUMENT-0.8 §9 · UIC §7 (`C2a`/`C2b`/`C2c`). Publik, tanpa login, dan
 * SENGAJA tanpa menu (DOC-80). Menjawab cocok/tidak cocok saja; nama yang diketik tidak pernah disimpan; alasan
 * pembatalan tidak pernah tampil.
 */
export function PublicVerifyPage() {
  const { code: linked } = useParams<{ code?: string }>();
  const [path, setPath] = useState<Path>(linked ? 'CODE' : 'NUMBER');
  const [code, setCode] = useState(linked ?? '');
  const [letterNo, setLetterNo] = useState('');
  const [name, setName] = useState('');
  const byCode = useVerifyByCode();
  const byNumber = useVerifyByNumber();
  const active = path === 'CODE' ? byCode : byNumber;

  const check = () =>
    path === 'CODE' ? byCode.mutate({ code: code.trim().toUpperCase(), name }) : byNumber.mutate({ letterNo, name });

  return (
    <div className="min-h-screen bg-cloud px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="font-body text-xs font-bold uppercase tracking-[0.08em] text-fg-3">
            PT DIKA · Letter authenticity
          </span>
          <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Check a letter</h1>
          <p className="m-0 font-body text-[13px] font-medium text-fg-2">
            Confirm that a letter was issued by PT DIKA. You only get “matched” or “not matched” — never a copy of the
            letter.
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-fog bg-white p-5 shadow-card-sm">
          {!linked && (
            <Segmented<Path>
              value={path}
              onChange={(next) => {
                setPath(next);
                byCode.reset();
                byNumber.reset();
              }}
              options={[
                { value: 'NUMBER', label: 'Letter number' },
                { value: 'CODE', label: 'Verification code' },
              ]}
            />
          )}
          <GovError error={active.error} />
          {path === 'CODE' ? (
            <Field
              label="Verification code"
              required
              hint={linked ? 'Taken from the QR code on the letter.' : 'Format XXXX-XXXX-XXXX.'}
            >
              <Input
                value={code}
                disabled={Boolean(linked)}
                onChange={(event) => setCode(event.target.value)}
                placeholder="K7M2-P4QX-9WTB"
              />
            </Field>
          ) : (
            <Field label="Letter number" required hint="Type it exactly as printed on the letter.">
              <Input
                value={letterNo}
                onChange={(event) => setLetterNo(event.target.value)}
                placeholder="001/HRD/VIII/2026"
              />
            </Field>
          )}
          <Field label="Name on the letter" required hint="Used only for this check — it is never stored.">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button
              disabled={!name.trim() || (path === 'CODE' ? !code.trim() : !letterNo.trim()) || active.isPending}
              onClick={check}
            >
              {active.isPending ? 'Checking…' : 'Check'}
            </Button>
          </div>
        </div>
        {active.data && <ResultCard result={active.data} />}
        <p className="m-0 text-center font-body text-xs font-medium text-fg-3">
          Only trust this check on the official company address you typed yourself — a QR code can point anywhere.
        </p>
      </div>
    </div>
  );
}
