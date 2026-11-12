import React from 'react';
import { useSocket } from '../context/SocketContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useSocket();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} color="var(--success)" />;
      case 'warning':
        return <AlertTriangle size={20} color="var(--warning)" />;
      case 'danger':
        return <AlertCircle size={20} color="var(--danger)" />;
      default:
        return <Info size={20} color="var(--info)" />;
    }
  };

  if (!toasts.length) return null;

  return (
    <div className="spms-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`spms-toast spms-toast-${toast.type || 'info'}`}>
          <div style={{ marginTop: 2 }}>{getIcon(toast.type)}</div>
          <div style={{ flex: 1, paddingRight: '0.5rem' }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
              {toast.title}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.4 }}>
              {toast.message}
            </div>
          </div>
          <button className="spms-toast-close" onClick={() => removeToast(toast.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

