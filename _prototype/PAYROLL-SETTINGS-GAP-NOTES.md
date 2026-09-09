# Payroll › Salary Settings — gap check (design vs document vs Figma)

Documents: `TSD-001-PAYROLL-0.3` §15.1 · `ERD-001-PAYROLL-0.2` §6.1–6.4 · `UIC-001-PAYROLL-0.2`.
Screens: `payroll-doc-settings.html` (maker side) + `payroll-doc-authorization.html` (checker side).

## Closed in this pass (document wins)

1. **Bulk batch had no DRAFT lifecycle.** The grid showed one already-submitted batch only. Added the full contract path: create DRAFT → add member (`POST …/items`) → remove member (`DELETE …/items/{itemId}`, hard-delete allowed only while DRAFT) → **Lock & submit** (`POST …/submit`, freezes `impact_summary`, computes `requires_escalation`) → delete draft (`DELETE …/{id}`, refused once out of DRAFT). Empty batch submit is refused (`422`).
2. **Escalation was a maker choice.** The create-batch form offered an "escalation approver" picker. The contract computes `requires_escalation` at submit from member count vs `payroll.bulk_change_escalation_count` (=5) and only then binds `escalation_approver_id`. Picker removed; the rule is stated in the form and evaluated in the submit dialog.
3. **Anti-stack scope was wrong.** The individual proposal refused a second row per *employee*; the contract refuses per *(employee, component)* pair. Fixed.
4. **UMP attestation gate was missing.** `PY-13` §3 requires the `PENETAPAN_ATAU_PERUBAHAN` check to be answered before a below-UMP proposal may continue. The propose-value modal now compares the salary base after the change (basic + all `is_fixed` components) against the branch UMP, and when it falls below it demands a reason from the closed 4-value list (`USAHA_MIKRO_KECIL` · `PESERTA_PEMAGANGAN` · `PEKERJA_PARUH_WAKTU` · `LAINNYA`), with the note mandatory for `LAINNYA`. Submitting writes the attestation row, so the log tab shows the trace.
5. **`is_overtime_basis` was a plain toggle.** It is optional in the contract and derived from `is_fixed` when omitted. The toggle now follows "tetap" until it is touched, and the hint says which of the two happened.
6. **Wrong effective-date copy.** "First day of the month after approval" → "start of the next payroll period, computed by the system, never sent by the client".
7. **Missing standards.** Batch grid + UMP log grid got the house `.ph-foot` pager, batch status filter and check-point / below-UMP filters. DRAFT rows use the "Action ▾" dropdown, submitted rows a single text-only "View Detail".

## Kept, deliberately different from the Figma screenshots

- **Decisions stay in Authorization & Handover.** The screenshots put "Antrian Usulan Individual", "Putuskan Usulan Sifat/Nilai/Kumpulan" inside Setelan Gaji. The contract assigns those endpoints to `ROLE_HR_MANAGER` in the *Otorisasi & Penyerahan* menu, and maker ≠ checker is the whole control. Salary Settings proposes; Authorization decides.
- **English surface** per project standard (screenshots are Bahasa Indonesia); the contract vocabulary — `AKTIF`, `MENUNGGU_PERSETUJUAN`, tetap / basis lembur / kena pajak / kena BPJS, error codes — is kept verbatim.
- **No raw column names or error codes as body copy.** The screenshots print `component_name ≤150`, `proposed_is_overtime_basis=true`, `403 PAY_MAKER_CHECKER_VIOLATION` as helper text on the form. Those rules are expressed as behaviour (disabled fields, computed values, refusals as toasts) instead.

## Open / flagged

- **"Employees using" column** on the catalog grid is not in the `salary-components/search` response contract. Kept because the delete rule (`PAY_COMPONENT_IN_USE`) is otherwise invisible before the user tries — needs either a contract field or a per-row lookup.
- **`batch_name` is optional** in the contract; the form still requires it (a nameless batch is unusable in a queue). Say the word and it becomes optional with a generated label.
- **Trait filters** (`is_fixed`/`is_taxable`/`is_bpjs_deductible`) exist in the search body but are not exposed — the catalog is small enough that search + state filter cover it.
