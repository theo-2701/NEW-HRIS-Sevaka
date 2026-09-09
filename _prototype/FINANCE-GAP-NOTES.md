# FINANCE — gap notes vs FSD-001-FINANCE-0.2 / UIC-001-FINANCE-0.2

## TSD-001-FINANCE 0.2 → 0.3 — checked, **zero FE impact** (no change made to the build)

Checked against `uploads/TSD-001-FINANCE-0.3.md` directly, not only the changelog summary.
Of the five 0.3 changelog entries, four are citation unpins (`SAD-001-0.27.md` → `SAD`) with
zero content change. The one substantive entry is the explicit idempotency key on the two
finance signal topics:

- §9.2.2 `finance.decision.signal.recorded` and §9.2.3
  `finance.cash_advance.settlement.overdue` now name **`eventId`** as the idempotency key
  (`PROB-SERVICE-295`, 03 Aug 2026), and state that the partition key `employeeId` is
  **not** an idempotency/upsert key. Payload shape unchanged; consumer is
  `performance-service`.

Why nothing was added to the prototype:

- These are Kafka producer contracts (finance → performance-service), reached from
  `finance_event_outbox` by the §10.5 relay sweep. No REST endpoint, DTO, enum, status,
  role or error code in §14 changed, so no screen in this build reads or writes them.
- The build has no event-consumer surface, and the FSD/UIC frame sets (still 0.2) contract
  no screen for the outbox or the signal topics.
- The accepted consequence noted in 0.3 — a stored finance signal cannot be corrected or
  retracted by its publisher — likewise has no UI affordance to remove, because none was
  ever drawn.

Also re-verified as *not* 0.3 deltas (they predate this version, already reflected in the
build): §4.2's four requested permission-matrix changes are still "belum dieksekusi"
outbound contracts, and §4.3's server-side-enforcement rule (filter by scope, not
hide-the-button) is unchanged.

Open item unchanged by 0.3: the §14 catalogue of 101 endpoints has not been swept
endpoint-by-endpoint against the prototype — the gap notes below are anchored on
FSD/UIC 0.2, which is the contract layer the screens are built from.

Recorded deviations between this prototype and the Finance document set. Nothing here is
improvised silently: each entry says what the documents contain, what the build contains,
and what needs to change on the document side.

---

## MAJOR — added frame `CA-B0` "Submit settlement" (Cash Advance / FT4)

**Status:** built in the prototype, **absent from the FSD frame set**. Needs a document change.

**What the documents say**

- `UIC-001-FINANCE-0.2` §5 contracts the step in full:
  - `5.9 POST /cash-advances/{id}/settlements` — the recipient hands in the receipts.
    Body: `is_final_stage` + `items[] { expense_date, amount, receipt_no, document_id }`.
    Guards: `409 FIN_DUPLICATE_RECEIPT` on a cross-module receipt-number clash (`FD-83`);
    `document_id` existence validated **before** the domain transaction (`C-FIN-10`);
    `Idempotency-Key` mandatory.
  - `5.10` — list & detail of the settlements of one advance (no `/search`, small volume).
- `FSD-001-FINANCE-0.2` §4 lists 9 frames — `CA-A1 … CA-A4`, `CA-B1 … CA-B4`, `CA-S1`.
  **None of them is the submission of the receipts.** `CA-B2` already starts at the finance
  officer's review screen. The traceability matrix §1.4 has no row for `5.9`/`5.10`, and they
  are **not** listed among the endpoints explicitly declared "no dedicated screen"
  (`5.4`, `5.5`, `5.6`, `5.7`, `5.8`, `5.14`, `5.15`).

**Why this is a hole and not a documented gap**

`5.9` is a step of the **main positive flow, performed by the employee** — the narrative of
§1.2 says so ("karyawan menyerahkan nota pertanggungjawaban"). The endpoints the FSD does
declare screen-less are all negative or secondary paths. So this is an omission in the frame
set, not a deliberate `G6` exclusion. Without it the prototype cannot demonstrate the chain
end to end: the settlement rows would exist without any actor having created them.

**What the build does**

- Row action **Submit settlement** in tab *All Request*, visible only when
  `status = APPROVED` and the advance has no settlement yet (dataset: `ADV-2026-000086`,
  Budi Santoso, Rp2.000.000, 24–26 Aug 2026).
