import { useEffect, useRef, useState } from 'react';
import { Info, KeyRound, MapPin } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { RadiusCell } from '@/features/attendance/components/AttendanceBits';
import { ARRANGEMENT_LABEL } from '@/features/attendance/types';
import type { CaptureChannel } from '@/features/attendance/types';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import { toast } from '@/store/ui.store';
import { formatDate, formatDateTime } from '@/lib/format';

/**
 * Konsol tap — port `.tm-punch`.
 *
 * Tombolnya tidak pernah dipilih: keadaan hari yang menentukan mana yang
 * muncul. Waktu, koordinat, akurasi, dan detail perangkat diambil di latar.
 */
export function PunchConsole({
  workDate,
  channel,
  nextType,
  hasTaps,
  tappedInAt,
  selfieCaptured,
  onTakeSelfie,
  onPunch,
  busy,
}: {
  workDate: string;
  channel: CaptureChannel;
  nextType: 'IN' | 'OUT' | null;
  hasTaps: boolean;
  tappedInAt: string | null;
  selfieCaptured: boolean;
  onTakeSelfie: () => void;
  onPunch: () => void;
  busy: boolean;
}) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hhmmss = [clock.getHours(), clock.getMinutes(), clock.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');

  const state = !hasTaps
    ? 'No tap recorded today.'
    : nextType === 'OUT'
      ? `Tapped in at ${tappedInAt} — the day is still open.`
      : 'Both taps recorded. Punch is append-only: there is no edit and no delete here.';

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <div className="flex flex-col gap-1.5 rounded-2xl bg-[linear-gradient(180deg,rgb(122,185,212),rgb(2,99,149))] p-6 text-white shadow-card">
        <span className="font-body text-[11px] font-semibold uppercase leading-none tracking-[0.08em] opacity-85">
          Device clock
        </span>
        <span className="font-display text-5xl font-bold leading-none tabular-nums tracking-[-0.03em]">{hhmmss}</span>
        <span className="mb-3.5 font-body text-[13px] font-medium leading-[1.4] opacity-90">
          {formatDate(workDate)} · Asia/Jakarta (WIB)
        </span>

        <button
          type="button"
          disabled={!nextType || busy}
          onClick={onPunch}
          className="h-12 rounded-[10px] bg-white font-body text-sm font-bold tracking-[0.04em] text-secondary-700 transition-[box-shadow,background] duration-150 ease-standard hover:shadow-press disabled:cursor-not-allowed disabled:opacity-60"
        >
          {nextType === 'IN' ? 'TAP IN' : nextType === 'OUT' ? 'TAP OUT' : 'DAY COMPLETE'}
        </button>

        <span className="mt-3 font-body text-xs font-medium leading-[1.5] opacity-90">{state}</span>

        {channel.selfie && (
          <div className="mt-4 flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="light" className="w-full" onClick={onTakeSelfie}>
                {selfieCaptured ? 'Retake' : 'Take selfie'}
              </Button>
              {selfieCaptured && (
                <span className="font-body text-xs font-medium leading-[1.4] text-white/90">
                  Frame ready — camera source
                </span>
              )}
            </div>
            <span className="font-body text-[11px] font-medium leading-[1.45] text-white/80">
              Required by this capture channel. Live camera only — no file picker, so a photo out of the gallery can
              never stand in for the person tapping. Without a frame the tap is refused 422.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <Note icon={<Info />}>
          Which button you see is decided by the state of the day, not by a choice: no <code>IN</code> yet → Tap in; an{' '}
          <code>IN</code> with no <code>OUT</code> → Tap out. The timestamp, the coordinates, the accuracy and the
          device details are all captured in the background — a future time is refused, and the timezone sent is the
          employee&rsquo;s, never the server&rsquo;s.
        </Note>

        <Note icon={<MapPin />}>
          Capture channel — <strong>{ARRANGEMENT_LABEL[channel.arrangement]}</strong> ×{' '}
          <strong>{channel.geofence.geofenceName}</strong> (radius {channel.geofence.radiusMeters} m):{' '}
          {channel.radius ? 'inside the radius is required' : 'no radius requirement'},{' '}
          {channel.selfie ? 'a selfie is required' : 'no selfie required'}. The crossing is the rule, not the button.
        </Note>

        <Note icon={<KeyRound />}>
          An <code>Idempotency-Key</code> is generated per tap <em>attempt</em> and reused verbatim on retry — a slow
          connection and a second press never produce a second row. It is scoped to (employee, key), not globally.
        </Note>

        <Note icon={<MapPin />}>
          If the device refuses location permission, both coordinates stay empty and <strong>the tap is still saved</strong>.
          Whether it was inside the radius is computed by the server — never accepted from the client — and an empty
          verdict means <em>could not be evaluated</em>, not a violation.
        </Note>
      </div>
    </div>
  );
}

/**
 * Pengambilan selfie. Klien sungguhan hanya menerima frame kamera langsung —
 * tidak ada pemilih berkas, supaya foto dari galeri tidak pernah bisa
 * menggantikan orang yang menekan tombol.
 */
export function SelfieModal({
  open,
  onClose,
  onCaptured,
}: {
  open: boolean;
  onClose: () => void;
  onCaptured: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    let cancelled = false;

    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'This preview frame has no camera permission, so no live capture is possible here. The real client accepts a camera frame only — never a file picker.',
      );
      return stop;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(
          err.name === 'NotFoundError'
            ? 'No camera device is available on this machine. The real client accepts a camera frame only — never a file picker.'
            : 'The camera is blocked in this environment or was refused. The real client accepts a camera frame only — never a file picker.',
        );
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  const shoot = (simulated: boolean) => {
    if (!simulated && !streamRef.current) {
      setError('No live frame yet — the camera is not streaming.');
      return;
    }
    onCaptured();
    onClose();
    toast(
      simulated
        ? 'Simulated frame stamped — the real client accepts a live camera frame only, never a file.'
        : 'Frame captured — it uploads with the tap and becomes selfie_document_id.',
      simulated ? 'info' : 'ok',
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Take selfie"
      description="Live camera only — nothing from the gallery can stand in for it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {error ? (
            <Button onClick={() => shoot(true)}>Use simulated frame</Button>
          ) : (
            <Button onClick={() => shoot(false)}>Capture</Button>
          )}
        </>
      }
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-obsidian">
        <video ref={videoRef} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
        {error && (
          <span className="absolute inset-0 flex items-center justify-center p-6 text-center font-body text-[13px] font-medium leading-[1.5] text-white">
            {error}
          </span>
        )}
      </div>
    </Modal>
  );
}

