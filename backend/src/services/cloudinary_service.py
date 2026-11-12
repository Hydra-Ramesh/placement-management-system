import os
from datetime import datetime, timezone
from pathlib import Path
from flask import current_app
from werkzeug.utils import secure_filename

try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False


def is_cloudinary_configured():
    """Checks whether valid Cloudinary credentials exist in env or Flask config."""
    if not CLOUDINARY_AVAILABLE:
        return False

    url = os.getenv('CLOUDINARY_URL') or current_app.config.get('CLOUDINARY_URL')
    if url:
        return True

    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME') or current_app.config.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.getenv('CLOUDINARY_API_KEY') or current_app.config.get('CLOUDINARY_API_KEY')
    api_secret = os.getenv('CLOUDINARY_API_SECRET') or current_app.config.get('CLOUDINARY_API_SECRET')

    return bool(cloud_name and api_key and api_secret)


def configure_cloudinary():
    """Initializes Cloudinary with configured environment or Flask app settings."""
    if not CLOUDINARY_AVAILABLE:
        return False

    url = os.getenv('CLOUDINARY_URL') or current_app.config.get('CLOUDINARY_URL')
    if url:
        cloudinary.config(cloudinary_url=url)
        return True

    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME') or current_app.config.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.getenv('CLOUDINARY_API_KEY') or current_app.config.get('CLOUDINARY_API_KEY')
    api_secret = os.getenv('CLOUDINARY_API_SECRET') or current_app.config.get('CLOUDINARY_API_SECRET')

    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        return True

    return False


def upload_document_file(file, original_filename, document_type='Resume', student_roll='STUDENT'):
    """
    Uploads a verification document.
    Prioritizes Cloudinary Cloud Storage when credentials are provided.
    Gracefully falls back to local UPLOAD_FOLDER when Cloudinary is not configured.

    Returns:
        tuple (file_path_or_url: str, file_size_bytes: int, is_remote: bool)
    """
    timestamp = int(datetime.now(timezone.utc).timestamp())
    clean_orig = secure_filename(original_filename) or 'doc'
    base_name = clean_orig.rsplit('.', 1)[0]

    if is_cloudinary_configured() and configure_cloudinary():
        try:
            public_id = f"{student_roll}_{document_type.replace(' ', '_')}_{timestamp}_{base_name}"
            # Rewind file pointer if previously read
            if hasattr(file, 'seek'):
                file.seek(0)

            upload_result = cloudinary.uploader.upload(
                file,
                resource_type='auto',
                folder='spms_documents',
                public_id=public_id,
                overwrite=True
            )
            remote_url = upload_result.get('secure_url')
            size_bytes = upload_result.get('bytes', 0)
            return remote_url, size_bytes, True
        except Exception as e:
            current_app.logger.error(f"[Cloudinary Upload Failed] {e}. Falling back to local storage.")

    # Local fallback
    upload_folder = Path(current_app.config.get('UPLOAD_FOLDER', 'uploads'))
    upload_folder.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{student_roll}_{document_type.replace(' ', '_')}_{timestamp}_{clean_orig}"
    dest_path = upload_folder / safe_filename

    if hasattr(file, 'seek'):
        file.seek(0)
    file.save(str(dest_path))
    size_bytes = os.path.getsize(str(dest_path))

    return safe_filename, size_bytes, False
