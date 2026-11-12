import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { GraduationCap, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    roll_number: '',
    first_name: '',
    last_name: '',
    department_id: '',
    graduation_year: '2026',
    cgpa: '',
    backlogs: '0',
    phone: '',
  });

  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await api.getDepartments();
        if (res.success) {
          setDepartments(res.departments);
          if (res.departments.length > 0) {
            setFormData((f) => ({ ...f, department_id: res.departments[0].department_id }));
          }
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    }
    loadDepts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const cgpaVal = parseFloat(formData.cgpa);
    if (isNaN(cgpaVal) || cgpaVal < 0 || cgpaVal > 10) {
      setError('CGPA must be a valid number between 0.00 and 10.00.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(formData);
      if (res.success) {
        navigate('/jobs');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 680,
          padding: '2.5rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            className="brand-logo-icon"
            style={{ width: 52, height: 52, margin: '0 auto 1rem auto' }}
          >
            <GraduationCap size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
            Create Student Profile
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Register your credentials to browse jobs and track campus placement drives
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
          {/* Account Credentials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Username *</label>
              <input
                type="text"
                name="username"
                className="form-control-custom"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. aryan.kapoor"
                required
              />
            </div>
            <div>
              <label className="form-label-custom">College Email *</label>
              <input
                type="email"
                name="email"
                className="form-control-custom"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@college.edu"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Password *</label>
              <input
                type="password"
                name="password"
                className="form-control-custom"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                className="form-control-custom"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          {/* Academic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Roll Number *</label>
              <input
                type="text"
                name="roll_number"
                className="form-control-custom"
                value={formData.roll_number}
                onChange={handleChange}
                placeholder="21CS099"
                required
              />
            </div>
            <div>
              <label className="form-label-custom">First Name *</label>
              <input
                type="text"
                name="first_name"
                className="form-control-custom"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Last Name *</label>
              <input
                type="text"
                name="last_name"
                className="form-control-custom"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Academic Department *</label>
              <select
                name="department_id"
                className="form-control-custom"
                value={formData.department_id}
                onChange={handleChange}
                required
              >
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-custom">Graduation Year *</label>
              <select
                name="graduation_year"
                className="form-control-custom"
                value={formData.graduation_year}
                onChange={handleChange}
                required
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Current CGPA (0-10) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                name="cgpa"
                className="form-control-custom"
                value={formData.cgpa}
                onChange={handleChange}
                placeholder="e.g. 8.65"
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Active Backlogs *</label>
              <input
                type="number"
                min="0"
                name="backlogs"
                className="form-control-custom"
                value={formData.backlogs}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="form-control-custom"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-gradient"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

