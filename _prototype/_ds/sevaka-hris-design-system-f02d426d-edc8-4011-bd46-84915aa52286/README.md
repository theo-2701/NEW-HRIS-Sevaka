# SEVAKA HRIS — Design System

> **"Your Intelligent HR Companion."**
> A design system for the SEVAKA HRIS platform — a fully integrated, commercial-grade Human Resource Information System covering the complete employee lifecycle: recruitment, onboarding, personnel data, attendance & leave, payroll, and performance.

---

## 1. Product context

**SEVAKA HRIS** is a unified HR ecosystem for organizations of any size. It centralizes operations that have historically lived in separate tools (payroll spreadsheets, ATS, scheduling apps, time clocks, performance reviews) into one connected workflow with real-time reporting and AI-powered insights.

The system has two distinct surfaces in this file:

| Surface | What it is | Audience |
|---|---|---|
| **HRIS App** | The signed-in product — dashboard, employee directory, time/leave, payroll, productivity, recruitment, settings | HR admins, managers, employees (Indonesian-first, dual-language) |
| **Marketing Website** | Public site & "Request Demo" funnel (Login — HRIS / HRCM, Group Structure, Demo flows) | Prospects, sales-led signups |

There is also an explicit *secondary product line*, **HRCM SEVAKA** (Human Resource Capital Management), referenced from the marketing site. This system primarily targets **HRIS**; HRCM uses the same visual language.

### Sources

This system was reconstructed from a single source of truth:

- **Figma file** — `UI HRIS_V1.0 (21052026).fig`, mounted read-only as a virtual filesystem during creation.
  - 32 pages, 129 top-level frames, ~150 K nodes, 1 047 local components.
  - Key reference pages: `Design-System/Cover`, `ReadME/ReadME`, `Color-Palette-Typography/*`, `Icon/Outline` (`/Solid`), `Component/*`, `Authentication-Sign-In-Up/Sign-in-Page`, `Home-Dashboard/Home-Dashboard`, `HRIS-v-1.0/*`, `Website---Flow-Demo-Request/*`.
  - Project authored by **Theodorus F. Kiatra** (credited on the design-system cover); UI reference cited internally is **Talenta** (an Indonesian HRIS).
- No live codebase has been attached. Anything visual the Figma file does not specify is documented as a substitution below.

The figma readme also notes:
> *"UI di Figma ini lebih update dibanding FSD, mohon gunakan ini sebagai referensi utama."*
> ("The Figma UI is more current than the FSD; please use it as the primary reference.")

---

## 2. Index

| File | What it covers |
|---|---|
| `README.md` | This document |
| `SKILL.md` | Agent-skills front-matter so this folder can be lifted into Claude Code |
| `colors_and_type.css` | All design tokens (color scales, type ramp, radii, spacing, elevation, motion) |
| `assets/` | Brand marks (logo on light, on dark, mark-only) — vector |
| `preview/` | Design-system tab cards (palette, type, components, motifs) |
| `ui_kits/app/` | HRIS App UI kit — sidebar/topbar/dashboard/employee/login |
| `ui_kits/website/` | Marketing website UI kit — public homepage + demo CTA |
| `ICONOGRAPHY.md` | Icon system, substitutions, usage rules |

Open `preview/00-overview.html` to see every card in one place, or visit any `ui_kits/<product>/index.html` for an interactive prototype.

---

## 3. Content fundamentals

**Bilingual, formal-leaning, system-first.** SEVAKA is built for Indonesian organizations and the copy ships in **Bahasa Indonesia** with **English** as a parallel default. The dialect inside the app trends towards formal/business Bahasa with HR-industry English terms left untranslated.

### Tone

- **Direct and operational** — "Masuk dengan ID Karyawan" / "Sign in with Employee ID". Verbs first, no marketing fluff inside the app.
- **Polite-formal, never chummy.** No exclamation marks in product copy. The one banner that opens with *"Selamat Datang, [Nama User]!"* is the rare exception — every other surface uses calm declarative sentences.
- **Helper text is matter-of-fact** — *"Pastikan perusahaan Anda sudah memiliki username perusahaan sebelum melakukan login dengan ID karyawan."* ("Make sure your company already has a company username before logging in with an employee ID.")
- **Marketing site shifts to first-person plural** — "we", "kami". Inside the app, voice is **second person** ("Anda" / "you") talking to the employee or HR admin.

