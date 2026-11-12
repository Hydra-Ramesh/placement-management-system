import os
import pytest
import io
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from sqlalchemy.exc import IntegrityError

from src.app import create_app
from src.extensions import db
from src.models import (
    Department, Student, User, Company, Job,
    Application, Interview, Placement, Document, AuditLog
)


@pytest.fixture
def app():
    """Create and configure an isolated application instance for testing."""
    test_app = create_app('testing')

    with test_app.app_context():
        db.create_all()

        # Seed baseline test entities
        dept = Department(department_name='Computer Science & Engineering', department_code='CSE')
        db.session.add(dept)
        db.session.flush()

        admin = User(username='admin', email='admin@test.edu', role='Admin')
        admin.set_password('admin123')
        db.session.add(admin)

        student = Student(
            roll_number='21CS999',
            first_name='Test',
            last_name='Student',
            email='student@test.edu',
            phone='9999999999',
            department_id=dept.department_id,
            graduation_year=2025,
            cgpa=Decimal('8.50'),
            backlogs=0
        )
        db.session.add(student)
        db.session.flush()

        student_user = User(
            username='teststudent',
            email='student@test.edu',
            role='Student',
            student_id=student.student_id
        )
        student_user.set_password('student123')
        db.session.add(student_user)

        company = Company(
            company_name='TestCorp Labs',
            industry='Cloud Computing',
            contact_email='recruiter@testcorp.com'
        )
        db.session.add(company)
        db.session.flush()

        # Active Job
        job_active = Job(
            company_id=company.company_id,
            job_title='Software Engineer',
            job_type='Full-Time',
            location='Bangalore',
            minimum_cgpa=Decimal('7.50'),
            maximum_backlogs=0,
            salary_lpa=Decimal('15.00'),
            application_deadline=date.today() + timedelta(days=30),
            job_status='Open',
            requires_doc_verification=True
        )

        # High CGPA Job
        job_high_cgpa = Job(
            company_id=company.company_id,
            job_title='AI Research Scientist',
            job_type='Full-Time',
            minimum_cgpa=Decimal('9.50'),
            maximum_backlogs=0,
            salary_lpa=Decimal('35.00'),
            application_deadline=date.today() + timedelta(days=20),
            job_status='Open'
        )

        # Closed Job
        job_closed = Job(
            company_id=company.company_id,
            job_title='Closed Role',
            job_type='Full-Time',
            minimum_cgpa=Decimal('6.00'),
            maximum_backlogs=1,
            salary_lpa=Decimal('8.00'),
            application_deadline=date.today() + timedelta(days=10),
            job_status='Closed'
        )

        db.session.add_all([job_active, job_high_cgpa, job_closed])
        db.session.commit()

        yield test_app


@pytest.fixture
def client(app):
    return app.test_client()


def get_token(client, username, password):
    res = client.post('/api/v1/auth/login', json={'username': username, 'password': password})
    return res.get_json()['token']


