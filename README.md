# Student Placement Management System (SPMS 2.0) 🚀

An enterprise, cloud-native **Student Placement Management System (SPMS 2.0)** designed for college placement cells, training & placement officers (TPOs), and corporate recruiters.

Rebuilt from the ground up with a **React 18 SPA Frontend**, **Flask REST + WebSocket Backend**, **Neon Serverless PostgreSQL**, and a streamlined **Admin Document Verification Workflow**.

- **Frontend Tech Stack:** React 18, Vite, Socket.io-client, Chart.js, Lucide Icons, Glassmorphism CSS Design System
- **Backend Tech Stack:** Flask 3.1, Flask-SocketIO (WebSockets), SQLAlchemy 2.0, PyJWT (RBAC), psycopg3, Gunicorn
- **Database Engine:** Serverless **Neon PostgreSQL** with connection pooling & SSL
- **Architecture Pattern:** Feature-based modular structure across both `frontend/` and `backend/`

---

## ✨ Key Features & Capabilities

### 1. 🛡️ Role-Based Access Control (RBAC)
- **Placement Officer / Admin**: Full oversight across recruitment drives, document verification queue, student records, interview scheduler, placement offers, analytics, and security audit logs.
- **Student**: Academic profile management, real-time job eligibility calculation, one-click application with document attachments, interview schedule tracker, and personal document vault.

### 2. 📑 Admin Document Verification Workflow (College Placement Core)
- When a candidate applies for a job, they attach their university transcripts, resume, and identity proofs.
- Applications immediately enter `Pending Document Verification` status and appear in the TPO's **Document Verification Queue**.
- Admins inspect the student's academic credentials with an inline document reviewer and can:
  - **Approve & Verify**: Validates academic integrity and advances application to `Documents Verified` / `Shortlisted`.
  - **Reject & Request Revision**: Provides actionable feedback (e.g., *"Semester 6 transcript missing official seal"*), immediately notifying the candidate over WebSockets.

### 3. ⚡ Real-Time WebSockets (`Flask-SocketIO`)
- **Instant Document Alerts**: Students are instantly notified via floating toast alerts when their documents are approved or revision is requested.
- **TPO Live Feeds**: Admins receive instant notification badges whenever a new student application or revised document is submitted.
- **Campus Placement Celebration**: Live ticker broadcasts campus placement milestones (e.g., *"Aarav Sharma placed at Google India - 32 LPA!"*) across all active sessions.

### 4. 📊 Live Visual Analytics & Chart.js
- Dynamic Doughnut Chart: Real-time Application Pipeline Funnel (`Applied` $\rightarrow$ `Under Review` $\rightarrow$ `Interview` $\rightarrow$ `Selected`).
- Department Placement Bar Chart: Live student placement count grouped by academic department.
- Recruiter Performance: Top hiring companies ranked by confirmed offers.
- Salary Tier Breakdown: Super Dream ($\ge 20$ LPA), Dream ($10\text{--}19.9$ LPA), and Regular ($< 10$ LPA).

---

## 📁 Feature-Based Project Structure

```text
placement-management-system/
├── backend/
│   ├── src/
│   │   ├── app.py                # Flask application factory with SocketIO integration
│   │   ├── config.py             # Neon PostgreSQL pooling, JWT settings, and uploads
│   │   ├── extensions.py         # db (SQLAlchemy), socketio, cors instances
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── user.py           # User & Role definition
│   │   │   ├── student.py        # Student academic profiles & CGPA constraints
│   │   │   ├── document.py       # Verification documents & review notes
│   │   │   ├── company.py        # Recruiting partner organizations
│   │   │   ├── job.py            # Recruitment drives & academic criteria
│   │   │   ├── application.py    # Multi-stage application pipeline
│   │   │   ├── interview.py      # Technical & HR interview rounds
│   │   │   ├── placement.py      # Final placement offers (ACID compliance)
│   │   │   └── audit.py          # Compliance audit trail & notifications
│   │   ├── features/             # Modular feature blueprints
│   │   │   ├── auth/             # Login, Register, JWT, RBAC decorators
│   │   │   ├── documents/        # Upload, review queue, verification endpoints
│   │   │   ├── jobs/             # Job catalog & real-time eligibility calculator
│   │   │   ├── applications/     # Application submission & stage transitions
│   │   │   ├── interviews/       # Interview scheduling & round evaluations
│   │   │   ├── placements/       # Placement offer creation & ACID transaction
│   │   │   ├── students/         # Student directory with CGPA filters
│   │   │   ├── companies/        # Recruiter directory & company management
│   │   │   └── analytics/        # Executive dashboard metrics & reports
│   │   └── websocket/            # SocketIO room events & real-time dispatchers
│   ├── tests/                    # 17 Automated pytest unit and integration tests
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Local backend development runner
│   └── wsgi.py                   # Gunicorn WSGI production entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable Glassmorphic UI (Navbar, Sidebar, Modal, Badge, Toast)
│   │   ├── context/              # AuthContext (JWT & RBAC) and SocketContext (WebSockets)
│   │   ├── features/             # Modular React feature views
│   │   │   ├── auth/             # Login & Student Registration
│   │   │   ├── dashboard/        # Executive charts & live KPI cards
│   │   │   ├── documents/        # Admin Verification Queue & Student Credentials Vault
│   │   │   ├── jobs/             # Jobs explorer, eligibility badge, application modal
│   │   │   ├── applications/     # Applications pipeline tracker & interview scheduler
│   │   │   ├── students/         # Registered students directory with filters
│   │   │   ├── companies/        # Recruiting partners catalog
│   │   │   └── reports/          # Placement intelligence & audit reports
│   │   ├── services/             # Axios / fetch API client with Bearer token interceptor
│   │   ├── styles/               # Glassmorphic dark design system & CSS tokens
│   │   ├── App.jsx               # App routing & RBAC route guards
│   │   └── main.jsx              # Vite React entry point
│   ├── package.json              # Node dependencies
│   ├── vite.config.js            # Vite configuration with backend API proxy
│   └── vercel.json               # Vercel Edge reverse proxy & SPA rewrites
└── README.md
```

---

## 🔑 Pre-Seeded Demo Logins

| Role | Username | Password | Purpose & Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin / TPO** | `admin` | `admin123` | Full access, Document Verification Queue, Analytics, Job Creator, Placement Manager |
| **Student** | `aarav.sharma` | `student123` | Placed student at Google India (32 LPA) |
| **Student** | `rohan.verma` | `student123` | Student with a document pending TPO verification |
| **Student** | `priya.patel` | `student123` | Shortlisted candidate with active interview schedules |

---

## 💻 Local Development Quickstart

### 1. Backend Setup (Flask + WebSockets)
```bash
# 1. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 2. Run backend server (starts on http://127.0.0.1:5000)
python backend/run.py
```

### 2. Frontend Setup (React + Vite)
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Start Vite development server (starts on http://localhost:3000)
npm run dev
```

### 3. Run Automated Tests
```bash
# Execute the complete pytest test suite (16 passing tests)
$env:PYTHONPATH='backend'; .\.venv\Scripts\pytest.exe backend/tests/ -v
```

---

## ☁️ Cloud Deployment Configuration

- **Backend (Render)**:
  - Root directory: `backend`
  - Build command: `pip install -r requirements.txt`
  - Start command: `gunicorn -c gunicorn_config.py wsgi:app`
  - Database: `DATABASE_URL` pointing to Neon Serverless PostgreSQL with SSL.
- **Frontend (Vercel)**:
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Configured with `vercel.json` for seamless API reverse-proxying and SPA routing.
