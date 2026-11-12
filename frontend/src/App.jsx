import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';

// Feature Views
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { Dashboard } from './features/dashboard/Dashboard';
import { DocumentVerificationQueue } from './features/documents/DocumentVerificationQueue';
import { StudentDocuments } from './features/documents/StudentDocuments';
import { JobsList } from './features/jobs/JobsList';
import { ApplicationsTracker } from './features/applications/ApplicationsTracker';
import { StudentsList } from './features/students/StudentsList';
import { CompaniesList } from './features/companies/CompaniesList';
import { ReportsView } from './features/reports/ReportsView';

function ProtectedLayout({ children, title, subtitle, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [pendingDocsCount, setPendingDocsCount] = useState(0);

  useEffect(() => {
    async function checkPending() {
      if (user?.role === 'Admin') {
        try {
          const res = await api.getPendingDocuments();
          if (res.success) setPendingDocsCount(res.count);
        } catch (err) {
          // silent fail
        }
      }
    }
    checkPending();
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>Loading SPMS 2.0...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={user?.role === 'Admin' ? '/admin/dashboard' : '/jobs'} replace />;
  }

  return (
    <div className="app-wrapper">
      <Sidebar pendingDocsCount={pendingDocsCount} />
      <div className="main-wrapper">
        <Navbar title={title} subtitle={subtitle} />
        <main className="content-container">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}

export function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'Admin' ? '/admin/dashboard' : '/jobs'} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/jobs" replace />
          ) : (
            <Register />
          )
        }
      />

      {/* Admin Protected Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedLayout
            title="Placement Cell Executive Dashboard"
            subtitle="Campus recruitment performance, real-time funnel, and live metrics"
            allowedRoles={['Admin']}
          >
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/documents"
        element={
          <ProtectedLayout
            title="Document Verification Queue"
            subtitle="Review, authenticate, and approve student transcripts, resumes, and IDs"
            allowedRoles={['Admin']}
          >
            <DocumentVerificationQueue />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/applications"
        element={
          <ProtectedLayout
            title="Campus Applications Pipeline"
            subtitle="Review applicants, schedule interview rounds, and extend placement offers"
            allowedRoles={['Admin']}
          >
            <ApplicationsTracker />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedLayout
            title="Registered Students Directory"
            subtitle="Monitor candidate CGPAs, active backlogs, and academic departments"
            allowedRoles={['Admin']}
          >
            <StudentsList />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedLayout
            title="Placement Intelligence & Compliance Reports"
            subtitle="Comprehensive department breakdown, hiring statistics, and security audit log"
            allowedRoles={['Admin']}
          >
            <ReportsView />
          </ProtectedLayout>
        }
      />

      {/* Shared & Student Routes */}
      <Route
        path="/jobs"
        element={
          <ProtectedLayout
            title="Campus Recruitment Drives"
            subtitle="Explore published placement openings with live academic eligibility validation"
          >
            <JobsList />
          </ProtectedLayout>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedLayout
            title="My Job Applications"
            subtitle="Track your recruitment progress, interview schedules, and document review feedback"
            allowedRoles={['Student']}
          >
            <ApplicationsTracker />
          </ProtectedLayout>
        }
      />
      <Route
        path="/student/documents"
        element={
          <ProtectedLayout
            title="My Academic Credentials"
            subtitle="Manage your uploaded resumes, transcripts, and TPO verification status"
            allowedRoles={['Student']}
          >
            <StudentDocuments />
          </ProtectedLayout>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedLayout
            title="Recruiting Corporate Partners"
            subtitle="Overview of recruiting enterprises participating in placement drives"
          >
            <CompaniesList />
          </ProtectedLayout>
        }
      />

      {/* Fallback */}
      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? (user?.role === 'Admin' ? '/admin/dashboard' : '/jobs') : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}

