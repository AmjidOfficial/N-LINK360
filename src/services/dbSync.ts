import { supabase, isSupabaseConfigured } from './supabase';
import {
  Customer,
  SKU,
  InventoryBalance,
  InventoryTransaction,
  SalesOrder,
  Invoice,
  Recovery,
  LedgerEntry,
  CustomerVisit,
} from '../types';

// ==============================================================================
// UUID & ID Translation Map Helpers
// ==============================================================================
export function toUUID(id: string, prefixChar: string = '9'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  if (id === 'c-1') return 'c1000000-0000-0000-0000-000000000001';
  if (id === 'c-2') return 'c1000000-0000-0000-0000-000000000002';
  if (id === 'c-3') return 'c1000000-0000-0000-0000-000000000003';

  if (id === 'sku-1') return 'k0000000-0000-0000-0000-000000000001';
  if (id === 'sku-2') return 'k0000000-0000-0000-0000-000000000002';
  if (id === 'sku-3') return 'k0000000-0000-0000-0000-000000000003';
  if (id === 'sku-4') return 'k0000000-0000-0000-0000-000000000004';
  if (id === 'sku-5') return 'k0000000-0000-0000-0000-000000000005';

  if (id === 'u-1') return 'u0000000-0000-0000-0000-000000000001';
  if (id === 'u-2') return 'u0000000-0000-0000-0000-000000000002';
  if (id === 'u-3') return 'u0000000-0000-0000-0000-000000000003';
  if (id === 'u-4') return 'u0000000-0000-0000-0000-000000000004';

  // Construct a consistent UUID for custom IDs
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padEnd(8, '0');
  const cleanId = id.replace(/[^0-9a-f]/gi, '').padEnd(24, '0').substring(0, 24);
  return `${prefixChar}0000000-${hexHash.substring(0, 4)}-4000-8000-${cleanId.substring(0, 12)}`;
}

export function fromUUID(id: string): string {
  if (id === 'c1000000-0000-0000-0000-000000000001') return 'c-1';
  if (id === 'c1000000-0000-0000-0000-000000000002') return 'c-2';
  if (id === 'c1000000-0000-0000-0000-000000000003') return 'c-3';

  if (id === 'k0000000-0000-0000-0000-000000000001') return 'sku-1';
  if (id === 'k0000000-0000-0000-0000-000000000002') return 'sku-2';
  if (id === 'k0000000-0000-0000-0000-000000000003') return 'sku-3';
  if (id === 'k0000000-0000-0000-0000-000000000004') return 'sku-4';
  if (id === 'k0000000-0000-0000-0000-000000000005') return 'sku-5';

  if (id === 'u0000000-0000-0000-0000-000000000001') return 'u-1';
  if (id === 'u0000000-0000-0000-0000-000000000002') return 'u-2';
  if (id === 'u0000000-0000-0000-0000-000000000003') return 'u-3';
  if (id === 'u0000000-0000-0000-0000-000000000004') return 'u-4';

  return id;
}

const CONST_SALES_USER_UUID = 's0000000-0000-0000-0000-000000000001';

async function resolveCurrentEmployeeUuid(fallbackId?: string): Promise<string> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.rpc('nlink_current_employee_id');
      if (data && typeof data === 'string') return data;
    } catch {
      // Fallback below
    }
  }
  if (fallbackId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fallbackId)) {
    return fallbackId;
  }
  return CONST_SALES_USER_UUID;
}

