from datetime import datetime, timezone
from src.extensions import db


class Company(db.Model):
    """Corporate recruiters participating in placement drives."""
    __tablename__ = 'companies'

    company_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    company_name = db.Column(db.String(100), nullable=False, index=True)
    industry = db.Column(db.String(100))
    website = db.Column(db.String(255))
    contact_email = db.Column(db.String(100))
    contact_phone = db.Column(db.String(20))
    company_description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    jobs = db.relationship('Job', back_populates='company', cascade='all, delete-orphan', lazy='dynamic')
    placements = db.relationship('Placement', back_populates='company', lazy='dynamic')
    users = db.relationship('User', back_populates='company', lazy='dynamic')

    @property
    def total_jobs(self):
        return self.jobs.count()

    @property
    def total_hires(self):
        return self.placements.count()

    def to_dict(self):
        return {
            'company_id': self.company_id,
            'company_name': self.company_name,
            'industry': self.industry,
            'website': self.website,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'company_description': self.company_description,
            'total_jobs': self.total_jobs,
            'total_hires': self.total_hires,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Company {self.company_name}>"

