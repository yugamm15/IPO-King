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

const LIVE_INITIAL_IPOS = [
  {
    ipo_name: 'Swiggy Ltd IPO',
    symbol: 'NSE: SWIGGY | BSE: 544200',
    price_band_min: 371,
    price_band_max: 390,
    lot_size: 38,
    status: 'open'
  },
  {
    ipo_name: 'Tata Technologies',
    symbol: 'NSE: TATATECH',
    price_band_min: 475,
    price_band_max: 500,
    lot_size: 30,
    status: 'upcoming'
  },
  {
    ipo_name: 'Bajaj Housing Finance',
    symbol: 'NSE: BAJAJHFL',
    price_band_min: 66,
    price_band_max: 70,
    lot_size: 214,
    status: 'listed'
  }
];

export async function fetchLiveIpos() {
  try {
    const { data, error } = await supabase.from('ipos').select('*').order('created_at', { ascending: false });
    
    if (!error && data && data.length > 0) {
      return data;
    }

    // Try fetching from backend API scraper
    try {
      const apiRes = await fetch('/api/v1/ipos/live');
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.data && json.data.length > 0) {
          // Sync into Supabase table automatically
          await supabase.from('ipos').upsert(json.data.map(item => ({
            ipo_name: item.ipo_name,
            symbol: item.company_name || item.symbol || 'NSE / BSE',
            price_band_min: item.price_band_min || 100,
            price_band_max: item.price_band_max || 120,
            lot_size: item.lot_size || 50,
            status: item.status || 'open'
          })), { onConflict: 'ipo_name' });
          
          const { data: newData } = await supabase.from('ipos').select('*');
          if (newData && newData.length > 0) return newData;
        }
      }
    } catch (_) { /* ignore network error */ }

    // Seed initial live market rows to Supabase if table is currently empty
    if (!error) {
      await supabase.from('ipos').insert(LIVE_INITIAL_IPOS).catch(() => {});
      const { data: seededData } = await supabase.from('ipos').select('*');
      if (seededData && seededData.length > 0) return seededData;
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
      pan_number: item.customers?.pan_number || 'N/A',
      bank_account: item.customers?.bank_account_no ? `•••• ${item.customers.bank_account_no.slice(-4)}` : '•••• 0000',
      ipo_applied: item.ipos?.ipo_name || 'IPO',
      qty: `${item.quantity || 0} shares`,
      status: item.allotment_status || 'Pending',
      profit_40: `₹ ${(Number(item.bid_amount || 0) * 0.4).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      tds_10: `₹ ${(Number(item.bid_amount || 0) * 0.04).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      action: item.allotment_status === 'Rejected' ? 'Refunded' : 'Details'
    }));
  } catch (err) {
    console.warn('Supabase fetch Applications error:', err);
    return [];
  }
}

export async function fetchDashboardStats() {
  try {
    const { count: custCount, error: custError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { data: appsData } = await supabase
      .from('applications')
      .select('bid_amount, quantity, allotment_status');

    const totalCustomers = custError ? 0 : (custCount || 0);
    
    let totalAppliedFund = 0;
    let totalCustomerProfit = 0;
    let totalTdsDeducted = 0;

    if (appsData && appsData.length > 0) {
      appsData.forEach((app) => {
        const bid = Number(app.bid_amount) || 0;
        totalAppliedFund += bid;
        
        if (app.allotment_status === 'Full Allotment' || app.allotment_status === 'Partial Allotment') {
          const profit = bid * 0.40;
          const tds = profit * 0.10;
          totalCustomerProfit += profit;
          totalTdsDeducted += tds;
        }
      });
    }

    const formatAmount = (num) => {
      if (num === 0) return '0.00';
      if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
      if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    return {
      totalCustomers: totalCustomers.toLocaleString('en-IN'),
      appliedFundPool: formatAmount(totalAppliedFund),
      customerProfit: formatAmount(totalCustomerProfit),
      tdsDeducted: formatAmount(totalTdsDeducted)
    };
  } catch (err) {
    console.warn('Supabase fetch stats error:', err);
    return {
      totalCustomers: '0',
      appliedFundPool: '0.00',
      customerProfit: '0.00',
      tdsDeducted: '0.00'
    };
  }
}

export function subscribeToRealtimeChanges(onChangeCallback) {
  const channel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ipos' }, () => onChangeCallback())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => onChangeCallback())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => onChangeCallback())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
