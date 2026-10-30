# DESIGN — "Saharan Paper" light theme, Algerian palette

Principles: minimal, one hero object per page, restrained color, big calm type on the landing, dense-but-quiet Ant dashboards. Red is **only** for critical. Brand green is the primary.

## Tokens (`src/styles/tokens.css`)
```css
:root {
  /* surfaces */
  --bg: #FAF8F3;
  --surface: #FFFFFF;
  --surface-2: #F3F0E8;
  --border: #E6E1D5;
  --border-strong: #D3CCBB;
  /* ink */
  --ink: #14201A;
  --ink-2: #3B4740;
  --muted: #5C675F;
  /* brand (flag green) */
  --brand: #006233;
  --brand-hover: #007A41;
  --brand-press: #004D28;
  --brand-subtle: #E6F1EA;
  /* severity (M3) */
  --sev-low: #2A7F6F;
  --sev-medium: #D9A400;     /* text on it: --ink */
  --sev-high: #C9560F;
  --sev-extreme: #D21034;    /* flag red */
  --sev-extreme-subtle: #FBE5E9;
  /* body regions (M4) */
  --reg-unlikely: #C9C4B6;
  --reg-check: #E0A100;
  --reg-likely: #D21034;
  /* confidence ladder / pins */
  --conf-suspected: #8A9189;
  --conf-likely: #D9A400;
  --conf-witness: #C9560F;
  --conf-confirmed: #D21034;
  /* dark stage */
  --stage-bg: #0B1310;
  --stage-grid: rgba(255,255,255,0.06);
  --stage-ink: #E8EEEA;
  --stage-muted: #8FA097;
  --stage-route: #F2B705;    /* response route only */
  --stage-impact: #FF4D5E;
  /* radii (px) */
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px; --r-xl: 20px;
  /* shadows */
  --shadow-1: 0 1px 2px rgba(20,32,26,.06);
  --shadow-2: 0 4px 16px rgba(20,32,26,.08);
  /* motion */
  --dur-fast: 150ms; --dur-base: 240ms; --dur-slow: 420ms; --dur-hero: 900ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  /* fonts */
  --font-sans: var(--font-geist-sans), var(--font-plex-arabic), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}
:lang(ar) { --font-sans: var(--font-plex-arabic), var(--font-geist-sans), system-ui, sans-serif; }
```
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.

## Typography
App (Ant): base 14/22. Page title 28/36 weight 600. Card title 16/24 weight 600. Caption 12/18 muted. Telemetry numbers use `--font-mono` with `font-variant-numeric: tabular-nums`.
Landing: hero `clamp(3rem, 9vw, 8rem)`, weight 600, letter-spacing `-0.04em`, line-height 0.95. Section titles `clamp(2.25rem, 6vw, 5rem)`, weight 600, tracking `-0.03em`, line-height 1. Body lead `clamp(1.125rem, 2vw, 1.75rem)`, `--muted`, line-height 1.35. Arabic: no negative letter-spacing, line-height +0.1.

## Ant theme (`src/lib/antdTheme.ts`)
```ts
import { theme, type ThemeConfig } from 'antd';
export const antdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#006233',
    colorInfo: '#006233',
    colorSuccess: '#2A7F6F',
    colorWarning: '#D9A400',
    colorError: '#D21034',
    colorBgLayout: '#FAF8F3',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E6E1D5',
    colorBorderSecondary: '#EFEBE0',
    colorText: '#14201A',
    colorTextSecondary: '#5C675F',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    boxShadow: '0 4px 16px rgba(20,32,26,.08)',
  },
  components: {
    Button: { controlHeight: 38, primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Card: { borderRadiusLG: 14, boxShadowTertiary: '0 1px 2px rgba(20,32,26,.06)' },
    Table: { headerBg: '#F3F0E8', headerColor: '#3B4740', borderColor: '#E6E1D5' },
    Tag: { borderRadiusSM: 6 },
    Layout: { headerBg: 'transparent', bodyBg: '#FAF8F3' },
  },
};
```
Never hardcode these values elsewhere. Components read CSS variables when Ant tokens do not cover them.

