# Peta Konversi: kelas prototype → komponen React

Tabel rujukan saat mengonversi sebuah halaman HTML. Kolom kiri adalah kelas CSS di
`_prototype/css/*`, kolom kanan padanannya di repo ini. **Jangan membuat komponen
baru kalau padanannya sudah ada.**

## Shell & halaman

| Prototype | React |
|---|---|
| `.app` / `.app__body` / `.app__scroll` | `src/layouts/AppLayout.tsx` |
| `.topnav`, `.brand`, `.product-picker`, `.user-chip` | `src/layouts/Topnav.tsx` |
| `.sidebar`, `.sb-section`, `.sb-row`, `.company-switcher` | `src/layouts/Sidebar.tsx` |
| `NAV` / `ROUTES` (`js/shell.js`) | `src/config/nav.ts` |
| `.auth-stage`, `.auth-card`, `.auth-footer` | `src/layouts/AuthLayout.tsx` |
| `.pg-shell`, `.pg-shell__head`, `.pg-shell__body` | `<PageShell>` |
| `.crumbs`, `.crumbs__item` | `<Breadcrumbs>` (di `PageShell.tsx`) |
| `.card`, `.card__head`, `.card__title` | `<Card>`, `<CardHead>` |
| `.stat__label` / `.stat__value` / `.stat__delta` | `<StatCard>` |
| `.hero` / `.dash-hero` | `src/features/dashboard/components/DashboardHero.tsx` |

## Data & tabel

| Prototype | React |
|---|---|
| `.dtable`, `.pp-table`, `.emp-table`, `.ph-table` + `table-standard.css` | `<DataTable>` (freeze otomatis saat prop `actions` diisi) |
| `.table-row-id` | `<CellIdentity>` |
| `.ph-foot` + `F.pager()` (`js/flow-common.js`) | `<Pagination>` |
| `.doc-tbar`, `.doc-tbar__sp`, `.doc-fsum` | `<TableToolbar>` |
| `.rowbtn`, `.rowbtn--ghost`, `.rowbtn--danger` | `<RowButton variant="default \| ghost \| danger">` |
| `F.rowMenu([...])` / `.rowmenu` | `<RowActions actions={[...]}>` |
| `.subtabs` + `.seg` / `.seg__btn` | `<Segmented>` |
| `.chip--ok/warn/err/info/mute/brand`, `.sb--*` | `<StatusBadge tone>` + `toneForStatus()` |
| empty state | `<EmptyState>` |

## Form & kontrol

| Prototype | React |
|---|---|
| `.field` + `.field__label` + `.field__input` | `<TextField>` / `<FormField>` + `<Input>` |
| `.field--pw` + `.field__eye` | `<PasswordField>` |
| `.ctl--select` | `<SelectField>` / `<Select>` |
| `.ctl--date` + `.dp` (date picker) | `<DateField>` + `<Calendar>` (komponen rumah baru) |
| `.checkbox` + `.checkbox__box` | `<Checkbox>` |
| `.btn--primary/secondary/danger/ghost/light` | `<Button variant>` |
| `.tabs` / `.tabs__tab` | `<Tabs>` / `<TabsList>` / `<TabsTrigger>` |
| `.otp-row` / `.otp-box` | `src/features/auth/components/OtpInput.tsx` |
| `.turnstile` | `src/features/auth/components/TurnstileField.tsx` |
| `.pw-strength` | `PasswordStrengthMeter` (di `ResetPasswordPage.tsx`) |

## Overlay & umpan balik

| Prototype | React |
|---|---|
| `.ovl`, `.ovl__head/body/foot` + `standardizeModals()` | `<Modal>` |
| `.menu`, `.menu__item` | `<DropdownMenu>` + `<DropdownMenuItem>` |
| `.toast` + `Flow.toast()` | `toast()` dari `@/store/ui.store` + `<Toaster>` |
| `.avatar`, `.avatar--sm/lg/xl` | `<Avatar size>` |
| ikon Lucide via `data-lucide="..."` | `<NavIcon name="...">` atau impor langsung dari `lucide-react` |

## Data & util

| Prototype | React |
|---|---|
| `js/*-data.js` (dataset contoh) | `features/<modul>/services/*.service.ts` (blok `MOCK`) |
| format rupiah / tanggal ad-hoc | `src/lib/format.ts` |
| `localStorage` company switcher | `src/store/auth.store.ts` (`companyId`) |
| state UI global (`.is-open`, dsb.) | state lokal komponen, atau `src/store/ui.store.ts` bila lintas layar |

## Yang sengaja TIDAK diport

| Prototype | Alasan |
|---|---|
| `js/tweaks-panel.jsx`, `js/ae-tweaks.jsx`, `js/tweaks-*.jsx` | Panel pengatur prototype, bukan bagian produk. |
| `lucide.min.js` via CDN, Google Fonts CDN | Diganti `lucide-react` + font self-hosted di `public/fonts`. |
| `js/shell.js` render manual | Digantikan komponen React + `src/config/nav.ts`. |
| Sebagian besar `css/*.css` | Digantikan utility Tailwind bertoken. File CSS tetap disimpan di `_prototype/` sebagai acuan angka (padding, ukuran, warna). |

