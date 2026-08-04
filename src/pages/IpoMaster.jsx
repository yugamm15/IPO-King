import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  Sparkles,
  BarChart3,
  X
} from 'lucide-react';
import { supabase, fetchLiveIpos, subscribeToRealtimeChanges } from '../services/db.js';
import AddIpoModal from '../components/AddIpoModal.jsx';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function IpoMaster() {
  const { showToast, showConfirm } = useToast();
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState(null);
  const [listingModalIpo, setListingModalIpo] = useState(null);
  const [customListingPrice, setCustomListingPrice] = useState('');

  const loadIpos = async () => {
    setLoading(true);
    try {
      const data = await fetchLiveIpos();
      setIpos(data || []);
    } catch (err) {
      console.error('Error fetching IPO Master catalog:', err);
      setIpos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIpos();

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadIpos();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleDeleteIpo = (ipoId, ipoName) => {
    showConfirm({
      title: 'Delete IPO Record',
      message: `Are you sure you want to delete "${ipoName}" from the database? This action cannot be undone.`,
      confirmText: 'Delete Record',
      danger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('ipos').delete().eq('id', ipoId);
          if (error) throw error;
          setIpos((prev) => prev.filter((item) => item.id !== ipoId));
          showToast(`IPO "${ipoName}" deleted successfully`, 'success');
        } catch (err) {
          showToast(`Error deleting IPO: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleMarkListed = async (e) => {
    e.preventDefault();
    if (!listingModalIpo) return;

    const price = Number(customListingPrice);
    if (!price || price <= 0) {
      showToast('Please enter a valid listing price', 'warning');
      return;
    }

    const issueMax = Number(listingModalIpo.price_band_max) || Number(listingModalIpo.price_band_min) || 100;
    const gainPct = (((price - issueMax) / issueMax) * 100).toFixed(1);
    const gainStr = `Listed @ ₹${price} (${gainPct >= 0 ? '+' : ''}${gainPct}%)`;

    try {
      const { error } = await supabase
        .from('ipos')
        .update({
          status: 'listed',
          listing_price: price,
          gain_est: gainStr
        })
        .eq('id', listingModalIpo.id);

      if (error) throw error;

      showToast(`Listing price recorded for ${listingModalIpo.ipo_name}`, 'success');
      setListingModalIpo(null);
      setCustomListingPrice('');
      loadIpos();
    } catch (err) {
      showToast(`Error setting listing price: ${err.message}`, 'error');
    }
  };

  const handleEditClick = (ipo) => {
    setEditingIpo(ipo);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingIpo(null);
    setIsModalOpen(true);
  };

  const filteredIpos = ipos.filter(ipo => {
    const statusStr = String(ipo.status || '').toLowerCase();
    const typeStr = String(ipo.ipo_type || 'Mainboard').toLowerCase();

    let matchesFilter = true;
    if (activeFilter === 'Open') matchesFilter = statusStr === 'open';
    else if (activeFilter === 'Upcoming') matchesFilter = statusStr === 'upcoming';
    else if (activeFilter === 'Listed') matchesFilter = statusStr === 'listed';
    else if (activeFilter === 'Closed') matchesFilter = statusStr === 'closed';
    else if (activeFilter === 'Mainboard') matchesFilter = typeStr === 'mainboard';
    else if (activeFilter === 'SME Board') matchesFilter = typeStr === 'sme';

    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query ||
      String(ipo.ipo_name || '').toLowerCase().includes(query) ||
      String(ipo.symbol || '').toLowerCase().includes(query) ||
      String(ipo.company_name || '').toLowerCase().includes(query);

    return matchesFilter && matchesQuery;
  });

  const totalCount = ipos.length;
  const openCount = ipos.filter(i => String(i.status).toLowerCase() === 'open').length;
  const upcomingCount = ipos.filter(i => String(i.status).toLowerCase() === 'upcoming').length;
  const listedCount = ipos.filter(i => String(i.status).toLowerCase() === 'listed').length;

  const getStatusBadgeClass = (status) => {
    switch (String(status).toLowerCase()) {
      case 'open': return 'status-badge open';
      case 'upcoming': return 'status-badge upcoming';
      case 'listed': return 'status-badge listed';
      case 'closed': return 'status-badge partial';
      default: return 'status-badge open';
    }
  };

  return (
    <div className="tab-pane active" style={{ paddingBottom: '40px' }}>

      {/* Top Banner Header */}
      <div className="welcome-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={24} style={{ color: 'var(--primary)' }} /> IPO Master Catalog & Listing Engine
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadIpos} title="Refresh Database Data">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button className="btn btn-primary" onClick={handleCreateClick}>
            <Plus size={16} /> New IPO
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card glass-panel">
          <div className="stat-icon icon-blue"><Layers size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Total Catalog IPOs</span>
            <h3 className="stat-value">{totalCount}</h3>
            <span className="stat-sub positive">Tracked in Database</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-green"><TrendingUp size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Open For Bidding</span>
            <h3 className="stat-value">{openCount}</h3>
            <span className="stat-sub positive">Active Investor Bids</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-purple"><Clock size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Upcoming Pipeline</span>
            <h3 className="stat-value">{upcomingCount}</h3>
            <span className="stat-sub">Opening Soon</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-amber"><BarChart3 size={22} /></div>
          <div className="stat-data">
            <span className="stat-label">Listed on Exchanges</span>
            <h3 className="stat-value">{listedCount}</h3>
            <span className="stat-sub positive">Listing Gains Distributed</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['All', 'Open', 'Upcoming', 'Listed', 'Closed', 'Mainboard', 'SME Board'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeFilter === tab ? 'var(--primary)' : 'var(--panel-border)',
                  background: activeFilter === tab ? 'var(--primary)' : 'transparent',
                  color: activeFilter === tab ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by IPO or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '38px',
                paddingRight: searchQuery ? '36px' : '14px',
                height: '40px',
                fontSize: '0.88rem',
                borderRadius: '12px',
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid var(--panel-border)',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main IPO Data Table */}
      <div className="card glass-panel" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>IPO Name & Exchange</th>
                <th>Board</th>
                <th>Price Band (₹)</th>
                <th>Lot Size</th>
                <th>Min Investment</th>
                <th>Subscription Dates</th>
                <th>GMP / Gain Estimate</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonTableRow columns={9} />
                  <SkeletonTableRow columns={9} />
                  <SkeletonTableRow columns={9} />
                  <SkeletonTableRow columns={9} />
                </>
              ) : filteredIpos.length > 0 ? (
                filteredIpos.map((ipo) => {
                  const minP = Number(ipo.price_band_min) || 0;
                  const maxP = Number(ipo.price_band_max) || minP;
                  const lot = Number(ipo.lot_size) || 1;
                  const minRetail = maxP * lot;
                  const isListed = String(ipo.status).toLowerCase() === 'listed';

                  return (
                    <tr key={ipo.id || ipo.ipo_name}>
                      <td>
                        <div className="ipo-cell">
                          <strong style={{ fontSize: '0.94rem' }}>{ipo.ipo_name}</strong>
                          <span className="cell-sub">{ipo.company_name || ipo.symbol || 'NSE / BSE'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: ipo.ipo_type === 'SME' ? 'rgba(124, 58, 237, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                          color: ipo.ipo_type === 'SME' ? 'var(--purple)' : 'var(--primary)'
                        }}>
                          {ipo.ipo_type || 'Mainboard'}
                        </span>
                      </td>
                      <td>
                        <strong>₹{minP.toLocaleString('en-IN')} - ₹{maxP.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>{lot} shares</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{minRetail.toLocaleString('en-IN')}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                          {ipo.subscription_open_date || ipo.open_date || 'Open'}
                        </span>
                      </td>
                      <td>
                        <span className="tag-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <TrendingUp size={12} /> {ipo.gain_est || '+₹150/sh Est.'}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(ipo.status)}>
                          {String(ipo.status).toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>

                          {!isListed && (
                            <button
                              className="btn-xs btn-outline"
                              onClick={() => {
                                setListingModalIpo(ipo);
                                setCustomListingPrice(String(maxP));
                              }}
                              title="Mark Official Listing Price"
                            >
                              Mark Listed
                            </button>
                          )}

                          {ipo.allotment_url && (
                            <a
                              href={ipo.allotment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-xs btn-outline"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                              title="Registrar Allotment Checker"
                            >
                              <ExternalLink size={12} /> Checker
                            </a>
                          )}

                          <button
                            className="btn-xs btn-outline"
                            onClick={() => handleEditClick(ipo)}
                            title="Edit IPO details"
                          >
                            <Edit size={12} /> Edit
                          </button>

                          <button
                            className="btn-xs btn-outline"
                            onClick={() => handleDeleteIpo(ipo.id, ipo.ipo_name)}
                            title="Delete IPO entry"
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p>No matching IPO entries found in database.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit IPO Modal */}
      {isModalOpen && (
        <AddIpoModal
          isOpen={isModalOpen}
          ipoToEdit={editingIpo}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIpo(null);
          }}
          onSuccess={() => {
            showToast(editingIpo ? 'IPO parameters updated' : 'New IPO published to database', 'success');
            loadIpos();
            setIsModalOpen(false);
            setEditingIpo(null);
          }}
        />
      )}

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

    </div>
  );
}
