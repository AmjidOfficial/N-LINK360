---
name: National Lights B2B Enterprise ERP
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#8d4b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b15f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  tabular-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 24px
  margin: 32px
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 32px
---

## Brand & Style

This design system delivers a professional B2B enterprise ERP and field sales platform characterized by extreme operational clarity, financial precision, and utilitarian efficiency. The aesthetic style is rooted in a refined Corporate / Modern paradigm tailored for high-stakes enterprise workflows.

### Brand Personality & Tone
- **Utilitarian & Systematic:** Built for speed, high-density data consumption, and error-free multi-step transactions.
- **Authoritative & Reliable:** Instills absolute confidence in financial ledgers, inventory counts, and field sales pipelines.
- **Calm & Focused:** Minimizes cognitive load through restrained visual styling, allowing complex enterprise data to take center stage.

### Emotional Response
The interface evokes a sense of absolute control, structural stability, and trusted precision. Users feel empowered to manage nationwide lighting inventory, complex B2B invoicing, and field sales teams with zero friction.

## Colors

The color architecture is built for dense enterprise applications, balancing high-contrast operational zones with calm workspace backgrounds. 

- **Primary Action (`#059669` - Emerald Green):** Drives key transactional conversion points, primary buttons, active states, and successful financial clearance indicators.
- **Secondary Navigation (`#0F172A` - Deep Navy/Charcoal):** Anchors the application shell, primary navigation rails, and high-priority header blocks.
- **Tertiary / Warning (`#D97706` - Amber):** Highlights pending approvals, low-stock alerts, and deferred payment statuses in PKR ledgers.
- **Critical / Error (`#DC2626` - Red):** Reserved for systemic errors, stock-outs, and critical financial deficits.
- **Surfaces & Neutrals (`#F8FAFC` - Soft Neutral):** Provides the foundational canvas, reducing eye strain during extended data entry and tabular auditing sessions.

## Typography

Typography is treated as a functional utility system designed to maximize data density and readability across financial ledgers, inventory tables, and dashboard metrics.

- **Family:** Inter is utilized exclusively across all weights to ensure ultra-crisp rendering of numerical data, SKU codes, and PKR currency formatting.
- **Data Tables:** Numerical columns must utilize tabular (monospaced-alignment) figures to ensure vertical decimal alignment across multi-thousand PKR transactions.
- **Scale:** Headlines are restrained to prevent wasted viewport space, prioritizing high-density content blocks over decorative display scaling.

## Layout & Spacing

The layout architecture relies on a strict 8-point spacing grid paired with a responsive 12-column fluid grid system engineered for high-density enterprise monitors and tablet-based field sales apps.

- **Grid Architecture:** 12-column fluid layout with 24px gutters and 32px outer canvas margins on desktop, collapsing to 16px margins on mobile/tablet field devices.
- **Spacing Rhythm:** All structural padding, component spacing, and sectional gaps adhere strictly to the 8-point scale (`space-sm` to `space-xl`), ensuring vertical rhythm across complex forms, filter bars, and dense data tables.

## Elevation & Depth

Visual hierarchy is conveyed through restrained, utilitarian layering that avoids excessive ornamentation in favor of structural clarity.

- **Tonal Layers:** Surfaces utilize subtle tonal shifts from the pure white base (`#FFFFFF`) to soft neutrals (`#F8FAFC`) to delineate cards, sidebars, and floating action panels.
- **Restrained Shadows:** Drop shadows are kept minimal, soft, and low-opacity (e.g., `0 1px 3px rgba(15, 23, 42, 0.08)`) to indicate interactive elevation on modals and dropdown menus without visual clutter.
- **Low-Contrast Outlines:** Primary structural boundaries rely on clean, 1px ghost borders (`#E2E8F0`) to separate table rows, form sections, and dashboard widget modules.

## Shapes

The shape language reflects an efficient, professional enterprise standard with restrained corner radii.

- **Radius Scale:** Base UI elements (buttons, inputs, checkboxes) utilize a tight `0.25rem` (4px) roundedness to maintain a crisp, business-appropriate aesthetic. Containers, cards, and modal dialogs scale up moderately to `0.5rem` (8px).
- **Pill Badges:** Status indicators, SKU tags, and numeric counters may utilize pill shapes strictly for high-visibility categorization (e.g., "In Stock", "Pending Approval").

## Components

Components are engineered for high-frequency data entry, rapid scanning, and error prevention in enterprise environments.

### Buttons
- **Primary:** Solid emerald green (`#059669`) background with crisp white label text, 4px border-radius, and a subtle hover darkening state. Used for primary transactional actions (e.g., "Create Invoice", "Approve Order").
- **Secondary:** Outlined with a 1px neutral border (`#CBD5E1`) and dark charcoal text (`#0F172A`). Used for auxiliary actions.
- **Destructive:** Solid or outlined red (`#DC2626`) for critical actions like voiding invoices or deleting records.

### Input Fields & Forms
- High-density form controls featuring 32px or 40px heights, clear 1px borders, and inline validation messaging.
- Currency fields for PKR must enforce right-aligned numerical entry with static prefix/suffix indicators (`PKR`).

### Data Tables
- The core component of the ERP. Must support sticky headers, alternating row background tints for scannability, right-aligned monetary values, and compact padding variants (`space-sm` vertical spacing).
- Include built-in support for inline batch selection via checkboxes and sticky action columns.

### Checkboxes & Radio Buttons
- Crisp 16x16px square checkboxes with 2px corner radius, utilizing emerald green for checked states to maintain clear visual feedback during mass record selections.

### Cards & Containers
- Flat white containers bordered by 1px neutral lines (`#E2E8F0`), housing discrete KPI metrics, warehouse inventory summaries, or customer profile blocks.

### Additional Enterprise Components
- **Data Filters & Search Bars:** Persistent multi-parameter filter strips for sorting by warehouse location, sales rep, date range, and payment status.
- **Status Badges:** Color-coded pills (Emerald for active/paid, Amber for pending, Red for overdue/critical) for instant operational scanning.