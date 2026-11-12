from datetime import datetime, timezone
from src.extensions import db


class AuditLog(db.Model):
    """Audit log capturing key status changes, verification actions, and compliance events."""
    __tablename__ = 'audit_logs'

    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    table_name = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False)
    old_values = db.Column(db.Text)
    new_values = db.Column(db.Text)
    changed_by = db.Column(db.String(100), default='SYSTEM')
    changed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'log_id': self.log_id,
            'table_name': self.table_name,
            'record_id': self.record_id,
            'action': self.action,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'changed_by': self.changed_by,
            'changed_at': self.changed_at.isoformat() if self.changed_at else None
        }

    def __repr__(self):
        return f"<AuditLog {self.log_id}: {self.table_name} #{self.record_id} {self.action}>"


class Notification(db.Model):
    """In-app real-time persisted notification."""
    __tablename__ = 'notifications'

    notification_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=True, index=True)
    recipient_role = db.Column(db.String(20), nullable=True)  # 'Admin', 'Student', or None for user-specific
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info')  # 'info', 'success', 'warning', 'danger'
    is_read = db.Column(db.Boolean, default=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'recipient_role': self.recipient_role,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Notification {self.notification_id}: {self.title}>"