- Modal `#submitStlModal` (`CA-B0`): read-only header (recipient, purpose, advance amount,
  travel dates) + repeatable receipt rows — `expense_date`, `receipt_no`, `amount`,
  attachment (`document_id`) — with the house add/remove affordances, a live
  surplus/shortfall projection, and a **Closing stage** toggle (`is_final_stage`).
- Submitting mirrors the contract: duplicate `receipt_no` is refused with
  `409 FIN_DUPLICATE_RECEIPT`; on success a `SUBMITTED` settlement appears in tab
  *Settlement*, feeding the existing `CA-B2` review → `CA-B3` decision → `CA-S1` differences.
- `5.10` is not a separate screen: the request Detail modal echoes the settlement summary.

**Document change requested**

1. Add `Cash Advance › CA-B0 — Serahkan Pertanggungjawaban (Create)` to the frame list in
   FSD §4, between `CA-A4` and `CA-B1`. Frame count `9 → 10`.
2. Add the component→data mapping rows for `emp_cash_advance_settlement.is_final_stage` and
   `emp_cash_advance_settlement_item.*`.
3. Add the traceability rows `CA-B0 → 5.9` and `CA-B0 (detail echo) → 5.10`, and remove
   `5.9`/`5.10` from the implicit orphan set.
4. FSD §8.4 screen count for Menu 4 updates from 9 to 10.

---

## Documented visual-coverage gaps (kept as gaps, per FSD)

| Endpoint | Subject | Where it is recorded in the build |
| :--- | :--- | :--- |
| `5.7` / `5.8` | Return-date change (`date-changes`) | Warning note in tab *All Request* — no screen, per FSD |
| `5.5` | Repudiation (`REPUDIATED`, GAP-8 exit path undecided) | Row action + toast narrating the open contract item |

## Endpoints the build prototypes although the FSD only narrates them

Additions, not deviations — no document change needed, listed for completeness:
`5.4` cancel (now behind a guard modal reflecting `409 FIN_ALREADY_DECIDED`), `5.6` travel
cancellation, `5.14` surplus return method, `5.15` extra approval layer for a large shortfall.

## Field-level fixes applied after review against the Figma screencaps

- `Maximum limit` is now a read-only field beside *Purpose type* (FSD `CA-A3` lists it as a
  component; it was previously only hint text).
- Per-receipt **Item Status** column (`emp_cash_advance_settlement_item.item_status`) shown in
  the review and decision tables, as in the Figma `CA-B2` screencap.
- Request detail modal surfaces `bank_account_snapshot`, `cost_center_id_snapshot`,
  `max_amount_snapshot` and the submission door — contract fields that had no place in the UI.
- Kept deliberately different from Figma: two separate travel-date fields (contract has
  `travel_start_date` + `travel_end_date`, the screencap shows one range field), English copy,
  and no empty "Ajukan" tab (the CTA lives in the page header).

---

## Finance Security (FT8 · Menu 6) — review vs FSD §6 / UIC §7 / Figma `KM-*`

**Documents win where they disagree with the Figma caps.** The screencaps are QA anchors with
annotation panels that are not UI; the frames themselves are thinner than the contract.

**Fixed in this pass**

- Column header `State` → **Status**, the name the FSD component map uses (`KM-A2`).
- Medical Access Log filters (`employee_id` + `accessed_at` **range**, UIC `F8.02`) were a
  label-and-container block with a single dead "Accessed from" field. Now a bare filter row
  above the table (house `.fin-tbar`), no labels, placeholders only, and the range is wired:
  **Accessed from / Accessed until**.
- Export Log gained the `downloaded_at` **range** filter that `F8.04` contracts (the only
  search field it has); *New export* moved into the same row, right-aligned.
- Dispute Hold filter row aligned to the same bare pattern; the "released rows stay as
  history" explanation moved to the hint under the table.
- Pagination (`.ph-foot`) added to all three grids — every one grows unbounded.
- `Idempotency-Key` on `POST /exports` now stated in the export form hint (it was only
  narrated for `POST /dispute-holds`).

**Kept different from the Figma caps, deliberately**

- Figma `KM-A2/B2` collapses the row action into a `…` menu and asks the reviewer to click the
  row to release. The build shows one text-only **Release** button in the frozen Action column —
  the house row-action standard for a single action.
- Figma `KM-S1`/`KM-S2` draw 3–4 columns. The build shows the full contract field set
  (`row_count`, `filter_criteria`, `document_id`, `claim_item_id`), which the FSD component
  maps list. Scope is a badge, per FSD ("Badge Scope").
