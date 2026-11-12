import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent

# Load environment variables
if (BACKEND_DIR / '.env').exists():
    load_dotenv(BACKEND_DIR / '.env')
elif (BASE_DIR / '.env').exists():
    load_dotenv(BASE_DIR / '.env')
else:
    load_dotenv()

# Neon PostgreSQL production URI (default fallback if not in env)
NEON_DATABASE_URL = (
    "postgresql://neondb_owner:npg_nCVKtBg2dhM4@"
    "ep-blue-wave-b3o5k41a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb"
    "?sslmode=require&channel_binding=require"
)


class Config:
    """Production-grade configuration for Flask, SQLAlchemy, JWT & WebSockets."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'spms_prod_secret_key_2026_xyz987654321')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'spms_jwt_signing_key_2026_jwt_token_secret')
    JWT_ACCESS_TOKEN_EXPIRES_HOURS = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', '24'))
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload folder configuration (local fallback)
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', str(BACKEND_DIR / 'uploads'))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx'}

    # Cloudinary Cloud Storage configuration for documents
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', '')
    CLOUDINARY_URL = os.getenv('CLOUDINARY_URL', '')

    # Connection pooling options
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.getenv('DB_POOL_SIZE', '10')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '20')),
        'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '300')),
        'pool_pre_ping': True,
    }

    # CORS configuration
    CORS_ORIGIN = os.getenv('CORS_ORIGIN', '*')

    @classmethod
    def get_database_uri(cls):
        raw_uri = os.getenv('DATABASE_URL', '').strip()
        if not raw_uri:
            raw_uri = NEON_DATABASE_URL

        # SQLAlchemy 2.0 requires postgresql:// instead of postgres://
        if raw_uri.startswith('postgres://'):
            raw_uri = raw_uri.replace('postgres://', 'postgresql://', 1)

        return raw_uri


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f"sqlite:///{BACKEND_DIR / 'spms_dev.db'}")
    if SQLALCHEMY_DATABASE_URI.startswith('sqlite:'):
        SQLALCHEMY_ENGINE_OPTIONS = {}


class TestingConfig(Config):
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = Config.get_database_uri()


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': ProductionConfig
}

