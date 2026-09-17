from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from app.config import settings

# Configure SQLite engine with WAL mode and robust concurrency settings
connect_args = {"check_same_thread": False, "timeout": 30}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Enables Write-Ahead Logging (WAL) and sets high-concurrency PRAGMAs for SQLite.
    Prevents 'database is locked' errors during simultaneous camera writes and user queries.
    """
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=10000;")
        cursor.execute("PRAGMA cache_size=-64000;") # 64MB cache
        cursor.execute("PRAGMA foreign_keys=ON;")
    finally:
        cursor.close()

session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocal = scoped_session(session_factory)

def get_db():
    """
    Dependency provider yielding a scoped SQLAlchemy session with explicit
    commit on success and rollback on exception.
    """
    db: Session = SessionLocal()
    try:
        yield db
        # If there are uncommitted changes, commit them safely
        if db.is_active:
            db.commit()
    except Exception:
        if db.is_active:
            db.rollback()
        raise
    finally:
        db.close()
