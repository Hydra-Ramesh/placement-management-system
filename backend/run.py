import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.app import create_app
from src.extensions import socketio

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n=======================================================")
    print(f"🚀 SPMS 2.0 Backend Server Running (Flask + WebSockets)")
    print(f"📡 API Health Check: http://127.0.0.1:{port}/api/v1/health")
    print(f"=======================================================\n")
    socketio.run(app, host='127.0.0.1', port=port, debug=True, allow_unsafe_werkzeug=True)
