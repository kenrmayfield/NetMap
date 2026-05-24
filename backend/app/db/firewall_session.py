from __future__ import annotations

import sqlite3
from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


def _firewall_db_url() -> str:
    return f"sqlite:///{settings.data_dir}/firewall.db"


firewall_engine = create_engine(
    _firewall_db_url(),
    connect_args={"check_same_thread": False},
)


@event.listens_for(firewall_engine, "connect")
def _set_firewall_pragmas(dbapi_conn, _rec):
    if isinstance(dbapi_conn, sqlite3.Connection):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.close()


FirewallSessionLocal = sessionmaker(bind=firewall_engine, autoflush=False, autocommit=False)


class FirewallBase(DeclarativeBase):
    pass


def get_firewall_db() -> Generator[Session, None, None]:
    db = FirewallSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_firewall_db() -> None:
    from app.models.firewall_event import FirewallEvent  # noqa: F401
    FirewallBase.metadata.create_all(bind=firewall_engine)
    init_firewall_fts()


def init_firewall_fts() -> None:
    with firewall_engine.begin() as conn:
        setup_firewall_fts(conn)


def setup_firewall_fts(conn) -> None:
    conn.execute(
        text(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS firewall_events_fts
            USING fts5(raw_log, content='firewall_events', content_rowid='id')
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE TRIGGER IF NOT EXISTS firewall_events_ai
            AFTER INSERT ON firewall_events BEGIN
                INSERT INTO firewall_events_fts(rowid, raw_log)
                VALUES (new.id, new.raw_log);
            END
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE TRIGGER IF NOT EXISTS firewall_events_ad
            AFTER DELETE ON firewall_events BEGIN
                INSERT INTO firewall_events_fts(firewall_events_fts, rowid, raw_log)
                VALUES ('delete', old.id, old.raw_log);
            END
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE TRIGGER IF NOT EXISTS firewall_events_au
            AFTER UPDATE OF raw_log ON firewall_events BEGIN
                INSERT INTO firewall_events_fts(firewall_events_fts, rowid, raw_log)
                VALUES ('delete', old.id, old.raw_log);
                INSERT INTO firewall_events_fts(rowid, raw_log)
                VALUES (new.id, new.raw_log);
            END
            """
        )
    )
    indexed = int(conn.execute(text("SELECT count(*) FROM firewall_events_fts")).scalar() or 0)
    events = int(conn.execute(text("SELECT count(*) FROM firewall_events")).scalar() or 0)
    if indexed != events:
        conn.execute(text("INSERT INTO firewall_events_fts(firewall_events_fts) VALUES ('rebuild')"))
