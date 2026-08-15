/**
 * IPO KING - Persistent Stale-While-Revalidate (SWR) Instant Database Driver
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

// LocalStorage Persistent Cache Helpers for 0ms cold starts
function getStoredCache(key) {
  try {
    const raw = localStorage.getItem('ipoking_cache_' + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setStoredCache(key, data) {
  try {
    localStorage.setItem('ipoking_cache_' + key, JSON.stringify(data));
  } catch (e) {}
}

const dbCache = {
  ipos: getStoredCache('ipos'),
  applications: getStoredCache('applications'),
  customers: getStoredCache('customers'),
  stats: getStoredCache('stats'),
  iposTimestamp: Date.now(),
  appsTimestamp: Date.now(),
  custTimestamp: Date.now(),
  statsTimestamp: Date.now()
};

const CACHE_TTL_MS = 60000; // 60s background revalidation window

function queryWithTimeout(promise, ms = 10000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase query timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export function invalidateDbCache() {
  // Soft invalidate: triggers background re-fetches without clearing instant 0ms cached data
  fetchLiveIpos(true).catch(() => {});
  fetchApplicationsLedger(true).catch(() => {});
  fetchCustomersShortList(true).catch(() => {});
  fetchDashboardStats(true).catch(() => {});
}

export async function fetchLiveIpos(force = false) {
  // 0ms Instant Cache Return
  if (!force && dbCache.ipos) {
    fetchLiveIpos(true).catch(() => {});
    return dbCache.ipos;
  }

  try {
    const res = await queryWithTimeout(
      supabase.from('ipos').select('*').order('created_at', { ascending: false }),
      3000
    );
    if (!res.error && res.data) {
      dbCache.ipos = res.data;
      dbCache.iposTimestamp = Date.now();
      setStoredCache('ipos', res.data);
      return res.data;
    }
    return dbCache.ipos || [];
  } catch (err) {
    return dbCache.ipos || [];
  }
}

export async function fetchApplicationsLedger(force = false) {
  // 0ms Instant Cache Return
  if (!force && dbCache.applications) {
    fetchApplicationsLedger(true).catch(() => {});
    return dbCache.applications;
  }

  try {
    const res = await queryWithTimeout(
      supabase
        .from('applications')
        .select('*, customers(full_name, pan_number, bank_account_no, dpid), ipos(ipo_name, status, listing_date, price_band_max)')
        .order('created_at', { ascending: false }),
      3000
    );

    if (res.error || !res.data) {
      return dbCache.applications || [];
    }

    const mapped = res.data.map(item => ({
      id: item.id,
      customer_id: item.customer_id,
      ipo_id: item.ipo_id,
      customer_name: item.customers?.full_name || 'Customer',
      pan: item.customers?.pan_number || '—',
      ipo_name: item.ipos?.ipo_name || 'IPO Offering',
      lots_applied: item.lots_applied || item.quantity || 1,
      bid_amount: item.bid_amount || 15000,
      allotment_status: item.allotment_status || 'Pending',
      profit_amount: item.profit_amount || 0,
      client_share_60: item.client_share_60 || 0,
      admin_share_40: item.admin_share_40 || 0,
      tds_10: item.tds_10 || 0,
      net_payout: item.net_payout || 0,
      bank_account: item.customers?.bank_account_no || '—',
      dpid: item.customers?.dpid || '—',
      ipo_status: item.ipos?.status || 'open',
      listing_date: item.ipos?.listing_date || '—'
    }));

    dbCache.applications = mapped;
    dbCache.appsTimestamp = Date.now();
    setStoredCache('applications', mapped);
    return mapped;
  } catch (err) {
    return dbCache.applications || [];
  }
}

export async function fetchCustomersShortList(force = false) {
  // 0ms Instant Cache Return
  if (!force && dbCache.customers) {
    fetchCustomersShortList(true).catch(() => {});
    return dbCache.customers;
  }

  try {
    const res = await queryWithTimeout(
      supabase
        .from('customers')
        .select('id, customer_no, full_name, name, pan_number, bank_account_no, dpid, mobile_number')
        .order('full_name', { ascending: true }),
      3000
    );

    if (!res.error && res.data) {
      dbCache.customers = res.data;
      dbCache.custTimestamp = Date.now();
      setStoredCache('customers', res.data);
      return res.data;
    }
    return dbCache.customers || [];
  } catch (err) {
    return dbCache.customers || [];
  }
}

export async function createApplicationBid(payload) {
  try {
    if (payload.customer_id && payload.ipo_id) {
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('customer_id', payload.customer_id)
        .eq('ipo_id', payload.ipo_id)
        .maybeSingle();

      if (existing) {
        throw new Error('This customer has already applied for this IPO offering!');
      }
    }

    const dbPayload = {
      customer_id: payload.customer_id || null,
      ipo_id: payload.ipo_id || null,
      application_number: payload.application_number || ('APP-' + Math.floor(100000 + Math.random() * 900000)),
      category: payload.category || 'RETAIL',
      quantity: Number(payload.quantity) || Number(payload.lots_applied) || 1,
      bid_amount: Number(payload.bid_amount) || 15000,
      allotment_status: payload.allotment_status || 'Pending'
    };

    const { data, error } = await supabase
      .from('applications')
      .insert([dbPayload])
      .select('*')
      .single();
    if (error) throw error;

    invalidateDbCache();
    return data;
  } catch (err) {
    console.error('Error creating application bid:', err);
    throw err;
  }
}

export async function createMultipleApplicationBids(customerIds = [], payloadBase = {}) {
  if (!customerIds || customerIds.length === 0) return [];
  try {
    if (payloadBase.ipo_id) {
      const { data: existingList } = await supabase
        .from('applications')
        .select('customer_id')
        .eq('ipo_id', payloadBase.ipo_id)
        .in('customer_id', customerIds);

      if (existingList && existingList.length > 0) {
        const existingSet = new Set(existingList.map(e => e.customer_id));
        const filtered = customerIds.filter(id => !existingSet.has(id));
        if (filtered.length === 0) {
          throw new Error('All selected customers have already applied for this IPO offering!');
        }
        customerIds = filtered;
      }
    }

    const records = customerIds.map((cid, idx) => ({
      customer_id: cid,
      ipo_id: payloadBase.ipo_id || null,
      application_number: payloadBase.application_number || ('APP-' + Math.floor(100000 + Math.random() * 900000) + '-' + (idx + 1)),
      category: payloadBase.category || 'RETAIL',
      quantity: Number(payloadBase.quantity) || Number(payloadBase.lots_applied) || 1,
      bid_amount: Number(payloadBase.bid_amount) || 15000,
      allotment_status: payloadBase.allotment_status || 'Pending'
    }));

    const { data, error } = await supabase
      .from('applications')
      .insert(records)
      .select('*');

    if (error) throw error;
    invalidateDbCache();
    return data || [];
  } catch (err) {
    console.error('Error creating multiple application bids:', err);
    throw err;
  }
}

export async function updateApplicationAllotmentStatus(applicationId, allotmentStatus, extraPayload = {}) {
  try {
    const validColumns = ['allotment_status', 'allotted_quantity', 'quantity', 'bid_amount', 'category'];
    const updateData = {
      allotment_status: allotmentStatus
    };

    if (typeof extraPayload === 'object' && extraPayload !== null) {
      for (const key of Object.keys(extraPayload)) {
        if (validColumns.includes(key)) {
          updateData[key] = extraPayload[key];
        }
      }
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', applicationId)
      .select('*')
      .single();

    if (error) throw error;
    invalidateDbCache();
    return data;
  } catch (err) {
    console.error('Error updating application status:', err);
    throw err;
  }
}

export async function deleteApplication(applicationId) {
  try {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId);
    if (error) throw error;
    invalidateDbCache();
    return true;
  } catch (err) {
    console.error('Error deleting application:', err);
    throw err;
  }
}

export async function updateIpoListingStatus(ipoId, listingPrice) {
  try {
    const { data: ipoData } = await supabase.from('ipos').select('*').eq('id', ipoId).single();
    const issueMax = Number(ipoData?.price_band_max) || Number(ipoData?.price_band_min) || 100;
    const price = Number(listingPrice);
    const gainPct = (((price - issueMax) / issueMax) * 100).toFixed(1);
    const gainStr = `Listed @ ₹${price} (${gainPct >= 0 ? '+' : ''}${gainPct}%)`;

    const { data, error } = await supabase
      .from('ipos')
      .update({
        status: 'listed',
        listing_price: price,
        gain_est: gainStr
      })
      .eq('id', ipoId)
      .select('*')
      .single();

    if (error) throw error;
    invalidateDbCache();
    return data;
  } catch (err) {
    console.error('Error updating IPO listing status:', err);
    throw err;
  }
}

export async function fetchDashboardStats(force = false) {
  if (!force && dbCache.stats) {
    return dbCache.stats;
  }

  try {
    const [custRes, appRes, ipoRes] = await Promise.all([
      queryWithTimeout(supabase.from('customers').select('id', { count: 'exact', head: true }), 2500).catch(() => ({ count: 0 })),
      queryWithTimeout(supabase.from('applications').select('*'), 2500).catch(() => ({ data: [] })),
      queryWithTimeout(supabase.from('ipos').select('id', { count: 'exact', head: true }), 2500).catch(() => ({ count: 0 }))
    ]);

    const totalCustomers = custRes.count || 0;
    const totalIpos = ipoRes.count || 0;
    const apps = appRes.data || [];

    const totalVolume = apps.reduce((sum, a) => sum + (Number(a.bid_amount) || 0), 0);
    const totalProfit = apps.reduce((sum, a) => sum + (Number(a.profit_amount) || 0), 0);
    const clientEarnings = apps.reduce((sum, a) => sum + (Number(a.client_share_60) || 0), 0);
    const adminCommission = apps.reduce((sum, a) => sum + (Number(a.admin_share_40) || 0), 0);

    const computed = {
      totalCustomers,
      totalIpos,
      totalVolume,
      totalProfit,
      clientEarnings,
      adminCommission,
      activeBidsCount: apps.length
    };

    dbCache.stats = computed;
    dbCache.statsTimestamp = Date.now();
    setStoredCache('stats', computed);
    return computed;
  } catch (err) {
    return dbCache.stats || {
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
          invalidateDbCache();
          if (onPayload) onPayload(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    return () => {};
  }
}

export async function bulkInsertApplications(rows = [], targetIpoId = null) {
  if (!rows || rows.length === 0) return { count: 0 };
  
  let inserted = 0;
  for (const r of rows) {
    try {
      let customerId = null;
      if (r.pan || r.pan_number || r.name || r.full_name) {
        const panVal = (r.pan || r.pan_number || 'TEMP' + Math.floor(Math.random() * 899999 + 100000)).toUpperCase();
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .eq('pan_number', panVal)
          .maybeSingle();

        if (existingCust?.id) {
          customerId = existingCust.id;
        } else {
          const { data: newCust } = await supabase
            .from('customers')
            .insert([{
              full_name: r.name || r.full_name || 'Imported Customer',
              pan_number: panVal,
              bank_account_no: r.bank_account_no || r.bank_account || '',
              mobile_number: r.mobile_number || r.phone || '',
              balance: Number(r.balance) || 50000
            }])
            .select('id')
            .single();
          if (newCust) customerId = newCust.id;
        }
      }

      const statusVal = r.allotment_status || r.status || r.app_status || 'Pending';
      if (String(statusVal).toLowerCase().includes('not applied') || String(statusVal).toLowerCase() === 'no') {
        continue;
      }

      await supabase
        .from('applications')
        .insert([{
          customer_id: customerId,
          ipo_id: targetIpoId || r.ipo_id || null,
          application_number: r.application_number || 'APP-' + Math.floor(100000 + Math.random() * 900000),
          category: r.category || 'RETAIL',
          quantity: Number(r.quantity || r.qty || r.lots_applied) || 1,
          bid_amount: Number(r.bid_amount || r.amount) || 15000,
          allotment_status: statusVal
        }]);
      inserted++;
    } catch (err) {
      console.warn('Error inserting row in bulk import:', err);
    }
  }

  invalidateDbCache();
  return { count: inserted };
}
