import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addToast = useCallback((title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    // In local development, use window.location.origin (proxied by Vite to Flask backend)
    // In production on Vercel, connect directly to the live Render backend service to avoid Vercel CDN 400 WebSocket handshake limitations
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'https://spms-backend-jt6l.onrender.com');

    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('⚡ SPMS WebSocket Connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    // In-app real-time notification
    socketInstance.on('notification', (notif) => {
      addToast(notif.title, notif.message, notif.type || 'info');
      setUnreadCount((c) => c + 1);
    });

    // Public placement celebration ticker
    socketInstance.on('placement_celebration', (data) => {
      addToast(
        'Campus Placement Alert! 🎓',
        `${data.student_name} (${data.department_code}) placed at ${data.company_name} with ${data.package_lpa} LPA!`,
        'success'
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [addToast]);

  // Join rooms when user state changes
  useEffect(() => {
    if (socket && connected && isAuthenticated && user) {
      socket.emit('join', {
        user_id: user.user_id,
        role: user.role,
      });
    }
  }, [socket, connected, isAuthenticated, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        toasts,
        addToast,
        removeToast,
        unreadCount,
        setUnreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

