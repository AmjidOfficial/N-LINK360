# N-LINK 360 Design System & Brand Guidelines
**National Lights (Pvt.) Ltd. Enterprise Lighting ERP**

---

## 1. Brand Essence
- **Core Concept**: *"Control the Business. Power the Growth."*
- **Aesthetic**: Illumination, technical precision, energetic warmth, industrial reliability, high-contrast legibility, and modern manufacturing control.
- **Reference**: [nationallight.pk](https://nationallight.pk/)

---

## 2. Color Palette
- **Primary Navy**: `#0B132B` (Core brand, high-contrast UI shell)
- **Illumination Amber**: `#F59E0B` (Accent, highlights, primary CTAs)
- **Tech Slate Background**: `#F8FAFC` (Light mode base canvas)
- **Dark Space Canvas**: `#070D1F` (Dark mode base canvas)
- **Status Indicators**:
  - Emerald (`#10B981`): Healthy stock, verified payments, approved orders.
  - Amber (`#F59E0B`): Pending reviews, credit checks, low stock alerts.
  - Crimson (`#EF4444`): Overdue accounts, rejected transactions, damaged stock.
  - Sky Blue (`#0284C7`): Dispatch & logistics, freight notes, system audits.

---

## 3. Light Beam Lighting Effects
Light beam effects are implemented using radial gradients to give cards and hero components an illuminated aura:
```css
.light-beam-amber {
  background: radial-gradient(circle at top right, rgba(245, 158, 11, 0.08), transparent 50%);
}
.light-beam-emerald {
  background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 50%);
}
```

---

## 4. Typography Scale
- **Display**: 32px / Bold / Tracking -0.02em
- **H1 Page Title**: 24px / Bold / Tracking -0.01em
- **H2 Section Title**: 18px / Semibold
- **KPI Value**: 28px / Black / Tabular Numbers
- **Table Text**: 13px / Medium
- **Badges & Labels**: 11px / Bold / Tracking +0.05em Uppercase

---

## 5. Super Admin Master Architecture
The Super Admin Master Control Center provides full configuration for:
1. **Organization Hierarchy**: Company $\rightarrow$ Business Heads $\rightarrow$ Regions $\rightarrow$ Zones $\rightarrow$ Territories $\rightarrow$ Routes
2. **Product Catalog**: Brands $\rightarrow$ Products $\rightarrow$ SKUs $\rightarrow$ Units & Packaging Conversions
3. **Commercial Pricing**: Price Lists (Distributor / Dealer / Retail) with versioning and approval gates
4. **Channel Master**: Distributors $\rightarrow$ Dealerships $\rightarrow$ Addas & Transporters
5. **Inventory & Logistics**: Multi-warehouse mapping, vehicle fleet & driver assignments
6. **Data Health & Ingestion**: Excel batch processing with duplicate resolution and audit trail
