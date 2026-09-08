import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CustomerVisit, PaymentMode, SalesOrder, CustomerRegistrationRequest } from '../types';
import type { ImportEntityType } from './importEngine';
import { assertAuthorizedApprover } from './production-users';

function db() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

function requireDb(operation: string) {
  const client = db();
  if (!client) {
    throw new Error(`${operation} failed. Production database is not configured or unavailable.`);
  }
  return client;
}

export async function recordAuditLog(input: {
  action: string;
  module: string;
  recordType?: string;
  recordId?: string;
  details?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const client = requireDb('Audit logging');
  const { data, error } = await client.rpc('nlink_record_audit', {
    p_action: input.action,
    p_module: input.module,
    p_record_type: input.recordType || null,
    p_record_id: input.recordId || null,
    p_old_value: input.oldValue || null,
    p_new_value: input.newValue ? { ...input.newValue, details: input.details } : (input.details ? { details: input.details } : null),
  });
  if (error) throw error;
  return data as string;
}

export async function submitOrder(order: Partial<SalesOrder>, recoveryAmount = 0) {
  const client = requireDb('Order submission');
  const items = (order.items || []).map((item) => ({
    sku_id: item.skuId,
    order_qty: item.orderedQuantity,
    unit_price: item.unitPrice,
  }));
  if (!order.customerId) throw new Error('Customer is required before submitting an order.');
  if (!items.length) throw new Error('At least one SKU is required before submitting an order.');
  const { data, error } = await client.rpc('nlink_submit_order', {
    p_customer_id: order.customerId,
    p_items: items,
    p_recovery_amount: recoveryAmount,
    p_remarks: order.creditCheckNotes || null,
  });
  if (error) throw error;
  await recordAuditLog({ action: 'ORDER_SUBMIT', module: 'SALES_ORDERS', recordType: 'sales_orders', recordId: data as string, details: `Sales order ${data} submitted for customer ${order.customerId}`, newValue: { customerId: order.customerId, itemsCount: items.length, recoveryAmount } });
  return data as string;
}

export async function approveOrder(orderId: string, notes?: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Order approval');
  const { data, error } = await client.rpc('nlink_approve_order', { p_order_id: orderId, p_notes: notes || null });
  if (error) throw error;
  await recordAuditLog({ action: 'ORDER_APPROVE', module: 'SALES_ORDERS', recordType: 'sales_orders', recordId: orderId, details: `Sales order ${orderId} approved by authorized officer (${approverEmail}).`, newValue: { status: 'APPROVED', notes, approverEmail } });
  return Boolean(data ?? true);
}

export async function rejectOrder(orderId: string, reason?: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Order rejection');
  const { data, error } = await client.rpc('nlink_reject_order', { p_order_id: orderId, p_reason: reason || null });
  if (error) throw error;
  await recordAuditLog({ action: 'ORDER_REJECT', module: 'SALES_ORDERS', recordType: 'sales_orders', recordId: orderId, details: `Sales order ${orderId} rejected by authorized officer (${approverEmail}). Reason: ${reason || 'Unspecified'}`, newValue: { status: 'REJECTED', reason, approverEmail } });
  return Boolean(data ?? true);
}

export async function postInvoice(orderId: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Invoice posting');
  const { data, error } = await client.rpc('nlink_post_invoice', { p_order_id: orderId });
  if (error) throw error;
  await recordAuditLog({ action: 'INVOICE_POST', module: 'INVOICES', recordType: 'invoices', recordId: data as string, details: `Official invoice generated for order ${orderId} authorized by ${approverEmail}`, newValue: { invoiceId: data, orderId, approverEmail } });
  return data as string;
}

export async function recordRecovery(input: { customerId: string; amount: number; paymentMode: PaymentMode; instrumentNumber?: string; bankName?: string; remarks?: string }) {
  const client = requireDb('Recovery recording');
  if (!input.customerId || input.amount <= 0) throw new Error('Customer and a recovery amount greater than zero are required.');
  const { data, error } = await client.rpc('nlink_record_recovery', {
    p_customer_id: input.customerId,
    p_amount: input.amount,
    p_payment_method: input.paymentMode === 'ONLINE_TRANSFER' ? 'ONLINE_TRANSFER' : input.paymentMode,
    p_instrument_no: input.instrumentNumber || null,
    p_bank_name: input.bankName || null,
    p_remarks: input.remarks || null,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) throw error;
  await recordAuditLog({ action: 'RECOVERY_CREATE', module: 'RECOVERIES', recordType: 'recoveries', recordId: data as string, details: `Payment recovery of PKR ${input.amount} recorded for customer ${input.customerId} via ${input.paymentMode}`, newValue: { customerId: input.customerId, amount: input.amount, mode: input.paymentMode } });
  return data as string;
}

export async function verifyRecovery(recoveryId: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Recovery verification');
  const { data, error } = await client.rpc('nlink_verify_recovery', { p_recovery_id: recoveryId });
  if (error) throw error;
  await recordAuditLog({ action: 'RECOVERY_VERIFY', module: 'RECOVERIES', recordType: 'recoveries', recordId: recoveryId, details: `Payment recovery ${recoveryId} verified by authorized officer (${approverEmail}).`, newValue: { status: 'APPROVED', approverEmail } });
  return Boolean(data ?? true);
}

export async function rejectRecovery(recoveryId: string, reason?: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Recovery rejection');
  const { error } = await client.rpc('nlink_reject_recovery', { p_recovery_id: recoveryId, p_reason: reason || null });
  if (error) throw error;
  await recordAuditLog({ action: 'RECOVERY_REJECT', module: 'RECOVERIES', recordType: 'recoveries', recordId: recoveryId, details: `Payment recovery ${recoveryId} rejected by authorized officer (${approverEmail}). Reason: ${reason || 'Unspecified'}`, newValue: { status: 'REJECTED', reason, approverEmail } });
  return true;
}

export async function logVisit(visit: Partial<CustomerVisit>) {
  const client = requireDb('Visit recording');
  const { data: employeeId, error: employeeError } = await client.rpc('nlink_current_employee_id');
  if (employeeError) throw employeeError;
  if (!employeeId) throw new Error('No active employee is linked to the current login.');
  const { data, error } = await client.from('customer_visits').insert({
    visit_code: `VIS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    customer_id: visit.customerId,
    employee_id: employeeId,
    visit_at: visit.checkinTime || new Date().toISOString(),
    latitude: visit.latitude ?? null,
    longitude: visit.longitude ?? null,
    productive: Boolean(visit.orderPlaced),
    notes: visit.notes || null,
  }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'VISIT_LOG', module: 'VISITS', recordType: 'customer_visits', recordId: data.id, details: `GPS customer visit recorded for customer ${visit.customerId}`, newValue: { customerId: visit.customerId, productive: visit.orderPlaced } });
  return data.id as string;
}

export interface BulkImportResult { batchId: string; batchCode: string; totalRows: number; successCount: number; failureCount: number; duplicateCount: number; errors: Array<{ rowNumber: number; error: string }> }

export async function executeSupabaseBulkImport(entityType: ImportEntityType, rows: Record<string, unknown>[], duplicateStrategy: 'UPDATE' | 'SKIP' | 'REJECT', userId?: string): Promise<BulkImportResult> {
  const client = requireDb('Bulk import');
  if (!rows.length) throw new Error('Import file contains no data rows.');
  const batchCode = `BATCH-${entityType}-${Date.now()}`;
  let batchId = crypto.randomUUID();
  const { data: batchData, error: batchError } = await client.from('import_batches').insert({ batch_code: batchCode, entity_type: entityType, uploaded_by: userId || null, total_rows: rows.length, duplicate_strategy: duplicateStrategy, status: 'PROCESSING' }).select('id').single();
  if (batchError) throw batchError;
  if (batchData?.id) batchId = batchData.id;
  let successCount = 0, failureCount = 0, duplicateCount = 0;
  const errors: Array<{ rowNumber: number; error: string }> = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    try {
      if (entityType === 'CUSTOMERS') {
        const customerCode = String(row.customerCode || '').trim();
        if (!customerCode) throw new Error('Customer code is required.');
        const { data: existing, error: lookupError } = await client.from('customers').select('id').eq('customer_code', customerCode).maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) {
          duplicateCount++;
          if (duplicateStrategy === 'SKIP') continue;
          if (duplicateStrategy === 'REJECT') throw new Error(`Customer code '${customerCode}' already exists.`);
          const { error } = await client.from('customers').update({ name: String(row.companyName || row.name || ''), owner_name: row.contactPerson ? String(row.contactPerson) : null, mobile: row.phone ? String(row.phone) : null, customer_type: (row.type as any) || 'DEALER', address: row.address ? String(row.address) : null, city: row.city ? String(row.city) : null, territory: row.region ? String(row.region) : null, credit_limit: Number(row.creditLimit) || 0, credit_days: Number(row.creditDays) || 0, updated_at: new Date().toISOString() }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await client.from('customers').insert({ customer_code: customerCode, customer_type: (row.type as any) || 'DEALER', name: String(row.companyName || row.name || ''), owner_name: row.contactPerson ? String(row.contactPerson) : null, mobile: row.phone ? String(row.phone) : null, address: row.address ? String(row.address) : null, city: row.city ? String(row.city) : null, territory: row.region ? String(row.region) : null, credit_limit: Number(row.creditLimit) || 0, credit_days: Number(row.creditDays) || 0, opening_balance: Number(row.openingBalance) || 0, status: false });
          if (error) throw error;
        }
        successCount++;
      } else if (entityType === 'PRODUCTS_SKUS') {
        const skuCode = String(row.skuCode || '').trim();
        if (!skuCode) throw new Error('SKU code is required.');
        const { data: existing, error: lookupError } = await client.from('skus').select('id').eq('sku_code', skuCode).maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) {
          duplicateCount++;
          if (duplicateStrategy === 'SKIP') continue;
          if (duplicateStrategy === 'REJECT') throw new Error(`SKU code '${skuCode}' already exists.`);
          const { error } = await client.from('skus').update({ sku_name: String(row.name || ''), units_per_carton: Number(row.cartonQuantity) || 1, trade_price: Number(row.tradePrice) || 0, sale_price: Number(row.retailPrice) || 0, dealer_price: Number(row.minimumPrice || row.tradePrice) || 0, reorder_level: Number(row.reorderLevel) || 0, barcode: row.barcode ? String(row.barcode) : null, updated_at: new Date().toISOString() }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { data: product } = await client.from('products').select('id').limit(1).maybeSingle();
          if (!product?.id) throw new Error('Product master must be created before importing SKUs.');
          const { error } = await client.from('skus').insert({ sku_code: skuCode, product_id: product.id, sku_name: String(row.name || ''), units_per_carton: Number(row.cartonQuantity) || 1, trade_price: Number(row.tradePrice) || 0, sale_price: Number(row.retailPrice) || 0, dealer_price: Number(row.minimumPrice || row.tradePrice) || 0, reorder_level: Number(row.reorderLevel) || 0, barcode: row.barcode ? String(row.barcode) : null, status: true });
          if (error) throw error;
        }
        successCount++;
      } else if (entityType === 'EMPLOYEES') {
        const empCode = String(row.employeeCode || '').trim();
        if (!empCode) throw new Error('Employee code is required.');
        const { data: existing, error: lookupError } = await client.from('employees').select('id').eq('employee_code', empCode).maybeSingle();
        if (lookupError) throw lookupError;
        const { data: role, error: roleError } = await client.from('roles').select('id').eq('role_code', String(row.roleCode || 'SALES_RECOVERY').toUpperCase()).maybeSingle();
        if (roleError) throw roleError;
        if (!role?.id) throw new Error('Employee role is required and must exist in the role master.');
        if (existing) {
          duplicateCount++;
          if (duplicateStrategy === 'SKIP') continue;
          if (duplicateStrategy === 'REJECT') throw new Error(`Employee code '${empCode}' already exists.`);
          const { error } = await client.from('employees').update({ full_name: String(row.fullName || ''), mobile: row.mobile ? String(row.mobile) : null, email: row.email ? String(row.email) : null, role_id: role.id, updated_at: new Date().toISOString() }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await client.from('employees').insert({ employee_code: empCode, full_name: String(row.fullName || ''), mobile: row.mobile ? String(row.mobile) : null, email: row.email ? String(row.email) : null, role_id: role.id, head: (row.head as any) || 'SALES_RECOVERY', status: true });
          if (error) throw error;
        }
        successCount++;
      } else {
        throw new Error(`Unsupported import entity type: ${entityType}`);
      }
    } catch (err) {
      failureCount++;
      errors.push({ rowNumber, error: err instanceof Error ? err.message : 'Database insertion error' });
    }
  }
  const finalStatus = failureCount > 0 && successCount === 0 ? 'FAILED' : 'COMPLETED';
  const { error: updateError } = await client.from('import_batches').update({ status: finalStatus, success_count: successCount, failure_count: failureCount, duplicate_count: duplicateCount, error_summary: errors.length > 0 ? errors : null }).eq('batch_code', batchCode);
  if (updateError) throw updateError;
  await recordAuditLog({ action: 'EXCEL_IMPORT', module: entityType, details: `Imported ${successCount} ${entityType} records (Failed: ${failureCount}, Duplicates: ${duplicateCount}) with strategy ${duplicateStrategy}`, newValue: { batchCode, entityType, totalRows: rows.length, successCount, failureCount, duplicateCount } });
  return { batchId, batchCode, totalRows: rows.length, successCount, failureCount, duplicateCount, errors };
}

export async function getRoles() {
  const client = requireDb('Role lookup');
  const { data, error } = await client.from('roles').select('id, role_code, name, description');
  if (error) throw error;
  return data;
}

export async function createEmployee(data: { employeeCode?: string; fullName: string; mobile: string; email: string; roleCode: string; head: 'MANUFACTURER' | 'SALES_RECOVERY' | 'DEALERSHIP' | 'DISTRIBUTOR' | 'LOGISTICS'; branchId?: string; factoryId?: string; warehouseId?: string }) {
  const client = requireDb('Employee creation');
  const empCode = data.employeeCode || `NL-EMP-${String(Date.now()).slice(-6)}`;
  const { data: role, error: roleError } = await client.from('roles').select('id').eq('role_code', data.roleCode).single();
  if (roleError) throw new Error(`Role ${data.roleCode} not found in database.`);
  const { data: inserted, error } = await client.from('employees').insert({ employee_code: empCode, full_name: data.fullName, mobile: data.mobile, email: data.email, role_id: role.id, head: data.head, branch_id: data.branchId || null, factory_id: data.factoryId || null, warehouse_id: data.warehouseId || null, status: true }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'USER_CREATE', module: 'EMPLOYEES', recordType: 'employees', recordId: inserted.id, details: `Employee ${data.fullName} (${empCode}) created with role ${data.roleCode}`, newValue: { ...data, employeeCode: empCode } });
  return inserted.id as string;
}

export async function linkAuthToUser(employeeId: string, email: string, username: string, authUserId: string) {
  const client = requireDb('User account linking');
  const { data, error } = await client.from('users').insert({ user_code: `USR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, employee_id: employeeId, auth_user_id: authUserId, username: username || email, status: true }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'USER_CREATE', module: 'USERS', recordType: 'users', recordId: data.id, details: `User account ${username} linked to employee ${employeeId}`, newValue: { username, employeeId, authUserId } });
  return data.id as string;
}

export async function updateEmployeeRole(employeeId: string, roleCode: string) {
  const client = requireDb('Employee role update');
  const { data: role, error: roleError } = await client.from('roles').select('id').eq('role_code', roleCode).single();
  if (roleError) throw new Error(`Role ${roleCode} not found in database.`);
  const { error } = await client.from('employees').update({ role_id: role.id }).eq('id', employeeId);
  if (error) throw error;
  await recordAuditLog({ action: 'ROLE_CHANGE', module: 'EMPLOYEES', recordType: 'employees', recordId: employeeId, details: `Role updated to ${roleCode} for employee ${employeeId}`, newValue: { roleCode } });
  return true;
}

export async function toggleEmployeeStatus(employeeId: string, isActive: boolean) {
  const client = requireDb('Employee status update');
  const { error } = await client.from('employees').update({ status: isActive }).eq('id', employeeId);
  if (error) throw error;
  const { error: userError } = await client.from('users').update({ status: isActive }).eq('employee_id', employeeId);
  if (userError) throw userError;
  await recordAuditLog({ action: 'USER_UPDATE', module: 'EMPLOYEES', recordType: 'employees', recordId: employeeId, details: `Employee ${employeeId} status set to ${isActive ? 'ACTIVE' : 'INACTIVE'}`, newValue: { isActive } });
  return true;
}

export async function assignEmployeeHierarchy(employeeId: string, level: string, referenceId: string) {
  const client = requireDb('Hierarchy assignment');
  const { data, error } = await client.from('employee_hierarchy_assignments').insert({ employee_id: employeeId, hierarchy_level: level, reference_id: referenceId, status: true }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'HIERARCHY_ASSIGN', module: 'HIERARCHY', recordType: 'employee_hierarchy_assignments', recordId: data.id, details: `Employee ${employeeId} assigned to hierarchy level ${level} (${referenceId})`, newValue: { employeeId, level, referenceId } });
  return data.id as string;
}

