// tweaks-app.jsx — wires the Tweaks panel for the SEVAKA HRIS dashboard.
// Persists state to <body data-*> so dashboard.css can react.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "statLayout": "quad",
  "midLayout": "wide-banner",
  "theme": "ocean",
  "showWelcomeName": true,
  "heroName": "[Nama User]",
  "language": "en"
}/*EDITMODE-END*/;

const COPY = {
  en: {
    heroGreeting: 'Selamat Datang,',
    livePill: 'Live Attendance',
    timeOffPill: 'Request Time Off',
    morePill: 'More Request',
    annualLeave: 'Annual Leave Balance',
    annualReq: 'Request annual leave',
    sickLeave: 'Sick Leave Used',
    sickReq: 'Request sick leave',
    viewAll: 'View all',
    whosOff: "Who's Off",
    today: 'Today',
    bannerCopy: 'Pantau kehadiran tim secara real-time dan setujui permintaan cuti dengan lebih cepat melalui sistem HRIS.',
    learnMore: 'Pelajari Selengkapnya',
    qLinksHeading: 'Quick Links',
    appHeading: 'Application',
    announcement: 'Announcement',
    contract: 'Contract & Probation',
    tasks: 'Tasks',
    info: "Introducing the Evaluation Review Cycle. Elevate your organization's success with the power of timely and data-driven review!",
    learnMoreShort: 'Learn more',
    employee: 'Employee', status: 'Status', endDate: 'End Date', duration: 'Total Contract Duration',
    showing: 'Showing', fromRow: 'from 1 row', from: 'from 1',
    genderDiversity: 'Gender Diversity', staffActive: 'Staff Active',
    monthlyTurnover: 'Monthly Turnover', jobLevel: 'Job Level', filter: 'Filter',
  },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Sync state to <body data-*> for CSS to react
  React.useEffect(() => {
    document.body.dataset.density = t.density;
    document.body.dataset.statLayout = t.statLayout;
    document.body.dataset.midLayout = t.midLayout;
    document.body.dataset.theme = t.theme;
  }, [t.density, t.statLayout, t.midLayout, t.theme]);

  // Hero name
  React.useEffect(() => {
    const el = document.getElementById('heroName');
    if (el) el.textContent = t.showWelcomeName ? (t.heroName || '[Nama User]') : '';
    const placeholderEl = document.getElementById('heroNameWrap');
    if (placeholderEl) placeholderEl.style.display = t.showWelcomeName ? '' : 'none';
  }, [t.heroName, t.showWelcomeName]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Layout" />
      <TweakRadio  label="Density" value={t.density}
                   options={['compact', 'regular', 'spacious']}
                   onChange={(v) => setTweak('density', v)} />
      <TweakSelect label="Stat row" value={t.statLayout}
                   options={[
                     { value: 'quad', label: '4 columns (Figma)' },
                     { value: '2x2', label: '2 × 2 stacked' },
                     { value: 'row', label: 'Equal-width row' },
                   ]}
                   onChange={(v) => setTweak('statLayout', v)} />
      <TweakSelect label="Mid section" value={t.midLayout}
                   options={[
                     { value: 'wide-banner', label: 'Wide banner (Figma)' },
                     { value: 'balanced',    label: 'Balanced thirds' },
                   ]}
                   onChange={(v) => setTweak('midLayout', v)} />

      <TweakSection label="Theme" />
      <TweakRadio  label="Palette" value={t.theme}
                   options={[
                     { value: 'ocean',       label: 'Ocean' },
                     { value: 'hi-contrast', label: 'Hi-contrast' },
                     { value: 'soft',        label: 'Soft' },
                   ]}
                   onChange={(v) => setTweak('theme', v)} />

      <TweakSection label="Hero copy" />
      <TweakToggle label="Show user name" value={t.showWelcomeName}
                   onChange={(v) => setTweak('showWelcomeName', v)} />
      <TweakText   label="User name" value={t.heroName}
                   onChange={(v) => setTweak('heroName', v)} />
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById('tweaks-root'));
root.render(<App />);
