from flask import Blueprint, jsonify
from sqlalchemy import func, select
from src.extensions import db
from src.models.student import Student
from src.models.department import Department
from src.models.company import Company
from src.models.job import Job
from src.models.application import Application
from src.models.placement import Placement
from src.models.document import Document
from src.models.audit import AuditLog
from src.features.auth.decorators import roles_required

analytics_bp = Blueprint('analytics_api', __name__, url_prefix='/api/v1/analytics')


@analytics_bp.route('/dashboard', methods=['GET'])
def get_dashboard_metrics():
    """Aggregated live metrics for the placement dashboard and interactive charts."""
    total_students = Student.query.count()
    total_companies = Company.query.count()
    total_active_jobs = Job.query.filter_by(job_status='Open').count()
    total_applications = Application.query.count()
    pending_documents = Document.query.filter_by(verification_status='Pending').count()

    placed_count = db.session.query(func.count(func.distinct(Placement.student_id))).scalar() or 0
    placement_rate = round((placed_count * 100.0 / total_students), 1) if total_students > 0 else 0.0

    avg_pkg = db.session.query(func.avg(Placement.package_lpa)).scalar()
    highest_pkg = db.session.query(func.max(Placement.package_lpa)).scalar()
    avg_package = round(float(avg_pkg), 2) if avg_pkg else 0.0
    highest_package = round(float(highest_pkg), 2) if highest_pkg else 0.0

    # 1. Application Status Breakdown (Doughnut chart)
    status_counts = db.session.query(
        Application.application_status,
        func.count(Application.application_id)
    ).group_by(Application.application_status).all()
    status_chart = {
        'labels': [row[0] for row in status_counts],
        'values': [row[1] for row in status_counts]
    }

    # 2. Department-wise Placed Count (Bar chart)
    dept_placements = db.session.query(
        Department.department_code,
        func.count(func.distinct(Placement.student_id))
    ).join(Student, Department.department_id == Student.department_id)\
     .outerjoin(Placement, Student.student_id == Placement.student_id)\
     .group_by(Department.department_code).all()
    dept_chart = {
        'labels': [row[0] for row in dept_placements],
        'values': [row[1] for row in dept_placements]
    }

    # 3. Top Hiring Companies (Bar chart)
    company_recruits = db.session.query(
        Company.company_name,
        func.count(Placement.placement_id)
    ).join(Placement, Company.company_id == Placement.company_id)\
     .group_by(Company.company_name)\
     .order_by(func.count(Placement.placement_id).desc())\
     .limit(6).all()
    company_chart = {
        'labels': [row[0] for row in company_recruits],
        'values': [row[1] for row in company_recruits]
    }

    # 4. Salary Tier Breakdown
    super_dream = Placement.query.filter(Placement.package_lpa >= 20.0).count()
    dream = Placement.query.filter(Placement.package_lpa >= 10.0, Placement.package_lpa < 20.0).count()
    regular = Placement.query.filter(Placement.package_lpa < 10.0).count()
    salary_tiers = {
        'labels': ['Super Dream (≥ 20 LPA)', 'Dream (10-19.9 LPA)', 'Regular (< 10 LPA)'],
        'values': [super_dream, dream, regular]
    }

    # 5. Recent placements and applications
    recent_placements = [p.to_dict() for p in Placement.query.order_by(Placement.created_at.desc()).limit(5).all()]
    recent_apps = [a.to_dict() for a in Application.query.order_by(Application.application_date.desc()).limit(5).all()]

    return jsonify({
        'success': True,
        'metrics': {
            'total_students': total_students,
            'total_companies': total_companies,
            'total_active_jobs': total_active_jobs,
            'total_applications': total_applications,
            'placed_students_count': placed_count,
            'placement_rate_pct': placement_rate,
            'avg_package_lpa': avg_package,
            'highest_package_lpa': highest_package,
            'pending_documents': pending_documents
        },
        'charts': {
            'status_chart': status_chart,
            'dept_chart': dept_chart,
            'company_chart': company_chart,
            'salary_tiers': salary_tiers
        },
        'recent_placements': recent_placements,
        'recent_applications': recent_apps
    })


@analytics_bp.route('/reports', methods=['GET'])
@roles_required('Admin')
def get_reports_data():
    """Generates detailed placement reports and statistics."""
    # 1. Department Breakdown
    dept_stats = db.session.query(
        Department.department_name,
        Department.department_code,
        func.count(Student.student_id).label('total_students'),
        func.count(Placement.placement_id).label('placed_students'),
        func.round(func.avg(Placement.package_lpa), 2).label('avg_package'),
        func.max(Placement.package_lpa).label('max_package')
    ).join(Student, Department.department_id == Student.department_id)\
     .outerjoin(Placement, Student.student_id == Placement.student_id)\
     .group_by(Department.department_id, Department.department_name, Department.department_code)\
     .all()

    dept_report = [{
        'department_name': r[0],
        'department_code': r[1],
        'total_students': r[2],
        'placed_students': r[3],
        'avg_package': float(r[4]) if r[4] else 0.0,
        'max_package': float(r[5]) if r[5] else 0.0,
        'placement_rate': round(r[3] * 100.0 / r[2], 1) if r[2] > 0 else 0.0
    } for r in dept_stats]

    # 2. Company Breakdown
    comp_stats = db.session.query(
        Company.company_name,
        Company.industry,
        func.count(Job.job_id).label('jobs_posted'),
        func.count(Placement.placement_id).label('hires_count'),
        func.round(func.avg(Placement.package_lpa), 2).label('avg_package'),
        func.max(Placement.package_lpa).label('max_package')
    ).outerjoin(Job, Company.company_id == Job.company_id)\
     .outerjoin(Placement, Company.company_id == Placement.company_id)\
     .group_by(Company.company_id, Company.company_name, Company.industry)\
     .order_by(func.count(Placement.placement_id).desc())\
     .all()

    company_report = [{
        'company_name': r[0],
        'industry': r[1],
        'jobs_posted': r[2],
        'hires_count': r[3],
        'avg_package': float(r[4]) if r[4] else 0.0,
        'max_package': float(r[5]) if r[5] else 0.0
    } for r in comp_stats]

    # 3. Unplaced Students
    placed_student_ids = select(Placement.student_id)
    unplaced = Student.query.filter(Student.student_id.not_in(placed_student_ids)).order_by(Student.cgpa.desc()).all()

    # 4. Recent Audit Trail
    audit_logs = [a.to_dict() for a in AuditLog.query.order_by(AuditLog.changed_at.desc()).limit(25).all()]

    return jsonify({
        'success': True,
        'department_report': dept_report,
        'company_report': company_report,
        'unplaced_students': [s.to_dict() for s in unplaced],
        'audit_logs': audit_logs
    })