export async function assignCustomerRepresentative(customerId: string, employeeId: string | null) {
  const client = requireDb('Customer assignment');
  const { error } = await client.from('customers').update({ assigned_employee_id: employeeId }).eq('id', customerId);
  if (error) throw error;
  await recordAuditLog({ action: 'CUSTOMER_UPDATE', module: 'CUSTOMERS', recordType: 'customers', recordId: customerId, details: `Customer ${customerId} assigned to sales representative ${employeeId || 'NONE'}`, newValue: { customerId, employeeId } });
  return true;
}

export async function registerCustomerPending(req: any) {
  const client = requireDb('Customer registration');
  const customerCode = String(req.customerCode || `CUST-REG-${Math.floor(100000 + Math.random() * 900000)}`).trim();
  const custName = String(req.businessName || req.name || req.companyName || '').trim();
  if (!custName) throw new Error('Business name is required.');
  const ownerName = req.ownerName || req.contactPerson || null;
  const mobile = req.contactNumber || req.phone || req.mobile || null;
  const address = req.address || null;
  const city = req.city || req.town || null;
  const territory = req.territory || req.region || null;
  const customerType = req.type || req.customerType;
  if (!['DEALER', 'DISTRIBUTOR'].includes(customerType)) throw new Error('Customer type must be DEALER or DISTRIBUTOR.');
  const creditLimit = Number(req.proposedCreditLimit ?? req.creditLimit);
  const creditDays = Number(req.proposedCreditDays ?? req.creditDays);
  if (!Number.isFinite(creditLimit) || creditLimit < 0) throw new Error('A valid proposed credit limit is required.');
  if (!Number.isFinite(creditDays) || creditDays < 0) throw new Error('A valid proposed credit period is required.');
  const { data, error } = await client.from('customers').insert({ customer_code: customerCode, customer_type: customerType, name: custName, owner_name: ownerName, mobile, address, city, territory, credit_limit: creditLimit, credit_days: creditDays, opening_balance: Number(req.proposedOpeningBalance ?? req.openingBalance) || 0, status: false, remarks: req.additionalNotes || null }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'CUSTOMER_CREATE_PENDING', module: 'CUSTOMERS', recordType: 'customers', recordId: data.id, details: `New ${customerType} registration submitted: ${custName} (${customerCode}). Pending executive approval.`, newValue: { ...req, customerCode } });
  return data.id as string;
}

