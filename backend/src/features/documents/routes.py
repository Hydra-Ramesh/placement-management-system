import os
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app, send_from_directory, redirect, g
from werkzeug.utils import secure_filename
from src.extensions import db
from src.models.document import Document
from src.models.student import Student
from src.models.application import Application
from src.models.audit import AuditLog
from src.features.auth.decorators import token_required, roles_required
from src.websocket.emitter import create_and_send_notification, emit_to_role
from src.services.cloudinary_service import upload_document_file

documents_bp = Blueprint('documents_api', __name__, url_prefix='/api/v1/documents')


def is_allowed_file(filename):
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', {'pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx'})
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed


@documents_bp.route('/upload', methods=['POST'])
@token_required
def upload_document():
    """
    Uploads a verification document (Resume, Transcript, College ID, etc.).
    Students upload their credentials; Admins can also upload on behalf of students.
    """
    user = g.current_user
    if user.is_student:
        student = user.student
        if not student:
            return jsonify({'success': False, 'message': 'No student profile linked to this user.'}), 400
        student_id = student.student_id
    elif user.is_admin:
        student_id = request.form.get('student_id', type=int)
        if not student_id:
            return jsonify({'success': False, 'message': 'Admin must provide student_id.'}), 400
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student record not found.'}), 404
    else:
        return jsonify({'success': False, 'message': 'Unauthorized to upload documents.'}), 403

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part in upload request.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file.'}), 400

    if not is_allowed_file(file.filename):
        return jsonify({
            'success': False,
            'message': 'File type not allowed. Allowed: PDF, PNG, JPG, JPEG, WEBP, DOC, DOCX.'
        }), 400

    document_type = request.form.get('document_type', 'Resume').strip()
    application_id = request.form.get('application_id', type=int)

    # Validate application if provided
    if application_id:
        app_obj = db.session.get(Application, application_id)
        if not app_obj or app_obj.student_id != student_id:
            return jsonify({'success': False, 'message': 'Invalid application ID.'}), 400

    try:
        stored_path_or_url, file_size, is_remote = upload_document_file(
            file=file,
            original_filename=file.filename,
            document_type=document_type,
            student_roll=student.roll_number
        )

        new_doc = Document(
            student_id=student_id,
            application_id=application_id,
            document_type=document_type,
            file_name=secure_filename(file.filename),
            file_path=stored_path_or_url,
            file_size_bytes=file_size,
            mime_type=file.content_type,
            verification_status='Pending'
        )
        db.session.add(new_doc)
        db.session.flush()

        # If student uploaded resume, update student profile resume_url
        if document_type == 'Resume':
            student.resume_url = stored_path_or_url if is_remote else f"/api/v1/documents/{new_doc.document_id}/download"

        # If linked to application, set application status to Under Document Review
        if application_id:
            app_obj = db.session.get(Application, application_id)
            if app_obj and app_obj.application_status in ('Applied', 'Pending Document Verification', 'Pending TPO Verification'):
                app_obj.application_status = 'Pending TPO Verification'

        db.session.commit()

        # Notify Admins over WebSocket
        create_and_send_notification(
            recipient_role='Admin',
            title='New Document Uploaded',
            message=f"Student {student.full_name} ({student.roll_number}) submitted a {document_type} for verification.",
            notif_type='info',
            link='/admin/documents'
        )
        emit_to_role('Admin', 'document_uploaded', new_doc.to_dict())

        return jsonify({
            'success': True,
            'message': f'{document_type} uploaded successfully and submitted for admin verification.',
            'document': new_doc.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to register document: {str(e)}'}), 500


@documents_bp.route('/pending', methods=['GET'])
@roles_required('Admin')
def get_pending_documents():
    """Admin endpoint: lists all documents currently waiting for verification."""
    docs = Document.query.filter_by(verification_status='Pending').order_by(Document.uploaded_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(docs),
        'documents': [d.to_dict() for d in docs]
    })


@documents_bp.route('/all', methods=['GET'])
@roles_required('Admin')
def get_all_documents():
    """Admin endpoint: lists all documents with optional status and type filter."""
    status_filter = request.args.get('status', '').strip()
    doc_type = request.args.get('type', '').strip()

    query = Document.query
    if status_filter:
        query = query.filter(Document.verification_status == status_filter)
    if doc_type:
        query = query.filter(Document.document_type == doc_type)

    docs = query.order_by(Document.uploaded_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(docs),
        'documents': [d.to_dict() for d in docs]
    })


