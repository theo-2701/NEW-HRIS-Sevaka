# SEVAKA HRIS — Project standards

Persistent conventions for this project. Follow them on every page so I don't have to re-request.

## Documents are the source of truth
- Build to the **FSD** (functional) + **UIC** (UI contract) in `uploads/`. Fields, statuses, and flows must match the contract.
- Figma screenshots are a **secondary reference** for layout ideas, not for data shape. When Figma adds fields outside the contract, flag them — don't silently add. When Figma is more contract-faithful than my build, fix my build.
- When something differs from Figma but is functionally equivalent, keep it and explain why rather than blindly matching.

## Modal standard (all `.ovl` modals)
Defined once in `css/employee-flows.css` + auto-wired by `js/flow-common.js` (`standardizeModals()`), so no per-page markup work is needed:
- **Fixed tinted header bar** (`--color-primary-50`) with title + description + X, divider under.
- **Only the body scrolls** — content wrapped in `.ovl__body` (`overflow-y:auto`); the panel itself is `overflow:hidden` so corners stay rounded and the scrollbar sits inside, never over the corner.
- **Fixed mist footer** with divider above.
- **Footer buttons: when there are 2, they sit together, right-aligned, bottom-right** (`.ovl__foot`, `justify-content:flex-end`). Do NOT use `--split` / space-between for a 2-button footer.

## Button icons
- **No icons on buttons** by default. A button gets an icon only in two cases: (1) it opens a **dropdown** → trailing **caret** only (`chevron-down`), no other icon; (2) an **"Add …" button inside a form** → leading `+`. Everything else (page-level actions, modal footer buttons, table row-action buttons like View Detail / Review / Submit / Process) is **text-only**.
- Icon-only affordances that are their whole purpose stay (e.g. the DS "remove row" ghost `×`/trash).
- Dropdown **menu items** inside an open `.rowmenu`/`.menu` popup may keep leading icons — that's a menu, not a button.

## Row action standard (tables)
- **1 action** → a single visible inline button (`.rowbtn`, `.rowbtn--ghost`, `.rowbtn--danger`) in a right-aligned `.rowacts` group. Never plain text or a bare "—"; a disabled state uses a disabled `.rowbtn`.
- **2 or more actions** → collapse into a single **"Action ▾" dropdown** via `F.rowMenu([{label,icon,attr,href,danger}])` (in `flow-common.js`). Open/close is delegated globally. Example: Review + View Detail, or Submit / Edit / Delete.
- Identifier column frozen left, Action column frozen right (per `table-standard.css`), so Action stays visible on horizontal overflow. **The Action column header is left blank** (no "Action" label text).
- In-table detail buttons use the **"View Detail"** label (text-only, no icon), matching the "Review" button shape.

## Tables
- **Freeze columns only when there is an Action column.** A table with no row actions (version history, batch task list, recipient picker, read-only audit grids, anything inside a modal) uses **`.dtable-wrap .dtable-wrap--plain`** (`css/document.css`) — it scrolls horizontally when the content is wider than the panel but pins nothing. Careful: bare `.dtable-wrap` is `overflow:hidden` (clips the last column) and `--scroll` freezes first/last in `finance.css`, so "no freeze" means `--plain`, not "drop `--scroll`". Freezing is there to keep the Action column reachable, nothing else.
- **Pagination** uses the house `.ph-foot` footer (`css/pagination-standard.css`): "Showing x–y of n" + rows/page select on the left, prev ‹ / page box / "of N" / next › on the right — the same block the `company-*` pages already ship. Mount it as `<div class="ph-foot" id="…"></div>` right after the `.dtable-wrap` and drive it with `F.pager(mountId, size, redraw, noun)` in `flow-common.js`. Do not hand-roll pager markup and do not use the DS `.pagination` block — `.ph-foot` is the standard in this build.
- Every grid that grows unbounded gets pagination; small fixed lists (beneficiaries, entitlement matrix, whitelists) do not.
- Never stack two tables in one panel. Use segmented sub-tabs (`.subtabs` wrapper + a `.seg` / `.seg__btn[data-sub]` control, wired by `flow-common.js`) so exactly one table is on screen — the same segmented component as the Directory/Organization toggle, never a second pill style.

## Table toolbar: filters left, search right
- **Filters sit at the top-left of the table, search at the top-right** (`.doc-tbar` + `.doc-tbar__sp` spacer).
- **≤ 2 filters → inline controls**, no Filter modal. **> 2 filters → one "Filter" button** opening the filter modal, with the `.doc-fsum` applied-filter summary next to it.

## Container choice: modal vs full-page (hybrid)
- Short transactional actions (approve, cancel, PTKP adjust, single-decision forms) → **modal**.
- Long multi-stage lifecycle processes (New Joiner, Transition) → **full-page + stepper** is preferred when the modal gets heavy. Current modal builds are acceptable to keep; convert to full-page only if a flow becomes too heavy for a modal.

## Draft-first maker/checker flows
- Where the contract lists a **DRAFT** first state (requisitions, new joiner, plans), the create form saves as **DRAFT** ("Save as draft") and a separate **Submit** action moves it to the approval state. Don't skip DRAFT.
- Show initial status as a disabled field where the contract fixes it to DRAFT.

## Links & hyperlinks
- Clickable names/identifiers in tables use `--fg-link` (blue), no underline at rest, underline on hover.

## Language
- App surfaces default to one language per screen; the build is currently **English** throughout for consistency. (DS guide default is Bahasa Indonesia — revisit only if the user asks to switch the whole app.)
