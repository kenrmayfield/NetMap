from __future__ import annotations

import sqlite3
from collections.abc import Generator

from sqlalchemy import create_engine, event
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