export async function approveCustomerRegistration(customerId: string, approvedCustomerCode: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Customer approval');
  if (!approvedCustomerCode?.trim()) throw new Error('Official customer code is required for approval.');
  const { error } = await client.from('customers').update({ customer_code: approvedCustomerCode.trim(), status: true, updated_at: new Date().toISOString() }).eq('id', customerId).eq('status', false);
  if (error) throw error;
  await recordAuditLog({ action: 'CUSTOMER_APPROVE', module: 'CUSTOMERS', recordType: 'customers', recordId: customerId, details: `Customer application approved by authorized officer (${approverEmail}). Official Party Code: ${approvedCustomerCode}`, newValue: { customerCode: approvedCustomerCode, status: true, approverEmail } });
  return true;
}

export async function rejectCustomerRegistration(customerId: string, reason: string, approverEmail?: string) {
  assertAuthorizedApprover(approverEmail);
  const client = requireDb('Customer rejection');
  if (!reason?.trim()) throw new Error('Rejection reason is required.');
  const { error } = await client.from('customers').update({ status: false, remarks: `REJECTED: ${reason.trim()}`, updated_at: new Date().toISOString() }).eq('id', customerId).eq('status', false);
  if (error) throw error;
  await recordAuditLog({ action: 'CUSTOMER_REJECT', module: 'CUSTOMERS', recordType: 'customers', recordId: customerId, details: `Customer application rejected by authorized officer (${approverEmail}). Reason: ${reason}`, newValue: { status: false, reason, approverEmail } });
  return true;
}

