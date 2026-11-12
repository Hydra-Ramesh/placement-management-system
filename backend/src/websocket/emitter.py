from src.extensions import socketio, db
from src.models.audit import Notification


def emit_to_user(user_id, event, data):
    """Emits an event to a specific authenticated user's private room."""
    socketio.emit(event, data, room=f"user_{user_id}")


def emit_to_role(role, event, data):
    """Emits an event to all users belonging to a role (e.g. 'Admin', 'Student')."""
    socketio.emit(event, data, room=f"role_{role}")


def broadcast_all(event, data):
    """Emits an event to all connected clients."""
    socketio.emit(event, data)


def create_and_send_notification(user_id=None, recipient_role=None, title="", message="", notif_type="info", link=None):
    """
    Persists a notification in PostgreSQL and immediately pushes it over WebSockets.
    """
    try:
        notif = Notification(
            user_id=user_id,
            recipient_role=recipient_role,
            title=title,
            message=message,
            type=notif_type,
            link=link
        )
        db.session.add(notif)
        db.session.commit()

        payload = notif.to_dict()
        if user_id:
            emit_to_user(user_id, 'notification', payload)
        elif recipient_role:
            emit_to_role(recipient_role, 'notification', payload)
        else:
            broadcast_all('notification', payload)

        return notif
    except Exception as e:
        print(f"[WebSocket Error] Could not persist or send notification: {e}")
        return None

