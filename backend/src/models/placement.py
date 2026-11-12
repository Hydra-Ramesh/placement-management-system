from datetime import datetime, date, timezone
from sqlalchemy import UniqueConstraint, CheckConstraint
from src.extensions import db


class Placement(db.Model):
    """Confirmed placement offers extended to candidates."""
    __tablename__ = 'placements'
    __table_args__ = (
        UniqueConstraint('student_id', 'job_id', name='uq_student_job_placement'),
        CheckConstraint("placement_status IN ('Offered', 'Accepted', 'Declined')", name='chk_placement_status'),
        CheckConstraint('package_lpa > 0.00', name='chk_placement_package'),
    )

    placement_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='RESTRICT'), nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.job_id', ondelete='RESTRICT'), nullable=False, index=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.company_id', ondelete='RESTRICT'), nullable=False, index=True)
    offer_date = db.Column(db.Date, nullable=False, default=date.today)
    package_lpa = db.Column(db.Numeric(10, 2), nullable=False)
    placement_status = db.Column(db.String(50), nullable=False, default='Accepted')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    student = db.relationship('Student', back_populates='placements')
    job = db.relationship('Job', back_populates='placements')
    company = db.relationship('Company', back_populates='placements')

    def to_dict(self):
        return {
            'placement_id': self.placement_id,
            'student_id': self.student_id,
            'student_name': self.student.full_name if self.student else None,
            'student_roll': self.student.roll_number if self.student else None,
            'department_code': self.student.department.department_code if self.student and self.student.department else None,
            'job_id': self.job_id,
            'job_title': self.job.job_title if self.job else None,
            'company_id': self.company_id,
            'company_name': self.company.company_name if self.company else None,
            'offer_date': self.offer_date.isoformat(),
            'package_lpa': float(self.package_lpa),
            'placement_status': self.placement_status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Placement {self.placement_id}: Student {self.student_id} -> {self.company.company_name} ({self.package_lpa} LPA)>"

