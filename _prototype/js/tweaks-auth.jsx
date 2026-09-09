// tweaks-auth.jsx — Tweaks panel for the SEVAKA HRIS auth flow.
// Drives intro splash, background gradient, social buttons, card shape, language.

const AUTH_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "intro": "splash",
  "introSpeed": 1,
  "introReplay": "every",
  "grad": ["#0369A1", "#0284C7", "#87CEEB"],
  "loginMethod": "lemail",
  "showTurnstile": true,
  "cardW": 448,
  "cardRadius": 16,
  "lang": "id"
}/*EDITMODE-END*/;

function AuthApp() {
  const [t, setTweak] = useTweaks(AUTH_TWEAK_DEFAULTS);
  const r = document.documentElement;

  // intro
  React.useEffect(() => {
    document.body.dataset.intro = t.intro;
    document.body.dataset.introReplay = t.introReplay;
    r.style.setProperty('--intro-speed', String(t.introSpeed));
  }, [t.intro, t.introReplay, t.introSpeed]);

  // gradient
  React.useEffect(() => {
    const g = Array.isArray(t.grad) ? t.grad : AUTH_TWEAK_DEFAULTS.grad;
    r.style.setProperty('--grad-a', g[0]);
    r.style.setProperty('--grad-b', g[1] || g[0]);
    r.style.setProperty('--grad-c', g[2] || g[1] || g[0]);
  }, [t.grad]);

  // social buttons
  React.useEffect(() => {
    document.body.dataset.turnstile = t.showTurnstile ? 'on' : 'off';
  }, [t.showTurnstile]);

  // jump to chosen login method screen
  React.useEffect(() => {
    if (window.AUTH) window.AUTH.go(t.loginMethod);
  }, [t.loginMethod]);

  // card shape
  React.useEffect(() => {
    r.style.setProperty('--auth-card-w', t.cardW + 'px');
    r.style.setProperty('--auth-card-radius', t.cardRadius + 'px');
  }, [t.cardW, t.cardRadius]);

  // language
  React.useEffect(() => {
    if (window.AUTH) window.AUTH.setLang(t.lang);
  }, [t.lang]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Intro splash" />
      <TweakRadio  label="Animation" value={t.intro}
                   options={[{ value: 'splash', label: 'Splash' }, { value: 'off', label: 'Off' }]}
                   onChange={(v) => setTweak('intro', v)} />
      <TweakSlider label="Speed" value={t.introSpeed} min={0.5} max={2} step={0.25} unit="×"
                   onChange={(v) => setTweak('introSpeed', v)} />
      <TweakRadio  label="Replay" value={t.introReplay}
                   options={[{ value: 'every', label: 'Every load' }, { value: 'once', label: 'Once / session' }]}
                   onChange={(v) => setTweak('introReplay', v)} />
      <TweakButton label="Replay intro now" secondary
                   onClick={() => window.AUTH && window.AUTH.replayIntro()} />

      <TweakSection label="Background" />
      <TweakColor  label="Gradient" value={t.grad}
                   options={[
                     ['#0369A1', '#0284C7', '#87CEEB'],
                     ['#075985', '#0369A1', '#38BDF8'],
                     ['#0284C7', '#38BDF8', '#BAE6FD'],
                     ['#0C2A4D', '#0369A1', '#0EA5E9'],
                   ]}
                   onChange={(v) => setTweak('grad', v)} />

      <TweakSection label="Sign-in" />
      <TweakRadio  label="Login method" value={t.loginMethod}
                   options={[{ value: 'lemail', label: 'Email' }, { value: 'luser', label: 'Username' }, { value: 'lwa', label: 'WhatsApp' }]}
                   onChange={(v) => setTweak('loginMethod', v)} />
      <TweakToggle label="Show Turnstile widget" value={t.showTurnstile}
                   onChange={(v) => setTweak('showTurnstile', v)} />

      <TweakSection label="Card" />
      <TweakSlider label="Width" value={t.cardW} min={400} max={520} step={4} unit="px"
                   onChange={(v) => setTweak('cardW', v)} />
      <TweakSlider label="Corner radius" value={t.cardRadius} min={4} max={28} step={2} unit="px"
                   onChange={(v) => setTweak('cardRadius', v)} />

      <TweakSection label="Language" />
      <TweakRadio  label="Auth copy" value={t.lang}
                   options={[{ value: 'id', label: 'Bahasa' }, { value: 'en', label: 'English' }]}
                   onChange={(v) => setTweak('lang', v)} />
    </TweaksPanel>
  );
}

const authTweakRoot = ReactDOM.createRoot(document.getElementById('tweaks-root'));
authTweakRoot.render(<AuthApp />);
