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

export const DEFAULT_BANKS = [
  { id: 1, bank_name: 'HDFC Bank', ifsc_prefix: 'HDFC' },
  { id: 2, bank_name: 'State Bank of India (SBI)', ifsc_prefix: 'SBIN' },
  { id: 3, bank_name: 'ICICI Bank', ifsc_prefix: 'ICIC' },
  { id: 4, bank_name: 'Axis Bank', ifsc_prefix: 'UTIB' },
  { id: 5, bank_name: 'Kotak Mahindra Bank', ifsc_prefix: 'KKBK' },
  { id: 6, bank_name: 'Punjab National Bank (PNB)', ifsc_prefix: 'PUNB' },
  { id: 7, bank_name: 'Bank of Baroda', ifsc_prefix: 'BARB' },
  { id: 8, bank_name: 'Canara Bank', ifsc_prefix: 'CNRB' },
  { id: 9, bank_name: 'Union Bank of India', ifsc_prefix: 'UBIN' },
  { id: 10, bank_name: 'IndusInd Bank', ifsc_prefix: 'INDB' },
  { id: 11, bank_name: 'IDFC FIRST Bank', ifsc_prefix: 'IDFB' },
  { id: 12, bank_name: 'Yes Bank', ifsc_prefix: 'YESB' },
  { id: 13, bank_name: 'Federal Bank', ifsc_prefix: 'FDRL' },
  { id: 14, bank_name: 'Bank of India (BOI)', ifsc_prefix: 'BKID' },
  { id: 15, bank_name: 'Central Bank of India', ifsc_prefix: 'CBIN' },
  { id: 16, bank_name: 'Indian Bank', ifsc_prefix: 'IDIB' },
  { id: 17, bank_name: 'AU Small Finance Bank', ifsc_prefix: 'AUBL' },
  { id: 18, bank_name: 'Bandhan Bank', ifsc_prefix: 'BDBL' }
];

