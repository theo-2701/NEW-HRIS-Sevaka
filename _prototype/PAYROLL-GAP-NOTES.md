# PAYROLL — Gap notes (Proses Gaji / Salary Processing)

Compared: `payroll-doc-processing.html` (build) × `uploads/FSD-001-PAYROLL-0.1.md` §1 + `uploads/UIC-001-PAYROLL-0.2.md` §2 × the 16 Figma-flow screenshots (A1–A7, B1–B13). Contract wins; house standards (`CLAUDE.md`) applied on top.

## Screen coverage — 21/21 present
A1 grid · A2 run modal · A3 detail card · A4 review modal · A5 frozen parameters · A6 findings subset · A7 status timeline (A3/A5/A6/A7 live as one detail card with sub-tabs — one table on screen at a time, per house standard) · B1 lifecycle card · B2 encyclopedia (13) · B3 detail render · B4 grid + filters · B5 resolve · B6 PERIOD_NOT_PICKED_UP lock · B7 bulk resolve · B8/B9 closed-history (reachable via the period + state filters instead of two static tables) · B10 conceptual banner · B11 import grid · B12 submit/correct · B13 verify card.

## Fixed in this pass
1. **Gate 3 was wrong.** Was rendered as "cut-off passed" and derived from a hard-coded period id. UIC §2.3 defines the third gate as `gate_3_param_snapshot_complete` — a derivation over the ten snapshot rows frozen in the same transaction as the run. Now labelled *Gate 3 · Param snapshot* / "10/10 frozen".
2. **Gates 1–2 relevance.** The screenshots state gates 1 & 2 are not yet relevant at `CALCULATED` (they are called when the checker locks). The detail card and the tab note now say so, so the two red crosses on PP-2026-09 no longer read as blockers.
3. **Recalculate could destroy a lock.** The run form re-ran any existing period and wiped `locked_by`/`handed_over_by`. UIC §2.1 only allows the Recalculate branch on `status='CALCULATED'`; other states must be reopened by the checker. Now guarded with a `422` and no mutation, and a recalculate no longer writes a bogus `log_payroll_period_state_change` row (status is unchanged).
4. **Invented column removed.** The A1 grid and the review modal showed an "Employees" count that is not a `mst_payroll_period` field in the contract and is absent from the screenshots.
5. **Row-action standard on the import grid.** Verified rows now show a single inline **View Detail**; only an unverified row gets the Action ▾ menu (Verify / Correct).
6. **Headcount read door (B13, `#55`).** The doc requires a visible note that this server-to-server door has deliberately zero client screen — added under the import grid.
7. **Language.** One language per screen: the remaining Indonesian cell strings ("Belum lolos", "Belum ditinjau", "BELUM DIVERIFIKASI", month names, the 13-type encyclopedia copy) are now English. Contract enums stay verbatim (`CALCULATED`/`REVIEWED`/`LOCKED`/`HANDED_OVER`, `DIPERBAIKI`/`DITERIMA`/`TERBUKA`, `LEGACY_SYSTEM_IMPORT`, param keys).

## Deliberate deviations from the screenshots (kept, functionally equivalent)
- **B8/B9 are filter states, not separate pages.** The closed-findings views for PP-2026-08 / PP-2026-07 are reached with the period + final-state filters on the same grid; the retention case (`FND-0013 PERIOD_NOT_PICKED_UP`, still open on PP-2026-07) is in the dataset and behaves as documented.
- **B1/B2/B10 sit in a "The 13 finding types" sub-tab** instead of three standalone static pages, so the operator never lands on a page whose only content is a diagram.
- **Bulk cross-period guard is unreachable by construction** (grid is scoped to one period). The note states it rather than faking a broken selection.
- **The screenshots' endpoint/error-code prose** (`log_payroll_period_state_change`, 409/422 codes) is condensed into the modal notes rather than printed as page body copy.

## Open gaps (not fixable in the UI)
- **`#34 GET/POST adjustments/search` ("daftar tertahan")** — `TSD §15.3.7.3` calls it the fourth row of the Proses Gaji menu but the FSD confirms it was never realised as a screen (FSD §1.7 / §6). No screen built here; needs a product decision before it gets one.
- **Sort whitelist not exposed.** `#31` allows `created_at` / `period_year` / `period_month` / `status`; the grid currently sorts implicitly by period. Column sorting is a small addition if wanted.
- **`#59 GET /history-imports/{id}`** is only implied by the grid + verify card (as the FSD itself notes) — no dedicated screen.
