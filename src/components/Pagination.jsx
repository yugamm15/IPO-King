import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination Component matching Watermelon UI (pagination-2.json)
 * Enhanced with rows-per-page selector, total items counter, and page range logic.
 */
export default function Pagination({
    currentPage = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    className = ''
}) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(totalItems, currentPage * pageSize);

    // Calculate visible page buttons (max 5 buttons visible with ellipsis)
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className={`pagination-2-wrap ${className}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderTop: '1px solid var(--panel-border)',
            flexWrap: 'wrap',
            gap: '14px'
        }}>
            {/* Left: Range and total counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Showing <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{startItem}-{endItem}</strong> of <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{totalItems}</strong> entries
                </span>

                {onPageSizeChange && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid var(--input-border)',
                                background: 'var(--panel-bg)',
                                color: 'var(--text-main)',
                                fontSize: '12px',
                                fontWeight: 600,
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {pageSizeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Right: Page Navigation (Watermelon Pagination-2) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Previous Button */}
                <button
                    type="button"
                    aria-label="Previous Page"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="pagination-2-btn"
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Page Number Buttons */}
                {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                        return (
                            <span
                                key={`ellipsis-${index}`}
                                style={{
                                    width: '32px',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: '14px',
                                    fontWeight: 600
                                }}
                            >
                                ...
                            </span>
                        );
                    }

                    const isActive = page === currentPage;
                    return (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={`pagination-2-btn ${isActive ? 'active' : ''}`}
                            aria-label={`Page ${page}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {page}
                        </button>
                    );
                })}

                {/* Next Button */}
                <button
                    type="button"
                    aria-label="Next Page"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-2-btn"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
