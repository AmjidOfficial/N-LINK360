# N-LINK-360 VS. SALESPULSE REFERENCE COMPARISON & INTEGRATION MAPPING

## 1. Context & Objectives

This document compares N-LINK-360 with the SalesPulse reference architecture to identify adopted UI/UX patterns, database mapping refinements, and structural improvements while preserving N-LINK-360's authoritative financial invariants.

---

## 2. Feature & Architecture Mapping

| Feature / Domain | N-LINK-360 Baseline | SalesPulse Reference Pattern | Integrated Master Standard |
|---|---|---|---|
| **Mobile Dock Navigation** | Dark heavy dock container | Floating White Dock with 4 Destinations | **SalesPulse Floating White Dock**: Home, Dashboard, Order, Profile |
| **Mobile Default Active View** | Customer Shop List | Immediate Order Booking Entry | **Order Booking View** set as default launch tab |
| **Financial Ledger Engine** | Real-time double-entry formula | Single-entry spreadsheet tracking | **Double-Entry Ledger Engine** with strict 15% trade discount math |
| **Approval Hierarchy** | Sole executive authority (Shahzad Ullah) | General admin role flag | **Sole Executive Signing Authority** (Shahzad Ullah) + Dual approval security |
| **Google Sheets Integration** | Manual export/import | Automated 2-way Webhook Sync | **Automated Bidirectional Google Sheets Engine** with validation queue |
| **Offline Resilience** | Browser state memory | IndexedDB offline transaction queue | **Durable IndexedDB Queue** with idempotency keys & auto-resync |

---

## 3. Retained & Adopted Decisions

1. **Retained from N-LINK-360**:
   - Sole Executive Approver authority (Shahzad Ullah).
   - 15% trade discount calculation on SKU-itemized commercial invoices.
   - Minimum trade price floor enforcement.
   - Dispatch-time auto-invoicing.
2. **Adopted from SalesPulse**:
   - Clean, high-contrast floating white bottom navigation dock.
   - Direct Order Booking entry on mobile app launch.
   - 2-Way automated Google Sheets synchronization via Webhooks.
