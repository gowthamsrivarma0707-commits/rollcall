# Design System · RollCall

<!-- awesome-design-md:v1 & taste-skill compliant -->

## 1. Visual World & Direction

- **Archetype**: Academic Editorial & High-Utility Tool
- **Mood**: Trustworthy, tactile, crisp, non-distracting, high-authority collegiate software.
- **Tone**: Professional, clear, reassuring for students, efficient for faculty.

---

## 2. Color Palette (Tokens)

Inspired by classic academic paper, varsity green, and high-visibility status indicators:

```css
:root {
  /* Brand Primaries */
  --color-brand-primary: #173d31;      /* Deep Forest Varsity Green */
  --color-brand-accent: #2e7a5c;       /* Muted Emerald */
  --color-brand-soft: #eaf3ee;         /* Mint Wash Surface */

  /* Neutral Backgrounds & Canvas */
  --color-bg-canvas: #fbfaf7;          /* Warm Parchment Ivory */
  --color-bg-surface: #ffffff;         /* Pure Card White */
  --color-bg-subtle: #f2efe9;          /* Neutral Rule & Dividers */

  /* Typography / Ink */
  --color-ink-primary: #121815;        /* Soft Charcoal Ink */
  --color-ink-secondary: #4a5750;      /* Slate Secondary Text */
  --color-ink-muted: #7b8881;          /* Caption & Form Placeholder */

  /* Status Tokens (WCAG AA Compliant) */
  --color-status-success: #1b7a43;     /* Attendance >= 75% */
  --color-status-warning: #b26c00;     /* Borderline 70% - 74% */
  --color-status-danger: #c4292b;      /* Shortage < 70% */
}
```

---

## 3. Typography Hierarchy

- **Display & Headings**: `DM Serif Display`, serif, 400. Evokes academic prestige, yearbooks, and trusted university publications.
- **Body & Data**: `Manrope`, -apple-system, sans-serif, 500/600/700. Clean, geometric, legible at small data table scales.

---

## 4. Spacing, Rhythm & Elevation

- **Base Grid**: 8px modular scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
- **Radius**: Softened geometry:
  - Buttons & Inputs: `8px`
  - Cards & Dashboards: `14px`
  - Pills & Badges: `9999px`
- **Shadows**:
  - `shadow-sm`: `0 1px 2px rgba(18, 24, 21, 0.05)`
  - `shadow-card`: `0 4px 12px rgba(18, 24, 21, 0.08)`

---

## 5. Component Patterns

- **Bunk Calculator Card**: Radial or linear progress with bold threshold indicator line at 75%.
- **Teacher Attendance Toggle**: 3-state touch targets (minimum 44x44px for effortless mobile tapping in class).
- **Empty States**: Friendly, instructive text with zero generic clip-art placeholders.
