import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * ActionDropdown component matching Watermelon UI (dropdown-menu-4.json)
 * - Renders in a React Portal to escape any table/container clipping or overflow
 * - Intelligently auto-flips upwards when near the bottom of viewport/table
 * - Dynamically pins coordinates on scroll and resize
 * - Fully accessible with Escape key and outside-click dismissal
 */
export default function ActionDropdown({
    trigger,
    items = [],
    align = 'end',
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [positionStyle, setPositionStyle] = useState({});
    const [placement, setPlacement] = useState('bottom');
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    // Compute exact position and auto-flip logic
    const calculatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Estimate menu height based on items (approx 56px per action item + 16px padding)
        const estimatedHeight = menuRef.current ? menuRef.current.offsetHeight : Math.min(items.length * 56 + 24, 360);

        // Determine vertical placement: Flip upwards if insufficient room below (< 280px) and more room above (> 160px)
        const shouldOpenUp = (spaceBelow < 280 && spaceAbove > 160) || (spaceBelow < estimatedHeight + 16 && spaceAbove > spaceBelow);
        const activePlacement = shouldOpenUp ? 'top' : 'bottom';
        setPlacement(activePlacement);

        const newStyle = {
            position: 'fixed',
            zIndex: 99999,
            minWidth: '230px',
            maxWidth: '320px'
        };

        if (shouldOpenUp) {
            newStyle.bottom = `${viewportHeight - rect.top + 6}px`;
            newStyle.top = 'auto';
            newStyle.maxHeight = `${Math.max(160, spaceAbove - 20)}px`;
        } else {
            newStyle.top = `${rect.bottom + 6}px`;
            newStyle.bottom = 'auto';
            newStyle.maxHeight = `${Math.max(160, spaceBelow - 20)}px`;
        }

        // Horizontal alignment
        if (align === 'end') {
            const rightDistance = viewportWidth - rect.right;
            // Prevent overflowing left edge if viewport is narrow
            const safeRight = Math.max(10, Math.min(rightDistance, viewportWidth - 245));
            newStyle.right = `${safeRight}px`;
            newStyle.left = 'auto';
        } else {
            const safeLeft = Math.max(10, Math.min(rect.left, viewportWidth - 245));
            newStyle.left = `${safeLeft}px`;
            newStyle.right = 'auto';
        }

        setPositionStyle(newStyle);
    }, [align, items.length]);

    // Recalculate position on open
    useLayoutEffect(() => {
        if (isOpen) {
            calculatePosition();
        }
    }, [isOpen, calculatePosition]);

    // Handle outside clicks, ESC, scroll & resize
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) {
                calculatePosition();
            }
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, calculatePosition]);

    const handleToggle = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isOpen) {
            calculatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className={`action-dropdown-wrapper ${className}`} style={{ display: 'inline-block', position: 'relative' }}>
            {/* Custom or Default Trigger Button */}
            <div ref={triggerRef} onClick={handleToggle} style={{ display: 'inline-flex' }}>
                {trigger ? (
                    <div style={{ cursor: 'pointer' }}>
                        {trigger}
                    </div>
                ) : (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px',
                            height: '32px'
                        }}
                        aria-label="Open Actions Menu"
                    >
                        <MoreVertical size={16} />
                    </button>
                )}
            </div>

            {/* Floating Dropdown Card via Portal (Never Clipped by Tables or Containers) */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    data-placement={placement}
                    className="dropdown-menu-4-card"
                    style={{
                        ...positionStyle,
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {items.map((item, idx) => {
                        if (item.type === 'separator') {
                            return <div key={`sep-${idx}`} className="dropdown-menu-4-separator" />;
                        }

                        const isDanger = item.variant === 'destructive' || item.isDanger;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.key || idx}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    if (item.onClick) item.onClick();
                                }}
                                disabled={item.disabled}
                                className={`dropdown-menu-4-item ${isDanger ? 'danger' : ''}`}
                                style={{
                                    opacity: item.disabled ? 0.4 : 1,
                                    cursor: item.disabled ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {Icon && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isDanger ? 'var(--danger)' : 'var(--brand-accent)',
                                        flexShrink: 0
                                    }}>
                                        <Icon size={16} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, flex: 1 }}>
                                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: isDanger ? 'var(--danger)' : 'var(--text-main)', lineHeight: '1.25' }}>
                                        {item.label}
                                    </span>
                                    {item.description && (
                                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.2' }}>
                                            {item.description}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}
