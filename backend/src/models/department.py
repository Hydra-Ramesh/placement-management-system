from datetime import datetime, timezone
from src.extensions import db


class Department(db.Model):
    """Academic departments offering degrees."""
    __tablename__ = 'departments'

    department_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    department_name = db.Column(db.String(100), unique=True, nullable=False)
    department_code = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    students = db.relationship('Student', back_populates='department', lazy='dynamic')

    def to_dict(self):
        return {
            'department_id': self.department_id,
            'department_name': self.department_name,
            'department_code': self.department_code,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Department {self.department_code}>"