# 1. Health Probe Test
def test_health_check(client):
    res = client.get('/api/v1/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'healthy'
    assert data['websockets'] == 'enabled'


# 2. User Authentication & Password Hashing
def test_password_hashing(app):
    with app.app_context():
        user = User(username='hashtest', email='hash@test.edu', role='Student')
        user.set_password('securepassword')
        assert user.password_hash != 'securepassword'
        assert user.check_password('securepassword') is True
        assert user.check_password('wrongpassword') is False


# 3. JWT Login & Profile Retrieval
def test_jwt_auth_flow(client):
    res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert res.status_code == 200
    token = res.get_json()['token']
    assert token is not None

    # Access /api/v1/auth/me
    headers = {'Authorization': f'Bearer {token}'}
    me_res = client.get('/api/v1/auth/me', headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()['user']['username'] == 'admin'


# 4. Student Registration Validation
def test_student_registration_validation(client, app):
    with app.app_context():
        dept = Department.query.first()

        # Invalid CGPA (out of bounds)
        res_invalid_cgpa = client.post('/api/v1/auth/register', json={
            'username': 'newuser1',
            'email': 'new1@test.edu',
            'password': 'password123',
            'roll_number': '21CS050',
            'first_name': 'New',
            'last_name': 'User',
            'department_id': dept.department_id,
            'graduation_year': 2026,
            'cgpa': '11.5',
            'backlogs': 0
        })
        assert res_invalid_cgpa.status_code == 400
        assert 'CGPA must be between' in res_invalid_cgpa.get_json()['message']

        # Valid registration
        res_valid = client.post('/api/v1/auth/register', json={
            'username': 'newuser2',
            'email': 'new2@test.edu',
            'password': 'password123',
            'roll_number': '21CS051',
            'first_name': 'Valid',
            'last_name': 'User',
            'department_id': dept.department_id,
            'graduation_year': 2026,
            'cgpa': '8.25',
            'backlogs': 0
        })
        assert res_valid.status_code == 201
        assert res_valid.get_json()['success'] is True


# 5. Role-Based Access Control (RBAC)
def test_rbac_admin_endpoint_restriction(client):
    student_token = get_token(client, 'teststudent', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    # Student cannot view admin document verification queue
    res_student = client.get('/api/v1/documents/pending', headers={'Authorization': f'Bearer {student_token}'})
    assert res_student.status_code == 403

    # Admin can view it
    res_admin = client.get('/api/v1/documents/pending', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_admin.status_code == 200


# 6. Academic Eligibility Calculation
def test_job_eligibility_logic(client):
    student_token = get_token(client, 'teststudent', 'student123')
    headers = {'Authorization': f'Bearer {student_token}'}

    res = client.get('/api/v1/jobs', headers=headers)
    assert res.status_code == 200
    jobs = res.get_json()['jobs']

    # Software Engineer: requires 7.50, student has 8.50 -> Eligible
    se_job = next(j for j in jobs if j['job_title'] == 'Software Engineer')
    assert se_job['is_eligible'] is True

    # AI Research: requires 9.50, student has 8.50 -> Ineligible
    ai_job = next(j for j in jobs if j['job_title'] == 'AI Research Scientist')
    assert ai_job['is_eligible'] is False
    assert 'CGPA requirement not met' in ai_job['eligibility_reason']


# 7. Document Upload & Admin Verification Workflow
def test_document_verification_lifecycle(client):
    student_token = get_token(client, 'teststudent', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    # Student applies for job
    apply_res = client.post(
        '/api/v1/applications/apply',
        json={'job_id': 1},
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert apply_res.status_code == 201
    app_id = apply_res.get_json()['application']['application_id']

    # Student uploads transcript
    file_content = b"%PDF-1.4 Mock Transcript For Test"
    upload_res = client.post(
        '/api/v1/documents/upload',
        data={
            'file': (io.BytesIO(file_content), 'transcript_sem6.pdf'),
            'document_type': 'Grade Transcript',
            'application_id': app_id
        },
        content_type='multipart/form-data',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.get_json()['document']['document_id']

    # Admin verifies document
    verify_res = client.post(
        f'/api/v1/documents/{doc_id}/verify',
        json={'action': 'Verified', 'notes': 'Official university seal confirmed.'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert verify_res.status_code == 200
    doc_data = verify_res.get_json()['document']
    assert doc_data['verification_status'] == 'Verified'
    assert doc_data['verified_by'] == 'admin'

    # Verify application status automatically transitioned to TPO Approved
    app_res = client.get(f'/api/v1/applications/{app_id}', headers={'Authorization': f'Bearer {student_token}'})
    assert app_res.get_json()['application']['application_status'] == 'TPO Approved'

    # Now student confirms application
    confirm_res = client.post(
        f'/api/v1/applications/{app_id}/confirm-apply',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert confirm_res.status_code == 200
    assert confirm_res.get_json()['application']['application_status'] == 'Applied'


# 8. Duplicate Application Prevention
def test_duplicate_application_blocked(client):
    student_token = get_token(client, 'teststudent', 'student123')
    headers = {'Authorization': f'Bearer {student_token}'}

    # First application
    res1 = client.post('/api/v1/applications/apply', json={'job_id': 1}, headers=headers)
    assert res1.status_code == 201

    # Second application to same job
    res2 = client.post('/api/v1/applications/apply', json={'job_id': 1}, headers=headers)
    assert res2.status_code == 409
    assert 'already applied' in res2.get_json()['message'].lower()


# 9. Interview Scheduling
def test_interview_scheduling(client):
    student_token = get_token(client, 'teststudent', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    client.post('/api/v1/applications/apply', json={'job_id': 1}, headers={'Authorization': f'Bearer {student_token}'})

    schedule_res = client.post(
        '/api/v1/interviews/schedule',
        json={
            'application_id': 1,
            'interview_round': 'Technical Round 1',
            'interview_date': '2026-11-20T10:00:00',
            'interview_mode': 'Online',
            'interview_location': 'https://meet.google.com/test-room'
        },
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert schedule_res.status_code == 201
    assert schedule_res.get_json()['interview']['interview_round'] == 'Technical Round 1'


# 10. Placement Selection & Offer ACID Transaction
def test_placement_selection_acid(client):
    student_token = get_token(client, 'teststudent', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    client.post('/api/v1/applications/apply', json={'job_id': 1}, headers={'Authorization': f'Bearer {student_token}'})

    # Admin issues placement offer
    select_res = client.post(
        '/api/v1/placements/select',
        json={'application_id': 1, 'package_lpa': 15.00},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert select_res.status_code == 201
    plc = select_res.get_json()['placement']
    assert plc['package_lpa'] == 15.00
    assert plc['placement_status'] == 'Accepted'

    # Verify student is now marked as placed
    me_res = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {student_token}'})
    assert me_res.status_code == 200


# 11. Analytics & Reports API
def test_analytics_and_reports_api(client):
    admin_token = get_token(client, 'admin', 'admin123')
    headers = {'Authorization': f'Bearer {admin_token}'}

    dash_res = client.get('/api/v1/analytics/dashboard')
    assert dash_res.status_code == 200
    dash_data = dash_res.get_json()
    assert 'metrics' in dash_data
    assert 'charts' in dash_data

    reports_res = client.get('/api/v1/analytics/reports', headers=headers)
    assert reports_res.status_code == 200
    rep_data = reports_res.get_json()
    assert 'department_report' in rep_data
    assert 'company_report' in rep_data
    assert 'audit_logs' in rep_data
