import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarOff, Camera, CircleCheck, Clock, Info, MapPin, MapPinOff, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { RadioBranch } from '@/components/RadioBranch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { distanceMeters, radiusVerdict, selfieRequiredAtTap } from '@/features/attendance/rules';
import { RadiusCell } from '@/features/attendance/components/AttendanceBits';
import { ARRANGEMENT_LABEL, PUNCH_NOTE_MAX, TAP_ARRANGEMENTS } from '@/features/attendance/types';
import type { Geofence, Punch, TapLocation, WorkArrangement } from '@/features/attendance/types';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import type { ShiftOn } from '@/features/scheduler/services/scheduler.service';
import { tapBlockText, type TapGate } from '@/features/attendance/tapGate';
import { MOCK } from '@/services/mock';
import { cn } from '@/lib/utils';

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
            Set by HR for you
          </p>
          {/* Setelan per karyawan dibuat tim dev; layar ini hanya membaca hasilnya. */}
          <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 font-body text-[13px] leading-snug">
            <dt className="font-medium text-fg-3">Selfie at tap in</dt>
            <dd className="m-0 font-semibold text-fg-1">{selfieRequiredAtTap(geofence) ? 'Required' : 'Not required'}</dd>
            <dt className="font-medium text-fg-3">Radius</dt>
            <dd className="m-0 font-semibold text-fg-1">
              {TAP_ARRANGEMENTS.some((arrangement) => geofence.rules[arrangement].radius)
                ? `Within ${geofence.radiusMeters} m`
                : 'Not checked'}
            </dd>
          </dl>
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

