import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  Layers,
  Calendar,
  Building2,
  FileCheck2,
  Clock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Filter,
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export function ApplicationsTracker() {
  const { isAdmin, isStudent } = useAuth();
  const { addToast, socket } = useSocket();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Admin Schedule Interview modal
  const [scheduleModalApp, setScheduleModalApp] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    interview_round: 'Technical Round 1',
    interview_date: '',
    interview_mode: 'Online',
    interview_location: 'Google Meet / MS Teams',
    interviewer_notes: '',
  });
  const [scheduling, setScheduling] = useState(false);

  // Admin Select & Placement Offer modal
  const [selectModalApp, setSelectModalApp] = useState(null);
  const [offerSalary, setOfferSalary] = useState('');
  const [selecting, setSelecting] = useState(false);

  // Admin TPO Verification Review modal
  const [tpoReviewApp, setTpoReviewApp] = useState(null);
  const [tpoAction, setTpoAction] = useState('Approve');
  const [tpoNotes, setTpoNotes] = useState('');
  const [submittingTpo, setSubmittingTpo] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = isAdmin
        ? await api.getAllApplications(statusFilter ? `status=${statusFilter}` : '')
        : await api.getMyApplications();
      if (res.success) {
        setApplications(res.applications);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [isAdmin, statusFilter]);

  // Real-time status update listener
  useEffect(() => {
    if (!socket) return;
    const handleStatusChange = (updatedApp) => {
      setApplications((prev) =>
        prev.map((a) => (a.application_id === updatedApp.application_id ? updatedApp : a))
      );
    };
    socket.on('application_status_changed', handleStatusChange);
    return () => socket.off('application_status_changed', handleStatusChange);
  }, [socket]);

  const handleOpenSchedule = (app) => {
    setScheduleModalApp(app);
    setInterviewForm({
      interview_round: 'Technical Round 1',
      interview_date: '',
      interview_mode: 'Online',
      interview_location: 'Google Meet Link',
      interviewer_notes: '',
    });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleModalApp) return;

    setScheduling(true);
    try {
      const res = await api.scheduleInterview({
        application_id: scheduleModalApp.application_id,
        ...interviewForm,
      });
      if (res.success) {
        addToast('Interview Scheduled', res.message, 'success');
        setScheduleModalApp(null);
        fetchApplications();
      }
    } catch (err) {
      addToast('Scheduling Failed', err.message, 'danger');
    } finally {
      setScheduling(false);
    }
  };

  const handleOpenSelect = (app) => {
    setSelectModalApp(app);
    setOfferSalary(app.salary_lpa || '15.00');
  };

  const handleSelectSubmit = async (e) => {
    e.preventDefault();
    if (!selectModalApp) return;

    setSelecting(true);
    try {
      const res = await api.selectCandidate({
        application_id: selectModalApp.application_id,
        package_lpa: parseFloat(offerSalary),
      });
      if (res.success) {
        addToast('Candidate Selected! 🎉', res.message, 'success');
        setSelectModalApp(null);
        fetchApplications();
      }
    } catch (err) {
      addToast('Selection Error', err.message, 'danger');
    } finally {
      setSelecting(false);
    }
  };

  const handleQuickStatus = async (appId, newStatus) => {
    try {
      const res = await api.updateAppStatus(appId, newStatus);
      if (res.success) {
        addToast('Status Updated', res.message, 'info');
        fetchApplications();
      }
    } catch (err) {
      addToast('Error', err.message, 'danger');
    }
  };

  const handleTpoVerifySubmit = async (e) => {
    e.preventDefault();
    if (!tpoReviewApp) return;

    setSubmittingTpo(true);
    try {
      const res = await api.tpoVerifyApplication(tpoReviewApp.application_id, tpoAction, tpoNotes);
      if (res.success) {
        addToast(
          'TPO Verification Recorded',
          res.message,
          tpoAction.includes('Approve') ? 'success' : 'warning'
        );
        setTpoReviewApp(null);
        fetchApplications();
      }
    } catch (err) {
      addToast('Verification Error', err.message || 'Error updating clearance', 'danger');
    } finally {
      setSubmittingTpo(false);
    }
  };

  const handleConfirmApply = async (appId) => {
    try {
      const res = await api.confirmApplication(appId);
      if (res.success) {
        addToast('Application Confirmed! 🚀', res.message, 'success');
        fetchApplications();
      }
    } catch (err) {
      addToast('Confirmation Error', err.message || 'Error confirming application', 'danger');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'All', val: '' },
            { label: 'Pending TPO Review', val: 'Pending TPO Verification' },
            { label: 'TPO Approved (Ready)', val: 'TPO Approved' },
            { label: 'Officially Applied', val: 'Applied' },
            { label: 'Shortlisted', val: 'Shortlisted' },
            { label: 'Interview Scheduled', val: 'Interview Scheduled' },
            { label: 'Selected', val: 'Selected' },
          ].map((tab) => (
            <button
              key={tab.label}
              className={`filter-chip ${statusFilter === tab.val ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.val)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Showing <strong>{applications.length}</strong> application records
        </div>
      </div>

      {/* Applications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem' }}>
            Loading candidate applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">
              <Layers size={48} />
            </div>
            <h3>No Applications Found</h3>
            <p>
              {isStudent
                ? "You haven't submitted any job drive applications yet. Explore open openings in the Jobs catalog."
                : 'No student applications match the selected filter criteria.'}
            </p>
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.application_id}
              className="glass-card fade-in-item"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderLeft:
                  app.application_status === 'Selected'
                    ? '4px solid var(--success)'
                    : app.application_status === 'Pending Document Verification'
                    ? '4px solid var(--warning)'
                    : '1px solid var(--border-glass)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {app.company_name}
                    </span>
                    <Badge status={app.application_status} />
                  </div>
                  <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                    {app.job_title}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Candidate:{' '}
                    <strong style={{ color: '#fff' }}>
                      {app.student_name} ({app.student_roll})
                    </strong>{' '}
                    • CGPA: <strong>{app.student_cgpa}</strong> • Dept:{' '}
                    <strong>{app.department_code}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                    {app.salary_lpa} LPA
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Applied: {new Date(app.application_date).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Document verification alert if pending or feedback exists */}
              {app.doc_verification_notes && (
                <div className="alert-custom alert-warning" style={{ margin: 0, padding: '0.65rem 0.9rem', fontSize: '0.82rem' }}>
                  <strong>Admin Document Review Note:</strong> {app.doc_verification_notes}
                </div>
              )}

              {/* Attached Documents Tags */}
              {app.documents && app.documents.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Attached Docs:</span>
                  {app.documents.map((d) => (
                    <span
                      key={d.document_id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <FileText size={12} color="var(--primary)" />
                      {d.document_type} ({d.verification_status})
                    </span>
                  ))}
                </div>
              )}

              {/* Student TPO Verification Progress Status Banner */}
              {isStudent && app.application_status === 'TPO Approved' && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem 1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CheckCircle2 size={22} color="#34d399" />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.9rem' }}>TPO Verification Cleared!</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        Your marksheet and documents have been verified by the Placement Cell. Click below to submit your official application.
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-primary-gradient"
                    style={{
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.84rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                    }}
                    onClick={() => handleConfirmApply(app.application_id)}
                  >
                    Confirm & Submit Application 🚀
                  </button>
                </div>
              )}

              {isStudent && ['Pending TPO Verification', 'Pending Document Verification'].includes(app.application_status) && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    fontSize: '0.82rem',
                    color: 'var(--warning)',
                  }}
                >
                  <Clock size={16} />
                  <span>
                    <strong>Under TPO Verification:</strong> Your application request is awaiting credential verification by the Training & Placement Officer. Once verified, you will be cleared to submit your official application.
                  </span>
                </div>
              )}

              {/* Interview Rounds Scheduled */}
              {app.interviews && app.interviews.length > 0 && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} color="var(--warning)" />
                    <span>
                      Latest Round: <strong>{app.interviews[app.interviews.length - 1].interview_round}</strong> ({app.interviews[app.interviews.length - 1].interview_mode})
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Time: {new Date(app.interviews[app.interviews.length - 1].interview_date).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Admin Actions Bar */}
              {isAdmin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-glass)',
                  }}
                >
                  {['Pending TPO Verification', 'Pending Document Verification'].includes(app.application_status) && (
                    <button
                      className="btn-primary-gradient"
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                      onClick={() => {
                        setTpoReviewApp(app);
                        setTpoAction('Approve');
                        setTpoNotes('');
                      }}
                    >
                      <ShieldCheck size={13} /> Review Docs & Verify Clearance
                    </button>
                  )}

                  {app.application_status === 'Pending Document Verification' && (
                    <button
                      className="btn-secondary-custom"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => handleQuickStatus(app.application_id, 'Documents Verified')}
                    >
                      <FileCheck2 size={13} /> Mark Docs Verified
                    </button>
                  )}

                  {['Documents Verified', 'Applied'].includes(app.application_status) && (
                    <button
                      className="btn-secondary-custom"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => handleQuickStatus(app.application_id, 'Shortlisted')}
                    >
                      Shortlist Candidate
                    </button>
                  )}

                  <button
                    className="btn-secondary-custom"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => handleOpenSchedule(app)}
                  >
                    <Calendar size={13} /> Schedule Interview
                  </button>

                  {app.application_status !== 'Selected' && (
                    <button
                      className="btn-primary-gradient"
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                      onClick={() => handleOpenSelect(app)}
                    >
                      <Trophy size={13} /> Select & Offer Job
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={!!scheduleModalApp}
        onClose={() => setScheduleModalApp(null)}
        title={`Schedule Interview: ${scheduleModalApp?.student_name}`}
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setScheduleModalApp(null)}>
              Cancel
            </button>
            <button
              className="btn-primary-gradient"
              onClick={handleScheduleSubmit}
              disabled={scheduling}
            >
              {scheduling ? 'Scheduling...' : 'Confirm Interview Schedule'}
            </button>
          </>
        }
      >
        <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label-custom">Interview Round Name *</label>
            <input
              type="text"
              className="form-control-custom"
              value={interviewForm.interview_round}
              onChange={(e) => setInterviewForm({ ...interviewForm, interview_round: e.target.value })}
              placeholder="e.g. Technical Round 1 / System Design"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label-custom">Date & Time *</label>
              <input
                type="datetime-local"
                className="form-control-custom"
                value={interviewForm.interview_date}
                onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label-custom">Interview Mode *</label>
              <select
                className="form-control-custom"
                value={interviewForm.interview_mode}
                onChange={(e) => setInterviewForm({ ...interviewForm, interview_mode: e.target.value })}
              >
                <option value="Online">Online (Video Meet / Teams)</option>
                <option value="Offline">Offline (Campus Placement Cell)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label-custom">Meeting Link / Room Location</label>
            <input
              type="text"
              className="form-control-custom"
              value={interviewForm.interview_location}
              onChange={(e) => setInterviewForm({ ...interviewForm, interview_location: e.target.value })}
              placeholder="https://meet.google.com/xyz-abc or Seminar Hall B"
            />
          </div>

          <div>
            <label className="form-label-custom">Interviewer Notes (Optional)</label>
            <textarea
              className="form-control-custom"
              rows="2"
              value={interviewForm.interviewer_notes}
              onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_notes: e.target.value })}
              placeholder="Key skills being evaluated, interviewer panel names..."
            />
          </div>
        </form>
      </Modal>

      {/* Select & Offer Placement Modal */}
      <Modal
        isOpen={!!selectModalApp}
        onClose={() => setSelectModalApp(null)}
        title={`Placement Offer: ${selectModalApp?.student_name}`}
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setSelectModalApp(null)}>
              Cancel
            </button>
            <button
              className="btn-primary-gradient"
              onClick={handleSelectSubmit}
              disabled={selecting}
            >
              {selecting ? 'Issuing Offer...' : 'Confirm & Place Candidate'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSelectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            This will record a confirmed placement offer for{' '}
            <strong style={{ color: '#fff' }}>{selectModalApp?.student_name}</strong> at{' '}
            <strong style={{ color: 'var(--primary)' }}>{selectModalApp?.company_name}</strong> and notify the candidate over WebSockets.
          </p>

          <div>
            <label className="form-label-custom">Annual Package Offer (LPA) *</label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              className="form-control-custom"
              value={offerSalary}
              onChange={(e) => setOfferSalary(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      {/* TPO Document Verification Clearance Modal */}
      <Modal
        isOpen={!!tpoReviewApp}
        onClose={() => setTpoReviewApp(null)}
        title={`TPO Verification Clearance: ${tpoReviewApp?.student_name} (${tpoReviewApp?.student_roll})`}
        footer={
          <>
            <button className="btn-secondary-custom" onClick={() => setTpoReviewApp(null)}>
              Cancel
            </button>
            <button
              className="btn-primary-gradient"
              onClick={handleTpoVerifySubmit}
              disabled={submittingTpo}
            >
              {submittingTpo ? 'Processing Decision...' : 'Save TPO Clearance Decision'}
            </button>
          </>
        }
      >
        {tpoReviewApp && (
          <form onSubmit={handleTpoVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Student & Job Summary */}
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Drive / Company:</span>
                <strong style={{ color: '#fff' }}>{tpoReviewApp.job_title} ({tpoReviewApp.company_name})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Candidate:</span>
                <strong style={{ color: '#fff' }}>{tpoReviewApp.student_name} ({tpoReviewApp.student_roll})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Academic Standing:</span>
                <strong style={{ color: 'var(--success)' }}>CGPA: {tpoReviewApp.student_cgpa} • Backlogs: {tpoReviewApp.student_backlogs} • Dept: {tpoReviewApp.department_code}</strong>
              </div>
            </div>

            {/* Attached Documents for inspection */}
            <div>
              <label className="form-label-custom">Attached Candidate Credentials</label>
              {tpoReviewApp.documents && tpoReviewApp.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {tpoReviewApp.documents.map((d) => (
                    <div
                      key={d.document_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.9rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-glass)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={15} color="var(--primary)" />
                        <span style={{ color: '#fff', fontSize: '0.85rem' }}>{d.document_type}: {d.file_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Badge status={d.verification_status} />
                        <a
                          href={`/api/v1/documents/${d.document_id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary-custom"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          View File
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No individual documents attached.</p>
              )}
            </div>

            {/* TPO Action Decision */}
            <div>
              <label className="form-label-custom">TPO Clearance Decision *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { val: 'Approve', label: 'Approve & Allow Student' },
                  { val: 'Approve_And_Apply', label: 'Approve & Submit Directly' },
                  { val: 'Reject', label: 'Reject Clearance' },
                ].map((act) => (
                  <button
                    key={act.val}
                    type="button"
                    className={`filter-chip ${tpoAction === act.val ? 'active' : ''}`}
                    style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.78rem' }}
                    onClick={() => setTpoAction(act.val)}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TPO Notes */}
            <div>
              <label className="form-label-custom">Verification Notes / Feedback for Student</label>
              <textarea
                className="form-control-custom"
                rows={3}
                placeholder="e.g. All transcripts verified against university marksheet registry. Approved for campus drive."
                value={tpoNotes}
                onChange={(e) => setTpoNotes(e.target.value)}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

