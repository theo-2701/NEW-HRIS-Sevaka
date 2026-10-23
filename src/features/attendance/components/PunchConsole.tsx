import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, Info, LocateFixed, MapPin } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { RadioBranch } from '@/components/RadioBranch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { RadiusCell } from '@/features/attendance/components/AttendanceBits';
import { distanceMeters } from '@/features/attendance/rules';
import { ARRANGEMENT_LABEL, PUNCH_NOTE_MAX, TAP_ARRANGEMENTS } from '@/features/attendance/types';
import type { AttendanceDay, Geofence, Punch, TapLocation, WorkArrangement } from '@/features/attendance/types';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/format';

const hhmm = (iso: string) => iso.slice(11, 16);

/** Syarat titik kerja per tipe kerja — dibuka dari ikon info di samping nama lokasi. */
function LocationInfo({ geofence }: { geofence: Geofence }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-1.5 font-body text-xs font-medium text-fg-3">
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">{geofence.geofenceName}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Work location requirements"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-fg-3 transition-colors duration-150 ease-standard hover:bg-vapor hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30"
          >
            <Info className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          className="w-[300px] p-3.5"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <p className="m-0 mb-2.5 font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-3">
            Set by HR for this location
          </p>
          <table className="w-full border-collapse font-body text-[13px] leading-snug">
            <thead>
              <tr className="text-left text-fg-3">
                <th className="pb-1.5 font-medium">Work type</th>
                <th className="pb-1.5 font-medium">Radius</th>
                <th className="pb-1.5 font-medium">Selfie</th>
              </tr>
            </thead>
            <tbody>
              {TAP_ARRANGEMENTS.map((arrangement) => (
                <tr key={arrangement} className="font-semibold text-fg-1">
                  <td className="py-0.5">{arrangement}</td>
                  <td className="py-0.5">{geofence.rules[arrangement].radius ? `${geofence.radiusMeters} m` : 'Not checked'}</td>
                  <td className="py-0.5">{geofence.rules[arrangement].selfie ? 'Required' : 'Not required'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Satu kolom ringkasan hari ini. */
function TodayCell({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-3 sm:px-5 sm:first:pl-0">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="font-display text-lg font-bold leading-tight tabular-nums text-fg-1">{value}</span>
      <span className="truncate font-body text-xs font-medium text-fg-3">{sub}</span>
    </div>
  );
}

/** Sub-teks tap: tipe kerja, plus peringatan bila tap tercatat di luar radius. */
function tapSub(punch: Punch) {
  const type = punch.workArrangement ? ARRANGEMENT_LABEL[punch.workArrangement] : 'Work type not recorded';
  if (punch.isWithinGeofence !== false) return type;
  return (
    <>
      {type} · <span className="text-warning-700">outside radius</span>
    </>
  );
}

/**
 * Kartu "Hari ini" — satu kartu, satu tombol. Menjawab tiga hal yang dicari karyawan:
 * shift saya, sudah tap masuk/pulang jam berapa, dan apa yang harus dilakukan sekarang.
 * Detail tap (selfie, tipe kerja, catatan, lokasi) ada di modal; riwayat lengkap di tab History.
 */
export function PunchConsole({
  workDate,
  geofence,
  selfieRequired,
  nextType,
  today,
  day,
  onStart,
}: {
  workDate: string;
  geofence: Geofence;
  selfieRequired: boolean;
  nextType: 'IN' | 'OUT' | null;
  today: Punch[];
  day: AttendanceDay | undefined;
  onStart: () => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const now = [clock.getHours(), clock.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':');
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(`${workDate}T00:00:00`));

  const tapIn = today.find((row) => row.punchType === 'IN');
  const tapOut = today.find((row) => row.punchType === 'OUT');

  const hint = !nextType
    ? 'Both taps are in. Anything wrong? File a correction.'
    : nextType === 'IN'
      ? selfieRequired
        ? 'Selfie first, then choose WFO or WFH.'
        : 'Choose WFO or WFH, add a note if needed.'
      : selfieRequired
        ? 'Selfie first, then confirm.'
        : 'Confirm and add a note if needed.';

  return (
    <section className="flex flex-col rounded-xl border border-border-1 bg-bg-surface px-5 pt-[18px] shadow-card-sm">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold leading-tight text-fg-1">Today</h3>
          <p className="mt-1 font-body text-xs font-medium text-fg-3">
            {weekday}, {formatDate(workDate)} · <span className="tabular-nums">{now}</span> WIB
          </p>
        </div>
        <LocationInfo geofence={geofence} />
      </header>

      <div className="mt-2 grid divide-y divide-border-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <TodayCell
          label="Shift"
          value={day?.expectedIn ? `${day.expectedIn} – ${day.expectedOut}` : 'Not scheduled'}
          sub={day?.expectedIn ? `${day.appliedLateToleranceMinutes} min late tolerance` : 'Taps are still recorded'}
        />
        <TodayCell label="Tap in" value={tapIn ? hhmm(tapIn.punchAt) : '—'} sub={tapIn ? tapSub(tapIn) : 'Not yet'} />
        <TodayCell
          label="Tap out"
          value={tapOut ? hhmm(tapOut.punchAt) : '—'}
          sub={tapOut ? tapSub(tapOut) : tapIn ? 'When you finish work' : 'After tap in'}
        />
      </div>

      <footer className="-mx-5 mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-border-1 px-5 py-3.5">
        <span className="font-body text-xs font-medium text-fg-3">{hint}</span>
        {/* FSD-TIME 0.13 #35 (K1): IN dan OUT sudah ada ⇒ tombol tap DISEMBUNYIKAN, bukan dinonaktifkan. */}
        {nextType && <Button onClick={onStart}>{nextType === 'IN' ? 'Tap in' : 'Tap out'}</Button>}
      </footer>
    </section>
  );
}

type Step = 'selfie' | 'details';
type LocationState = { status: 'locating' } | { status: 'ready'; location: TapLocation } | { status: 'unavailable' };

export interface TapSubmission {
  selfieCaptured: boolean;
  selfieBase64?: string;
  workArrangement?: WorkArrangement;
  note: string;
  location: TapLocation | null;
}

/** Penanda langkah — hanya tampil bila ada lebih dari satu langkah. */
function StepMarker({ steps, current }: { steps: Step[]; current: Step }) {
  if (steps.length < 2) return null;
  const label: Record<Step, string> = { selfie: 'Selfie', details: 'Details' };
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0 font-body text-xs font-bold">
      {steps.map((step, index) => {
        const active = step === current;
        const done = steps.indexOf(current) > index;
        return (
          <li key={step} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-border-1" />}
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'grid size-5 place-items-center rounded-full text-[11px]',
                active || done ? 'bg-secondary-500 text-white' : 'bg-vapor text-fg-3',
              )}
            >
              {index + 1}
            </span>
            <span className={active ? 'text-fg-1' : 'text-fg-3'}>{label[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Kamera depan langsung. Tidak ada pemilih berkas — foto dari galeri tidak pernah boleh
 * menggantikan orang yang menekan tombol. Tanpa kamera (pratinjau), frame disimulasikan.
 */
function SelfieStep({
  frame,
  onFrame,
}: {
  frame: { dataUrl: string | null } | null;
  onFrame: (frame: { dataUrl: string | null } | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (frame) return;
    let cancelled = false;
    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('No camera is available in this preview.');
      return stop;
    }
    setError('');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.name === 'NotFoundError' ? 'No camera found on this device.' : 'Camera access was blocked.');
        }
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [frame]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current || !video.videoWidth) {
      setError('The camera is not streaming yet.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    // Cermin seperti pratinjau, supaya foto yang tersimpan sama dengan yang dilihat.
    context?.translate(canvas.width, 0);
    context?.scale(-1, 1);
    context?.drawImage(video, 0, 0);
    onFrame({ dataUrl: canvas.toDataURL('image/jpeg', 0.8) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-obsidian">
        {frame?.dataUrl ? (
          <img src={frame.dataUrl} alt="Captured selfie" className="size-full object-cover" />
        ) : frame ? (
          <span className="font-body text-[13px] font-medium text-white">Simulated frame ready</span>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
        )}
        {!frame && error && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center font-body text-[13px] font-medium leading-[1.5] text-white">
            {error}
            {/* ponytail: jalur pratinjau saja — klien sungguhan hanya menerima frame kamera. */}
            <Button variant="light" onClick={() => onFrame({ dataUrl: null })}>
              Use simulated frame
            </Button>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-body text-xs font-medium text-fg-3">
          {frame ? 'Looks good? Continue, or retake.' : 'Face the camera in good light. Live camera only.'}
        </span>
        {frame ? (
          <Button variant="secondary" onClick={() => onFrame(null)}>
            Retake
          </Button>
        ) : (
          !error && (
            <Button variant="secondary" onClick={capture}>
              Capture
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/** Koordinat perangkat, diambil sekali saat modal dibuka. */
function useDeviceLocation(open: boolean) {
  const [state, setState] = useState<LocationState>({ status: 'locating' });

  useEffect(() => {
    if (!open) return;
    setState({ status: 'locating' });
    if (!navigator.geolocation) {
      setState({ status: 'unavailable' });
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        !cancelled &&
        setState({
          status: 'ready',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
          },
        }),
      () => !cancelled && setState({ status: 'unavailable' }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  return [state, setState] as const;
}

function LocationRow({
  state,
  geofence,
  onSimulate,
}: {
  state: LocationState;
  geofence: Geofence;
  onSimulate: () => void;
}) {
  if (state.status === 'locating') {
    return <span className="font-body text-[13px] font-medium text-fg-3">Getting your location…</span>;
  }
  if (state.status === 'unavailable') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-body text-[13px] font-medium leading-[1.45] text-fg-2">
          Location unavailable. Your tap is still recorded, but the radius can&rsquo;t be checked.
        </span>
        {/* ponytail: tombol pratinjau — memakai titik kantor saat izin lokasi tidak ada. */}
        <Button variant="secondary" onClick={onSimulate}>
          Use office location
        </Button>
      </div>
    );
  }
  const { location } = state;
  const meters = Math.round(
    distanceMeters({ latitude: geofence.centerLatitude, longitude: geofence.centerLongitude }, location),
  );
  return (
    <div className="flex flex-col gap-0.5 font-body text-[13px] leading-[1.45]">
      <span className="font-semibold text-fg-1 tabular-nums">
        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        {location.accuracyMeters != null && <span className="font-medium text-fg-3"> · ±{location.accuracyMeters} m</span>}
      </span>
      <span className="font-medium text-fg-3">
        {meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`} from {geofence.geofenceName}
        {location.simulated && ' · simulated'}
      </span>
    </div>
  );
}

/**
 * Tap in / Tap out dalam satu modal bertahap: Selfie (bila admin mewajibkan) → Detail
 * (tipe kerja, catatan, lokasi). Modal, bukan halaman: karyawan tetap tahu ia masih di
 * tengah absen, dan menutupnya berarti batal tanpa jejak.
 */
export function TapModal({
  open,
  type,
  geofence,
  selfieRequired,
  defaultArrangement,
  inheritedArrangement,
  busy,
  onSubmit,
  onClose,
}: {
  open: boolean;
  type: 'IN' | 'OUT';
  geofence: Geofence;
  selfieRequired: boolean;
  defaultArrangement: WorkArrangement | null;
  /** Tap out: tipe kerja dari tap in hari ini. */
  inheritedArrangement: WorkArrangement | null;
  busy: boolean;
  onSubmit: (submission: TapSubmission) => void;
  onClose: () => void;
}) {
  const steps: Step[] = selfieRequired ? ['selfie', 'details'] : ['details'];
  const [step, setStep] = useState<Step>(steps[0]);
  const [frame, setFrame] = useState<{ dataUrl: string | null } | null>(null);
  const [arrangement, setArrangement] = useState<WorkArrangement | ''>('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useDeviceLocation(open);

  useEffect(() => {
    if (!open) return;
    setStep(selfieRequired ? 'selfie' : 'details');
    setFrame(null);
    setArrangement(defaultArrangement && TAP_ARRANGEMENTS.includes(defaultArrangement) ? defaultArrangement : '');
    setNote('');
  }, [open, selfieRequired, defaultArrangement]);

  const isIn = type === 'IN';
  const verb = isIn ? 'Tap in' : 'Tap out';
  const ready = (!isIn || Boolean(arrangement)) && location.status !== 'locating';

  const submit = () =>
    onSubmit({
      selfieCaptured: Boolean(frame),
      selfieBase64: frame?.dataUrl?.split(',')[1],
      workArrangement: isIn ? (arrangement as WorkArrangement) : undefined,
      note,
      location: location.status === 'ready' ? location.location : null,
    });

  const describe = (value: WorkArrangement) => {
    const rule = geofence.rules[value];
    if (value === 'WFO') {
      return rule.radius
        ? `At ${geofence.geofenceName}. You need to be within ${geofence.radiusMeters} m.`
        : `At ${geofence.geofenceName}. Radius isn't checked.`;
    }
    return rule.radius
      ? `Your location is checked against ${geofence.radiusMeters} m.`
      : "Your location is recorded, but the radius isn't checked.";
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={verb}
      description={step === 'selfie' ? 'HR requires a selfie at this location.' : `Check the details, then ${verb.toLowerCase()}.`}
      footer={
        step === 'selfie' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!frame} onClick={() => setStep('details')}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={selfieRequired ? () => setStep('selfie') : onClose}>
              {selfieRequired ? 'Back' : 'Cancel'}
            </Button>
            <Button disabled={!ready || busy} onClick={submit}>
              {busy ? 'Saving…' : verb}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <StepMarker steps={steps} current={step} />

        {step === 'selfie' ? (
          <SelfieStep frame={frame} onFrame={setFrame} />
        ) : (
          <>
            {selfieRequired && (
              <div className="flex items-center gap-3 rounded-md border border-border-1 bg-cloud px-3 py-2.5">
                {frame?.dataUrl ? (
                  <img src={frame.dataUrl} alt="" className="size-10 rounded-md object-cover" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-md bg-vapor text-fg-3 [&_svg]:size-4">
                    <Camera />
                  </span>
                )}
                <span className="font-body text-[13px] font-semibold text-fg-1">Selfie captured</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>
                Work type
                {isIn && <span className="ml-0.5 text-error-500">*</span>}
              </Label>
              {isIn ? (
                <RadioBranch<WorkArrangement>
                  name="work-type"
                  value={arrangement as WorkArrangement}
                  onChange={setArrangement}
                  options={TAP_ARRANGEMENTS.map((value) => ({
                    value,
                    title: ARRANGEMENT_LABEL[value],
                    description: describe(value),
                  }))}
                />
              ) : (
                <span className="font-body text-[13px] font-semibold text-fg-1">
                  {inheritedArrangement ? ARRANGEMENT_LABEL[inheritedArrangement] : 'Not recorded'}
                  <span className="font-medium text-fg-3"> · from your tap in</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tap-note">Note</Label>
              <Textarea
                id="tap-note"
                rows={3}
                maxLength={PUNCH_NOTE_MAX}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={isIn ? 'e.g. Client visit this morning' : 'e.g. Leaving early for a doctor appointment'}
              />
              <span className="flex justify-between font-body text-xs font-normal text-fg-3">
                <span>Optional. Saved with this tap.</span>
                <span className="tabular-nums">
                  {note.length}/{PUNCH_NOTE_MAX}
                </span>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
                <LocateFixed />
                Location
              </Label>
              <LocationRow
                state={location}
                geofence={geofence}
                onSimulate={() =>
                  setLocation({
                    status: 'ready',
                    location: {
                      latitude: geofence.centerLatitude,
                      longitude: geofence.centerLongitude,
                      accuracyMeters: 10,
                      simulated: true,
                    },
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * Tanda terima tap. Layar ini tidak memperlihatkan putusan hari —
 * perhitungan ulang ringkasan berjalan di luar transaksi tap.
 */
export function PunchSavedModal({ result, onClose }: { result: PunchResult | null; onClose: () => void }) {
  const punch = result?.punch;
  return (
    <Modal
      open={Boolean(result)}
      onOpenChange={(next) => !next && onClose()}
      title={punch?.punchType === 'OUT' ? 'Tapped out' : 'Tapped in'}
      description={
        result?.replayed ? 'This tap was already saved — nothing was recorded twice.' : 'Your tap has been saved.'
      }
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {punch && (
        <KeyValueList>
          <KeyValueRow label="Time">{formatDateTime(punch.punchAt)} WIB</KeyValueRow>
          <KeyValueRow label="Work type">
            {punch.workArrangement ? ARRANGEMENT_LABEL[punch.workArrangement] : '—'}
          </KeyValueRow>
          <KeyValueRow label="Radius">
            <RadiusCell punch={punch} />
          </KeyValueRow>
          <KeyValueRow label="Location">
            {punch.latitude != null && punch.longitude != null
              ? `${punch.latitude.toFixed(5)}, ${punch.longitude.toFixed(5)}`
              : 'Not available'}
          </KeyValueRow>
          <KeyValueRow label="Selfie">{result.selfieRequired ? 'Captured' : 'Not required'}</KeyValueRow>
          <KeyValueRow label="Note">{punch.note ?? '—'}</KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}
