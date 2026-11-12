from functools import wraps
from flask import request, jsonify, g, current_app
import jwt
from src.extensions import db
from src.models.user import User


def token_required(f):
    """
    Middleware decorator that extracts and validates the Bearer JWT token.
    Populates Flask's `g.current_user`.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        token = None
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]

        # Support token query parameter for direct browser downloads/views
        if not token:
            token = request.args.get('token')

        if not token:
            return jsonify({'success': False, 'message': 'Authentication token missing.'}), 401
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            user_id = payload.get('user_id')
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({'success': False, 'message': 'User belonging to this token no longer exists.'}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired. Please sign in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid authentication token.'}), 401

        return f(*args, **kwargs)
    return decorated


def roles_required(*allowed_roles):
    """
    Role-Based Access Control (RBAC) decorator.
    Usage: @roles_required('Admin') or @roles_required('Admin', 'Student')
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user or user.role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f"Access forbidden: Requires one of the following roles: {', '.join(allowed_roles)}."
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

