# Iconography — SEVAKA HRIS

## System overview

The Figma file ships **two complete, parallel icon families**:

| Family | Style | Categories | Approx count |
|---|---|---|---|
| `Outline` | 1.5 px stroke, rounded line-caps, no fill | Interface · Communication · Files · Status · Devices · General · Navigation · Media · Brands | ~210 |
| `Solid` | Filled silhouette of the same icons | Interface · Status · Brands | ~140 |

All icons are drawn on a **24 × 24 px** artboard. Hit-areas in components extend to **44 × 44** in mobile contexts (none today) and **32 × 32** in dense table actions.

### Sub-categories used in the file

- **Interface** — `Caret up/down/left/right`, `Caretret left/right` (double caret), `Add`, `Cancel`, `Cross`, `Check`, `Search`, `Settings`, `Settings-alt`, `Settings-adjust`, `Edit`, `Edit-alt`, `Trash`, `Trash-alt`, `Save`, `Layout`, `Apps`, `Rows`, `Columns`, `Stack`, `Login`, `Logout`, `Zoom-in/out`, `Plus`, `Minus`, `Move`, `Bluetooth`, `Menu`, `Refresh`, `Hotspot`, `Expand/Collapse`, `Sort`, `Exchange`, `HTML`
- **Communication** — `Chat`, `Comment` (+ plus / minus / block), `Phone` (+ in / out / off / miss), `Envelope` (+ open), `User` (+ plus / clock / block), `Contacts`, `Bullhorn`, `Forward`, `Reply`, `Share`, `Share-box`, `Send`, `Like`, `Dislike`, `Delegation`, `Employee`, `identitycard`
- **Files** — `Folder` (+ open / lock / plus / delete / user / block), `File` (+ upload / download / user), `Document`, `Request`, `Picture`, `Image`, `Invoice`, `Clipboard` (+ alt), `Book` (+ check / mark), `Cloud` (+ upload / download / check / off), `Copy`, `Download`, `Upload`
- **Status** — `Info-circle`, `Info-rect`, `Info-triangle`, `Eye`, `Eye-closed`, `Lock`, `Unlock`, `Lock-time`, `Key`, `Shield`, `Star` (+ half), `Heart` (+ plus / off / beat), `Pin`, `Notification` (+ on / off), `Sand-watch`, `Power-button`, `University`, `Lightning` (+ alt), `Lightbulb` (+ alt / off), `Award`, `Diamond`, `Fire`, `Book-open`, `Bookmark`, `Present`, `Checked-box`
- **Devices** — `Camera`, `Video`, `Watch`, `Printer`, `Desktop`, `Mobile-phone`, `Server`, `Processor`, `Mouse` (+ alt), `Binocular`, `Headset`, `Headphone`, `Microphone` (+ off), `Gamepad`, `Battery-full/most/half/quarter/low/empty`, `Dialpad`
- **General** — `Home`, `Calendar`, `Box`, `Bag`, `Card`, `Wallet`, `Bank`, `Sun`, `Moon`, `Clock`, `Timer`, `Alarm`, `Filter`, `Chart-pie` (+ alt), `Chart-line`, `Chart`, `Pulse`
- **Navigation** — `Location` (+ plus / check / question), `Current-location`, `Explore`, `Navigation`, `Globe`, `Map-location`
- **Media** — `Play`, `Pause`, `Skip-next/prev`, `Fast-forward/rewind`, `Shuffle`, `Music`, `Volume-up/down/off`
- **Brands** — `Adobe Indesign`, `Figma`

The Figma family is original (not a third-party set lifted in), but the visual grammar — 1.5 px outline, rounded caps, 24 px grid — maps cleanly onto Lucide / Phosphor.

---

## Code-side substitution: **Lucide**

