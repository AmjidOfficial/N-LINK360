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

export async function getRoles() {
  const client = db();
  const { data, error } = await client.from('roles').select('id, role_code, name, description');
  if (error) throw error;
  return data;
}

export async function createEmployee(data: {
  employeeCode: string;
  fullName: string;
  mobile: string;
  email: string;
  roleCode: string;
  head: 'MANUFACTURER' | 'SALES_RECOVERY' | 'DEALERSHIP' | 'DISTRIBUTOR' | 'LOGISTICS';
  branchId?: string;
  factoryId?: string;
  warehouseId?: string;
}) {
  const client = db();
  
  const { data: role, error: roleError } = await client
    .from('roles')
    .select('id')
    .eq('role_code', data.roleCode)
    .single();
    
  if (roleError) throw new Error(`Role ${data.roleCode} not found in database.`);

  const { data: inserted, error } = await client
    .from('employees')
    .insert({
      employee_code: data.employeeCode,
      full_name: data.fullName,
      mobile: data.mobile,
      email: data.email,
      role_id: role.id,
      head: data.head,
      branch_id: data.branchId || null,
      factory_id: data.factoryId || null,
      warehouse_id: data.warehouseId || null,
      status: true
    })
    .select('id')
    .single();

  if (error) throw error;
  return inserted.id as string;
}

export async function linkAuthToUser(employeeId: string, email: string, username: string, authUserId: string) {
  const client = db();
  const userCode = `USR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  
  const { data, error } = await client
    .from('users')
    .insert({
      user_code: userCode,
      employee_id: employeeId,
      auth_user_id: authUserId,
      username: username || email,
      status: true
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateEmployeeRole(employeeId: string, roleCode: string) {
  const client = db();
  
  const { data: role, error: roleError } = await client
    .from('roles')
    .select('id')
    .eq('role_code', roleCode)
    .single();
    
  if (roleError) throw new Error(`Role ${roleCode} not found in database.`);

  const { error } = await client
    .from('employees')
    .update({ role_id: role.id })
    .eq('id', employeeId);

  if (error) throw error;
  return true;
}

export async function toggleEmployeeStatus(employeeId: string, isActive: boolean) {
  const client = db();
  const { error: employeeError } = await client
    .from('employees')
    .update({ status: isActive })
    .eq('id', employeeId);

  if (employeeError) throw employeeError;

  const { error: userError } = await client
    .from('users')
    .update({ status: isActive })
    .eq('employee_id', employeeId);

  if (userError) return true; // Fail gracefully if no linked user record exists
  return true;
}

export async function assignEmployeeHierarchy(employeeId: string, level: string, referenceId: string) {
  const client = db();
  const { data, error } = await client
    .from('employee_hierarchy_assignments')
    .insert({
      employee_id: employeeId,
      hierarchy_level: level,
      reference_id: referenceId,
      status: true
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function assignCustomerRepresentative(customerId: string, employeeId: string | null) {
  const client = db();
  const { error } = await client
    .from('customers')
    .update({ assigned_employee_id: employeeId })
    .eq('id', customerId);

  if (error) throw error;
  return true;
}

