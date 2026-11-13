# N-LINK 360: Excel & CSV Master Data Import Guide

To facilitate smooth transitions and onboarding of massive datasets, N-LINK 360 features a modular, multi-step Excel/CSV import pipeline.

---

## 🚦 The Safe Import Pipeline
To ensure high-integrity database records, the application strictly forbids direct Excel-to-production writes. Instead, all files are staged, sanitized, and audited:

```
[UPLOAD CSV] ──► [STAGE IN import_rows] ──► [VALIDATE CHECKS]
                                                   │
   ┌───────────────── CONFIRM ─────────────────────┴──── FAILED
   ▼                                                      ▼
[IMPORT TO TABLES]                                [GENERATE ERROR REPORT]
   │
   ▼
[WRITE import_audit]
```

---

## 📄 Staging Database Structure

### 1. **`import_batches`**
Registers the file metadata, importing category, and final row count:
* `id` (UUID)
* `batch_code` (Unique file sequence)
* `import_type` (`EMPLOYEES`, `REGIONS`, `ZONES`, `AREAS`, `TERRITORIES`, `TOWNS`, `ROUTES`, `CUSTOMERS`, `SKUS`, `PRICES`)
* `status` (`PENDING`, `VALIDATING`, `VALIDATED`, `IMPORTING`, `COMPLETED`, `FAILED`)

### 2. **`import_rows`**
Temporarily parses spreadsheet lines into structured JSONB columns:
* `row_index`: Index of line in the uploaded file (for tracking errors).
* `row_data`: Comprehensive JSON payload of columns.

### 3. **`import_errors`**
Stores precise schema or relationship violations discovered during analysis:
* `row_index`: Pinpoints the exact row in the Excel sheet.
* `column_name`: Name of the failing spreadsheet column.
* `error_message`: Cause of validation failure (e.g., `Missing required code`, `Referenced Brand ID does not exist`).

### 4. **`import_audit`**
Maintains logs of who confirmed the upload and when it completed.

---

## 📐 Template & Column Requirements

### 1. Customers Import (`CUSTOMERS`)
| Column Header | Data Type | Required? | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `customer_code` | Text | **Yes** | Human-readable unique ID (e.g. `CUST-DLR-012`) |
| `customer_type` | Enum | **Yes** | Must be: `DISTRIBUTOR`, `DEALER`, `SHOP`, or `OTHER` |
| `name` | Text | **Yes** | Registered company/shop name |
| `owner_name` | Text | No | Owner's first/last name |
| `mobile` | Text | **Yes** | Phone number with country code (e.g. `+923001234567`) |
| `address` | Text | **Yes** | Shop physical address |
| `city` | Text | **Yes** | Customer city |
| `route_code` | Text | **Yes** | References a valid Route Code in `routes` |
| `credit_limit` | Decimal | No | Numerical value (defaults to `0.00`) |
| `opening_balance`| Decimal | No | Opening ledger debit balance |

### 2. Products & SKUs Import (`SKUS`)
| Column Header | Data Type | Required? | Constraints |
| :--- | :--- | :--- | :--- |
| `sku_code` | Text | **Yes** | Unique catalog code |
| `sku_name` | Text | **Yes** | Descriptive item name |
| `barcode` | Text | No | Unique GTIN/EAN code |
| `product_code`| Text | **Yes** | Parent product relationship |
| `trade_price` | Decimal | **Yes** | Base trade invoice price |
| `sale_price` | Decimal | **Yes** | Retail sale price |
| `reorder_level`| Decimal | No | Reorder warning threshold |
