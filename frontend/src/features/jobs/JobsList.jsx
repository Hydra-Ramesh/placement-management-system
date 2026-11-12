import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  Upload,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';

export function JobsList() {
  const { user, isAdmin, isStudent } = useAuth();
  const { addToast } = useSocket();

  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [studentDocs, setStudentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [minSalary, setMinSalary] = useState('');

  // Application Modal state
  const [applyingJob, setApplyingJob] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('Grade Transcript');
  const [submittingApp, setSubmittingApp] = useState(false);

  // Admin New Job Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newJob, setNewJob] = useState({
    company_id: '',
    job_title: '',
    job_description: '',
    job_type: 'Full-Time',
    location: '',
    minimum_cgpa: '7.0',
    maximum_backlogs: '0',
    salary_lpa: '',
    application_deadline: '',
    requires_doc_verification: true,
  });
  const [creatingJob, setCreatingJob] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (minSalary) params.append('min_salary', minSalary);

      const res = await api.getJobs(params.toString());
      if (res.success) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [search, statusFilter, minSalary]);

  useEffect(() => {
    async function loadAuxData() {
      try {
        const compRes = await api.getCompanies();
        if (compRes.success) setCompanies(compRes.companies);

        if (isStudent && user?.student_id) {
          const docRes = await api.getStudentDocuments(user.student_id);
          if (docRes.success) setStudentDocs(docRes.documents);
        }
      } catch (err) {
        console.error('Error loading companies or student docs:', err);
      }
    }
    loadAuxData();
  }, [isStudent, user]);

  const handleOpenApply = (job) => {
    setApplyingJob(job);
    // Pre-select all available student docs
    setSelectedDocIds(studentDocs.map((d) => d.document_id));
    setUploadFile(null);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyingJob) return;

    setSubmittingApp(true);
    try {
      let finalDocIds = [...selectedDocIds];

      // If student attached a new file in the modal, upload it first
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('document_type', uploadDocType);
        const uploadRes = await api.uploadDocument(formData);
        if (uploadRes.success) {
          finalDocIds.push(uploadRes.document.document_id);
        }
      }

      const res = await api.applyJob({
        job_id: applyingJob.job_id,
        document_ids: finalDocIds,
      });

      if (res.success) {
        addToast('Application Submitted! 🚀', res.message, 'success');
        setApplyingJob(null);
        fetchJobs(); // refresh state
      }
    } catch (err) {
      addToast('Application Failed', err.message || 'Error submitting application', 'danger');
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleConfirmApply = async (appId) => {
    try {
      const res = await api.confirmApplication(appId);
      if (res.success) {
        addToast('Application Confirmed! 🚀', res.message, 'success');
        fetchJobs();
      }
    } catch (err) {
      addToast('Confirmation Failed', err.message || 'Error confirming application', 'danger');
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setCreatingJob(true);
    try {
      const res = await api.createJob(newJob);
      if (res.success) {
        addToast('Recruitment Drive Published', res.message, 'success');
        setShowCreateModal(false);
        fetchJobs();
      }
    } catch (err) {
      addToast('Creation Failed', err.message || 'Error creating job', 'danger');
    } finally {
      setCreatingJob(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search & Filter Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
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
              placeholder="Search title, company, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>

          <select
            className="form-control-custom"
            style={{ width: 'auto', minWidth: 140 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Open">Active Drives (Open)</option>
            <option value="Closed">Closed Drives</option>
            <option value="All">All Statuses</option>
          </select>

          <input
            type="number"
            className="form-control-custom"
            style={{ width: 'auto', minWidth: 140 }}
            placeholder="Min LPA (e.g. 10)"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
          />
        </div>

        {isAdmin && (
          <button className="btn-primary-gradient" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Job Drive
          </button>
        )}
      </div>

      {/* Jobs Grid */}
      <div className="grid-cols-2">
        {loading ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem' }}>
            Loading recruitment drives...
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-card empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">
              <Briefcase size={48} />
            </div>
            <h3>No Job Drives Found</h3>
            <p>No active placement opportunities currently match your search criteria.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.job_id} className="glass-card fade-in-item" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {job.company_name}
                  </span>
                  <h3 style={{ margin: '0.2rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                    {job.job_title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={13} /> {job.location}
                    </span>
                    <span>•</span>
                    <span>{job.job_type}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#34d399',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {job.salary_lpa} <span style={{ fontSize: '0.8rem' }}>LPA</span>
                  </div>
                  <Badge status={job.job_status} />
                </div>
              </div>

              {/* Description */}
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {job.job_description || 'Build innovative high-scale products with our enterprise recruitment team.'}
              </p>

              {/* Academic Eligibility Bar */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Min CGPA: </span>
                  <strong style={{ color: '#fff' }}>{job.minimum_cgpa.toFixed(2)}</strong>
                  <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>|</span>
                  <span style={{ color: 'var(--text-muted)' }}>Max Backlogs: </span>
                  <strong style={{ color: '#fff' }}>{job.maximum_backlogs}</strong>
                </div>

                <div style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Deadline: <span style={{ color: '#fff' }}>{job.application_deadline}</span>
                </div>
              </div>

              {/* Action & Student Eligibility Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-glass)',
                }}
              >
                {isStudent && (
                  <div>
                    {job.user_application ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                        <Badge status={job.user_application.status} />
                      </div>
                    ) : job.is_eligible ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={15} /> Academic Criteria Met
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }} title={job.eligibility_reason}>
                        <XCircle size={15} /> {job.eligibility_reason || 'Ineligible'}
                      </span>
                    )}
                  </div>
                )}

                {isStudent && !job.user_application && job.job_status === 'Open' && (
                  <button
                    className="btn-primary-gradient"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                    onClick={() => handleOpenApply(job)}
                    disabled={!job.is_eligible}
                  >
                    Apply (Request TPO Approval) <ArrowRight size={14} />
                  </button>
                )}

                {isStudent && job.user_application?.status === 'TPO Approved' && (
                  <button
                    className="btn-primary-gradient"
                    style={{
                      padding: '0.45rem 1rem',
                      fontSize: '0.82rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                    }}
                    onClick={() => handleConfirmApply(job.user_application.application_id)}
                  >
                    <CheckCircle2 size={14} /> Confirm & Apply 🚀
                  </button>
                )}

                {isStudent && ['Pending TPO Verification', 'Pending Document Verification'].includes(job.user_application?.status) && (
                  <button
                    className="btn-secondary-custom"
                    disabled
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', opacity: 0.85, cursor: 'not-allowed' }}
                    title="Your credentials are under review by the Placement Officer."
                  >
                    <Clock size={14} /> Under TPO Review
                  </button>
                )}

                {isAdmin && (
                  <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Applicants: <strong style={{ color: '#fff' }}>{job.total_applications}</strong>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Student Apply & Document Attachment Modal */}
      <Modal
        isOpen={!!applyingJob}
        onClose={() => setApplyingJob(null)}
        title={`Drive Clearance Request: ${applyingJob?.job_title} at ${applyingJob?.company_name}`}
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setApplyingJob(null)}>
              Cancel
            </button>
            <button
              className="btn-primary-gradient"
              onClick={handleApplySubmit}
              disabled={submittingApp}
            >
              {submittingApp ? 'Submitting to TPO...' : 'Submit Request to TPO'}
            </button>
          </>
        }
      >
        {applyingJob && (
          <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* TPO Process Explanation Banner */}
            <div
              className="alert-custom alert-info"
              style={{
                margin: 0,
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'flex-start',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.86rem' }}>College TPO Verification Process</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                  Submitting this request forwards your marksheet and resume to the Training & Placement Officer (TPO) for credential review. Once TPO verifies and clears your documents, you will be authorized to submit your final application.
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Package:</span>
                <strong style={{ color: 'var(--success)' }}>{applyingJob.salary_lpa} LPA</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                <strong style={{ color: '#fff' }}>{applyingJob.location}</strong>
              </div>
            </div>

            {/* Document Selection / Attachment */}
            <div>
              <label className="form-label-custom">
                Attach Existing Verified Credentials (Recommended)
              </label>
              {studentDocs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No documents found on your profile. You can attach a transcript/resume below.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {studentDocs.map((doc) => (
                    <label
                      key={doc.document_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.9rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: '1px solid var(--border-glass)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.document_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocIds([...selectedDocIds, doc.document_id]);
                            } else {
                              setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.document_id));
                            }
                          }}
                        />
                        <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                          {doc.document_type}: {doc.file_name}
                        </span>
                      </div>
                      <Badge status={doc.verification_status} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Or upload new document now */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
              <label className="form-label-custom">Or Attach New Document Right Now</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <select
                  className="form-control-custom"
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                >
                  <option value="Resume">Resume</option>
                  <option value="Grade Transcript">Grade Transcript</option>
                  <option value="College ID">College ID</option>
                  <option value="Certificate">Certificate</option>
                </select>
                <input
                  type="file"
                  className="form-control-custom"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Admin New Job Drive Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Publish New Campus Recruitment Drive"
        maxWidth="640px"
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button className="btn-primary-gradient" onClick={handleCreateJob} disabled={creatingJob}>
              {creatingJob ? 'Publishing...' : 'Publish Job Drive'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Recruiting Company *</label>
              <select
                className="form-control-custom"
                value={newJob.company_id}
                onChange={(e) => setNewJob({ ...newJob, company_id: e.target.value })}
                required
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-custom">Job Title *</label>
              <input
                type="text"
                className="form-control-custom"
                value={newJob.job_title}
                onChange={(e) => setNewJob({ ...newJob, job_title: e.target.value })}
                placeholder="Software Engineer I"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Package (LPA) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control-custom"
                value={newJob.salary_lpa}
                onChange={(e) => setNewJob({ ...newJob, salary_lpa: e.target.value })}
                placeholder="15.00"
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Min CGPA (0-10) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                className="form-control-custom"
                value={newJob.minimum_cgpa}
                onChange={(e) => setNewJob({ ...newJob, minimum_cgpa: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Max Backlogs *</label>
              <input
                type="number"
                min="0"
                className="form-control-custom"
                value={newJob.maximum_backlogs}
                onChange={(e) => setNewJob({ ...newJob, maximum_backlogs: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Location</label>
              <input
                type="text"
                className="form-control-custom"
                value={newJob.location}
                onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                placeholder="Bangalore / Hybrid"
              />
            </div>
            <div>
              <label className="form-label-custom">Application Deadline *</label>
              <input
                type="date"
                className="form-control-custom"
                value={newJob.application_deadline}
                onChange={(e) => setNewJob({ ...newJob, application_deadline: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label-custom">Job Description</label>
            <textarea
              className="form-control-custom"
              rows="3"
              value={newJob.job_description}
              onChange={(e) => setNewJob({ ...newJob, job_description: e.target.value })}
              placeholder="Responsibilities, technical stack, interview process overview..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

