/**
 * IPO KING - Pure Dynamic Database Service Driver (Supabase / PostgreSQL)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dbConfig = {
  provider: 'supabase',
  url: supabaseUrl,
  status: 'connected'
};

export async function fetchLiveIpos() {
  try {
    const { data, error } = await supabase.from('ipos').select('*').order('created_at', { ascending: false });
    
    if (!error && data) {
      return data;
    }
    return [];
  } catch (err) {
    console.warn('Supabase fetch Live IPOs error:', err);
    return [];
  }
}

export async function fetchApplicationsLedger() {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*, customers(full_name, pan_number, bank_account_no), ipos(ipo_name)')
      .order('created_at', { ascending: false });
      
    if (error || !data) {
      return [];
    }
    return data.map(item => ({
      id: item.id,
      customer_name: item.customers?.full_name || 'Customer',
      pan: item.customers?.pan_number || '—',
      ipo_name: item.ipos?.ipo_name || 'IPO Offering',
      lots_applied: item.lots_applied || 1,
      bid_amount: item.bid_amount || 15000,
      allotment_status: item.allotment_status || 'Pending',
      profit_amount: item.profit_amount || 0,
      client_share_60: item.client_share_60 || 0,
      admin_share_40: item.admin_share_40 || 0,
      tds_10: item.tds_10 || 0,
      net_payout: item.net_payout || 0,
      bank_account: item.customers?.bank_account_no || '—'
    }));
  } catch (err) {
    console.warn('Supabase fetch applications ledger error:', err);
    return [];
  }
}

export async function fetchDashboardStats() {
  try {
    const [custRes, appRes, ipoRes] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('*'),
      supabase.from('ipos').select('id', { count: 'exact', head: true })
    ]);

    const totalCustomers = custRes.count || 0;
    const totalIpos = ipoRes.count || 0;
    const apps = appRes.data || [];

    const totalVolume = apps.reduce((sum, a) => sum + (Number(a.bid_amount) || 0), 0);
    const totalProfit = apps.reduce((sum, a) => sum + (Number(a.profit_amount) || 0), 0);
    const clientEarnings = apps.reduce((sum, a) => sum + (Number(a.client_share_60) || 0), 0);
    const adminCommission = apps.reduce((sum, a) => sum + (Number(a.admin_share_40) || 0), 0);

    return {
      totalCustomers,
      totalIpos,
      totalVolume,
      totalProfit,
      clientEarnings,
      adminCommission,
      activeBidsCount: apps.length
    };
  } catch (err) {
    console.warn('Supabase fetch stats error:', err);
    return {
      totalCustomers: 0,
      totalIpos: 0,
      totalVolume: 0,
      totalProfit: 0,
      clientEarnings: 0,
      adminCommission: 0,
      activeBidsCount: 0
    };
  }
}

export function subscribeToRealtimeChanges(onPayload) {
  try {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          if (onPayload) onPayload(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}