export async function saveEmployeeRecord(employee: { employeeCode?: string; fullName: string; fatherName?: string; cnic?: string; mobile: string; whatsapp?: string; email?: string; address?: string; department: string; designationCode?: string; joiningDate?: string; employmentStatus?: string }) {
  const client = requireDb('Employee registration');
  const empCode = employee.employeeCode || `NL-EMP-${String(Date.now()).slice(-6)}`;
  const { data, error } = await client.from('employees').insert({ employee_code: empCode, full_name: employee.fullName, father_name: employee.fatherName || null, cnic: employee.cnic || null, mobile: employee.mobile, whatsapp: employee.whatsapp || null, email: employee.email || null, address: employee.address || null, department: employee.department || 'SALES', designation_code: employee.designationCode || null, joining_date: employee.joiningDate || new Date().toISOString().slice(0, 10), employment_status: employee.employmentStatus || 'ACTIVE', status: true }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'EMPLOYEE_CREATE', module: 'EMPLOYEES', recordType: 'employees', recordId: data.id, details: `Employee profile registered: ${employee.fullName} (${empCode})`, newValue: { ...employee, employeeCode: empCode } });
  return data.id as string;
}

export async function saveEmployeeSalary(salary: { employeeId: string; basicSalary: number; allowances?: Array<{ name: string; amount: number }>; grossSalary: number; effectiveFrom: string; salaryStatus?: string }) {
  const client = requireDb('Salary update');
  const { error: archiveError } = await client.from('employee_salaries').update({ salary_status: 'SUPERSEDED', effective_to: salary.effectiveFrom }).eq('employee_id', salary.employeeId).eq('salary_status', 'ACTIVE');
  if (archiveError) throw archiveError;
  const { data, error } = await client.from('employee_salaries').insert({ employee_id: salary.employeeId, basic_salary: salary.basicSalary, allowances: salary.allowances || [], gross_salary: salary.grossSalary, effective_from: salary.effectiveFrom, salary_status: salary.salaryStatus || 'ACTIVE' }).select('id').single();
  if (error) throw error;
  await recordAuditLog({ action: 'SALARY_UPDATE', module: 'EMPLOYEES', recordType: 'employee_salaries', recordId: data.id, details: `Salary updated for employee ${salary.employeeId}`, newValue: salary as any });
  return data.id as string;
}
