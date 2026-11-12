import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Modal } from '../../components/Modal';
import { Building2, Globe, Mail, Phone, Plus, Search, ExternalLink, Briefcase, Users } from 'lucide-react';

export function CompaniesList() {
  const { isAdmin } = useAuth();
  const { addToast } = useSocket();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Company modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newComp, setNewComp] = useState({
    company_name: '',
    industry: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    company_description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanies(search ? `search=${search}` : '');
      if (res.success) {
        setCompanies(res.companies);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createCompany(newComp);
      if (res.success) {
        addToast('Company Registered', res.message, 'success');
        setShowAddModal(false);
        setNewComp({
          company_name: '',
          industry: '',
          website: '',
          contact_email: '',
          contact_phone: '',
          company_description: '',
        });
        fetchCompanies();
      }
    } catch (err) {
      addToast('Error', err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem',
        }}
      >
        <div style={{ position: 'relative', minWidth: 280 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-control-custom"
            placeholder="Search companies or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {isAdmin && (
          <button className="btn-primary-gradient" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Register Recruiting Partner
          </button>
        )}
      </div>

      {/* Companies Grid */}
      <div className="grid-cols-2">
        {loading ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem' }}>
            Loading recruiting partners...
          </div>
        ) : companies.length === 0 ? (
          <div className="glass-card empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">
              <Building2 size={48} />
            </div>
            <h3>No Companies Registered</h3>
            <p>No corporate recruiters currently match your query.</p>
          </div>
        ) : (
          companies.map((comp) => (
            <div key={comp.company_id} className="glass-card fade-in-item" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-gradient)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                    }}
                  >
                    {comp.company_name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                      {comp.company_name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                      {comp.industry || 'Technology & Services'}
                    </span>
                  </div>
                </div>

                {comp.website && (
                  <a
                    href={comp.website}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary-custom"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                  >
                    <Globe size={13} />
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5, margin: 0 }}>
                {comp.company_description || 'Active campus recruitment partner.'}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-glass)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                  <span>
                    Jobs Posted: <strong style={{ color: '#fff' }}>{comp.total_jobs || 0}</strong>
                  </span>
                  <span>
                    Hires: <strong style={{ color: '#34d399' }}>{comp.total_hires || 0}</strong>
                  </span>
                </div>

                {comp.contact_email && (
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Mail size={13} /> {comp.contact_email}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Partner Company Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Recruiting Partner"
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button className="btn-primary-gradient" onClick={handleAddCompany} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Company'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label-custom">Company Name *</label>
            <input
              type="text"
              className="form-control-custom"
              value={newComp.company_name}
              onChange={(e) => setNewComp({ ...newComp, company_name: e.target.value })}
              placeholder="e.g. Adobe India"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Industry / Sector</label>
              <input
                type="text"
                className="form-control-custom"
                value={newComp.industry}
                onChange={(e) => setNewComp({ ...newComp, industry: e.target.value })}
                placeholder="Software / Cloud / FinTech"
              />
            </div>
            <div>
              <label className="form-label-custom">Corporate Website</label>
              <input
                type="url"
                className="form-control-custom"
                value={newComp.website}
                onChange={(e) => setNewComp({ ...newComp, website: e.target.value })}
                placeholder="https://adobe.com"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">HR / Campus Email</label>
              <input
                type="email"
                className="form-control-custom"
                value={newComp.contact_email}
                onChange={(e) => setNewComp({ ...newComp, contact_email: e.target.value })}
                placeholder="campus@company.com"
              />
            </div>
            <div>
              <label className="form-label-custom">Contact Phone</label>
              <input
                type="text"
                className="form-control-custom"
                value={newComp.contact_phone}
                onChange={(e) => setNewComp({ ...newComp, contact_phone: e.target.value })}
                placeholder="+91 80 1234 5678"
              />
            </div>
          </div>

          <div>
            <label className="form-label-custom">Description & Overview</label>
            <textarea
              className="form-control-custom"
              rows="3"
              value={newComp.company_description}
              onChange={(e) => setNewComp({ ...newComp, company_description: e.target.value })}
              placeholder="Company profile and tech areas..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

