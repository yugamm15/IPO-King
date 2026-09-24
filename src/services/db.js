/**
 * IPO KING - Persistent Stale-While-Revalidate (SWR) Instant Database Driver
 */
import { createClient } from '@supabase/supabase-js';
import { loadSession } from './session.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';

// Create Supabase client with dynamic Bearer session token forwarding
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (url, options = {}) => {
      const session = loadSession();
      const token = session?.token;
      if (token) {
        const headers = new Headers(options.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        options.headers = headers;
      }
      return fetch(url, options);
    }
  }
});

export const dbConfig = {
  provider: 'supabase',
  url: supabaseUrl,
  status: 'connected'
};

// LocalStorage Persistent Cache Helpers - STRICTLY RESTRICTED TO NON-SENSITIVE METADATA
// Customer PII, Applications, PAN, Bank Details & KYC are strictly in-memory (dbCache)
const ALLOWED_LOCAL_STORAGE_KEYS = new Set(['system_settings', 'banks', 'theme_preference']);

function getStoredCache(key) {
  if (!ALLOWED_LOCAL_STORAGE_KEYS.has(key)) return null;
  try {
    const raw = localStorage.getItem('ipoking_cache_' + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setStoredCache(key, data) {
  if (!ALLOWED_LOCAL_STORAGE_KEYS.has(key)) return;
  try {
    localStorage.setItem('ipoking_cache_' + key, JSON.stringify(data));
  } catch (e) {}
}

// Purge any legacy sensitive PII / financial caches from localStorage
if (typeof window !== 'undefined') {
  try {
    ['customers', 'applications', 'stats', 'ipos', 'app_overrides'].forEach(k => {
      localStorage.removeItem('ipoking_cache_' + k);
    });
  } catch (_) {}
}

/**
 * Generates a secure, temporary signed URL for customer KYC & bank documents
 * Prevents public storage bucket exposure
 */
export async function getSecureDocumentUrl(filePathOrUrl, expiresInSeconds = 3600) {
  if (!filePathOrUrl || typeof filePathOrUrl !== 'string') return '';
  if (filePathOrUrl.startsWith('data:') || filePathOrUrl.startsWith('blob:')) {
    return filePathOrUrl;
  }

  let cleanPath = filePathOrUrl;
  if (cleanPath.includes('/customer-docs/')) {
    cleanPath = cleanPath.split('/customer-docs/')[1]?.split('?')[0] || cleanPath;
  }
  cleanPath = cleanPath.replace(/^\/+/, '');

  try {
    const { data, error } = await supabase.storage
      .from('customer-docs')
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('[Storage] createSignedUrl notice:', err.message);
  }

  return filePathOrUrl;
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

export const DEFAULT_SYSTEM_SETTINGS = {
  default_customer_profit_pct: 40,
  default_company_profit_pct: 60,
  default_tds_pct: 10,
  enable_tds_deduction: true,
  default_retail_bid_amount: 15000,
  default_exit_mode: 'MARKET',
  default_category: 'RETAIL',
  company_name: 'IPO KING Enterprise'
};

export function getSystemSettings() {
  const cached = getStoredCache('system_settings');
  if (cached && typeof cached === 'object') {
    const custPct = Number(cached.default_customer_profit_pct) >= 0 ? Number(cached.default_customer_profit_pct) : DEFAULT_SYSTEM_SETTINGS.default_customer_profit_pct;
    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...cached,
      default_customer_profit_pct: custPct,
      default_company_profit_pct: 100 - custPct,
      default_tds_pct: Number(cached.default_tds_pct) >= 0 ? Number(cached.default_tds_pct) : DEFAULT_SYSTEM_SETTINGS.default_tds_pct,
      enable_tds_deduction: cached.enable_tds_deduction !== undefined ? Boolean(cached.enable_tds_deduction) : true,
      default_retail_bid_amount: Number(cached.default_retail_bid_amount) || DEFAULT_SYSTEM_SETTINGS.default_retail_bid_amount,
      default_exit_mode: cached.default_exit_mode || DEFAULT_SYSTEM_SETTINGS.default_exit_mode,
      default_category: cached.default_category || DEFAULT_SYSTEM_SETTINGS.default_category
    };
  }
  return { ...DEFAULT_SYSTEM_SETTINGS };
}

export async function fetchSystemSettings(force = false) {
  const current = getSystemSettings();
  if (!force && dbCache.settings) {
    return dbCache.settings;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const custPct = Number(data.default_customer_profit_pct) >= 0 ? Number(data.default_customer_profit_pct) : DEFAULT_SYSTEM_SETTINGS.default_customer_profit_pct;
      const merged = {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...data,
        default_customer_profit_pct: custPct,
        default_company_profit_pct: 100 - custPct,
        default_tds_pct: Number(data.default_tds_pct) >= 0 ? Number(data.default_tds_pct) : DEFAULT_SYSTEM_SETTINGS.default_tds_pct,
        enable_tds_deduction: data.enable_tds_deduction !== undefined ? Boolean(data.enable_tds_deduction) : true,
        default_retail_bid_amount: Number(data.default_retail_bid_amount) || DEFAULT_SYSTEM_SETTINGS.default_retail_bid_amount,
        default_exit_mode: data.default_exit_mode || DEFAULT_SYSTEM_SETTINGS.default_exit_mode,
        default_category: data.default_category || DEFAULT_SYSTEM_SETTINGS.default_category
      };
      dbCache.settings = merged;
      setStoredCache('system_settings', merged);
      return merged;
    }
  } catch (_) {}

  dbCache.settings = current;
  return current;
}

export async function saveSystemSettings(newSettings = {}) {
  const current = getSystemSettings();
  const custPct = Number(newSettings.default_customer_profit_pct) >= 0 ? Number(newSettings.default_customer_profit_pct) : current.default_customer_profit_pct;
  const tdsPct = Number(newSettings.default_tds_pct) >= 0 ? Number(newSettings.default_tds_pct) : current.default_tds_pct;
  const enableTds = newSettings.enable_tds_deduction !== undefined ? Boolean(newSettings.enable_tds_deduction) : current.enable_tds_deduction;

  const merged = {
    ...current,
    ...newSettings,
    default_customer_profit_pct: custPct,
    default_company_profit_pct: 100 - custPct,
    default_tds_pct: tdsPct,
    enable_tds_deduction: enableTds,
    default_retail_bid_amount: Number(newSettings.default_retail_bid_amount) || current.default_retail_bid_amount,
    default_exit_mode: newSettings.default_exit_mode || current.default_exit_mode,
    default_category: newSettings.default_category || current.default_category,
    updated_at: new Date().toISOString()
  };

  dbCache.settings = merged;
  setStoredCache('system_settings', merged);

  try {
    await supabase.from('system_settings').upsert([{
      id: 1,
      ...merged
    }], { onConflict: 'id' });
  } catch (_) {}

  invalidateDbCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ipoking-settings-updated', { detail: merged }));
  }
  return merged;
}

const dbCache = {
  ipos: null,
  applications: null,
  customers: null,
  banks: getStoredCache('banks') || DEFAULT_BANKS,
  settings: getStoredCache('system_settings') || DEFAULT_SYSTEM_SETTINGS,
  stats: null,
  iposTimestamp: 0,
  appsTimestamp: 0,
  custTimestamp: 0,
  banksTimestamp: Date.now(),
  statsTimestamp: 0
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
  fetchSystemSettings(true).catch(() => {});
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
        const rates = parseIpoExitRates(item);
        return {
          ...item,
          listing_price: rates.listingPrice,
          exit_mode: item.exit_mode || rates.exitMode || 'MARKET',
          kostak_rate: Number(item.kostak_rate) || rates.kostakRate,
          sauda_rate: Number(item.sauda_rate) || rates.saudaRate,
          pre_listing_price: Number(item.pre_listing_price) || rates.preListingPrice
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
  if (!force && dbCache.applications && dbCache.applications.length > 0) {
    fetchApplicationsLedger(true).catch(() => {});
    return dbCache.applications;
  }

  try {
    // 1. Primary Attempt: Full relational join
    let res = await queryWithTimeout(
      supabase
        .from('applications')
        .select('*, customers(*), ipos(*)')
        .order('created_at', { ascending: false }),
      3500
    );

    // 2. Fallback: If relational query fails for any reason, fetch tables independently and merge in-memory
    if (res.error || !res.data) {
      const [appRes, custRes, ipoRes] = await Promise.all([
        queryWithTimeout(supabase.from('applications').select('*').order('created_at', { ascending: false }), 3000),
        queryWithTimeout(supabase.from('customers').select('*'), 3000),
        queryWithTimeout(supabase.from('ipos').select('*'), 3000)
      ]);

      if (!appRes.error && appRes.data) {
        const custMap = new Map((custRes.data || []).map(c => [String(c.id), c]));
        const ipoMap = new Map((ipoRes.data || []).map(i => [String(i.id), i]));

        res = {
          data: appRes.data.map(a => ({
            ...a,
            customers: custMap.get(String(a.customer_id)) || null,
            ipos: ipoMap.get(String(a.ipo_id)) || null
          })),
          error: null
        };
      }
    }

    if (res.error || !res.data) {
      return dbCache.applications || [];
    }

    const storedOverrides = getStoredCache('app_overrides') || {};

    const mapped = res.data.map(item => {
      const override = storedOverrides[item.id] || {};
      const ipoData = item.ipos || {};
      const ipoRates = parseIpoExitRates(ipoData);

      const exitMode = override.exit_mode || item.exit_mode || ipoData.exit_mode || 'MARKET';
      const kostakRate = Number(override.kostak_rate ?? item.kostak_rate ?? ipoData.kostak_rate) || ipoRates.kostakRate;
      const saudaRate = Number(override.sauda_rate ?? item.sauda_rate ?? ipoData.sauda_rate) || ipoRates.saudaRate;
      const listingPrice = Number(override.exit_price ?? item.exit_price ?? ipoData.listing_price) || ipoRates.listingPrice;
      const preListingPrice = Number(override.pre_listing_price ?? item.pre_listing_price ?? ipoData.pre_listing_price) || ipoRates.preListingPrice;

      const exitParams = {
        exit_mode: exitMode,
        exit_price: listingPrice,
        listing_price: listingPrice,
        pre_listing_price: preListingPrice,
        kostak_rate: kostakRate,
        sauda_rate: saudaRate
      };

      const sysSettings = getSystemSettings();
      const custProfitSharePct = Number(item.customers?.profit_share_percentage ?? item.profit_share_percentage ?? sysSettings.default_customer_profit_pct);
      const calculated = calculateExitMetrics(exitMode, exitParams, { ...item, profit_share_percentage: custProfitSharePct }, ipoData);

      const lotSize = Number(ipoData.lot_size) || 1;
      const rawLots = Number(item.lots_applied) || (item.quantity && lotSize > 1 ? Math.floor(Number(item.quantity) / lotSize) : 1) || 1;

      return {
        id: item.id,
        customer_id: item.customer_id,
        ipo_id: item.ipo_id,
        customer_name: item.customers?.full_name || item.customers?.name || item.customer_name || 'Customer',
        pan: item.customers?.pan_number || item.pan || '—',
        bank_name: item.customers?.bank_name || item.bank_name || '—',
        bank_account: item.customers?.bank_account_no || item.bank_account || '—',
        ipo_name: ipoData.ipo_name || item.ipo_name || 'IPO Offering',
        lots_applied: rawLots,
        quantity: Number(item.quantity) || (rawLots * lotSize),
        bid_amount: item.bid_amount || 15000,
        allotment_status: item.allotment_status || 'Pending',
        allotted_quantity: calculated.allotted_quantity,
        exit_mode: exitMode,
        kostak_rate: kostakRate,
        sauda_rate: saudaRate,
        exit_price: calculated.exit_price,
        price_band_max: Number(ipoData.price_band_max) || 0,
        price_band_min: Number(ipoData.price_band_min) || 0,
        lot_size: lotSize,
        issue_price: Number(ipoData.price_band_max) || Number(ipoData.price_band_min) || (item.bid_amount && item.quantity ? Math.round(Number(item.bid_amount) / Number(item.quantity)) : 100),
        profit_amount: calculated.profit_amount,
        client_share_60: calculated.client_share_60,
        admin_share_40: calculated.admin_share_40,
        tds_10: calculated.tds_10,
        net_payout: calculated.net_payout,
        settlement_remarks: calculated.settlement_remarks,
        dpid: item.customers?.dpid || '—',
        profit_share_percentage: custProfitSharePct,
        customer_profit_share: custProfitSharePct,
        ipo_status: ipoData.status || 'open',
        listing_date: ipoData.listing_date || '—'
      };
    });

    dbCache.applications = mapped;
    dbCache.appsTimestamp = Date.now();
    setStoredCache('applications', mapped);
    return mapped;
  } catch (err) {
    console.error('Error fetching applications ledger:', err);
    return dbCache.applications || [];
  }
}

export async function fetchCustomersShortList(force = false) {
  // 0ms Instant Cache Return
  if (!force && dbCache.customers && dbCache.customers.length > 0) {
    fetchCustomersShortList(true).catch(() => {});
    return dbCache.customers;
  }

  try {
    const res = await queryWithTimeout(
      supabase
        .from('customers')
        .select('*')
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

export async function createMultipleApplicationBids(customerIdsOrBids = [], payloadBase = {}) {
  if (!customerIdsOrBids || customerIdsOrBids.length === 0) return [];
  try {
    let records = [];

    // Case 1: First argument is already an array of bid objects
    if (typeof customerIdsOrBids[0] === 'object' && customerIdsOrBids[0] !== null) {
      records = customerIdsOrBids.map((b, idx) => ({
        customer_id: Number(b.customer_id),
        ipo_id: Number(b.ipo_id),
        application_number: b.application_number || ('APP-' + Math.floor(100000 + Math.random() * 900000) + '-' + (idx + 1)),
        category: b.category || 'RETAIL',
        quantity: Number(b.quantity) || Number(b.lots_applied) || 1,
        bid_amount: Number(b.bid_amount) || 15000,
        allotment_status: b.allotment_status || 'Pending'
      }));
    } else {
      // Case 2: First argument is array of customer IDs
      let customerIds = customerIdsOrBids;
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

      records = customerIds.map((cid, idx) => ({
        customer_id: Number(cid),
        ipo_id: Number(payloadBase.ipo_id) || null,
        application_number: payloadBase.application_number || ('APP-' + Math.floor(100000 + Math.random() * 900000) + '-' + (idx + 1)),
        category: payloadBase.category || 'RETAIL',
        quantity: Number(payloadBase.quantity) || Number(payloadBase.lots_applied) || 1,
        bid_amount: Number(payloadBase.bid_amount) || 15000,
        allotment_status: payloadBase.allotment_status || 'Pending'
      }));
    }

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
        .select('*, customers(*), ipos(*)')
        .eq('id', applicationId)
        .single();

      if (fullApp) {
        const ipoData = fullApp.ipos || {};
        const sysSettings = getSystemSettings();
        const profitAmt = Number(updateData.profit_amount ?? fullApp.profit_amount) || 0;
        const custPct = Number(fullApp.customers?.profit_share_percentage ?? fullApp.profit_share_percentage ?? sysSettings.default_customer_profit_pct) / 100;
        const clientShare = Number(updateData.client_share_60 ?? fullApp.client_share_60) || Math.round(profitAmt * custPct);
        const adminShare = Number(updateData.admin_share_40 ?? fullApp.admin_share_40) || Math.round(profitAmt * (1 - custPct));
        const tdsRate = sysSettings.enable_tds_deduction ? (Number(sysSettings.default_tds_pct) || 10) / 100 : 0;
        const tds = Number(updateData.tds_10 ?? fullApp.tds_10) || (clientShare > 0 ? Math.round(clientShare * tdsRate) : 0);
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

export function parseIpoExitRates(ipoData = {}) {
  const issueMax = Number(ipoData?.price_band_max) || Number(ipoData?.price_band_min) || Number(ipoData?.issue_price) || 100;
  let listingPrice = Number(ipoData?.listing_price) || 0;
  let preListingPrice = Number(ipoData?.pre_listing_price) || 0;
  let kostakRate = Number(ipoData?.kostak_rate) || 0;
  let saudaRate = Number(ipoData?.sauda_rate) || 0;
  let exitMode = ipoData?.exit_mode || 'MARKET';

  const gainEstStr = String(ipoData?.gain_est || '').trim();

  if (gainEstStr) {
    const listedMatch = gainEstStr.match(/Listed @ ₹([0-9.]+)/i);
    if (listedMatch) {
      listingPrice = Number(listedMatch[1]);
      exitMode = 'MARKET';
    }

    const offMktMatch = gainEstStr.match(/Off-Market @ ₹([0-9.]+)/i);
    if (offMktMatch) {
      preListingPrice = Number(offMktMatch[1]);
      exitMode = 'PRE_LISTING';
    }

    const kostakMatch = gainEstStr.match(/Kostak.*?₹([0-9.]+)/i);
    if (kostakMatch) {
      kostakRate = Number(kostakMatch[1]);
      exitMode = 'KOSTAK';
    }

    const saudaMatch = gainEstStr.match(/Sauda.*?₹([0-9.]+)/i);
    if (saudaMatch) {
      saudaRate = Number(saudaMatch[1]);
      exitMode = 'SAUDA';
    }

    // Parse GMP or estimated gain like "+₹150/sh Est." or "+150" or "+₹85" or "+45%"
    if (!listingPrice) {
      const gmpMatch = gainEstStr.match(/\+₹?([0-9.]+)/);
      if (gmpMatch) {
        const estGain = Number(gmpMatch[1]);
        if (gainEstStr.includes('%')) {
          listingPrice = Math.round(issueMax * (1 + estGain / 100));
        } else {
          listingPrice = issueMax + estGain;
        }
      }
    }
  }

  // Fallback estimated listing price if not set (default 35% listing premium)
  const defaultListingPrice = listingPrice || Math.round(issueMax * 1.35);

  return {
    issuePrice: issueMax,
    listingPrice: defaultListingPrice,
    preListingPrice: preListingPrice || defaultListingPrice,
    kostakRate: kostakRate || 800,
    saudaRate: saudaRate || 12000,
    exitMode
  };
}

export function calculateExitMetrics(modeOrParams, exitParams = {}, app = {}, ipo = {}) {
  let exitMode = 'MARKET';
  let params = {};

  if (typeof modeOrParams === 'object' && modeOrParams !== null) {
    params = modeOrParams;
    exitMode = String(modeOrParams.exit_mode || 'MARKET').toUpperCase();
  } else {
    exitMode = String(modeOrParams || 'MARKET').toUpperCase();
    params = typeof exitParams === 'object' && exitParams !== null ? exitParams : {};
  }

  const lotSize = Number(ipo?.lot_size) || (app.quantity && app.lots_applied ? Math.floor(Number(app.quantity) / Number(app.lots_applied)) : 50) || 50;
  const rawLots = Number(app.lots_applied) || (Number(app.quantity) >= lotSize && lotSize > 1 ? Math.floor(Number(app.quantity) / lotSize) : 1) || 1;
  const totalAppliedQty = Number(app.quantity) || (rawLots * lotSize);

  const statusStr = String(app.allotment_status || app.status || 'Pending').toLowerCase();
  const isExplicitRejected = statusStr.includes('reject') || statusStr.includes('not allotted') || statusStr === 'unallotted' || statusStr === 'not';
  const isPartial = statusStr.includes('partial');

  // Determine allotted quantity
  let allottedQty = 0;
  if (isExplicitRejected) {
    allottedQty = 0;
  } else if (isPartial) {
    allottedQty = Number(app.allotted_quantity) || Math.max(1, Math.floor(totalAppliedQty / 2));
  } else {
    allottedQty = Number(app.allotted_quantity) || totalAppliedQty;
  }

  const rates = parseIpoExitRates(ipo);
  const issueMax = Number(ipo?.price_band_max) || Number(ipo?.price_band_min) || (app.bid_amount && app.quantity ? Math.round(Number(app.bid_amount) / Number(app.quantity)) : rates.issuePrice);

  let grossProfit = 0;
  let exitPrice = 0;
  let settlementRemarks = '';

  if (exitMode === 'KOSTAK') {
    const rate = Number(params.kostak_rate ?? app.kostak_rate ?? ipo?.kostak_rate) || rates.kostakRate;
    grossProfit = Math.round(rate * rawLots);
    exitPrice = rate;
    settlementRemarks = `Kostak Exit @ ₹${rate}/lot (Total ₹${grossProfit.toLocaleString('en-IN')})`;
  } else if (exitMode === 'SAUDA') {
    const rate = Number(params.sauda_rate ?? app.sauda_rate ?? ipo?.sauda_rate) || rates.saudaRate;
    grossProfit = isExplicitRejected ? 0 : Math.round(rate * rawLots * (isPartial ? (allottedQty / totalAppliedQty) : 1));
    exitPrice = rate;
    settlementRemarks = isExplicitRejected
      ? 'Subject to Sauda Void (Rejected)'
      : `Subject to Sauda @ ₹${rate}/lot (Total ₹${grossProfit.toLocaleString('en-IN')})`;
  } else if (exitMode === 'PRE_LISTING') {
    const price = Number(params.pre_listing_price ?? params.exit_price ?? app.exit_price ?? ipo?.pre_listing_price) || rates.preListingPrice;
    const diffPerShare = price - issueMax;
    grossProfit = isExplicitRejected ? 0 : Math.round(diffPerShare * allottedQty);
    exitPrice = price;
    settlementRemarks = isExplicitRejected
      ? 'Pre-Listing Void (Rejected)'
      : (diffPerShare < 0
          ? `Off-Market Discount Sale @ ₹${price}/sh (-₹${Math.abs(diffPerShare)}/sh Loss)`
          : `Off-Market Sale @ ₹${price}/sh (+₹${diffPerShare}/sh)`);
  } else {
    // Standard MARKET listing
    const price = Number(params.listing_price ?? params.exit_price ?? app.exit_price ?? ipo?.listing_price) || rates.listingPrice;
    const diffPerShare = price - issueMax;
    grossProfit = isExplicitRejected ? 0 : Math.round(diffPerShare * allottedQty);
    exitPrice = price;
    settlementRemarks = isExplicitRejected
      ? 'No Allotment (Refunded)'
      : (diffPerShare < 0
          ? `Exchange Listed @ ₹${price}/sh (-₹${Math.abs(diffPerShare)}/sh Discount/Loss)`
          : `Exchange Listed @ ₹${price}/sh (+₹${diffPerShare}/sh)`);
  }

  const sysSettings = getSystemSettings();

  // Dynamic Customer Profit Share (Default from Settings or custom per customer)
  const clientProfitPct = Number(
    app?.profit_share_percentage ??
    app?.customers?.profit_share_percentage ??
    app?.customer_profit_share ??
    sysSettings.default_customer_profit_pct ??
    40
  );
  const clientFraction = clientProfitPct / 100;

  const custGrossShare = Math.round(grossProfit * clientFraction);
  const adminShare = grossProfit - custGrossShare;

  const tdsPct = sysSettings.enable_tds_deduction ? (Number(sysSettings.default_tds_pct) || 10) / 100 : 0;
  const tdsAmount = custGrossShare > 0 ? Math.round(custGrossShare * tdsPct) : 0;
  const netPayout = custGrossShare > 0 ? (custGrossShare - tdsAmount) : custGrossShare;

  return {
    exit_mode: exitMode,
    exit_price: exitPrice,
    profit_amount: grossProfit,
    client_share_60: custGrossShare,
    admin_share_40: adminShare,
    tds_10: tdsAmount,
    net_payout: netPayout,
    settlement_remarks: settlementRemarks,
    client_profit_pct: clientProfitPct,
    allotted_quantity: allottedQty,
    tds_pct: sysSettings.enable_tds_deduction ? (Number(sysSettings.default_tds_pct) || 10) : 0
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
    const { data: apps } = await supabase.from('applications').select('*, customers(profit_share_percentage)').eq('ipo_id', ipoId);
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
      .select('*, customers(profit_share_percentage), ipos(*)')
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
      .select('*, ipos(*), customers(*)')
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
      .select('*, customers(*), ipos(*)')
      .eq('id', customerId)
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
      const custSharePct = Number(a.customers?.profit_share_percentage ?? a.profit_share_percentage ?? 40);

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
          type: `Profit Share (+${custSharePct}% - ${a.exit_mode || 'Market'})`,
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
          const newCustPayload = {
            full_name: r.name || r.full_name || 'Imported Customer',
            pan_number: panVal,
            aadhaar_number: r.aadhaar || r.aadhaar_number || r.aadhar || null,
            birthdate: r.birthdate || r.dob || null,
            bank_account_no: r.bank_account_no || r.bank_account || '',
            mobile_number: r.mobile_number || r.phone || '',
            balance: Number(r.balance) || 50000,
            profit_share_percentage: Number(r.profit_share_percentage || r.profit_share || r.share) || 40
          };
          const { data: newCust, error: newCustErr } = await supabase
            .from('customers')
            .insert([newCustPayload])
            .select('id')
            .single();

          if (newCustErr) {
            // Fallback if schema columns are not yet migrated
            const { aadhaar_number, birthdate, ...safeCustPayload } = newCustPayload;
            const { data: fallbackCust } = await supabase
              .from('customers')
              .insert([safeCustPayload])
              .select('id')
              .single();
            if (fallbackCust) customerId = fallbackCust.id;
          } else if (newCust) {
            customerId = newCust.id;
          }
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
