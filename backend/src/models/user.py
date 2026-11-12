from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import CheckConstraint
from src.extensions import db


class User(db.Model):
    """User authentication and Role-Based Access Control (RBAC)."""
    __tablename__ = 'users'
    __table_args__ = (
        CheckConstraint("role IN ('Admin', 'Student', 'Company')", name='chk_user_role'),
    )

    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='Student')  # 'Admin', 'Student', 'Company'
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='SET NULL'), nullable=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.company_id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    student = db.relationship('Student', back_populates='user')
    company = db.relationship('Company', back_populates='users')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self):
        return self.role == 'Admin'

    @property
    def is_student(self):
        return self.role == 'Student'

    @property
    def is_company(self):
        return self.role == 'Company'

    def to_dict(self):
        data = {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'student_id': self.student_id,
            'company_id': self.company_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if self.student:
            data['student_profile'] = {
                'roll_number': self.student.roll_number,
                'full_name': self.student.full_name,
                'cgpa': float(self.student.cgpa),
                'backlogs': self.student.backlogs,
                'department_code': self.student.department.department_code if self.student.department else None
            }
        return data

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"