const dbCache = {
  ipos: getStoredCache('ipos'),
  applications: getStoredCache('applications'),
  customers: getStoredCache('customers'),
  banks: getStoredCache('banks') || DEFAULT_BANKS,
  stats: getStoredCache('stats'),
  iposTimestamp: Date.now(),
  appsTimestamp: Date.now(),
  custTimestamp: Date.now(),
  banksTimestamp: Date.now(),
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
  dbCache.applications = null;
  dbCache.ipos = null;
  dbCache.stats = null;
  try {
    localStorage.removeItem('ipoking_cache_applications');
    localStorage.removeItem('ipoking_cache_ipos');
    localStorage.removeItem('ipoking_cache_stats');
  } catch (_) {}

  fetchLiveIpos(true).catch(() => {});
  fetchApplicationsLedger(true).catch(() => {});
  fetchCustomersShortList(true).catch(() => {});
  fetchBanks(true).catch(() => {});
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
      const mapped = res.data.map(item => {
        const match = (item.gain_est || '').match(/Listed @ ₹([0-9.]+)/);
        const parsedPrice = match ? Number(match[1]) : (Number(item.listing_price) || 0);
        return {
          ...item,
          listing_price: parsedPrice,
          exit_mode: item.exit_mode || 'MARKET',
          kostak_rate: Number(item.kostak_rate) || 0,
          sauda_rate: Number(item.sauda_rate) || 0,
          pre_listing_price: Number(item.pre_listing_price) || 0
        };
      });

      dbCache.ipos = mapped;
      dbCache.iposTimestamp = Date.now();
      setStoredCache('ipos', mapped);
      return mapped;
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
        .select('*, customers(full_name, pan_number, bank_account_no, bank_name, dpid), ipos(*)')
        .order('created_at', { ascending: false }),
      3000
    );

    if (res.error || !res.data) {
      return dbCache.applications || [];
    }

    const storedOverrides = getStoredCache('app_overrides') || {};

    const mapped = res.data.map(item => {
      const override = storedOverrides[item.id] || {};
      const ipoData = item.ipos || {};

      const exitMode = override.exit_mode || item.exit_mode || ipoData.exit_mode || 'MARKET';
      const kostakRate = Number(override.kostak_rate ?? item.kostak_rate ?? ipoData.kostak_rate) || 0;
      const saudaRate = Number(override.sauda_rate ?? item.sauda_rate ?? ipoData.sauda_rate) || 0;

      // Extract listing / sell price from overrides, db fields, or IPO gain_est tag
      let listingPrice = Number(override.exit_price ?? item.exit_price ?? ipoData.listing_price) || 0;
      if (!listingPrice && ipoData.gain_est) {
        const match = String(ipoData.gain_est).match(/Listed @ ₹([0-9.]+)/);
        if (match) listingPrice = Number(match[1]);
      }

      const exitParams = {
        exit_mode: exitMode,
        exit_price: listingPrice,
        listing_price: listingPrice,
        pre_listing_price: Number(override.pre_listing_price ?? item.pre_listing_price ?? ipoData.pre_listing_price) || listingPrice,
        kostak_rate: kostakRate,
        sauda_rate: saudaRate
      };

      const calculated = calculateExitMetrics(exitMode, exitParams, item, ipoData);

      const profitAmt = Number(item.profit_amount) > 0 ? Number(item.profit_amount) : calculated.profit_amount;
      const clientShare = Number(item.client_share_60) > 0 ? Number(item.client_share_60) : calculated.client_share_60;
      const adminShare = Number(item.admin_share_40) > 0 ? Number(item.admin_share_40) : calculated.admin_share_40;
      const tds = Number(item.tds_10) > 0 ? Number(item.tds_10) : calculated.tds_10;
      const net = Number(item.net_payout) > 0 ? Number(item.net_payout) : calculated.net_payout;

      const lotSize = Number(ipoData.lot_size) || 1;
      const rawLots = Number(item.lots_applied) || (item.quantity && lotSize > 1 ? Math.floor(Number(item.quantity) / lotSize) : 1) || 1;

      return {
        id: item.id,
        customer_id: item.customer_id,
        ipo_id: item.ipo_id,
        customer_name: item.customers?.full_name || 'Customer',
        pan: item.customers?.pan_number || '—',
        bank_name: item.customers?.bank_name || item.bank_name || '—',
        bank_account: item.customers?.bank_account_no || '—',
        ipo_name: ipoData.ipo_name || 'IPO Offering',
        lots_applied: rawLots,
        quantity: Number(item.quantity) || (rawLots * lotSize),
        bid_amount: item.bid_amount || 15000,
        allotment_status: item.allotment_status || 'Pending',
        allotted_quantity: item.allotted_quantity || (String(item.allotment_status).toLowerCase().includes('full') ? Number(item.quantity) : 0),
        exit_mode: exitMode,
        kostak_rate: kostakRate,
        sauda_rate: saudaRate,
        exit_price: calculated.exit_price,
        profit_amount: profitAmt,
        client_share_60: clientShare,
        admin_share_40: adminShare,
        tds_10: tds,
        net_payout: net,
        settlement_remarks: calculated.settlement_remarks,
        dpid: item.customers?.dpid || '—',
        ipo_status: ipoData.status || 'open',
        listing_date: ipoData.listing_date || '—'
      };
    });

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
        .select('id, customer_no, full_name, name, pan_number, bank_account_no, bank_name, dpid, mobile_number')
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

export async function fetchBanks(force = false) {
  if (!force && dbCache.banks && dbCache.banks.length > 0) {
    fetchBanks(true).catch(() => {});
    return dbCache.banks;
  }

  try {
    const res = await queryWithTimeout(
      supabase.from('banks').select('*').order('bank_name', { ascending: true }),
      3000
    );

    if (!res.error && res.data && res.data.length > 0) {
      dbCache.banks = res.data;
      dbCache.banksTimestamp = Date.now();
      setStoredCache('banks', res.data);
      return res.data;
    }

    const fallback = getStoredCache('banks') || DEFAULT_BANKS;
    dbCache.banks = fallback;
    return fallback;
  } catch (err) {
    return dbCache.banks || DEFAULT_BANKS;
  }
}

