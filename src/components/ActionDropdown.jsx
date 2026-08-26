import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

/**
 * ActionDropdown component matching Watermelon UI (dropdown-menu-4.json)
 * Displays rich multi-line actions with icons, titles, subtitles, and separators.
 */
export default function ActionDropdown({
    trigger,
    items = [],
    align = 'end',
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className={`action-dropdown-wrapper ${className}`} ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Custom or Default Trigger Button */}
            {trigger ? (
                <div onClick={() => setIsOpen(prev => !prev)} style={{ cursor: 'pointer' }}>
                    {trigger}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(prev => !prev)}
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

            {/* Floating Dropdown Card (Watermelon dropdown-menu-4) */}
            {isOpen && (
                <div
                    className="dropdown-menu-4-card"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        [align === 'end' ? 'right' : 'left']: 0,
                        minWidth: '230px',
                        zIndex: 200
                    }}
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
                                        color: isDanger ? 'var(--danger)' : 'var(--text-muted)',
                                        flexShrink: 0
                                    }}>
                                        <Icon size={16} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: isDanger ? 'var(--danger)' : 'var(--text-main)' }}>
                                        {item.label}
                                    </span>
                                    {item.description && (
                                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                            {item.description}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
