'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'urgent';
}

interface ToastContextType {
  showToast: (message: string, type: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === 'urgent' ? 10000 : 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={styles.container}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...styles.toast, ...styles[toast.type] }}>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} style={styles.closeBtn}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  toast: {
    padding: '16px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '300px',
    maxWidth: '500px',
    animation: 'slideIn 0.3s ease',
    color: '#fff',
    fontSize: '14px',
  },
  info: {
    backgroundColor: '#3b82f6',
  },
  success: {
    backgroundColor: '#22c55e',
  },
  error: {
    backgroundColor: '#ef4444',
  },
  urgent: {
    backgroundColor: '#dc2626',
    border: '2px solid #fbbf24',
    fontWeight: 'bold',
    animation: 'pulse 1s infinite, slideIn 0.3s ease',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); }
      50% { box-shadow: 0 4px 20px rgba(251, 191, 36, 0.6); }
    }
  `;
  document.head.appendChild(styleSheet);
}