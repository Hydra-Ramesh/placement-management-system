import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        if (res.user.role === 'Admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/jobs');
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '2.5rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            className="brand-logo-icon"
            style={{ width: 56, height: 56, margin: '0 auto 1rem auto', fontSize: '1.6rem' }}
          >
            <GraduationCap size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Sign in to access your SPMS placement portal
          </p>
        </div>

        {error && (
          <div className="alert-custom alert-danger">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="form-label-custom">Username or Institutional Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control-custom"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label-custom">Password</label>
            <input
              type="password"
              className="form-control-custom"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary-gradient"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
            Pre-Seeded Demo Accounts
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary-custom"
              style={{ flex: 1, fontSize: '0.78rem', justifyContent: 'center', padding: '0.5rem' }}
              onClick={() => setDemoCredentials('admin', 'admin123')}
            >
              Admin / TPO
            </button>
            <button
              type="button"
              className="btn-secondary-custom"
              style={{ flex: 1, fontSize: '0.78rem', justifyContent: 'center', padding: '0.5rem' }}
              onClick={() => setDemoCredentials('aarav.sharma', 'student123')}
            >
              Student (Aarav)
            </button>
            <button
              type="button"
              className="btn-secondary-custom"
              style={{ flex: 1, fontSize: '0.78rem', justifyContent: 'center', padding: '0.5rem' }}
              onClick={() => setDemoCredentials('rohan.verma', 'student123')}
            >
              Student (Rohan)
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          New student?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Create student profile
          </Link>
        </div>
      </div>
    </div>
  );
}

