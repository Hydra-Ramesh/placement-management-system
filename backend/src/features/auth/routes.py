from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app, g
import jwt
from src.extensions import db
from src.models.user import User
from src.models.student import Student
from src.models.department import Department
from src.models.audit import Notification
from src.features.auth.decorators import token_required

auth_bp = Blueprint('auth_api', __name__, url_prefix='/api/v1/auth')


def generate_token(user):
    """Generates a secure HS256 JWT access token."""
    expires = datetime.now(timezone.utc) + timedelta(hours=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 24))
    payload = {
        'user_id': user.user_id,
        'username': user.username,
        'role': user.role,
        'student_id': user.student_id,
        'company_id': user.company_id,
        'exp': expires
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


@auth_bp.route('/login', methods=['POST'])
def login():
    """User authentication returning JWT and user profile."""
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': f'Welcome back, {user.username}!',
        'token': token,
        'user': user.to_dict()
    })


@auth_bp.route('/register', methods=['POST'])
def register():
    """Student registration endpoint."""
    data = request.get_json() or {}

    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    roll_number = data.get('roll_number', '').strip().upper()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    department_id = data.get('department_id')
    graduation_year = data.get('graduation_year')
    cgpa = data.get('cgpa')
    backlogs = data.get('backlogs', 0)
    phone = data.get('phone', '').strip()

    # Validations
    if not all([username, email, password, roll_number, first_name, last_name, department_id, graduation_year, cgpa]):
        return jsonify({'success': False, 'message': 'Please complete all required fields.'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters long.'}), 400

    try:
        cgpa_val = float(cgpa)
        if not (0.0 <= cgpa_val <= 10.0):
            return jsonify({'success': False, 'message': 'CGPA must be between 0.00 and 10.00.'}), 400
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid numeric CGPA value.'}), 400

    try:
        backlogs_val = int(backlogs)
        if backlogs_val < 0:
            return jsonify({'success': False, 'message': 'Backlogs cannot be negative.'}), 400
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid numeric backlogs count.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username is already taken.'}), 409

    if User.query.filter_by(email=email).first() or Student.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email address is already registered.'}), 409

    if Student.query.filter_by(roll_number=roll_number).first():
        return jsonify({'success': False, 'message': 'Roll number is already registered.'}), 409

    try:
        student = Student(
            roll_number=roll_number,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone or None,
            department_id=int(department_id),
            graduation_year=int(graduation_year),
            cgpa=cgpa_val,
            backlogs=backlogs_val
        )
        db.session.add(student)
        db.session.flush()

        user = User(
            username=username,
            email=email,
            role='Student',
            student_id=student.student_id
        )
        user.set_password(password)
        db.session.add(user)

        db.session.commit()
        token = generate_token(user)

        return jsonify({
            'success': True,
            'message': 'Registration successful! Welcome to SPMS.',
            'token': token,
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    """Returns the current user profile, student data, and role."""
    return jsonify({
        'success': True,
        'user': g.current_user.to_dict()
    })


@auth_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications():
    """Fetches in-app notifications for current user / role."""
    user = g.current_user
    notifications = Notification.query.filter(
        (Notification.user_id == user.user_id) | (Notification.recipient_role == user.role)
    ).order_by(Notification.created_at.desc()).limit(30).all()

    return jsonify({
        'success': True,
        'notifications': [n.to_dict() for n in notifications]
    })


@auth_bp.route('/notifications/read-all', methods=['POST'])
@token_required
def mark_notifications_read():
    """Marks all user notifications as read."""
    user = g.current_user
    Notification.query.filter(
        (Notification.user_id == user.user_id) | (Notification.recipient_role == user.role)
    ).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True, 'message': 'All notifications marked as read.'})

