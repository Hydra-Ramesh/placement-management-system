import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  Users,
  Building2,
  Briefcase,
  Trophy,
  TrendingUp,
  Percent,
  FileCheck2,
  DollarSign
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export function Dashboard() {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.getDashboardMetrics();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Real-time chart & stats refresh on placement or application event
  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchMetrics();
    socket.on('placement_celebration', handleRefresh);
    socket.on('application_received', handleRefresh);
    socket.on('job_posted', handleRefresh);
    return () => {
      socket.off('placement_celebration', handleRefresh);
      socket.off('application_received', handleRefresh);
      socket.off('job_posted', handleRefresh);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
        Loading placement analytics & live charts...
      </div>
    );
  }

  const { metrics, charts, recent_placements } = data || {};

  // Doughnut Chart Configuration
  const doughnutData = {
    labels: charts?.status_chart?.labels || [],
    datasets: [
      {
        data: charts?.status_chart?.values || [],
        backgroundColor: [
          '#06b6d4', // Applied
          '#f59e0b', // Pending/Interview
          '#a855f7', // Shortlisted
          '#10b981', // Selected
          '#ef4444', // Rejected
          '#64748b'  // Withdrawn
        ],
        borderWidth: 0,
      },
    ],
  };

  // Department Bar Chart Configuration
  const deptData = {
    labels: charts?.dept_chart?.labels || [],
    datasets: [
      {
        label: 'Placed Students',
        data: charts?.dept_chart?.values || [],
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  // Company Bar Chart Configuration
  const companyData = {
    labels: charts?.company_chart?.labels || [],
    datasets: [
      {
        label: 'Offers Extended',
        data: charts?.company_chart?.values || [],
        backgroundColor: 'rgba(6, 182, 212, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Plus Jakarta Sans', size: 12 },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
      },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Stats Cards */}
      <div className="grid-cols-4">
        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Placement Rate</div>
            <div className="stat-value">{metrics?.placement_rate_pct}%</div>
            <div className="stat-trend" style={{ color: 'var(--success)' }}>
              <TrendingUp size={14} /> {metrics?.placed_students_count} Placed / {metrics?.total_students} Candidates
            </div>
          </div>
          <div className="stat-icon success">
            <Percent size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Average Package</div>
            <div className="stat-value">{metrics?.avg_package_lpa} <span style={{ fontSize: '1rem', fontWeight: 600 }}>LPA</span></div>
            <div className="stat-trend" style={{ color: 'var(--primary)' }}>
              <DollarSign size={14} /> Top: {metrics?.highest_package_lpa} LPA
            </div>
          </div>
          <div className="stat-icon primary">
            <Trophy size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Active Job Drives</div>
            <div className="stat-value">{metrics?.total_active_jobs}</div>
            <div className="stat-trend" style={{ color: 'var(--info)' }}>
              <Briefcase size={14} /> {metrics?.total_companies} Recruiting Partners
            </div>
          </div>
          <div className="stat-icon info">
            <Briefcase size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <div className="stat-label">Pending Doc Audits</div>
            <div className="stat-value">{metrics?.pending_documents}</div>
            <div className="stat-trend" style={{ color: 'var(--warning)' }}>
              <FileCheck2 size={14} /> Awaiting Verification
            </div>
          </div>
          <div className="stat-icon warning">
            <FileCheck2 size={22} />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid-cols-2">
        {/* Department-wise Placement Bar */}
        <div className="glass-card" style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Placements by Academic Department
          </h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <Bar data={deptData} options={chartOptions} />
          </div>
        </div>

        {/* Application Status Pipeline Funnel */}
        <div className="glass-card" style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Application Pipeline Progression
          </h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Companies & Recent Placements Grid */}
      <div className="grid-cols-2">
        <div className="glass-card" style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Top Recruiting Companies (Offers Made)
          </h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <Bar data={companyData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Placements Feed */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Recent Verified Placements 🎓
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {recent_placements?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No confirmed placements yet this season.
              </p>
            ) : (
              recent_placements?.map((plc) => (
                <div
                  key={plc.placement_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{plc.student_name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {plc.job_title} • {plc.company_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {plc.package_lpa} LPA
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {plc.offer_date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

