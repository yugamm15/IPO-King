import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Trash2 } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmModalState, setConfirmModalState] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback(({ title = 'Are you sure?', message, confirmText = 'Confirm', danger = true, onConfirm }) => {
    return new Promise((resolve) => {
      setConfirmModalState({
        title,
        message,
        confirmText,
        danger,
        onConfirm: () => {
          setConfirmModalState(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmModalState(null);
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Floating Toast Stack - Right Aligned & Fit Content Width */}
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-panel"
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justify: 'space-between',
              gap: '12px',
              width: 'fit-content',
              maxWidth: '440px',
              background:
                t.type === 'success'
                  ? 'rgba(5, 150, 105, 0.95)'
                  : t.type === 'error'
                  ? 'rgba(220, 38, 38, 0.95)'
                  : t.type === 'warning'
                  ? 'rgba(217, 119, 6, 0.95)'
                  : 'rgba(37, 99, 235, 0.95)',
              color: '#FFFFFF',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.22)',
              backdropFilter: 'blur(12px)',
              pointerEvents: 'auto',
              fontSize: '0.86rem',
              fontWeight: 500,
              animation: 'toast-slide-in 0.25s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              {t.type === 'success' && <CheckCircle2 size={16} style={{ flexShrink: 0 }} />}
              {t.type === 'error' && <AlertCircle size={16} style={{ flexShrink: 0 }} />}
              {t.type === 'warning' && <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
              {t.type === 'info' && <Info size={16} style={{ flexShrink: 0 }} />}
              <span>{t.message}</span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.85)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justify: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Destructive Action Confirm Modal */}
      {confirmModalState && (
        <div className="modal-backdrop" onClick={confirmModalState.onCancel} style={{ zIndex: 999999 }}>
          <div
            className="modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '90vw',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: confirmModalState.danger ? 'rgba(220, 38, 38, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                color: confirmModalState.danger ? 'var(--danger)' : 'var(--primary)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px'
              }}
            >
              {confirmModalState.danger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {confirmModalState.title}
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {confirmModalState.message}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={confirmModalState.onCancel}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 500 }}
              >
                Cancel
              </button>

              <button
                className="btn"
                onClick={confirmModalState.onConfirm}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  background: confirmModalState.danger ? 'var(--danger)' : 'var(--primary)',
                  color: '#FFFFFF'
                }}
              >
                {confirmModalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
