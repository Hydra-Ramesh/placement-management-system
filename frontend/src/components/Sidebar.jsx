import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  Briefcase,
  Layers,
  GraduationCap,
  Building2,
  FileText,
  User,
  LogOut,
  FolderLock
} from 'lucide-react';

export function Sidebar({ pendingDocsCount = 0 }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="brand-container">
        <div className="brand-logo-icon">
          <GraduationCap size={24} />
        </div>
        <div>
          <div className="brand-title">SPMS Cloud</div>
          <div className="brand-subtitle">Placement Cell</div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {isAdmin ? (
          <>
            <div className="nav-section-title">Administration</div>
            <ul className="sidebar-nav">
              <li>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/documents"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <FileCheck2 size={18} />
                  <span style={{ flex: 1 }}>Verify Docs</span>
                  {pendingDocsCount > 0 && (
                    <span
                      style={{
                        background: 'var(--warning)',
                        color: '#000',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {pendingDocsCount}
                    </span>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/jobs"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <Briefcase size={18} />
                  <span>Job Drives</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/applications"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <Layers size={18} />
                  <span>Applications</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/students"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <GraduationCap size={18} />
                  <span>Students</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/companies"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <Building2 size={18} />
                  <span>Companies</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <FileText size={18} />
                  <span>Reports & Audits</span>
                </NavLink>
              </li>
            </ul>
          </>
        ) : (
          <>
            <div className="nav-section-title">Student Portal</div>
            <ul className="sidebar-nav">
              <li>
                <NavLink
                  to="/jobs"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <Briefcase size={18} />
                  <span>Explore Jobs</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/applications"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <Layers size={18} />
                  <span>My Applications</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/student/documents"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <FolderLock size={18} />
                  <span>My Documents</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/companies"
                  className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}
                >
                  <Building2 size={18} />
                  <span>Recruiters</span>
                </NavLink>
              </li>
            </ul>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="nav-link-custom"
          style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
        >
          <LogOut size={18} color="var(--danger)" />
          <span style={{ color: 'var(--danger)' }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

