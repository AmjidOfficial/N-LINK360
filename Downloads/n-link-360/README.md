# N-LINK 360

> **One Company. One Network. One Complete View.**  
> *National Lights Integrated Sales, Recovery, Inventory & Distribution Management System*

**Company:** National Lights  
**Project Owner Email:** nationallights2026@gmail.com  
**GitHub Repository:** [https://github.com/AmjidOfficial/N-LINK360](https://github.com/AmjidOfficial/N-LINK360)  
**Default Branch:** `main`

---

## 🌟 North Star
> *“Enter information once, connect it everywhere, and let the system calculate the rest.”*

N-LINK 360 is a reliable, transaction-based business management platform designed specifically for the lighting manufacturing, distribution, and field recovery operations of **National Lights**.

---

## 🏢 Business Model Overview
National Lights manufactures lights and sells through nationwide Distributors and Dealers.

### Core Forward Supply Chain
$$\text{Factory} \longrightarrow \text{Finished Goods} \longrightarrow \text{Warehouse} \longrightarrow \text{Sales/Recovery Field Team} \longrightarrow \text{Customer Order} \longrightarrow \text{Credit/Stock Check} \longrightarrow \text{Invoice} \longrightarrow \text{Dispatch \& Bility} \longrightarrow \text{Delivery \& GRN} \longrightarrow \text{Recovery} \longrightarrow \text{Customer Ledger}$$

### Reverse Supply Chain
$$\text{Customer} \longrightarrow \text{Return/Damage Report} \longrightarrow \text{Approval} \longrightarrow \text{Inspection} \longrightarrow \text{Inventory Update} \longrightarrow \text{Credit Note} \longrightarrow \text{Customer Ledger}$$

---

## 🔑 Critical Business Rules
1. **Sales + Recovery Are ONE Unified Field Role:**
   - The same field representative handles customer visits, order booking, credit follow-ups, recovery collections, and return/damage reporting.
   - Field representatives have access only to their assigned customer portfolio.
   - Field representatives **cannot** directly edit inventory balances, posted invoices, ledger balances, or approval outcomes.
2. **Transaction-Based Inventory Engine:**
   - Stock balances are calculated projections from immutable `inventory_transactions`.
   - Formula: $\text{Opening Stock} + \text{Stock In} - \text{Stock Out} = \text{Current Stock}$.
3. **Transaction-Based Customer Ledger:**
   - Balances are derived directly from immutable ledger debits and credits.
   - Formula: $\text{Opening Balance} + \text{Debits (Invoices/Debit Notes)} - \text{Credits (Recoveries/Credit Notes)} = \text{Closing Balance}$.
4. **Authoritative Server-Side Validation:**
   - Browser totals are never trusted. All calculations, credit limit checks, and stock deductions are performed and verified on the server within atomic database transactions.

---

## 📱 Two Connected Applications
1. **Company Web Portal (Desktop / Office):**
   - For Super Admin, Management, Factory, Warehouse, Accounts, Sales Management, Dispatch/Logistics.
   - Complete ERP workflows, Masters, Invoicing, Dispatch & Bility, Recovery Verification, Ledger Reconciliation, and Business Intelligence.
2. **Sales & Recovery App (Mobile-First):**
   - Simple, fast, touch-friendly interface for field representatives.
   - Check-in/out, Order Booking, Cash/Cheque Recovery, Returns/Damage, Customer Ledgers, Follow-ups, and Performance Achievement.

---

## 🏗️ Technology Stack & Free-First Architecture
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend:** Node.js Express server with TypeScript runtime (`tsx` in dev, `esbuild` bundled CommonJS for production)
- **Database:** PostgreSQL (Free-tier Supabase PostgreSQL instance)
- **Authentication:** Supabase Auth / Secure Session Tokens
- **AI Integration:** Google AI Studio / Gemini API (Server-side proxy only)

---

## 📚 Documentation Index
Detailed technical blueprints are available in `/docs`:
- [Master Blueprint](./docs/MASTER-BLUEPRINT.md)
- [Database Schema Specification](./docs/DATABASE-SCHEMA.md)
- [System Architecture & Data Flows](./docs/SYSTEM-ARCHITECTURE.md)
- [Environment Setup & Free-Tier Guide](./docs/ENVIRONMENT-SETUP.md)
- [Development Roadmap & Phase Checklist](./docs/DEVELOPMENT-ROADMAP.md)

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Run Development Server
```bash
npm run dev
```
The server will bind to `0.0.0.0:3000`.

### Run Test Suite
```bash
npm test
```
