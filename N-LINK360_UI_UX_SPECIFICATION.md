# N-LINK-360 UI/UX DESIGN SPECIFICATION & DESIGN SYSTEM

## 1. Design Philosophy & Constitution

N-LINK-360 strictly adheres to the Universal Frontend Design Constitution:
- **Zero-Pill Discipline**: Metadata rendered as clean inline text with `·` typographic separators instead of candy-colored badge capsules.
- **Typographic Hierarchy**: Headers paired in `Plus Jakarta Sans`, body prose in `DM Sans`, financial ledgers and data numbers strictly in `font-mono tabular-nums`.
- **60-30-10 Color Budget**:
  - 60% Neutral Canvas (`bg-slate-100 dark:bg-slate-950`).
  - 30% Structural Surfaces (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`).
  - 10% High-Intent Accents (`#006948` Emerald brand, `#16A34A` Green verified, `#D97706` Amber pending, `#DC2626` Red overdue).

---

## 2. Multi-Experience Layouts

1. **Mobile Field Touch App (`FieldMobileExperience.tsx`)**:
   - SalesPulse-inspired floating white dock with 4 destinations: Home, Dashboard, Order, Profile.
   - Initial launch tab set to `Order` (Order Booking) for immediate field entry.
   - Large touch hitboxes ($\ge 44 \times 44\text{px}$) and tactile haptic feedback.
2. **Head Office Desktop ERP (`HeadOfficeExperience.tsx`)**:
   - 256px fixed sidebar + top contextual bar + multi-domain tabs.
   - Real-time bento cards, financial trend charts, and modal drawers.
3. **Dealer / Distributor Portal**:
   - Responsive shop view with 1-tap WhatsApp statement export and PDF download.
