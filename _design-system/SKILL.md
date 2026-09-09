---
name: sevaka-design
description: Use this skill to generate well-branded interfaces and assets for SEVAKA HRIS, either for production or throwaway prototypes/mocks. Contains essential design guidelines, color &amp; type tokens, fonts, brand assets, and UI kit components ready for prototyping.
user-invocable: true
---

# SEVAKA HRIS — design skill

You are designing for **SEVAKA HRIS**, a fully integrated Indonesian Human Resource Information System platform. Tagline: *"Your Intelligent HR Companion."*

## How to use this skill

1. **Read `README.md` first** — it has the full content fundamentals, visual foundations, iconography rules, and an index of every other file in this folder.
2. **Then explore the rest:** `colors_and_type.css` (all tokens), `ICONOGRAPHY.md` (icon system + Lucide mapping), `assets/` (logo variants), `preview/` (per-token reference cards), `ui_kits/app/` (full HRIS app recreation), `ui_kits/website/` (marketing site + public login).
3. **For visual artifacts** (slides, mocks, throwaway prototypes): copy `colors_and_type.css` and any needed assets out, then write static HTML files that load the tokens. The two `ui_kits/` HTML files are full reference implementations — open them, look at the patterns, and reuse the structure.
4. **For production code:** read `colors_and_type.css` and map the CSS variables to your framework's design tokens. Read `ICONOGRAPHY.md` before picking an icon library — the system targets a 1.75 px stroke, 24 × 24 grid look.

## Quick reminders (do not violate)

- **Two-tone blue brand.** Sky `#87CEEB` for accent + brand mark, Ocean `#0284C7` for action / CTAs / focus / links. Sand `#FDE68A` for warm accent. Headings dark Obsidian, body Slate, helper Silver.
- **8-point grid** for everything spacing-related.
- **Plus Jakarta Sans** for display, **Inter** for everything else, **Arial** *only* for the SEVAKA wordmark.
- **No emoji.** Anywhere. Iconography is the visual language.
- **No gradients** except the canonical Sky→Ocean hero, the auth conic, and the 4-stop "Summarize Data" AI pill.
- **Soft-press hover/active state** — never opacity fades or scale transforms. Use `--shadow-press` from the tokens file.
- **Tone:** formal Bahasa Indonesia for end-user surfaces, English for design-system docs. Polite, direct, no marketing fluff inside the product. Avoid exclamation marks except in the one canonical welcome banner.
- **Icons:** Lucide via CDN, `stroke-width="1.75"`. Map names per `ICONOGRAPHY.md`.

## If the user invokes this skill with no other guidance

Ask what they want to build (a slide deck about SEVAKA's roadmap? a new product surface? a marketing campaign? a flow recreation?), ask 2–3 focused follow-ups (audience, length, language, whether they want variations), then act as an expert designer who outputs HTML artifacts — or production code, depending on the need. Default to HTML mocks unless told otherwise.

## Source of truth

This skill was reconstructed from the Figma file **`UI HRIS_V1.0 (21052026).fig`** authored by Theodorus F. Kiatra. When in doubt about a token or component spec, prefer the values in `colors_and_type.css` (already lifted from the Figma) over any guess. When introducing something the Figma file doesn't cover, default to the inheritance rules in `README.md` §7.
