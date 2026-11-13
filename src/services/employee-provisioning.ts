import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ProvisionEmployeeInput {
  email: string;
  full_name: string;
  employee_code: string;
  mobile?: string;
  role_code: string;
  employee_no?: string;
  manager_employee_id?: string | null;
  branch_id?: string | null;
  factory_id?: string | null;
  warehouse_id?: string | null;
  territory?: string | null;
}

export async function provisionEmployee(input: ProvisionEmployeeInput) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Production database is not configured.');
  const { data, error } = await supabase.functions.invoke('employee-provision', { body: input });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Employee provisioning failed.');
  return data.employee;
}
