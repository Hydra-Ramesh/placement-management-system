from datetime import datetime, date
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_, desc
from src.extensions import db
from src.models.job import Job
from src.models.company import Company
from src.models.student import Student
from src.models.application import Application
from src.features.auth.decorators import token_required, roles_required
from src.websocket.emitter import broadcast_all, create_and_send_notification

jobs_bp = Blueprint('jobs_api', __name__, url_prefix='/api/v1/jobs')


@jobs_bp.route('', methods=['GET'])
def list_jobs():
    """Returns active job listings with optional filtering and student eligibility check."""
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id', type=int)
    job_type = request.args.get('job_type', '').strip()
    location = request.args.get('location', '').strip()
    status_filter = request.args.get('status', 'Open').strip()
    min_salary = request.args.get('min_salary', type=float)

    query = Job.query.join(Company)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Job.job_title.ilike(pattern),
                Company.company_name.ilike(pattern),
                Job.location.ilike(pattern)
            )
        )
    if company_id:
        query = query.filter(Job.company_id == company_id)
    if job_type:
        query = query.filter(Job.job_type == job_type)
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if status_filter and status_filter != 'All':
        query = query.filter(Job.job_status == status_filter)
    if min_salary:
        query = query.filter(Job.salary_lpa >= min_salary)

    jobs = query.order_by(desc(Job.job_status == 'Open'), desc(Job.salary_lpa)).all()

    # Check if student is calling (via optional token)
    student = None
    applied_job_ids = {}
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            import jwt
            from flask import current_app
            from src.models.user import User
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                payload = jwt.decode(parts[1], current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                user = db.session.get(User, payload.get('user_id'))
                if user and user.is_student:
                    student = user.student
                    if student:
                        for app in student.applications:
                            applied_job_ids[app.job_id] = {
                                'application_id': app.application_id,
                                'status': app.application_status
                            }
        except Exception:
            pass

    results = []
    for j in jobs:
        d = j.to_dict(student=student)
        if j.job_id in applied_job_ids:
            d['user_application'] = applied_job_ids[j.job_id]
        else:
            d['user_application'] = None
        results.append(d)

    return jsonify({
        'success': True,
        'count': len(results),
        'jobs': results
    })


@jobs_bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Retrieves full details for a single job opening."""
    job = db.get_or_404(Job, job_id)
    
    student = None
    user_app = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            import jwt
            from flask import current_app
            from src.models.user import User
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                payload = jwt.decode(parts[1], current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                user = db.session.get(User, payload.get('user_id'))
                if user and user.is_student and user.student:
                    student = user.student
                    app_obj = Application.query.filter_by(student_id=student.student_id, job_id=job.job_id).first()
                    if app_obj:
                        user_app = app_obj.to_dict()
        except Exception:
            pass

    job_dict = job.to_dict(student=student)
    job_dict['user_application'] = user_app

    return jsonify({
        'success': True,
        'job': job_dict
    })


@jobs_bp.route('', methods=['POST'])
@roles_required('Admin')
def create_job():
    """Creates a new campus recruitment drive."""
    data = request.get_json() or {}
    company_id = data.get('company_id')
    job_title = data.get('job_title', '').strip()
    job_description = data.get('job_description', '').strip()
    job_type = data.get('job_type', 'Full-Time')
    location = data.get('location', '').strip()
    minimum_cgpa = data.get('minimum_cgpa', 0.0)
    maximum_backlogs = data.get('maximum_backlogs', 0)
    salary_lpa = data.get('salary_lpa')
    application_deadline = data.get('application_deadline')
    requires_doc_verification = data.get('requires_doc_verification', True)

    if not all([company_id, job_title, salary_lpa, application_deadline]):
        return jsonify({'success': False, 'message': 'Company, title, package, and deadline are required.'}), 400

    try:
        deadline_date = datetime.strptime(application_deadline, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format for deadline. Use YYYY-MM-DD.'}), 400

    try:
        new_job = Job(
            company_id=int(company_id),
            job_title=job_title,
            job_description=job_description,
            job_type=job_type,
            location=location or 'Flexible / Hybrid',
            minimum_cgpa=Decimal(str(minimum_cgpa)),
            maximum_backlogs=int(maximum_backlogs),
            salary_lpa=Decimal(str(salary_lpa)),
            application_deadline=deadline_date,
            job_status='Open',
            requires_doc_verification=bool(requires_doc_verification)
        )
        db.session.add(new_job)
        db.session.commit()

        # Broadcast new recruitment drive to all students over WebSockets
        company_name = new_job.company.company_name if new_job.company else 'Top Tier Recruiter'
        create_and_send_notification(
            recipient_role='Student',
            title='New Job Opening Published! 🚀',
            message=f"{company_name} is hiring for '{job_title}' offering {new_job.salary_lpa} LPA.",
            notif_type='success',
            link=f'/jobs/{new_job.job_id}'
        )
        broadcast_all('job_posted', new_job.to_dict())

        return jsonify({
            'success': True,
            'message': 'Job opening published successfully!',
            'job': new_job.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to create job drive: {str(e)}'}), 500


@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@roles_required('Admin')
def update_job(job_id):
    """Updates an existing job drive."""
    job = db.get_or_404(Job, job_id)
    data = request.get_json() or {}

    if 'job_title' in data:
        job.job_title = data['job_title'].strip()
    if 'job_description' in data:
        job.job_description = data['job_description'].strip()
    if 'job_type' in data:
        job.job_type = data['job_type']
    if 'location' in data:
        job.location = data['location'].strip()
    if 'minimum_cgpa' in data:
        job.minimum_cgpa = Decimal(str(data['minimum_cgpa']))
    if 'maximum_backlogs' in data:
        job.maximum_backlogs = int(data['maximum_backlogs'])
    if 'salary_lpa' in data:
        job.salary_lpa = Decimal(str(data['salary_lpa']))
    if 'job_status' in data:
        job.job_status = data['job_status']
    if 'application_deadline' in data:
        job.application_deadline = datetime.strptime(data['application_deadline'], '%Y-%m-%d').date()

    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Job details updated successfully.', 'job': job.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating job: {str(e)}'}), 500
