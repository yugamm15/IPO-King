import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  RefreshCw,
  Layers,
  Database,
  Filter,
  X,
  CheckCircle2,
  TrendingUp,
  Clock,
  Trash2,
  Edit,
  Tag,
  AlertCircle,
  BarChart2,
  DollarSign,
  Zap,
  Handshake
} from 'lucide-react';
import {
  supabase,
  fetchApplicationsLedger,
  fetchLiveIpos,
  updateIpoListingStatus,
  updateApplicationAllotmentStatus,
  deleteApplication,
  subscribeToRealtimeChanges
} from '../services/db.js';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import AddApplicationModal from '../components/AddApplicationModal.jsx';
import PreListingExitModal from '../components/PreListingExitModal.jsx';
import IpoSelectorDropdown from '../components/IpoSelectorDropdown.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Applications({ onOpenExcelModal }) {
  const { showToast, showConfirm } = useToast();

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

  // Modals
  const [isAddBidModalOpen, setIsAddBidModalOpen] = useState(false);
  const [listingModalIpo, setListingModalIpo] = useState(null);
  const [customListingPrice, setCustomListingPrice] = useState('');
  const [partialModalApp, setPartialModalApp] = useState(null);
  const [isPreListingModalOpen, setIsPreListingModalOpen] = useState(false);
  const [preListingTargetApps, setPreListingTargetApps] = useState(null);

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
      let metrics = {};
      const isListed = ipoItem && String(ipoItem.status).toLowerCase() === 'listed';
      const listingPrice = Number(ipoItem?.listing_price) || 0;
      const issuePrice = Number(ipoItem?.price_band_max) || Number(ipoItem?.price_band_min) || 100;

      if (isListed && newStatus === 'Full Allotment') {
        const grossGainPerShare = listingPrice - issuePrice;
        const totalGrossProfit = Math.max(0, grossGainPerShare * totalQty);
        const tds = Math.round(totalGrossProfit * 0.10);
        const netProfit = totalGrossProfit - tds;
        const client60 = Math.round(netProfit * 0.60);
        const admin40 = Math.round(netProfit * 0.40);

        metrics = {
          allotted_quantity: totalQty,
          profit_amount: totalGrossProfit,
          client_share_60: client60,
          admin_share_40: admin40,
          tds_10: tds,
          net_payout: client60
        };
      } else {
        metrics = {
          profit_amount: 0,
          client_share_60: 0,
          admin_share_40: 0,
          tds_10: 0,
          net_payout: 0
        };
      }

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
      const isListed = ipoItem && String(ipoItem.status).toLowerCase() === 'listed';
      const listingPrice = Number(ipoItem?.listing_price) || 0;
      const issuePrice = Number(ipoItem?.price_band_max) || Number(ipoItem?.price_band_min) || 100;
      const grossGainPerShare = listingPrice - issuePrice;
      const totalGrossProfit = isListed ? Math.max(0, grossGainPerShare * sharesNum) : 0;
      const tds = Math.round(totalGrossProfit * 0.10);
      const netProfit = totalGrossProfit - tds;
      const client60 = Math.round(netProfit * 0.60);
      const admin40 = Math.round(netProfit * 0.40);

      const metrics = {
        allotted_quantity: sharesNum,
        profit_amount: totalGrossProfit,
        client_share_60: client60,
        admin_share_40: admin40,
        tds_10: tds,
        net_payout: client60
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

      // Automatically recalculate profit metrics for all applications of this IPO that have allotments!
      const targetIpoApps = applications.filter(a => String(a.ipo_id) === String(listingModalIpo.id));
      const issuePrice = Number(listingModalIpo.price_band_max) || Number(listingModalIpo.price_band_min) || 100;
      const lotSize = Number(listingModalIpo.lot_size) || 1;

      for (const app of targetIpoApps) {
        const st = String(app.allotment_status).toLowerCase();
        if (st.includes('full') || st.includes('partial')) {
          const lotsApplied = Number(app.lots_applied) || 1;
          const totalQty = lotsApplied * lotSize;
          const grossGainPerShare = price - issuePrice;
          const totalGrossProfit = Math.max(0, grossGainPerShare * totalQty);
          const tds = Math.round(totalGrossProfit * 0.10);
          const netProfit = totalGrossProfit - tds;
          const client60 = Math.round(netProfit * 0.60);
          const admin40 = Math.round(netProfit * 0.40);

          await updateApplicationAllotmentStatus(app.id, app.allotment_status, {
            profit_amount: totalGrossProfit,
            client_share_60: client60,
            admin_share_40: admin40,
            tds_10: tds,
            net_payout: client60
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

  const getStatusBadgeClass = (status) => {
    switch (String(status).toLowerCase()) {
      case 'full allotment': return 'status-badge full';
      case 'partial allotment':
      case 'partial': return 'status-badge partial';
      case 'rejected': return 'status-badge rejected';
      case 'pending': return 'status-badge upcoming';
      default: return 'status-badge open';
    }
  };

  // Filter applications by selected IPO, status, search query
  const filteredApps = applications.filter((app) => {
    // IPO filter
    if (selectedIpoId !== 'All') {
      const matchIpo = String(app.ipo_id) === String(selectedIpoId) || String(app.ipo_name).toLowerCase() === String(activeSelectedIpo?.ipo_name).toLowerCase();
      if (!matchIpo) return false;
    }

    // Status filter
    const statusVal = String(app.allotment_status || app.status || 'Pending');
    const statusMatch = statusFilter === 'All' || statusVal.toLowerCase().includes(statusFilter.toLowerCase());

    // Search Query
    const query = searchQuery.toLowerCase().trim();
    const panVal = String(app.pan || app.pan_number || '');
    const ipoVal = String(app.ipo_name || app.ipo_applied || '');
    const custName = String(app.customer_name || '');

    const queryMatch =
      !query ||
      custName.toLowerCase().includes(query) ||
      panVal.toLowerCase().includes(query) ||
      ipoVal.toLowerCase().includes(query);

    return statusMatch && queryMatch;
  });

  // Calculate metrics for selected view
  const totalBidsCount = filteredApps.length;
  const totalLotsCount = filteredApps.reduce((sum, a) => sum + (Number(a.lots_applied) || 1), 0);
  const totalBidAmount = filteredApps.reduce((sum, a) => sum + (Number(a.bid_amount) || 15000), 0);
  const fullAllotmentsCount = filteredApps.filter(a => String(a.allotment_status).toLowerCase().includes('full')).length;
  const totalClientProfit = filteredApps.reduce((sum, a) => sum + (Number(a.client_share_60) || 0), 0);
  const totalAdminCommission = filteredApps.reduce((sum, a) => sum + (Number(a.admin_share_40) || 0), 0);

  return (
    <div className="tab-pane active" style={{ paddingBottom: '40px' }}>

      {/* Top Welcome Header */}
      <div className="welcome-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--primary)' }} /> Customer IPO Applications Ledger
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => loadData(true)} title="Refresh Applications Data">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setPreListingTargetApps(null);
              setIsPreListingModalOpen(true);
            }}
            title="Pre-Listing Exit / Kostak / Subject to Sauda"
            style={{ borderColor: '#D97706', color: '#D97706', fontWeight: 700 }}
          >
            <Zap size={15} /> ⚡ Pre-Listing Exit
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddBidModalOpen(true)}>
            <Plus size={16} /> Apply IPO
          </button>
        </div>
      </div>

      {/* PREMIUM IPO SELECTOR DROPDOWN */}
      <IpoSelectorDropdown
        ipos={ipos}
        selectedIpoId={selectedIpoId}
        onSelectIpo={(ipoId) => setSelectedIpoId(ipoId)}
        applications={applications}
      />

      {/* SELECTED IPO SUMMARY CARDS & LISTED STATUS ACTIONS */}
      {activeSelectedIpo && (
        <div className="card glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{activeSelectedIpo.ipo_name}</h3>
                <span className={`status-badge ${String(activeSelectedIpo.status).toLowerCase()}`}>
                  {String(activeSelectedIpo.status).toUpperCase()}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)' }}>
                  {activeSelectedIpo.ipo_type || 'Mainboard'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '0.86rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>Issue Price Band: <strong>₹{activeSelectedIpo.price_band_min || 0} - ₹{activeSelectedIpo.price_band_max || 0}</strong></span>
                <span>Lot Size: <strong>{activeSelectedIpo.lot_size || 1} shares</strong></span>
                <span>Listing Date: <strong>{activeSelectedIpo.listing_date || 'TBA'}</strong></span>
                {activeSelectedIpo.listing_price && (
                  <span style={{ color: '#10B981', fontWeight: 700 }}>
                    Official Listing Price: ₹{activeSelectedIpo.listing_price} ({activeSelectedIpo.gain_est || 'Listed'})
                  </span>
                )}
              </div>
            </div>

            {/* Actions for Selected IPO */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setPreListingTargetApps(null);
                  setIsPreListingModalOpen(true);
                }}
                style={{
                  background: activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                  borderColor: activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? 'var(--primary)' : '#D97706',
                  color: activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? 'var(--primary)' : '#D97706',
                  fontWeight: 700
                }}
              >
                <Zap size={14} /> {activeSelectedIpo.exit_mode && activeSelectedIpo.exit_mode !== 'MARKET' ? activeSelectedIpo.exit_mode : '⚡ Pre-Listing Exit'}
              </button>

              {String(activeSelectedIpo.status).toLowerCase() !== 'listed' ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setListingModalIpo(activeSelectedIpo);
                    setCustomListingPrice(String(activeSelectedIpo.price_band_max || 100));
                  }}
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none' }}
                >
                  <TrendingUp size={16} /> Mark IPO Listed
                </button>
              ) : (
                <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> IPO Listed @ ₹{activeSelectedIpo.listing_price}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card glass-panel">
          <div className="stat-icon icon-blue"><FileSpreadsheet size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Total Applications</span>
            <h3 className="stat-value">{totalBidsCount}</h3>
            <span className="stat-sub positive">{selectedIpoId === 'All' ? 'Across All IPOs' : 'For Selected IPO'}</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-purple"><Layers size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Total Lots Bidding</span>
            <h3 className="stat-value">{totalLotsCount} Lots</h3>
            <span className="stat-sub positive">₹{totalBidAmount.toLocaleString('en-IN')} Total Value</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-green"><CheckCircle2 size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Allotted Bids</span>
            <h3 className="stat-value">{fullAllotmentsCount}</h3>
            <span className="stat-sub positive">Full & Partial Allocations</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-amber"><DollarSign size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Client Profit (60%)</span>
            <h3 className="stat-value">₹{totalClientProfit.toLocaleString('en-IN')}</h3>
            <span className="stat-sub positive">Admin 40%: ₹{totalAdminCommission.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar & Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

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
              // Count apps for this filter within current IPO view
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
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '24px',
                    border: '1.5px solid',
                    borderColor: isActive ? 'var(--primary, #2563EB)' : 'var(--panel-border, #E2E8F0)',
                    background: isActive ? 'var(--primary, #2563EB)' : 'var(--input-bg, #FFFFFF)',
                    color: isActive ? '#FFFFFF' : 'var(--text-main, #0F172A)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--table-header-bg, #F1F5F9)',
                      color: isActive ? '#FFFFFF' : 'var(--text-muted, #64748B)'
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by customer name, PAN, or IPO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '38px',
                paddingRight: searchQuery ? '36px' : '14px',
                height: '40px',
                fontSize: '0.88rem',
                borderRadius: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
      <div className="card glass-panel" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>PAN Number</th>
                <th>Bank A/C Ref</th>
                <th>IPO Applied</th>
                <th>Lots / Qty</th>
                <th>Exit Strategy</th>
                <th>Allotment Status</th>
                <th>40% Cust Profit</th>
                <th>10% TDS</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Action</th>
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
              ) : filteredApps.length > 0 ? (
                filteredApps.map((row) => {
                  const statusVal = row.allotment_status || row.status || 'Pending';
                  const panVal = row.pan || row.pan_number || '—';
                  const ipoVal = row.ipo_name || row.ipo_applied || 'IPO Offering';
                  const lotsVal = row.lots_applied || 1;
                  const qtyVal = row.quantity || (lotsVal * 50);
                  const clientProfit = Number(row.client_share_60) || 0;
                  const tdsAmt = Number(row.tds_10) || 0;
                  const exitModeStr = row.exit_mode || 'MARKET';

                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.customer_name}</strong>
                        {row.dpid && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DPID: {row.dpid}</div>}
                      </td>
                      <td><code>{panVal}</code></td>
                      <td>{row.bank_account || '—'}</td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>{ipoVal}</strong>
                        {row.ipo_status === 'listed' && (
                          <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
                            Listed @ ₹{row.listing_price || '—'}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{lotsVal} Lots</strong> ({qtyVal} sh)
                      </td>
                      <td>
                        {exitModeStr === 'KOSTAK' ? (
                          <span className="pill-badge" style={{ background: '#EDE9FE', color: '#7C3AED', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Tag size={11} /> KOSTAK (₹{row.kostak_rate || row.exit_price})
                          </span>
                        ) : exitModeStr === 'SAUDA' ? (
                          <span className="pill-badge" style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Handshake size={11} /> SAUDA (₹{row.sauda_rate || row.exit_price})
                          </span>
                        ) : exitModeStr === 'PRE_LISTING' ? (
                          <span className="pill-badge" style={{ background: '#D1FAE5', color: '#059669', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <TrendingUp size={11} /> OFF-MKT (₹{row.exit_price})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Market Listing</span>
                        )}
                      </td>
                      <td>
                        {/* Interactive Status Selector directly in table */}
                        <select
                          className={`input-field ${getStatusBadgeClass(statusVal)}`}
                          value={statusVal}
                          onChange={(e) => handleStatusChange(row, e.target.value)}
                          style={{
                            height: '32px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: 'none'
                          }}
                        >
                          <option value="Pending">PENDING</option>
                          <option value="Full Allotment">FULL ALLOTMENT</option>
                          <option value="Partial">PARTIAL</option>
                          <option value="Rejected">REJECTED</option>
                        </select>
                      </td>
                      <td className="text-green font-bold">
                        {clientProfit > 0 ? `₹${clientProfit.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="text-amber font-semibold">
                        {tdsAmt > 0 ? `₹${tdsAmt.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="btn-xs"
                            onClick={() => {
                              setPreListingTargetApps([row]);
                              setIsPreListingModalOpen(true);
                            }}
                            title="Pre-Listing Exit for this Application"
                            style={{
                              background: 'rgba(217, 119, 6, 0.1)',
                              color: '#D97706',
                              border: '1px solid rgba(217, 119, 6, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Zap size={11} /> Exit
                          </button>
                          <button
                            className="btn-xs btn-outline"
                            onClick={() => handleDeleteBid(row.id, row.customer_name)}
                            title="Delete customer application bid"
                            style={{ color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p>No matching applications found in database for selected criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Application Modal (Includes Customer Auto-Fill on Selection) */}
      <AddApplicationModal
        isOpen={isAddBidModalOpen}
        onClose={() => setIsAddBidModalOpen(false)}
        ipos={ipos}
        selectedIpoId={selectedIpoId !== 'All' ? selectedIpoId : null}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Quick Mark Listed Modal */}
      {listingModalIpo && (
        <div className="modal-backdrop" onClick={() => setListingModalIpo(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Mark Official Listing Price</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Record stock exchange listing price for <strong>{listingModalIpo.ipo_name}</strong> (Issue Price: ₹{listingModalIpo.price_band_max || listingModalIpo.price_band_min})
            </p>

            <form onSubmit={handleMarkListed}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Listing Price (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 565"
                  value={customListingPrice}
                  onChange={(e) => setCustomListingPrice(e.target.value)}
                  style={{ width: '100%', height: '40px', fontSize: '1rem', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setListingModalIpo(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Listing Gain</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Allotment Allocated Shares Modal */}
      {partialModalApp && (
        <div className="modal-backdrop" onClick={() => setPartialModalApp(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '6px', color: 'var(--text-main)' }}>Partial Allotment Details</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter allocated quantity for <strong>{partialModalApp.app.customer_name}</strong> (Applied: {partialModalApp.totalQty} shares)
            </p>

            <form onSubmit={handleConfirmPartialAllotment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Allocated Shares / Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  max={partialModalApp.totalQty}
                  className="input-field"
                  value={partialModalApp.allocatedShares}
                  onChange={(e) => setPartialModalApp({ ...partialModalApp, allocatedShares: e.target.value })}
                  style={{ width: '100%', height: '42px', fontSize: '1rem', fontWeight: 700 }}
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

    </div>
  );
}
