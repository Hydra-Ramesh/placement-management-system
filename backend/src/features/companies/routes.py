from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from src.extensions import db
from src.models.company import Company
from src.features.auth.decorators import roles_required

companies_bp = Blueprint('companies_api', __name__, url_prefix='/api/v1/companies')


@companies_bp.route('', methods=['GET'])
def list_companies():
    """Lists registered recruiting companies."""
    search = request.args.get('search', '').strip()
    industry_filter = request.args.get('industry', '').strip()

    query = Company.query
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Company.company_name.ilike(pattern),
                Company.industry.ilike(pattern)
            )
        )
    if industry_filter:
        query = query.filter(Company.industry == industry_filter)

    companies = query.order_by(Company.company_name.asc()).all()
    return jsonify({
        'success': True,
        'count': len(companies),
        'companies': [c.to_dict() for c in companies]
    })


@companies_bp.route('', methods=['POST'])
@roles_required('Admin')
def create_company():
    """Registers a new recruiting partner."""
    data = request.get_json() or {}
    name = data.get('company_name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Company name is required.'}), 400

    try:
        new_company = Company(
            company_name=name,
            industry=data.get('industry', '').strip() or None,
            website=data.get('website', '').strip() or None,
            contact_email=data.get('contact_email', '').strip() or None,
            contact_phone=data.get('contact_phone', '').strip() or None,
            company_description=data.get('company_description', '').strip() or None
        )
        db.session.add(new_company)
        db.session.commit()
        return jsonify({'success': True, 'message': f'Company "{name}" registered.', 'company': new_company.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500


@companies_bp.route('/<int:company_id>', methods=['PUT'])
@roles_required('Admin')
def update_company(company_id):
    """Updates company details."""
    comp = db.get_or_404(Company, company_id)
    data = request.get_json() or {}

    if 'company_name' in data:
        comp.company_name = data['company_name'].strip()
    if 'industry' in data:
        comp.industry = data['industry'].strip()
    if 'website' in data:
        comp.website = data['website'].strip()
    if 'contact_email' in data:
        comp.contact_email = data['contact_email'].strip()
    if 'contact_phone' in data:
        comp.contact_phone = data['contact_phone'].strip()
    if 'company_description' in data:
        comp.company_description = data['company_description'].strip()

    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Company updated.', 'company': comp.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
