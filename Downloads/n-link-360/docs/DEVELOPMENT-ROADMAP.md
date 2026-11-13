# N-LINK 360: DEVELOPMENT ROADMAP & PHASE TRACKER

**Company:** National Lights  
**Standard:** Phase-by-phase gated progression. Each phase must pass automated integrity tests before advancing.

---

## 📅 Phased Implementation Plan

### 🚀 Phase 0: Foundation (Current Phase)
- [x] Master Blueprint documentation (`MASTER-BLUEPRINT.md`, `DATABASE-SCHEMA.md`, `SYSTEM-ARCHITECTURE.md`)
- [x] Environment configuration (`.env.example`, `ENVIRONMENT-SETUP.md`)
- [x] Database schema DDL & migration scripts (`/database/migrations/001_initial_schema.sql`)
- [x] Development synthetic seed dataset (`/database/seed/dev_seed.sql`)
- [x] TypeScript domain type definitions & business interfaces (`/src/types/`)
- [x] Core transaction calculation engines (Inventory, Credit, Customer Ledger)
- [x] Unified Dual-App Shell (Company Web Portal + Sales & Recovery Mobile App)
- [x] Automated unit test suite verifying zero-corruption calculations

---

### 📦 Phase 1: Identity & Masters Management
- [ ] Multi-Role Authentication (Supabase Auth / Session tokens)
- [ ] User & Role Permission Management (RBAC)
- [ ] Company, Branch, Factory, Warehouse masters CRUD
- [ ] Product Categories, Brands, Products, and SKUs catalog
- [ ] Customer Master with Credit Limit, Credit Days & Geo-coordinates
- [ ] Sales Team Portfolio Assignment Engine

---

### 🏭 Phase 2: Production & Inventory Engine
- [ ] Production Batch Planning & Factory Work Orders
- [ ] Quality Control (QC) Approvals and Finished Goods Receipt
- [ ] Warehouse Stock In / Stock Out Movements
- [ ] Inter-Warehouse Transfers & Approvals
- [ ] Physical Stock Count Adjustments (`ADJUSTMENT_IN` / `ADJUSTMENT_OUT`)
- [ ] Real-time Stock Ledger with Transaction Audit Trail

---

### 📱 Phase 3: Sales & Recovery Field App
- [ ] Mobile-first dashboard for field officers
- [ ] Assigned Customer List & Live Balance Overview
- [ ] GPS Customer Visit Check-in / Check-out with Notes
- [ ] Field Order Booking with live stock check & pricing calculations
- [ ] Recovery Collection logging (Cash, Cheque, Bank Transfer) with receipt capture
- [ ] Reverse Logistics: Field Return & Damage claims logging
- [ ] Personal Sales & Recovery KPI Performance tracker

---

### 📑 Phase 4: Order to Invoice & Customer Ledger
- [ ] Credit Limit & Overdue Aging automated assessment (Green / Amber / Red)
- [ ] Sales Manager Order Review & Approval Workflow
- [ ] Atomic Invoice Posting Pipeline (Stock Decrement + Ledger Debit + Balance Snapshot)
- [ ] Printable PDF Invoices, Delivery Notes, and Sales Order Confirmations

---

### 🚚 Phase 5: Logistics, Dispatch & GRN
- [ ] Dispatch Planning & Cargo Consolidation
- [ ] Transporter, Vehicle, Driver, Adda, and Bility Assignment
- [ ] Freight & Surcharge calculation
- [ ] Real-time Transit Status tracking (Loaded, In-Transit, Delivered)
- [ ] Goods Receipt Note (GRN) discrepancy recording (Shortage, Excess, Damage)

---

### 💰 Phase 6: Accounts, Recovery & Ledger Reconciliation
- [ ] Accounts Recovery Verification & Instrument Reconciliation
- [ ] Customer Statement & Dynamic Aging Analysis (0-30, 31-60, 61-90, 90+ days)
- [ ] Credit Note & Debit Note issuance workflows
- [ ] Bank & Cash Account Reconciliation

---

### 🔄 Phase 7: Reverse Logistics & Damage Handling
- [ ] Customer Return inspection & grading (Saleable vs. Defective)
- [ ] Approved Return stock reintegration (`RETURN_IN`) & Credit Note generation
- [ ] Damaged Stock quarantine, repair, scrap, or warranty replacement workflow

---

### 📊 Phase 8: Executive Intelligence & Analytics
- [ ] Management KPI Cockpit: Sales MTD/YTD, Recovery Rate, Overdue Risk
- [ ] Regional, Area, and Field Officer Performance Leaderboards
- [ ] SKU Velocity & Dead Stock Analytics
- [ ] Customer Retention & Churn Risk Insights

---

### 🔔 Phase 9: Notifications & Real-Time Alerts
- [ ] In-App Alert System (Low Stock, Credit Breaches, Pending Approvals, Recovery Verifications)
- [ ] Notification preferences & audit history

---

### 🛡️ Phase 10: Production Hardening & Pilot Launch
- [ ] Complete End-to-End Test Suite Execution
- [ ] Database Security Audit & Row-Level-Security (RLS) policies verification
- [ ] Production Backup/Restore verification
- [ ] Controlled Pilot rollout at National Lights pilot branch
