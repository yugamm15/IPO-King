import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  ChevronDown,
  Globe,
  Check,
  Search,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';

/**
 * Custom IPO Selector Dropdown styled with Hero-11 Luxury Theme
 */
export default function IpoSelectorDropdown({
  ipos = [],
  selectedIpoId = 'All',
  onSelectIpo,
  applications = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute applications count per IPO
  const getAppCountForIpo = (ipoId) => {
    return applications.filter(
      (a) => String(a.ipo_id) === String(ipoId) || String(a.ipo_name).toLowerCase() === String(ipos.find((i) => String(i.id) === String(ipoId))?.ipo_name).toLowerCase()
    ).length;
  };

  const totalAllApps = applications.length;
  const activeIpo = selectedIpoId !== 'All' ? ipos.find((i) => String(i.id) === String(selectedIpoId)) : null;

  // Filter IPOs in dropdown search
  const filteredIpos = ipos.filter((ipo) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (ipo.ipo_name || '').toLowerCase().includes(q) ||
      (ipo.company_name || '').toLowerCase().includes(q) ||
      (ipo.ipo_type || '').toLowerCase().includes(q) ||
      (ipo.status || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadgeStyle = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'listed') {
      return { bg: 'var(--success-light)', color: 'var(--success-text)', border: 'rgba(5, 150, 105, 0.2)', label: 'LISTED' };
    }
    if (s === 'open' || s === 'active') {
      return { bg: 'rgba(13, 148, 136, 0.1)', color: 'var(--brand-accent)', border: 'rgba(13, 148, 136, 0.25)', label: 'OPEN' };
    }
    if (s === 'closed') {
      return { bg: 'rgba(4, 47, 46, 0.06)', color: 'var(--text-muted)', border: 'var(--panel-border)', label: 'CLOSED' };
    }
    return { bg: 'var(--warning-light)', color: 'var(--warning)', border: 'rgba(217, 119, 6, 0.2)', label: (status || 'UPCOMING').toUpperCase() };
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Card Button (Hero-11) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '16px 20px',
          borderRadius: '18px',
          background: 'var(--panel-bg)',
          border: '1.5px solid',
          borderColor: isOpen ? 'var(--primary)' : 'var(--panel-border)',
          boxShadow: isOpen ? 'var(--panel-shadow-hover)' : 'var(--panel-shadow)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none'
        }}
      >
        {/* Left: Icon and IPO Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          {selectedIpoId === 'All' ? (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--primary)',
                color: '#FAF6EC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(4, 47, 46, 0.2)'
              }}
            >
              <Globe size={22} />
            </div>
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: activeIpo?.ipo_type === 'SME'
                  ? 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)'
                  : 'linear-gradient(135deg, #042F2E 0%, #0D9488 100%)',
                color: '#FAF6EC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 800,
                fontSize: '1.15rem',
                fontFamily: 'var(--font-heading)'
              }}
            >
              {(activeIpo?.ipo_name || 'I')[0].toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--brand-accent)'
                }}
              >
                Selected Offering Filter
              </span>
              {selectedIpoId !== 'All' && activeIpo && (
                <>
                  <span
                    className={`badge ${activeIpo.ipo_type === 'SME' ? 'badge-purple' : 'badge-teal'}`}
                    style={{ fontSize: '11px', padding: '1px 7px' }}
                  >
                    {activeIpo.ipo_type || 'Mainboard'}
                  </span>
                  {(() => {
                    const st = getStatusBadgeStyle(activeIpo.status);
                    return (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: '6px',
                          background: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`
                        }}
                      >
                        ● {st.label}
                      </span>
                    );
                  })()}
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {selectedIpoId === 'All' ? 'All IPO Offerings Ledger' : activeIpo?.ipo_name || 'Select IPO'}
              </h3>

              {selectedIpoId === 'All' ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  ({ipos.length} IPO Offerings Tracked)
                </span>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Issue: <strong>₹{activeIpo?.price_band_min || 0} - ₹{activeIpo?.price_band_max || 0}</strong> • Lot: <strong>{activeIpo?.lot_size || 1} sh</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Applications Count Badge & Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(4, 47, 46, 0.05)',
              color: 'var(--text-main)',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ color: 'var(--brand-accent)' }}>●</span>
            {selectedIpoId === 'All' ? `${totalAllApps} Applications Total` : `${getAppCountForIpo(selectedIpoId)} Applications`}
          </span>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isOpen ? 'rgba(4, 47, 46, 0.08)' : 'transparent',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Popover Menu Dropdown (Hero-11 + Watermelon Dropdown) */}
      {isOpen && (
        <div
          className="dropdown-menu-4-card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            borderRadius: '20px',
            padding: '12px',
            maxHeight: '440px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Quick Search inside Dropdown */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)'
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search IPOs by name, board, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingRight: '30px',
                height: '38px',
                fontSize: '13px',
                borderRadius: '10px'
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Option 1: ALL IPOs */}
            {(!searchQuery || 'all ipo offerings ledger'.includes(searchQuery.toLowerCase())) && (
              <div
                onClick={() => {
                  onSelectIpo('All');
                  setIsOpen(false);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: selectedIpoId === 'All' ? 'rgba(4, 47, 46, 0.06)' : 'transparent',
                  border: '1.5px solid',
                  borderColor: selectedIpoId === 'All' ? 'var(--primary)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--primary)',
                      color: '#FAF6EC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                      All IPO Offerings Ledger
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Show all customer applications across {ipos.length} IPO offerings
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(4, 47, 46, 0.05)',
                      color: 'var(--text-main)'
                    }}
                  >
                    {totalAllApps} Total Bids
                  </span>
                  {selectedIpoId === 'All' && <Check size={18} style={{ color: 'var(--primary)', strokeWidth: 3 }} />}
                </div>
              </div>
            )}

            {/* Individual IPO Options */}
            {filteredIpos.map((ipo) => {
              const isSelected = String(selectedIpoId) === String(ipo.id);
              const appCount = getAppCountForIpo(ipo.id);
              const st = getStatusBadgeStyle(ipo.status);
              const minP = Number(ipo.price_band_min) || 0;
              const maxP = Number(ipo.price_band_max) || minP;
              const lot = Number(ipo.lot_size) || 1;

              return (
                <div
                  key={ipo.id}
                  onClick={() => {
                    onSelectIpo(ipo.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(4, 47, 46, 0.06)' : 'transparent',
                    border: '1.5px solid',
                    borderColor: isSelected ? 'var(--primary)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: ipo.ipo_type === 'SME'
                          ? 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)'
                          : 'linear-gradient(135deg, #042F2E 0%, #0D9488 100%)',
                        color: '#FAF6EC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: '15px'
                      }}
                    >
                      {(ipo.ipo_name || 'I')[0].toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                          {ipo.ipo_name}
                        </span>
                        <span
                          className={`badge ${ipo.ipo_type === 'SME' ? 'badge-purple' : 'badge-teal'}`}
                          style={{ fontSize: '10.5px', padding: '1px 6px' }}
                        >
                          {ipo.ipo_type || 'Mainboard'}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '5px',
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`
                          }}
                        >
                          ● {st.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Price: <strong>₹{minP} - ₹{maxP}</strong> • Lot: <strong>{lot} sh</strong> • Min: ₹{(maxP * lot).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(4, 47, 46, 0.05)',
                        color: 'var(--text-main)'
                      }}
                    >
                      {appCount} Bids
                    </span>
                    {isSelected && <Check size={18} style={{ color: 'var(--primary)', strokeWidth: 3 }} />}
                  </div>
                </div>
              );
            })}

            {filteredIpos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No IPOs match "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
