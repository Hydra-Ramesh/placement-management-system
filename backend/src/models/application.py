from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint, CheckConstraint
from src.extensions import db


class Application(db.Model):
    """
    Job applications submitted by students.
    Includes document verification state transitions.
    """
    __tablename__ = 'applications'
    __table_args__ = (
        UniqueConstraint('student_id', 'job_id', name='uq_student_job_application'),
        CheckConstraint(
            "application_status IN ('Applied', 'Pending Document Verification', 'Pending TPO Verification', 'TPO Approved', 'Documents Verified', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Withdrawn')",
            name='chk_app_status'
        ),
    )

    application_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.job_id', ondelete='CASCADE'), nullable=False, index=True)
    application_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    application_status = db.Column(db.String(50), nullable=False, default='Pending TPO Verification', index=True)
    resume_url = db.Column(db.String(500))
    doc_verification_notes = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    student = db.relationship('Student', back_populates='applications')
    job = db.relationship('Job', back_populates='applications')
    interviews = db.relationship('Interview', back_populates='application', cascade='all, delete-orphan', lazy='dynamic')
    documents = db.relationship('Document', back_populates='application', lazy='dynamic')

    @property
    def latest_interview(self):
        return self.interviews.order_by(db.desc('interview_date')).first()

    @property
    def all_documents_verified(self):
        docs = self.documents.all()
        if not docs:
            return False
        return all(d.verification_status == 'Verified' for d in docs)

    def to_dict(self):
        return {
            'application_id': self.application_id,
            'student_id': self.student_id,
            'student_name': self.student.full_name if self.student else None,
            'student_roll': self.student.roll_number if self.student else None,
            'student_email': self.student.email if self.student else None,
            'student_cgpa': float(self.student.cgpa) if self.student else None,
            'student_backlogs': self.student.backlogs if self.student else None,
            'department_code': self.student.department.department_code if self.student and self.student.department else None,
            'job_id': self.job_id,
            'job_title': self.job.job_title if self.job else None,
            'company_name': self.job.company.company_name if self.job and self.job.company else None,
            'salary_lpa': float(self.job.salary_lpa) if self.job else None,
            'application_date': self.application_date.isoformat() if self.application_date else None,
            'application_status': self.application_status,
            'resume_url': self.resume_url,
            'doc_verification_notes': self.doc_verification_notes,
            'documents': [d.to_dict() for d in self.documents.all()],
            'interviews': [i.to_dict() for i in self.interviews.all()],
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<Application {self.application_id}: Student {self.student_id} -> Job {self.job_id} ({self.application_status})>"

