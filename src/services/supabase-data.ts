import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Customer, CustomerVisit, Dispatch, InventoryBalance, Invoice, LedgerEntry, Recovery, SalesOrder, SKU, StockReturn, User } from '../types';

export interface SupabaseAppData {
  customers: Customer[];
  skus: SKU[];
  inventoryBalances: InventoryBalance[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  recoveries: Recovery[];
  ledgerEntries: LedgerEntry[];
  dispatches: Dispatch[];
  stockReturns: StockReturn[];
  visits: CustomerVisit[];
}

export const emptyData: SupabaseAppData = {
  customers: [], skus: [], inventoryBalances: [], salesOrders: [], invoices: [],
  recoveries: [], ledgerEntries: [], dispatches: [], stockReturns: [], visits: [],
};

const n = (v: unknown) => Number(v ?? 0);
const rows = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export async function loadSupabaseAppData(currentUser: User): Promise<SupabaseAppData> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production database is not configured. Configure Supabase before using N-LINK 360.');
  }

  const db = supabase;
  const [c, s, b, o, i, r, l, d, sr, v] = await Promise.all([
    db.from('customers').select('*').order('name'),
    db.from('skus').select('*,products(name,model,wattage)').eq('status', true).order('sku_code'),
    db.from('inventory_balances').select('*,warehouses(name),skus(sku_code,sku_name)').order('updated_at', { ascending: false }),
    db.from('sales_orders').select('*,customers(customer_code,name),employees(full_name),sales_order_items(*,skus(sku_code,sku_name))').order('created_at', { ascending: false }),
    db.from('invoices').select('*,customers(customer_code,name),invoice_items(*,skus(sku_code,sku_name))').order('created_at', { ascending: false }),
    db.from('recoveries').select('*,customers(customer_code,name),employees(full_name)').order('created_at', { ascending: false }),
    db.from('ledger_entries').select('*,customers(name)').order('entry_date', { ascending: false }),
    db.from('dispatches').select('*,invoices(invoice_code),bility(bility_code,freight,other_charges,transporters(name),vehicles(registration_no),drivers(name,mobile),addas(name))').order('dispatch_date', { ascending: false }),
    db.from('stock_returns').select('*,customers(name),employees(full_name),stock_return_items(*,skus(sku_code,sku_name))').order('created_at', { ascending: false }),
    db.from('customer_visits').select('*,customers(name),employees(full_name)').order('visit_at', { ascending: false }),
  ]);

  const results = [c, s, b, o, i, r, l, d, sr, v];
  const failed = results.find(x => x.error);
  if (failed?.error) throw new Error(`Database load failed: ${failed.error.message}`);

  const ledgerRows = rows<any>(l.data);
  const balances = new Map<string, number>();
  for (const x of [...ledgerRows].reverse()) balances.set(x.customer_id, n(x.running_balance));

  const customers: Customer[] = rows<any>(c.data).map(x => ({
    id:x.id, customerCode:x.customer_code, companyName:x.name, contactPerson:x.owner_name || '', phone:x.mobile || '',
    email:x.email || undefined, type:x.customer_type, taxNumber:x.ntn || x.tax_number || undefined, cnic:x.cnic || undefined,
    address:x.address || '', city:x.city || '', region:x.region || x.area || x.territory || '', creditLimit:n(x.credit_limit),
    creditDays:n(x.credit_days), openingBalance:n(x.opening_balance), currentBalance:balances.get(x.id) ?? n(x.opening_balance),
    isCreditLocked:Boolean(x.credit_locked), isActive:Boolean(x.status), createdAt:x.created_at, updatedAt:x.updated_at,
  }));

  const skus: SKU[] = rows<any>(s.data).map(x => ({
    id:x.id, productId:x.product_id, productName:x.products?.name, skuCode:x.sku_code, barcode:x.barcode, name:x.sku_name,
    wattage:x.products?.wattage, packagingUnit:x.packing_unit, cartonQuantity:n(x.units_per_carton), tradePrice:n(x.trade_price),
    retailPrice:n(x.sale_price), minimumPrice:n(x.dealer_price), reorderLevel:n(x.reorder_level), isActive:Boolean(x.status),
  }));
  const skuMap = new Map(skus.map(x => [x.id, x]));

  const inventoryBalances: InventoryBalance[] = rows<any>(b.data).map(x => ({
    id:x.id, warehouseId:x.warehouse_id, warehouseName:x.warehouses?.name, skuId:x.sku_id, skuCode:x.skus?.sku_code,
    skuName:x.skus?.sku_name || skuMap.get(x.sku_id)?.name, quantityOnHand:n(x.qty), quantityReserved:n(x.qty_reserved),
    quantityDamaged:n(x.qty_damaged), availableQuantity:n(x.qty_available ?? x.qty), lastUpdatedAt:x.updated_at,
  }));

  const salesOrders: SalesOrder[] = rows<any>(o.data).map(x => ({
    id:x.id, orderNumber:x.order_code, customerId:x.customer_id, customerName:x.customers?.name || '', customerCode:x.customers?.customer_code || '',
    salesUserId:x.employee_id, salesUserName:x.employees?.full_name || '', orderDate:x.order_date, status:x.status,
    items:rows<any>(x.sales_order_items).map(it => ({ id:it.id, orderId:x.id, skuId:it.sku_id, skuCode:it.skus?.sku_code || skuMap.get(it.sku_id)?.skuCode || '', skuName:it.skus?.sku_name || skuMap.get(it.sku_id)?.name || '', orderedQuantity:n(it.order_qty), approvedQuantity:n(it.approved_qty), unitPrice:n(it.unit_price), discountPercent:n(it.discount_percent), lineTotal:n(it.line_amount) })),
    subtotal:n(x.requested_amount), discountAmount:n(x.discount_amount), taxAmount:n(x.tax_amount), totalAmount:n(x.total_amount ?? x.requested_amount),
    creditCheckStatus:x.credit_check_status || (x.status === 'ON_HOLD' ? 'AMBER' : 'GREEN'), creditCheckNotes:x.remarks || undefined, createdAt:x.created_at,
  }));

  const invoices: Invoice[] = rows<any>(i.data).map(x => ({
    id:x.id, invoiceNumber:x.invoice_code, orderId:x.order_id || undefined, customerId:x.customer_id, customerName:x.customers?.name || '', customerCode:x.customers?.customer_code || '',
    invoiceDate:x.invoice_date, dueDate:x.due_date || x.invoice_date, status:x.status,
    items:rows<any>(x.invoice_items).map(it => ({ id:it.id, invoiceId:x.id, skuId:it.sku_id, skuCode:it.skus?.sku_code || '', skuName:it.skus?.sku_name || '', quantity:n(it.qty), unitPrice:n(it.unit_price), discountAmount:n(it.discount_amount), taxAmount:n(it.tax_amount), lineTotal:n(it.line_amount) })),
    subtotal:n(x.invoice_amount), discountAmount:n(x.discount_amount), taxAmount:n(x.tax_amount), totalAmount:n(x.invoice_amount), previousBalance:n(x.previous_balance), newBalance:n(x.new_balance), paymentStatus:x.payment_status || 'UNPAID', createdBy:x.posted_by || undefined, createdAt:x.created_at,
  }));

  const recoveries: Recovery[] = rows<any>(r.data).map(x => ({
    id:x.id, recoveryNumber:x.recovery_code, customerId:x.customer_id, customerName:x.customers?.name || '', customerCode:x.customers?.customer_code || '', salesUserId:x.employee_id, salesUserName:x.employees?.full_name || '', collectionDate:x.recovery_date, amount:n(x.amount), paymentMode:x.payment_method, instrumentNumber:x.instrument_no || undefined, bankName:x.bank_name || undefined, status:x.status, remarks:x.remarks || undefined, createdAt:x.created_at,
  }));

  const ledgerEntries: LedgerEntry[] = ledgerRows.map(x => ({ id:x.id, entryNumber:x.ledger_code, customerId:x.customer_id, customerName:x.customers?.name || '', entryDate:x.entry_date, transactionType:x.reference_type === 'RECOVERY' ? 'RECOVERY' : x.reference_type === 'INVOICE' ? 'INVOICE' : 'OPENING_BALANCE', referenceModule:x.reference_type, referenceId:x.reference_id || '', debitAmount:n(x.debit), creditAmount:n(x.credit), runningBalance:n(x.running_balance), description:x.remarks || x.reference_type, createdAt:x.entry_date }));

  const dispatches: Dispatch[] = rows<any>(d.data).map(x => ({ id:x.id, dispatchNumber:x.dispatch_code, invoiceId:x.invoice_id, invoiceNumber:x.invoices?.invoice_code, warehouseId:x.warehouse_id || '', warehouseName:x.warehouses?.name || '', transporterName:x.bility?.transporters?.name || '', vehicleNumber:x.bility?.vehicles?.registration_no || '', driverName:x.bility?.drivers?.name || '', driverPhone:x.bility?.drivers?.mobile || '', addaName:x.bility?.addas?.name, bilityNumber:x.bility?.bility_code, dispatchDate:x.dispatch_date, expectedDeliveryDate:x.expected_delivery_date, actualDeliveryDate:x.actual_delivery_date, freightCharges:n(x.bility?.freight), otherCharges:n(x.bility?.other_charges), status:x.status, gatePassNumber:x.gate_pass_number, remarks:x.remarks }));

  const stockReturns: StockReturn[] = rows<any>(sr.data).map(x => ({ id:x.id, returnNumber:x.return_code, customerId:x.customer_id, customerName:x.customers?.name || '', salesUserId:x.employee_id, salesUserName:x.employees?.full_name || '', invoiceId:x.invoice_id || undefined, requestDate:x.return_date, status:x.status, totalClaimedAmount:n(x.total_claimed_amount), totalApprovedAmount:n(x.total_approved_amount), items:rows<any>(x.stock_return_items).map(it => ({ id:it.id, returnId:x.id, skuId:it.sku_id, skuCode:it.skus?.sku_code || '', skuName:it.skus?.sku_name || '', claimedQuantity:n(it.qty), unitPrice:n(it.unit_price), reason:x.reason || '', conditionNotes:it.remarks || undefined })), createdAt:x.created_at }));

  const visits: CustomerVisit[] = rows<any>(v.data).map(x => ({ id:x.id, customerId:x.customer_id, customerName:x.customers?.name || '', salesUserId:x.employee_id, salesUserName:x.employees?.full_name || '', checkinTime:x.visit_at, latitude:x.latitude == null ? undefined : n(x.latitude), longitude:x.longitude == null ? undefined : n(x.longitude), purpose:x.purpose || (x.productive ? 'Productive Visit' : 'Customer Visit'), notes:x.notes || undefined, orderPlaced:Boolean(x.order_placed ?? x.productive), recoveryCollected:Boolean(x.recovery_collected) }));

  void currentUser; // RLS determines the authoritative visibility scope.
  return { customers, skus, inventoryBalances, salesOrders, invoices, recoveries, ledgerEntries, dispatches, stockReturns, visits };
}