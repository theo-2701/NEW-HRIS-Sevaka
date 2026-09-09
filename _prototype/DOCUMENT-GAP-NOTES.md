# Document Service — build notes & GAP register

Built from `uploads/FSD-001-DOCUMENT-0.1.md` (screens) + `uploads/UIC-001-DOCUMENT-0.1.md`
(contract). 9 menus + 1 public page, all 61 documented screens reachable as states.

## Files

| Page | Screens (FSD) | Addresses |
| :--- | :--- | :--- |
| `document-company-files.html` | §1 `S0`–`S3` | `A3` `A4` `A2` `A16` |
| `document-employee-files.html` | §2 `EF-0`–`EF-4` | + employee picker (employee-service) |
| `document-other-files.html` | §3 `S0`–`S3` | + `owner_object_kind` filters |
| `document-templates.html` | §4 `S0`–`S6`, `S1b/S1c/S2b/S2c` | `A8a` `A8e` `A8b` `A8c` `A8d` `A9` |
| `document-letter-issuance.html` | §5 `S0`–`S7` | `A15` `A10` `A12` `A13a` `A13b` `A13c` `A14` |
| `document-ess-files.html` | §6 `S0`–`S4b` | `A3` `A4` `A2` `A16` `A15` `A10` (self path) |
| `document-categories.html` | §7 `S1`–`S6` + `S1b..S1g` | `A6a` `A6b` `A6c` `A6d` `A7` |
| `document-access-log.html` | §8 `S1` (`JA-1..3`) | `A5` |
| `document-verify.html` | §9 `S1`–`S5` | `C2a` `C2b` `C2c` (Regime C, no shell, no token) |

Shared: `js/document-data.js` (dataset), `js/document-files.js` (one grid/detail/content
engine for the four catalogue screens), `css/document.css` (unique bits only).

## Contract shapes made visible on screen

- `A3`/`A4` write **nothing** — not even an access trail. Only `A2` writes a
  `log_document_access` row, committed before the first byte.
- `A2` panel shows the real response headers (`no-store`, `nosniff`, `inline`) and states
  `PROB-FRONTEND-029` (header-only; never a plain `<img src>`/`<a href>`).
- Class `SENSITIF` ⇒ in-app viewer; `BIASA` ⇒ browser viewer is legitimate.
- `A10` answers `201` on **both** branches; the panel shows the two payload shapes.
- `A11`/`A12` execute from the `A4` letter block (Company/Employee/Other Files), and are
  only demonstrated on Letter Issuance.
- Category tightening vs loosening are two separate modals — `200` immediate vs `200`
  proposal carrying the values still in force; a second proposal is `409`.
- `A7` on a `SENSITIF` category: button disabled **and** the `403` message stated.
- Access trail keeps both row shapes (`PER_PEMBUKAAN` / `PER_PERMINTAAN`) unflattened.
- Public verification: one Verify button, five causes landing on one blind `matched:false`,
  zero `404`, cancellation reason never shown.

## GAP / debt shown on the pages as-is (never patched over)

`PROB-SERVICE-356` (Letter Issuance has no menu row) · `PROB-SERVICE-407` (Category
Settings + Access Trail have no menu row) · `PROB-FRONTEND-045` (Category filter not drawn
on Figma `EF-2`) · `PROB-SERVICE-406` category side CLOSE, visual debt on Other Files ·
`PROB-SERVICE-433` (rejection reason unreadable) · `PROB-SECURITY-092`
(`acknowledged_impact_count` not recounted) · `PROB-INFRA-047` (`source_ip` is not the
accessor) · `PROB-SECURITY-091` / `-086` (reading the trail leaves no trail; refused reads
unrecorded) · `PROB-SERVICE-434` (no threshold address for `flagged_unreasonable`) ·
`PROB-SERVICE-402` (granularity after `K4` undecided) · `PROB-SERVICE-342` (no `Document`
column in the STD permission matrix).

Sidebar: the three menu-less screens are still routed under `Company Management › Files`
so the prototype is navigable — each one opens with the `PROB-` banner that says it cannot
be reached through the real HRIS menu yet.

## Menu tree — what the documents actually say

