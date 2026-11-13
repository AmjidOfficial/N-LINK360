# N-LINK-360 2-WAY GOOGLE SHEETS INTEGRATION SPECIFICATION

## 1. Integration Objectives & Architecture

Google Sheets serves as a mirrored operational spreadsheet for N-LINK-360 while Supabase PostgreSQL remains the single source of truth.

---

## 2. Synchronization Engines

1. **Outbound Push Sync (`google-sheets.ts`)**:
   - `syncToGoogleSheetsWebhook(url, appData)` serializes dealers, orders, recoveries, and inventory balances into JSON payloads.
   - Pushed automatically on transaction events and via 60-second background heartbeat.
2. **Inbound Pull & Reconciliation (`liveGoogleSheetSync.ts`)**:
   - Fetches live Google Sheet tabs via public GViz JSON endpoint.
   - Maps sheet rows to `Customer`, `SalesOrder`, `Recovery`, and `LedgerEntry` models.
   - Merges records idempotently preserving local executive approval statuses.
3. **Two-Way Reconciliation (`googleSheetsTwoWaySyncService.ts`)**:
   - Handles conflict resolution, duplicate protection, and audit logging.
