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
    const { data: dbCusts, error: custErr } = await supabase.from('customers').select('*').order('company_name');
    if (custErr) throw custErr;

    const customers: Customer[] = (dbCusts || []).map((c) => ({
      id: fromUUID(c.id),
      customerCode: c.customer_code,
      companyName: c.company_name,
      contactPerson: c.contact_person,
      phone: c.phone,
      email: c.email || '',
      type: c.type,
      taxNumber: c.tax_number || '',
      cnic: c.cnic || '',
      address: c.address,
      city: c.city,
      region: c.region,
      creditLimit: Number(c.credit_limit) || 0,
      creditDays: Number(c.credit_days) || 30,
      openingBalance: Number(c.opening_balance) || 0,
      currentBalance: Number(c.current_balance) || 0,
      isCreditLocked: !!c.is_credit_locked,
      isActive: !!c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    // 2. Load skus
    const { data: dbSKUs, error: skuErr } = await supabase.from('skus').select('*').order('sku_code');
    if (skuErr) throw skuErr;

    const skus: SKU[] = (dbSKUs || []).map((s) => ({
      id: fromUUID(s.id),
      productId: s.product_id,
      skuCode: s.sku_code,
      barcode: s.barcode || '',
      name: s.name,
      wattage: s.wattage || '',
      colorTemperature: s.color_temperature || '',
      voltage: s.voltage || '',
      packagingUnit: s.packaging_unit || 'CARTON',
      cartonQuantity: Number(s.carton_quantity) || 1,
      tradePrice: Number(s.trade_price) || 0,
      retailPrice: Number(s.retail_price) || 0,
      minimumPrice: Number(s.minimum_price) || 0,
      reorderLevel: Number(s.reorder_level) || 10,
      isActive: !!s.is_active,
    }));

    // 3. Load inventory balances
    const { data: dbInv, error: invErr } = await supabase.from('inventory_balances').select('*');
    if (invErr) throw invErr;

    const inventoryBalances: InventoryBalance[] = (dbInv || []).map((b) => {
      const sId = fromUUID(b.sku_id);
      const sku = skus.find((s) => s.id === sId);
      return {
        id: b.id,
        warehouseId: b.warehouse_id,
        warehouseName: 'Lahore Central Warehouse',
        skuId: sId,
        skuCode: sku?.skuCode || '',
        skuName: sku?.name || '',
        quantityOnHand: Number(b.quantity_on_hand) || 0,
        quantityReserved: Number(b.quantity_reserved) || 0,
        quantityDamaged: Number(b.quantity_damaged) || 0,
        availableQuantity: Number(b.quantity_on_hand) || 0,
        lastUpdatedAt: b.last_updated_at,
      };
    });

    // 4. Load sales orders
    const { data: dbOrders, error: orderErr } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
    if (orderErr) throw orderErr;

    // Load sales order items
    const { data: dbOrderItems, error: itemsErr } = await supabase.from('sales_order_items').select('*');
    if (itemsErr) throw itemsErr;

    const salesOrders: SalesOrder[] = (dbOrders || []).map((o) => {
      const cId = fromUUID(o.customer_id);
      const cust = customers.find((c) => c.id === cId);
      const oItems = (dbOrderItems || [])
        .filter((item) => item.order_id === o.id)
        .map((it) => {
          const skuIdVal = fromUUID(it.sku_id);
          const sku = skus.find((s) => s.id === skuIdVal);
          return {
            id: it.id,
            orderId: o.id,
            skuId: skuIdVal,
            skuCode: sku?.skuCode || '',
            skuName: sku?.name || '',
            orderedQuantity: Number(it.ordered_quantity),
            unitPrice: Number(it.unit_price),
            discountPercent: Number(it.discount_percent) || 0,
            lineTotal: Number(it.line_total),
          };
        });

      return {
        id: o.id,
        orderNumber: o.order_number,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        customerCode: cust?.customerCode || '',
        salesUserId: fromUUID(o.sales_user_id),
        salesUserName: 'Rashid Ali',
        orderDate: o.order_date,
        status: o.status,
        subtotal: Number(o.subtotal) || 0,
        discountAmount: Number(o.discount_amount) || 0,
        taxAmount: Number(o.tax_amount) || 0,
        totalAmount: Number(o.total_amount) || 0,
        items: oItems,
        creditCheckStatus: o.credit_check_status || 'GREEN',
        creditCheckNotes: o.credit_check_notes || '',
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      };
    });

    // 5. Load recoveries
    const { data: dbRec, error: recErr } = await supabase.from('recoveries').select('*').order('created_at', { ascending: false });
    if (recErr) throw recErr;

    const recoveries: Recovery[] = (dbRec || []).map((r) => {
      const cId = fromUUID(r.customer_id);
      const cust = customers.find((c) => c.id === cId);
      return {
        id: r.id,
        recoveryNumber: r.recovery_number,
        customerId: cId,
        customerName: cust?.companyName || r.customer_name || 'Customer',
        customerCode: cust?.customerCode || r.customer_code || '',
        salesUserId: r.sales_user_id ? fromUUID(r.sales_user_id) : 'u-2',
        salesUserName: 'Rashid Ali',
        collectionDate: r.collection_date || r.created_at?.split('T')[0],
        amount: Number(r.amount),
        paymentMode: r.payment_mode,
        instrumentNumber: r.instrument_number || undefined,
        bankName: r.bank_name || undefined,
        status: r.status,
        verifiedBy: r.verified_by ? fromUUID(r.verified_by) : undefined,
        verifiedAt: r.verified_at || undefined,
        remarks: r.remarks || undefined,
        createdAt: r.created_at,
      };
    });

    // 6. Load ledger entries
    const { data: dbLedger, error: ledErr } = await supabase.from('ledger_entries').select('*').order('created_at', { ascending: false });
    if (ledErr) throw ledErr;

    const ledgerEntries: LedgerEntry[] = (dbLedger || []).map((l) => {
      const cId = fromUUID(l.customer_id);
      const cust = customers.find((c) => c.id === cId);
      return {
        id: l.id,
        entryNumber: l.entry_number,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        entryDate: l.entry_date,
        transactionType: l.transaction_type,
        referenceModule: l.reference_module,
        referenceId: l.reference_id,
        description: l.description,
        debitAmount: Number(l.debit_amount) || 0,
        creditAmount: Number(l.credit_amount) || 0,
        runningBalance: Number(l.running_balance) || 0,
        createdAt: l.created_at,
      };
    });

    // 7. Load visits
    const { data: dbVisits, error: visitErr } = await supabase.from('customer_visits').select('*').order('created_at', { ascending: false });
    if (visitErr) throw visitErr;

    const visits: CustomerVisit[] = (dbVisits || []).map((v) => {
      const cId = fromUUID(v.customer_id);
      const cust = customers.find((c) => c.id === cId);
      return {
        id: v.id,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        salesUserId: fromUUID(v.sales_user_id),
        salesUserName: 'Rashid Ali',
        checkinTime: v.checkin_time,
        checkoutTime: v.checkout_time || undefined,
        latitude: v.latitude ? Number(v.latitude) : undefined,
        longitude: v.longitude ? Number(v.longitude) : undefined,
        purpose: v.purpose || '',
        notes: v.notes || '',
        orderPlaced: !!v.order_placed,
        recoveryCollected: !!v.recovery_collected,
        nextFollowupDate: v.next_followup_date || undefined,
        createdAt: v.created_at,
      };
    });

    // 8. Load invoices
    const { data: dbInvoices, error: invsErr } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (invsErr) throw invsErr;

    const { data: dbInvItems, error: itemsInvErr } = await supabase.from('invoice_items').select('*');
    if (itemsInvErr) throw itemsInvErr;

    const invoices: Invoice[] = (dbInvoices || []).map((inv) => {
      const cId = fromUUID(inv.customer_id);
      const cust = customers.find((c) => c.id === cId);
      const invItems = (dbInvItems || [])
        .filter((item) => item.invoice_id === inv.id)
        .map((it) => {
          const skuIdVal = fromUUID(it.sku_id);
          const sku = skus.find((s) => s.id === skuIdVal);
          return {
            id: it.id,
            invoiceId: it.invoice_id,
            skuId: skuIdVal,
            skuCode: sku?.skuCode || '',
            skuName: sku?.name || '',
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
            discountAmount: Number(it.discount_amount) || 0,
            taxAmount: Number(it.tax_amount) || 0,
            lineTotal: Number(it.line_total),
          };
        });

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        orderId: inv.order_id || undefined,
        customerId: cId,
        customerName: cust?.companyName || 'Customer',
        customerCode: cust?.customerCode || '',
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        status: inv.status,
        paymentStatus: inv.payment_status || 'UNPAID',
        subtotal: Number(inv.subtotal) || 0,
        discountAmount: Number(inv.discount_amount) || 0,
        taxAmount: Number(inv.tax_amount) || 0,
        totalAmount: Number(inv.total_amount) || 0,
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
  } catch (error) {
    console.error('❌ N-LINK 360 DB Sync: Error downloading database tables from Supabase:', error);
    return null;
  }
}

// ==============================================================================
// Live Mutator Syncing Methods
// ==============================================================================

export async function syncOrderToSupabase(order: SalesOrder): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const oId = order.id;
    const dbOrder = {
      id: oId,
      order_number: order.orderNumber,
      customer_id: toUUID(order.customerId, 'c'),
      sales_user_id: CONST_SALES_USER_UUID, // Use default seeded sales user profile
      order_date: order.orderDate,
      status: order.status,
      subtotal: order.subtotal,
      discount_amount: order.discountAmount,
      tax_amount: order.taxAmount,
      total_amount: order.totalAmount,
      credit_check_status: order.creditCheckStatus,
      credit_check_notes: order.creditCheckNotes || '',
      created_at: order.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: ordErr } = await supabase.from('sales_orders').upsert(dbOrder);
    if (ordErr) throw ordErr;

    // Save items
    if (order.items && order.items.length > 0) {
      const dbItems = order.items.map((it, idx) => ({
        id: toUUID(`so-item-${order.id}-${idx}`, 'a'),
        order_id: oId,
        sku_id: toUUID(it.skuId, 'k'),
        ordered_quantity: it.orderedQuantity,
        approved_quantity: it.orderedQuantity,
        unit_price: it.unitPrice,
        discount_percent: it.discountPercent,
        line_total: it.lineTotal,
      }));

      const { error: itemsErr } = await supabase.from('sales_order_items').upsert(dbItems);
      if (itemsErr) throw itemsErr;
    }

    return true;
  } catch (err) {
    console.error(`❌ DB Sync: Error uploading sales order ${order.orderNumber} to Supabase:`, err);
    return false;
  }
}

export async function syncRecoveryToSupabase(
  recovery: Recovery,
  updateCustomerBalance?: { customerId: string; balance: number }
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const rId = recovery.id;
    const dbRecovery = {
      id: rId,
      recovery_number: recovery.recoveryNumber,
      customer_id: toUUID(recovery.customerId, 'c'),
      sales_user_id: CONST_SALES_USER_UUID,
      collection_date: recovery.collectionDate,
      amount: recovery.amount,
      payment_mode: recovery.paymentMode,
      instrument_number: recovery.instrumentNumber || null,
      bank_name: recovery.bankName || null,
      status: recovery.status,
      remarks: recovery.remarks || '',
      created_at: recovery.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: recErr } = await supabase.from('recoveries').upsert(dbRecovery);
    if (recErr) throw recErr;

    if (updateCustomerBalance) {
      const { error: custErr } = await supabase
        .from('customers')
        .update({ current_balance: updateCustomerBalance.balance, updated_at: new Date().toISOString() })
        .eq('id', toUUID(updateCustomerBalance.customerId, 'c'));
      if (custErr) throw custErr;
    }

    return true;
  } catch (err) {
    console.error(`❌ DB Sync: Error uploading recovery ${recovery.recoveryNumber} to Supabase:`, err);
    return false;
  }
}