/** Kolom Shift dari roster: jam, Day off, tanpa roster, atau memuat (`undefined`). */
function shiftLabel(roster: ShiftOn | null | undefined): { value: string; sub: string } {
  if (roster === undefined) return { value: 'Loading…', sub: 'Checking your roster' };
  if (!roster) return { value: 'No shift assigned', sub: 'Ask HR if this looks wrong' };
  const { shift } = roster;
  if (roster.assignment.isOffDay || !shift) return { value: 'Day off', sub: 'Rest day on your roster' };
  if (!shift.startTime || !shift.endTime) return { value: 'Flexible', sub: shift.shiftName };
  return {
    value: `${shift.startTime} – ${shift.endTime}${shift.crossesMidnight ? ' (+1)' : ''}`,
    sub: shift.shiftName,
  };
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
  shift,
  gate,
  onStart,
}: {
  workDate: string;
  geofence: Geofence;
  selfieRequired: boolean;
  nextType: 'IN' | 'OUT' | null;
  today: Punch[];
  /** Roster hari ini; `undefined` = masih memuat. */
  shift: ShiftOn | null | undefined;
  /** Gerbang tap in (cuti / hari libur); `undefined` = masih memuat. */
  gate?: TapGate;
  onStart: () => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const now = [clock.getHours(), clock.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':');
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${workDate}T00:00:00`));

  const tapIn = today.find((row) => row.punchType === 'IN');
  const tapOut = today.find((row) => row.punchType === 'OUT');

  // Tap out tidak pernah ditutup; gerbang hanya berlaku untuk tap in.
  const blocked = nextType === 'IN' && gate?.block ? tapBlockText(gate.block) : null;
  const onTimeOff = gate?.block?.reason === 'TIME_OFF' ? gate.block : null;
  const shiftCell = onTimeOff ? { value: 'Time off', sub: `${onTimeOff.leaveTypeName} · approved` } : shiftLabel(shift);

  const hint = !nextType
    ? 'Both taps are in. Anything wrong? File a correction.'
    : nextType === 'IN'
      ? gate?.restDayException
        ? 'Rest day — tap in for your approved overtime or on-call.'
        : selfieRequired
          ? 'Selfie first, then choose WFO or WFH.'
          : 'Choose WFO or WFH, add a note if needed.'
      : 'Add a note if needed, then tap out.';

  return (
    <section className="flex flex-col rounded-xl border border-border-1 bg-bg-surface px-5 pt-[18px] shadow-card-sm">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold leading-tight text-fg-1">{dateLabel}</h3>
          <p className="mt-1 font-body text-xs font-medium text-fg-3">
            <span className="tabular-nums">{now}</span> WIB
          </p>
        </div>
        <LocationInfo geofence={geofence} />
      </header>

      <div className="mt-2 grid divide-y divide-border-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <TodayCell label="Shift" {...shiftCell} />
        <TodayCell
          label="Tap in"
          value={tapIn ? hhmm(tapIn.punchAt) : '—'}
          sub={tapIn ? tapSub(tapIn) : blocked ? 'Not available today' : 'Not yet'}
        />
        <TodayCell
          label="Tap out"
          value={tapOut ? hhmm(tapOut.punchAt) : '—'}
          sub={tapOut ? tapSub(tapOut) : tapIn ? 'When you finish work' : 'After tap in'}
        />
      </div>

      <footer className="-mx-5 mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-border-1 px-5 py-3.5">
        {blocked ? (
          <span className="flex items-start gap-2 font-body text-xs font-medium leading-normal text-fg-2">
            <CalendarOff className="mt-px size-4 shrink-0 text-fg-3" />
            <span>
              <strong className="font-semibold text-fg-1">{blocked.title}.</strong> {blocked.detail}
            </span>
          </span>
        ) : (
          <span className="font-body text-xs font-medium text-fg-3">{hint}</span>
        )}
        {/* FSD-TIME 0.13 #35 (K1): IN dan OUT sudah ada ⇒ tombol tap DISEMBUNYIKAN, bukan dinonaktifkan.
            Sama untuk gerbang cuti/hari libur: tombol tidak tampil, alasannya tertulis di kiri. */}
        {nextType && !blocked && gate !== undefined && <Button onClick={onStart}>{nextType === 'IN' ? 'Tap in' : 'Tap out'}</Button>}
      </footer>
    </section>
  );
}

/**
 * Jam tap yang berjalan di modal. Waktu yang tersimpan adalah saat tombol Tap in/Tap out ditekan
 * (`punch_at` server), bukan saat selfie diambil — jadi yang ditampilkan jam sekarang, bukan jam foto.
 */
function TapClock({ label, verb }: { label: string; verb: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':');
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="font-display text-lg font-bold leading-tight tabular-nums text-fg-1" aria-live="off">
        {time} <span className="font-body text-xs font-semibold text-fg-3">WIB</span>
      </span>
      <span className="font-body text-[11.5px] font-medium text-fg-3">Recorded when you press {verb}.</span>
    </span>
  );
}

type Step = 'selfie' | 'details';
type Frame = { dataUrl: string | null };

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
 * Kamera depan langsung — aktif selama langkah selfie terbuka dan belum ada frame.
 * Tidak ada pemilih berkas: foto galeri tidak pernah boleh menggantikan orang yang menekan tombol.
 */
function useSelfieCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  /** Frame JPEG ber-cermin seperti pratinjau; `null` bila kamera belum mengalir. */
  const capture = (): string | null => {
    const video = videoRef.current;
    if (!video || !streamRef.current || !video.videoWidth) {
      setError('The camera is not streaming yet.');
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.translate(canvas.width, 0);
    context?.scale(-1, 1);
    context?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  return { videoRef, error, capture };
}

/**
 * Koordinat perangkat diambil diam-diam saat modal dibuka — tidak ditampilkan, hanya dikirim
 * (UIC-TIME §6.1.1 `latitude`/`longitude`/`gps_accuracy_meters`). Tanpa izin lokasi = `null`:
 * tap tetap lahir, radiusnya saja yang tak terevaluasi.
 */
function useDeviceLocation(open: boolean, fallback: TapLocation) {
  const pending = useRef<Promise<TapLocation | null>>(Promise.resolve(null));
  /** Hasil yang sudah terbaca — hanya dipakai untuk peringatan di luar radius, tidak ditampilkan. */
  const [resolved, setResolved] = useState<TapLocation | null>(null);

  useEffect(() => {
    if (!open) return;
    setResolved(null);
    let cancelled = false;
    pending.current = new Promise<TapLocation | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    }).then((location) => {
      // ponytail: mode dummy tanpa izin lokasi memakai titik kantor supaya radius bisa diperagakan.
      const final = location ?? (MOCK ? { ...fallback, simulated: true } : null);
      if (!cancelled) setResolved(final);
      return final;
    });
    return () => {
      cancelled = true;
    };
  }, [open, fallback]);

  return { pending, resolved };
}

/** Jarak manusiawi: `85 m`, `2.4 km`. */
function distanceLabel(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Jarak tap ke titik kerja, atau `null` bila koordinat tidak ada. */
function distanceFrom(geofence: Geofence, point: { latitude?: number | null; longitude?: number | null }) {
  if (point.latitude == null || point.longitude == null) return null;
  return distanceMeters(
    { latitude: geofence.centerLatitude, longitude: geofence.centerLongitude },
    { latitude: point.latitude, longitude: point.longitude },
  );
}

/**
 * Tap in / Tap out dalam satu modal bertahap: Selfie (bila admin mewajibkan) lalu Detail
 * (tipe kerja + catatan). Modal, bukan halaman: karyawan tetap tahu ia masih di tengah absen,
 * dan menutupnya berarti batal tanpa jejak. Semua tombol ada di footer — tanpa gulir di layar 100%.
 */
export function TapModal({
  open,
  type,
  geofence,
  selfieRequired: selfieAtSite,
  defaultArrangement,
  busy,
  onSubmit,
  onClose,
}: {
  open: boolean;
  type: 'IN' | 'OUT';
  geofence: Geofence;
  selfieRequired: boolean;
  defaultArrangement: WorkArrangement | null;
  busy: boolean;
  onSubmit: (submission: TapSubmission) => void;
  onClose: () => void;
}) {
  // Tap out cukup catatan: tanpa selfie, tanpa tipe kerja (mewarisi tap in).
  const selfieRequired = type === 'IN' && selfieAtSite;
  const steps: Step[] = selfieRequired ? ['selfie', 'details'] : ['details'];
  const [step, setStep] = useState<Step>(steps[0]);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [arrangement, setArrangement] = useState<WorkArrangement | ''>('');
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const camera = useSelfieCamera(open && step === 'selfie' && !frame);
  const fallback = useMemo(
    () => ({ latitude: geofence.centerLatitude, longitude: geofence.centerLongitude, accuracyMeters: 10 }),
    [geofence.centerLatitude, geofence.centerLongitude],
  );
  const { pending: location, resolved } = useDeviceLocation(open, fallback);

  useEffect(() => {
    if (!open) return;
    setStep(selfieRequired ? 'selfie' : 'details');
    setFrame(null);
    setArrangement(defaultArrangement && TAP_ARRANGEMENTS.includes(defaultArrangement) ? defaultArrangement : '');
    setNote('');
  }, [open, selfieRequired, defaultArrangement]);

  const isIn = type === 'IN';
  const verb = isIn ? 'Tap in' : 'Tap out';
  const saving = busy || locating;

  const shoot = () => {
    const dataUrl = camera.capture();
    if (dataUrl) setFrame({ dataUrl });
  };

  const submit = async () => {
    setLocating(true);
    const coords = await location.current;
    setLocating(false);
    onSubmit({
      selfieCaptured: Boolean(frame),
      selfieBase64: frame?.dataUrl?.split(',')[1],
      workArrangement: isIn ? (arrangement as WorkArrangement) : undefined,
      note,
      location: coords,
    });
  };

  // Peringatan dini: koordinat sudah terbaca dan tipe kerja ini memeriksa radius, tapi posisinya di luar.
  const checked = isIn ? arrangement || null : null;
  const outside = Boolean(checked && radiusVerdict(geofence, checked, resolved) === false);
  const away = resolved ? distanceFrom(geofence, resolved) : null;

  const describe = (value: WorkArrangement) => {
    if (!geofence.rules[value].radius) return "Location radius isn't checked.";
    return value === 'WFO'
      ? `Must be within ${geofence.radiusMeters} m of ${geofence.geofenceName}.`
      : `Must be within ${geofence.radiusMeters} m of the work point.`;
  };

  const footer =
    step === 'selfie' ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        {frame ? (
          <>
            <Button variant="secondary" onClick={() => setFrame(null)}>
              Retake
            </Button>
            <Button onClick={() => setStep('details')}>Continue</Button>
          </>
        ) : camera.error ? (
          // ponytail: jalur pratinjau saja — klien sungguhan hanya menerima frame kamera.
          <Button onClick={() => setFrame({ dataUrl: null })}>Use simulated frame</Button>
        ) : (
          <Button onClick={shoot}>Capture selfie</Button>
        )}
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={selfieRequired ? () => setStep('selfie') : onClose}>
          {selfieRequired ? 'Back' : 'Cancel'}
        </Button>
        <Button disabled={(isIn && !arrangement) || saving} onClick={submit}>
          {saving ? 'Saving…' : verb}
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={verb}
      description={
        step === 'selfie'
          ? 'HR requires a selfie at this location.'
          : isIn
            ? 'Choose your work type, then tap in.'
            : 'Add a note if you need to, then tap out.'
      }
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <StepMarker steps={steps} current={step} />

        {step === 'selfie' ? (
          <div className="flex flex-col gap-2">
            {/* Tinggi dibatasi viewport supaya modal + footer muat tanpa gulir di zoom 100%. */}
            <div className="relative mx-auto flex aspect-[4/3] max-h-[44vh] w-full items-center justify-center overflow-hidden rounded-xl bg-obsidian">
              {frame?.dataUrl ? (
                <img src={frame.dataUrl} alt="Captured selfie" className="size-full object-cover" />
              ) : frame ? (
                <span className="font-body text-[13px] font-medium text-white">Simulated frame ready</span>
              ) : (
                <video ref={camera.videoRef} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
              )}
              {!frame && camera.error && (
                <span className="absolute inset-0 flex items-center justify-center p-6 text-center font-body text-[13px] font-medium leading-[1.5] text-white">
                  {camera.error}
                </span>
              )}
            </div>
            <span className="font-body text-xs font-medium text-fg-3">
              {frame ? 'Looks good? Continue, or retake.' : 'Face the camera in good light. Live camera only.'}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-md border border-border-1 bg-cloud px-3 py-2.5">
              {selfieRequired && frame?.dataUrl ? (
                <img src={frame.dataUrl} alt="Your selfie" className="size-10 rounded-md object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-md bg-vapor text-fg-3 [&_svg]:size-4">
                  {selfieRequired ? <Camera /> : <Clock />}
                </span>
              )}
              <TapClock label={isIn ? 'Clock-in time' : 'Clock-out time'} verb={verb} />
            </div>

            {isIn && (
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
              ) : null}
            </div>
            )}

            {outside && (
              <Note tone="warn" icon={<MapPinOff />}>
                You&rsquo;re about <strong>{away != null ? distanceLabel(away) : 'far'}</strong> from {geofence.geofenceName},
                outside the {geofence.radiusMeters} m radius. You can still {verb.toLowerCase()}, but the tap will be marked
                outside radius.
              </Note>
            )}

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
          </>
        )}
      </div>
    </Modal>
  );
}

type ReceiptState = 'ok' | 'outside' | 'unchecked';

/** Keadaan tanda terima dari putusan radius tap + aturan titik kerja untuk tipe kerjanya. */
function receiptState(punch: Punch, geofence: Geofence): ReceiptState {
  if (punch.isWithinGeofence === false) return 'outside';
  const radiusChecked = punch.workArrangement ? geofence.rules[punch.workArrangement]?.radius : false;
  if (punch.isWithinGeofence === null && radiusChecked) return 'unchecked';
  return 'ok';
}

/**
 * Tanda terima tap. Tap di luar radius tetap TERSIMPAN (UIC-TIME §6.1.1 — 201, recompute yang menilai),
 * jadi modal ini wajib membedakan "berhasil" dari "tersimpan tapi di luar radius" sejak judulnya.
 */
export function PunchSavedModal({
  result,
  geofence,
  onClose,
}: {
  result: PunchResult | null;
  geofence: Geofence;
  onClose: () => void;
}) {
  const punch = result?.punch;
  const verb = punch?.punchType === 'OUT' ? 'Tapped out' : 'Tapped in';
  const state = punch ? receiptState(punch, geofence) : 'ok';
  const away = punch ? distanceFrom(geofence, punch) : null;
  const time = punch ? hhmm(punch.punchAt) : '';

  return (
    <Modal
      open={Boolean(result)}
      onOpenChange={(next) => !next && onClose()}
      title={state === 'outside' ? `${verb} — outside radius` : verb}
      description={result?.replayed ? 'This tap was already saved — nothing was recorded twice.' : undefined}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {punch && (
        <div className="flex flex-col gap-4">
          {state === 'ok' && (
            <div className="flex items-start gap-3 rounded-md border border-success-200 bg-success-50 px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5] text-success-800">
              <CircleCheck className="mt-px size-5 shrink-0" />
              <span>
                <strong className="block text-sm font-bold">
                  {punch.punchType === 'OUT' ? `You tapped out at ${time} WIB.` : `You're in. Tapped in at ${time} WIB.`}
                </strong>
                {punch.isWithinGeofence ? `Inside the ${geofence.radiusMeters} m radius of ${geofence.geofenceName}.` : 'No radius check for this work type.'}
              </span>
            </div>
          )}
          {state === 'outside' && (
            <Note tone="warn" icon={<TriangleAlert />}>
              <strong className="block text-sm font-bold">Saved, but outside the work radius.</strong>
              Recorded {away != null ? <strong>{distanceLabel(away)}</strong> : 'away'} from {geofence.geofenceName}; the
              allowed radius is {geofence.radiusMeters} m. The tap may not count as attendance for today. If you were on
              site, file an attendance correction.
            </Note>
          )}
          {state === 'unchecked' && (
            <Note tone="info" icon={<MapPinOff />}>
              <strong className="block text-sm font-bold">Saved, but the radius couldn&rsquo;t be checked.</strong>
              Your location wasn&rsquo;t available, so HR may review this tap.
            </Note>
          )}

          <KeyValueList>
            <KeyValueRow label="Time">{time} WIB</KeyValueRow>
            <KeyValueRow label="Work type">
              {punch.workArrangement ? ARRANGEMENT_LABEL[punch.workArrangement] : '—'}
            </KeyValueRow>
            <KeyValueRow label="Radius">
              <RadiusCell punch={punch} />
            </KeyValueRow>
            <KeyValueRow label="Selfie">{result.selfieRequired ? 'Captured' : 'Not required'}</KeyValueRow>
            <KeyValueRow label="Note">{punch.note ?? '—'}</KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}