@documents_bp.route('/student/<int:student_id>', methods=['GET'])
@token_required
def get_student_documents(student_id):
    """Retrieves all documents belonging to a student (Self or Admin access)."""
    user = g.current_user
    if not user.is_admin and user.student_id != student_id:
        return jsonify({'success': False, 'message': 'Access forbidden.'}), 403

    docs = Document.query.filter_by(student_id=student_id).order_by(Document.uploaded_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(docs),
        'documents': [d.to_dict() for d in docs]
    })


@documents_bp.route('/<int:document_id>/verify', methods=['POST'])
@roles_required('Admin')
def verify_document(document_id):
    """
    Admin Document Verification Action:
    Approves or Rejects candidate document with audit trail and instant WebSocket notification.
    """
    admin_user = g.current_user
    data = request.get_json() or {}
    action = data.get('action', '').capitalize()  # 'Verified' or 'Rejected'
    notes = data.get('notes', '').strip()

    if action not in ('Verified', 'Rejected'):
        return jsonify({'success': False, 'message': "Action must be either 'Verified' or 'Rejected'."}), 400

    doc = db.session.get(Document, document_id)
    if not doc:
        return jsonify({'success': False, 'message': 'Document not found.'}), 404

    try:
        old_status = doc.verification_status
        doc.verification_status = action
        doc.verified_by = admin_user.username
        doc.verification_notes = notes
        doc.verified_at = datetime.now(timezone.utc)

        # Audit log
        audit = AuditLog(
            table_name='documents',
            record_id=doc.document_id,
            action='VERIFY_DOCUMENT',
            old_values=f"status: {old_status}",
            new_values=f"status: {action} | notes: {notes}",
            changed_by=admin_user.username
        )
        db.session.add(audit)

        # If document is linked to an application, update application status
        if doc.application_id:
            application = doc.application
            if application:
                if action == 'Verified':
                    # Check if all other docs for this app are also verified
                    all_verified = all(d.verification_status == 'Verified' for d in application.documents.all())
                    if all_verified and application.application_status in ('Pending Document Verification', 'Pending TPO Verification'):
                        application.application_status = 'TPO Approved'
                        audit_app = AuditLog(
                            table_name='applications',
                            record_id=application.application_id,
                            action='STATUS_CHANGE',
                            old_values=application.application_status,
                            new_values='TPO Approved',
                            changed_by=admin_user.username
                        )
                        db.session.add(audit_app)
                elif action == 'Rejected':
                    application.doc_verification_notes = f"Document '{doc.document_type}' rejected: {notes}"

        db.session.commit()

        # Send real-time notification to the student
        student_user = doc.student.user if doc.student else None
        student_user_id = student_user.user_id if student_user else None

        notif_type = 'success' if action == 'Verified' else 'danger'
        notif_msg = (
            f"Your document '{doc.document_type}' has been verified and approved by the Placement Cell."
            if action == 'Verified' else
            f"Your document '{doc.document_type}' requires attention: {notes or 'Please re-upload a clear copy.'}"
        )

        create_and_send_notification(
            user_id=student_user_id,
            title=f"Document {action}",
            message=notif_msg,
            notif_type=notif_type,
            link='/applications'
        )

        return jsonify({
            'success': True,
            'message': f"Document successfully marked as '{action}'.",
            'document': doc.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database error verifying document: {str(e)}'}), 500


@documents_bp.route('/<int:document_id>/download', methods=['GET'])
@token_required
def download_document(document_id):
    """Serves the uploaded document file securely."""
    doc = db.session.get(Document, document_id)
    if not doc:
        return jsonify({'success': False, 'message': 'Document not found.'}), 404

    user = g.current_user
    if not user.is_admin and user.student_id != doc.student_id:
        return jsonify({'success': False, 'message': 'Unauthorized to view this document.'}), 403

    if doc.file_path.startswith(('http://', 'https://')):
        return redirect(doc.file_path)

    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, doc.file_path, as_attachment=False)

