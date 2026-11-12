from datetime import datetime, date, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from src.extensions import db
from src.models.placement import Placement
from src.models.application import Application
from src.models.audit import AuditLog
from src.features.auth.decorators import token_required, roles_required
from src.websocket.emitter import create_and_send_notification, broadcast_all, emit_to_user

placements_bp = Blueprint('placements_api', __name__, url_prefix='/api/v1/placements')


@placements_bp.route('/select', methods=['POST'])
@roles_required('Admin')
def select_candidate():
    """
    ACID Transaction:
    Selects candidate, generates placement offer, records audit history,
    and announces placement across WebSockets.
    """
    data = request.get_json() or {}
    application_id = data.get('application_id')
    package_lpa = data.get('package_lpa')
    offer_date_str = data.get('offer_date')
    placement_status = data.get('placement_status', 'Accepted')

    if not application_id:
        return jsonify({'success': False, 'message': 'Application ID is required.'}), 400

    application = db.session.get(Application, application_id)
    if not application:
        return jsonify({'success': False, 'message': 'Application record not found.'}), 404

    student = application.student
    job = application.job

    if not student or not job:
        return jsonify({'success': False, 'message': 'Associated student or job profile is missing.'}), 400

    # Duplicate placement check
    existing_placement = Placement.query.filter_by(student_id=student.student_id, job_id=job.job_id).first()
    if existing_placement:
        return jsonify({'success': False, 'message': f'Student {student.roll_number} already has a placement for this job.'}), 409

    final_package = Decimal(str(package_lpa)) if package_lpa else job.salary_lpa
    if final_package <= 0:
        return jsonify({'success': False, 'message': 'Package LPA must be greater than zero.'}), 400

    offer_date = datetime.strptime(offer_date_str, '%Y-%m-%d').date() if offer_date_str else date.today()

    try:
        # 1. Update application status
        prev_status = application.application_status
        application.application_status = 'Selected'
        application.updated_at = datetime.now(timezone.utc)

        # 2. Insert confirmed placement
        new_placement = Placement(
            student_id=student.student_id,
            job_id=job.job_id,
            company_id=job.company_id,
            offer_date=offer_date,
            package_lpa=final_package,
            placement_status=placement_status,
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(new_placement)
        db.session.flush()

        # 3. Create audit trail
        audit_app = AuditLog(
            table_name='applications',
            record_id=application.application_id,
            action='UPDATE',
            old_values=f"status: {prev_status}",
            new_values="status: Selected",
            changed_by=g.current_user.username
        )
        audit_placement = AuditLog(
            table_name='placements',
            record_id=new_placement.placement_id,
            action='INSERT',
            old_values=None,
            new_values=f"Student {student.roll_number} placed at {job.company.company_name} with {final_package} LPA",
            changed_by=g.current_user.username
        )
        db.session.add_all([audit_app, audit_placement])

        # Commit atomically
        db.session.commit()

        # 4. Instant WebSocket Notifications
        student_user = student.user
        student_user_id = student_user.user_id if student_user else None

        create_and_send_notification(
            user_id=student_user_id,
            title='🎉 Congratulations! Placement Offer Received!',
            message=f"You have been offered a position at {job.company.company_name} with an annual package of {final_package} LPA!",
            notif_type='success',
            link='/applications'
        )

        # Broadcast milestone to all campus clients
        broadcast_payload = {
            'student_name': student.full_name,
            'department_code': student.department.department_code if student.department else None,
            'company_name': job.company.company_name,
            'package_lpa': float(final_package),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        broadcast_all('placement_celebration', broadcast_payload)

        return jsonify({
            'success': True,
            'message': f"Candidate {student.full_name} successfully selected and placement offer recorded at {final_package} LPA!",
            'placement': new_placement.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Placement transaction failed and rolled back: {str(e)}'}), 500


@placements_bp.route('/all', methods=['GET'])
@roles_required('Admin')
def get_all_placements():
    """Lists all confirmed placements."""
    placements = Placement.query.order_by(Placement.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(placements),
        'placements': [p.to_dict() for p in placements]
    })


@placements_bp.route('/live', methods=['GET'])
def get_live_ticker():
    """Public real-time placement ticker data."""
    recent_placements = Placement.query.filter_by(placement_status='Accepted').order_by(Placement.created_at.desc()).limit(10).all()
    return jsonify({
        'success': True,
        'ticker': [{
            'placement_id': p.placement_id,
            'student_name': p.student.full_name if p.student else 'Student',
            'department_code': p.student.department.department_code if p.student and p.student.department else '',
            'company_name': p.company.company_name if p.company else 'Recruiter',
            'package_lpa': float(p.package_lpa)
        } for p in recent_placements]
    })

