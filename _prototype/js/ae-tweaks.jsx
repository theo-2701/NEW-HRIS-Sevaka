/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor */
// Add Employee — Tweaks app. Mounts the panel, then mirrors tweak state onto the
// live (vanilla) page: data-density / data-field on <body>, and an accent that
// remaps the brand vars + primary-button vars on :root.

const AE_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "cozy",
  "field": "outlined",
  "accent": "#0284c7"
}/*EDITMODE-END*/;

// Curated accents. Each entry: swatch value [500, 200, 700] + the full ramp.
const AE_ACCENTS = {
  "#0284c7": { name: "Ocean",   c100: "#d9edf7", c200: "#b1d9ee", c500: "#0284c7", c600: "#0277b3", c700: "#026a9f", c800: "#026395" },
  "#4f46e5": { name: "Indigo",  c100: "#e0e7ff", c200: "#c7d2fe", c500: "#4f46e5", c600: "#4338ca", c700: "#3730a3", c800: "#312e81" },
  "#059669": { name: "Emerald", c100: "#d1fae5", c200: "#a7f3d0", c500: "#059669", c600: "#047857", c700: "#036b4e", c800: "#065f46" },
  "#7c3aed": { name: "Plum",    c100: "#ede9fe", c200: "#ddd6fe", c500: "#7c3aed", c600: "#6d28d9", c700: "#5b21b6", c800: "#4c1d95" }
};

function applyAccent(key) {
  const a = AE_ACCENTS[key] || AE_ACCENTS["#0284c7"];
  const r = document.documentElement.style;
  r.setProperty("--color-secondary-100", a.c100);
  r.setProperty("--color-secondary-200", a.c200);
  r.setProperty("--color-secondary-500", a.c500);
  r.setProperty("--color-secondary-600", a.c600);
  r.setProperty("--color-secondary-700", a.c700);
  r.setProperty("--color-secondary-800", a.c800);
  // primary button is built from hardcoded ocean tokens — remap them too
  r.setProperty("--bg-primary-btn",
    `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 95.83%), ${a.c700}`);
  r.setProperty("--bg-primary-btn-hover",
    `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 95.83%), ${a.c800}`);
  r.setProperty("--bg-primary-btn-press",
    `linear-gradient(180deg, rgba(255,255,255,0.16) 4.17%, rgba(255,255,255,0) 100%), ${a.c800}`);
  r.setProperty("--shadow-primary", `inset 0 0 8px 0 ${a.c700}`);
  r.setProperty("--shadow-primary-hover", `inset 0 0 8px 0 ${a.c800}`);
  r.setProperty("--shadow-primary-press", `inset 2px 2px 4px 0 rgba(0,0,0,.24), inset 0 0 8px 0 ${a.c800}`);
}

function AETweaks() {
  const [t, setTweak] = useTweaks(AE_TWEAK_DEFAULTS);
  const accentKey = Array.isArray(t.accent) ? t.accent[0] : t.accent;

  React.useEffect(() => { document.body.dataset.density = t.density; }, [t.density]);
  React.useEffect(() => { document.body.dataset.field = t.field; }, [t.field]);
  React.useEffect(() => { applyAccent(accentKey); }, [accentKey]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Rhythm" />
      <TweakRadio
        label="Density"
        value={t.density}
        options={["compact", "cozy", "spacious"]}
        onChange={(v) => setTweak("density", v)}
      />
      <TweakSection label="Inputs" />
      <TweakRadio
        label="Field style"
        value={t.field}
        options={["outlined", "filled", "underlined"]}
        onChange={(v) => setTweak("field", v)}
      />
      <TweakSection label="Brand" />
      <TweakColor
        label="Accent"
        value={accentKey}
        options={Object.keys(AE_ACCENTS)}
        onChange={(v) => setTweak("accent", Array.isArray(v) ? v[0] : v)}
      />
    </TweaksPanel>
  );
}

(function mount() {
  const host = document.createElement("div");
  host.id = "ae-tweaks-root";
  document.body.appendChild(host);
  ReactDOM.createRoot(host).render(<AETweaks />);
})();
