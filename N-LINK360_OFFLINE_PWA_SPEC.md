# N-LINK-360 OFFLINE PWA & INDEXEDDB SPECIFICATION

## 1. Offline Architecture

N-LINK-360 provides field operation durability during cellular connectivity loss:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     OFFLINE PWA DURABILITY QUEUE                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Event Trigger     │ IndexedDB Action  │ Network Resync                 │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Field Check-In    │ Store GPS Lat/Lng │ Auto-sync on network restore   │
│ Order Booking     │ Queue Draft Order │ Post order & notify Accounts   │
│ Recovery Wasooli  │ Queue Cash Slip   │ Post recovery as PENDING       │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 2. Technical Mechanisms

1. **Service Worker & Manifest**:
   - `manifest.json` defines installable standalone PWA assets, icons, and theme color (`#0F172A`).
2. **IndexedDB Local Storage Cache**:
   - `saveLocalDatabaseCache()` persists customers, orders, recoveries, and town nodes locally.
   - Restored automatically on app launch.
3. **Idempotent Queue Resync**:
   - Outbound transactions generated with unique idempotency keys (`idempotencyKey = UUID`).
   - `useOnlineStatus` hook monitors network status and auto-flushes queued items when connection restores.