- `Company Management › Files` holds **exactly four** rows: Company Files, Employee Files,
  Other Files, **Document Templates** (FSD §1 states Company Files is “Sub Menu ke-1 dari 4”,
  and FSD §4 puts Document Templates under the same group). The pre-existing
  `Productivity › Document Templates` placeholder in `js/shell.js` is **not** from the
  Document docs — flagged, left unrouted, needs a principal decision if the two are the
  same thing.
- **Letter Issuance** (`PROB-SERVICE-356`), **Category Settings** and **Document Access
  Trail** (`PROB-SERVICE-407`) have **no menu row at all** in the contract. They now sit in
  a prototype-only sidebar section named “Document — no menu row yet”, which is a holding
  area, **not** a menu proposal.
- **Public Letter Verification** is permanently menu-less by design (`DOC-80`): it is reached
  by typing the address on the official domain, or through the QR code on a printed letter.
  It is listed in the same holding section purely so the prototype is navigable.

## Gap audit — 20 Aug 2026 (build vs FSD §1–§4 vs Figma/reference frames)

Scope: Company Files · Employee Files · Other Files · Document Templates.

**Fixed in this pass**

1. **Other Files — "Object" filter was dead.** `#docObject` existed in the filter modal but
   was never wired, and its options carried display names instead of ids. Now wired to
   `owner_id` (`A3` body, optional per FSD §3.2) with real uuids.
2. **Employee Files — `EF-1` was a modal that auto-opened on load.** The FSD makes the
   employee pick a *screen* (`EF-1`) preceding the grid (`EF-2`), and a modal that opens
   itself over an empty table is poor UX. `EF-1` is now an in-page step (searchable
   NIK/Name/Department list); picking swaps to `EF-2`, and the context strip's
   **Change employee** returns to step 1.
3. **Filter UX was inconsistent across the three catalogue screens.** Employee Files put
   Category + date range inline while Company/Other Files used the house Filter modal.
   All three now use the Filter modal + filter summary.
4. **Templates `S4` (new draft version) did not say what would be born.** Now states the
   version number and that the version in force keeps issuing until approval, and
   pre-fills the body with the text in force — the contract requires a whole body, not a
   patch, so starting from blank invited a partial re-write.
5. **Templates `S5` (two-hands decision) hid the author.** The decider judged a body with
   no idea who submitted it, while "reviewer ≠ author" is exactly what the gate enforces.
   Added the two-hands block (author + NIK + submitted time · decider + role).
6. Stray unbalanced `</div>` on Employee Files and Other Files.

**Differences kept deliberately (not defects)**

- Filter modal instead of the inline toolbar controls drawn on the Figma frames — house
  standard in this build; every criterion still travels in the `A3` body.
- Row actions collapse into one **Action ▾** dropdown (project row-action standard) rather
  than the frames' bare `D` / `V` / `+` / `X` icon buttons; labels are spelled out
  (View Detail · Open File Content · New draft version · Deactivate).
- `A9` decision uses one radio + Submit rather than two footer buttons, so the
  "reason required only when DITOLAK" rule is visible before committing.
- Employee Files keeps the **Storage** column and a created-date range (contract-supported,
  absent from the frame); the **Origin** column stays dropped per FSD §2.2.
- Templates grid keeps a **Self-Requestable** column beyond the five FSD §4.2 columns —
  it is a contract field and the reference frame draws it.
- Language stays English throughout, per project standard (frames are Bahasa Indonesia).

**Still open — needs a principal decision, not a design fix**

`PROB-SERVICE-407` / `-356` menu rows · `PROB-FRONTEND-045` (category filter undrawn on
`EF-2`) · `PROB-SERVICE-406` visual debt on Other Files · `PROB-SERVICE-433` (rejection
reason unreadable) · no "reactivate template" address.

## Gap audit — 21 Aug 2026 (build vs FSD §5 · §7 · §8 · §9 vs Figma frames)

Scope: Letter Issuance · Category Settings · Document Access Trail · Public Letter Verification.

**Fixed in this pass**

1. **Batch state filter could not do what its own hint promised.** `batch_state` is an array in
   `A13c`; the control was a single select. Now a 5-value checkbox group (`batch_state[]`),
   summarised in the filter chip. `flow-common.js` `paintFilterSums()` learned to summarise
   checkbox criteria, so the Access Trail "flagged only" flag now shows in its chip too.