### Pronouns & casing

- App: **"Anda" / "you"** for the user, **"Karyawan"** for third-person employees.
- **Title Case** for section headers and screen titles (English) — *"Employee Management"*, *"Time Management"*, *"Manpower Planning"*.
- **Sentence case** for body copy and form helper text.
- **ALL CAPS** is reserved for: small uppercase labels (`.t-label`, `.t-label-sm`, tracking 2 %) and a handful of *brand-style* swatch names ("OCEAN", "SAND", "EMERALD") in design-system docs.

### Mixed-language reality

The Figma ReadME explicitly flags this:
> *"Wording pada UI ... saat ini masih mengikuti referensi dan belum fully refined/defined. Beberapa masih terdapat campuran bahasa atau ketidakkonsistenan."* — wording is still partly mixed-language and inconsistent.

So when adding copy: pick **one language per screen** and stick with it. Default to **Bahasa Indonesia** for end-user-facing app surfaces, **English** for design-system / dev-mode docs, and **dual** only inside marketing hero copy.

### Emoji

**None.** No emoji are used anywhere in the system. Iconography is the visual language; emoji never appears in product, marketing, or admin copy.

### Specific examples to mirror

- Heading on sign-in: `"Masuk dengan ID Karyawan"`
- Helper: `"Pastikan perusahaan Anda sudah memiliki username perusahaan sebelum melakukan login dengan ID karyawan."`
- Empty/upload helper: `"Use the provided templates customized for SEVAKA data system to upload data accordingly to the format."`
- Profile guidance: `"Your email address is your identity on SEVAKA"`
- Dashboard greet: `"Selamat Datang, [Nama User]!"`
- Settings CTA: `"View details on SEVAKA Insights"` (links to the deeper analytics surface)

---

## 4. Visual foundations

The aesthetic is **clean enterprise** — calm light surfaces, an Ocean-blue brand, generous breathing room — but lifted out of "another SaaS dashboard" by **three signature moves**:

1. **A two-tone blue.** Cool *Sky* (`#87CEEB`) accents and a richer *Ocean* (`#0284C7`) for action. Heroes use a vertical Sky→Ocean gradient.
2. **Soft-press buttons.** Active/hover states get an inset-light + inset-shadow combo that mimics a pressed silicone key — never a flat darken.
3. **Pill summary buttons with cool gradients.** The "Summarize Data" CTA on every navbar is a 28 px tall pill with a 4-stop gradient `Ocean → Sky → Light → Steel`, dark inset shadow. Used sparingly for AI features.

### Color

| Family | Use | Anchor |
|---|---|---|
| Primary — Sky `#87CEEB` | Brand mark surface, hero gradients, accent illustrations | `--color-primary-500` |
| Secondary — Ocean `#0284C7` | CTAs, focus rings, links, active states, sidebar selected | `--color-secondary-500` |
| Tertiary — Sand `#FDE68A` | Warm accents, illustrative spot color | `--color-tertiary-500` |
| Success — Emerald `#34D399` | Valid fields, success badges |  |
| Warning — Amber `#F59E0B` | In-process, warnings |  |
| Error — Rose `#EF4444` | Errors, danger |  |
| Obsidian `#111827` | Headings, overlays |  |
| Slate `#334155` | Body text |  |
| Silver `#94A3B8` | Helper / deemphasized text |  |
| Vapor `#F1F5F9` | Border accent |  |
| Cloud `#FAFCFE` | Dialog / overlay background |  |
| Mist `#F3FAFD` | App page background (the very pale primary tint) |  |

Each brand color carries a **10-step scale** with named states (`Light :hover`, `Light :active`, `Normal`, `Normal :hover`, `Normal :active`, `Dark`, `Dark :hover`, `Dark :active`, `Darker`). Designers and developers must use the **named state**, not the step number — that's how the Figma file is structured.

### Typography

Three families, each with a job:

- **Plus Jakarta Sans** — display & headings (`Bold`, tracking −2 % on h1/h2). Big, slightly humanist.
- **Inter** — everything else: body, buttons, table cells, labels. Heavy use of `Medium` (14 px) for UI text and `Bold` (10 px / 8 px) for uppercase labels.
- **Arial** — *only* for the **SEVAKA** wordmark and a small number of sidebar nav labels (the latter is a Figma legacy; new work should standardize on Inter for navigation).

Sizes run **8 / 10 / 12 / 14 / 16 / 20 / 24 / 40 / 64** px. Body default is **16 px / line-height 140 %**. Buttons are **14 px Bold with 4 % tracking**. Pre-titles ("Label" style) are **10 px / 2 % tracking / uppercase**.

### Spacing

**8-point grid.** The figma ReadME explicitly states it, and inspecting components confirms it: gaps, paddings, container heights are 8 / 16 / 24 / 32 / 40 / 64. Deviations are allowed only when "close to a multiple of 8" (it specifically mentions 2.4, 4, 6.4 as acceptable when needed); aim for 8 first.

### Backgrounds

- **App page**: solid `--color-mist` (#F3FAFD). No textures, no patterns.
- **Hero banners** (dashboard, profile): **vertical linear gradient** from Sky → deep Ocean (`rgb(122,185,212) → rgb(2,99,149)`). Tall, full-width, sometimes with a soft inset.
- **Sign-in / auth**: a softer **conic gradient** (`Ocean → Sky → Ocean`) behind a centered white card.
- **Cards / widgets**: solid `--color-white` on `--color-mist`; never tinted backgrounds.
- **Charts**: white card, the colored data fills (Ocean for primary series, Sand/Sky as secondary, Rose for negatives).

**No** background imagery, repeating patterns, hand-drawn illustrations, or grain. Photography appears only as employee avatars (round, 32–64 px) and one stock-style header image on marketing pages.

### Borders

- Default hairline: **1 px solid `#EAECF0`** (Fog).
- Stronger separator: **1 px solid `#D0D5DD`**.
- Dashed (used for "drop here" / upload zones and design-time slot markers): **1 px dashed `#94A3B8`**.
- Focused field: **1 px solid `--color-secondary-500`** + outer ring (no offset).
- Errored field: **1 px solid `--color-error-500`** + 4 px outer ring at 16 % alpha.

### Corner radii

- **8 px** for buttons, fields, chips, modals headers, tags, badges (the most-used radius).
- **10 px** for cards, dropdowns, popovers.
- **12 px** for swatches and large content cards.
- **16–24 px** for hero containers / large modals.
- **999 px** for pills (the "Summarize Data" gradient pill, status pills).

### Elevation / shadow system

The Figma file ships **one** card shadow (`0 2 4 rgba(0,0,0,0.16)`) and uses it everywhere visible. We augment with:

- `--shadow-card-sm` — for nav bars and tighter cards (`0 1 2 rgba(16,24,40,.06), 0 1 3 rgba(16,24,40,.10)`).
- `--shadow-modal` — for centered modals (`0 4 4 rgba(0,0,0,0.25)`).
- `--shadow-inset-rim` — universal **1-pixel inset rim** on inputs and secondary buttons (`inset 0 0 2px slate`). This is the most-shipped detail in the entire system.
- `--shadow-press` — the *soft-press hover/active* combo: 3 inset lights + 1 brand rim + 1 inset dark shadow.

There is no **outer** colored shadow / "glow" system; brand emphasis is communicated through the inset rim and gradient pills, not through blurry coloured drop-shadows.

### Hover / press states

Hover and press are **almost identical** by design — both apply `--shadow-press`. The difference is the *base color*:

- **Primary button** hover: keep Ocean fill, add `--shadow-press`.
- **Secondary button** hover: switch fill from white to `--color-vapor` (#F1F5F9), add `--shadow-press`.
- **Field** focus: 1 px Ocean border + soft outer ring; no fill change.

No opacity-fades, no scale transforms — the language is **soft-press**, not float.

### Animation

Light hand. Transitions on `background-color`, `border-color`, `box-shadow`, `transform` — durations **120–240 ms**, easing **`cubic-bezier(0.2, 0, 0, 1)`** (standard) or `(0.3, 0, 0.1, 1)` (emphasized).

- Modals fade in + scale from 96 % (180 ms).
- Toasts slide-in from top-right (180 ms).
- No bounces. No spring physics. No looping background animations.

### Transparency / blur

Used **only** for overlay scrims (`rgba(0,0,0,0.40)` behind modals) and the **white-80 % pill backgrounds** on swatch cards. No frosted-glass backdrop blur anywhere in the system.

### Layout rules

- **Fixed top navbar** (92 px tall, white, hairline divider on bottom). Brand mark + product name on the left, primary search + AI summary + user menu on the right.
- **Fixed left sidebar** (84 px collapsed / 264 px expanded). White, hairline right edge, vertical icon-stack.
- **Page height tracks the laptop viewport**, not the full content length. Internal scroll is on **containers** (tables, forms), not the page itself — quoted directly from the Figma ReadME.
- **Hero is always 198 px tall** at the top of dashboard pages, with a Sky→Ocean gradient and the page title in 24 px display.

### Imagery vibe

When stock photography appears (marketing pages, hero banners), tone is **warm, business-casual, multi-ethnic Indonesian workforce, indoor/office, soft natural light**. No black-and-white, no grain, no high-contrast moody shots. Avatars are full-color, often with a 1 px white ring on coloured backgrounds.

---

## 5. Iconography

See `ICONOGRAPHY.md` for the full breakdown. Short version:

- The Figma file ships **two complete icon families**: `Outline` (~200+ icons) and `Solid` (~120+ icons), all on a **24 × 24** grid, 1.5 px stroke, rounded line caps.
- Categories: `Interface`, `Communication`, `Files`, `Status`, `Devices`, `General`, `Navigation`, `Media`, `Brands`.
- For this code-side system we substitute with **Lucide** (`https://unpkg.com/lucide@latest`) — a CDN icon set that matches the Figma stroke weight and geometry almost identically. This is documented as a **substitution** below.
- The Figma SVGs themselves can be lifted into `assets/icons/` when needed; the source paths are `/Icon/Outline/<name>/Icon.svg` and `/Icon/Solid/<name>/Icon.svg` inside the .fig.

---

## 6. Substitutions / open items (please review)

1. **Fonts** — Plus Jakarta Sans, Inter, and Arial are all loaded via Google Fonts (Arial is system-installed). No font files are bundled. If you want a self-hosted build, please drop the woff2 files into `fonts/` and I'll wire them up.
2. **Icons** — The Figma file's 24×24 Outline + Solid sets are not extracted as individual SVGs; **Lucide** is used as a CDN substitute. If the team would like the Figma icon SVGs extracted into `assets/icons/`, ask and I'll do a sweep.
3. **Charts** — Dashboard mini-charts are visually styled but use placeholder SVG paths (no live data binding). Real series use brand Ocean / Sky / Sand fills, no library is assumed.
4. **Brand "S" mark** — Reconstructed from the Figma cover (square tile in Sky with a centered Arial-Bold "S" in white). If there's a higher-fidelity brand asset, please drop it in `assets/`.
5. **Photography** — Marketing hero uses a Sky→Ocean gradient placeholder rather than a real photograph. Drop assets into `assets/marketing/` and I'll wire them in.
6. **HRCM** — The HRCM SEVAKA secondary product is mentioned but its surface area inside this Figma is shallow. Calling it out as a known gap; ask for an HRCM UI kit if needed.

---

## 7. Where the design system ends and design judgement begins

When the Figma file and a screenshot disagree, **trust the Figma values** (per the file's own ReadME). When there is no Figma value (a tooltip we haven't seen, an empty state we don't have, a loading skeleton), default to:

- Same 8-pt spacing
- Same hairline border `#EAECF0`
- Same `--shadow-card`
- Body in Inter Medium 14 px, helper in Inter Regular 12 px / Silver
- Buttons in `.t-button` style with `--shadow-inset-rim`

That keeps anything new visibly part of SEVAKA without inventing new visual primitives.