## Severity and status mapping
| Value | Fill | Text | Icon |
|---|---|---|---|
| M3 low | `--sev-low` | white | CheckCircleFilled |
| M3 medium | `--sev-medium` | `--ink` | InfoCircleFilled |
| M3 high | `--sev-high` | white | WarningFilled |
| M3 extreme | `--sev-extreme` | white | ExclamationCircleFilled |
| M4 unlikely | `--reg-unlikely` | `--ink` | none |
| M4 check | `--reg-check` | `--ink` | EyeOutlined |
| M4 likely | `--reg-likely` | white | AimOutlined |
| Confidence suspected | `--conf-suspected` | white | QuestionCircleFilled |
| Confidence likely | `--conf-likely` | `--ink` | |
| Confidence witness-confirmed | `--conf-witness` | white | TeamOutlined |
| Confidence confirmed | `--conf-confirmed` | white | SafetyCertificateFilled |

Incident lifecycle (detected → dispatched → on scene → transporting → at hospital → closed) uses brand green progress, never red.

## Interaction states (custom components)
| State | Visual |
|---|---|
| default | `--surface`, 1px `--border` |
| hover | border `--border-strong`, background `--surface-2`, transition `--dur-fast` |
| focus-visible | 2px outline `--brand`, 2px offset, radius follows the component |
| active/pressed | background `--brand-subtle`, scale 0.99 |
| selected | border `--brand` 1.5px, background `--brand-subtle`, inline-start 3px brand bar |
| disabled | opacity .45, `cursor: not-allowed`, no hover |
| loading | Ant `Skeleton` with same layout, no spinner on cards |
| empty | `EmptyState` with one line, one icon, no illustration |
| error | `Alert` type error, inline, retry button |

Map pins: 40–70 confidence grey `--conf-suspected` static; 70–90 yellow `--conf-likely` static with ring; 90+ red `--conf-confirmed` with pulse ring (1.4s, scale 1→2.4, opacity .5→0, infinite).

## Motion rules
- Animate only `transform`, `opacity`, `filter`, `clip-path`, `mask`. Never width/height/top/left.
- Durations only from tokens. Easing `--ease-out` for entrances, `--ease-in-out` for movements between positions.
- List entrances: stagger 40ms, cap at 8 items. New incident row: slides from -12px, background flash `--brand-subtle` → transparent over 1.2s.
- Numbers (stats, ETA changes): count-up 800ms `--ease-out`.
- No page transitions. No parallax outside the landing.
- `prefers-reduced-motion: reduce`: all durations 0, pulses become a static ring, 3D auto-rotate off, landing sequence replaced by static first and last frames.

## Dark stage with fade (the signature element)
Used for the 3D body and the crash scene on the dashboards (not on the landing, which stays light). The dark panel dissolves into the ivory page.
```css
.stage {
  position: relative;
  background: var(--stage-bg);
  --fade: 96px;
  -webkit-mask-image:
    linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%);
  mask-composite: intersect;
}
@media (max-width: 768px) { .stage { --fade: 48px; } }
```
Rules: no border-radius on `.stage` (the fade replaces the edge). **Never place interactive controls inside `.stage`** (the mask clips them): controls live in an unmasked overlay sibling positioned over the stage. A faint grid (`--stage-grid`, 48px) is drawn inside the stage for depth.

## Zellige accent (landing only)
SVG pattern: 8-point star tessellation, tile 120×120, stroke 1px `--ink` at 4% opacity, no fill. Used on the hero background and footer only, masked with a radial gradient so it fades out toward the center. Never in the apps.

## RTL
`dir` set on `<html>` from locale. Ant `ConfigProvider direction`. Mirror: rails swap sides, arrows and chevrons flip, progress runs right-to-left. Do not mirror: 3D scene, map, numbers, phone numbers, code, the SMS raw line (always LTR with `dir="ltr"`).

## Layout grid (apps)
Min width 1280. Rails: left 320, right 392, gap 16, page padding 24, stage fills the rest. Under 1024: rails become Ant `Drawer`s opened from two buttons.
