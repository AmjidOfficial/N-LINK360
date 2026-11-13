# N-LINK-360 QA AUTOMATION & TEST PLAN

## 1. Test Suite Coverage

N-LINK-360 includes 163 unit and integration tests across 17 test modules (`npm test`):

1. **Authentication & User Hierarchy Tests**: Verifies role permissions, email OTP binding, and session security.
2. **Dealer Directory & Credit Limit Tests**: Validates credit limit utilization, overdue aging locks, and geofencing.
3. **Order Entry & Discount Tests**: Verifies 15% trade discount calculation, minimum trade price floor enforcement, and SKU carton conversions.
4. **Recovery & Verification Queue Tests**: Enforces that unverified recoveries do NOT credit dealer ledgers until authorized confirmation.
5. **Double-Entry Financial Ledger Tests**: Audit formula `Closing = Opening + Invoices - Recoveries`.
6. **Executive Signing Authority Tests**: Strictly verifies Shahzad Ullah sole executive signing permission.
7. **Midnight Cutoff & Google Sheets Tests**: Validates daily 11:59 PM session expiration and Google Sheets webhook payloads.

---

## 2. Test Execution Command

```bash
npm test
```
Result: 163 Passed, 0 Failed across all 17 modules.
