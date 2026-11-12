from datetime import datetime, date, timezone
from sqlalchemy import CheckConstraint
from src.extensions import db


class Job(db.Model):
    """Placement openings and recruitment drives."""
    __tablename__ = 'jobs'
    __table_args__ = (
        CheckConstraint('minimum_cgpa >= 0.00 AND minimum_cgpa <= 10.00', name='chk_job_cgpa'),
        CheckConstraint('maximum_backlogs >= 0', name='chk_job_backlogs'),
        CheckConstraint('salary_lpa >= 0.00', name='chk_job_salary'),
        CheckConstraint("job_status IN ('Open', 'Closed')", name='chk_job_status'),
    )

    job_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.company_id', ondelete='RESTRICT'), nullable=False, index=True)
    job_title = db.Column(db.String(100), nullable=False)
    job_description = db.Column(db.Text)
    job_type = db.Column(db.String(50), nullable=False, default='Full-Time')
    location = db.Column(db.String(100))
    minimum_cgpa = db.Column(db.Numeric(4, 2), nullable=False, default=0.00)
    maximum_backlogs = db.Column(db.Integer, nullable=False, default=0)
    salary_lpa = db.Column(db.Numeric(10, 2), nullable=False)
    application_deadline = db.Column(db.Date, nullable=False, index=True)
    job_status = db.Column(db.String(20), nullable=False, default='Open', index=True)
    requires_doc_verification = db.Column(db.Boolean, default=True)  # Admin must verify docs before interview
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    company = db.relationship('Company', back_populates='jobs')
    applications = db.relationship('Application', back_populates='job', cascade='all, delete-orphan', lazy='dynamic')
    placements = db.relationship('Placement', back_populates='job', lazy='dynamic')

    @property
    def is_active(self):
        return self.job_status == 'Open' and self.application_deadline >= date.today()

    def check_eligibility(self, student):
        """
        Validates academic eligibility for a candidate.
        Returns: (is_eligible: bool, reason: str)
        """
        if not student:
            return False, "Student profile record not found."
        if float(student.cgpa) < float(self.minimum_cgpa):
            return False, f"CGPA requirement not met (Required: {float(self.minimum_cgpa):.2f}, Current: {float(student.cgpa):.2f})."
        if student.backlogs > self.maximum_backlogs:
            return False, f"Backlogs limit exceeded (Allowed: {self.maximum_backlogs}, Current: {student.backlogs})."
        return True, "Eligible"

    @property
    def total_applications(self):
        return self.applications.count()

    def to_dict(self, student=None):
        data = {
            'job_id': self.job_id,
            'company_id': self.company_id,
            'company_name': self.company.company_name if self.company else 'N/A',
            'company_industry': self.company.industry if self.company else None,
            'company_website': self.company.website if self.company else None,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'job_type': self.job_type,
            'location': self.location,
            'minimum_cgpa': float(self.minimum_cgpa),
            'maximum_backlogs': self.maximum_backlogs,
            'salary_lpa': float(self.salary_lpa),
            'application_deadline': self.application_deadline.isoformat(),
            'job_status': self.job_status,
            'is_active': self.is_active,
            'requires_doc_verification': self.requires_doc_verification,
            'total_applications': self.total_applications,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if student:
            eligible, reason = self.check_eligibility(student)
            data['is_eligible'] = eligible
            data['eligibility_reason'] = reason
        return data

    def __repr__(self):
        return f"<Job {self.job_title} at {self.company.company_name if self.company else 'N/A'}>"

