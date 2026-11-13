# N-LINK-360 SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATION

## 1. System Overview

N-LINK-360 is built on a responsive multi-experience frontend (React 18 + Vite + Tailwind CSS v4) communicating with a Supabase PostgreSQL backend and a 2-Way Google Sheets synchronization layer.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      N-LINK-360 SYSTEM ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
┌──────────────┐          ┌─────────────────┐          ┌──────────────────┐
│ Mobile PWA   │          │  Desktop ERP    │          │  Dealer Portal   │
│ (Field Officer│          │ Command Center  │          │ (Retailer Access)│
└──────┬───────┘          └────────┬────────┘          └────────┬─────────┘
       │                           │                            │
       └─────────────────────┬─────┴────────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  Unified Auth & Role Guard  │
              └──────────────┬──────────────┘
                             │
       ┌─────────────────────┴─────────────────────┐
       ▼                                           ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  IndexedDB Offline Engine    │        │  Supabase Real-Time Backend  │
│  & Idempotent Sync Queue     │◄──────►│  - Auth & User Profiles      │
└──────────────────────────────┘        │  - Financial Ledger & Rules  │
                                        │  - RLS Security Policies     │
                                        └──────────────┬───────────────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────────┐
                                        │  Google Sheets 2-Way Sync    │
                                        │  - Automated Sheet Webhook   │
                                        │  - Validation Approval Queue │
                                        └──────────────────────────────┘
```

---

## 2. Core Architecture Layers

1. **User Interface Layer**:
   - Mobile Field PWA (`FieldMobileExperience.tsx`) for high-speed touch entry and GPS visit check-ins.
   - Head Office Command Center (`HeadOfficeExperience.tsx`) with multi-domain tabs (Overview, Approvals, Sales, Finance, Inventory, Dispatch, Reports, Settings).
   - Dealer / Distributor Portal for retailer statement tracking and WhatsApp order placement.
2. **Data & Persistence Layer**:
   - Supabase PostgreSQL database for authoritative persistence.
   - IndexedDB local storage engine (`offlineQueueStore.ts`) for offline transaction durability.
3. **Integration Layer**:
   - Google Sheets 2-Way sync engine (`googleSheetsTwoWaySyncService.ts`) for real-time spreadsheet mirroring.
   - PDF generation engine (`exportInvoicePdf.ts`, `exportLedgerPdf.ts`) for commercial bills and account statements.
