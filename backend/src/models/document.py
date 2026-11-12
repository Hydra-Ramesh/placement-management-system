from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from src.extensions import db


class Document(db.Model):
    """
    Student credentials and academic verification documents.
    Enables TPO/Admin Document Verification Workflow before or during job applications.
    """
    __tablename__ = 'documents'
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('Pending', 'Verified', 'Rejected')",
            name='chk_doc_verification_status'
        ),
        CheckConstraint(
            "document_type IN ('Resume', 'Grade Transcript', 'College ID', 'Certificate', 'Other')",
            name='chk_doc_type'
        )
    )

    document_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False, index=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.application_id', ondelete='SET NULL'), nullable=True, index=True)
    document_type = db.Column(db.String(50), nullable=False, default='Resume')
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size_bytes = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    
    # Verification workflow
    verification_status = db.Column(db.String(30), nullable=False, default='Pending', index=True)  # 'Pending', 'Verified', 'Rejected'
    verified_by = db.Column(db.String(100), nullable=True)  # Admin username
    verification_notes = db.Column(db.Text, nullable=True)  # Admin review notes or rejection reason
    verified_at = db.Column(db.DateTime, nullable=True)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    student = db.relationship('Student', back_populates='documents')
    application = db.relationship('Application', back_populates='documents')

    def to_dict(self):
        return {
            'document_id': self.document_id,
            'student_id': self.student_id,
            'student_name': self.student.full_name if self.student else None,
            'student_roll': self.student.roll_number if self.student else None,
            'department_code': self.student.department.department_code if self.student and self.student.department else None,
            'application_id': self.application_id,
            'job_title': self.application.job.job_title if self.application and self.application.job else None,
            'company_name': self.application.job.company.company_name if self.application and self.application.job and self.application.job.company else None,
            'document_type': self.document_type,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_size_bytes': self.file_size_bytes,
            'mime_type': self.mime_type,
            'verification_status': self.verification_status,
            'verified_by': self.verified_by,
            'verification_notes': self.verification_notes,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

    def __repr__(self):
        return f"<Document {self.document_id}: {self.document_type} ({self.verification_status})>"

