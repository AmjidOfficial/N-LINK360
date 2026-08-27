# N-LINK 360 P9 Responsive Design System

## Objective
Make every N-LINK 360 screen usable on phones first, then scale cleanly to tablets, laptops, desktops and large displays.

## Layout Principles

Use CSS Grid for page-level composition and Flexbox for controls, toolbars, rows and inline alignment.

Avoid fixed desktop widths. Prefer:
- width: 100%
- max-width
- min/max constraints
- clamp()
- minmax()
- auto-fit / auto-fill
- gap
- flex-wrap
- overflow-safe containers

## Breakpoints

Mobile-first baseline:
- 0–479px: compact phones
- 480–767px: large phones / small tablets
- 768–1023px: tablets
- 1024–1279px: laptops
- 1280–1535px: desktops
- 1536px+: large displays

Use media queries only where the layout actually needs to change. Do not build separate desktop and mobile applications.

## Mobile Rules

- No horizontal page scrolling.
- Touch targets at least 44px where practical.
- Sticky primary action when a long form needs it.
- Tables transform into cards/stacked rows where needed.
- Dense SKU grids become vertically scrollable within the page or compact cards.
- Modals become full-screen sheets on narrow devices.
- Bottom navigation/action bars may be used for Sales/Recovery workflows.
- Keep the customer selector and balance summary visible before the SKU entry area.
- Numeric inputs use mobile numeric keyboards.

## Order Booking

Mobile order flow:

Customer selector
→ Balance summary
→ Search/filter SKU
→ SKU compact card
→ Tap to expand technical/pricing details
→ Order quantity
→ Running order summary
→ Submit

Desktop order flow may use a dense grid with expandable inline detail.

## Grid System

Recommended semantic classes/components:
- `.page-shell`
- `.content-grid`
- `.stats-grid`
- `.form-grid`
- `.two-column`
- `.three-column`
- `.sku-grid`
- `.detail-grid`
- `.action-row`

Use CSS Grid with `repeat(auto-fit, minmax(...))` where appropriate.

## Flexbox

Use Flexbox for:
- Header actions
- Breadcrumbs
- Buttons
- Filters
- Form action rows
- KPI alignment
- Card headers
- Navigation

Use `flex-wrap` and `min-width: 0` to prevent overflow.

## CSS Properties

Use the full CSS toolkit where it improves usability, including:
- box-sizing
- display
- position
- inset
- z-index
- width/min-width/max-width
- height/min-height/max-height
- margin/padding
- gap
- flex/flex-flow/align/justify
- grid/grid-template/grid-area
- overflow/overflow-x/overflow-y
- object-fit
- border/border-radius
- box-shadow
- background/background-image
- color
- font properties
- line-height
- letter-spacing
- text-overflow
- white-space
- opacity
- transform
- transition
- animation
- appearance
- cursor
- pointer-events
- aspect-ratio
- container queries where useful

Do not use properties just to claim coverage. Every property must solve a layout, accessibility or interaction need.

## Accessibility

- Visible keyboard focus.
- Logical tab order.
- Labels for all inputs.
- Buttons must have clear accessible names.
- Do not rely on color alone.
- Respect `prefers-reduced-motion`.
- Maintain readable contrast.
- Error messages associated with their fields.

## Print

Responsive rules must not break print.

Print styles should:
- hide navigation and app-only controls
- show company branding and document content
- avoid clipped tables
- preserve page breaks for invoices/reports

## Performance

- Avoid unnecessary layout shifts.
- Lazy-load noncritical images.
- Keep large tables virtualized/paginated where needed.
- Avoid expensive animations on low-power devices.

## Acceptance Test Matrix

Every major screen must be checked at minimum:

320×568, 360×800, 390×844, 412×915, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080.

Acceptance means:
- no accidental horizontal scroll
- no clipped buttons
- no inaccessible modal controls
- forms remain usable
- tables remain readable
- primary actions remain obvious
- text remains legible
- navigation remains usable