export async function syncInvoiceAndLedgerToSupabase(
  invoice: Invoice,
  customerId: string,
  newCustomerBalance: number,
  ledgerEntry: LedgerEntry,
  inventoryBalances: InventoryBalance[],
  inventoryTransactions: InventoryTransaction[]
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    // 1. Update order status in Supabase if exists
    if (invoice.orderId) {
      await supabase.from('sales_orders').update({ status: 'INVOICED' }).eq('id', invoice.orderId);
    }

    // 2. Insert Invoice
    const dbInvoice = {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      order_id: invoice.orderId || null,
      customer_id: toUUID(customerId, 'c'),
      invoice_date: invoice.invoiceDate,
      due_date: invoice.dueDate,
      status: invoice.status,
      payment_status: invoice.paymentStatus || 'UNPAID',
      subtotal: invoice.subtotal,
      discount_amount: invoice.discountAmount,
      tax_amount: invoice.taxAmount,
      total_amount: invoice.totalAmount,
      previous_balance: invoice.previousBalance,
      new_balance: invoice.newBalance,
      created_at: invoice.createdAt || new Date().toISOString(),
    };

    const { error: invErr } = await supabase.from('invoices').upsert(dbInvoice);
    if (invErr) throw invErr;

    // Insert invoice items
    if (invoice.items && invoice.items.length > 0) {
      const dbInvItems = invoice.items.map((it) => ({
        id: it.id,
        invoice_id: invoice.id,
        sku_id: toUUID(it.skuId, 'k'),
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount_amount: it.discountAmount,
        tax_amount: it.taxAmount || 0,
        line_total: it.lineTotal,
      }));
      const { error: itemsErr } = await supabase.from('invoice_items').upsert(dbInvItems);
      if (itemsErr) throw itemsErr;
    }

    // 3. Update Customer Balance
    const { error: custErr } = await supabase
      .from('customers')
      .update({ current_balance: newCustomerBalance, updated_at: new Date().toISOString() })
      .eq('id', toUUID(customerId, 'c'));
    if (custErr) throw custErr;

    // 4. Insert Ledger Entry
    const dbLedger = {
      id: ledgerEntry.id,
      entry_number: ledgerEntry.entryNumber,
      customer_id: toUUID(ledgerEntry.customerId, 'c'),
      entry_date: ledgerEntry.entryDate,
      transaction_type: ledgerEntry.transactionType,
      reference_module: ledgerEntry.referenceModule,
      reference_id: ledgerEntry.referenceId,
      description: ledgerEntry.description,
      debit_amount: ledgerEntry.debitAmount,
      credit_amount: ledgerEntry.creditAmount,
      running_balance: ledgerEntry.runningBalance,
      created_at: ledgerEntry.createdAt || new Date().toISOString(),
    };
    const { error: ledErr } = await supabase.from('ledger_entries').upsert(dbLedger);
    if (ledErr) throw ledErr;

    // 5. Update Inventory Balances
    for (const bal of inventoryBalances) {
      await supabase
        .from('inventory_balances')
        .update({ quantity_on_hand: bal.quantityOnHand, last_updated_at: new Date().toISOString() })
        .eq('warehouse_id', 'w0000000-0000-0000-0000-000000000001')
        .eq('sku_id', toUUID(bal.skuId, 'k'));
    }

    // 6. Insert Inventory Transactions
    if (inventoryTransactions && inventoryTransactions.length > 0) {
      const dbTxs = inventoryTransactions.map((tx) => ({
        id: tx.id,
        transaction_number: tx.transactionNumber,
        transaction_type: tx.transactionType,
        warehouse_id: 'w0000000-0000-0000-0000-000000000001',
        sku_id: toUUID(tx.skuId, 'k'),
        quantity: tx.quantity,
        unit_price: tx.unitPrice,
        reference_module: tx.referenceModule,
        reference_id: tx.referenceId,
        notes: tx.notes || '',
        created_at: tx.createdAt || new Date().toISOString(),
      }));
      await supabase.from('inventory_transactions').upsert(dbTxs);
    }

    return true;
  } catch (err) {
    console.error(`❌ DB Sync: Error uploading invoice posting data to Supabase:`, err);
    return false;
  }
}