// ==============================================================================
// Live Fetch & Sync adapter
// ==============================================================================
export async function loadStateFromSupabase(): Promise<{
  customers?: Customer[];
  skus?: SKU[];
  inventoryBalances?: InventoryBalance[];
  salesOrders?: SalesOrder[];
  invoices?: Invoice[];
  recoveries?: Recovery[];
  ledgerEntries?: LedgerEntry[];
  visits?: CustomerVisit[];
} | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    console.log('🔄 N-LINK 360 DB Sync: Fetching master lists and transactions from Supabase...');

    // 1. Load customers
    const { data: dbCusts, error: custErr } = await supabase.from('customers').select('*').order('name');
    if (custErr) throw custErr;

    const customers: Customer[] = (dbCusts || []).map((c: any) => ({
      id: fromUUID(c.id),
      customerCode: c.customer_code,
      companyName: c.name || c.company_name || 'Customer',
      contactPerson: c.owner_name || c.contact_person || '',
      phone: c.mobile || c.phone || '',
      email: c.email || '',
      type: c.customer_type || c.type || 'DEALER',
      taxNumber: c.ntn_number || c.tax_number || '',
      cnic: c.cnic || '',
      address: c.address || '',
      city: c.city || '',
      region: c.territory || c.region || '',
      creditLimit: Number(c.credit_limit) || 0,
      creditDays: Number(c.credit_days) || 30,
      openingBalance: Number(c.opening_balance) || 0,
      currentBalance: Number(c.current_balance ?? c.opening_balance) || 0,
      isCreditLocked: c.credit_status === 'LOCKED' || !!c.is_credit_locked,
      isActive: c.status !== undefined ? Boolean(c.status) : !!c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    // 2. Load skus
    const { data: dbSKUs, error: skuErr } = await supabase.from('skus').select('*').order('sku_code');
    if (skuErr) throw skuErr;

    const skus: SKU[] = (dbSKUs || []).map((s: any) => ({
      id: fromUUID(s.id),
      productId: s.product_id,
      skuCode: s.sku_code,
      barcode: s.barcode || '',
      name: s.sku_name || s.name || s.sku_code,
      wattage: s.wattage || '',
      colorTemperature: s.color_temperature || '',
      voltage: s.voltage || '',
      packagingUnit: s.packing_unit || s.packaging_unit || 'CARTON',
      cartonQuantity: Number(s.units_per_carton || s.carton_quantity) || 1,
      tradePrice: Number(s.trade_price) || 0,
      retailPrice: Number(s.sale_price || s.retail_price) || 0,
      minimumPrice: Number(s.dealer_price || s.minimum_price) || 0,
      reorderLevel: Number(s.reorder_level) || 10,
      isActive: s.status !== undefined ? Boolean(s.status) : !!s.is_active,
    }));

    // 3. Load inventory balances
    const { data: dbInv, error: invErr } = await supabase.from('inventory_balances').select('*');
    if (invErr) throw invErr;

    const inventoryBalances: InventoryBalance[] = (dbInv || []).map((b: any) => {
      const sId = fromUUID(b.sku_id);
      const sku = skus.find((s) => s.id === sId);
      const qtyOnHand = Number(b.qty ?? b.quantity_on_hand) || 0;
      return {
        id: b.id,
        warehouseId: b.warehouse_id,
        warehouseName: 'Lahore Central Warehouse',
        skuId: sId,
        skuCode: sku?.skuCode || '',
        skuName: sku?.name || '',
        quantityOnHand: qtyOnHand,
        quantityReserved: Number(b.quantity_reserved) || 0,
        quantityDamaged: Number(b.quantity_damaged) || 0,
        availableQuantity: qtyOnHand,
        lastUpdatedAt: b.updated_at || b.last_updated_at,
      };
    });

    // 4. Load sales orders
    const { data: dbOrders, error: orderErr } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
    if (orderErr) throw orderErr;

    // Load sales order items
    const { data: dbOrderItems, error: itemsErr } = await supabase.from('sales_order_items').select('*');
    if (itemsErr) throw itemsErr;

    const salesOrders: SalesOrder[] = (dbOrders || []).map((o: any) => {
      const cId = fromUUID(o.customer_id);
      const cust = customers.find((c) => c.id === cId);
      const oItems = (dbOrderItems || [])
        .filter((item: any) => item.order_id === o.id)
        .map((it: any) => {
          const skuIdVal = fromUUID(it.sku_id);
          const sku = skus.find((s) => s.id === skuIdVal);
          return {
            id: it.id,
            orderId: o.id,
            skuId: skuIdVal,
            skuCode: sku?.skuCode || '',
            skuName: sku?.name || '',
            orderedQuantity: Number(it.order_qty ?? it.ordered_quantity) || 0,
            unitPrice: Number(it.unit_price) || 0,
            discountPercent: Number(it.discount_percent) || 0,
            lineTotal: Number(it.line_amount ?? it.line_total) || 0,
          };
        });

      const totalAmount = Number(o.requested_amount ?? o.total_amount) || 0;
      return {
        id: o.id,
        orderNumber: o.order_code || o.order_number,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        customerCode: cust?.customerCode || '',
        salesUserId: fromUUID(o.employee_id || o.sales_user_id || ''),
        salesUserName: cust?.assignedOfficerName || 'Field Officer',
        orderDate: o.order_date,
        status: o.status,
        subtotal: Number(o.subtotal ?? totalAmount) || 0,
        discountAmount: Number(o.discount_amount) || 0,
        taxAmount: Number(o.tax_amount) || 0,
        totalAmount,
        items: oItems,
        creditCheckStatus: o.credit_check_status || 'GREEN',
        creditCheckNotes: o.remarks || o.credit_check_notes || '',
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      };
    });

    // 5. Load recoveries
    const { data: dbRec, error: recErr } = await supabase.from('recoveries').select('*').order('created_at', { ascending: false });
    if (recErr) throw recErr;

    const recoveries: Recovery[] = (dbRec || []).map((r: any) => {
      const cId = fromUUID(r.customer_id);
      const cust = customers.find((c) => c.id === cId);
      return {
        id: r.id,
        recoveryNumber: r.recovery_code || r.recovery_number,
        customerId: cId,
        customerName: cust?.companyName || r.customer_name || 'Customer',
        customerCode: cust?.customerCode || r.customer_code || '',
        salesUserId: r.employee_id ? fromUUID(r.employee_id) : r.sales_user_id ? fromUUID(r.sales_user_id) : 'u-2',
        salesUserName: cust?.assignedOfficerName || 'Field Officer',
        collectionDate: r.recovery_date || r.collection_date || r.created_at?.split('T')[0],
        amount: Number(r.amount) || 0,
        paymentMode: r.payment_method || r.payment_mode,
        instrumentNumber: r.instrument_no || r.instrument_number || undefined,
        bankName: r.bank_name || undefined,
        status: r.status,
        verifiedBy: r.verified_by ? fromUUID(r.verified_by) : undefined,
        verifiedAt: r.verified_at || undefined,
        remarks: r.remarks || undefined,
        createdAt: r.created_at,
      };
    });

    // 6. Load ledger entries
    const { data: dbLedger, error: ledErr } = await supabase.from('ledger_entries').select('*').order('entry_date', { ascending: false });
    if (ledErr) throw ledErr;

    const ledgerEntries: LedgerEntry[] = (dbLedger || []).map((l: any) => {
      const cId = fromUUID(l.customer_id);
      const cust = customers.find((c) => c.id === cId);
      return {
        id: l.id,
        entryNumber: l.ledger_code || l.entry_number,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        entryDate: l.entry_date,
        transactionType: l.reference_type || l.transaction_type,
        referenceModule: l.reference_type || l.reference_module || 'LEDGER',
        referenceId: l.reference_id,
        description: l.remarks || l.description || '',
        debitAmount: Number(l.debit ?? l.debit_amount) || 0,
        creditAmount: Number(l.credit ?? l.credit_amount) || 0,
        runningBalance: Number(l.running_balance) || 0,
        createdAt: l.created_at || l.entry_date,
      };
    });

    // 7. Load visits
    const { data: dbVisits, error: visitErr } = await supabase.from('customer_visits').select('*').order('visit_at', { ascending: false });
    if (visitErr) throw visitErr;

    const visits: CustomerVisit[] = (dbVisits || []).map((v: any) => {
      const cId = fromUUID(v.customer_id);
      const cust = customers.find((c) => c.id === cId);
      return {
        id: v.id,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        salesUserId: fromUUID(v.employee_id || v.sales_user_id || ''),
        salesUserName: cust?.assignedOfficerName || 'Field Officer',
        checkinTime: v.visit_at || v.checkin_time,
        checkoutTime: v.checkout_time || undefined,
        latitude: v.latitude ? Number(v.latitude) : undefined,
        longitude: v.longitude ? Number(v.longitude) : undefined,
        purpose: v.purpose || 'Field Visit',
        notes: v.notes || '',
        orderPlaced: Boolean(v.productive ?? v.order_placed),
        recoveryCollected: !!v.recovery_collected,
        nextFollowupDate: v.next_followup_date || undefined,
        createdAt: v.visit_at || v.created_at,
      };
    });

    // 8. Load invoices
    const { data: dbInvoices, error: invsErr } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (invsErr) throw invsErr;

    const { data: dbInvItems, error: itemsInvErr } = await supabase.from('invoice_items').select('*');
    if (itemsInvErr) throw itemsInvErr;

    const invoices: Invoice[] = (dbInvoices || []).map((inv: any) => {
      const cId = fromUUID(inv.customer_id);
      const cust = customers.find((c) => c.id === cId);
      const invItems = (dbInvItems || [])
        .filter((item: any) => item.invoice_id === inv.id)
        .map((it: any) => {
          const skuIdVal = fromUUID(it.sku_id);
          const sku = skus.find((s) => s.id === skuIdVal);
          return {
            id: it.id,
            invoiceId: it.invoice_id,
            skuId: skuIdVal,
            skuCode: sku?.skuCode || '',
            skuName: sku?.name || '',
            quantity: Number(it.qty ?? it.quantity) || 0,
            unitPrice: Number(it.unit_price) || 0,
            discountAmount: Number(it.discount_amount) || 0,
            taxAmount: Number(it.tax_amount) || 0,
            lineTotal: Number(it.line_amount ?? it.line_total) || 0,
          };
        });

      const invAmount = Number(inv.invoice_amount ?? inv.total_amount) || 0;
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_code || inv.invoice_number,
        orderId: inv.order_id || undefined,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        customerCode: cust?.customerCode || '',
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date || inv.invoice_date,
        status: inv.status,
        paymentStatus: inv.payment_status || 'UNPAID',
        subtotal: Number(inv.subtotal ?? invAmount) || 0,
        discountAmount: Number(inv.discount_amount) || 0,
        taxAmount: Number(inv.tax_amount) || 0,
        totalAmount: invAmount,
        previousBalance: Number(inv.previous_balance) || 0,
        newBalance: Number(inv.new_balance) || 0,
        items: invItems,
        createdAt: inv.created_at,
      };
    });

    return {
      customers,
      skus,
      inventoryBalances,
      salesOrders,
      invoices,
      recoveries,
      ledgerEntries,
      visits,
    };
  } catch (error: any) {
    const msg = String(error?.message || error || '');
    if (msg.includes('Failed to fetch') || msg.includes('network') || msg.includes('offline')) {
      console.warn('N-LINK 360 DB Sync: Supabase offline or unreachable, using local store.');
    } else {
      console.warn('N-LINK 360 DB Sync: Notice during table query:', error);
    }
    return null;
  }
}

