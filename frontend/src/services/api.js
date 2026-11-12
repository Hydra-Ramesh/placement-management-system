/**
 * SPMS 2.0 API Client
 * Manages HTTP communication with the Flask backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('spms_token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (studentData) => request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(studentData) }),
  getMe: () => request('/api/v1/auth/me'),
  getNotifications: () => request('/api/v1/auth/notifications'),
  markNotificationsRead: () => request('/api/v1/auth/notifications/read-all', { method: 'POST' }),

  // Jobs
  getJobs: (params = '') => request(`/api/v1/jobs${params ? `?${params}` : ''}`),
  getJob: (jobId) => request(`/api/v1/jobs/${jobId}`),
  createJob: (jobData) => request('/api/v1/jobs', { method: 'POST', body: JSON.stringify(jobData) }),
  updateJob: (jobId, jobData) => request(`/api/v1/jobs/${jobId}`, { method: 'PUT', body: JSON.stringify(jobData) }),

  // Applications
  applyJob: (data) => request('/api/v1/applications/apply', { method: 'POST', body: JSON.stringify(data) }),
  getMyApplications: () => request('/api/v1/applications/mine'),
  getAllApplications: (params = '') => request(`/api/v1/applications/all${params ? `?${params}` : ''}`),
  getApplication: (appId) => request(`/api/v1/applications/${appId}`),
  updateAppStatus: (appId, status) => request(`/api/v1/applications/${appId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  tpoVerifyApplication: (appId, action, notes) => request(`/api/v1/applications/${appId}/tpo-verify`, { method: 'POST', body: JSON.stringify({ action, notes }) }),
  confirmApplication: (appId) => request(`/api/v1/applications/${appId}/confirm-apply`, { method: 'POST' }),

  // Documents & Verification
  uploadDocument: (formData) => request('/api/v1/documents/upload', { method: 'POST', body: formData }),
  getPendingDocuments: () => request('/api/v1/documents/pending'),
  getAllDocuments: (params = '') => request(`/api/v1/documents/all${params ? `?${params}` : ''}`),
  getStudentDocuments: (studentId) => request(`/api/v1/documents/student/${studentId}`),
  verifyDocument: (docId, action, notes) => request(`/api/v1/documents/${docId}/verify`, { method: 'POST', body: JSON.stringify({ action, notes }) }),

  // Interviews
  scheduleInterview: (data) => request('/api/v1/interviews/schedule', { method: 'POST', body: JSON.stringify(data) }),
  updateInterviewResult: (id, data) => request(`/api/v1/interviews/${id}/result`, { method: 'POST', body: JSON.stringify(data) }),

  // Placements
  selectCandidate: (data) => request('/api/v1/placements/select', { method: 'POST', body: JSON.stringify(data) }),
  getAllPlacements: () => request('/api/v1/placements/all'),
  getLiveTicker: () => request('/api/v1/placements/live'),

  // Students & Companies
  getStudents: (params = '') => request(`/api/v1/students${params ? `?${params}` : ''}`),
  getStudent: (studentId) => request(`/api/v1/students/${studentId}`),
  getDepartments: () => request('/api/v1/students/departments'),
  getCompanies: (params = '') => request(`/api/v1/companies${params ? `?${params}` : ''}`),
  createCompany: (data) => request('/api/v1/companies', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics & Reports
  getDashboardMetrics: () => request('/api/v1/analytics/dashboard'),
  getReports: () => request('/api/v1/analytics/reports')
};

