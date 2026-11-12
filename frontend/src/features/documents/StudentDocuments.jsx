import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Clock,
  Plus
} from 'lucide-react';

export function StudentDocuments() {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docType, setDocType] = useState('Resume');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchStudentDocs = async () => {
    if (!user?.student_id) return;
    try {
      setLoading(true);
      const res = await api.getStudentDocuments(user.student_id);
      if (res.success) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDocs();
  }, [user]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast('Error', 'Please select a file to upload.', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', docType);

    setUploading(true);
    try {
      const res = await api.uploadDocument(formData);
      if (res.success) {
        addToast('Document Uploaded', res.message, 'success');
        setDocuments((prev) => [res.document, ...prev]);
        setShowUploadModal(false);
        setSelectedFile(null);
      }
    } catch (err) {
      addToast('Upload Failed', err.message || 'File upload error', 'danger');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Card */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Academic Credentials & Documents
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Upload your resumes, grade transcripts, and certificates for TPO placement verification
          </p>
        </div>

        <button className="btn-primary-gradient" onClick={() => setShowUploadModal(true)}>
          <Plus size={16} /> Upload New Document
        </button>
      </div>

      {/* Document Grid */}
      <div className="grid-cols-2">
        {loading ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            Loading your academic documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="glass-card empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">
              <Upload size={48} />
            </div>
            <h3>No Documents Uploaded Yet</h3>
            <p>
              Upload your latest resume and university grade transcripts to be eligible for on-campus drives.
            </p>
            <button className="btn-primary-gradient" onClick={() => setShowUploadModal(true)}>
              <Upload size={16} /> Upload First Document
            </button>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.document_id} className="glass-card fade-in-item" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                      {doc.document_type}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {doc.file_name}
                    </span>
                  </div>
                </div>

                <Badge status={doc.verification_status} />
              </div>

              {/* Status Alert if feedback exists */}
              {doc.verification_status === 'Rejected' && doc.verification_notes && (
                <div className="alert-custom alert-danger" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <AlertCircle size={16} />
                    <span>
                      <strong>TPO Note:</strong> {doc.verification_notes}
                    </span>
                  </div>
                </div>
              )}

              {doc.verification_status === 'Verified' && (
                <div className="alert-custom alert-success" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <CheckCircle2 size={16} />
                    <span>
                      Verified by <strong>{doc.verified_by || 'Placement Cell'}</strong>
                    </span>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-glass)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
                </span>
                <a
                  href={doc.file_path && doc.file_path.startsWith('http') ? doc.file_path : `/api/v1/documents/${doc.document_id}/download?token=${localStorage.getItem('spms_token') || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary-custom"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                >
                  <Download size={13} /> View File
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Verification Document"
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setShowUploadModal(false)}>
              Cancel
            </button>
            <button className="btn-primary-gradient" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Submit Document'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="form-label-custom">Document Type *</label>
            <select
              className="form-control-custom"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="Resume">Resume / Curriculum Vitae (CV)</option>
              <option value="Grade Transcript">Academic Marksheet / Transcript</option>
              <option value="College ID">Student Identity Proof / College ID</option>
              <option value="Certificate">Technical / Domain Certification</option>
              <option value="Other">Other Supporting Document</option>
            </select>
          </div>

          <div>
            <label className="form-label-custom">Select File (PDF, PNG, JPG, DOCX) *</label>
            <input
              type="file"
              className="form-control-custom"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              required
            />
            <small style={{ color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
              Maximum file size: 16 MB. PDFs preferred for clear transcript inspection.
            </small>
          </div>
        </form>
      </Modal>
    </div>
  );
}

