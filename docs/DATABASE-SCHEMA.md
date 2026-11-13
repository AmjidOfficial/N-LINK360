# N-LINK 360: DATABASE SCHEMA SPECIFICATION

**Database Engine:** PostgreSQL 15+ / Supabase  
**Conventions:**
- Primary Keys: `UUID` generated via `gen_random_uuid()`
- Business Identifiers: Unique human-readable codes (e.g., `ORD-2026-0001`, `INV-2026-0001`, `REC-2026-0001`, `BIL-2026-0001`)
- Money: `NUMERIC(15, 2)`
- Stock Quantities: `NUMERIC(12, 2)`
- Auditing: All master tables contain `created_at`, `updated_at`, `created_by`, and `is_active` (soft delete).

---

## 1. Organization Domain
- `companies`: id, code, name, tax_number, email, phone, address, currency, created_at, updated_at
- `branches`: id, company_id (FK), code, name, city, region, address, phone, is_active, created_at, updated_at
- `factories`: id, company_id (FK), branch_id (FK), code, name, address, contact_person, phone, is_active, created_at
- `warehouses`: id, company_id (FK), branch_id (FK), code, name, type (CENTRAL, REGIONAL, TRANSIT, DAMAGE), address, is_active, created_at

## 2. Security & RBAC Domain
- `roles`: id, code (SUPER_ADMIN, MANAGEMENT, FACTORY_MANAGER, WAREHOUSE_MANAGER, ACCOUNTS, SALES_MANAGER, SALES_RECOVERY, DISPATCH_OFFICER), name, description, is_system, created_at
- `permissions`: id, code (e.g. `order.create`, `order.approve`, `invoice.post`, `recovery.verify`, `inventory.adjust`), module, description, created_at
- `role_permissions`: role_id (FK), permission_id (FK), created_at (Composite PK)
- `users`: id, email (UNIQUE), full_name, phone, role_id (FK), branch_id (FK), is_active, last_login_at, created_at, updated_at
- `audit_logs`: id, user_id (FK), action, module, record_type, record_id, previous_state (JSONB), new_state (JSONB), ip_address, user_agent, created_at
- `notifications`: id, user_id (FK), title, message, type (INFO, WARNING, ALERT, SUCCESS), reference_module, reference_id, is_read, read_at, created_at

## 3. Products & SKUs Domain
- `product_categories`: id, code, name, description, is_active, created_at
- `brands`: id, code, name, is_active, created_at
- `products`: id, category_id (FK), brand_id (FK), code, name, description, unit_of_measure, is_active, created_at
- `skus`: id, product_id (FK), sku_code (UNIQUE), barcode, name, wattage, color_temperature, voltage, packaging_unit, carton_quantity, trade_price, retail_price, minimum_price, reorder_level, is_active, created_at

## 4. Sales Field Team & Customers Domain
- `sales_users`: id, user_id (FK, UNIQUE), employee_code, sales_region, sales_area, target_monthly_sales, target_monthly_recovery, is_active, created_at
- `customers`: id, customer_code (UNIQUE), company_name, contact_person, phone, email, type (DISTRIBUTOR, DEALER), tax_number, cnic, address, city, region, credit_limit, credit_days, opening_balance, current_balance, is_credit_locked, is_active, created_at, updated_at
- `customer_assignments`: id, customer_id (FK), sales_user_id (FK), assigned_from, assigned_to, is_active, created_at
- `customer_visits`: id, customer_id (FK), sales_user_id (FK), checkin_time, checkout_time, latitude, longitude, purpose, notes, order_placed (BOOLEAN), recovery_collected (BOOLEAN), next_followup_date, created_at

## 5. Production & Inventory Domain
- `production_batches`: id, factory_id (FK), batch_number (UNIQUE), start_date, completion_date, supervisor_id (FK), status (PLANNED, IN_PROGRESS, COMPLETED, QC_PASSED, REJECTED), qc_notes, created_at
- `production_items`: id, batch_id (FK), sku_id (FK), planned_quantity, produced_quantity, rejected_quantity, unit_cost, created_at
- `inventory_transactions`: id, transaction_number (UNIQUE), transaction_type (PRODUCTION_IN, SALES_OUT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN, DAMAGE_OUT, DAMAGE_RECOVERY, ADJUSTMENT_IN, ADJUSTMENT_OUT), warehouse_id (FK), sku_id (FK), quantity, unit_price, reference_module (PRODUCTION, INVOICE, TRANSFER, RETURN, DAMAGE, ADJUSTMENT), reference_id, notes, created_by (FK), created_at
- `inventory_balances`: id, warehouse_id (FK), sku_id (FK), quantity_on_hand, quantity_reserved, quantity_damaged, last_updated_at (UNIQUE warehouse_id + sku_id)

