import { supabase, isSupabaseConfigured, hybridStorage } from '../lib/supabase';

/**
 * N-LINK-360 Cloud ERP & Financial Accounting Database Layer
 * Supports Supabase cloud operations with automatic zero-crash localStorage hybrid fallback.
 */

export interface CloudProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  territory?: string;
  region?: string;
  status: string;
}

export interface CloudParty {
  id: string;
  partyCode: string;
  businessName: string;
  contactPerson?: string;
  phone?: string;
  city: string;
  territory: string;
  region: string;
  partyType: string;
  creditLimit: number;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
}

export interface CloudProduct {
  id: string;
  skuCode: string;
  itemName: string;
  category: string;
  cartonSize: number;
  tradePrice: number;
  retailPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface CloudOrder {
  id: string;
  orderNumber: string;
  bookingDate: string;
  bookerId: string;
  bookerName: string;
  partyId: string;
  partyName: string;
  territory: string;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  status: string;
  notes?: string;
}

export interface CloudLedgerEntry {
  id: string;
  transactionDate: string;
  partyId: string;
  partyName: string;
  voucherType: string;
  referenceNo?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  narration?: string;
}

// --- PARTIES SERVICE ---
export async function getCloudParties(): Promise<CloudParty[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('parties').select('*');
    if (!error && data) {
      return data.map((p: any) => ({
        id: p.id,
        partyCode: p.party_code,
        businessName: p.business_name,
        contactPerson: p.contact_person,
        phone: p.phone,
        city: p.city,
        territory: p.territory,
        region: p.region,
        partyType: p.party_type,
        creditLimit: Number(p.credit_limit || 0),
        openingBalance: Number(p.opening_balance || 0),
        currentBalance: Number(p.current_balance || 0),
        isActive: Boolean(p.is_active),
      }));
    }
  }
  // Fallback to local storage
  const cached = hybridStorage.getItem('nlink_parties_cache');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return [
    {
      id: 'CUST-001',
      partyCode: 'PST-D1',
      businessName: 'Khyber Electric Store',
      contactPerson: 'Haji Gulbaz Khan',
      phone: '0300-5511223',
      city: 'Peshawar',
      territory: 'Peshawar City',
      region: 'KPK',
      partyType: 'DEALER',
      creditLimit: 500000,
      openingBalance: 120000,
      currentBalance: 150000,
      isActive: true,
    },
    {
      id: 'CUST-002',
      partyCode: 'PST-D2',
      businessName: 'Peshawar Light House',
      contactPerson: 'Tariq Mehmood',
      phone: '0321-9876543',
      city: 'Peshawar',
      territory: 'Peshawar City',
      region: 'KPK',
      partyType: 'DEALER',
      creditLimit: 750000,
      openingBalance: 200000,
      currentBalance: 240000,
      isActive: true,
    },
  ];
}

// --- PRODUCTS SERVICE ---
export async function getCloudProducts(): Promise<CloudProduct[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('erp_products').select('*');
    if (!error && data) {
      return data.map((pr: any) => ({
        id: pr.id,
        skuCode: pr.sku_code,
        itemName: pr.item_name,
        category: pr.category,
        cartonSize: Number(pr.carton_size || 1),
        tradePrice: Number(pr.trade_price || 0),
        retailPrice: Number(pr.retail_price || 0),
        stockQuantity: Number(pr.stock_quantity || 0),
        reorderLevel: Number(pr.reorder_level || 25),
        isActive: Boolean(pr.is_active),
      }));
    }
  }
  const cached = hybridStorage.getItem('nlink_products_cache');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return [
    {
      id: 'PRD-001',
      skuCode: 'NL-12W-LED',
      itemName: 'National LED Bulb 12W White',
      category: 'LED Bulbs',
      cartonSize: 20,
      tradePrice: 180,
      retailPrice: 220,
      stockQuantity: 500,
      reorderLevel: 25,
      isActive: true,
    },
    {
      id: 'PRD-002',
      skuCode: 'NL-18W-LED',
      itemName: 'National LED Bulb 18W Bright',
      category: 'LED Bulbs',
      cartonSize: 20,
      tradePrice: 250,
      retailPrice: 300,
      stockQuantity: 350,
      reorderLevel: 25,
      isActive: true,
    },
    {
      id: 'PRD-003',
      skuCode: 'NL-PANEL-36W',
      itemName: 'National Ceiling LED Panel 36W',
      category: 'Panels',
      cartonSize: 10,
      tradePrice: 1200,
      retailPrice: 1450,
      stockQuantity: 120,
      reorderLevel: 15,
      isActive: true,
    },
  ];
}

// --- ORDERS SERVICE ---
export async function createCloudOrder(order: CloudOrder): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('orders').insert({
      id: order.id,
      order_number: order.orderNumber,
      booking_date: order.bookingDate,
      booker_id: order.bookerId,
      booker_name: order.bookerName,
      party_id: order.partyId,
      party_name: order.partyName,
      territory: order.territory,
      total_amount: order.totalAmount,
      discount_amount: order.discountAmount,
      net_amount: order.netAmount,
      status: order.status,
      notes: order.notes,
    });
    if (!error) return true;
  }
  // Fallback cache
  const existing = hybridStorage.getItem('nlink_orders_cache');
  const list = existing ? JSON.parse(existing) : [];
  list.unshift(order);
  hybridStorage.setItem('nlink_orders_cache', JSON.stringify(list));
  return true;
}

// --- REAL-TIME SUBSCRIPTION HOOK HELPER ---
export function subscribeToRealtimeERP(onUpdate: (payload: any) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('nlink360-realtime')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      onUpdate(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