let isSupabaseUnreachable = false;

function handleSupabaseError(actionDescription: string, err: any) {
  const errMsg = String(err?.message || err || '');
  if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('network')) {
    if (!isSupabaseUnreachable) {
      isSupabaseUnreachable = true;
      console.warn(`[N-LINK 360 DB Sync] Supabase backend is unreachable or offline. Operating in high-performance local cache mode.`);
    }
  } else {
    console.warn(`[N-LINK 360 DB Sync] Notice during ${actionDescription}:`, err);
  }
}

// ==============================================================================
// Live Mutator Syncing Methods
// ==============================================================================

const inFlightSyncs = new Map<string, Promise<boolean>>();

function runOncePerKey(key: string, task: () => Promise<boolean>): Promise<boolean> {
  const active = inFlightSyncs.get(key);
  if (active) return active;
  const promise = task().finally(() => {
    inFlightSyncs.delete(key);
  });
  inFlightSyncs.set(key, promise);
  return promise;
}

export async function syncOrderToSupabase(order: SalesOrder): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured || isSupabaseUnreachable) return false;
  const dedupKey = `order:${order.idempotencyKey || order.id}`;
  return runOncePerKey(dedupKey, async () => {
    try {
      const oId = toUUID(order.id, '0');
      const empId = await resolveCurrentEmployeeUuid(order.salesUserId);
      const dbOrder = {
        id: oId,
        order_code: order.orderNumber,
        customer_id: toUUID(order.customerId, 'c'),
        employee_id: empId,
        order_date: order.orderDate,
        status: order.status,
        requested_amount: order.totalAmount,
        remarks: order.creditCheckNotes || '',
        ...(order.idempotencyKey ? { idempotency_key: order.idempotencyKey } : {}),
        created_at: order.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: ordErr } = await supabase!.from('sales_orders').upsert(dbOrder, { onConflict: 'order_code' });
      if (ordErr) throw ordErr;

      if (order.items && order.items.length > 0) {
        const dbItems = order.items.map((it, idx) => ({
          id: toUUID(`so-item-${order.id}-${idx}`, 'a'),
          order_id: oId,
          line_no: idx + 1,
          sku_id: toUUID(it.skuId, 'k'),
          order_qty: it.orderedQuantity,
          approved_qty: it.orderedQuantity,
          unit_price: it.unitPrice,
          line_amount: it.lineTotal,
        }));

        const { error: itemsErr } = await supabase!.from('sales_order_items').upsert(dbItems, { onConflict: 'order_id,line_no' });
        if (itemsErr) throw itemsErr;
      }

      return true;
    } catch (err) {
      handleSupabaseError(`sales order ${order.orderNumber}`, err);
      return false;
    }
  });
}

