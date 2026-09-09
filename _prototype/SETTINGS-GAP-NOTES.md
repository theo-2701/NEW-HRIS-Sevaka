# Settings service — build notes

Built from `uploads/FSD-001-SETTINGS-0.2.md` + `UIC-001-SETTINGS-0.2.md` (grounded on
TSD-0.3 / ERD-0.4). Three pages cover all 10 menus / 74 documented screens.

## Files
- `settings-configuration.html` + `js/settings-configuration.js` — menus 1–8 (A1 read / A2 write).
  One engine, eight tabs: the contract is identical, only the `setup_code` subset differs.
  Sub-tabs (segmented) for the two menus that derive sub-menus — Time 7, Finance 4.
- `settings-change-history.html` + `js/settings-change-history.js` — menu 9 (A3). Read-only,
  zero buttons, four filter axes in one Filter modal, `.ph-foot` pagination.
- `settings-erasure-requests.html` + `js/settings-erasure.js` — menu 10 (A5/A6/A7).
  A8 has no screen (machine caller) and A4 is not triggered by any screen — both left out.
- Dataset `js/settings-data.js`; unique CSS `css/settings.css`.
- Sidebar: `System › Settings` gains 9 routes (hash per menu); erasure sits in a
  "Settings — no menu row yet" holding section (PROB-FRONTEND-033).

## Honest-source rule (read this before "fixing" a hollow table)
The corpus fixes each menu's row count (76 = 26+27+8+7+2+2+3+1) but only NAMES part of them.
Rows carry only setup_codes that appear verbatim in a source document; the remainder is a
counted strip row ("N more rows per the contract count — no document names their setup_code").
Same for values (`—` = the positive-scenario dataset quotes none) and offers (no min/max =
the guardian file has not been generated). Inventing any of these is forbidden by the docs.
Named coverage: Time 13/26 · Finance 27/27 · Payroll 8/8 · Performance 1/7 · Productivity 2/2 ·
Document 2/2 · Organization 3/3 · Employee 1/1.

## Screen → page map
- WKT-1/KEU-1/GAJ-1/KIN-1/PRO-1/DOK-1/ORG-1/KARY-1 → menu tab, FULL class.
- WKT-4/KEU-3/GAJ-4/KIN-5/PRO-5/ORG-3/KARY-3 → same tab with "Viewing as" set to the R‡ role
  (3 columns, offers omitted, no Save). WKT-5 → gate panel (403 before any query).
- WKT-2 (locked row absent) / WKT-3 (retired) / KEU-2 / PRO-2 / DOK-2 / ORG-2 / KARY-2 /
  GAJ-2 / KIN-2..4 / PRO-3/4/6 / DOK-3 → documentation notes under the table, not extra screens.
- KEU-4 → review modal (before→sent + literal body + three malformed shapes).
  WKT-6/GAJ-3/GAJ-5 → 200 modal. WKT-7 → refusal modal. ORG-4/ORG-5 → refusal messages from
  the same write path. ORG-6 → the 500 modal.
- RIW-1..7 → history page (RIW-2 gate, RIW-6 carried `?code=`, RIW-7 no buttons).
- PDH-1..5 → erasure page (form modal, 201 modal, 409 inline refusal, list, detail modal).

## Deliberate additions / deviations (flagged, not silent)
1. **`confirm_transition` checkbox** in the review modal for R/O/D rows moving to DISABLED.
   The contract makes the field conditionally mandatory but no drawn screen carries a control
   (PROB-FRONTEND-046); without it that path can only ever be refused. Labelled in-place.
2. **"Viewing as" role switch** — a prototype device to reach the second answer class and the
   gate refusal. Labelled: the real class comes from the token, never from a control.
3. **Page size 10/20/50** from the house pager against a contract default of 25 (max 100).
   Noted on the history page.
4. Descriptions are rendered verbatim from the contract examples, so the one row that has a
   description shows Indonesian text inside an otherwise English screen — server data, not UI copy.
5. Save sends every edited row across every menu (PROB-FRONTEND-035 leaves the scope open);
   the screen says so rather than picking silently.

