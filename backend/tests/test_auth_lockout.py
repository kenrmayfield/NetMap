from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.models.auth_session import LoginThrottleState
from app.models.site import Site  # noqa: F401 - imported so Device relationships resolve in tests
from app.models.topology_group import TopologyGroup  # noqa: F401
from app.services.auth.security import clear_user_login_lockout, is_locked


def _session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine, tables=[LoginThrottleState.__table__])
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def test_clear_user_login_lockout_resets_username_throttle_state():
    db = _session()
    locked_until = datetime.now(timezone.utc) + timedelta(minutes=40)
    db.add(
        LoginThrottleState(
            subject="user:admin",
            failed_attempts=5,
            last_failed_at=datetime.now(timezone.utc),
            locked_until=locked_until,
        )
    )
    db.commit()

    locked, _wait = is_locked(db, ["user:admin"])
    assert locked is True

    assert clear_user_login_lockout(db, "Admin") is True

    locked, wait = is_locked(db, ["user:admin"])
    assert locked is False
    assert wait == 0
    state = db.query(LoginThrottleState).filter_by(subject="user:admin").one()
    assert state.failed_attempts == 0
    assert state.last_failed_at is None
    assert state.locked_until is None


def test_clear_user_login_lockout_returns_false_when_no_state_exists():
    db = _session()

    assert clear_user_login_lockout(db, "missing") is False