export async function syncRecoveryToSupabase(
  recovery: Recovery,
  _updateCustomerBalance?: { customerId: string; balance: number }
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured || isSupabaseUnreachable) return false;
  const dedupKey = `recovery:${recovery.idempotencyKey || recovery.id}`;
  return runOncePerKey(dedupKey, async () => {
    try {
      const rId = toUUID(recovery.id, 'r');
      const empId = await resolveCurrentEmployeeUuid(recovery.salesUserId);
      const dbRecovery = {
        id: rId,
        recovery_code: recovery.recoveryNumber,
        customer_id: toUUID(recovery.customerId, 'c'),
        employee_id: empId,
        recovery_date: recovery.collectionDate,
        amount: recovery.amount,
        payment_method: recovery.paymentMode === 'ONLINE_TRANSFER' ? 'ONLINE_TRANSFER' : recovery.paymentMode,
        instrument_no: recovery.instrumentNumber || null,
        bank_name: recovery.bankName || null,
        status: recovery.status,
        remarks: recovery.remarks || '',
        ...(recovery.idempotencyKey ? { idempotency_key: recovery.idempotencyKey } : {}),
        created_at: recovery.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: recErr } = await supabase!.from('recoveries').upsert(dbRecovery, { onConflict: 'recovery_code' });
      if (recErr) throw recErr;

      return true;
    } catch (err) {
      handleSupabaseError(`recovery ${recovery.recoveryNumber}`, err);
      return false;
    }
  });
}

