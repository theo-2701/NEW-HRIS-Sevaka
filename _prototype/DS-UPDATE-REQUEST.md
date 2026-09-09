# Permintaan Update — SEVAKA HRIS Design System

> Konteks: prototype HRIS (project ini) sudah mengembangkan beberapa standar
> komponen yang **berbeda** atau **belum ada** di design system resmi. Dokumen
> ini merangkum selisihnya + prompt siap-tempel untuk tim design system.
> Acuan kebenaran tetap Figma `UI HRIS_V1.0 (21052026).fig`.

---

## A. Ringkasan selisih (project vs design system)

| # | Area | Design system saat ini | Standar baru di project | Status |
|---|------|------------------------|--------------------------|--------|
| 1 | **Form field** (`.field` / `.ctl`) | tinggi **42px**, `inset-rim` (tanpa border), label **14/500**, isi 14px, gap 6px | tinggi **36px**, **border 1px Silver + fill Cloud** (tanpa inset-rim), label **16/700**, isi & placeholder **12/500**, gap **4px**, focus = border Ocean + ring 4px `rgba(2,132,199,.16)` | **Konflik** — perlu DS diselaraskan |
| 2 | **Choose-file field** (`.file-ctl` / `.imp-upload`) | — tidak ada | box 36px Cloud + border Silver, chip 24px Secondary-50, label file 12/500 | **Baru** |
| 3 | **Input uang ber-prefix "RP"** (`.pp-money`) | — tidak ada | field 36px, segmen "RP" 40px Vapor berbagi stroke Silver, isi 12/500 | **Baru** |
| 4 | **Tombol Action tabel** (`.action-btn`) | — tidak ada | 36px, Cloud + inset-rim, 13/700 Secondary-700, chevron 14px, hover soft-press | **Baru** |
| 5 | **Tombol "Add …"** (`.add-filter`) | — tidak ada | 40px, white + inset-rim, 14/700, ikon **outline** circle-plus 18px Ocean | **Baru** |
| 6 | **Tombol remove ghost** (`.pc-delrow`) | — tidak ada | 32px transparan, "×" 16px Silver → Error-600 di hover Error-50 | **Baru** |
| 7 | **Tabel freeze kolom** (`table-standard.css`) | hanya `.table` polos | kolom-1 beku kiri, kolom Action beku kanan, drag-to-pan, z-index layering, lift saat menu open | **Baru** |
| 8 | **Modal scrim frosted-glass** | guide bilang *"No frosted-glass backdrop blur anywhere"* | `--bg-scrim: rgba(17,24,39,.22)`, `--blur-scrim: blur(8px) saturate(1.05)`, `--shadow-popup` | **Konflik dgn guide** |
| 9 | **Breadcrumb** (`.crumb`) | — tidak ada | link uppercase 12/700 Secondary-600, underline di hover | **Baru** |
| 12 | **Tab nav** (`.tabnav` + `.tabpanel`) | — tidak ada (hanya `.tab-pill` solid & `.tabs__tab`) | tab underline STANDAR: label uppercase 13/700 tracking .06em Secondary-700 saat aktif, indikator garis 3px Secondary-500 di bawah, opsional badge `.tabnav__count`; auto-wired `Flow.wireTabs()` (panel `[data-tabpanel]` di parent tabnav) | **Baru** |
| 10 | **Placeholder** | beragam | **semua** placeholder = Silver `--fg-4` (`#94A3B8`), real & faux | **Penegasan** |
| 11 | Font loading | self-host `@font-face` dari `/fonts` | Google Fonts CDN via `<link>` | Beda mekanisme (kosmetik) |

Catatan guide vs kit yang juga perlu diputuskan: README DS menyebut **navbar 92px** &
**sidebar 84/264px**, tapi `ui_kits/app/app.css` memakai **topnav 64px** & sidebar
84px icon-stack. Project mengikuti kit (64px). Mohon kunci satu angka.

---

## B. Prompt siap-tempel (lempar ke bagian Design System)

```
Tolong update SEVAKA HRIS Design System agar selaras dengan standar komponen
terbaru yang sudah dipakai di prototype HRIS. Acuan kebenaran tetap file Figma
UI HRIS_V1.0. Lakukan perubahan berikut dan perbarui kartu preview + dokumentasi
README yang relevan:

1. FORM FIELD — ganti spec .field jadi: tinggi 36px; fill Cloud (#FAFCFE);
   border 1px Silver (#94A3B8); radius 8px; padding-x 12px; HAPUS inset-rim pada
   field default. Label 16px/700 Slate, tanda wajib "*" Rose. Gap label→input 4px.
   Isi & placeholder 12px/500 (placeholder warna Silver #94A3B8). Focus: border
   Ocean (#0284C7) + ring 4px rgba(2,132,199,.16). Textarea padding 9px 12px.

2. TAMBAH komponen baru ke kit + preview:
   - Choose-file field: box 36px Cloud+Silver, chip tombol 24px Secondary-50
     (10/700 uppercase Secondary-700), nama file 12/500 (Slate saat terisi).
   - Input uang ber-prefix "RP": field 36px standar, segmen "RP" lebar 40px fill
     Vapor berbagi stroke Silver sebagai divider, isi 12/500.
   - Tombol Action tabel: 36px, Cloud + inset-rim, 13/700 Secondary-700, chevron
     14px, hover soft-press (fill Vapor + shadow-press).
   - Tombol "Add …": 40px, white + inset-rim, 14/700 Secondary-700, ikon OUTLINE
     circle-plus 18px warna Ocean (bukan kotak solid), hover soft-press.
   - Tombol remove ghost: 32px transparan, glyph "×" 16px Silver, hover jadi
     Error-600 di atas tint Error-50. (BUKAN tombol merah penuh.)
   - Breadcrumb (.crumb): link uppercase 12/700 Secondary-600, underline di hover.

3. TABEL — tambah pola "freeze kolom" sebagai standar tabel data lebar: kolom
   identifier pertama beku ke kiri, kolom Action beku ke kanan, body scroll
   horizontal di antaranya, rim divider inset 1px di tiap tepi beku, drag-to-pan,
   dan lift z-index baris saat menu aksinya terbuka.

4. MODAL & TOKEN — putuskan kebijakan scrim. Project memakai frosted-glass
   (--bg-scrim rgba(17,24,39,.22) + --blur-scrim blur(8px) saturate(1.05)) dan
   --shadow-popup untuk dialog, padahal guide lama melarang blur. Mohon
   resmikan token ini ATAU beri arahan agar project kembali ke scrim solid.

5. NAVBAR/SIDEBAR — kunci satu tinggi navbar (kit=64px vs README=92px) dan
   selaraskan README dengan nilai yang dipilih.

Semua perubahan harus pakai token var(--*) yang ada; jangan introduksi hex baru
di luar skala brand.
```

---

## C. File yang sebaiknya dilampirkan saat melempar prompt

Lampirkan dari project ini (sebagai referensi implementasi yang sudah jadi):

- `css/form-standard.css` — spec field, choose-file, input uang, tombol Action/Add/remove (poin 1–2 & 9–10)
- `css/table-standard.css` — pola freeze kolom (poin 3)
- `css/colors_and_type.css` — blok token `--bg-scrim` / `--blur-scrim` / `--shadow-popup` (poin 4)
- `css/app.css` — komponen `.crumb` (poin 9)
- Opsional sebagai contoh pemakaian nyata: `add-employee.html`, `payroll-processing.html`,
  `css/employee-modals.css`, `css/payroll-component-modals.css`