## 6. Sales Orders & Invoicing Domain
- `sales_orders`: id, order_number (UNIQUE), customer_id (FK), sales_user_id (FK), order_date, status (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, PARTIALLY_APPROVED, ON_HOLD, REJECTED, INVOICED, CANCELLED), subtotal, discount_amount, tax_amount, total_amount, credit_check_status (GREEN, AMBER, RED), credit_check_notes, approved_by (FK), approved_at, rejection_reason, created_at, updated_at
- `sales_order_items`: id, order_id (FK), sku_id (FK), ordered_quantity, approved_quantity, unit_price, discount_percent, line_total, created_at
- `invoices`: id, invoice_number (UNIQUE), order_id (FK), customer_id (FK), invoice_date, due_date, status (POSTED, PAID, PARTIALLY_PAID, CANCELLED), subtotal, discount_amount, tax_amount, total_amount, previous_balance, new_balance, payment_status, printed_at, created_by (FK), created_at
- `invoice_items`: id, invoice_id (FK), sku_id (FK), quantity, unit_price, discount_amount, tax_amount, line_total, created_at

## 7. Logistics & Dispatch Domain
- `transporters`: id, code, name, contact_person, phone, address, is_active, created_at
- `addas`: id, name, city, location_address, contact_phone, is_active, created_at
- `vehicles`: id, transporter_id (FK), vehicle_number, vehicle_type, driver_name, driver_phone, is_active, created_at
- `drivers`: id, transporter_id (FK), name, phone, license_number, cnic, is_active, created_at
- `dispatches`: id, dispatch_number (UNIQUE), warehouse_id (FK), transporter_id (FK), vehicle_id (FK), driver_id (FK), adda_id (FK), bility_number, dispatch_date, expected_delivery_date, actual_delivery_date, freight_charges, other_charges, status (PENDING, LOADED, IN_TRANSIT, DELIVERED, RETURNED), gate_pass_number, remarks, created_by (FK), created_at
- `goods_receipts`: id, grn_number (UNIQUE), dispatch_id (FK), invoice_id (FK), customer_id (FK), received_date, received_by_name, status (VERIFIED, DISCREPANCY, REJECTED), inspection_notes, created_at
- `goods_receipt_items`: id, grn_id (FK), sku_id (FK), invoiced_quantity, received_quantity, short_quantity, excess_quantity, damaged_quantity, remarks, created_at

## 8. Accounts & Customer Ledger Domain
- `recoveries`: id, recovery_number (UNIQUE), customer_id (FK), sales_user_id (FK), collection_date, amount, payment_mode (CASH, CHEQUE, ONLINE_TRANSFER, PAY_ORDER), instrument_number, bank_name, instrument_date, proof_attachment_url, status (PENDING_VERIFICATION, VERIFIED, REJECTED), verified_by (FK), verified_at, rejection_reason, remarks, created_at
- `ledger_entries`: id, entry_number (UNIQUE), customer_id (FK), entry_date, transaction_type (OPENING_BALANCE, INVOICE, RECOVERY, CREDIT_NOTE, DEBIT_NOTE, RETURN_ADJUSTMENT), reference_module, reference_id, debit_amount, credit_amount, running_balance, description, created_by (FK), created_at
- `credit_notes`: id, note_number (UNIQUE), customer_id (FK), invoice_id (FK), return_id (FK), date, amount, reason, status (DRAFT, APPROVED, POSTED, CANCELLED), approved_by (FK), created_at
- `debit_notes`: id, note_number (UNIQUE), customer_id (FK), date, amount, reason, status (DRAFT, APPROVED, POSTED, CANCELLED), approved_by (FK), created_at

## 9. Reverse Logistics & Damage Domain
- `stock_returns`: id, return_number (UNIQUE), customer_id (FK), sales_user_id (FK), invoice_id (FK), request_date, status (REPORTED, WAREHOUSE_RECEIVED, INSPECTED, APPROVED, REJECTED, CREDIT_NOTE_ISSUED), inspection_result (SALEABLE, DAMAGED, SCRAP), total_claimed_amount, total_approved_amount, credit_note_id (FK), inspected_by (FK), inspected_at, created_at
- `stock_return_items`: id, return_id (FK), sku_id (FK), claimed_quantity, received_quantity, approved_quantity, unit_price, reason, condition_notes, photo_url, created_at
- `damage_stock`: id, damage_number (UNIQUE), warehouse_id (FK), sku_id (FK), quantity, unit_cost, source_type (PRODUCTION, TRANSIT, CUSTOMER_RETURN, WAREHOUSE_HANDLING), source_reference_id, resolution_type (PENDING, REPAIR, SCRAP, REPLACEMENT, CREDIT_NOTE), resolved_at, resolved_by (FK), created_at