- Figma `KM-A3` shows the Target as a plain readonly box; the build uses a searchable select,
  since the contract says the value is "filled after being picked from a search".
- Release modal is anchored on `PATCH /dispute-holds/{id}`, not `POST …/release` — per
  `PROB-FRONTEND-017`, the Figma anchor notation is the thing that is wrong.

**Left as contract-only, not surfaced in the UI**

- `claim_item_id` is a searchable field on `F8.02` but has no filter control: the grid already
  shows the claim item, and one-item lookup is not a working pattern for an audit board.
  Flagging rather than adding silently.

---

## ESS Finance (Menu 7b · `ESS-3/4/5`) — review vs FSD §7.2 / UIC §3–§6 / Figma `ESS-*`

**Documents win.** FSD §7.2 defines this page as a **3-tab composite READ-ONLY hub, zero new
endpoints** — Reimbursement · Reimbursement Taken · Loan. The build currently carries write
flows here that the FSD anchors on the Benefit Reimbursement page.

### MAJOR — claim submission is on the wrong page (write UI outside ESS scope)

- **Documents:** FSD §2.2 puts `+ New Claim` on `BR-A3` (Reimbursement Request Queue) → form
  `BR-A4` → toast `BR-A5`, all on the **Benefit Reimbursement** page. FSD §7.2.1 states
  explicitly that the ESS `+ Ajukan Klaim` button is **not wired to a new form on this page**
  (deliberate G4, the identical form is already prototyped at `BR-A4`/`BR-A5`).
- **Figma:** agrees with the documents — `ESS-3` is one grid + a CTA, with the QA note "form
  identik dengan Benefit Reimbursement › Reimbursement Request … tidak digambar ulang di sini".
- **Build:** the full claim form (`#claimForm`), the claim detail modal and the cancel modal
  live on `finance-ess.html`; the Benefit Reimbursement page has **no** `+ New Claim` and no
  `BR-A4`/`BR-A5` at all. So two deviations at once: `BR-A4`/`BR-A5` missing from their page,
  and ESS holding write UI it should not have.
- **Fix:** move `+ New Claim` + the form/toast + row Cancel (`UIC` §3.1 endpoint 10,
  `ROLE_EMPLOYEE†`) onto tab *All Request* of `finance-benefit-reimbursement.html`; on ESS the
  CTA becomes a link to that screen.

### MAJOR — ESS tab 1 carries elements the contract places elsewhere

- **Balance cards** on ESS = `BR-S1` Balance Overview, which already exists as its own tab on
  the Benefit Reimbursement page (FSD §2.3.5). Duplicated surface, not in the ESS frame set.
- **Beneficiaries sub-tab + Add beneficiary modal**: beneficiary management is listed under the
  **Benefit Reimbursement** menu actors (FSD §2.1, "kelola daftar penerima manfaat"), not in the
  five `ESS-*` frames. Figma `ESS-3` has no sub-tabs.
- **Fix:** drop both from ESS. Note the side finding below — the beneficiary endpoints have no
  frame anywhere in the FSD.

### Doc gap worth raising (not a build defect)

`UIC` §3.1 endpoints 3/4 (`POST /benefit-beneficiaries`, `PATCH /benefit-beneficiaries/{id}`)
are contracted for `ROLE_EMPLOYEE†` but the FSD 22-frame map for `FT2` contains **no screen**
for them, and they are not declared screen-less either. Same shape as the `CA-B0` hole above:
an omission in the frame set. Requested: add `BR-A6 — Daftar Penerima Manfaat` (grid + add +
deactivate) to FSD §2.2 and the traceability matrix.

### Kept as-is — build is more contract-faithful than Figma

- **`ESS-4` Reimbursement Taken stays empty** with the `PROB-FRONTEND-016` gap card. The Figma
  cap shows a populated grid (`CLM-2026-000045`, `BANK_TRANSFER`, 13 Jul 2026) sourced from
  `GET …/disbursements?employee_id={self}` — an endpoint that does not exist for
  `ROLE_EMPLOYEE`: all 12 `FT5` endpoints exclude that role (UIC §6.1, FSD §7.2.1 GAP).
- **No `DISPUTE HOLD` badge** on the ESS claim grid (Figma `ESS-3` draws one). Dispute state is
  only readable through `POST /dispute-holds/search` (UIC `F8.07`), finance/HR roles only.