## Tambahan dari design system resmi (`_design-system/`)

| Spesifikasi | React |
|---|---|
| `.action-btn` (36px, inset-rim, 13/700) | `<RowButton>` |
| `.add-filter` "Add …" (40px, circle-plus outline) | `<AddButton>` |
| `.pc-delrow` remove ghost (32px, × Silver → Error-600) | `<RemoveRowButton>` |
| `.crumb` (uppercase back-link) | `<BackLink>` |
| `.stat-card` (head info + kebab, footer Filter ▾) | `src/features/dashboard/components/StatCard.tsx` |
| `.qlinks` / `.security-card` / `.banner` / `.leave-card` / `.whoisoff-card` | `src/features/dashboard/components/SidePanels.tsx` |
| `.table-card` + `.tabs-pills` + `.info-banner` | `src/features/dashboard/components/DashboardTabsCard.tsx` |
| `--shadow-popup` (lift dialog) | utility `shadow-popup` |
| stroke ikon 1.75 | `.lucide { stroke-width: 1.75 }` di `src/styles/index.css` |

## Koreksi ukuran (4 Sep 2026)

Angka tabel & tombol diambil dari implementasi produk di prototype, bukan dari
kartu contoh design system:

| Spesifikasi | Sumber | React |
|---|---|---|
| `.dtable` header gradien Sky + teks putih 14/700 | `_prototype/css/employee-flows.css` | `<DataTable>` |
| `.dtable-wrap--act` freeze + tint Sky-50 | idem | `<DataTable actions>` |
| `.rowbtn` / `.rowmenu__trigger` **30px** | idem | `<RowButton>` / `<RowActions>` |
| `.action-btn` **36px** (aksi panel, bukan baris) | `_design-system/form-standard.css` | `<PanelActionButton>` |
| `.sb` chip 24px + titik 6px | `_prototype/css/employee-flows.css` | `<StatusBadge>` |
| `.co-search` 40px border Silver | `_prototype/css/company.css` | `<TableToolbar>` |
| `.ph-foot` "rows / page" | `_prototype/css/pagination-standard.css` | `<Pagination>` |

## Aset merek (logo dummy, 4 Sep 2026)

| Spesifikasi | React / file |
|---|---|
| Burung SEVAKA (versi 9 Sep 2026) | `public/brand/sevaka-mark.svg` · `<SevakaMark>` |
| Wordmark `SEVΛKΛ` | teks Plus Jakarta Sans Bold · `<SevakaWordmark>` / `LOGO_TEXT` |
| Lockup topnav / auth | `<SevakaLogo size="md" \| "lg">` |
| Tagline HRIS | **sementara tidak dipakai** (aset trace lama diarsipkan) |
| `.intro` splash auth (`auth.html` + `css/auth.css`) | `src/features/auth/components/AuthSplash.tsx` + konstanta di `src/features/auth/splash.ts` |
| Favicon | `/brand/sevaka-mark.svg` (di `index.html`) |
| Kotak "S" Sky lama (rekonstruksi design system) | dihapus — digantikan aset di atas |

## Modul Employee Directory (Batch 1, 9 Sep 2026)

| Prototype | React |
|---|---|
| `.srch` criteria search (`POST /employees/search`) | `features/employees/components/EmployeeCriteriaForm.tsx` |
| `.stat-chips` multi-select status | `StatusChips` (di file yang sama) |
| `.scope-bar` actor data-scope | `features/employees/components/ScopeBar.tsx` |
| `.badge b-*` (6 employment_status) | `EmploymentStatusBadge` |
| `.wa` (4 work_arrangement) | `WorkArrangementTag` |
| `.rt` grid + freeze + sort header | `<DataTable sort onSortChange>` (dukungan sort baru) |
| `.ovl .dd` DIR-DETAIL | `features/employees/components/EmployeeDetailModal.tsx` |
| masking NIK / rekening (§1.8) | `features/employees/masking.ts` (+ test) |

## Modul Employee Profile / ESS (Batch 1, 9 Sep 2026)

| Prototype | React |
|---|---|
| `.ep-sec` 7 menu (hash) | 7 route → `features/profile/pages/EmployeeProfilePage.tsx` |
| `.ep-card` + `.ep-kv` | `SectionCard`, `KeyValueList` (`components/ProfileBits.tsx`) |
| `.ep-reveal` (KTP + nama ibu) | `BasicInfoSection` — reveal menulis read-audit (§6.6) |
| `.ep-locked-note` (HR only) | `LockedNote` + prop `actor` |
| `.ep-toggle` / `.ep-switch` | `<ToggleField>` (komponen rumah baru) |
| `.ctl--area` textarea | `<TextAreaField>` (komponen rumah baru) |
| `.ovl--form` + konfirmasi hapus | `<Modal>` + `<ConfirmDialog>` (komponen rumah baru) |
| `.ep-tag`, `.ep-cert` | `Tag`, `CertMark` |