2. **`S4b` and `S4c` had no terminal.** Submitting a batch only toasted; the grid never grew a
   `MENUNGGU_PERSETUJUAN` row, and a decision never moved a badge. Submitting now inserts the
   real row, and `A14` moves it `DISETUJUI → BERJALAN → SELESAI` (worker simulated) or to
   `DITOLAK` with its task list emptied — the FSD's terminal frames are now visible states.
3. **Batch report showed a truncated `letter_id` instead of the letter number.** The reference
   frame prints `003/HRD/VIII/2026`; `letter_no` added to the succeeded tasks in the dataset and
   the column relabelled **Letter No**.
4. **Greyed fields in the Issue modal did not say why they were greyed.** Subject / Recipient
   branch now state "not applicable, this template is a circular / targets one person", matching
   the frame instead of only fading. Template options carry the frozen draft version
   (`… — draft v2`), as the frames do.
5. **Mass modal had no live recipient count.** Now states how many are selected and that
   submitting under two answers `422` — before the click, not after.
6. **Access Trail was missing the `document_count` column** (FSD §8.2 / frame column 5) and had
   **`source_ip` as a column**, which the FSD keeps as a *panel* only (§8.5). Count added,
   `source_ip` moved wholly into the honest-limits panel (one value for the whole dataset, zero
   power to tell people apart). Owner openings now carry an **owner** chip on the actor, as the
   frame draws it, instead of a caption in the Document cell.
7. **`JA-2` was prose, not the comparison table** the FSD names ("tabel banding"). Now a real
   4-column table (value · when written · fields filled · shape on screen).
8. **Loosening proposal discarded the typed value.** The decision card and the applied result
   hardcoded 730 days; the proposed number is now carried through `A6c → A6d`, and an empty
   proposal answers `422`.
9. **`C2c` could not exercise the EDARAN cause.** A circular letter was added to the dataset
   (illustrative, flagged) and the number path now lands it on the blind `matched:false`, which
   is the fourth of the five documented causes.

**Differences kept deliberately (not defects)**

- Landing page keeps the page-head actions + explanatory panels instead of the frames' three
  CTA cards; same five capabilities, less scrolling, and it matches every other page here.
- Row actions collapse into **Action ▾** (Review · View Detail) rather than the frames' inline
  `Laporan` / `Ubah` / `Pembaca` buttons — project row-action standard.
- Category `SENSITIF` keeps **Reader roles** reachable and refuses on submit with the stated
  `403`, rather than the frame's pre-disabled "Pembaca — terkunci" button: the reason is only
  legible once the modal explains it.
- "Show deactivated" is a select, not a switch (house filter vocabulary).
- Language stays English throughout (frames are Bahasa Indonesia).

**Still open — needs a principal decision, not a design fix**

`PROB-SERVICE-356` / `-407` menu rows · `PROB-SECURITY-092` (impact count not recounted) ·
`PROB-INFRA-047` + `PROB-SECURITY-091` / `-086` (trail blind spots) · `PROB-SERVICE-434`
(no threshold address for `flagged_unreasonable`) · `PROB-SERVICE-402` (granularity after `K4`).

## Illustrative values (not in the FSD dataset — flagged, not smuggled)

1. **`Kontrak Vendor` category markers** (retention 1825 days, max size, MIME list,
   reader roles) — the UIC only exemplifies `Surat Keterangan Kerja`, `Surat Dokter` and
   `Berkas Serah Terima Aset`. Flagged with `illustrative:true` in `document-data.js`.
2. **`BATCH-3`** (MENUNGGU_PERSETUJUAN, 2 recipients) — added so the `A14` decision path
   can be exercised; the dataset's own batches are already SELESAI and DITOLAK.
3. Branch / object picker labels on Other Files and Letter Issuance come from the existing
   company dataset in this prototype (company-service pickers), not from the Document docs.
4. **`010/HRD/VIII/2026`, an `EDARAN` letter** — added so the public verification page can
   demonstrate the "number belongs to a circular" cause. Flagged `illustrative:true`.
