import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  initialCustomers,
  initialSKUs,
  initialInventoryBalances,
  initialSalesOrders,
  initialInvoices,
  initialRecoveries,
  initialLedgerEntries,
  initialDispatches,
  initialStockReturns,
  initialVisits,
} from './store';
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

export const fallbackAppData: SupabaseAppData = {
  customers: initialCustomers,
  skus: initialSKUs,
  inventoryBalances: initialInventoryBalances,
  salesOrders: initialSalesOrders,
  invoices: initialInvoices,
  recoveries: initialRecoveries,
  ledgerEntries: initialLedgerEntries,
  dispatches: initialDispatches,
  stockReturns: initialStockReturns,
  visits: initialVisits,
};

export const emptyData: SupabaseAppData = fallbackAppData;

function money(value: unknown) { return Number(value || 0); }

export async function loadSupabaseAppData(_currentUser: User): Promise<SupabaseAppData> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackAppData;
  }

  const db = supabase;
  try {
    const [customerResult, skuResult, balanceResult, orderResult, invoiceResult, recoveryResult, ledgerResult, dispatchResult, returnResult, visitResult] = await Promise.all([
      db.from('customers').select('*').order('name'),
      db.from('skus').select('*,products(name,model,wattage)').eq('status', true).order('sku_code')
        .then((r) => (r.error ? db.from('skus').select('*').eq('status', true).order('sku_code') : r)),
      db.from('inventory_balances').select('*,warehouses(name),skus(sku_code,sku_name)').order('updated_at', { ascending: false })
        .then((r) => (r.error ? db.from('inventory_balances').select('*').order('updated_at', { ascending: false }) : r)),
      db.from('sales_orders').select('*,customers(customer_code,name),employees(full_name),sales_order_items(*,skus(sku_code,sku_name))').order('created_at', { ascending: false })
        .then((r) => (r.error ? db.from('sales_orders').select('*,sales_order_items(*)').order('created_at', { ascending: false }) : r)),
      db.from('invoices').select('*,customers(customer_code,name),invoice_items(*,skus(sku_code,sku_name))').order('created_at', { ascending: false })
        .then((r) => (r.error ? db.from('invoices').select('*,invoice_items(*)').order('created_at', { ascending: false }) : r)),
      db.from('recoveries').select('*,customers(customer_code,name),employees(full_name)').order('created_at', { ascending: false })
        .then((r) => (r.error ? db.from('recoveries').select('*').order('created_at', { ascending: false }) : r)),
      db.from('ledger_entries').select('*,customers(name)').order('entry_date', { ascending: false })
        .then((r) => (r.error ? db.from('ledger_entries').select('*').order('entry_date', { ascending: false }) : r)),
      db.from('dispatches').select('*,invoices(invoice_code),bility(bility_code,freight,other_charges,transporters(name),vehicles(registration_no),drivers(name,mobile),addas(name))').order('dispatch_date', { ascending: false })
        .then((r) => (r.error ? db.from('dispatches').select('*').order('dispatch_date', { ascending: false }) : r)),
      db.from('stock_returns').select('*,customers(name),employees(full_name),stock_return_items(*,skus(sku_code,sku_name))').order('created_at', { ascending: false })
        .then((r) => (r.error ? db.from('stock_returns').select('*,stock_return_items(*)').order('created_at', { ascending: false }) : r)),
      db.from('customer_visits').select('*,customers(name),employees(full_name)').order('visit_at', { ascending: false })
        .then((r) => (r.error ? db.from('customer_visits').select('*').order('visit_at', { ascending: false }) : r)),
    ]);

    const firstError = [customerResult, skuResult, balanceResult, orderResult, invoiceResult, recoveryResult, ledgerResult, dispatchResult, returnResult, visitResult].find((r) => r.error)?.error;
    if (firstError) {
      console.error('Supabase query error:', firstError);
      throw new Error(`Database error: ${firstError.message}`);
    }

  const ledgerRows = ledgerResult.data || [];
  const balanceByCustomer = new Map<string, number>();
  for (const row of [...ledgerRows].reverse()) {
    balanceByCustomer.set(row.customer_id, money(row.running_balance));
  }

  const customers: Customer[] = (customerResult.data || []).map((r: any) => ({
    id: r.id,
    customerCode: r.customer_code,
    companyName: r.name,
    contactPerson: r.owner_name || '',
    phone: r.mobile || '',
    email: undefined,
    type: r.customer_type,
    taxNumber: undefined,
    cnic: undefined,
    address: r.address || '',
    city: r.city || '',
    region: r.territory || r.area || '',
    creditLimit: money(r.credit_limit),
    creditDays: Number(r.credit_days || 0),
    openingBalance: money(r.opening_balance),
    currentBalance: balanceByCustomer.get(r.id) ?? money(r.opening_balance),
    isCreditLocked: false,
    isActive: Boolean(r.status),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const skus: SKU[] = (skuResult.data || []).map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.products?.name,
    skuCode: r.sku_code,
    barcode: r.barcode,
    name: r.sku_name,
    wattage: r.products?.wattage,
    colorTemperature: undefined,
    voltage: undefined,
    packagingUnit: r.packing_unit,
    cartonQuantity: money(r.units_per_carton),
    tradePrice: money(r.trade_price),
    retailPrice: money(r.sale_price),
    minimumPrice: money(r.dealer_price),
    reorderLevel: money(r.reorder_level),
    isActive: Boolean(r.status),
  }));
  const skuMap = new Map(skus.map((s) => [s.id, s]));

  const inventoryBalances: InventoryBalance[] = (balanceResult.data || []).map((r: any) => ({
    id: r.id,
    warehouseId: r.warehouse_id,
    warehouseName: r.warehouses?.name,
    skuId: r.sku_id,
    skuCode: r.skus?.sku_code,
    skuName: r.skus?.sku_name,
    quantityOnHand: money(r.qty),
    quantityReserved: 0,
    quantityDamaged: 0,
    availableQuantity: money(r.qty),
    lastUpdatedAt: r.updated_at,
  }));

  const salesOrders: SalesOrder[] = (orderResult.data || []).map((r: any) => ({
    id: r.id,
    orderNumber: r.order_code,
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    customerCode: r.customers?.customer_code || '',
    salesUserId: r.employee_id,
    salesUserName: r.employees?.full_name || '',
    orderDate: r.order_date,
    status: r.status,
    items: (r.sales_order_items || []).map((i: any) => ({
      id: i.id,
      orderId: r.id,
      skuId: i.sku_id,
      skuCode: i.skus?.sku_code || skuMap.get(i.sku_id)?.skuCode || '',
      skuName: i.skus?.sku_name || skuMap.get(i.sku_id)?.name || '',
      orderedQuantity: money(i.order_qty),
      approvedQuantity: money(i.approved_qty),
      unitPrice: money(i.unit_price),
      discountPercent: 0,
      lineTotal: money(i.line_amount),
    })),
    subtotal: money(r.requested_amount),
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: money(r.requested_amount),
    creditCheckStatus: r.status === 'ON_HOLD' ? 'AMBER' : 'GREEN',
    creditCheckNotes: r.remarks || undefined,
    createdAt: r.created_at,
  }));

  const invoices: Invoice[] = (invoiceResult.data || []).map((r: any) => ({
    id: r.id,
    invoiceNumber: r.invoice_code,
    orderId: r.order_id || undefined,
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    customerCode: r.customers?.customer_code || '',
    invoiceDate: r.invoice_date,
    dueDate: r.invoice_date,
    status: r.status,
    items: (r.invoice_items || []).map((i: any) => ({
      id: i.id,
      invoiceId: r.id,
      skuId: i.sku_id,
      skuCode: i.skus?.sku_code || '',
      skuName: i.skus?.sku_name || '',
      quantity: money(i.qty),
      unitPrice: money(i.unit_price),
      discountAmount: 0,
      taxAmount: 0,
      lineTotal: money(i.line_amount),
    })),
    subtotal: money(r.invoice_amount),
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: money(r.invoice_amount),
    previousBalance: money(r.previous_balance),
    newBalance: money(r.new_balance),
    paymentStatus: r.status === 'POSTED' ? 'UNPAID' : r.status,
    createdBy: r.posted_by || undefined,
    createdAt: r.created_at,
  }));

  const recoveries: Recovery[] = (recoveryResult.data || []).map((r: any) => ({
    id: r.id,
    recoveryNumber: r.recovery_code,
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    customerCode: r.customers?.customer_code || '',
    salesUserId: r.employee_id,
    salesUserName: r.employees?.full_name || '',
    collectionDate: r.recovery_date,
    amount: money(r.amount),
    paymentMode: r.payment_method === 'BANK_TRANSFER' ? 'ONLINE_TRANSFER' : r.payment_method,
    instrumentNumber: r.instrument_no || undefined,
    bankName: r.bank_name || undefined,
    status: r.status,
    remarks: r.remarks || undefined,
    createdAt: r.created_at,
  }));

  const ledgerEntries: LedgerEntry[] = ledgerRows.map((r: any) => ({
    id: r.id,
    entryNumber: r.ledger_code,
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    entryDate: r.entry_date,
    transactionType: r.reference_type === 'RECOVERY' ? 'RECOVERY' : r.reference_type === 'INVOICE' ? 'INVOICE' : 'OPENING_BALANCE',
    referenceModule: r.reference_type,
    referenceId: r.reference_id || '',
    debitAmount: money(r.debit),
    creditAmount: money(r.credit),
    runningBalance: money(r.running_balance),
    description: r.remarks || r.reference_type,
    createdAt: r.entry_date,
  }));

  const dispatches: Dispatch[] = (dispatchResult.data || []).map((r: any) => ({
    id: r.id,
    dispatchNumber: r.dispatch_code,
    invoiceId: r.invoice_id,
    invoiceNumber: r.invoices?.invoice_code,
    warehouseId: '',
    warehouseName: '',
    transporterName: r.bility?.transporters?.name || '',
    vehicleNumber: r.bility?.vehicles?.registration_no || '',
    driverName: r.bility?.drivers?.name || '',
    driverPhone: r.bility?.drivers?.mobile || '',
    addaName: r.bility?.addas?.name || undefined,
    bilityNumber: r.bility?.bility_code || undefined,
    dispatchDate: r.dispatch_date,
    expectedDeliveryDate: r.expected_delivery_date || undefined,
    actualDeliveryDate: r.actual_delivery_date || undefined,
    freightCharges: money(r.bility?.freight),
    otherCharges: money(r.bility?.other_charges),
    status: r.status === 'READY' ? 'PENDING' : r.status,
    gatePassNumber: undefined,
    remarks: undefined,
  }));

  const stockReturns: StockReturn[] = (returnResult.data || []).map((r: any) => ({
    id: r.id,
    returnNumber: r.return_code,
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    salesUserId: r.employee_id,
    salesUserName: r.employees?.full_name || '',
    invoiceId: r.invoice_id || undefined,
    requestDate: r.return_date,
    status: 'REPORTED',
    totalClaimedAmount: 0,
    totalApprovedAmount: 0,
    items: (r.stock_return_items || []).map((i: any) => ({
      id: i.id,
      returnId: r.id,
      skuId: i.sku_id,
      skuCode: i.skus?.sku_code || '',
      skuName: i.skus?.sku_name || '',
      claimedQuantity: money(i.qty),
      unitPrice: 0,
      reason: r.reason || '',
      conditionNotes: i.remarks || undefined,
    })),
    createdAt: r.created_at,
  }));

  const visits: CustomerVisit[] = (visitResult.data || []).map((r: any) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    salesUserId: r.employee_id,
    salesUserName: r.employees?.full_name || '',
    checkinTime: r.visit_at,
    latitude: r.latitude == null ? undefined : Number(r.latitude),
    longitude: r.longitude == null ? undefined : Number(r.longitude),
    purpose: r.productive ? 'Productive Visit' : 'Customer Visit',
    notes: r.notes || undefined,
    orderPlaced: r.productive,
    recoveryCollected: false,
  }));

    return {
      customers: customers.length > 0 ? customers : initialCustomers,
      skus: skus.length > 0 ? skus : initialSKUs,
      inventoryBalances: inventoryBalances.length > 0 ? inventoryBalances : initialInventoryBalances,
      salesOrders: salesOrders.length > 0 ? salesOrders : initialSalesOrders,
      invoices: invoices.length > 0 ? invoices : initialInvoices,
      recoveries: recoveries.length > 0 ? recoveries : initialRecoveries,
      ledgerEntries: ledgerEntries.length > 0 ? ledgerEntries : initialLedgerEntries,
      dispatches: dispatches.length > 0 ? dispatches : initialDispatches,
      stockReturns: stockReturns.length > 0 ? stockReturns : initialStockReturns,
      visits: visits.length > 0 ? visits : initialVisits,
    };
  } catch (err) {
    console.error('Database connection or query error in loadSupabaseAppData:', err);
    throw err;
  }
}

/**
 * Live background verification of customer balance directly from Supabase ledger
 */
export async function fetchCustomerLatestBalance(customerId: string): Promise<number | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  try {
    const { data: ledgerRows, error: ledgerErr } = await supabase
      .from('ledger_entries')
      .select('running_balance')
      .eq('customer_id', customerId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (!ledgerErr && ledgerRows && ledgerRows.length > 0) {
      return Number(ledgerRows[0].running_balance || 0);
    }

    const { data: custRow, error: custErr } = await supabase
      .from('customers')
      .select('current_balance, opening_balance')
      .eq('id', customerId)
      .single();

    if (!custErr && custRow) {
      return Number(custRow.current_balance ?? custRow.opening_balance ?? 0);
    }
  } catch (err) {
    console.warn('Background balance check error:', err);
  }
  return null;
}
