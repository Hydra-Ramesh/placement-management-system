import pytest
from datetime import date, timedelta
from decimal import Decimal
from src.app import create_app
from src.extensions import db
from src.models import (
    Department, Student, User, Company, Job,
    Application, Interview, Placement, Document
)


@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()

        # Seed test department
        dept = Department(department_name='Computer Science & Engineering', department_code='CSE')
        db.session.add(dept)
        db.session.flush()

        # Seed admin user
        admin = User(username='admin', email='admin@college.edu', role='Admin')
        admin.set_password('admin123')
        db.session.add(admin)

        # Seed student user
        student = Student(
            roll_number='21CS100',
            first_name='Aryan',
            last_name='Kapoor',
            email='aryan@college.edu',
            phone='9876500000',
            department_id=dept.department_id,
            graduation_year=2025,
            cgpa=Decimal('8.75'),
            backlogs=0
        )
        db.session.add(student)
        db.session.flush()

        student_user = User(
            username='aryan',
            email='aryan@college.edu',
            role='Student',
            student_id=student.student_id
        )
        student_user.set_password('student123')
        db.session.add(student_user)

        # Seed company & job
        company = Company(
            company_name='TestCorp Labs',
            industry='Cloud Computing',
            contact_email='careers@testcorp.com'
        )
        db.session.add(company)
        db.session.flush()

        job = Job(
            company_id=company.company_id,
            job_title='Software Engineer',
            job_type='Full-Time',
            location='Bangalore',
            minimum_cgpa=Decimal('7.50'),
            maximum_backlogs=0,
            salary_lpa=Decimal('18.00'),
            application_deadline=date.today() + timedelta(days=30),
            job_status='Open',
            requires_doc_verification=True
        )
        db.session.add(job)
        db.session.commit()

        yield app.test_client()


def get_token(client, username, password):
    res = client.post('/api/v1/auth/login', json={'username': username, 'password': password})
    return res.get_json()['token']


def test_auth_login(client):
    """Test user authentication and token generation."""
    res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'token' in data
    assert data['user']['role'] == 'Admin'


def test_rbac_protection(client):
    """Test RBAC blocks students from admin endpoints."""
    student_token = get_token(client, 'aryan', 'student123')
    headers = {'Authorization': f'Bearer {student_token}'}

    # Student accessing admin pending documents queue
    res = client.get('/api/v1/documents/pending', headers=headers)
    assert res.status_code == 403


def test_job_eligibility_and_apply(client):
    """Test student application and academic eligibility computation."""
    student_token = get_token(client, 'aryan', 'student123')
    headers = {'Authorization': f'Bearer {student_token}'}

    # Verify jobs listing computes student eligibility
    jobs_res = client.get('/api/v1/jobs', headers=headers)
    assert jobs_res.status_code == 200
    jobs_data = jobs_res.get_json()['jobs']
    assert len(jobs_data) == 1
    assert jobs_data[0]['is_eligible'] is True

    # Apply for job
    job_id = jobs_data[0]['job_id']
    apply_res = client.post('/api/v1/applications/apply', json={'job_id': job_id}, headers=headers)
    assert apply_res.status_code == 201
    app_data = apply_res.get_json()['application']
    assert app_data['application_status'] == 'Pending TPO Verification'


def test_document_verification_workflow(client):
    """Test student uploads document and admin verifies it."""
    student_token = get_token(client, 'aryan', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    # Student applies for job first
    client.post('/api/v1/applications/apply', json={'job_id': 1}, headers={'Authorization': f'Bearer {student_token}'})

    # Student uploads transcript
    import io
    file_content = b"%PDF-1.4 Mock Transcript Content"
    data = {
        'file': (io.BytesIO(file_content), 'transcript.pdf'),
        'document_type': 'Grade Transcript',
        'application_id': 1
    }
    upload_res = client.post(
        '/api/v1/documents/upload',
        data=data,
        content_type='multipart/form-data',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.get_json()['document']['document_id']

    # Admin checks pending verification queue
    pending_res = client.get('/api/v1/documents/pending', headers={'Authorization': f'Bearer {admin_token}'})
    assert pending_res.status_code == 200
    assert len(pending_res.get_json()['documents']) >= 1

    # Admin verifies document
    verify_res = client.post(
        f'/api/v1/documents/{doc_id}/verify',
        json={'action': 'Verified', 'notes': 'All semester marksheets authenticated.'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert verify_res.status_code == 200
    doc_data = verify_res.get_json()['document']
    assert doc_data['verification_status'] == 'Verified'
    assert doc_data['verified_by'] == 'admin'


def test_placement_selection_acid_transaction(client):
    """Test candidate selection and placement offer creation."""
    student_token = get_token(client, 'aryan', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    client.post('/api/v1/applications/apply', json={'job_id': 1}, headers={'Authorization': f'Bearer {student_token}'})

    # Admin selects candidate
    select_res = client.post(
        '/api/v1/placements/select',
        json={'application_id': 1, 'package_lpa': 18.00},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert select_res.status_code == 201
    plc = select_res.get_json()['placement']
    assert plc['package_lpa'] == 18.00
    assert plc['placement_status'] == 'Accepted'

    # Duplicate selection should be blocked
    dup_res = client.post(
        '/api/v1/placements/select',
        json={'application_id': 1, 'package_lpa': 18.00},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert dup_res.status_code == 409


def test_tpo_verification_and_student_confirm_lifecycle(client):
    """Test full TPO verification clearance and student confirmation flow."""
    student_token = get_token(client, 'aryan', 'student123')
    admin_token = get_token(client, 'admin', 'admin123')

    # 1. Student requests application clearance
    apply_res = client.post(
        '/api/v1/applications/apply',
        json={'job_id': 1},
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert apply_res.status_code == 201
    app_id = apply_res.get_json()['application']['application_id']
    assert apply_res.get_json()['application']['application_status'] == 'Pending TPO Verification'

    # Student cannot confirm before TPO verifies
    premature_confirm = client.post(
        f'/api/v1/applications/{app_id}/confirm-apply',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert premature_confirm.status_code == 400

    # 2. TPO verifies documents and approves student
    tpo_res = client.post(
        f'/api/v1/applications/{app_id}/tpo-verify',
        json={'action': 'Approve', 'notes': 'CGPA 8.75 and transcripts verified.'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert tpo_res.status_code == 200
    assert tpo_res.get_json()['application']['application_status'] == 'TPO Approved'

    # 3. Student confirms and finalizes application
    confirm_res = client.post(
        f'/api/v1/applications/{app_id}/confirm-apply',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert confirm_res.status_code == 200
    assert confirm_res.get_json()['application']['application_status'] == 'Applied'

