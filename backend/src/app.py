import os
import sys
from pathlib import Path
from datetime import datetime, date, timezone
from decimal import Decimal
import click
from flask import Flask, jsonify, redirect

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.config import config_by_name
from src.extensions import db, socketio, cors
from src.websocket.events import register_socket_events
from src.models import (
    Department, Student, User, Company, Job, Application,
    Interview, Placement, Document, AuditLog, Notification
)


def create_app(config_name=None):
    """Modern Flask Application Factory."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'production')

    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    socketio.init_app(app)

    # Register WebSocket handlers
    register_socket_events(socketio)

    # Register Feature Blueprints
    from src.features.auth.routes import auth_bp
    from src.features.documents.routes import documents_bp
    from src.features.jobs.routes import jobs_bp
    from src.features.applications.routes import applications_bp
    from src.features.interviews.routes import interviews_bp
    from src.features.placements.routes import placements_bp
    from src.features.students.routes import students_bp
    from src.features.companies.routes import companies_bp
    from src.features.analytics.routes import analytics_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(applications_bp)
    app.register_blueprint(interviews_bp)
    app.register_blueprint(placements_bp)
    app.register_blueprint(students_bp)
    app.register_blueprint(companies_bp)
    app.register_blueprint(analytics_bp)

    @app.route('/health')
    @app.route('/api/v1/health')
    def health_check():
        """Health check probe for Render & Vercel."""
        try:
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'

        is_healthy = db_status == 'connected'
        return jsonify({
            'status': 'healthy' if is_healthy else 'degraded',
            'database': db_status,
            'websockets': 'enabled',
            'version': '2.0.0 (React + Flask + WebSockets)',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200 if is_healthy else 503

    # CLI Commands
    @app.cli.command('init-db')
    def init_db():
        with app.app_context():
            db.create_all()
            print("[SPMS 2.0] Database tables created successfully.")

    @app.cli.command('seed-db')
    def seed_db():
        with app.app_context():
            populate_sample_data()
            print("[SPMS 2.0] Database seeded successfully.")

    # Auto-initialize in development / production if needed
    if not app.config.get('TESTING', False):
        with app.app_context():
            try:
                db.create_all()
                populate_sample_data()
            except Exception as e:
                print(f"[SPMS 2.0] DB Init notice: {e}")

    return app


def populate_sample_data():
    """Populates realistic initial sample data with pre-seeded demo accounts."""
    if Department.query.first():
        return

    print("[SPMS 2.0] Seeding departments, companies, jobs, students, and demo accounts...")

    # 1. Departments
    dept_cse = Department(department_name='Computer Science & Engineering', department_code='CSE')
    dept_it = Department(department_name='Information Technology', department_code='IT')
    dept_ece = Department(department_name='Electronics & Communication Engineering', department_code='ECE')
    dept_me = Department(department_name='Mechanical Engineering', department_code='ME')
    dept_eee = Department(department_name='Electrical & Electronics Engineering', department_code='EEE')
    db.session.add_all([dept_cse, dept_it, dept_ece, dept_me, dept_eee])
    db.session.flush()

    # 2. Admin User
    admin = User(
        username='admin',
        email='placement.officer@college.edu',
        role='Admin'
    )
    admin.set_password('admin123')
    db.session.add(admin)

    # 3. Students
    students_data = [
        ('21CS001', 'Aarav', 'Sharma', 'aarav.sharma@college.edu', '9876543210', dept_cse.department_id, 2025, 9.40, 0),
        ('21CS002', 'Priya', 'Patel', 'priya.patel@college.edu', '9876543211', dept_cse.department_id, 2025, 8.85, 0),
        ('21CS003', 'Rohan', 'Verma', 'rohan.verma@college.edu', '9876543212', dept_cse.department_id, 2025, 7.60, 1),
        ('21CS004', 'Sneha', 'Reddy', 'sneha.reddy@college.edu', '9876543213', dept_cse.department_id, 2025, 9.15, 0),
        ('21IT001', 'Aditya', 'Nair', 'aditya.nair@college.edu', '9876543214', dept_it.department_id, 2025, 8.20, 0),
        ('21IT002', 'Ananya', 'Iyer', 'ananya.iyer@college.edu', '9876543215', dept_it.department_id, 2025, 9.05, 0),
        ('21EC001', 'Kavya', 'Menon', 'kavya.menon@college.edu', '9876543217', dept_ece.department_id, 2025, 8.45, 0),
        ('21ME001', 'Arjun', 'Kulkarni', 'arjun.kulkarni@college.edu', '9876543220', dept_me.department_id, 2025, 7.50, 0)
    ]
    created_students = []
    for roll, fn, ln, em, ph, dept_id, yr, cgpa, backlogs in students_data:
        st = Student(
            roll_number=roll, first_name=fn, last_name=ln, email=em, phone=ph,
            department_id=dept_id, graduation_year=yr, cgpa=Decimal(str(cgpa)),
            backlogs=backlogs, resume_url=f"https://storage.college.edu/resumes/{roll}.pdf"
        )
        db.session.add(st)
        created_students.append(st)
    db.session.flush()

    # User logins for students
    for st in created_students:
        username = st.email.split('@')[0]
        u = User(username=username, email=st.email, role='Student', student_id=st.student_id)
        u.set_password('student123')
        db.session.add(u)

    # 4. Companies
    companies_data = [
        ('Google India', 'Technology / Internet', 'https://careers.google.com', 'campus@google.com', '+91 80 6721 8000', 'Global tech leader in cloud, software, and AI.'),
        ('Microsoft India', 'Software / Cloud', 'https://careers.microsoft.com', 'campus@microsoft.com', '+91 80 4010 3000', 'World leader in Azure cloud systems and developer productivity.'),
        ('Amazon Web Services', 'Cloud / E-Commerce', 'https://amazon.jobs', 'campus@amazon.com', '+91 80 4344 0000', 'Pioneering cloud computing infrastructure and distributed systems.'),
        ('Tata Consultancy Services', 'IT Services / Consulting', 'https://www.tcs.com', 'campus@tcs.com', '+91 22 6778 9999', 'Global IT services and digital business solutions provider.')
    ]
    created_companies = []
    for name, ind, web, em, ph, desc in companies_data:
        comp = Company(company_name=name, industry=ind, website=web, contact_email=em, contact_phone=ph, company_description=desc)
        db.session.add(comp)
        created_companies.append(comp)
    db.session.flush()

    # 5. Jobs
    jobs_data = [
        (created_companies[0].company_id, 'Software Engineer - Campus', 'Build distributed cloud infrastructure and AI models.', 'Full-Time', 'Bangalore / Hyderabad', 8.50, 0, 32.00, date(2026, 12, 31), 'Open'),
        (created_companies[1].company_id, 'Software Development Engineer I', 'Develop Azure cloud solutions and developer tooling.', 'Full-Time', 'Hyderabad', 8.00, 0, 28.50, date(2026, 12, 25), 'Open'),
        (created_companies[2].company_id, 'Cloud Support Associate', 'Enterprise cloud architecture guidance on AWS.', 'Full-Time', 'Bangalore', 7.50, 0, 18.00, date(2026, 12, 15), 'Open'),
        (created_companies[3].company_id, 'Digital Software Developer', 'Next-gen software engineering and cloud-native applications.', 'Full-Time', 'Pan India', 7.00, 1, 7.50, date(2026, 12, 20), 'Open')
    ]
    created_jobs = []
    for cid, title, desc, jtype, loc, min_cgpa, max_b, sal, deadl, status in jobs_data:
        j = Job(
            company_id=cid, job_title=title, job_description=desc, job_type=jtype,
            location=loc, minimum_cgpa=Decimal(str(min_cgpa)), maximum_backlogs=max_b,
            salary_lpa=Decimal(str(sal)), application_deadline=deadl, job_status=status
        )
        db.session.add(j)
        created_jobs.append(j)
    db.session.flush()

    # 6. Applications & Document Verification Seed
    # Aarav Sharma - Selected at Google
    app1 = Application(student_id=created_students[0].student_id, job_id=created_jobs[0].job_id, application_status='Selected')
    # Priya Patel - Interview Scheduled at Google, Selected at Microsoft
    app2 = Application(student_id=created_students[1].student_id, job_id=created_jobs[0].job_id, application_status='Interview Scheduled')
    app3 = Application(student_id=created_students[1].student_id, job_id=created_jobs[1].job_id, application_status='Selected')
    # Rohan Verma - Pending TPO Verification at TCS
    app4 = Application(student_id=created_students[2].student_id, job_id=created_jobs[3].job_id, application_status='Pending TPO Verification')
    # Sneha Reddy - TPO Approved at AWS
    app5 = Application(student_id=created_students[3].student_id, job_id=created_jobs[2].job_id, application_status='TPO Approved')
    db.session.add_all([app1, app2, app3, app4, app5])
    db.session.flush()

    # Documents for verification queue
    doc1 = Document(
        student_id=created_students[2].student_id,
        application_id=app4.application_id,
        document_type='Grade Transcript',
        file_name='Rohan_Verma_Sem6_Transcript.pdf',
        file_path='demo_transcript_rohan.pdf',
        verification_status='Pending',
        file_size_bytes=425000,
        mime_type='application/pdf'
    )
    doc2 = Document(
        student_id=created_students[3].student_id,
        application_id=app5.application_id,
        document_type='Resume',
        file_name='Sneha_Reddy_Resume_2026.pdf',
        file_path='demo_resume_sneha.pdf',
        verification_status='Verified',
        verified_by='admin',
        file_size_bytes=312000,
        mime_type='application/pdf',
        verified_at=datetime.now(timezone.utc)
    )
    db.session.add_all([doc1, doc2])

    # 7. Placements
    plc1 = Placement(
        student_id=created_students[0].student_id,
        job_id=created_jobs[0].job_id,
        company_id=created_companies[0].company_id,
        offer_date=date(2026, 10, 1),
        package_lpa=Decimal('32.00'),
        placement_status='Accepted'
    )
    plc2 = Placement(
        student_id=created_students[1].student_id,
        job_id=created_jobs[1].job_id,
        company_id=created_companies[1].company_id,
        offer_date=date(2026, 10, 15),
        package_lpa=Decimal('28.50'),
        placement_status='Accepted'
    )
    db.session.add_all([plc1, plc2])

    # 8. Notifications
    n1 = Notification(
        recipient_role='Admin',
        title='Document Awaiting Verification',
        message='Rohan Verma submitted Grade Transcript for TCS drive.',
        type='warning',
        link='/admin/documents'
    )
    n2 = Notification(
        user_id=2,  # Aarav
        title='Placement Offer Confirmed! 🎉',
        message='Google India offer of 32.00 LPA has been finalized.',
        type='success',
        link='/applications'
    )
    db.session.add_all([n1, n2])

    db.session.commit()
    print("[SPMS 2.0] Seed data successfully generated!")


def get_app():
    return create_app()


if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
