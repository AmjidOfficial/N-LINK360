# N-LINK 360 UI, Responsive, Branding & Printing Standard

## Responsive Design

All screens must be responsive from mobile-first upward.

Required breakpoints must cover:

- Small mobile
- Large mobile
- Tablet portrait
- Tablet landscape
- Laptop
- Desktop
- Large desktop

Use CSS media queries and responsive Grid/Flexbox layouts. Do not rely on fixed desktop widths.

Avoid horizontal scrolling except where a true data table requires it. On mobile, convert wide tables into stacked cards or controlled horizontal scrolling with clear headers.

## Layout System

Use:

- CSS Grid for page structure, dashboards and responsive data layouts
- Flexbox for navigation, toolbars, forms and aligned controls
- CSS variables for tokens
- Fluid sizing using clamp() where useful
- max-width containers
- gap instead of arbitrary margins
- min/max constraints
- consistent spacing scale

Do not use excessive absolute positioning.

## CSS Quality

Use the full appropriate CSS property set needed for a professional UI, including:

- box sizing
- display
- position
- inset
- width/height
- min/max dimensions
- margin/padding
- gap
- grid/flex properties
- typography
- border
- border radius
- box shadow
- background
- gradients only when useful
- opacity
- overflow
- object-fit
- transitions
- transforms
- focus states
- hover/active/disabled states
- media queries
- prefers-reduced-motion

Keep styles maintainable. Avoid one-off inline styles for major components.

## Theme

Create a professional National Lights design system using CSS variables/tokens for:

- primary
- secondary
- accent
- background
- surface
- text
- muted text
- border
- success
- warning
- danger
- info

Support light and dark theme architecture, while keeping the default business theme professional and high contrast.

The theme must be consistent across Company Portal and Sales/Recovery App.

## Branding / Logo

Company settings must support:

- Upload logo
- Replace logo
- Preview logo
- Remove logo
- Restore default logo
- Logo display in header
- Logo display on invoices
- Logo display on reports
- Logo display on printable documents

Store uploaded logos in managed storage, not in the database as large binary values.

Validate file type and size. Preserve a safe fallback logo if no custom logo exists.

## Invoice Creation

Invoice creation must be a real persisted transaction.

Invoice workflow:

Approved Order → Invoice Draft → Confirm/Post → Inventory Stock Out → Customer Ledger Debit → Dispatch Ready

Invoice must contain:

- Company logo
- Company details
- Invoice number
- Invoice date
- Customer ID
- Customer name
- Customer type
- Customer address/contact
- Sales/Recovery officer
- Previous balance
- SKU code
- SKU name
- Quantity
- Unit price
- Discount if applicable
- Tax if applicable
- Line amount
- Net invoice amount
- New balance
- Payment terms
- Remarks

Posted invoices must not be silently edited or deleted. Use controlled cancellation/reversal/credit-note processes.

## Invoice Print Settings

Create a configurable invoice print settings module with:

- Page size: A4, A5 and thermal/receipt where appropriate
- Portrait/landscape
- Logo position
- Show/hide logo
- Show/hide SKU code
- Show/hide barcode
- Show/hide previous balance
- Show/hide recovery
- Show/hide new balance
- Show/hide discount
- Show/hide tax
- Show/hide payment terms
- Show/hide signature areas
- Footer text
- Terms and conditions
- Number of copies
- Print margins

Provide a print preview before printing.

## Download / Print Standard

All major reports and documents must provide:

- Print
- Print preview
- PDF download
- Excel/XLSX download where tabular
- CSV download where useful
- Browser-friendly print CSS

Required document/report coverage:

- Invoice
- Customer statement
- Customer ledger
- Outstanding report
- Aging report
- Sales report
- Recovery report
- Inventory report
- Stock ledger
- SKU report
- Customer report
- Distributor report
- Dealer report
- Dispatch report
- Bility report
- GRN
- Returns report
- Damage report
- Production report
- Factory daily report
- Employee performance report
- Management dashboard export

## Printing Architecture

Create reusable print components instead of building separate print logic for every report.

Use print-specific CSS with `@media print`.

Hide application navigation and action buttons when printing.

Ensure invoice/report headers and footers repeat appropriately on multi-page documents.

Avoid cutting table rows between pages where practical.

## Export Integrity

Exports must use the same server-authoritative data as the application. Do not export from stale UI-only state.

For financial reports, include report date/time and relevant filters in the output.

## Accessibility

Support:

- Keyboard navigation
- Visible focus states
- Accessible labels
- Semantic buttons/inputs
- Adequate contrast
- Reduced motion preference
- Screen-reader-friendly status messages

## Acceptance Criteria

A screen is not considered complete unless it works on mobile, tablet and desktop and its main actions remain usable without layout breakage.

A document is not considered complete until print preview and PDF/appropriate export are verified.
