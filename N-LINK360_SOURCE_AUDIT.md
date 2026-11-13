# N-LINK-360 COMPLETE SOURCE AUDIT & CODEBASE INVENTORY

## 1. Executive Summary & Audit Overview

This document presents a comprehensive audit of the N-LINK-360 codebase, mapping all existing components, services, database interfaces, security boundaries, and financial formulas.

- **Application Stack**: React 18, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons, Supabase JS Client, IndexedDB local persistence.
- **Sole Executive Signing Authority**: Shahzad Ullah (`nationallights2026@gmail.com`).
- **Target Platform**: Multi-experience PWA (Field Mobile Touch App + Desktop Head Office Command Center + Dealer Portal).

---

## 2. Source Inventory & File Structure

### Key Directories
- `/src/components/creditbook/`: Mobile PWA touch views, Customer 360, Order & Recovery entry drawers, Customer Invoices, and Customer Ledgers.
- `/src/components/headoffice/`: Head Office Desktop ERP Command Center, Town Management, Operational Dispatch & Auto-Invoice Modal.
- `/src/components/dashboard/`: Executive dashboards, Bento analytics grids, Financial trend charts, and Mini calendar widgets.
- `/src/components/stitch/`: Enterprise bottom floating white dock (`EnterpriseBottomNav`), Rate list modal, Invoice PDF preview modal.
- `/src/data/`: Official SKU product catalog (`nlink-products.ts`), Verified team roster (`nlink-users-team.ts`), Pakistan geography & beat routes (`pakistan-geography.ts`), Seed ledger data (`seed-ledger-data.ts`).
- `/src/services/`: Supabase data handlers (`supabase-data.ts`, `supabase-transactions.ts`), Two-way Google Sheets sync engine (`googleSheetsTwoWaySyncService.ts`), Attendance tracker (`attendance.ts`), Town management (`townManagement.ts`), Production user guards (`production-users.ts`).
- `/src/utils/`: Export PDF engines (`exportInvoicePdf.ts`, `exportLedgerPdf.ts`), Purge mock data utility (`purgeMockData.ts`), Device detection (`deviceDetection.ts`), Haptics engine (`haptics.ts`).

---

## 3. Financial Invariants & Business Logic Audit

1. **Double-Entry Dealer Ledger Rule**:
   - `Closing Balance = Opening Balance + Total Approved Invoices - Total Verified Recoveries`
   - Unverified recovery records in `PENDING` status do **NOT** credit the official dealer ledger.
2. **Dispatch-Time Invoicing**:
   - Commercial invoices are generated upon dispatch based strictly on loaded SKU quantities.
   - 15% trade discount applied to gross SKU total: `Net Invoice Payable = Gross Subtotal * (1 - 0.15)`.
3. **Executive Approval Hierarchy**:
   - Sole signing authority rests with Shahzad Ullah. Non-authorized accounts or field users attempting transaction confirmation are blocked by `assertAuthorizedApprover`.

---

## 4. Verification Results

- Unit & Integration Test Suite: 163 tests passed across 17 modules.
- TypeScript Static Analysis: 0 compilation errors (`tsc --noEmit`).
- Dev Server Status: Port 3000 online and active.