export async function createBank(bankName, ifscPrefix = '') {
  if (!bankName || !bankName.trim()) throw new Error('Bank name is required');
  const cleanName = bankName.trim();
  const cleanIfsc = (ifscPrefix || '').trim().toUpperCase();

  const newBankObj = {
    bank_name: cleanName,
    ifsc_prefix: cleanIfsc || null,
    is_active: true
  };

  let insertedBank = null;

  try {
    const { data, error } = await supabase
      .from('banks')
      .insert([newBankObj])
      .select('*')
      .maybeSingle();

    if (!error && data) {
      insertedBank = data;
    }
  } catch (err) {
    console.warn('Note on Supabase banks insert:', err);
  }

  if (!insertedBank) {
    insertedBank = {
      id: Date.now(),
      bank_name: cleanName,
      ifsc_prefix: cleanIfsc,
      is_active: true
    };
  }

  const currentBanks = dbCache.banks || (await fetchBanks());
  const updated = [
    ...currentBanks.filter(b => b.bank_name.toLowerCase() !== cleanName.toLowerCase()),
    insertedBank
  ].sort((a, b) => a.bank_name.localeCompare(b.bank_name));

  dbCache.banks = updated;
  setStoredCache('banks', updated);
  invalidateDbCache();
  return insertedBank;
}

