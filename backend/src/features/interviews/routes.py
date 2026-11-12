from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from src.extensions import db
from src.models.interview import Interview
from src.models.application import Application
from src.models.audit import AuditLog
from src.features.auth.decorators import token_required, roles_required
from src.websocket.emitter import create_and_send_notification, emit_to_user

interviews_bp = Blueprint('interviews_api', __name__, url_prefix='/api/v1/interviews')


@interviews_bp.route('/schedule', methods=['POST'])
@roles_required('Admin')
def schedule_interview():
    """Schedules an interview round and notifies candidate over WebSockets."""
    data = request.get_json() or {}
    application_id = data.get('application_id')
    round_name = data.get('interview_round', '').strip()
    interview_date_str = data.get('interview_date')
    mode = data.get('interview_mode', 'Online')
    location = data.get('interview_location', '').strip()
    notes = data.get('interviewer_notes', '').strip()

    if not all([application_id, round_name, interview_date_str]):
        return jsonify({'success': False, 'message': 'Application ID, round name, and date/time are required.'}), 400

    application = db.session.get(Application, application_id)
    if not application:
        return jsonify({'success': False, 'message': 'Application not found.'}), 404

    try:
        interview_dt = datetime.fromisoformat(interview_date_str.replace(' ', 'T'))
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid ISO date-time format.'}), 400

    try:
        interview = Interview(
            application_id=application_id,
            interview_round=round_name,
            interview_date=interview_dt,
            interview_mode=mode,
            interview_location=location or ('Virtual Meeting Link' if mode == 'Online' else 'Campus Placement Cell'),
            interviewer_notes=notes or None,
            interview_result='Pending'
        )
        db.session.add(interview)

        # Transition application status
        old_status = application.application_status
        application.application_status = 'Interview Scheduled'
        application.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            table_name='applications',
            record_id=application.application_id,
            action='SCHEDULE_INTERVIEW',
            old_values=f"status: {old_status}",
            new_values=f"status: Interview Scheduled ({round_name})",
            changed_by=g.current_user.username
        )
        db.session.add(audit)
        db.session.commit()

        # Send instant notification to student
        student_user = application.student.user if application.student else None
        student_user_id = student_user.user_id if student_user else None

        create_and_send_notification(
            user_id=student_user_id,
            title=f"Interview Scheduled: {round_name} 🗓️",
            message=f"You have been invited for '{round_name}' with {application.job.company.company_name} on {interview_dt.strftime('%b %d, %Y at %I:%M %p')}.",
            notif_type='success',
            link='/applications'
        )
        if student_user_id:
            emit_to_user(student_user_id, 'interview_scheduled', interview.to_dict())

        return jsonify({
            'success': True,
            'message': f"Interview round '{round_name}' successfully scheduled!",
            'interview': interview.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database error scheduling interview: {str(e)}'}), 500


@interviews_bp.route('/<int:interview_id>/result', methods=['POST'])
@roles_required('Admin')
def update_interview_result(interview_id):
    """Updates the result of an interview round (Passed, Failed, Pending)."""
    interview = db.session.get(Interview, interview_id)
    if not interview:
        return jsonify({'success': False, 'message': 'Interview round not found.'}), 404

    data = request.get_json() or {}
    result = data.get('result', '').capitalize()
    notes = data.get('notes', '').strip()

    if result not in ('Passed', 'Failed', 'Pending'):
        return jsonify({'success': False, 'message': "Result must be 'Passed', 'Failed', or 'Pending'."}), 400

    try:
        interview.interview_result = result
        if notes:
            interview.interviewer_notes = notes
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Interview result marked as '{result}'.",
            'interview': interview.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating result: {str(e)}'}), 500