/**
 * Konfirmasi tap. Layar ini tidak pernah memperlihatkan putusan hari —
 * perhitungan ulang ringkasan berjalan di luar transaksi tap.
 */
export function PunchSavedModal({
  result,
  selfieRequired,
  onClose,
}: {
  result: PunchResult | null;
  selfieRequired: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(result)}
      onOpenChange={(next) => !next && onClose()}
      title="Tap recorded"
      description="This screen never shows the day's verdict; the recompute runs outside the tap transaction."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {result && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Type">{result.punch.punchType === 'IN' ? 'Tap in' : 'Tap out'}</KeyValueRow>
            <KeyValueRow label="Tap time">{formatDateTime(result.punch.punchAt)}</KeyValueRow>
            <KeyValueRow label="Idempotency-Key">
              <span className="font-mono text-xs">{result.idempotencyKey}</span>
            </KeyValueRow>
            <KeyValueRow label="Timezone">Asia/Jakarta (WIB) — the employee&rsquo;s zone, not the server&rsquo;s</KeyValueRow>
            <KeyValueRow label="Work date (server-derived)">{formatDate(result.punch.workDate)}</KeyValueRow>
            <KeyValueRow label="Radius verdict">
              <RadiusCell punch={result.punch} />
            </KeyValueRow>
            <KeyValueRow label="Selfie">
              {selfieRequired ? 'Required by this channel — captured live, camera source' : 'Not required by this channel'}
            </KeyValueRow>
          </KeyValueList>
          {result.replayed && (
            <Note icon={<KeyRound />}>
              Kunci idempotensi yang sama dikirim ulang, jadi baris yang sudah ada dikembalikan apa adanya — tidak ada
              tap kedua yang lahir.
            </Note>
          )}
        </div>
      )}
    </Modal>
  );
}