- **No `Sisa Outstanding` column** on the ESS loan grid (Figma `ESS-5` draws one).
  `outstanding_amount` is `emp_outstanding_clearance` (`FT5`, zero employee access), not a
  `POST /loans/search` field.
- Figma's on-canvas QA annotation panels are not UI and are not reproduced.

### UX pass — Benefit Reimbursement, Loan, ESS (review round 2)

Contract-neutral changes; no endpoint, field or status was added or removed.

- **Reject is its own modal (`BR-B4`).** The reason select used to be an inline block the
  reviewer revealed by pressing *Reject* once — the button meant two things depending on
  state and the fields landed below the fold of a long claim. Rejecting is a short
  transactional decision, so it now follows the project's container rule: *Reject* in the
  review footer opens `#claimReject` with the claim summary, the similarity warning, the
  `reason_id` select, the note (promoted to **required** when the picked reason carries
  `requires_free_text`) and the acknowledgement checkbox. *Reject claim* stays disabled until
  the contract's own preconditions are met, and *Back to claim* returns to the review.
- **New-claim form tidied.** Beneficiary is now a radio pair (*Myself* / *Family member*) on
  its own full-width row, with the family select on the row below — the segmented control
  used to share a 2-column grid with a conditionally-visible select, which offset the whole
  block. Receipt count moved into the section head.
- **Why the form opens with one receipt** — `POST /benefit-claims` requires `items ✓ min 1`,
  so an empty receipt list can never be submitted. The single prefilled row is that minimum,
  not a cap; it is the only row that cannot be removed. Stated in the form hint.
- **Freeze columns removed** where the table has no identifier + action pair:
  Transaction History and Disbursement History (Benefit Reimbursement) and both My Finance
  grids. New opt-out class `.dtable-wrap--nofreeze` in `finance.css` — the grid still scrolls
  horizontally, it just drops the sticky tinted edges. Also applied to the two Settings
  sub-tables with no row action (Entitlement per Grade, Family Relationship Whitelist);
  Benefit Type keeps the freeze because it carries an Edit action. Grids that do have both
  columns (All Request, and every other finance grid) keep the freeze.
- **Rejection reasons translated to English.** `mst_rejection_reason` seed data was Bahasa
  Indonesia inside an all-English screen; harmless while it was a hidden inline block, but the
  dedicated reject modal makes it the focal content. Per the one-language-per-screen rule the
  seed now reads English (`js/finance-data.js`), as does the seeded dispute-hold release note.
  Names are seed data only — no contract field changed.
- **Beneficiary re-activation answered in the UI — as a hard \"no\", per the documents.**
  `PATCH /benefit-beneficiaries/{id}` lets `ROLE_EMPLOYEE†` set `is_active=false` **only**
  (UIC §3.3); the same endpoint grants *koreksi* — including `is_active=true`, a value
  `log_benefit_beneficiary_history.changed_field` explicitly records — to
  `ROLE_FINANCE_OFFICER`/`ROLE_SUPER_ADMIN`. Re-adding the relative is **not** a workaround:
  ERD `emp_benefit_beneficiary` carries
  `uq_emp_benefit_beneficiary_employee_id_period_id_relative_id`, one row per relative per
  period, so a second `POST` collides. An inactive row therefore shows a **disabled** action
  and the tab hint names the only two exits: a finance-officer correction, or the next period.
  (An earlier draft of this pass shipped a *Re-register* action that wrote a duplicate row —
  it violated that unique key and has been removed.) The picker reads
  `employee_profile.mst_relative` and hides any relative that already holds a row in the
  period, which is the same constraint expressed as a control.
- **Loan `DECLINE` verified against the contract, kept.** `F3.07`
  `POST .../schedule-acknowledgements` carries `outcome: ACK | DECLINE`; `DECLINE` releases the
  reservation and writes `loan_status = DECLINED_BY_EMPLOYEE` (`LN-C2` decline branch). It is
  **not** the same thing as *Cancel* (applicant, `SUBMITTED` only) or *Withdraw*
  (`AWAITING_CALCULATION` past its threshold), so it was not renamed. The acknowledgement
  modal now states the enum, the resulting status and the `422
  FIN_LOAN_NOT_AWAITING_ACKNOWLEDGEMENT` guard so the three exits cannot be confused again.

### MINOR — labels

- Tab and sidebar item read **Reimbursement Request**; FSD/SAD name the tab and the menu row
  **Reimbursement** (`ESS-3`). Rename both.
- Page title **My Finance** vs Figma "Finance — Punya Saya" — kept English per project standard.
