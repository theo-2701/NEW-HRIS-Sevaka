# Gap Analysis — Assets, Asset Detail & Disposal

Contract source of truth: `FSD-001-COMPANY-0.1.md` §7–9 + `UIC-001-COMPANY-0.1.md` §3.
Build reviewed: `company-assets.html`, `company-asset-detail.html`, `company-disposal.html`.
Date: 19 Jul 2026.

Legend: 🔴 must-fix (contract field/flow missing) · 🟡 minor/optional (○ field, polish) · 🔵 Figma cross-check pending · ✅ matches.

---

## 0. Resolution log (20 Jul 2026) — edits applied
All fixes are **document-driven** (FSD §7–9 / UIC §3); Figma used only as reference.
- ✅ **Assets** — added `Handover` column to Asset List grid (FSD §7.2). Register: added LEASED **lease-contract document** upload (A6) + optional contract fields `description`, `current_location`, `manufacture_year`, optional `vendor` (OWNED), optional initial-condition photo.
- ✅ **Asset Detail** — added **Lease** action + modal (D8: amount/start/end/contract + vendor required, per UIC `/leases`). Maintenance modal gained **Vendor** (optional, "blank if internal") + **Completion date** + hint on next-date shift. Assign gained **condition photo + note** (UIC `photo1`/`photo1_note`). Return gained **is_complete toggle** + **condition photo + note** (UIC return body).
- ✅ **Disposal** — external sub-form `email`/`phone` marked required; impact note now switches to a **non-terminal / may-return-to-AVAILABLE** message for AUCTION (§9).
- ⚑ **Transfer — deliberately NOT changed.** UIC `/transfer` body is only `{to_branch_id, reason}`; the build's branch-move + 2-event visual is already contract-faithful. Figma's second "Pindah pemegang (A→B)" employee-to-employee type is **outside the contract** — flagged here, not added, per doc-first rule. Raise with the contract owner if the employee-holder transfer should become a real endpoint.

---

## 1. Asset List / Register — `company-assets.html`

### Register form (`mst_asset`) — field coverage vs UIC §3.2
| Contract field | Req | In build? | Note |
|---|---|---|---|
| asset_code | ✓ immutable, unik→409 | ✅ | |
| asset_name | ✓ | ✅ | |
| serial_number | ○ | ✅ | |
| asset_category_id | status-rule | ✅ | |
| branch_id | status-rule | ✅ | |
| ownership_type OWNED/LEASED | ✓ | ✅ segmented, 2 branches | |
| purchase_price / purchase_invoice_number (OWNED) | MbV | ✅ | |
| Invoice document file (OWNED) | ✓ (FSD A5 "file") | ✅ | |
| lease_amount / start / end / contract_number (LEASED) | MbV | ✅ | |
| vendor_id (LEASED) | ✓ | ✅ | |
| **Lease contract document file (LEASED)** | FSD A6 "+ file kontrak" | 🔴 **MISSING** | OWNED has invoice upload; LEASED block has no contract-file upload. Add to match A6. |
| **description** | ○ | 🟡 missing | UIC lists `description`(○). Add optional textarea. |
| **current_location** | ○ | 🟡 missing | In UIC POST example. |
| **manufacture_year** | ○ | 🟡 missing | In UIC POST example. |
| **photo1 / photo2 (+notes)** | ○ | 🟡 missing | UIC returns `photo1_url`; register example has photos. |
| vendor_id (OWNED) | ○ | 🟡 missing | UIC OWNED example includes `vendor_id`; only LEASED exposes vendor in build. Add optional vendor to OWNED. |
| Purchase Date GAP proxy (created_at, read-only + banner) | GAP | ✅ | Correctly built as disabled proxy w/ GAP callout. |

### Status & list grid
- ✅ NOT_AVAILABLE blocker note on empty branch/category (A7) present.
- ✅ Status legend modal — 9 `last_asset_status` values, INCOMPLETE ≠ NOT_AVAILABLE callout (A2). Verify JS renders all 9: AVAILABLE, ASSIGNED, INCOMPLETE, NOT_AVAILABLE, AUCTION, SOLD, ACCIDENTALLY_LOST, GRANTED, EMPLOYEE_NEGLIGENCE.
- ✅ Assigned Assets tab = ASSIGNED ∪ INCOMPLETE (A3).
- 🟡 **Handover badge** (`current_handover_status` NONE/GIVING/RECEIVE) — contract §7.2 lists it as a grid badge; list grid shows only Status, no Handover column. Add or confirm intentionally dropped.

---

## 2. Asset Detail & Lifecycle — `company-asset-detail.html`

### Lifecycle actions (hero) vs FSD §8.1 (D4–D9)
| Action | Screen | In build? | Note |
|---|---|---|---|
| Assign (GIVING) | D4 | ✅ | |
| Return (RECEIVE) | D5 | ✅ | |
| Transfer (2-event) | D6 | ✅ timeline RECEIVE→GIVING | |
| Maintenance | D7 | ✅ | see field gaps below |
| **Lease** | D8 | 🔴 **MISSING action + modal** | Contract: Lease action on LEASED assets, vendor mandatory (`log_asset_lease`). No button/modal in build. |
| Residual | D9 | ✅ | |