export async function syncVisitToSupabase(visit: CustomerVisit): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const dbVisit = {
      id: visit.id,
      customer_id: toUUID(visit.customerId, 'c'),
      sales_user_id: CONST_SALES_USER_UUID,
      checkin_time: visit.checkinTime,
      checkout_time: visit.checkoutTime || null,
      latitude: visit.latitude || null,
      longitude: visit.longitude || null,
      purpose: visit.purpose,
      notes: visit.notes || '',
      order_placed: !!visit.orderPlaced,
      recovery_collected: !!visit.recoveryCollected,
      next_followup_date: visit.nextFollowupDate || null,
      created_at: visit.checkinTime || new Date().toISOString(),
    };

    const { error: visitErr } = await supabase.from('customer_visits').upsert(dbVisit);
    if (visitErr) throw visitErr;
    return true;
  } catch (err) {
    console.error(`❌ DB Sync: Error uploading visit log ${visit.id} to Supabase:`, err);
    return false;
  }
}

export async function syncCustomerToSupabase(customer: Customer): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const dbCust = {
      id: toUUID(customer.id, 'c'),
      customer_code: customer.customerCode,
      company_name: customer.companyName,
      contact_person: customer.contactPerson,
      phone: customer.phone,
      email: customer.email || '',
      type: customer.type,
      tax_number: customer.taxNumber || '',
      cnic: customer.cnic || '',
      address: customer.address,
      city: customer.city,
      region: customer.region,
      credit_limit: customer.creditLimit,
      credit_days: customer.creditDays,
      opening_balance: customer.openingBalance,
      current_balance: customer.currentBalance,
      is_credit_locked: !!customer.isCreditLocked,
      is_active: !!customer.isActive,
      created_at: customer.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: custErr } = await supabase.from('customers').upsert(dbCust);
    if (custErr) throw custErr;
    return true;
  } catch (err) {
    console.error(`❌ DB Sync: Error uploading customer ${customer.companyName} to Supabase:`, err);
    return false;
  }
}
