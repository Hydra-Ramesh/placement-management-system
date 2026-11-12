from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_, desc, asc
from src.extensions import db
from src.models.student import Student
from src.models.department import Department
from src.features.auth.decorators import token_required, roles_required

students_bp = Blueprint('students_api', __name__, url_prefix='/api/v1/students')


@students_bp.route('', methods=['GET'])
@roles_required('Admin')
def list_students():
    """Admin endpoint: lists all students with search and filters."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    search = request.args.get('search', '').strip()
    dept_id = request.args.get('department_id', type=int)
    grad_year = request.args.get('graduation_year', type=int)
    sort_by = request.args.get('sort_by', 'roll_number')
    order = request.args.get('order', 'asc')

    query = Student.query.join(Department)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Student.roll_number.ilike(pattern),
                Student.first_name.ilike(pattern),
                Student.last_name.ilike(pattern),
                Student.email.ilike(pattern)
            )
        )
    if dept_id:
        query = query.filter(Student.department_id == dept_id)
    if grad_year:
        query = query.filter(Student.graduation_year == grad_year)

    sort_column = {
        'roll_number': Student.roll_number,
        'name': Student.first_name,
        'cgpa': Student.cgpa,
        'backlogs': Student.backlogs,
        'year': Student.graduation_year
    }.get(sort_by, Student.roll_number)

    query = query.order_by(desc(sort_column) if order == 'desc' else asc(sort_column))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'students': [s.to_dict() for s in pagination.items]
    })


@students_bp.route('/<int:student_id>', methods=['GET'])
@token_required
def get_student(student_id):
    """Retrieves student profile with documents and application history."""
    user = g.current_user
    if not user.is_admin and user.student_id != student_id:
        return jsonify({'success': False, 'message': 'Access forbidden.'}), 403

    student = db.get_or_404(Student, student_id)
    return jsonify({
        'success': True,
        'student': student.to_dict(include_details=True)
    })


@students_bp.route('/departments', methods=['GET'])
def get_departments():
    """Lists all academic departments."""
    depts = Department.query.order_by(Department.department_name.asc()).all()
    return jsonify({
        'success': True,
        'departments': [d.to_dict() for d in depts]
    })


@students_bp.route('/<int:student_id>', methods=['PUT'])
@token_required
def update_student(student_id):
    """Updates student academic or contact information."""
    user = g.current_user
    if not user.is_admin and user.student_id != student_id:
        return jsonify({'success': False, 'message': 'Access forbidden.'}), 403

    student = db.get_or_404(Student, student_id)
    data = request.get_json() or {}

    if 'phone' in data:
        student.phone = data['phone'].strip()
    if 'resume_url' in data:
        student.resume_url = data['resume_url'].strip()

    # Admin only modifications
    if user.is_admin:
        if 'cgpa' in data:
            student.cgpa = Decimal(str(data['cgpa']))
        if 'backlogs' in data:
            student.backlogs = int(data['backlogs'])
        if 'graduation_year' in data:
            student.graduation_year = int(data['graduation_year'])
        if 'department_id' in data:
            student.department_id = int(data['department_id'])

    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Student profile updated.', 'student': student.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating student: {str(e)}'}), 500
