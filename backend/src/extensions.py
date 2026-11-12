from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

db = SQLAlchemy()
cors = CORS()
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

# Ensure SQLite enforces Foreign Key constraints matching PostgreSQL / MySQL behavior in test suite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

