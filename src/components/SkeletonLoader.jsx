import React from 'react';

export function SkeletonText({ width = '100%', height = '14px', style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="skeleton skeleton-avatar" style={{ borderRadius: '12px' }} />
        <div style={{ flex: 1 }}>
          <SkeletonText width="40%" height="12px" style={{ marginBottom: '8px' }} />
          <SkeletonText width="65%" height="24px" style={{ marginBottom: '6px' }} />
          <SkeletonText width="30%" height="10px" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '14px' }}>
          <SkeletonText width={i === 0 ? '75%' : i === 1 ? '90%' : '50%'} height="14px" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <SkeletonText width="40px" height="40px" style={{ borderRadius: '12px' }} />
            <SkeletonText width="70px" height="20px" style={{ borderRadius: '12px' }} />
          </div>
          <SkeletonText width="70%" height="20px" style={{ marginBottom: '10px' }} />
          <SkeletonText width="90%" height="14px" style={{ marginBottom: '8px' }} />
          <SkeletonText width="60%" height="14px" style={{ marginBottom: '20px' }} />
          <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--panel-border)' }}>
            <SkeletonText width="100%" height="36px" style={{ borderRadius: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
