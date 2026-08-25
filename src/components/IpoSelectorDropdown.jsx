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
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)', label: 'LISTED' };
    }
    if (s === 'open' || s === 'active') {
      return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', border: 'rgba(37, 99, 235, 0.25)', label: 'OPEN' };
    }
    if (s === 'closed') {
      return { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748B', border: 'rgba(100, 116, 139, 0.25)', label: 'CLOSED' };
    }
    return { bg: 'rgba(217, 119, 6, 0.12)', color: '#D97706', border: 'rgba(217, 119, 6, 0.25)', label: (status || 'UPCOMING').toUpperCase() };
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', marginBottom: '24px' }}>
      {/* Trigger Card Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel"
        style={{
          padding: '14px 20px',
          borderRadius: '16px',
          background: 'var(--card-bg, #FFFFFF)',
          border: '1.5px solid',
          borderColor: isOpen ? 'var(--primary, #2563EB)' : 'var(--panel-border, #E2E8F0)',
          boxShadow: isOpen ? '0 8px 24px rgba(37, 99, 235, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.2s ease',
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
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
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
                  ? 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)'
                  : 'linear-gradient(135deg, #047857 0%, #10B981 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 800,
                fontSize: '1.15rem',
                fontFamily: 'Manrope',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              {(activeIpo?.ipo_name || 'I')[0].toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--primary, #2563EB)'
                }}
              >
                Selected Offering Filter
              </span>
              {selectedIpoId !== 'All' && activeIpo && (
                <>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: activeIpo.ipo_type === 'SME' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                      color: activeIpo.ipo_type === 'SME' ? '#7C3AED' : '#2563EB'
                    }}
                  >
                    {activeIpo.ipo_type || 'Mainboard'}
                  </span>
                  {(() => {
                    const st = getStatusBadgeStyle(activeIpo.status);
                    return (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 7px',
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
                  fontSize: '1.08rem',
                  fontWeight: 800,
                  color: 'var(--text-main, #0F172A)',
                  fontFamily: 'Manrope',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {selectedIpoId === 'All' ? 'All IPO Offerings Ledger' : activeIpo?.ipo_name || 'Select IPO'}
              </h3>

              {selectedIpoId === 'All' ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748B)' }}>
                  ({ipos.length} IPO Offerings Tracked)
                </span>
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748B)' }}>
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
              background: 'var(--input-bg, #F1F5F9)',
              color: 'var(--text-main, #0F172A)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span style={{ color: 'var(--primary, #2563EB)' }}>●</span>
            {selectedIpoId === 'All' ? `${totalAllApps} Applications Total` : `${getAppCountForIpo(selectedIpoId)} Applications`}
          </span>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isOpen ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: isOpen ? 'var(--primary, #2563EB)' : 'var(--text-muted, #64748B)',
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

      {/* Popover Menu Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--card-bg, #FFFFFF)',
            borderRadius: '18px',
            border: '1.5px solid var(--panel-border, #E2E8F0)',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
            padding: '12px',
            maxHeight: '420px',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out'
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
                color: 'var(--text-dim, #94A3B8)'
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
                fontSize: '0.84rem',
                borderRadius: '10px',
                background: 'var(--input-bg, #F8FAFC)',
                border: '1px solid var(--panel-border, #E2E8F0)'
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
                  color: 'var(--text-dim, #94A3B8)',
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
                  background: selectedIpoId === 'All' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                  border: '1.5px solid',
                  borderColor: selectedIpoId === 'All' ? 'var(--primary, #2563EB)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedIpoId !== 'All') e.currentTarget.style.background = 'var(--input-bg, #F8FAFC)';
                }}
                onMouseLeave={(e) => {
                  if (selectedIpoId !== 'All') e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main, #0F172A)' }}>
                      All IPO Offerings Ledger
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)' }}>
                      Show all customer applications across {ipos.length} IPO offerings
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'var(--input-bg, #F1F5F9)',
                      color: 'var(--text-main, #0F172A)'
                    }}
                  >
                    {totalAllApps} Total Bids
                  </span>
                  {selectedIpoId === 'All' && <Check size={18} style={{ color: 'var(--primary, #2563EB)', strokeWidth: 3 }} />}
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
                    background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                    border: '1.5px solid',
                    borderColor: isSelected ? 'var(--primary, #2563EB)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--input-bg, #F8FAFC)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: ipo.ipo_type === 'SME'
                          ? 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)'
                          : 'linear-gradient(135deg, #047857 0%, #10B981 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: '1rem',
                        fontFamily: 'Manrope'
                      }}
                    >
                      {(ipo.ipo_name || 'I')[0].toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main, #0F172A)' }}>
                          {ipo.ipo_name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: ipo.ipo_type === 'SME' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                            color: ipo.ipo_type === 'SME' ? '#7C3AED' : '#2563EB'
                          }}
                        >
                          {ipo.ipo_type || 'Mainboard'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`
                          }}
                        >
                          ● {st.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
                        Price: <strong>₹{minP} - ₹{maxP}</strong> • Lot: <strong>{lot} sh</strong> • Min: ₹{(maxP * lot).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--input-bg, #F1F5F9)',
                        color: 'var(--text-main, #0F172A)'
                      }}
                    >
                      {appCount} Bids
                    </span>
                    {isSelected && <Check size={18} style={{ color: 'var(--primary, #2563EB)', strokeWidth: 3 }} />}
                  </div>
                </div>
              );
            })}

            {filteredIpos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted, #64748B)', fontSize: '0.86rem' }}>
                No IPOs match "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
