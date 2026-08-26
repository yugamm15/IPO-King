import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  RefreshCw,
  Layers,
  Database,
  CheckCircle2,
  TrendingUp,
  Trash2,
  Tag,
  DollarSign,
  Zap,
  Handshake,
  X,
  SlidersHorizontal,
  Check,
  Building2
} from 'lucide-react';
import {
  supabase,
  fetchApplicationsLedger,
  fetchLiveIpos,
  updateIpoListingStatus,
  updateApplicationAllotmentStatus,
  deleteApplication,
  subscribeToRealtimeChanges,
  calculateExitMetrics
} from '../services/db.js';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import AddApplicationModal from '../components/AddApplicationModal.jsx';
import PreListingExitModal from '../components/PreListingExitModal.jsx';
import IndividualExitModal from '../components/IndividualExitModal.jsx';
import IpoSelectorDropdown from '../components/IpoSelectorDropdown.jsx';
import Pagination from '../components/Pagination.jsx';
import ActionDropdown from '../components/ActionDropdown.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Applications({ showConfirm }) {
  const { showToast } = useToast();

  const [applications, setApplications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipoking_cache_applications')) || []; } catch(e) { return []; }
  });

  const [ipos, setIpos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipoking_cache_ipos')) || []; } catch(e) { return []; }
  });

  const [loading, setLoading] = useState(() => !applications || applications.length === 0);

  // Filters & Selected IPO State
  const [selectedIpoId, setSelectedIpoId] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bankFilter, setBankFilter] = useState('All');

  // Pagination-2 State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isAddBidModalOpen, setIsAddBidModalOpen] = useState(false);
  const [listingModalIpo, setListingModalIpo] = useState(null);
  const [customListingPrice, setCustomListingPrice] = useState('');
  const [partialModalApp, setPartialModalApp] = useState(null);
  const [isPreListingModalOpen, setIsPreListingModalOpen] = useState(false);
  const [preListingTargetApps, setPreListingTargetApps] = useState(null);
  const [individualExitApp, setIndividualExitApp] = useState(null);

  const loadData = async (force = false) => {
    if (!applications || applications.length === 0) {
      setLoading(true);
    }
    try {
      const [appsData, iposData] = await Promise.all([
        fetchApplicationsLedger(force),
        fetchLiveIpos(force)
      ]);
      setApplications(appsData || []);
      setIpos(iposData || []);
    } catch (err) {
      console.error('Error fetching Applications & IPOs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Currently selected IPO object
  const activeSelectedIpo = selectedIpoId !== 'All'
    ? ipos.find(i => String(i.id) === String(selectedIpoId))
    : null;

  // Handler to delete application bid
  const handleDeleteBid = (appId, custName) => {
    showConfirm({
      title: 'Delete Customer Application',
      message: `Are you sure you want to remove application for "${custName}"? This action cannot be undone.`,
      confirmText: 'Delete Bid',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteApplication(appId);
          showToast(`Application for "${custName}" removed`, 'success');
          loadData();
        } catch (err) {
          showToast(`Failed to delete application: ${err.message}`, 'error');
        }
      }
    });
  };

  // Handler to update Allotment Status directly from table dropdown
  const handleStatusChange = async (app, newStatus) => {
    const ipoItem = ipos.find(i => String(i.id) === String(app.ipo_id)) || activeSelectedIpo;
    const lotSize = Number(ipoItem?.lot_size) || 1;
    const rawVal = Number(app.quantity || app.lots_applied) || 1;
    const totalQty = (rawVal >= lotSize && lotSize > 1) ? rawVal : (rawVal * lotSize);

    if (newStatus === 'Partial' || newStatus === 'Partial Allotment') {
      const defaultHalf = Math.max(1, Math.floor(totalQty / 2));
      const initialAllocated = (app.allotted_quantity && app.allotted_quantity < totalQty) ? app.allotted_quantity : defaultHalf;
      setPartialModalApp({ app, allocatedShares: initialAllocated, totalQty });
      return;
    }

    try {
      const exitParams = {
        exit_mode: app.exit_mode || 'MARKET',
        exit_price: Number(app.exit_price) || Number(ipoItem?.listing_price) || 0,
        kostak_rate: Number(app.kostak_rate) || 0,
        sauda_rate: Number(app.sauda_rate) || 0
      };

      const calculated = calculateExitMetrics(exitParams, {}, { ...app, allotment_status: newStatus }, ipoItem);

      const metrics = {
        allotted_quantity: newStatus === 'Full Allotment' ? totalQty : 0,
        profit_amount: calculated.profit_amount,
        client_share_60: calculated.client_share_60,
        admin_share_40: calculated.admin_share_40,
        tds_10: calculated.tds_10,
        net_payout: calculated.net_payout,
        settlement_remarks: calculated.settlement_remarks
      };

      await updateApplicationAllotmentStatus(app.id, newStatus, metrics);
      showToast(`Allotment status updated to "${newStatus}" for ${app.customer_name}`, 'success');
      loadData();
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleConfirmPartialAllotment = async (e) => {
    e.preventDefault();
    if (!partialModalApp) return;
    const { app, allocatedShares } = partialModalApp;
    const sharesNum = Number(allocatedShares) || 0;

    try {
      const ipoItem = ipos.find(i => String(i.id) === String(app.ipo_id)) || activeSelectedIpo;
      const exitParams = {
        exit_mode: app.exit_mode || 'MARKET',
        exit_price: Number(app.exit_price) || Number(ipoItem?.listing_price) || 0,
        kostak_rate: Number(app.kostak_rate) || 0,
        sauda_rate: Number(app.sauda_rate) || 0
      };

      const calculated = calculateExitMetrics(exitParams, {}, { ...app, quantity: sharesNum, allotment_status: 'Partial Allotment' }, ipoItem);

      const metrics = {
        allotted_quantity: sharesNum,
        profit_amount: calculated.profit_amount,
        client_share_60: calculated.client_share_60,
        admin_share_40: calculated.admin_share_40,
        tds_10: calculated.tds_10,
        net_payout: calculated.net_payout,
        settlement_remarks: calculated.settlement_remarks
      };

      await updateApplicationAllotmentStatus(app.id, 'Partial Allotment', metrics);
      showToast(`Partial Allotment set to ${sharesNum} shares for ${app.customer_name}!`, 'success');
      setPartialModalApp(null);
      loadData();
    } catch (err) {
      showToast(`Failed to update partial allotment: ${err.message}`, 'error');
    }
  };

  // Handler to Mark IPO Listed
  const handleMarkListed = async (e) => {
    e.preventDefault();
    if (!listingModalIpo) return;

    const price = Number(customListingPrice);
    if (!price || price <= 0) {
      showToast('Please enter a valid listing price', 'warning');
      return;
    }

    try {
      await updateIpoListingStatus(listingModalIpo.id, price);

      const targetIpoApps = applications.filter(a => String(a.ipo_id) === String(listingModalIpo.id));

      for (const app of targetIpoApps) {
        const st = String(app.allotment_status).toLowerCase();
        if (st.includes('full') || st.includes('partial')) {
          const calculated = calculateExitMetrics('MARKET', { listing_price: price }, app, listingModalIpo);

          await updateApplicationAllotmentStatus(app.id, app.allotment_status, {
            exit_price: price,
            profit_amount: calculated.profit_amount,
            client_share_60: calculated.client_share_60,
            admin_share_40: calculated.admin_share_40,
            tds_10: calculated.tds_10,
            net_payout: calculated.net_payout,
            settlement_remarks: calculated.settlement_remarks
          });
        }
      }

      showToast(`IPO ${listingModalIpo.ipo_name} marked as Listed @ ₹${price}!`, 'success');
      setListingModalIpo(null);
      setCustomListingPrice('');
      loadData();
    } catch (err) {
      showToast(`Error updating listing price: ${err.message}`, 'error');
    }
  };

  // Extract unique banks dynamically from applications
  const uniqueBanks = useMemo(() => {
    const bSet = new Set();
    applications.forEach((a) => {
      const b = a.bank_name || a.customers?.bank_name;
      if (b && b !== '—' && b !== 'null' && b !== 'undefined' && b.trim() !== '') {
        bSet.add(b.trim());
      }
    });
    return Array.from(bSet).sort();
  }, [applications]);

  // Filter applications by selected IPO, bank, status, search query
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // IPO filter
      if (selectedIpoId !== 'All') {
        const matchIpo = String(app.ipo_id) === String(selectedIpoId) || String(app.ipo_name).toLowerCase() === String(activeSelectedIpo?.ipo_name).toLowerCase();
        if (!matchIpo) return false;
      }

      // Bank filter
      if (bankFilter !== 'All') {
        const appBank = String(app.bank_name || app.customers?.bank_name || '').toLowerCase();
        if (!appBank.includes(bankFilter.toLowerCase())) return false;
      }

      // Status filter
      const statusVal = String(app.allotment_status || app.status || 'Pending');
      const statusMatch = statusFilter === 'All' || statusVal.toLowerCase().includes(statusFilter.toLowerCase());

      // Search Query
      const query = searchQuery.toLowerCase().trim();
      const panVal = String(app.pan || app.pan_number || '');
      const ipoVal = String(app.ipo_name || app.ipo_applied || '');
      const custName = String(app.customer_name || '');
      const bankVal = String(app.bank_name || '');

      const queryMatch =
        !query ||
        custName.toLowerCase().includes(query) ||
        panVal.toLowerCase().includes(query) ||
        ipoVal.toLowerCase().includes(query) ||
        bankVal.toLowerCase().includes(query);

      return statusMatch && queryMatch;
    });
  }, [applications, selectedIpoId, activeSelectedIpo, bankFilter, statusFilter, searchQuery]);

  // Paginated applications
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  // Calculate metrics for selected view
  const totalBidsCount = filteredApps.length;
  const totalLotsCount = filteredApps.reduce((sum, a) => sum + (Number(a.lots_applied) || 1), 0);
  const totalBidAmount = filteredApps.reduce((sum, a) => sum + (Number(a.bid_amount) || 15000), 0);
  const fullAllotmentsCount = filteredApps.filter(a => String(a.allotment_status).toLowerCase().includes('full')).length;
  const totalClientProfit = filteredApps.reduce((sum, a) => sum + (Number(a.client_share_60) || 0), 0);
  const totalAdminCommission = filteredApps.reduce((sum, a) => sum + (Number(a.admin_share_40) || 0), 0);

  return (
    <div className="page-content">

      {/* Top Welcome Header (Hero-11) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
              IPO Applications Ledger
            </h1>
            <span className="badge badge-teal">
              {filteredApps.length} Bids Filtered
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Real-time multi-account IPO bid dispatching, bank-wise filtering, and pre-listing exit manager.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPreListingTargetApps(bankFilter !== 'All' ? filteredApps : null);
              setIsPreListingModalOpen(true);
            }}
            title="Pre-Listing Exit / Kostak / Subject to Sauda"
            style={{ borderColor: 'var(--warning)', color: 'var(--warning)', fontWeight: 700, padding: '9px 16px' }}
          >
            <Zap size={15} /> ⚡ Pre-Listing Exit {bankFilter !== 'All' ? `(${bankFilter}: ${filteredApps.length} Bids)` : ''}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddBidModalOpen(true)}
            style={{ padding: '9px 18px' }}
          >
            <Plus size={16} /> Apply IPO
          </button>
        </div>
      </div>

      {/* PREMIUM IPO SELECTOR DROPDOWN */}
      <div style={{ marginBottom: '20px' }}>
        <IpoSelectorDropdown
          ipos={ipos}
          selectedIpoId={selectedIpoId}
          onSelectIpo={(ipoId) => {
            setSelectedIpoId(ipoId);
            setCurrentPage(1);
          }}
          applications={applications}
        />
      </div>

      {/* SELECTED IPO SUMMARY CARDS & LISTED STATUS ACTIONS */}
      {activeSelectedIpo && (
        <div className="fintech-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeSelectedIpo.ipo_name}</h3>
                <span className={`badge ${String(activeSelectedIpo.status).toLowerCase() === 'listed' ? 'badge-success' : 'badge-teal'}`}>
                  {String(activeSelectedIpo.status).toUpperCase()}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(4, 47, 46, 0.08)', color: 'var(--primary)' }}>
                  {activeSelectedIpo.ipo_type || 'Mainboard'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '13.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>Issue Price Band: <strong style={{ color: 'var(--text-main)' }}>₹{activeSelectedIpo.price_band_min || 0} - ₹{activeSelectedIpo.price_band_max || 0}</strong></span>
                <span>Lot Size: <strong style={{ color: 'var(--text-main)' }}>{activeSelectedIpo.lot_size || 1} shares</strong></span>
                {activeSelectedIpo.listing_price && (
                  <span style={{ color: 'var(--success-text)', fontWeight: 700 }}>
                    Official Listing Price: ₹{activeSelectedIpo.listing_price} ({activeSelectedIpo.gain_est || 'Listed'})
                  </span>
                )}
              </div>
            </div>

            {/* Actions for Selected IPO */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPreListingTargetApps(null);
                  setIsPreListingModalOpen(true);
                }}
                style={{
                  background: activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? 'rgba(4, 47, 46, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  borderColor: activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? 'var(--primary)' : 'var(--warning)',
                  color: activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? 'var(--primary)' : 'var(--warning)',
                  fontWeight: 700
                }}
              >
                <Zap size={14} /> {activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? activeSelectedIpo.exit_mode : '⚡ Pre-Listing Exit'}
              </button>

              {String(activeSelectedIpo.status).toLowerCase() !== 'listed' ? (
                <button
                  type="button"
                  className="btn btn-teal"
                  onClick={() => {
                    setListingModalIpo(activeSelectedIpo);
                    setCustomListingPrice(String(activeSelectedIpo.price_band_max || 100));
                  }}
                >
                  <TrendingUp size={16} /> Mark IPO Listed
                </button>
              ) : (
                <div className="badge badge-success" style={{ padding: '8px 14px', fontSize: '13px' }}>
                  <CheckCircle2 size={16} /> IPO Listed @ ₹{activeSelectedIpo.listing_price}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid (Hero-11 Stat Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Applications</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>{totalBidsCount}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedIpoId === 'All' ? 'Across All IPOs' : 'For Selected IPO'}</span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Lots Bidding</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>{totalLotsCount} Lots</h3>
          <span style={{ fontSize: '12px', color: 'var(--brand-accent)', fontWeight: 600 }}>₹{totalBidAmount.toLocaleString('en-IN')} Total Value</span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Allotted Bids</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--success-text)', margin: '8px 0 4px 0' }}>{fullAllotmentsCount}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full & Partial Allocations</span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Client Profit (40%)</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--warning)', margin: '8px 0 4px 0' }}>₹{totalClientProfit.toLocaleString('en-IN')}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Company (60%): ₹{totalAdminCommission.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Filter Tabs Bar & Search Bar (Hero-11) */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        padding: '14px 18px',
        marginBottom: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Status Filter Badges */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'All', label: 'All Applications' },
            { id: 'Full Allotment', label: 'Full Allotment' },
            { id: 'Partial', label: 'Partial Allotment' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Rejected', label: 'Rejected' }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            const count = applications.filter((app) => {
              if (selectedIpoId !== 'All') {
                const matchIpo = String(app.ipo_id) === String(selectedIpoId) || String(app.ipo_name).toLowerCase() === String(activeSelectedIpo?.ipo_name).toLowerCase();
                if (!matchIpo) return false;
              }
              if (tab.id === 'All') return true;
              const statusVal = String(app.allotment_status || app.status || 'Pending').toLowerCase();
              return statusVal.includes(tab.id.toLowerCase());
            }).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  gap: '8px'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(4, 47, 46, 0.08)',
                    color: isActive ? '#FAF6EC' : 'var(--text-muted)'
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Bank Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          {/* Bank Wise Filter Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '12px',
            padding: '0 12px',
            height: '38px'
          }}>
            <Building2 size={16} style={{ color: 'var(--brand-accent)', flexShrink: 0 }} />
            <select
              value={bankFilter}
              onChange={(e) => {
                setBankFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                minWidth: '150px'
              }}
            >
              <option value="All">🏦 All Banks ({applications.length})</option>
              {uniqueBanks.map((b) => {
                const count = applications.filter((a) => {
                  if (selectedIpoId !== 'All') {
                    const matchIpo = String(a.ipo_id) === String(selectedIpoId) || String(a.ipo_name).toLowerCase() === String(activeSelectedIpo?.ipo_name).toLowerCase();
                    if (!matchIpo) return false;
                  }
                  const ab = String(a.bank_name || a.customers?.bank_name || '');
                  return ab.toLowerCase() === b.toLowerCase();
                }).length;
                return (
                  <option key={b} value={b}>
                    {b} ({count} bids)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Field */}
          <div style={{ position: 'relative', minWidth: '240px', maxWidth: '320px', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search customer, PAN, IPO, bank..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                paddingLeft: '38px',
                paddingRight: searchQuery ? '36px' : '14px',
                height: '38px',
                fontSize: '13.5px',
                borderRadius: '12px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Applications Data Table */}
      <div className="table-container">
        <table className="fintech-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>PAN Number</th>
              <th>Bank &amp; Account</th>
              <th>IPO Applied</th>
              <th>Lots / Qty</th>
              <th>Exit Strategy</th>
              <th>Allotment Status</th>
              <th>40% Cust Profit</th>
              <th>10% TDS</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonTableRow columns={10} />
                <SkeletonTableRow columns={10} />
                <SkeletonTableRow columns={10} />
                <SkeletonTableRow columns={10} />
              </>
            ) : paginatedApps.length > 0 ? (
              paginatedApps.map((row) => {
                const statusVal = row.allotment_status || row.status || 'Pending';
                const panVal = row.pan || row.pan_number || '—';
                const ipoVal = row.ipo_name || row.ipo_applied || 'IPO Offering';
                const lotsVal = row.lots_applied || 1;
                const clientProfit = Number(row.client_share_60) || 0;
                const tdsAmt = clientProfit > 0 ? (Number(row.tds_10) || 0) : 0;
                const exitModeStr = row.exit_mode || 'MARKET';

                return (
                  <tr key={row.id}>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{row.customer_name}</strong>
                      {row.dpid && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>DPID: {row.dpid}</div>}
                    </td>
                    <td><code style={{ background: 'rgba(4, 47, 46, 0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary)' }}>{panVal}</code></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>{row.bank_name || 'Bank'}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.bank_account || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{ipoVal}</strong>
                      {row.ipo_status === 'listed' && (
                        <div style={{ fontSize: '11px', color: 'var(--success-text)', fontWeight: 600 }}>
                          Listed @ ₹{row.listing_price || '—'}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{lotsVal} Lots</strong> <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({qtyVal} sh)</span>
                    </td>
                    <td onClick={() => setIndividualExitApp(row)} style={{ cursor: 'pointer' }} title="Click to enter individual custom sell price">
                      {exitModeStr === 'KOSTAK' ? (
                        <span className="badge badge-purple">
                          <Tag size={11} /> KOSTAK (₹{row.kostak_rate || row.exit_price})
                        </span>
                      ) : exitModeStr === 'SAUDA' ? (
                        <span className="badge badge-warning">
                          <Handshake size={11} /> SAUDA (₹{row.sauda_rate || row.exit_price})
                        </span>
                      ) : exitModeStr === 'PRE_LISTING' ? (
                        <span className="badge badge-success">
                          <TrendingUp size={11} /> OFF-MKT (₹{row.exit_price})
                        </span>
                      ) : row.exit_price > 0 ? (
                        <span className="badge badge-teal">
                          <TrendingUp size={11} /> SOLD @ ₹{row.exit_price}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Market Listing</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="input-field"
                        value={statusVal}
                        onChange={(e) => handleStatusChange(row, e.target.value)}
                        style={{
                          height: '32px',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          width: 'auto'
                        }}
                      >
                        <option value="Pending">PENDING</option>
                        <option value="Full Allotment">FULL ALLOTMENT</option>
                        <option value="Partial">PARTIAL</option>
                        <option value="Rejected">REJECTED</option>
                      </select>
                    </td>
                    <td>
                      {clientProfit < 0 ? (
                        <strong style={{ color: 'var(--danger-text)' }}>
                          -₹{Math.abs(clientProfit).toLocaleString('en-IN')}
                        </strong>
                      ) : clientProfit > 0 ? (
                        <strong style={{ color: 'var(--success-text)' }}>
                          +₹{clientProfit.toLocaleString('en-IN')}
                        </strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>₹0</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: tdsAmt > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {tdsAmt > 0 ? `₹${tdsAmt.toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ActionDropdown
                        items={[
                          {
                            icon: TrendingUp,
                            label: 'Custom Sell Price',
                            description: 'Enter individual exit/sell price',
                            onClick: () => setIndividualExitApp(row)
                          },
                          {
                            icon: Zap,
                            label: 'Pre-Listing Exit',
                            description: 'Lock Kostak or Sauda profit',
                            onClick: () => {
                              setPreListingTargetApps([row]);
                              setIsPreListingModalOpen(true);
                            }
                          },
                          {
                            type: 'separator'
                          },
                          {
                            icon: Trash2,
                            label: 'Delete Bid',
                            description: 'Permanently remove application',
                            variant: 'destructive',
                            onClick: () => handleDeleteBid(row.id, row.customer_name)
                          }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No matching applications found for selected criteria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Watermelon Pagination-2 Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredApps.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Add New IPO Bid Modal */}
      {isAddBidModalOpen && (
        <AddApplicationModal
          isOpen={isAddBidModalOpen}
          targetIpo={activeSelectedIpo}
          ipos={ipos}
          onClose={() => setIsAddBidModalOpen(false)}
          onSuccess={() => {
            setIsAddBidModalOpen(false);
            loadData(true);
          }}
        />
      )}

      {/* Quick Mark Listed Modal */}
      {listingModalIpo && (
        <div className="modal-overlay" onClick={() => setListingModalIpo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: 'var(--text-main)' }}>Mark Official Listing Price</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Record stock exchange listing price for <strong>{listingModalIpo.ipo_name}</strong> (Issue Price: ₹{listingModalIpo.price_band_max || listingModalIpo.price_band_min})
            </p>

            <form onSubmit={handleMarkListed}>
              <div style={{ marginBottom: '16px' }}>
                <label className="input-label">Listing Price (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 245"
                  value={customListingPrice}
                  onChange={(e) => setCustomListingPrice(e.target.value)}
                  style={{ height: '42px', fontSize: '16px', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setListingModalIpo(null)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Save Listing & Settle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Allotment Modal */}
      {partialModalApp && (
        <div className="modal-overlay" onClick={() => setPartialModalApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: 'var(--text-main)' }}>Partial Share Allocation</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Specify allocated shares for <strong>{partialModalApp.customerName}</strong> in <strong>{partialModalApp.ipoName}</strong> (Applied: {partialModalApp.totalQty} shares)
            </p>

            <form onSubmit={handlePartialSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="input-label">Allotted Share Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={partialModalApp.totalQty}
                  className="input-field"
                  value={partialModalApp.allocatedShares}
                  onChange={(e) => setPartialModalApp({ ...partialModalApp, allocatedShares: e.target.value })}
                  style={{ height: '42px', fontSize: '16px', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPartialModalApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Partial Allotment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Listing Exit & Grey Market Sale Modal */}
      {isPreListingModalOpen && (
        <PreListingExitModal
          isOpen={isPreListingModalOpen}
          targetIpo={activeSelectedIpo}
          targetApplications={preListingTargetApps}
          ipos={ipos}
          onClose={() => {
            setIsPreListingModalOpen(false);
            setPreListingTargetApps(null);
          }}
          onSuccess={() => {
            setIsPreListingModalOpen(false);
            setPreListingTargetApps(null);
            loadData(true);
          }}
        />
      )}

      {/* Individual Application Custom Exit Modal */}
      {individualExitApp && (
        <IndividualExitModal
          isOpen={Boolean(individualExitApp)}
          app={individualExitApp}
          onClose={() => setIndividualExitApp(null)}
          onSuccess={() => {
            setIndividualExitApp(null);
            loadData(true);
          }}
        />
      )}

    </div>
  );
}
