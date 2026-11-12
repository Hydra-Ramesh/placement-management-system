import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { Bell, Check, Wifi, WifiOff } from 'lucide-react';

export function Navbar({ title, subtitle }) {
  const { user } = useAuth();
  const { connected, unreadCount, setUnreadCount } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await api.getNotifications();
        if (res.success) {
          setNotifications(res.notifications);
          const unread = res.notifications.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    fetchNotifications();
  }, [setUnreadCount]);

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  return (
    <header className="topbar">
      <div className="page-title-group">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="topbar-actions">
        {/* Real-time WebSocket connection status badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: connected ? '#34d399' : '#fbbf24',
            border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
          title={connected ? 'Connected to live real-time WebSocket hub' : 'Reconnecting to WebSockets...'}
        >
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{connected ? 'Live WS' : 'Offline'}</span>
        </div>

        {/* In-app Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="notification-menu">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-glass)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>
                  Live Notifications
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ padding: '0.5rem 0' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.notification_id}
                      style={{
                        padding: '0.85rem 1.25rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.06)',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary)',
                            }}
                          />
                        )}
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="user-profile-badge">
          <div className="user-avatar">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="user-meta-name">{user?.username}</div>
            <div className="user-meta-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

