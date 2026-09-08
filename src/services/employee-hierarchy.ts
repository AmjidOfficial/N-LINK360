import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function assignEmployeeHierarchy(input: { employee_id: string; node_type: 'REGION'|'ZONE'|'AREA'|'TERRITORY'|'TOWN'|'ROUTE'; node_id: string; is_primary?: boolean }) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Production database is not configured.');
  const { data, error } = await supabase.functions.invoke('employee-hierarchy-assign', { body: input });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Hierarchy assignment failed.');
  return data.assignment;
}