### Modal field gaps
- **Assign (D4):** ✅ employee, location, notes, is_complete toggle (true→ASSIGNED / false→INCOMPLETE). 🟡 missing `photo1`+`photo1_note` (UIC assign body).
- **Return (D5):** ✅ 3-branch condition (Available / Accidentally lost / Employee negligence), employee link cleared. 🟡 missing `is_complete` + `photo1` (UIC return body).
- **Maintenance (D7):** ✅ type SCHEDULED/UNSCHEDULED, date, cost, description. 🔴 **missing `vendor_id`** — the Maintenance Log table has a Vendor column but the modal has no vendor field (inconsistent). 🟡 missing `completion_date` capture (UIC: SCHEDULED + completion_date → shifts `next_maintenance_date`); build states the rule but doesn't collect the date.
- **Transfer (D6):** ✅ destination branch + reason + 2-event visual.
- **Residual (D9):** ✅ residual_value only.
- **Hero badges:** ✅ status + handover status + category/branch/ownership meta.

---

## 3. Disposal — `company-disposal.html`

vs FSD §9 / UIC §3.3 (`/dispose`, `log_asset_disposal`):
- ✅ disposal_type segmented SOLD / AUCTION / GRANTED.
- ✅ Nominal shown only for SOLD (`disposal_nominal`).
- ✅ `is_employee` toggle (MbV) driving two sub-forms.
- ✅ Employee sub-form (employee_id) vs External sub-form (full_name, id_card, email, phone).
- ✅ Only AVAILABLE assets selectable; impact note explains terminality + auction reversibility.
- 🟡 Confirm the result-status mapping in the impact note/table: SOLD→SOLD, GRANTED→GRANTED (terminal), AUCTION→AUCTION (violet, **non-terminal**, may return AVAILABLE). Impact copy is right; make sure the list `Result Status` column and JS emit AUCTION (not a terminal) for auctions.
- 🟡 External sub-form marks `email`/`phone` optional while `full_name`/`id_card` required — contract says "field wajib berbeda"; acceptable, confirm which are mandatory.

---

## 4. Summary — must-fix (🔴)
1. **LEASED register**: add lease **contract document** file upload (FSD A6).
2. **Asset Detail**: add **Lease** lifecycle action + modal (D8; LEASED only, vendor required).
3. **Maintenance modal**: add **Vendor** field (table already has the column; UIC body has `vendor_id`).

## 5. Should-consider (🟡)
- Register optional fields: `description`, `current_location`, `manufacture_year`, `vendor_id` (OWNED), photo1/photo2 — all ○ in UIC but present in the POST contract.
- Handover-status badge on the list grid.
- Assign/Return photo capture + Return `is_complete`; Maintenance `completion_date`.

## 6. Figma visual cross-check — ✅ DONE
Frames located in the `pasted-1784472*` batch: Asset List (`…587026/600449/634484`), Register LEASED A6 (`…614084`), D1–D9 detail/lifecycle board (`…628233`), Assign D4 (`…653982`), Transfer D6 + Maintenance D7 (`…698774`), Disposal P1–P3 (`…552981`) + Disposal form/result (`…728076`).

**Confirmed against Figma (all match my contract findings):**
- **Asset List grid has a `Handover` column** (values GIVING / NONE) — Figma shows Kode · Nama Aset · Branch · Ownership · Status · **Handover**. Build omits it → promote §1 handover note to 🔴.
- **D8 Lease frame exists** in Figma (`File kontrak * — kontrak-ise-2026-01.pdf`, Nominal sewa, No. kontrak, Mulai/Akhir sewa) → confirms must-fix #2 (Lease action missing in build) AND must-fix #1 (lease contract file upload).
- **D7 Maintenance has `Vendor` field** ("Kosongkan jika dikerjakan internal") + `Tanggal selesai` (completion) → confirms must-fix #3 and the completion-date gap.
- **D4 Assign has `Foto kondisi serah *`** (mandatory photo) → confirms Assign photo gap. Note Figma's Assign uses `Lokasi serah` (location) — no free-text notes field; align build labels.
- **Disposal** (P1–P3 + form/result): matches build. Bukti = Foto + Dokumen mandatory; result screen shows `AVAILABLE → SOLD` transition, AUCTION labelled "belum terminal". Build is contract-faithful here.

**NEW gaps surfaced by Figma (not obvious from FSD text):**
- 🔴 **Transfer (D6) has TWO transfer types**: `Pindah pemegang (A→B)` — employee→employee, modelled as 2-event RECEIVE→GIVING — **and** `Pindah branch`. The build's Transfer modal only does the branch move + reason; the employee-to-employee holder transfer (the *primary* option in Figma, with Dari-employee / Kondisi kembali / Ke-employee / Lokasi serah) appears missing. Verify and add.
- 🟡 **Register LEASED (A6)** field order in Figma: Asset Code → Name → Kategori → Branch → Ownership toggle → **Blok Sewa** (Vendor* → Lease Amount* → Lease Contract Number* → Lease Start Date* → …). Build groups similarly; just confirm Vendor sits *inside* the LEASED block as mandatory (Figma marks it `wajib`).
- 🟡 Asset List header copy: Figma = "10 aset terdaftar · 9 nilai status & 2 tipe kepemilikan (OWNED/LEASED)" and "Menampilkan 5 dari 10 aset (sampel representatif…)". Cosmetic — align if you want parity.

**Updated must-fix list (🔴):**
1. LEASED register — lease **contract document** upload (FSD A6 / Figma D8).
2. Asset Detail — **Lease** lifecycle action + modal (Figma D8; LEASED only, vendor + contract file required).
3. Maintenance modal — **Vendor** field + **completion date** (Figma D7).
4. Transfer modal — add **"Pindah pemegang (A→B)"** employee-to-employee type alongside the existing branch move (Figma D6).
5. Asset List grid — add **Handover** column (Figma).
6. Assign/Return modals — mandatory **condition photo** capture (Figma D4/D5).
