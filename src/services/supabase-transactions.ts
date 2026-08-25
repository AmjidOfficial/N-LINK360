import { supabase } from '../lib/supabase';
import type { CustomerVisit, PaymentMode, SalesOrder } from '../types';

function db() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function submitOrder(order: Partial<SalesOrder>, recoveryAmount = 0) {
  const client = db();
  const items = (order.items || []).map((item) => ({
    sku_id: item.skuId,
    order_qty: item.orderedQuantity,
    unit_price: item.unitPrice,
  }));
  const { data, error } = await client.rpc('nlink_submit_order', {
    p_customer_id: order.customerId,
    p_items: items,
    p_recovery_amount: recoveryAmount,
    p_remarks: order.creditCheckNotes || null,
  });
  if (error) throw error;
  return data as string;
}

export async function postInvoice(orderId: string) {
  const client = db();
  const { data, error } = await client.rpc('nlink_post_invoice', { p_order_id: orderId });
  if (error) throw error;
  return data as string;
}

export async function recordRecovery(input: {
  customerId: string;
  amount: number;
  paymentMode: PaymentMode;
  instrumentNumber?: string;
  bankName?: string;
  remarks?: string;
}) {
  const client = db();
  const paymentMethod = input.paymentMode === 'ONLINE_TRANSFER' ? 'ONLINE_TRANSFER' : input.paymentMode;
  const idempotencyKey = crypto.randomUUID();
  const { data, error } = await client.rpc('nlink_record_recovery', {
    p_customer_id: input.customerId,
    p_amount: input.amount,
    p_payment_method: paymentMethod,
    p_instrument_no: input.instrumentNumber || null,
    p_bank_name: input.bankName || null,
    p_remarks: input.remarks || null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as string;
}

export async function verifyRecovery(recoveryId: string) {
  const client = db();
  const { data, error } = await client.rpc('nlink_verify_recovery', { p_recovery_id: recoveryId });
  if (error) throw error;
  return Boolean(data);
}

export async function logVisit(visit: Partial<CustomerVisit>) {
  const client = db();
  const { data: employeeId, error: employeeError } = await client.rpc('nlink_current_employee_id');
  if (employeeError) throw employeeError;
  if (!employeeId) throw new Error('No active employee is linked to the current login.');

  const { data, error } = await client
    .from('customer_visits')
    .insert({
      visit_code: `VIS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      customer_id: visit.customerId,
      employee_id: employeeId,
      visit_at: visit.checkinTime || new Date().toISOString(),
      latitude: visit.latitude ?? null,
      longitude: visit.longitude ?? null,
      productive: Boolean(visit.orderPlaced),
      notes: visit.notes || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