This design system uses **[Lucide](https://lucide.dev)** as the icon implementation because:

1. It matches the SEVAKA outline style (1.5–2 px stroke, rounded caps, 24 × 24 grid) closely enough to be visually indistinguishable in dense product UI.
2. Solid variants exist (`-fill` icons) for the cases where SEVAKA uses `Solid/*`.
3. It's tree-shakeable via CDN: `<script src="https://unpkg.com/lucide@latest"></script>` then `lucide.createIcons()`.

### Mapping (Figma → Lucide)

| SEVAKA name | Lucide |
|---|---|
| `Outline/General/Home` | `home` |
| `Outline/General/Calendar` | `calendar` |
| `Outline/General/Bank` | `landmark` |
| `Outline/General/Wallet` | `wallet` |
| `Outline/General/Bag` | `briefcase` |
| `Outline/General/Chart-pie` | `pie-chart` |
| `Outline/General/Chart-line` | `line-chart` |
| `Outline/Communication/Chat` | `message-circle` |
| `Outline/Communication/Envelope` | `mail` |
| `Outline/Communication/User` | `user` |
| `Outline/Communication/Employee` | `users` |
| `Outline/Communication/Bullhorn` | `megaphone` |
| `Outline/Communication/Send` | `send` |
| `Outline/Files/File` | `file` |
| `Outline/Files/Folder` | `folder` |
| `Outline/Files/Clipboard` | `clipboard` |
| `Outline/Files/Document` | `file-text` |
| `Outline/Files/Cloud` | `cloud` |
| `Outline/Files/Upload` | `upload` |
| `Outline/Files/Download` | `download` |
| `Outline/Status/Info-circle` | `info` |
| `Outline/Status/Info-triangle` | `alert-triangle` |
| `Outline/Status/Eye` / `Eye-closed` | `eye` / `eye-off` |
| `Outline/Status/Lock` / `Unlock` | `lock` / `unlock` |
| `Outline/Status/Shield` | `shield` |
| `Outline/Status/Bell` | `bell` (+ `bell-off`) |
| `Outline/Status/Star` | `star` |
| `Outline/Status/Sand-watch` | `hourglass` |
| `Outline/Status/Lightning` | `zap` |
| `Outline/Status/Lightbulb` | `lightbulb` |
| `Outline/Status/Book-open` | `book-open` |
| `Outline/Status/Power-button` | `power` |
| `Outline/Status/University` | `graduation-cap` |
| `Outline/Status/Award` | `award` |
| `Outline/Interface/Search` | `search` |
| `Outline/Interface/Settings` | `settings` |
| `Outline/Interface/Edit` | `pencil` |
| `Outline/Interface/Trash` | `trash-2` |
| `Outline/Interface/Plus` / `Minus` | `plus` / `minus` |
| `Outline/Interface/Cross` / `Cancel` | `x` |
| `Outline/Interface/Check` | `check` |
| `Outline/Interface/Caret up/down/left/right` | `chevron-{up,down,left,right}` |
| `Outline/Interface/Caretret left/right` | `chevrons-{left,right}` |
| `Outline/Interface/Login` / `Logout` | `log-in` / `log-out` |
| `Outline/Interface/Sort` / `Filter` | `arrow-up-down` / `filter` |
| `Outline/Interface/Layout` / `Apps` / `Rows` / `Columns` | `layout-dashboard` / `layout-grid` / `rows-3` / `columns-3` |
| `Outline/Interface/Refresh` | `refresh-cw` |
| `Outline/Devices/Mobile-phone` | `smartphone` |
| `Outline/Devices/Desktop` | `monitor` |
| `Outline/Navigation/Location` | `map-pin` |
| `Outline/Navigation/Globe` | `globe` |

### Stroke weight

Lucide ships at **2 px stroke** by default. To match the slightly thinner SEVAKA look, set `stroke-width="1.75"` at the `<svg>` level:

```html
<svg data-lucide="home" stroke-width="1.75"></svg>
```

### Color

Icons inherit `currentColor`. Default usage:

- In body text: `color: var(--fg-2)` (slate)
- In primary buttons: `color: var(--color-cloud)` (near-white)
- In secondary buttons: `color: var(--color-secondary-700)` (deep Ocean)
- In disabled state: `color: var(--fg-4)` (silver)

---

## Other glyph sources used inside SEVAKA

- **Unicode**: not used as primary icons. The system avoids `→` / `✓` / `▼` in text — interface chevrons and checks come from the icon set.
- **Emoji**: never. Not in app, not in marketing, not in admin email templates.
- **Logos** (third-party app integrations in `Integrations`): live as PNGs lifted from each brand's marketing site. Bundle them into `assets/integrations/` if you need them; the Figma file imports a handful (`Adobe Indesign`, `Figma`, and the integration tiles).
- **Brand "S" tile** (the small square Sky mark): in `assets/sevaka-mark.svg`. Always 1 : 1 aspect ratio, 10 px corner radius at 100 × 100, scaled proportionally.

---

## Original Figma SVGs

The original 24 × 24 SVGs can be lifted from the Figma virtual filesystem at:

```
/Icon/Outline/<NameInCamelCase>/Icon.svg
/Icon/Solid/<NameInCamelCase>/Icon.svg
```

(e.g. `/Icon/Outline/OutlineGeneralHome/Icon.svg`)

Note: per the Figma file's own ReadME, "*beberapa belum konsisten*" — some icons aren't fully consistent between Outline and Solid sets. When extracting, treat the **Outline** set as canonical and re-stroke Solids to match.