## GAPs surfaced on screen
PROB-FRONTEND-033 (menu home) · -034 (machine-name labels) · -035 (Save scope) · -036 (flattened
`[24]` passes) · -037 (three kinds of emptiness) · -038 (pointer row) · -039 (frozen-at-use) ·
-040 (no persona for R‡ roles) · -041 (two settings, four gates) · -042 (REPRIMAND_RULE mismatch) ·
-046 (confirm_transition control) · DUMMY-CONFIG-002 (provisional document key names) ·
PROB-SERVICE-440 (`[]` passes everywhere) · -442 (TSD vs ERD on the REQUIRED gate) ·
PROB-INFRA-023 + dev server down since 03 Aug 2026 (nothing here has ever run for real).


## Audit 21 Aug 2026 — Finance · Payroll · Performance · Productivity (design vs documents vs Figma)

Documents win, house standards carry the rendering. Fixed in this pass:

1. **Finance — 24 of 27 rows had no value.** The settings-side guardian file is unbuilt, but the
   OWNING service writes every default: TSD-001-FINANCE-0.3 §16.2.1–§16.2.4. The rows now carry
   those (benefit 90/true/14/false/5/12-31 · loan UNIFORM/1/24/6/true/false/[] · cash advance
   false/1/30/14 · plain false/3/2), each naming its source in the row note where the tenant has
   moved off the default. Only two bounds are written anywhere (reminder escalation 1–14,
   retention 2 and up); nothing else was invented.
2. **`finance.benefit.period_close_date` is a date (`12-31`), not a number.** It was rendered as a
   bounded number box, which cannot hold it. New free-text control shape + an offer cell that says
   no branch of the offer covers it.
3. **Performance had 1 of 7 rows.** FSD-001-SETTINGS §4 names all seven semantically and the
   reference frames name their codes: additional_item_max_ratio · assessment_structure_id ·
   objection_answer_deadline_days · objection_deadline_days · period_length_days · return_quota ·
   scale_length. All seven now render, with FROZEN PER PERIOD / FROZEN PER SHEET badges on the four
   the performance-service freezes at point of use (PROB-FRONTEND-039).
4. **Payroll defaults were called missing when the owning document writes them.**
   `work_minutes_rounding = 0` and `past_period_recheck_months = 3` exist in TSD-001-PAYROLL-0.3
   §13.2.1; the settings side carries nothing. Badge changed NO DEFAULT YET → **DEFAULT DISPUTED**
   and both sides are named — that is PROB-SERVICE-441, not an empty field.
5. **`payroll.prorate_basis` offered one value; the payroll document names three**
   (CALENDAR_DAYS/WORKING_DAYS/FIXED_30). Offer completed. Same for `suspension_pay_mode`, whose
   three values the payroll document calls PREPARED_FULL/PREPARED_PARTIAL/CALCULATED_ZERO — the
   screen shows the settings vocabulary and names the other in the row note.
6. **`allow_lock_before_cutoff` stored `["false"]` (string) against `[false]` in the contract.**
7. **Ninth payroll key** `payroll.send_deadline_days` (decided 03 Aug 2026, lost in reconciliation)
   is now stated as a note rather than silently absent from a menu that counts eight.
8. **Empty controls now read as empty.** Rows with no value render a dashed field with
   "no value to show" instead of a normal box that looks like a zero (FSD §3.2).

Kept deliberately against the Figma frames:
- `payroll.closing_day_of_month` shows **21**, not the default 25: the version history (UIC §3.1)
  records this company moving 25 → 21 on 14 July 2026. The frame shows the default.
- `finance.benefit.claim_backdate_limit_days` shows **90** and `second_stage_deadline_days` **30**
  (owning document) where the frames show 30 and 7. Documents outrank the frames.
- One screen, one role switch, one review-before-save modal, house tabs and `.rowbtn` History
  actions — the reference frames split the same content into per-state gallery pages (KEU-1a/2/3/4,
  GAJ-2..5, KIN-2..5, PRO-2..6). Same states, reachable by switching role or saving, not by
  navigating to a documentation page.
- Screen language stays English per project standard; the frames are Indonesian.

Still open (not fixable on this screen): productivity two-settings-four-gates reach
(PROB-FRONTEND-041), pointer row without a picker (PROB-FRONTEND-038 / PROB-SERVICE-371),
performance bounds and units (no performance-service document in the corpus).