export async function syncInvoiceAndLedgerToSupabase(
  invoice: Invoice,
  customerId: string,
  _newCustomerBalance: number,
  ledgerEntry: LedgerEntry,
  inventoryBalances: InventoryBalance[],
  inventoryTransactions: InventoryTransaction[]
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured || isSupabaseUnreachable) return false;
  try {
    const invId = toUUID(invoice.id, '1');
    // 1. Update order status in Supabase if exists
    if (invoice.orderId) {
      await supabase.from('sales_orders').update({ status: 'INVOICED', updated_at: new Date().toISOString() }).eq('id', toUUID(invoice.orderId, '0'));
    }

    // 2. Insert Invoice
    const dbInvoice = {
      id: invId,
      invoice_code: invoice.invoiceNumber,
      order_id: invoice.orderId ? toUUID(invoice.orderId, '0') : null,
      customer_id: toUUID(customerId, 'c'),
      invoice_date: invoice.invoiceDate,
      status: invoice.status,
      invoice_amount: invoice.totalAmount,
      previous_balance: invoice.previousBalance,
      new_balance: invoice.newBalance,
      created_at: invoice.createdAt || new Date().toISOString(),
    };

    const { error: invErr } = await supabase.from('invoices').upsert(dbInvoice, { onConflict: 'invoice_code' });
    if (invErr) throw invErr;

    // Insert invoice items
    if (invoice.items && invoice.items.length > 0) {
      const dbInvItems = invoice.items.map((it, idx) => ({
        id: toUUID(it.id || `inv-item-${invId}-${idx}`, '2'),
        invoice_id: invId,
        line_no: idx + 1,
        sku_id: toUUID(it.skuId, 'k'),
        qty: it.quantity,
        unit_price: it.unitPrice,
        line_amount: it.lineTotal,
      }));
      const { error: itemsErr } = await supabase.from('invoice_items').upsert(dbInvItems, { onConflict: 'invoice_id,line_no' });
      if (itemsErr) throw itemsErr;
    }

    // 3. Insert Ledger Entry (DB ledger + triggers maintain authoritative balance)
    const dbLedger = {
      id: toUUID(ledgerEntry.id, '3'),
      ledger_code: ledgerEntry.entryNumber,
      customer_id: toUUID(ledgerEntry.customerId, 'c'),
      entry_date: ledgerEntry.entryDate,
      reference_type: ledgerEntry.transactionType || ledgerEntry.referenceModule,
      reference_id: ledgerEntry.referenceId ? toUUID(ledgerEntry.referenceId, '1') : invId,
      remarks: ledgerEntry.description,
      debit: ledgerEntry.debitAmount,
      credit: ledgerEntry.creditAmount,
      running_balance: ledgerEntry.runningBalance,
    };
    const { error: ledErr } = await supabase.from('ledger_entries').upsert(dbLedger, { onConflict: 'ledger_code' });
    if (ledErr) throw ledErr;

    // 4. Update Inventory Balances
    for (const bal of inventoryBalances) {
      await supabase
        .from('inventory_balances')
        .update({ qty: bal.quantityOnHand, updated_at: new Date().toISOString() })
        .eq('warehouse_id', 'w0000000-0000-0000-0000-000000000001')
        .eq('sku_id', toUUID(bal.skuId, 'k'));
    }

    // 5. Insert Inventory Transactions
    if (inventoryTransactions && inventoryTransactions.length > 0) {
      const dbTxs = inventoryTransactions.map((tx) => ({
        id: toUUID(tx.id, '4'),
        txn_code: tx.transactionNumber,
        txn_type: tx.transactionType,
        warehouse_id: 'w0000000-0000-0000-0000-000000000001',
        sku_id: toUUID(tx.skuId, 'k'),
        qty: tx.quantity,
        reference_type: tx.referenceModule,
        reference_id: tx.referenceId ? toUUID(tx.referenceId, '1') : invId,
        remarks: tx.notes || '',
        txn_date: tx.createdAt || new Date().toISOString(),
      }));
      await supabase.from('inventory_transactions').upsert(dbTxs, { onConflict: 'txn_code' });
    }

    return true;
  } catch (err) {
    handleSupabaseError(`invoice posting`, err);
    return false;
  }
}

