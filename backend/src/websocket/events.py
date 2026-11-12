from flask import request
from flask_socketio import join_room, leave_room
from src.extensions import socketio


def register_socket_events(socketio_instance):
    """Registers WebSocket listeners for real-time room joining and events."""

    @socketio_instance.on('connect')
    def handle_connect():
        print(f"[WebSocket] Client connected: {request.sid}")
        socketio_instance.emit('connection_response', {'status': 'connected', 'sid': request.sid}, room=request.sid)

    @socketio_instance.on('disconnect')
    def handle_disconnect():
        print(f"[WebSocket] Client disconnected: {request.sid}")

    @socketio_instance.on('join')
    def handle_join(data):
        """
        Allows client to subscribe to their personal room and role room.
        Payload: { user_id: 1, role: 'Student' }
        """
        user_id = data.get('user_id')
        role = data.get('role')

        if user_id:
            user_room = f"user_{user_id}"
            join_room(user_room)
            print(f"[WebSocket] Client {request.sid} joined user room: {user_room}")

        if role:
            role_room = f"role_{role}"
            join_room(role_room)
            print(f"[WebSocket] Client {request.sid} joined role room: {role_room}")

        socketio_instance.emit('room_joined', {'status': 'ok', 'user_id': user_id, 'role': role}, room=request.sid)

    @socketio_instance.on('leave')
    def handle_leave(data):
        user_id = data.get('user_id')
        role = data.get('role')
        if user_id:
            leave_room(f"user_{user_id}")
        if role:
            leave_room(f"role_{role}")

