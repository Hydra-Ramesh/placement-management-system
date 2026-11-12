import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '600px' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content-custom"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-custom">
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignitems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>{children}</div>

        {footer && <div className="modal-footer-custom">{footer}</div>}
      </div>
    </div>
  );
}