export async function syncVisitToSupabase(visit: CustomerVisit): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured || isSupabaseUnreachable) return false;
  try {
    const vId = toUUID(visit.id, '5');
    const empId = await resolveCurrentEmployeeUuid(visit.salesUserId);
    const dbVisit = {
      id: vId,
      visit_code: `VIS-${vId.slice(0, 8).toUpperCase()}`,
      customer_id: toUUID(visit.customerId, 'c'),
      employee_id: empId,
      visit_at: visit.checkinTime || new Date().toISOString(),
      latitude: visit.latitude ?? null,
      longitude: visit.longitude ?? null,
      productive: Boolean(visit.orderPlaced),
      notes: visit.notes || '',
    };

    const { error: visitErr } = await supabase.from('customer_visits').upsert(dbVisit, { onConflict: 'visit_code' });
    if (visitErr) throw visitErr;
    return true;
  } catch (err) {
    handleSupabaseError(`visit log ${visit.id}`, err);
    return false;
  }
}

export async function syncCustomerToSupabase(customer: Customer): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured || isSupabaseUnreachable) return false;
  try {
    const dbCust = {
      id: toUUID(customer.id, 'c'),
      customer_code: customer.customerCode,
      name: customer.companyName,
      owner_name: customer.contactPerson,
      mobile: customer.phone,
      customer_type: customer.type,
      address: customer.address,
      city: customer.city,
      territory: customer.region,
      credit_limit: customer.creditLimit,
      credit_days: customer.creditDays,
      opening_balance: customer.openingBalance,
      status: Boolean(customer.isActive),
      updated_at: new Date().toISOString(),
    };

    const { error: custErr } = await supabase.from('customers').upsert(dbCust, { onConflict: 'customer_code' });
    if (custErr) throw custErr;
    return true;
  } catch (err) {
    handleSupabaseError(`customer ${customer.companyName}`, err);
    return false;
  }
}
