import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CircleCheck, Clock, Info, MapPin, MapPinOff, Palmtree, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { RadioBranch } from '@/components/RadioBranch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { distanceMeters, radiusVerdict, selfieRequiredFor } from '@/features/attendance/rules';
import { RadiusCell } from '@/features/attendance/components/AttendanceBits';
import { ARRANGEMENT_LABEL, PUNCH_NOTE_MAX, TAP_ARRANGEMENTS } from '@/features/attendance/types';
import type { Geofence, Punch, PunchPolicy, TapLocation, WorkArrangement } from '@/features/attendance/types';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import type { ShiftOn } from '@/features/scheduler/services/scheduler.service';
import type { TapBlock, TapGate } from '@/features/attendance/tapGate';
import { formatDateRange } from '@/lib/format';
import { MOCK } from '@/services/mock';
import { cn } from '@/lib/utils';

const hhmm = (iso: string) => iso.slice(11, 16);

type LiveLocation =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'off' }
  | { kind: 'found'; meters: number; simulated: boolean };

/**
 * Lokasi perangkat untuk kartu Today. Tidak meminta izin saat halaman dibuka — izin baru diminta bila
 * karyawan menekan "Check my location" (atau sudah pernah mengizinkan). Hanya jarak ke titik kerja yang
 * ditampilkan: kontrak tidak punya alamat jalan (reverse geocoding), dan alamat panjang justru tidak
 * menjawab pertanyaan karyawan, "bisakah saya tap di sini?".
 */