export async function deleteBank(bankId, bankName = '') {
  try {
    if (bankId && typeof bankId === 'number' && bankId < 1000000000000) {
      await supabase.from('banks').delete().eq('id', bankId);
    } else if (bankName) {
      await supabase.from('banks').delete().eq('bank_name', bankName);
    }
  } catch (err) {
    console.warn('Supabase bank delete notice:', err);
  }

  const current = dbCache.banks || DEFAULT_BANKS;
  const updated = current.filter(b => {
    if (bankId && String(b.id) === String(bankId)) return false;
    if (bankName && b.bank_name.toLowerCase() === bankName.toLowerCase()) return false;
    return true;
  });

  dbCache.banks = updated;
  setStoredCache('banks', updated);
  invalidateDbCache();
  return true;
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
    const updateData = {
      allotment_status: allotmentStatus
    };

    if (typeof extraPayload === 'object' && extraPayload !== null) {
      Object.assign(updateData, extraPayload);
    }

    let resultData = null;
    try {
      const { data, error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)
        .select('*')
        .single();
      
      if (!error && data) {
        resultData = data;
      }
    } catch (_) {}

    if (!resultData) {
      // Fallback update only core columns if extended fields are missing in Supabase schema
      const fallback = { allotment_status: allotmentStatus };
      if (extraPayload.allotted_quantity !== undefined) fallback.allotted_quantity = extraPayload.allotted_quantity;
      if (extraPayload.quantity !== undefined) fallback.quantity = extraPayload.quantity;
      const { data: fbData } = await supabase
        .from('applications')
        .update(fallback)
        .eq('id', applicationId)
        .select('*')
        .single();
      resultData = fbData || { id: applicationId, ...updateData };
    }

    // Persist into ipo_allotments ledger table
    try {
      const { data: fullApp } = await supabase
        .from('applications')
        .select('*, ipos(*)')
        .eq('id', applicationId)
        .single();

      if (fullApp) {
        const ipoData = fullApp.ipos || {};
        const profitAmt = Number(updateData.profit_amount ?? fullApp.profit_amount) || 0;
        const clientShare = Number(updateData.client_share_60 ?? fullApp.client_share_60) || Math.round(profitAmt * 0.40);
        const adminShare = Number(updateData.admin_share_40 ?? fullApp.admin_share_40) || Math.round(profitAmt * 0.60);
        const tds = Number(updateData.tds_10 ?? fullApp.tds_10) || Math.round(clientShare * 0.10);
        const net = Number(updateData.net_payout ?? fullApp.net_payout) || Math.max(0, clientShare - tds);

        await supabase.from('ipo_allotments').upsert([{
          application_id: applicationId,
          customer_id: fullApp.customer_id,
          ipo_id: fullApp.ipo_id,
          applied_qty: Number(fullApp.quantity) || (Number(ipoData.lot_size) || 1),
          allotted_qty: Number(updateData.allotted_quantity ?? fullApp.allotted_quantity) || Number(fullApp.quantity) || (Number(ipoData.lot_size) || 1),
          allotment_price: Number(ipoData.price_band_max) || Number(ipoData.price_band_min) || 100,
          listing_price: Number(updateData.exit_price ?? fullApp.exit_price ?? ipoData.listing_price) || 0,
          total_profit: profitAmt,
          customer_profit_share_40pct: clientShare,
          company_profit_share_60pct: adminShare,
          tds_amount_10pct: tds,
          net_payout: net,
          payment_status: 'Pending'
        }], { onConflict: 'application_id' });
      }
    } catch (_) {}

    invalidateDbCache();
    return resultData;
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

export function calculateExitMetrics(modeOrParams, exitParams = {}, app = {}, ipo = {}) {
  let exitMode = 'KOSTAK';
  let params = {};

  if (typeof modeOrParams === 'object' && modeOrParams !== null) {
    params = modeOrParams;
    exitMode = String(modeOrParams.exit_mode || 'KOSTAK').toUpperCase();
  } else {
    exitMode = String(modeOrParams || 'KOSTAK').toUpperCase();
    params = typeof exitParams === 'object' && exitParams !== null ? exitParams : {};
  }

  const lotSize = Number(ipo?.lot_size) || 1;
  const rawLots = Number(app.lots_applied) || (Number(app.quantity) >= lotSize ? Math.floor(Number(app.quantity) / lotSize) : 1) || 1;
  const rawQty = Number(app.quantity) || (rawLots * lotSize);

  const statusStr = String(app.allotment_status || '').toLowerCase();
  const isExplicitRejected = statusStr.includes('reject') || statusStr.includes('not allotted') || statusStr === 'unallotted';

  let grossProfit = 0;
  let exitPrice = 0;
  let settlementRemarks = '';

  if (exitMode === 'KOSTAK') {
    const rate = Number(params.kostak_rate) || 0;
    grossProfit = Math.round(rate * rawLots);
    exitPrice = rate;
    settlementRemarks = `Kostak Exit @ ₹${rate}/lot (Total ₹${grossProfit.toLocaleString('en-IN')})`;
  } else if (exitMode === 'SAUDA') {
    const rate = Number(params.sauda_rate) || 0;
    grossProfit = isExplicitRejected ? 0 : Math.round(rate * rawLots);
    exitPrice = rate;
    settlementRemarks = isExplicitRejected
      ? 'Subject to Sauda Void (Rejected)'
      : `Subject to Sauda @ ₹${rate}/lot (Total ₹${grossProfit.toLocaleString('en-IN')})`;
  } else if (exitMode === 'PRE_LISTING') {
    const price = Number(params.pre_listing_price) || 0;
    const issueMax = Number(ipo?.price_band_max) || Number(ipo?.price_band_min) || 100;
    const gainPerShare = Math.max(0, price - issueMax);
    grossProfit = isExplicitRejected ? 0 : Math.round(gainPerShare * rawQty);
    exitPrice = price;
    settlementRemarks = isExplicitRejected
      ? 'Pre-Listing Void (Rejected)'
      : `Off-Market Sale @ ₹${price}/sh (+₹${gainPerShare}/sh)`;
  } else {
    // Standard MARKET listing
    const price = Number(params.listing_price) || Number(ipo?.listing_price) || 0;
    const issueMax = Number(ipo?.price_band_max) || Number(ipo?.price_band_min) || 100;
    const gainPerShare = Math.max(0, price - issueMax);
    grossProfit = isExplicitRejected ? 0 : Math.round(gainPerShare * rawQty);
    exitPrice = price;
    settlementRemarks = isExplicitRejected
      ? 'No Allotment'
      : `Exchange Listed @ ₹${price}/sh (+₹${gainPerShare}/sh)`;
  }

  // 40% Customer Gross Share, 60% Company Share, 10% TDS on Customer Share
  const custGrossShare = Math.round(grossProfit * 0.40);
  const adminShare = Math.round(grossProfit * 0.60);
  const tds10 = Math.round(custGrossShare * 0.10);
  const netPayout = Math.max(0, custGrossShare - tds10);

  return {
    exit_mode: exitMode,
    exit_price: exitPrice,
    profit_amount: grossProfit,
    client_share_60: custGrossShare,
    admin_share_40: adminShare,
    tds_10: tds10,
    net_payout: netPayout,
    settlement_remarks: settlementRemarks
  };
}

export async function applyPreListingExitToIpo(ipoId, modeOrParams, extraParams = {}) {
  let exitMode = 'KOSTAK';
  let exitParams = {};

  if (typeof modeOrParams === 'object' && modeOrParams !== null) {
    exitParams = modeOrParams;
    exitMode = String(modeOrParams.exit_mode || 'KOSTAK').toUpperCase();
  } else {
    exitMode = String(modeOrParams || 'KOSTAK').toUpperCase();
    exitParams = typeof extraParams === 'object' && extraParams !== null ? extraParams : {};
  }

  try {
    const { data: ipoData } = await supabase.from('ipos').select('*').eq('id', ipoId).single();
    if (!ipoData) throw new Error('IPO not found');

    let gainEst = ipoData.gain_est || '';
    if (exitMode === 'KOSTAK') {
      gainEst = `Kostak Exit @ ₹${exitParams.kostak_rate || 800}/lot`;
    } else if (exitMode === 'SAUDA') {
      gainEst = `Sauda Exit @ ₹${exitParams.sauda_rate || 12000}/lot`;
    } else if (exitMode === 'PRE_LISTING') {
      const issueMax = Number(ipoData.price_band_max) || 100;
      const prePrice = Number(exitParams.pre_listing_price) || (issueMax * 1.5);
      const gainPct = (((prePrice - issueMax) / issueMax) * 100).toFixed(1);
      gainEst = `Off-Market @ ₹${prePrice} (+${gainPct}%)`;
    } else if (exitMode === 'MARKET') {
      const listPrice = Number(exitParams.listing_price) || Number(ipoData.price_band_max) || 100;
      gainEst = `Listed @ ₹${listPrice}`;
    }

    // 1. Update IPO record in Supabase
    try {
      const ipoUpdatePayload = {
        exit_mode: exitMode,
        kostak_rate: Number(exitParams.kostak_rate) || 0,
        sauda_rate: Number(exitParams.sauda_rate) || 0,
        pre_listing_price: Number(exitParams.pre_listing_price) || 0,
        listing_price: Number(exitParams.listing_price) || Number(exitParams.pre_listing_price) || null,
        status: 'listed',
        gain_est: gainEst
      };
      const { error: ipoUpdateErr } = await supabase.from('ipos').update(ipoUpdatePayload).eq('id', ipoId);
      if (ipoUpdateErr) {
        // Fallback update if extended columns don't exist
        await supabase.from('ipos').update({
          status: 'listed',
          gain_est: gainEst
        }).eq('id', ipoId);
      }
    } catch (_) {}

    // 2. Fetch all applications for this IPO and update their metrics
    const { data: apps } = await supabase.from('applications').select('*').eq('ipo_id', ipoId);
    if (apps && apps.length > 0) {
      for (const app of apps) {
        const metrics = calculateExitMetrics(exitMode, exitParams, app, ipoData);
        const newStatus = String(app.allotment_status || '').toLowerCase().includes('reject')
          ? app.allotment_status
          : 'Full Allotment';

        try {
          const appUpdatePayload = {
            allotment_status: newStatus,
            exit_mode: exitMode,
            kostak_rate: Number(exitParams.kostak_rate) || 0,
            sauda_rate: Number(exitParams.sauda_rate) || 0,
            exit_price: metrics.exit_price,
            profit_amount: metrics.profit_amount,
            client_share_60: metrics.client_share_60,
            admin_share_40: metrics.admin_share_40,
            tds_10: metrics.tds_10,
            net_payout: metrics.net_payout,
            settlement_remarks: metrics.settlement_remarks
          };
          const { error: appErr } = await supabase.from('applications').update(appUpdatePayload).eq('id', app.id);
          if (appErr) {
            await supabase.from('applications').update({ allotment_status: newStatus }).eq('id', app.id);
          }
        } catch (_) {}

        // 3. Upsert into ipo_allotments ledger table for guaranteed persistence
        try {
          await supabase.from('ipo_allotments').upsert([{
            application_id: app.id,
            customer_id: app.customer_id,
            ipo_id: ipoId,
            applied_qty: Number(app.quantity) || (Number(ipoData.lot_size) || 1),
            allotted_qty: Number(app.allotted_quantity) || Number(app.quantity) || (Number(ipoData.lot_size) || 1),
            allotment_price: Number(ipoData.price_band_max) || Number(ipoData.price_band_min) || 100,
            listing_price: metrics.exit_price,
            total_profit: metrics.profit_amount,
            customer_profit_share_40pct: metrics.client_share_60,
            company_profit_share_60pct: metrics.admin_share_40,
            tds_amount_10pct: metrics.tds_10,
            net_payout: metrics.net_payout,
            payment_status: 'Pending'
          }], { onConflict: 'application_id' });
        } catch (_) {}
      }
    }

    invalidateDbCache();
    return true;
  } catch (err) {
    console.error('Error applying pre-listing exit to IPO:', err);
    throw err;
  }
}

export async function applyPreListingExitToApplications(applicationIds = [], modeOrParams, extraParams = {}) {
  if (!applicationIds || applicationIds.length === 0) return true;

  let exitMode = 'KOSTAK';
  let exitParams = {};

  if (typeof modeOrParams === 'object' && modeOrParams !== null) {
    exitParams = modeOrParams;
    exitMode = String(modeOrParams.exit_mode || 'KOSTAK').toUpperCase();
  } else {
    exitMode = String(modeOrParams || 'KOSTAK').toUpperCase();
    exitParams = typeof extraParams === 'object' && extraParams !== null ? extraParams : {};
  }

  try {
    const { data: apps } = await supabase
      .from('applications')
      .select('*, ipos(*)')
      .in('id', applicationIds);

    if (apps && apps.length > 0) {
      for (const app of apps) {
        const ipoData = app.ipos || {};
        const metrics = calculateExitMetrics(exitMode, exitParams, app, ipoData);
        const newStatus = String(app.allotment_status || '').toLowerCase().includes('reject')
          ? app.allotment_status
          : 'Full Allotment';

        try {
          const currentOverrides = getStoredCache('app_overrides') || {};
          currentOverrides[app.id] = {
            exit_mode: exitMode,
            exit_price: metrics.exit_price,
            kostak_rate: Number(exitParams.kostak_rate) || 0,
            sauda_rate: Number(exitParams.sauda_rate) || 0,
            allotment_status: newStatus
          };
          setStoredCache('app_overrides', currentOverrides);
        } catch (_) {}

        try {
          const appUpdatePayload = {
            allotment_status: newStatus,
            exit_mode: exitMode,
            kostak_rate: Number(exitParams.kostak_rate) || 0,
            sauda_rate: Number(exitParams.sauda_rate) || 0,
            exit_price: metrics.exit_price,
            profit_amount: metrics.profit_amount,
            client_share_60: metrics.client_share_60,
            admin_share_40: metrics.admin_share_40,
            tds_10: metrics.tds_10,
            net_payout: metrics.net_payout,
            settlement_remarks: metrics.settlement_remarks
          };
          const { error: appErr } = await supabase.from('applications').update(appUpdatePayload).eq('id', app.id);
          if (appErr) {
            await supabase.from('applications').update({ allotment_status: newStatus }).eq('id', app.id);
          }
        } catch (_) {}

        // Upsert into ipo_allotments ledger
        try {
          await supabase.from('ipo_allotments').upsert([{
            application_id: app.id,
            customer_id: app.customer_id,
            ipo_id: app.ipo_id,
            applied_qty: Number(app.quantity) || (Number(ipoData.lot_size) || 1),
            allotted_qty: Number(app.allotted_quantity) || Number(app.quantity) || (Number(ipoData.lot_size) || 1),
            allotment_price: Number(ipoData.price_band_max) || Number(ipoData.price_band_min) || 100,
            listing_price: metrics.exit_price,
            total_profit: metrics.profit_amount,
            customer_profit_share_40pct: metrics.client_share_60,
            company_profit_share_60pct: metrics.admin_share_40,
            tds_amount_10pct: metrics.tds_10,
            net_payout: metrics.net_payout,
            payment_status: 'Pending'
          }], { onConflict: 'application_id' });
        } catch (_) {}
      }
    }

    invalidateDbCache();
    return true;
  } catch (err) {
    console.error('Error applying exit to applications:', err);
    throw err;
  }
}

export async function updateApplicationIndividualExit(applicationId, {
  exit_price = 0,
  exit_mode = 'MARKET',
  kostak_rate = 0,
  sauda_rate = 0,
  allotment_status = 'Full Allotment'
}) {
  try {
    const { data: app, error: appFetchErr } = await supabase
      .from('applications')
      .select('*, ipos(*)')
      .eq('id', applicationId)
      .single();

    if (appFetchErr || !app) throw new Error('Application not found');

    const ipoData = app.ipos || {};
    const exitParams = {
      exit_mode,
      exit_price: Number(exit_price) || 0,
      listing_price: Number(exit_price) || 0,
      pre_listing_price: Number(exit_price) || 0,
      kostak_rate: Number(kostak_rate) || 0,
      sauda_rate: Number(sauda_rate) || 0
    };

    const metrics = calculateExitMetrics(exit_mode, exitParams, app, ipoData);
    
    // Update application
    const payload = {
      allotment_status,
      exit_mode,
      exit_price: metrics.exit_price,
      kostak_rate: exitParams.kostak_rate,
      sauda_rate: exitParams.sauda_rate,
      profit_amount: metrics.profit_amount,
      client_share_60: metrics.client_share_60,
      admin_share_40: metrics.admin_share_40,
      tds_10: metrics.tds_10,
      net_payout: metrics.net_payout,
      settlement_remarks: metrics.settlement_remarks
    };

    // Persist into local overrides cache for instant reactivity
    try {
      const currentOverrides = getStoredCache('app_overrides') || {};
      currentOverrides[applicationId] = {
        exit_mode,
        exit_price: metrics.exit_price,
        kostak_rate: exitParams.kostak_rate,
        sauda_rate: exitParams.sauda_rate,
        allotment_status
      };
      setStoredCache('app_overrides', currentOverrides);
    } catch (_) {}

    const { data: updatedApp, error: updateErr } = await supabase
      .from('applications')
      .update(payload)
      .eq('id', applicationId)
      .select('*')
      .single();

    if (updateErr) {
      await supabase.from('applications').update({ allotment_status }).eq('id', applicationId);
    }

    // Upsert into ipo_allotments ledger
    try {
      await supabase.from('ipo_allotments').upsert([{
        application_id: app.id,
        customer_id: app.customer_id,
        ipo_id: app.ipo_id,
        applied_qty: Number(app.quantity) || (Number(ipoData.lot_size) || 1),
        allotted_qty: Number(app.allotted_quantity) || Number(app.quantity) || (Number(ipoData.lot_size) || 1),
        allotment_price: Number(ipoData.price_band_max) || Number(ipoData.price_band_min) || 100,
        listing_price: metrics.exit_price,
        total_profit: metrics.profit_amount,
        customer_profit_share_40pct: metrics.client_share_60,
        company_profit_share_60pct: metrics.admin_share_40,
        tds_amount_10pct: metrics.tds_10,
        net_payout: metrics.net_payout,
        payment_status: 'Pending'
      }], { onConflict: 'application_id' });
    } catch (_) {}

    invalidateDbCache();
    return updatedApp || { ...app, ...payload };
  } catch (err) {
    console.error('Error updating individual application exit:', err);
    throw err;
  }
}

export async function fetchCustomerPassbookLedger(customerId) {
  try {
    const { data: apps, error } = await supabase
      .from('applications')
      .select('*, ipos(ipo_name, symbol, price_band_max, lot_size)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error || !apps) return [];

    const ledger = [];
    apps.forEach((a) => {
      const ipoName = a.ipos?.ipo_name || a.ipo_name || 'IPO Offering';
      const bidAmt = Number(a.bid_amount) || 15000;
      const profit = Number(a.profit_amount) || 0;
      const clientShare = Number(a.client_share_60) || 0;
      const tds = Number(a.tds_10) || 0;
      const status = String(a.allotment_status || 'Pending');
      const isRejected = status.toLowerCase().includes('reject') || status.toLowerCase().includes('not') || status.toLowerCase().includes('unallotted');

      // Entry 1: Bid Block
      ledger.push({
        id: `bid_${a.id}`,
        date: a.created_at || new Date().toISOString(),
        scrip: ipoName,
        type: 'IPO Bid (Mandate Blocked)',
        lots: a.lots_applied || 1,
        debit: 0,
        credit: 0,
        amount: bidAmt,
        status: status,
        remarks: `Bid for ${a.lots_applied || 1} lot(s)`
      });

      if (isRejected) {
        ledger.push({
          id: `ref_${a.id}`,
          date: a.updated_at || a.created_at || new Date().toISOString(),
          scrip: ipoName,
          type: 'Mandate Refund (Unallotted)',
          lots: a.lots_applied || 1,
          debit: 0,
          credit: 0,
          amount: bidAmt,
          status: 'Refunded',
          remarks: 'Mandate released back to bank account'
        });
      } else if (profit > 0 || clientShare > 0) {
        ledger.push({
          id: `prof_${a.id}`,
          date: a.updated_at || a.created_at || new Date().toISOString(),
          scrip: ipoName,
          type: `Profit Share (+40% - ${a.exit_mode || 'Market'})`,
          lots: a.lots_applied || 1,
          debit: 0,
          credit: clientShare,
          amount: clientShare,
          status: 'Credited',
          remarks: `Gross Profit ₹${profit.toLocaleString('en-IN')} (Exit @ ₹${a.exit_price || 0})`
        });

        if (tds > 0) {
          ledger.push({
            id: `tds_${a.id}`,
            date: a.updated_at || a.created_at || new Date().toISOString(),
            scrip: ipoName,
            type: 'TDS Withholding (-10%)',
            lots: a.lots_applied || 1,
            debit: tds,
            credit: 0,
            amount: tds,
            status: 'Tax Deducted',
            remarks: `10% TDS on Client Profit ₹${clientShare.toLocaleString('en-IN')}`
          });
        }
      }
    });

    return ledger;
  } catch (err) {
    console.error('Error fetching customer passbook ledger:', err);
    return [];
  }
}

export async function updateIpoListingStatus(ipoId, listingPrice) {
  return applyPreListingExitToIpo(ipoId, 'MARKET', { listing_price: listingPrice });
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
