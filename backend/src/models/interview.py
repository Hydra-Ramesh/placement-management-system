from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from src.extensions import db


class Interview(db.Model):
    """Scheduled interview rounds and technical evaluations."""
    __tablename__ = 'interviews'
    __table_args__ = (
        CheckConstraint("interview_mode IN ('Online', 'Offline')", name='chk_interview_mode'),
        CheckConstraint("interview_result IN ('Pending', 'Passed', 'Failed')", name='chk_interview_result'),
    )

    interview_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.application_id', ondelete='CASCADE'), nullable=False, index=True)
    interview_round = db.Column(db.String(50), nullable=False)
    interview_date = db.Column(db.DateTime, nullable=False, index=True)
    interview_mode = db.Column(db.String(20), nullable=False, default='Online')
    interview_location = db.Column(db.String(255))
    interviewer_notes = db.Column(db.Text)
    interview_result = db.Column(db.String(50), nullable=False, default='Pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    application = db.relationship('Application', back_populates='interviews')

    def to_dict(self):
        return {
            'interview_id': self.interview_id,
            'application_id': self.application_id,
            'interview_round': self.interview_round,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'interview_mode': self.interview_mode,
            'interview_location': self.interview_location,
            'interviewer_notes': self.interviewer_notes,
            'interview_result': self.interview_result,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Interview {self.interview_round} for App {self.application_id} ({self.interview_result})>"