function useLiveLocation(geofence: Geofence) {
  const [state, setState] = useState<LiveLocation>({ kind: 'idle' });
  const center = useMemo(
    () => ({ latitude: geofence.centerLatitude, longitude: geofence.centerLongitude }),
    [geofence.centerLatitude, geofence.centerLongitude],
  );

  const locate = useCallback(() => {
    // ponytail: mode dummy tanpa izin lokasi memakai titik kantor, sama seperti modal tap.
    const fallback = () => setState(MOCK ? { kind: 'found', meters: 0, simulated: true } : { kind: 'off' });
    if (!navigator.geolocation) return fallback();
    setState({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setState({
          kind: 'found',
          meters: distanceMeters(center, { latitude: position.coords.latitude, longitude: position.coords.longitude }),
          simulated: false,
        }),
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [center]);

  useEffect(() => {
    setState({ kind: 'idle' });
    let cancelled = false;
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === 'granted') locate();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [geofence.id, locate]);

  return { state, locate };
}

/**
 * Syarat tap per tipe kerja — isi ikon info di samping status lokasi. Sengaja ringkas: nama titik kerja sudah
 * ada di chip, dan selfie hanya disebut bila wajib. WFH tetap ditulis ("Anywhere") supaya karyawan yang jauh
 * dari kantor tahu ia masih bisa tap.
 *
 * Dibuka dengan klik/tap, ditutup dengan klik di luar atau Esc (bawaan Radix). Bukan hover: isinya panel, bukan
 * label satu baris, ESS banyak dibuka di HP yang tak punya hover — dan pola hover + fokus dulu membuat popover
 * terbuka lagi sendiri karena Radix mengembalikan fokus ke tombol saat menutup.
 */
function TapRules({ geofence, policy }: { geofence: Geofence; policy: PunchPolicy | undefined }) {
  const rule = (value: WorkArrangement) => (geofence.rules[value].radius ? `Within ${geofence.radiusMeters} m of the work point` : 'Anywhere');
  // Profil lapangan tak ditawari pilihan — hanya baris profilnya yang berlaku (UIC-TIME 0.26 §6.1.4).
  const rows: WorkArrangement[] =
    policy && !policy.canChoose && policy.profileWorkArrangement ? [policy.profileWorkArrangement] : TAP_ARRANGEMENTS;
  // Swafoto mengikuti pilihan WFO/WFH (Required matriks Settings), bukan satu flag per lokasi.
  const selfieRows = rows.filter((value) =>
    policy ? selfieRequiredFor(policy, policy.canChoose ? value : null) : geofence.rules[value].selfie,
  );
  const selfieText =
    rows.length === 1 || selfieRows.length === rows.length ? 'Required' : `Required for ${selfieRows.join(' and ')}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Area tekan 28 px; -m-1 menjaga tata letak tetap seukuran ikon 20 px. */}
        <button
          type="button"
          aria-label="Tap in rules"
          className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-fg-3 transition-colors duration-150 ease-standard hover:bg-vapor hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30 data-[state=open]:bg-vapor data-[state=open]:text-fg-1"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[300px] max-w-[calc(100vw-32px)] p-3.5" onOpenAutoFocus={(event) => event.preventDefault()}>
        <p className="m-0 font-body text-[13px] font-bold text-fg-1">Tap in rules</p>
        {/* Setelan per karyawan dibuat tim dev; layar ini hanya membaca hasilnya. */}
        <dl className="m-0 mt-2 grid grid-cols-[56px_1fr] gap-x-3 gap-y-1.5 font-body text-[13px] leading-snug">
          {rows.map((value) => (
            <Fragment key={value}>
              <dt className="font-medium text-fg-3">{value}</dt>
              <dd className="m-0 font-semibold text-fg-1">{rule(value)}</dd>
            </Fragment>
          ))}
          {selfieRows.length > 0 && (
            <>
              <dt className="font-medium text-fg-3">Selfie</dt>
              <dd className="m-0 font-semibold text-fg-1">{selfieText}</dd>
            </>
          )}
        </dl>
        {rows.some((value) => geofence.rules[value].radius) && (
          <p className="m-0 mt-2.5 border-t border-border-1 pt-2 font-body text-[11.5px] font-medium leading-snug text-fg-3">
            Taps outside the radius are still saved, flagged.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Status lokasi di kepala kartu: satu baris pendek "di mana saya terhadap titik kerja". Nama titik kerja yang
 * panjang dipotong dengan elipsis dan tetap utuh di tooltip serta di popover syarat.
 */
function LocationStatus({ geofence, policy }: { geofence: Geofence; policy: PunchPolicy | undefined }) {
  const { state, locate } = useLiveLocation(geofence);
  const checked = geofence.rules.WFO.radius;
  const name = geofence.geofenceName;

  let icon: ReactNode = <MapPin />;
  let tone = 'text-fg-3';
  let text: ReactNode = (
    <>
      Work point: <span className="text-fg-1">{name}</span>
    </>
  );
  if (checked && state.kind === 'locating') text = 'Checking your location…';
  if (checked && state.kind === 'off') {
    icon = <MapPinOff />;
    text = 'Location is off — your tap is saved without a radius check';
  }
  if (checked && state.kind === 'found') {
    const inside = state.meters <= geofence.radiusMeters;
    icon = inside ? <CircleCheck /> : <MapPinOff />;
    tone = inside ? 'text-success-700' : 'text-warning-700';
    text = inside ? (
      <>
        You&rsquo;re at <span className="text-fg-1">{name}</span>
        {state.simulated && <span className="text-fg-4"> · demo location</span>}
      </>
    ) : (
      <>
        {distanceLabel(state.meters)} from <span className="text-fg-1">{name}</span>
      </>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2 font-body text-xs font-medium sm:max-w-[60%]">
      <span className={cn('flex min-w-0 items-center gap-1.5 [&>svg]:size-3.5 [&>svg]:shrink-0', tone)} title={name}>
        {icon}
        <span className="truncate text-fg-3">{text}</span>
      </span>
      {checked && (state.kind === 'idle' || state.kind === 'off') && (
        <button
          type="button"
          onClick={locate}
          className="shrink-0 rounded font-semibold text-secondary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30"
        >
          {state.kind === 'off' ? 'Try again' : 'Check my location'}
        </button>
      )}
      <TapRules geofence={geofence} policy={policy} />
    </div>
  );
}

/** Satu kolom ringkasan hari ini. */
function TodayCell({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-3 sm:px-5 sm:first:pl-0">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="font-display text-lg font-bold leading-tight tabular-nums text-fg-1">{value}</span>
      <span className="font-body text-xs font-medium leading-snug text-fg-3">{sub}</span>
    </div>
  );
}

const HALF_LABEL = { HALF_AM: 'morning', HALF_PM: 'afternoon' } as const;

const REST_DAY_SUB = {
  OVERTIME_PENDING: 'Overtime requested — awaiting approval',
  OVERTIME_APPROVED: 'Overtime approved for today',
  ONCALL: 'You are on call today',
} as const;

// TSD-TIME O-4: dibayar = MIN(jam dari tap, jam disetujui) — butuh pengajuan disetujui DAN tap. Siaga (K40):
// tap di jendela siaga melahirkan lembur AUTO_APPROVED, tanpa pengajuan.
const REST_DAY_HINT = {
  NONE: 'Overtime is paid only with an approved request and your tap in and tap out.',
  OVERTIME_PENDING: 'Overtime is paid only with an approved request and your tap in and tap out.',
  OVERTIME_APPROVED: 'Overtime is paid from your taps, up to the approved hours.',
  ONCALL: 'Called out? Tap in — the overtime is logged automatically, no request needed.',
} as const;

/**
 * Kolom Shift dari jadwal kerja (Scheduler): jam shift, hari libur, tanpa jadwal, atau memuat (`undefined`).
 * Istilah "roster" diganti "work schedule" — itu kata yang dikenal karyawan. Hari libur tanpa lembur
 * membawa tautan "Request overtime": tap tetap terbuka, tetapi jamnya baru dibayar bila lembur disetujui.
 */
function shiftLabel(
  roster: ShiftOn | null | undefined,
  gate: TapGate | undefined,
  requestOvertime: { employeeId: string; date: string },
): { value: string; sub: ReactNode } {
  if (roster === undefined) return { value: 'Loading…', sub: 'Checking your work schedule' };
  if (!roster) return { value: 'No shift assigned', sub: 'Ask HR if this looks wrong' };
  const { shift } = roster;
  if (roster.assignment.isOffDay || !shift) {
    const restDay = gate?.restDay ?? null;
    if (!restDay) return { value: 'Day off', sub: 'No shift in your work schedule' };
    if (restDay !== 'NONE') return { value: 'Day off', sub: REST_DAY_SUB[restDay] };
    return {
      value: 'Day off',
      sub: (
        <>
          Working today?{' '}
          <Link
            to="/me/time/overtime"
            state={{ requestOvertime }}
            className="whitespace-nowrap rounded font-semibold text-secondary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30"
          >
            Request overtime
          </Link>
        </>
      ),
    };
  }
  const half = gate?.halfDayLeave;
  const sub = half ? `${half.leaveTypeName} this ${HALF_LABEL[half.daySession]}` : shift.shiftName;
  if (!shift.startTime || !shift.endTime) return { value: 'Flexible', sub };
  return { value: `${shift.startTime} – ${shift.endTime}${shift.crossesMidnight ? ' (+1)' : ''}`, sub };
}

/** Sub-teks tap: tipe kerja, plus peringatan bila tap tercatat di luar radius. */
function tapSub(punch: Punch) {
  // Tanpa pilihan (profil lapangan) profil yang menilai; tak terbaca sama sekali = tidak tercatat.
  const type = punch.workArrangement
    ? ARRANGEMENT_LABEL[punch.workArrangement]
    : punch.isWorkArrangementUnknown
      ? 'Work type not recorded'
      : 'From your profile';
  if (punch.isWithinGeofence !== false) return type;
  return (
    <>
      {type} · <span className="text-warning-700">outside radius</span>
    </>
  );
}

/**
 * Cuti seharian yang disetujui: kepala tanggal/jam dan kolom Shift/Tap in/Tap out disembunyikan — isinya hanya
 * tanda "—" yang membingungkan, dan tanggal cutinya sudah tertulis di sini — diganti satu pernyataan: kenapa tap
 * in tertutup dan apa yang bisa dilakukan bila karyawan ternyata tetap bekerja.
 */
function ClosedDay({ block }: { block: TapBlock }) {
  return (
    <div className="flex items-start gap-3.5 pb-4 pt-0.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-secondary-600 [&_svg]:size-5">
        <Palmtree strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 font-display text-base font-bold leading-tight text-fg-1">You&rsquo;re on {block.leaveTypeName} today</p>
        <p className="m-0 font-body text-[13px] font-medium text-fg-2">
          Approved · {formatDateRange(block.startDate, block.endDate)} · {block.totalDays} day{block.totalDays === 1 ? '' : 's'}
        </p>
        <p className="m-0 font-body text-xs font-medium leading-normal text-fg-3">
          No tap needed. Working after all? Withdraw the time off first, or ask HR.
        </p>
      </div>
    </div>
  );
}

/**
 * Kartu "Hari ini" — satu kartu, satu tombol. Menjawab tiga hal yang dicari karyawan:
 * shift saya, sudah tap masuk/pulang jam berapa, dan apa yang harus dilakukan sekarang.
 * Detail tap (selfie, tipe kerja, catatan, lokasi) ada di modal; riwayat lengkap di tab History.
 */
export function PunchConsole({
  employeeId,
  workDate,
  geofence,
  policy,
  nextType,
  today,
  shift,
  gate,
  onStart,
}: {
  employeeId: string;
  workDate: string;
  geofence: Geofence;
  /** Kebijakan tap (UIC-TIME §6.1.4); `undefined` = masih memuat. */
  policy: PunchPolicy | undefined;
  nextType: 'IN' | 'OUT' | null;
  today: Punch[];
  /** Roster hari ini; `undefined` = masih memuat. */
  shift: ShiftOn | null | undefined;
  /** Gerbang tap in (cuti seharian) + keadaan hari libur; `undefined` = masih memuat. */
  gate?: TapGate;
  onStart: () => void;
}) {
  const navigate = useNavigate();
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
  // Tap out tidak pernah ditutup; gerbang hanya berlaku sebelum tap in.
  const closed = nextType === 'IN' && gate?.block ? gate.block : null;
  // Selama gerbang dimuat, jangan tampilkan lokasi & petunjuk tap yang bisa langsung hilang.
  const checking = nextType === 'IN' && gate === undefined;
  // Hari libur: tap tetap dibuka karena jam aktual lembur dihitung dari tap (TSD-TIME O-4).
  const restDay = nextType === 'IN' ? (gate?.restDay ?? null) : null;

  const hint = !nextType
    ? 'Both taps are in. Anything wrong? File a correction.'
    : checking
      ? 'Checking whether tap in is open today…'
      : restDay
        ? REST_DAY_HINT[restDay]
        : policy?.canChoose === false
          ? 'Add a note if needed, then tap.'
          : nextType === 'IN'
            ? 'Choose WFO or WFH, add a note if needed.'
            : 'Check WFO or WFH, add a note if needed.';

  return (
    <section className="flex flex-col rounded-xl border border-border-1 bg-bg-surface px-5 pt-[18px] shadow-card-sm">
      {/* Saat cuti, tanggal & jam tidak berguna (tanggal cutinya ada di panel) dan lokasi tidak relevan. */}
      {!closed && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
          <div className="min-w-0">
            <h3 className="m-0 font-display text-base font-bold leading-tight text-fg-1">{dateLabel}</h3>
            <p className="mt-1 font-body text-xs font-medium text-fg-3">
              <span className="tabular-nums">{now}</span> WIB
            </p>
          </div>
          {!checking && <LocationStatus geofence={geofence} policy={policy} />}
        </header>
      )}

      {closed ? (
        <ClosedDay block={closed} />
      ) : (
        <div className="mt-2 grid divide-y divide-border-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TodayCell label="Shift" {...shiftLabel(shift, gate, { employeeId, date: workDate })} />
          <TodayCell label="Tap in" value={tapIn ? hhmm(tapIn.punchAt) : '—'} sub={tapIn ? tapSub(tapIn) : 'Not yet'} />
          <TodayCell
            label="Tap out"
            value={tapOut ? hhmm(tapOut.punchAt) : '—'}
            sub={tapOut ? tapSub(tapOut) : tapIn ? 'When you finish work' : 'After tap in'}
          />
        </div>
      )}

      <footer className="-mx-5 mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-border-1 px-5 py-3.5">
        {closed ? (
          <>
            <span className="font-body text-xs font-medium text-fg-3">Tap in opens again after your time off.</span>
            <Button variant="secondary" onClick={() => navigate('/me/time/time-off')}>
              View My Time Off
            </Button>
          </>
        ) : (
          <>
            <span className="font-body text-xs font-medium text-fg-3">{hint}</span>
            {/* FSD-TIME 0.13 #35 (K1): IN dan OUT sudah ada ⇒ tombol tap DISEMBUNYIKAN, bukan dinonaktifkan. */}
            {nextType && gate !== undefined && policy !== undefined && (
              <Button onClick={onStart}>{nextType === 'IN' ? 'Tap in' : 'Tap out'}</Button>
            )}
          </>
        )}
      </footer>
    </section>
  );
}

/**
 * Jam tap yang berjalan di modal. Waktu yang tersimpan adalah saat tombol Tap in/Tap out ditekan
 * (`punch_at` server), bukan saat selfie diambil — jadi yang ditampilkan jam sekarang, bukan jam foto.
 */
function TapClock({ label }: { label: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = [now.getHours(), now.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':');
  return (
    <span className="flex flex-col">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="font-body text-sm font-semibold tabular-nums text-fg-1">{time} WIB</span>
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
 * Tap in / Tap out dalam satu modal bertahap (UIC-TIME 0.26 §6.1.1/§6.1.4): Details lebih dulu (jam, pilihan
 * WFO/WFH, catatan), lalu Selfie hanya bila baris matriks Settings untuk pilihan itu mewajibkan — tap terkirim
 * begitu foto dipakai. Tap out menawarkan pilihan yang sama, terisi pilihan tap in. Profil lapangan tak ditawari
 * pilihan. Modal, bukan halaman: karyawan tetap tahu ia masih di tengah absen, dan menutupnya berarti batal.
 */
export function TapModal({
  open,
  type,
  geofence,
  policy,
  tapInArrangement,
  busy,
  onSubmit,
  onClose,
}: {
  open: boolean;
  type: 'IN' | 'OUT';
  geofence: Geofence;
  policy: PunchPolicy | undefined;
  /** Pilihan saat tap in hari ini — jadi pilihan awal tap out. */
  tapInArrangement: WorkArrangement | null;
  busy: boolean;
  onSubmit: (submission: TapSubmission) => void;
  onClose: () => void;
}) {
  const canChoose = policy?.canChoose ?? true;
  const [step, setStep] = useState<Step>('details');
  const [frame, setFrame] = useState<Frame | null>(null);
  const [arrangement, setArrangement] = useState<WorkArrangement | ''>('');
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const choice = canChoose ? arrangement || null : null;
  const selfieNeeded = policy ? selfieRequiredFor(policy, choice) : false;
  const steps: Step[] = selfieNeeded ? ['details', 'selfie'] : ['details'];
  const camera = useSelfieCamera(open && selfieNeeded && step === 'selfie' && !frame);
  const fallback = useMemo(
    () => ({ latitude: geofence.centerLatitude, longitude: geofence.centerLongitude, accuracyMeters: 10 }),
    [geofence.centerLatitude, geofence.centerLongitude],
  );
  const { pending: location, resolved } = useDeviceLocation(open, fallback);

  const initial =
    type === 'OUT' && tapInArrangement && TAP_ARRANGEMENTS.includes(tapInArrangement)
      ? tapInArrangement
      : (policy?.defaultWorkArrangement ?? '');
  useEffect(() => {
    if (!open) return;
    setStep('details');
    setFrame(null);
    setArrangement(initial);
    setNote('');
  }, [open, initial]);

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
    // Foto hanya dikirim bila pilihan ini mewajibkannya — ganti ke pilihan tanpa swafoto membuang frame.
    const photo = selfieNeeded ? frame : null;
    onSubmit({
      selfieCaptured: Boolean(photo),
      selfieBase64: photo?.dataUrl?.split(',')[1],
      workArrangement: choice ?? undefined,
      note,
      location: coords,
    });
  };

  // Peringatan dini: koordinat sudah terbaca dan tipe kerja ini memeriksa radius, tapi posisinya di luar.
  const judged = choice ?? policy?.profileWorkArrangement ?? null;
  const outside = Boolean(judged && radiusVerdict(geofence, judged, resolved) === false);
  const away = resolved ? distanceFrom(geofence, resolved) : null;

  const describe = (value: WorkArrangement) => {
    const where = geofence.rules[value].radius
      ? `Within ${geofence.radiusMeters} m of ${value === 'WFO' ? geofence.geofenceName : 'the work point'}`
      : "Location radius isn't checked";
    return policy && selfieRequiredFor(policy, value) ? `${where} · Selfie required` : where;
  };

  const sendLabel = saving ? 'Saving…' : verb;
  const footer =
    step === 'selfie' ? (
      <>
        <Button variant="secondary" onClick={() => setStep('details')}>
          Back
        </Button>
        {frame ? (
          <>
            <Button variant="secondary" onClick={() => setFrame(null)}>
              Retake
            </Button>
            <Button disabled={saving} onClick={submit}>
              {sendLabel}
            </Button>
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
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={(canChoose && !arrangement) || saving} onClick={selfieNeeded ? () => setStep('selfie') : submit}>
          {selfieNeeded ? 'Continue' : sendLabel}
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
          ? `HR requires a selfie for ${choice ?? 'these'} taps.`
          : !canChoose
            ? `Add a note if you need to, then ${verb.toLowerCase()}.`
            : isIn
              ? 'Choose where you work, then tap in.'
              : 'Check where you worked, then tap out.'
      }
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <StepMarker steps={steps} current={step} />

        {/* Jam yang dicatat = saat tombol tap ditekan (`punch_at`), jadi tampil di setiap langkah. */}
        <div className="flex items-center gap-3 rounded-md border border-border-1 bg-cloud px-3 py-2.5">
          <span className="grid size-10 place-items-center rounded-md bg-vapor text-fg-3 [&_svg]:size-4">
            <Clock />
          </span>
          <TapClock label={isIn ? 'Clock-in time' : 'Clock-out time'} />
        </div>

        {step === 'selfie' ? (
          <div className="flex flex-col gap-2">
            {/* Tinggi dibatasi viewport supaya modal + footer muat tanpa gulir di zoom 100%. */}
            <div className="relative mx-auto flex aspect-[4/3] max-h-[40vh] w-full items-center justify-center overflow-hidden rounded-xl bg-obsidian">
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
              {frame ? `Looks good? ${verb}, or retake.` : 'Face the camera in good light. Live camera only.'}
            </span>
          </div>
        ) : (
          <>
            {canChoose ? (
              <div className="flex flex-col gap-2">
                <Label>
                  Work type
                  <span className="ml-0.5 text-error-500">*</span>
                </Label>
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
              </div>
            ) : (
              policy?.profileWorkArrangement && (
                <div className="flex flex-col gap-1">
                  <Label>Work type</Label>
                  <span className="font-body text-[13px] font-medium text-fg-2">
                    {ARRANGEMENT_LABEL[policy.profileWorkArrangement]} — set on your profile
                  </span>
                </div>
              )
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
