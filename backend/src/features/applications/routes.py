from datetime import datetime, date, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from src.extensions import db
from src.models.application import Application
from src.models.job import Job
from src.models.student import Student
from src.models.document import Document
from src.models.audit import AuditLog
from src.features.auth.decorators import token_required, roles_required
from src.websocket.emitter import create_and_send_notification, emit_to_role, emit_to_user

applications_bp = Blueprint('applications_api', __name__, url_prefix='/api/v1/applications')


@applications_bp.route('/apply', methods=['POST'])
@roles_required('Student')
def apply():
    """
    Submits a job application with document attachments.
    Enforces academic eligibility, deadline verification, and duplicate check.
    """
    student = g.current_user.student
    if not student:
        return jsonify({'success': False, 'message': 'Complete your student profile before applying.'}), 400

    data = request.get_json() or {}
    job_id = data.get('job_id')
    resume_url = data.get('resume_url', student.resume_url)
    document_ids = data.get('document_ids', [])

    if not job_id:
        return jsonify({'success': False, 'message': 'Job ID is required.'}), 400

    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({'success': False, 'message': 'Job opening not found.'}), 404

    if job.job_status != 'Open':
        return jsonify({'success': False, 'message': 'Cannot apply: This job posting is closed.'}), 400

    if job.application_deadline < date.today():
        return jsonify({'success': False, 'message': f'Cannot apply: The deadline ({job.application_deadline}) has passed.'}), 400

    # Eligibility check
    is_eligible, reason = job.check_eligibility(student)
    if not is_eligible:
        return jsonify({'success': False, 'message': f'Academic eligibility not met: {reason}'}), 400

    # Duplicate check
    existing_app = Application.query.filter_by(student_id=student.student_id, job_id=job.job_id).first()
    if existing_app:
        return jsonify({'success': False, 'message': 'You have already applied for this opening.'}), 409

    try:
        initial_status = 'Pending TPO Verification' if job.requires_doc_verification else 'Applied'

        application = Application(
            student_id=student.student_id,
            job_id=job.job_id,
            application_status=initial_status,
            resume_url=resume_url,
            application_date=datetime.now(timezone.utc)
        )
        db.session.add(application)
        db.session.flush()

        # Link any existing student documents to this application
        if document_ids:
            for doc_id in document_ids:
                doc = db.session.get(Document, doc_id)
                if doc and doc.student_id == student.student_id:
                    doc.application_id = application.application_id

        # Audit log
        audit = AuditLog(
            table_name='applications',
            record_id=application.application_id,
            action='INSERT',
            old_values=None,
            new_values=f"Student {student.roll_number} submitted application request for Job '{job.job_title}' at {job.company.company_name} (Status: {initial_status})",
            changed_by=student.roll_number
        )
        db.session.add(audit)
        db.session.commit()

        # Real-time WebSocket alerts to Admin/TPO
        create_and_send_notification(
            recipient_role='Admin',
            title='Drive Application Request',
            message=f"{student.full_name} ({student.department.department_code if student.department else ''}) requested clearance for '{job.job_title}' at {job.company.company_name} awaiting TPO verification.",
            notif_type='info',
            link='/admin/documents'
        )
        emit_to_role('Admin', 'application_received', application.to_dict())

        return jsonify({
            'success': True,
            'message': 'Application request submitted to TPO! Your documents are currently awaiting Placement Cell verification.',
            'application': application.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to submit application: {str(e)}'}), 500


@applications_bp.route('/mine', methods=['GET'])
@roles_required('Student')
def get_my_applications():
    """Retrieves all applications submitted by the logged-in student."""
    student = g.current_user.student
    if not student:
        return jsonify({'success': True, 'applications': []})

    apps = student.applications.order_by(Application.application_date.desc()).all()
    return jsonify({
        'success': True,
        'count': len(apps),
        'applications': [a.to_dict() for a in apps]
    })


@applications_bp.route('/all', methods=['GET'])
@roles_required('Admin')
def get_all_applications():
    """Admin endpoint: lists all student applications with filters."""
    job_id = request.args.get('job_id', type=int)
    status_filter = request.args.get('status', '').strip()
    student_id = request.args.get('student_id', type=int)

    query = Application.query
    if job_id:
        query = query.filter(Application.job_id == job_id)
    if status_filter:
        query = query.filter(Application.application_status == status_filter)
    if student_id:
        query = query.filter(Application.student_id == student_id)

    apps = query.order_by(Application.application_date.desc()).all()
    return jsonify({
        'success': True,
        'count': len(apps),
        'applications': [a.to_dict() for a in apps]
    })


@applications_bp.route('/<int:application_id>', methods=['GET'])
@token_required
def get_application(application_id):
    """Retrieves application detail with attached documents and interviews."""
    app_obj = db.get_or_404(Application, application_id)
    user = g.current_user

    if not user.is_admin and user.student_id != app_obj.student_id:
        return jsonify({'success': False, 'message': 'Access forbidden.'}), 403

    return jsonify({
        'success': True,
        'application': app_obj.to_dict()
    })


@applications_bp.route('/<int:application_id>/status', methods=['POST'])
@roles_required('Admin')
def update_application_status(application_id):
    """Admin updates candidate progression status."""
    app_obj = db.get_or_404(Application, application_id)
    data = request.get_json() or {}
    new_status = data.get('status', '').strip()

    valid_statuses = (
        'Applied', 'Pending Document Verification', 'Pending TPO Verification',
        'TPO Approved', 'Documents Verified',
        'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Withdrawn'
    )
    if new_status not in valid_statuses:
        return jsonify({'success': False, 'message': f"Invalid status '{new_status}'."}), 400

    try:
        old_status = app_obj.application_status
        app_obj.application_status = new_status
        app_obj.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            table_name='applications',
            record_id=app_obj.application_id,
            action='STATUS_CHANGE',
            old_values=f"status: {old_status}",
            new_values=f"status: {new_status}",
            changed_by=g.current_user.username
        )
        db.session.add(audit)
        db.session.commit()

        # Send real-time notification to the candidate
        student_user = app_obj.student.user if app_obj.student else None
        student_user_id = student_user.user_id if student_user else None

        notif_type = 'success' if new_status in ('Documents Verified', 'TPO Approved', 'Shortlisted', 'Selected') else 'info'
        create_and_send_notification(
            user_id=student_user_id,
            title='Application Status Updated',
            message=f"Your application for '{app_obj.job.job_title}' at {app_obj.job.company.company_name} is now: {new_status}.",
            notif_type=notif_type,
            link='/applications'
        )
        if student_user_id:
            emit_to_user(student_user_id, 'application_status_changed', app_obj.to_dict())

        return jsonify({
            'success': True,
            'message': f"Application status updated to '{new_status}'.",
            'application': app_obj.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database error updating application: {str(e)}'}), 500


@applications_bp.route('/<int:application_id>/tpo-verify', methods=['POST'])
@roles_required('Admin')
def tpo_verify_application(application_id):
    """
    TPO (Admin) reviews and verifies student credentials for a job application.
    Actions:
      - 'Approve': Approves student credentials and unlocks student to confirm/apply ('TPO Approved').
      - 'Approve_And_Apply': Approves credentials and directly enters student into applied pool ('Applied').
      - 'Reject': Denies application clearance with review notes ('Rejected').
    """
    app_obj = db.get_or_404(Application, application_id)
    data = request.get_json() or {}
    action = data.get('action', 'Approve').strip()
    notes = data.get('notes', '').strip()

    valid_actions = ('Approve', 'Approve_And_Apply', 'Reject')
    if action not in valid_actions:
        return jsonify({'success': False, 'message': f"Invalid action '{action}'. Valid: {valid_actions}"}), 400

    try:
        old_status = app_obj.application_status
        new_status = 'TPO Approved' if action == 'Approve' else ('Applied' if action == 'Approve_And_Apply' else 'Rejected')
        
        app_obj.application_status = new_status
        app_obj.doc_verification_notes = notes or (
            'Verified and approved by TPO.' if 'Approve' in action else 'Rejected during TPO verification.'
        )
        app_obj.updated_at = datetime.now(timezone.utc)

        # Update verification status on all attached documents
        if 'Approve' in action:
            for doc in app_obj.documents.all():
                doc.verification_status = 'Verified'
                doc.verified_by = g.current_user.username
                doc.verified_at = datetime.now(timezone.utc)
                doc.verification_notes = notes or 'Verified during drive clearance.'
        elif action == 'Reject':
            for doc in app_obj.documents.all():
                if doc.verification_status == 'Pending':
                    doc.verification_status = 'Rejected'
                    doc.verified_by = g.current_user.username
                    doc.verified_at = datetime.now(timezone.utc)
                    doc.verification_notes = notes

        # Audit log
        audit = AuditLog(
            table_name='applications',
            record_id=app_obj.application_id,
            action='TPO_VERIFICATION',
            old_values=f"status: {old_status}",
            new_values=f"status: {new_status} | action: {action} | notes: {notes}",
            changed_by=g.current_user.username
        )
        db.session.add(audit)
        db.session.commit()

        # Send real-time notification to the student
        student_user = app_obj.student.user if app_obj.student else None
        student_user_id = student_user.user_id if student_user else None

        if action == 'Approve':
            notif_msg = f"TPO has verified your documents and approved your request for '{app_obj.job.job_title}' at {app_obj.job.company.company_name}! You can now finalize and submit your application."
            notif_type = 'success'
        elif action == 'Approve_And_Apply':
            notif_msg = f"TPO has verified your documents and officially registered your application for '{app_obj.job.job_title}' at {app_obj.job.company.company_name}."
            notif_type = 'success'
        else:
            notif_msg = f"Your application clearance for '{app_obj.job.job_title}' was rejected by TPO: {notes or 'Please contact Placement Cell.'}"
            notif_type = 'danger'

        create_and_send_notification(
            user_id=student_user_id,
            title='TPO Verification Update',
            message=notif_msg,
            notif_type=notif_type,
            link='/applications'
        )
        if student_user_id:
            emit_to_user(student_user_id, 'application_status_changed', app_obj.to_dict())

        return jsonify({
            'success': True,
            'message': f"Application {action}d successfully. Current status: '{new_status}'.",
            'application': app_obj.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to process TPO verification: {str(e)}'}), 500


@applications_bp.route('/<int:application_id>/confirm-apply', methods=['POST'])
@roles_required('Student')
def confirm_application(application_id):
    """
    Student submits/confirms final application after TPO has verified credentials and approved.
    Requires status == 'TPO Approved'.
    """
    app_obj = db.get_or_404(Application, application_id)
    student = g.current_user.student

    if not student or app_obj.student_id != student.student_id:
        return jsonify({'success': False, 'message': 'Access forbidden: Not your application.'}), 403

    if app_obj.application_status != 'TPO Approved':
        return jsonify({
            'success': False,
            'message': f"Cannot confirm application: Application is currently in '{app_obj.application_status}' status. TPO must verify and approve first."
        }), 400

    try:
        old_status = app_obj.application_status
        app_obj.application_status = 'Applied'
        app_obj.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            table_name='applications',
            record_id=app_obj.application_id,
            action='CONFIRM_APPLICATION',
            old_values=f"status: {old_status}",
            new_values="status: Applied",
            changed_by=student.roll_number
        )
        db.session.add(audit)
        db.session.commit()

        # Real-time WebSocket alerts to Admin
        create_and_send_notification(
            recipient_role='Admin',
            title='Application Confirmed by Student',
            message=f"{student.full_name} has confirmed their TPO-cleared application for '{app_obj.job.job_title}' at {app_obj.job.company.company_name}.",
            notif_type='success',
            link='/admin/applications'
        )
        emit_to_role('Admin', 'application_status_changed', app_obj.to_dict())

        return jsonify({
            'success': True,
            'message': f"Application for '{app_obj.job.job_title}' at {app_obj.job.company.company_name} is now officially confirmed!",
            'application': app_obj.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to confirm application: {str(e)}'}), 500
