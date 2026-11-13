# N-LINK-360 ROLE & PERMISSION MATRIX

## 1. Role Hierarchy & Access Boundaries

N-LINK-360 enforces strict separation of duties across 8 operational roles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROLE PERMISSION MATRIX                          │
├──────────────────┬──────────────┬──────────────┬──────────────┬────────┤
│ Role             │ Book Orders  │ Log Recovery │ Approve Post │ Admin  │
├──────────────────┼──────────────┼──────────────┼──────────────┼────────┤
│ Field Officer    │ ✅           │ ✅ (Pending) │ ❌           │ ❌     │
│ Order Booker     │ ✅           │ ❌           │ ❌           │ ❌     │
│ Recovery Officer │ ❌           │ ✅ (Pending) │ ❌           │ ❌     │
│ Accounts Officer │ View         │ Verify       │ Verify       │ ❌     │
│ Warehouse        │ Fulfill      │ ❌           │ ❌           │ ❌     │
│ Executive (Shahzad)│ ✅           │ ✅           │ 👑 Sole Auth │ ✅     │
│ Admin / Dev      │ View         │ View         │ ❌           │ ✅     │
│ Dealer Retailer  │ Self-Book    │ Upload Slip  │ ❌           │ ❌     │
└──────────────────┴──────────────┴──────────────┴──────────────┴────────┘
```

---

## 2. Key Access Rules

1. **Sole Signing Authority**:
   - Only Shahzad Ullah (`nationallights2026@gmail.com`) can authorize financial posts, invoice discount overrides, and recovery credits.
   - Checked via `isAuthorizedApproverEmail(email)` in `production-users.ts`.
2. **Dealer Account Isolation**:
   - Retail dealers accessing the Dealer Portal can only view their own ledger transactions, active orders, and downloadable invoice PDFs.
   - Enforced client-side and via Supabase Row Level Security (RLS) policies.
