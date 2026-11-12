"""
SPMS 2.0 Backend Entry Point
Delegates to the modern feature-based application factory in src.app.
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.app import create_app
from src.extensions import db, socketio, cors

app = create_app(os.getenv('FLASK_ENV', 'production'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
