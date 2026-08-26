import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart3,
  X,
  Zap,
  Tag,
  Handshake,
  AlertCircle
} from 'lucide-react';
import { supabase, fetchLiveIpos, subscribeToRealtimeChanges, updateIpoListingStatus } from '../services/db.js';
import AddIpoModal from '../components/AddIpoModal.jsx';
import PreListingExitModal from '../components/PreListingExitModal.jsx';
import Pagination from '../components/Pagination.jsx';
import ActionDropdown from '../components/ActionDropdown.jsx';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function IpoMaster() {
  const { showToast, showConfirm } = useToast();
  const [ipos, setIpos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipoking_cache_ipos')) || []; } catch(e) { return []; }
  });
  const [loading, setLoading] = useState(() => !ipos || ipos.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState(null);
  const [listingModalIpo, setListingModalIpo] = useState(null);
  const [customListingPrice, setCustomListingPrice] = useState('');
  const [preListingExitIpo, setPreListingExitIpo] = useState(null);

  // Pagination-2 State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadIpos = async (force = false) => {
    if (!ipos || ipos.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchLiveIpos(force);
      setIpos(data || []);
    } catch (err) {
      console.error('Error fetching IPO Master catalog:', err);
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

    try {
      await updateIpoListingStatus(listingModalIpo.id, price);

      showToast(`Listing price recorded for ${listingModalIpo.ipo_name}`, 'success');
      setListingModalIpo(null);
      setCustomListingPrice('');
      loadIpos(true);
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

  const filteredIpos = useMemo(() => {
    return ipos.filter(ipo => {
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
  }, [ipos, activeFilter, searchQuery]);

  // Paginated IPO list
  const paginatedIpos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIpos.slice(start, start + pageSize);
  }, [filteredIpos, currentPage, pageSize]);

  const totalCount = ipos.length;
  const openCount = ipos.filter(i => String(i.status).toLowerCase() === 'open').length;
  const upcomingCount = ipos.filter(i => String(i.status).toLowerCase() === 'upcoming').length;
  const listedCount = ipos.filter(i => String(i.status).toLowerCase() === 'listed').length;

  return (
    <div className="page-content" style={{ padding: '0' }}>

      {/* Top Banner Header (Hero-11) */}
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
              IPO Master Catalog
            </h1>
            <span className="badge badge-teal">
              {totalCount} Offerings
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Real-time NSE/BSE IPO offerings, price bands, GMP valuations, and listing engine.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadIpos(true)}
            title="Refresh Database Data"
            style={{ padding: '9px 14px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateClick}
            style={{ padding: '9px 18px' }}
          >
            <Plus size={16} /> New IPO
          </button>
        </div>
      </div>

      {/* KPI Stats Bar (Hero-11) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Catalog IPOs</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>{totalCount}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tracked in Database</span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Open For Bidding</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--success-text)', margin: '8px 0 4px 0' }}>{openCount}</h3>
          <span style={{ fontSize: '12px', color: 'var(--success-text)', fontWeight: 600 }}>Active Investor Bids</span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Upcoming Pipeline</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--brand-accent)', margin: '8px 0 4px 0' }}>{upcomingCount}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opening Soon</span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Listed on Exchanges</span>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--warning)', margin: '8px 0 4px 0' }}>{listedCount}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Listing Gains Distributed</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
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
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {['All', 'Open', 'Upcoming', 'Listed', 'Closed', 'Mainboard', 'SME Board'].map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveFilter(tab);
                  setCurrentPage(1);
                }}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '13px'
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by IPO or symbol..."
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

      {/* Main IPO Data Table (Hero-11 Fintech Table) */}
      <div className="table-container">
        <table className="fintech-table">
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
              <th style={{ textAlign: 'center' }}>Actions</th>
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
            ) : paginatedIpos.length > 0 ? (
              paginatedIpos.map((ipo) => {
                const minP = Number(ipo.price_band_min) || 0;
                const maxP = Number(ipo.price_band_max) || minP;
                const lot = Number(ipo.lot_size) || 1;
                const minRetail = maxP * lot;
                const isListed = String(ipo.status).toLowerCase() === 'listed';

                return (
                  <tr key={ipo.id || ipo.ipo_name}>
                    <td>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{ipo.ipo_name}</strong>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{ipo.company_name || ipo.symbol || 'NSE / BSE'}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ipo.ipo_type === 'SME' ? 'badge-purple' : 'badge-teal'}`}>
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
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {ipo.subscription_open_date || ipo.open_date || 'Open'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-success" style={{ gap: '4px' }}>
                        <TrendingUp size={12} /> {ipo.gain_est || '+₹150/sh Est.'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isListed ? 'badge-success' : 'badge-teal'}`}>
                        {String(ipo.status).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {/* Watermelon Dropdown-Menu-4 for IPO Actions */}
                      <ActionDropdown
                        items={[
                          {
                            icon: Zap,
                            label: ipo.exit_mode && ipo.exit_mode !== 'MARKET' ? `Exit (${ipo.exit_mode})` : 'Pre-Listing Exit',
                            description: 'Configure Kostak or Sauda rates',
                            onClick: () => setPreListingExitIpo(ipo)
                          },
                          ...(!isListed ? [{
                            icon: TrendingUp,
                            label: 'Mark Listed',
                            description: 'Record stock listing price',
                            onClick: () => {
                              setListingModalIpo(ipo);
                              setCustomListingPrice(String(maxP));
                            }
                          }] : []),
                          ...(ipo.allotment_url ? [{
                            icon: ExternalLink,
                            label: 'Registrar Allotment',
                            description: 'Check allotment on registrar',
                            onClick: () => window.open(ipo.allotment_url, '_blank')
                          }] : []),
                          {
                            icon: Edit,
                            label: 'Edit Parameters',
                            description: 'Modify price band, dates, lot',
                            onClick: () => handleEditClick(ipo)
                          },
                          {
                            type: 'separator'
                          },
                          {
                            icon: Trash2,
                            label: 'Delete IPO',
                            description: 'Permanently remove from catalog',
                            variant: 'destructive',
                            onClick: () => handleDeleteIpo(ipo.id, ipo.ipo_name)
                          }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No matching IPO entries found in database.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Watermelon Pagination-2 Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredIpos.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
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

      {/* Pre-Listing Exit & Grey Market Sale Modal */}
      {preListingExitIpo && (
        <PreListingExitModal
          isOpen={Boolean(preListingExitIpo)}
          targetIpo={preListingExitIpo}
          ipos={ipos}
          onClose={() => setPreListingExitIpo(null)}
          onSuccess={() => {
            setPreListingExitIpo(null);
            loadIpos(true);
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
                  placeholder="e.g. 565"
                  value={customListingPrice}
                  onChange={(e) => setCustomListingPrice(e.target.value)}
                  style={{ height: '42px', fontSize: '16px', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setListingModalIpo(null)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Save Listing Gain</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
