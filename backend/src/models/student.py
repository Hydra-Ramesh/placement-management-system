from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import CheckConstraint
from src.extensions import db


class Student(db.Model):
    """Student profiles for placement eligibility, documentation, and tracking."""
    __tablename__ = 'students'
    __table_args__ = (
        CheckConstraint('cgpa >= 0.00 AND cgpa <= 10.00', name='chk_student_cgpa'),
        CheckConstraint('backlogs >= 0', name='chk_student_backlogs'),
    )

    student_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    roll_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.department_id', ondelete='RESTRICT'), nullable=False, index=True)
    graduation_year = db.Column(db.Integer, nullable=False)
    cgpa = db.Column(db.Numeric(4, 2), nullable=False)
    backlogs = db.Column(db.Integer, nullable=False, default=0)
    resume_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    department = db.relationship('Department', back_populates='students')
    user = db.relationship('User', back_populates='student', uselist=False)
    applications = db.relationship('Application', back_populates='student', cascade='all, delete-orphan', lazy='dynamic')
    placements = db.relationship('Placement', back_populates='student', lazy='dynamic')
    documents = db.relationship('Document', back_populates='student', cascade='all, delete-orphan', lazy='dynamic')

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_placed(self):
        return self.placements.filter_by(placement_status='Accepted').first() is not None

    @property
    def active_placement(self):
        return self.placements.filter_by(placement_status='Accepted').first()

    def to_dict(self, include_details=False):
        data = {
            'student_id': self.student_id,
            'roll_number': self.roll_number,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'department_id': self.department_id,
            'department_name': self.department.department_name if self.department else None,
            'department_code': self.department.department_code if self.department else None,
            'graduation_year': self.graduation_year,
            'cgpa': float(self.cgpa),
            'backlogs': self.backlogs,
            'resume_url': self.resume_url,
            'is_placed': self.is_placed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if self.is_placed and self.active_placement:
            data['placement'] = {
                'placement_id': self.active_placement.placement_id,
                'company_name': self.active_placement.company.company_name if self.active_placement.company else None,
                'job_title': self.active_placement.job.job_title if self.active_placement.job else None,
                'package_lpa': float(self.active_placement.package_lpa),
                'offer_date': self.active_placement.offer_date.isoformat() if self.active_placement.offer_date else None
            }
        if include_details:
            data['documents'] = [d.to_dict() for d in self.documents.order_by(Document.uploaded_at.desc())]
            data['applications_count'] = self.applications.count()
        return data

    def __repr__(self):
        return f"<Student {self.roll_number} - {self.full_name}>"

