import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  AlertTriangle,
  ExternalLink,
  Search
} from 'lucide-react';

export function DocumentVerificationQueue() {
  const { addToast, socket } = useSocket();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Pending');
  const [search, setSearch] = useState('');

  // Selected document for verification modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [verifyAction, setVerifyAction] = useState('Verified');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.getAllDocuments();
      if (res.success) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      addToast('Error', 'Failed to fetch verification documents', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Listen to live WebSocket uploads
  useEffect(() => {
    if (!socket) return;
    const handleNewDoc = (newDoc) => {
      setDocuments((prev) => [newDoc, ...prev]);
      addToast('New Document Submitted', `${newDoc.student_name} uploaded a ${newDoc.document_type}`, 'info');
    };
    socket.on('document_uploaded', handleNewDoc);
    return () => socket.off('document_uploaded', handleNewDoc);
  }, [socket, addToast]);

  const handleOpenReview = (doc) => {
    setSelectedDoc(doc);
    setVerifyAction('Verified');
    setReviewNotes('');
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setSubmitting(true);
    try {
      const res = await api.verifyDocument(selectedDoc.document_id, verifyAction, reviewNotes);
      if (res.success) {
        addToast(
          'Verification Updated',
          `Document for ${selectedDoc.student_name} marked as ${verifyAction}.`,
          verifyAction === 'Verified' ? 'success' : 'warning'
        );
        // Update local state
        setDocuments((prev) =>
          prev.map((d) => (d.document_id === selectedDoc.document_id ? res.document : d))
        );
        setSelectedDoc(null);
      }
    } catch (err) {
      addToast('Action Failed', err.message || 'Error verifying document', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered list
  const filteredDocs = documents.filter((doc) => {
    const matchesFilter =
      activeFilter === 'All' ? true : doc.verification_status === activeFilter;
    const matchesSearch =
      (doc.student_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (doc.student_roll?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (doc.document_type?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (doc.company_name?.toLowerCase() || '').includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = documents.filter((d) => d.verification_status === 'Pending').length;
  const verifiedCount = documents.filter((d) => d.verification_status === 'Verified').length;
  const rejectedCount = documents.filter((d) => d.verification_status === 'Rejected').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Row */}
      <div className="grid-cols-4">
        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Pending Reviews</div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-trend" style={{ color: 'var(--warning)' }}>
              <Clock size={14} /> Action Required
            </div>
          </div>
          <div className="stat-icon warning">
            <Clock size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Verified & Approved</div>
            <div className="stat-value">{verifiedCount}</div>
            <div className="stat-trend" style={{ color: 'var(--success)' }}>
              <CheckCircle2 size={14} /> Candidates Qualified
            </div>
          </div>
          <div className="stat-icon success">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Revision Requested</div>
            <div className="stat-value">{rejectedCount}</div>
            <div className="stat-trend" style={{ color: 'var(--danger)' }}>
              <XCircle size={14} /> Incomplete / Rejected
            </div>
          </div>
          <div className="stat-icon danger">
            <XCircle size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Total Documents</div>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-trend" style={{ color: 'var(--info)' }}>
              <FileText size={14} /> Document Repository
            </div>
          </div>
          <div className="stat-icon info">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
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
        <div className="filter-chips-bar" style={{ margin: 0 }}>
          {['Pending', 'Verified', 'Rejected', 'All'].map((tab) => (
            <button
              key={tab}
              className={`filter-chip ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab === 'Pending' && <Clock size={12} style={{ marginRight: 4, display: 'inline' }} />}
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
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
            placeholder="Search student, roll, or doc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Student Candidate</th>
                <th>Department</th>
                <th>Document Type</th>
                <th>Application Target</th>
                <th>Verification Status</th>
                <th>Submission Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading verification documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No documents found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.document_id} className="fade-in-item">
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{doc.student_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {doc.student_roll}
                      </div>
                    </td>
                    <td>
                      <span className="badge-custom badge-applied">{doc.department_code || 'General'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                        <FileText size={15} color="var(--primary)" />
                        <span>{doc.document_type}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.file_name}</div>
                    </td>
                    <td>
                      {doc.job_title ? (
                        <>
                          <div style={{ color: '#fff', fontSize: '0.85rem' }}>{doc.job_title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {doc.company_name}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Profile Asset</span>
                      )}
                    </td>
                    <td>
                      <Badge status={doc.verification_status} />
                      {doc.verification_notes && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem',
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={doc.verification_notes}
                        >
                          Notes: {doc.verification_notes}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-primary-gradient"
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                        onClick={() => handleOpenReview(doc)}
                      >
                        <FileCheck2 size={15} />
                        Review & Verify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Review & Verification Modal */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={`Review & Verify: ${selectedDoc?.document_type}`}
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setSelectedDoc(null)}>
              Cancel
            </button>
            <button
              className="btn-primary-gradient"
              onClick={handleSubmitVerification}
              disabled={submitting}
            >
              {submitting ? 'Updating...' : `Confirm: Mark as ${verifyAction}`}
            </button>
          </>
        }
      >
        {selectedDoc && (
          <form onSubmit={handleSubmitVerification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Student metadata */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Candidate: </span>
                <strong style={{ color: '#fff' }}>{selectedDoc.student_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Roll Number: </span>
                <strong style={{ color: '#fff' }}>{selectedDoc.student_roll}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department: </span>
                <strong style={{ color: '#fff' }}>{selectedDoc.department_code}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Applied For: </span>
                <strong style={{ color: '#fff' }}>{selectedDoc.company_name || 'General Profile'}</strong>
              </div>
            </div>

            {/* Document Preview & Download link */}
            <div
              style={{
                border: '1px dashed var(--border-glass)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={28} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedDoc.file_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Type: {selectedDoc.document_type} | Size:{' '}
                    {selectedDoc.file_size_bytes
                      ? `${(selectedDoc.file_size_bytes / 1024).toFixed(1)} KB`
                      : 'Standard'}
                  </div>
                </div>
              </div>
              <a
                href={`/api/v1/documents/${selectedDoc.document_id}/download`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary-custom"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
              >
                <Download size={14} /> Open Document
              </a>
            </div>

            {/* Admin Verification Decision */}
            <div>
              <label className="form-label-custom">Verification Action *</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor:
                      verifyAction === 'Verified' ? 'var(--success)' : 'var(--border-glass)',
                    background:
                      verifyAction === 'Verified' ? 'var(--success-bg)' : 'var(--bg-surface-elevated)',
                    color: verifyAction === 'Verified' ? '#34d399' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                  onClick={() => setVerifyAction('Verified')}
                >
                  <CheckCircle2 size={16} /> Approve & Verify
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor:
                      verifyAction === 'Rejected' ? 'var(--danger)' : 'var(--border-glass)',
                    background:
                      verifyAction === 'Rejected' ? 'var(--danger-bg)' : 'var(--bg-surface-elevated)',
                    color: verifyAction === 'Rejected' ? '#f87171' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                  onClick={() => setVerifyAction('Rejected')}
                >
                  <XCircle size={16} /> Reject / Request Revision
                </button>
              </div>
            </div>

            {/* Verification Notes */}
            <div>
              <label className="form-label-custom">
                {verifyAction === 'Rejected' ? 'Rejection Reason / Revision Notes *' : 'Verification Notes (Optional)'}
              </label>
              <textarea
                className="form-control-custom"
                rows="3"
                placeholder={
                  verifyAction === 'Rejected'
                    ? 'e.g. Please re-upload: Transcript is missing Semester 6 marksheet.'
                    : 'e.g. All academic credentials verified against university records.'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                required={verifyAction === 'Rejected'}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

