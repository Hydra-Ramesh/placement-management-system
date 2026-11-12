import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FileText, Trophy, Users, ShieldAlert, Award, TrendingUp } from 'lucide-react';

export function ReportsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await api.getReports();
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
        Loading placement reports and compliance audit trail...
      </div>
    );
  }

  const { department_report, company_report, unplaced_students, audit_logs } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Department-wise Placement Statistics Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--primary)" /> Department-wise Placement Performance
          </h3>
        </div>
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Academic Department</th>
                <th>Enrolled Candidates</th>
                <th>Placed Students</th>
                <th>Placement Rate (%)</th>
                <th>Average Package (LPA)</th>
                <th>Highest Package (LPA)</th>
              </tr>
            </thead>
            <tbody>
              {department_report?.map((d) => (
                <tr key={d.department_code}>
                  <td>
                    <strong style={{ color: '#fff' }}>{d.department_name}</strong>
                    <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--primary)' }}>
                      ({d.department_code})
                    </span>
                  </td>
                  <td>{d.total_students}</td>
                  <td>
                    <strong style={{ color: '#34d399' }}>{d.placed_students}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        background: d.placement_rate >= 50 ? 'var(--success-bg)' : 'var(--warning-bg)',
                        color: d.placement_rate >= 50 ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {d.placement_rate}%
                    </span>
                  </td>
                  <td>{d.avg_package ? `${d.avg_package} LPA` : 'N/A'}</td>
                  <td>
                    <strong style={{ color: '#fff' }}>{d.max_package ? `${d.max_package} LPA` : 'N/A'}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Recruitment Outcomes Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="var(--info)" /> Corporate Recruiter Hiring Conversion
          </h3>
        </div>
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry Sector</th>
                <th>Drives Published</th>
                <th>Offers Finalized</th>
                <th>Average Package (LPA)</th>
                <th>Highest Offer (LPA)</th>
              </tr>
            </thead>
            <tbody>
              {company_report?.map((c) => (
                <tr key={c.company_name}>
                  <td>
                    <strong style={{ color: '#fff' }}>{c.company_name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.industry || 'General'}</td>
                  <td>{c.jobs_posted}</td>
                  <td>
                    <strong style={{ color: '#34d399' }}>{c.hires_count}</strong>
                  </td>
                  <td>{c.avg_package ? `${c.avg_package} LPA` : 'N/A'}</td>
                  <td>
                    <strong style={{ color: '#fff' }}>{c.max_package ? `${c.max_package} LPA` : 'N/A'}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unplaced Students & Audit Trail Grid */}
      <div className="grid-cols-2">
        {/* Unplaced Students for targeted training */}
        <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={17} color="var(--warning)" /> Unplaced Candidates ({unplaced_students?.length || 0})
            </h3>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Candidate</th>
                  <th>Dept</th>
                  <th>CGPA</th>
                </tr>
              </thead>
              <tbody>
                {unplaced_students?.slice(0, 15).map((st) => (
                  <tr key={st.student_id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{st.roll_number}</td>
                    <td style={{ color: '#fff' }}>{st.full_name}</td>
                    <td>{st.department_code}</td>
                    <td>
                      <strong>{st.cgpa.toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail History */}
        <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={17} color="var(--danger)" /> Recent Security & Audit Logs
            </h3>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: '0.5rem 0' }}>
            {audit_logs?.map((log) => (
              <div
                key={log.log_id}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 600 }}>
                  <span>
                    [{log.action}] on {log.table_name} #{log.record_id}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    by {log.changed_by}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  {log.new_values || log.old_values}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

